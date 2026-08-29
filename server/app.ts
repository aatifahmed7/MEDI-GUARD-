import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { applicationDefault, cert, getApps as getAdminApps, initializeApp as initializeAdminApp } from 'firebase-admin/app';
import { getAuth as getAdminAuthService } from 'firebase-admin/auth';
import { db } from './db.js';
import { generateHackathonDemoData } from './demoData.js';
import { calculateAdherenceMetrics } from './analytics.js';
import {
  generateAiAdherenceInsights,
  checkDrugInteractions,
  chatWithAdherenceAssistant,
} from './ai.js';
import { AuthUser, CaregiverPermissions, MedicationEvent, Medicine } from '../src/types.js';

dotenv.config();

const firebaseAdminConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY,
};

let firebaseAdminAuthInstance: ReturnType<typeof getAdminAuthService> | null = null;

console.info(`[MediGuard] Firebase Admin project id: ${firebaseAdminConfig.projectId ? 'present' : 'missing'}`);
console.info(`[MediGuard] Firebase Admin client email: ${firebaseAdminConfig.clientEmail ? 'present' : 'missing'}`);
console.info(`[MediGuard] Firebase Admin private key: ${firebaseAdminConfig.privateKey ? 'present' : 'missing'}`);

const sessions = new Map<string, string>();
const defaultCaregiverPermissions: CaregiverPermissions = {
  view_schedule: true,
  view_adherence: true,
  receive_delayed_alerts: true,
  receive_missed_alerts: true,
  view_history: true,
  view_ai_risk: true,
};

function hashPassword(password: string, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(candidate, 'hex'), Buffer.from(hash, 'hex'));
}

function hashAccessCode(code: string) {
  return crypto.createHash('sha256').update(code).digest('hex');
}

function bearerToken(req: express.Request) {
  const authorization = req.header('Authorization');
  if (!authorization?.startsWith('Bearer ')) return undefined;
  const token = authorization.slice('Bearer '.length).trim();
  return token || undefined;
}

function firebaseAdminAuth() {
  if (firebaseAdminAuthInstance) return firebaseAdminAuthInstance;
  const projectId = firebaseAdminConfig.projectId;
  const clientEmail = firebaseAdminConfig.clientEmail;
  const privateKey = firebaseAdminConfig.privateKey?.replace(/\\n/g, '\n').replace(/^"|"$/g, '').trim();
  try {
    const app = getAdminApps()[0] || initializeAdminApp({
      credential: projectId && clientEmail && privateKey
        ? cert({ projectId, clientEmail, privateKey })
        : applicationDefault(),
      ...(projectId ? { projectId } : {}),
    });
    firebaseAdminAuthInstance = getAdminAuthService(app);
    return firebaseAdminAuthInstance;
  } catch (error) {
    console.error('[MediGuard] Firebase Admin initialization failed:', error);
    return null;
  }
}

if (firebaseAdminConfig.projectId && firebaseAdminConfig.clientEmail && firebaseAdminConfig.privateKey) {
  if (firebaseAdminAuth()) console.log('[MediGuard] Firebase Admin initialized successfully.');
  else console.error('[MediGuard] Firebase Admin initialization failed. Check server credentials.');
}

async function verifyFirebaseRequest(req: express.Request) {
  const token = bearerToken(req);
  if (!token) return { token: undefined, decoded: undefined, error: 401 as const };
  const adminAuth = firebaseAdminAuth();
  if (!adminAuth) return { token, decoded: undefined, error: 503 as const };
  try {
    return { token, decoded: await adminAuth.verifyIdToken(token), error: undefined };
  } catch (error) {
    console.error('[MediGuard auth] Firebase Admin token verification failed:', { code: (error as any)?.code, message: (error as any)?.message });
    return { token, decoded: undefined, error: 401 as const };
  }
}

function firebaseAccount(decoded: { uid: string; email?: string; name?: string; picture?: string; auth_time?: number; iat?: number }) {
  return db.getUserById(decoded.uid) || db.addUser({
    id: decoded.uid,
    fullName: decoded.name || decoded.email || 'MediGuard User',
    email: decoded.email || '',
    role: undefined,
    createdAt: new Date((decoded.auth_time || decoded.iat || Math.floor(Date.now() / 1000)) * 1000).toISOString(),
    avatarUrl: decoded.picture,
  });
}

// Ensure initial demo data is loaded if DB is empty
if (db.getMedicines().length === 0) {
  const seed = generateHackathonDemoData();
  db.loadDemoForCurrentOwner(seed);
  console.log('Seeded database with initial 14-day hackathon demo dataset.');
}

// Helper: Calculate reminder state (DELAYED, DUE, UPCOMING, MISSED, TAKEN_*, SNOOZED)
function getReminderState(event: MedicationEvent, now: Date, settings: any): string {
  if (event.status === 'Taken on Time') return 'TAKEN_ON_TIME';
  if (event.status === 'Taken Late') return 'TAKEN_LATE';
  if (event.status === 'Missed') return 'MISSED';

  const current = now.getHours() * 60 + now.getMinutes();
  const [sh, sm] = event.scheduledTime.split(':').map(Number);
  const scheduled = sh * 60 + sm;
  const difference = current - scheduled;

  if (difference < 0) return 'UPCOMING';
  if (difference < (settings.lateThresholdMinutes || 5)) return 'DUE';
  if (difference < (settings.missedThresholdMinutes || 120)) return 'DELAYED';
  return 'MISSED';
}

// Helper: Check if event is DELAYED and create caretaker notifications
function checkAndCreateDelayedNotifications(event: MedicationEvent, patientOwnerId: string) {
  // Only check pending events
  if (event.status !== 'Pending') return;

  const now = new Date();
  const settings = db.getSettings();
  const state = getReminderState(event, now, settings);

  // Only create notification if state is DELAYED
  if (state !== 'DELAYED') return;

  const patient = db.getPatient();
  const patientId = patient?.id || 'patient-001';
  const allNotifications = db.getAllCaregiverNotifications();
  const acceptedLinks = db.getLinksForPatient(patientId).filter(
    (link: any) => link.patientOwnerUid === patientOwnerId && link.status === 'ACCEPTED'
  );

  // For each accepted caretaker, create a notification if one doesn't already exist
  for (const link of acceptedLinks) {
    const caregiverUid = link.caregiverUid;
    
    // Check if DELAYED_DOSE notification already exists for this event
    const existingNotification = allNotifications.find(
      (notif: any) =>
        notif.recipientUid === caregiverUid &&
        notif.patientId === patientId &&
        notif.alertType === 'DELAYED_DOSE' &&
        notif.eventId === event.id
    );

    if (!existingNotification) {
      // Get medicine name for the notification
      const medicine = db.getMedicines().find((m: any) => m.id === event.medicineId);
      const medicineName = medicine?.name || 'Medicine';
      const patientName = patient?.name || 'Patient';

      // Create the notification
      const notification = {
        id: crypto.randomUUID(),
        recipientUid: caregiverUid,
        patientId,
        title: 'Delayed Dose',
        message: `${patientName}'s ${medicineName} dose scheduled for ${event.scheduledTime} is delayed.`,
        alertType: 'DELAYED_DOSE',
        isRead: false,
        createdAt: new Date().toISOString(),
        eventId: event.id,
      };

      db.addCaregiverNotification(notification);
      console.log('[MediGuard delayed] Created delayed-dose notification', { 
        eventId: event.id, 
        caregiverUid, 
        patientId, 
        medicine: medicineName 
      });
    }
  }
}

export function createApp() {
  const app = express();

  app.use(express.json({ limit: '10mb' }));

  const router = express.Router();

  router.use(async (req, res, next) => {
    const p = req.path;
    if (p === '/health' || p.startsWith('/auth/')) {
      return next();
    }

    const token = bearerToken(req);
    const email = token ? sessions.get(token) : undefined;
    const localUser = email ? db.getUsers().find((item) => item.email === email) : undefined;
    if (localUser) {
      db.setOwner(localUser.id);
      (req as any).auth = { uid: localUser.id, email: localUser.email, role: localUser.role };
      return next();
    }
    if (!token) return res.status(401).json({ error: 'Authentication required.' });
    const result = await verifyFirebaseRequest(req);
    if (result.error) return res.status(result.error).json({ error: result.error === 503 ? 'Authentication service is temporarily unavailable.' : 'Authentication required.' });
    if (result.decoded) {
      const decoded = result.decoded;
      db.setOwner(decoded.uid);
      const user = db.getUserById(decoded.uid);
      const role = user?.role;
      (req as any).auth = { uid: decoded.uid, email: decoded.email || '', role };
      if (!role && !req.path.includes('/auth/role')) return res.status(403).json({ error: 'Choose an account role first.' });
      return next();
    }
    return res.status(401).json({ error: 'Authentication required.' });
  });

  // Health
  router.get('/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Local email authentication for development and hackathon demos.
  router.get('/auth/session', async (req, res) => {
    const token = bearerToken(req);
    const email = token ? sessions.get(token) : undefined;
    const user = email ? db.getUsers().find((item) => item.email === email) : undefined;
    if (user) {
      db.setOwner(user.id);
      const { passwordHash: _passwordHash, ...safeUser } = user;
      if (process.env.NODE_ENV !== 'production') console.log('[MediGuard role trace]', { uid: user.id, role: user.role ?? null });
      console.info('[MediGuard session] authenticated session returned', { uid: user.id, role: user.role ?? null });
      return res.json({ token, user: safeUser, role: user.role ?? null, patient: user.role === 'Patient' ? db.getPatient() : undefined });
    }

    const result = await verifyFirebaseRequest(req);
    if (result.error) return res.status(result.error).json({ error: result.error === 503 ? 'Authentication service is temporarily unavailable.' : 'Authentication required.' });
    if (!result.decoded || !result.token) return res.status(401).json({ error: 'Authentication required.' });

    const decoded = result.decoded;
    db.setOwner(decoded.uid);
    const existingUser = db.getUserById(decoded.uid);
    const firebaseUser = existingUser || firebaseAccount(decoded);
    const hasExistingPatient = db.hasPatientOwner(decoded.uid);
    const role = existingUser?.role || (hasExistingPatient ? 'Patient' : undefined);
    if (!existingUser && role === 'Patient') db.updateUser(decoded.uid, { role });
    if (role === 'Patient') db.setOwner(decoded.uid);
    if (process.env.NODE_ENV !== 'production') console.log('[MediGuard role trace]', { uid: decoded.uid, role: role ?? null, hasExistingPatient });
    return res.json({ token: result.token, user: { ...firebaseUser, role: role ?? null }, role: role ?? null, patient: role === 'Patient' ? db.getPatient() : undefined });
  });

  router.post('/auth/role', (req, res) => {
    const token = bearerToken(req);
    if (!token) return res.status(401).json({ error: 'Authentication required.' });
    void verifyFirebaseRequest(req).then((result) => {
      if (result.error || !result.decoded) return res.status(result.error || 401).json({ error: result.error === 503 ? 'Authentication service is temporarily unavailable.' : 'Authentication required.' });
      const auth = result.decoded;
      const role = req.body.role === 'Caregiver' ? 'Caregiver' : req.body.role === 'Patient' ? 'Patient' : undefined;
      if (!role) return res.status(400).json({ error: 'Choose Patient or Caregiver.' });
      const currentUser = db.getUserById(auth.uid);
      if (currentUser?.role && currentUser.role !== role) return res.status(409).json({ error: 'Account role has already been selected.' });
      const updated = db.updateUser(auth.uid, { role });
      if (!updated) return res.status(404).json({ error: 'Account profile not found.' });
      if (role === 'Patient') {
        db.setOwner(auth.uid);
        return res.json({ role, user: updated, patient: db.getPatient() });
      }
      db.upsertCaregiverProfile({ id: `cg-${auth.uid.slice(0, 16)}`, firebaseUid: auth.uid, fullName: auth.name || auth.email || 'Caretaker', email: auth.email || '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      return res.json({ role, user: updated });
    }).catch(() => res.status(500).json({ error: 'Unable to save account role.' }));
  });

  // Caregiver access is additive and always relationship-scoped.
  router.get('/caregiver/access', (req, res) => {
    const auth = (req as any).auth;
    if (auth?.role === 'Caregiver') return res.status(403).json({ error: 'Caregiver accounts cannot manage patient invitations.' });
    const patient = db.getPatient();
    res.json({ invitations: db.getInvitationsForPatient(patient.id), links: db.getLinksForPatient(patient.id), accessCode: undefined });
  });

  router.post('/caretaker/access-code', (req, res) => {
    const auth = (req as any).auth;
    if (auth?.role === 'Caregiver') return res.status(403).json({ error: 'Only patient accounts can generate access codes.' });
    const patient = db.getPatient();
    db.revokeCaretakerAccessCodes(auth.uid);
    const code = `MG-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    db.addCaretakerAccessCode({ id: `code-${Date.now().toString(36)}`, patientId: patient.id, patientOwnerUid: auth.uid, codeHash: hashAccessCode(code), code, expiresAt, createdAt: new Date().toISOString() });
    res.json({ code, expiresAt });
  });

  router.get('/caretaker/access-code/current', (req, res) => {
    const auth = (req as any).auth;
    if (auth?.role === 'Caregiver') return res.status(403).json({ error: 'Only patient accounts can view access codes.' });
    const code = db.getCurrentCaretakerAccessCode(auth.uid);
    if (!code) return res.status(404).json({ error: 'No active caretaker access code.' });
    res.json({ code: code.code, expiresAt: code.expiresAt });
  });

  router.post('/caretaker/access-request', (req, res) => {
    const auth = (req as any).auth;
    if (auth?.role !== 'Caregiver') return res.status(403).json({ error: 'Only caretaker accounts can request access.' });
    const patientEmail = String(req.body.patientEmail || '').trim().toLowerCase();
    const accessCode = String(req.body.accessCode || '').trim().toUpperCase();
    const patientUser = db.getUsers().find((user) => user.email.toLowerCase() === patientEmail && user.role === 'Patient');
    if (!patientUser) return res.status(404).json({ error: 'Patient account or access code not found.' });
    db.setOwner(patientUser.id);
    const patient = db.getPatient();
    const validCode = db.getValidCaretakerAccessCode(patientUser.id, hashAccessCode(accessCode));
    if (!validCode) return res.status(401).json({ error: 'Patient access code is invalid or expired.' });
    const duplicate = db.getInvitationsForPatient(patient.id).find((item) => item.caregiverUid === auth.uid && item.status === 'PENDING');
    if (duplicate) return res.status(409).json({ error: 'An access request is already pending.' });
    const request = db.addInvitation({ id: `cginv-${Date.now().toString(36)}`, patientId: patient.id, patientOwnerUid: patientUser.id, patientName: patient.name, caregiverUid: auth.uid, caregiverEmail: auth.email, caregiverName: auth.name || auth.email, relationship: String(req.body.relationship || 'Other'), permissions: defaultCaregiverPermissions, status: 'PENDING', invitedAt: new Date().toISOString() });
    db.markCaretakerAccessCodeUsed(validCode.id);
    db.addAlert({ id: `alt-care-request-${Date.now()}`, patientId: patient.id, medicineName: 'Caretaker Access', alertType: 'HIGH_RISK_DETECTED', message: `${auth.email} requested caretaker access to your adherence information.`, priority: 'LOW', createdAt: new Date().toISOString(), acknowledged: false });
    db.setOwner(auth.uid);
    res.status(201).json({ status: request.status, message: 'Access request sent. Waiting for the patient to approve.' });
  });

  router.post('/caregiver/access-requests/:id/:decision', (req, res) => {
    const auth = (req as any).auth;
    const patient = db.getPatient();
    const request = db.getInvitationById(req.params.id);
    if (!request || request.patientId !== patient.id || request.patientOwnerUid !== auth?.uid || request.status !== 'PENDING') return res.status(404).json({ error: 'Access request not found.' });
    const status = req.params.decision === 'accept' ? 'ACCEPTED' : req.params.decision === 'decline' ? 'DECLINED' : undefined;
    if (!status) return res.status(400).json({ error: 'Unsupported request decision.' });
    db.updateInvitation(request.id, { status, acceptedAt: status === 'ACCEPTED' ? new Date().toISOString() : undefined });
    if (status === 'ACCEPTED' && request.caregiverUid) db.addLink({ id: `cglink-${Date.now().toString(36)}`, patientId: patient.id, patientOwnerUid: auth.uid, patientName: patient.name, caregiverUid: request.caregiverUid, caregiverEmail: request.caregiverEmail, caregiverName: request.caregiverName || request.caregiverEmail, relationship: request.relationship, permissions: request.permissions, status, invitedAt: request.invitedAt, acceptedAt: new Date().toISOString() });
    if (request.caregiverUid) db.addCaregiverNotification({ id: `cgn-${Date.now().toString(36)}`, recipientUid: request.caregiverUid, patientId: patient.id, title: `Access request ${status.toLowerCase()}`, message: status === 'ACCEPTED' ? `${patient.name} approved your caretaker access request.` : `${patient.name} declined your caretaker access request.`, alertType: 'CARE_REQUEST', isRead: false, createdAt: new Date().toISOString() });
    res.json({ status });
  });

  router.post('/caregiver/invitations', async (_req, res) => {
    return res.status(410).json({ error: 'Use a patient caretaker access code to request access.' });
  });

  router.get('/caregiver/invitations', (req, res) => {
    const auth = (req as any).auth;
    if (!auth?.email) return res.status(401).json({ error: 'Authentication required.' });
    res.json(db.getInvitationsForCaregiver(auth.email).filter((item) => item.status === 'PENDING'));
  });

  router.post('/caregiver/invitations/:id/:decision', (_req, res) => {
    return res.status(410).json({ error: 'This access flow is now approved by the patient in Settings.' });
  });

  router.get('/caregiver/links', (req, res) => {
    const auth = (req as any).auth;
    if (!auth?.uid) return res.status(401).json({ error: 'Authentication required.' });
    res.json(db.getLinksForCaregiver(auth.uid));
  });

  router.post('/caregiver/links/:id/revoke', (req, res) => {
    const auth = (req as any).auth;
    const patient = db.getPatient();
    const link = db.getLinksForPatient(patient.id).find((item) => item.id === req.params.id && item.patientOwnerUid === auth?.uid && item.status === 'ACCEPTED');
    if (!link) return res.status(404).json({ error: 'Caregiver link not found.' });
    const revokedAt = new Date().toISOString();
    db.updateLink(link.id, { status: 'REVOKED', revokedAt });
    db.addCaregiverNotification({ id: `cgn-${Date.now().toString(36)}`, recipientUid: link.caregiverUid, patientId: link.patientId, title: 'Caregiver access removed', message: `Your caregiver access to ${patient.name}'s MediGuard workspace has been removed.`, alertType: 'ACCESS_REVOKED', isRead: false, createdAt: revokedAt });
    res.json({ success: true });
  });

  router.get('/caregiver/patients/:patientId/summary', (req, res) => {
    const auth = (req as any).auth;
    const link = db.getLinksForCaregiver(auth?.uid || '').find((item) => item.patientId === req.params.patientId);
    if (!link) return res.status(403).json({ error: 'This patient is not linked to your caregiver account.' });
    db.setOwner(link.patientOwnerUid);
    const events = db.getEvents({ date: new Date().toISOString().split('T')[0] });
    const medicines = db.getMedicines();
    const alerts = db.getAlerts();
    const metrics = calculateAdherenceMetrics(db.getEvents(), medicines);
    res.json({ patient: db.getPatient(), events, medicines, alerts, metrics, link });
  });

  router.post('/caregiver/alerts/:id/acknowledge', (req, res) => {
    const auth = (req as any).auth;
    const links = db.getLinksForCaregiver(auth?.uid || '');
    for (const link of links) {
      db.setOwner(link.patientOwnerUid);
      const alert = db.getAlerts().find((item) => item.id === req.params.id);
      if (alert) return res.json(db.acknowledgeAlert(alert.id, auth.uid, String(req.body.note || 'Acknowledged by caregiver.')));
    }
    return res.status(403).json({ error: 'Alert is not available to this caregiver.' });
  });

  router.get('/caregiver/notifications', (req, res) => {
    const auth = (req as any).auth;
    if (!auth?.uid) return res.status(401).json({ error: 'Authentication required.' });
    res.json(db.getCaregiverNotifications(auth.uid));
  });

  router.post('/caregiver/notifications/:id/read', (req, res) => {
    const auth = (req as any).auth;
    const notification = db.markCaregiverNotificationRead(req.params.id, auth?.uid || '');
    if (!notification) return res.status(404).json({ error: 'Notification not found.' });
    res.json(notification);
  });

  router.get('/messages/links', (req, res) => {
    const auth = (req as any).auth;
    if (!auth?.uid) return res.status(401).json({ error: 'Authentication required.' });
    const links = db.getAcceptedMessageLinksForUser(auth.uid).filter((item) => item.status === 'ACCEPTED');
    res.json(links);
  });

  router.get('/messages/:linkId', (req, res) => {
    const auth = (req as any).auth;
    if (!auth?.uid) return res.status(401).json({ error: 'Authentication required.' });
    const link = db.getAcceptedMessageLinksForUser(auth.uid).find((item) => item.id === req.params.linkId);
    if (!link) return res.status(403).json({ error: 'This conversation is not available to your account.' });
    res.json(db.getMessagesForLink(link.id));
  });

  router.post('/messages', (req, res) => {
    const auth = (req as any).auth;
    if (!auth?.uid) return res.status(401).json({ error: 'Authentication required.' });
    const linkId = String(req.body.linkId || '').trim();
    const text = String(req.body.text || '').trim();
    if (!linkId || !text) return res.status(400).json({ error: 'A message and conversation are required.' });
    const link = db.getAcceptedMessageLinksForUser(auth.uid).find((item) => item.id === linkId);
    if (!link) return res.status(403).json({ error: 'This conversation is not available to your account.' });
    const user = db.getUserById(auth.uid) || { fullName: auth.email || 'MediGuard User' };
    const senderRole = auth.role === 'Caregiver' ? 'Caregiver' : 'Patient';
    const senderName = user.fullName || auth.email || 'MediGuard User';
    const recipientUid = auth.uid === link.caregiverUid ? link.patientOwnerUid : link.caregiverUid;
    const recipientName = auth.uid === link.caregiverUid ? (link.patientName || 'Patient') : (link.caregiverName || 'Caregiver');
    const message = db.addMessage({
      id: `msg-${Date.now().toString(36)}`,
      linkId,
      senderUid: auth.uid,
      senderName,
      senderRole,
      receiverUid: recipientUid,
      receiverName: recipientName,
      receiverRole: senderRole === 'Patient' ? 'Caregiver' : 'Patient',
      text,
      createdAt: new Date().toISOString(),
    });
    res.status(201).json(message);
  });

  router.post('/auth/signup', (req, res) => {
    const fullName = String(req.body.fullName || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (!fullName || !email || password.length < 8) {
      return res.status(400).json({ error: 'Enter your name, a valid email, and a password with at least 8 characters.' });
    }
    if (db.getUsers().some((user) => user.email === email)) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    const user = db.addUser({
      id: `user-${Date.now().toString(36)}`,
      fullName,
      email,
      role: undefined,
      createdAt: new Date().toISOString(),
      passwordHash: hashPassword(password),
    });
    db.setOwner(user.id);
    const token = crypto.randomBytes(32).toString('hex');
    sessions.set(token, email);
    const { passwordHash: _passwordHash, ...safeUser } = user;
    res.status(201).json({ token, user: safeUser, role: null });
  });

  router.post('/auth/login', (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const user = db.getUsers().find((item) => item.email === email);
    const stored = db.getUserPasswordHash(email);
    if (!user || !stored || !verifyPassword(password, stored)) {
      return res.status(401).json({ error: 'Email or password is incorrect.' });
    }
    const token = crypto.randomBytes(32).toString('hex');
    sessions.set(token, email);
    db.setOwner(user.id);
    const { passwordHash: _passwordHash, ...safeUser } = user;
    res.json({ token, user: safeUser, patient: db.getPatient() });
  });

  router.post('/auth/demo', (req, res) => {
    const email = 'demo@mediguard.ai';
    let user = db.getUsers().find((item) => item.email === email);
    if (!user) {
      user = db.addUser({
        id: 'user-demo',
        fullName: db.getPatient().name,
        email,
        role: 'Patient',
        createdAt: new Date().toISOString(),
        passwordHash: hashPassword(crypto.randomBytes(24).toString('hex')),
      });
    }
    const token = crypto.randomBytes(32).toString('hex');
    sessions.set(token, email);
    db.setOwner('demo-owner');
    const { passwordHash: _passwordHash, ...safeUser } = user;
    res.json({ token, user: safeUser, patient: db.getPatient() });
  });

  router.post('/auth/google', async (req, res) => {
    const credential = String(req.body.credential || '');
    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
    if (!credential || !clientId) {
      return res.status(503).json({ error: 'Google sign-in is not configured. Set GOOGLE_CLIENT_ID and VITE_GOOGLE_CLIENT_ID.' });
    }
    try {
      const googleResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
      const googleUser = await googleResponse.json() as { aud?: string; email?: string; name?: string; picture?: string };
      if (!googleResponse.ok || googleUser.aud !== clientId || !googleUser.email) {
        return res.status(401).json({ error: 'Google could not verify this account.' });
      }
      let user = db.getUsers().find((item) => item.email === googleUser.email);
      if (!user) {
        user = db.addUser({
          id: `user-${Date.now().toString(36)}`,
          fullName: googleUser.name || googleUser.email,
          email: googleUser.email,
          role: 'Patient',
          createdAt: new Date().toISOString(),
          avatarUrl: googleUser.picture,
        });
      }
      db.updatePatient({ name: googleUser.name || user.fullName, avatarUrl: googleUser.picture });
      const token = crypto.randomBytes(32).toString('hex');
      sessions.set(token, user.email);
      const { passwordHash: _passwordHash, ...safeUser } = user;
      res.json({ token, user: safeUser, patient: db.getPatient() });
    } catch {
      res.status(502).json({ error: 'Google sign-in could not be reached. Try email sign-in instead.' });
    }
  });

  router.post('/auth/phone/request', (req, res) => {
    const phone = String(req.body.phone || '').trim();
    if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
      return res.status(400).json({ error: 'Enter a valid phone number with country code.' });
    }
    res.status(503).json({ error: 'Phone OTP is not configured yet. Add an SMS provider to enable delivery.' });
  });

  // Patient Profile
  router.get('/patient', (req, res) => {
    res.json(db.getPatient());
  });

  router.put('/patient', (req, res) => {
    const updated = db.updatePatient(req.body);
    res.json(updated);
  });

  // Medicines
  router.get('/medicines', (req, res) => {
    const patientOwnerId = db.getCurrentOwnerUid();
    if (patientOwnerId) {
      const allEvents = db.getEvents();
      for (const event of allEvents) {
        checkAndCreateDelayedNotifications(event, patientOwnerId);
      }
    }
    res.json(db.getMedicines());
  });

  router.post('/medicines', (req, res) => {
    const { name, dosage, quantity, frequency, startDate, endDate, reminderTimes } = req.body;
    if (!String(name || '').trim() || !String(dosage || '').trim() || Number(quantity) <= 0 || !frequency || !/^\d{4}-\d{2}-\d{2}$/.test(String(startDate || '')) || !/^\d{4}-\d{2}-\d{2}$/.test(String(endDate || '')) || !Array.isArray(reminderTimes) || reminderTimes.length === 0 || reminderTimes.some((time) => !/^\d{2}:\d{2}$/.test(String(time)))) {
      return res.status(400).json({ error: 'Medicine name, dosage, quantity, frequency, dates, and reminder time are required.' });
    }
    if (endDate < startDate) {
      return res.status(400).json({ error: 'End date must be on or after the start date.' });
    }
    const newMed: Medicine = {
      ...req.body,
      id: req.body.id || `med-${Date.now().toString(36)}`,
      createdAt: new Date().toISOString(),
      active: req.body.active !== undefined ? req.body.active : true,
    };
    db.addMedicine(newMed);

    // Auto-generate scheduled events for today and tomorrow
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    [today, tomorrow].forEach((d) => {
      newMed.reminderTimes.forEach((t) => {
        const evtId = `evt-${newMed.id}-${d}-${t.replace(':', '')}`;
        db.addEvent({
          id: evtId,
          medicineId: newMed.id,
          medicineName: newMed.name,
          dosage: newMed.dosage,
          scheduledDate: d,
          scheduledTime: t,
          status: 'Upcoming',
          verificationStatus: 'Not Verified',
          notes: newMed.instructions,
        });
      });
    });

    res.status(201).json({ success: true, medicine: newMed });
  });

  router.put('/medicines/:id', (req, res) => {
    const updated = db.updateMedicine(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Medicine not found' });
    }
    res.json(updated);
  });

  router.delete('/medicines/:id', (req, res) => {
    const ok = db.deleteMedicine(req.params.id);
    res.json({ success: ok });
  });

  // Events & Scheduling
  router.get('/events', (req, res) => {
    const { date, medicineId, status } = req.query;
    const events = db.getEvents({
      date: date as string,
      medicineId: medicineId as string,
      status: status as string,
    });
    
    const patientOwnerId = db.getCurrentOwnerUid();
    if (patientOwnerId) {
      for (const event of events) {
        checkAndCreateDelayedNotifications(event, patientOwnerId);
      }
    }
    
    res.json(events);
  });

  // Record Dose
  router.post('/events/record', (req, res) => {
    const { eventId, status, actualTime, actualDate, verifiedWith, notes, verificationCodeScanned } = req.body;
    const event = db.getEventById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.status === 'Taken on Time' || event.status === 'Taken Late' || event.status === 'Missed') {
      return res.status(409).json({ error: 'This medication event has already been recorded.' });
    }

    const settings = db.getSettings();
    const curTime = actualTime || new Date().toTimeString().slice(0, 5);
    const curDate = actualDate || new Date().toISOString().split('T')[0];

    if (settings.requireVerification && status !== 'Missed' && event.verificationStatus !== 'Verified') {
      return res.status(409).json({
        error: 'Medicine verification is required before this dose can be recorded.',
        verificationRequired: true,
      });
    }

    let finalStatus: MedicationEvent['status'] = status || 'Taken on Time';

    if (!status || status === 'Auto') {
      const [sh, sm] = event.scheduledTime.split(':').map(Number);
      const [ah, am] = curTime.split(':').map(Number);
      const diffMins = (ah * 60 + am) - (sh * 60 + sm);

      if (diffMins > settings.lateThresholdMinutes) {
        finalStatus = 'Taken Late';
      } else {
        finalStatus = 'Taken on Time';
      }
    }

    const updated = db.updateEvent(eventId, {
      status: finalStatus,
      actualTime: curTime,
      actualDate: curDate,
      verificationStatus: verifiedWith ? 'Verified' : event.verificationStatus,
      verifiedWith: verifiedWith || event.verifiedWith,
      verificationCodeScanned: verificationCodeScanned || event.verificationCodeScanned,
      notes: notes || event.notes,
    });

    const med = db.getMedicineById(event.medicineId);
    if (med && med.remainingQuantity > 0 && finalStatus !== 'Missed') {
      const remainingQuantity = med.remainingQuantity - 1;
      db.updateMedicine(med.id, { remainingQuantity });
      if (remainingQuantity <= 5) {
        db.addAlert({
          id: `alt-refill-${med.id}-${Date.now()}`,
          patientId: db.getPatient().id,
          medicineId: med.id,
          medicineName: med.name,
          alertType: 'REFILL_NEEDED',
          message: `${med.name} (${med.dosage}) is low on stock (${remainingQuantity} doses left). Please arrange a prescription refill.`,
          priority: 'MEDIUM',
          createdAt: new Date().toISOString(),
          acknowledged: false,
        });
      }
    }

    if (finalStatus === 'Missed') {
      db.addAlert({
        id: `alt-missed-${event.id}-${Date.now()}`,
        patientId: db.getPatient().id,
        medicineId: event.medicineId,
        medicineName: event.medicineName,
        alertType: 'MISSED_DOSE',
        message: `High Priority Alert: Patient missed scheduled dose of ${event.medicineName} (${event.dosage}) scheduled at ${event.scheduledTime}.`,
        priority: 'HIGH',
        createdAt: new Date().toISOString(),
        acknowledged: false,
      });
    }

    if (finalStatus === 'Missed' || finalStatus === 'Taken Late') {
      const patient = db.getPatient();
      db.getLinksForPatient(patient.id).filter((link) => link.status === 'ACCEPTED' && (finalStatus === 'Missed' ? link.permissions.receive_missed_alerts : link.permissions.receive_delayed_alerts)).forEach((link) => {
        db.addCaregiverNotification({
          id: `cgn-${Date.now().toString(36)}-${link.caregiverUid}`,
          recipientUid: link.caregiverUid,
          patientId: patient.id,
          title: finalStatus === 'Missed' ? 'Missed medication' : 'Late dose taken',
          message: finalStatus === 'Missed'
            ? `${patient.name} missed ${event.medicineName} ${event.dosage} scheduled for ${event.scheduledTime}.`
            : `${patient.name} took ${event.medicineName} late.`,
          alertType: finalStatus === 'Missed' ? 'MISSED_DOSE' : 'LATE_DOSE',
          isRead: false,
          createdAt: new Date().toISOString(),
        });
      });
    }

    res.json(updated);
  });

  // Verify Dose
  router.post('/events/verify', (req, res) => {
    const { eventId, scannedCode, method } = req.body;
    const event = db.getEventById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const med = db.getMedicineById(event.medicineId);
    if (!med) {
      return res.status(404).json({ error: 'Associated medicine not found' });
    }

    const cleanScanned = String(scannedCode || '').trim();
    const isQrMatch = med.qrCodeData && cleanScanned.includes(med.qrCodeData);
    const isBarcodeMatch = med.barcode && cleanScanned === med.barcode;
    const isNameMatch = cleanScanned.toLowerCase().includes(med.name.toLowerCase());
    const isGenericMatch = cleanScanned.includes(`MED-${med.id}`) || cleanScanned.includes(med.name);

    const isMatch = Boolean(isQrMatch || isBarcodeMatch || isNameMatch || isGenericMatch);

    if (isMatch) {
      const updated = db.updateEvent(eventId, {
        verificationStatus: 'Verified',
        verifiedWith: method || 'QR',
        verificationCodeScanned: cleanScanned,
        notes: `Verified via ${method || 'QR Scanner'} (Code: ${cleanScanned})`,
      });

      return res.json({
        success: true,
        verificationStatus: 'Verified',
        message: `CORRECT MEDICINE VERIFIED: ${med.name} (${med.dosage}). You can now record the dose.`,
        event: updated,
      });
    } else {
      db.updateEvent(eventId, {
        verificationStatus: 'Wrong Medicine',
        notes: `Verification Mismatch: Scanned code "${cleanScanned}" does not match ${med.name}`,
      });

      db.addAlert({
        id: `alt-wrong-med-${Date.now()}`,
        patientId: db.getPatient().id,
        medicineId: med.id,
        medicineName: med.name,
        alertType: 'WRONG_MEDICINE',
        message: `CRITICAL SAFETY ALERT: Wrong medicine scanned! Expected ${med.name} (${med.dosage}), but scanned "${cleanScanned}". Medication intake blocked.`,
        priority: 'CRITICAL',
        createdAt: new Date().toISOString(),
        acknowledged: false,
      });

      return res.json({
        success: false,
        verificationStatus: 'Wrong Medicine',
        message: `WRONG MEDICINE DETECTED! Scanned code "${cleanScanned}" does not match prescription for ${med.name}. Medication intake blocked for patient safety.`,
      });
    }
  });

  // Alerts
  router.get('/alerts', (req, res) => {
    res.json(db.getAlerts());
  });

  router.post('/alerts/:id/acknowledge', (req, res) => {
    const { acknowledgedBy, actionTaken } = req.body;
    const updated = db.acknowledgeAlert(
      req.params.id,
      acknowledgedBy || 'Caregiver',
      actionTaken || 'Reviewed and confirmed patient condition.'
    );
    if (!updated) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    res.json(updated);
  });

  router.post('/alerts', (req, res) => {
    const newAlert = db.addAlert({
      ...req.body,
      patientId: db.getPatient().id,
      id: req.body.id || `alt-${Date.now()}`,
      createdAt: new Date().toISOString(),
      acknowledged: false,
    });

    // Sync critical alerts to all accepted caregiver links
    const syncAlertTypes = ['MISSED_DOSE', 'DELAYED_DOSE', 'HIGH_RISK_DETECTED', 'WRONG_MEDICINE', 'REFILL_NEEDED'];
    if (syncAlertTypes.includes(newAlert.alertType)) {
      const patient = db.getPatient();
      db.getLinksForPatient(patient.id)
        .filter((link) => link.status === 'ACCEPTED')
        .filter((link) => {
          if (newAlert.alertType === 'MISSED_DOSE') return link.permissions.receive_missed_alerts !== false;
          if (newAlert.alertType === 'DELAYED_DOSE') return link.permissions.receive_delayed_alerts !== false;
          return true;
        })
        .forEach((link) => {
          // Avoid duplicate notifications for same alert
          const existing = db.getAllCaregiverNotifications().find(
            (n) => n.recipientUid === link.caregiverUid && n.alertId === newAlert.id
          );
          if (!existing) {
            db.addCaregiverNotification({
              id: `cgn-alert-${newAlert.id}-${link.caregiverUid}`,
              recipientUid: link.caregiverUid,
              patientId: patient.id,
              title: newAlert.alertType === 'MISSED_DOSE' ? 'Missed medication' :
                     newAlert.alertType === 'REFILL_NEEDED' ? 'Refill needed' :
                     newAlert.alertType === 'WRONG_MEDICINE' ? '⚠️ Wrong medicine scanned' :
                     'Patient alert',
              message: newAlert.message,
              alertType: newAlert.alertType as any,
              alertId: newAlert.id,
              isRead: false,
              createdAt: new Date().toISOString(),
            });
          }
        });
    }

    res.status(201).json(newAlert);
  });

  // Metrics & Analytics
  router.get('/metrics', (req, res) => {
    const events = db.getEvents();
    const medicines = db.getMedicines();
    const metrics = calculateAdherenceMetrics(events, medicines);
    res.json(metrics);
  });

  // Settings & Caregivers
  router.get('/settings', (req, res) => {
    res.json({
      settings: db.getSettings(),
      caregivers: db.getCaregivers(),
    });
  });

  router.put('/settings', (req, res) => {
    const updated = db.updateSettings(req.body);
    res.json(updated);
  });

  // Demo Controls
  router.post('/demo/seed', (req, res) => {
    const seed = generateHackathonDemoData();
    db.loadDemoForCurrentOwner(seed);
    res.json({ success: true, message: 'Loaded 14-day hackathon dataset with realistic adherence patterns.' });
  });

  router.post('/demo/reset', (req, res) => {
    db.resetToEmpty();
    res.json({ success: true, message: 'Database reset to empty state.' });
  });

  // AI Insights
  router.get('/ai/insights', async (req, res) => {
    try {
      const patient = db.getPatient();
      const medicines = db.getMedicines();
      const events = db.getEvents();
      const metrics = calculateAdherenceMetrics(events, medicines);
      const insights = await generateAiAdherenceInsights(patient, medicines, metrics, events);
      res.json(insights);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Error generating insights' });
    }
  });

  // Drug Interactions Check
  router.get('/ai/interactions', async (req, res) => {
    try {
      const medicines = db.getMedicines();
      const interactions = await checkDrugInteractions(medicines);
      res.json(interactions);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Error checking interactions' });
    }
  });

  // AI Chat Consultation
  router.post('/ai/chat', async (req, res) => {
    try {
      const { history, message } = req.body;
      const patient = db.getPatient();
      const medicines = db.getMedicines();
      const events = db.getEvents();
      const metrics = calculateAdherenceMetrics(events, medicines);
      const reply = await chatWithAdherenceAssistant(history || [], message || 'Hello', patient, medicines, metrics);
      res.json({ reply });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Error in AI chat' });
    }
  });

  // Python Code Inspector & Bundle Endpoint
  router.get('/python-bundle', (req, res) => {
    const pythonDir = path.join(process.cwd(), 'MediGuard_AI');
    const files: Record<string, string> = {};
    if (fs.existsSync(pythonDir)) {
      const items = fs.readdirSync(pythonDir);
      for (const item of items) {
        const full = path.join(pythonDir, item);
        if (fs.statSync(full).isFile()) {
          files[item] = fs.readFileSync(full, 'utf-8');
        }
      }
    }
    res.json(files);
  });

  // Mount router at '/api'
  app.use('/api', router);

  return app;
}
