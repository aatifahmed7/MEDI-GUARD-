import fs from 'fs';
import path from 'path';
import { AsyncLocalStorage } from 'node:async_hooks';
import { Medicine, MedicationEvent, Alert, Caregiver, PatientProfile, AppSettings, AuthUser, CaregiverInvitation, CaregiverLink, CaregiverNotification, CaretakerAccessCode, CaregiverProfile, Message } from '../src/types.js';

const isVercel = Boolean(process.env.VERCEL);
const DATA_DIR = isVercel ? path.join('/tmp', 'data') : path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'mediguard.json');
const SOURCE_DB_FILE = path.join(process.cwd(), 'data', 'mediguard.json');

export interface DatabaseSchema {
  patient: PatientProfile;
  medicines: Medicine[];
  events: MedicationEvent[];
  alerts: Alert[];
  caregivers: Caregiver[];
  settings: AppSettings;
  users?: AuthUser[];
  patients?: PatientProfile[];
  caregiverInvitations?: CaregiverInvitation[];
  caregiverLinks?: CaregiverLink[];
  caregiverNotifications?: CaregiverNotification[];
  caretakerAccessCodes?: CaretakerAccessCode[];
  caregiverProfiles?: CaregiverProfile[];
  messages?: Message[];
}

const defaultPatient: PatientProfile = {
  id: 'patient-001',
  name: 'Eleanor Vance',
  age: 68,
  gender: 'Female',
  bloodGroup: 'A+',
  conditionSummary: 'Hypertension & Type 2 Diabetes Management',
  doctorName: 'Dr. Sarah Jenkins, MD (Cardiology)',
  emergencyContact: '+1 (555) 234-8901',
  timezone: 'America/New_York',
};

const defaultCaregivers: Caregiver[] = [
  {
    id: 'cg-001',
    name: 'Michael Vance (Son)',
    relationship: 'Primary Family Caregiver',
    phone: '+1 (555) 987-6543',
    email: 'michael.vance@example.com',
    notificationLevel: 'ALL',
    active: true,
  },
  {
    id: 'cg-002',
    name: 'Nurse Clara Rodriguez, RN',
    relationship: 'Visiting Home Care Nurse',
    phone: '+1 (555) 456-7890',
    email: 'clara.rodriguez@healthcare.org',
    notificationLevel: 'CRITICAL_ONLY',
    active: true,
  },
];

const defaultSettings: AppSettings = {
  earlyReminderMinutes: 15,
  lateThresholdMinutes: 5,
  missedThresholdMinutes: 30,
  requireVerification: true,
  audioAlerts: true,
  reminderSound: 'soft-chime',
  voiceReminders: true,
  simulatedTimeOffsetMinutes: 0,
  currentSimulatedDate: undefined,
  caregivers: defaultCaregivers,
};

class Database {
  private data: DatabaseSchema;
  private ownerUid = 'demo-owner';
  private ownerContext = new AsyncLocalStorage<string>();

  private get scopedOwnerUid() {
    return this.ownerContext.getStore() || this.ownerUid;
  }

  constructor() {
    this.ensureDirectory();
    this.data = this.load();
  }

  private ensureDirectory() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
    } catch {
      // Ignore directory creation errors in read-only environments
    }
  }

  private load(): DatabaseSchema {
    try {
      let raw: string | null = null;
      if (fs.existsSync(DB_FILE)) {
        raw = fs.readFileSync(DB_FILE, 'utf-8');
      } else if (fs.existsSync(SOURCE_DB_FILE)) {
        raw = fs.readFileSync(SOURCE_DB_FILE, 'utf-8');
      }
      if (raw) {
        const parsed = JSON.parse(raw) as DatabaseSchema;
        parsed.users ||= [];
        parsed.caregiverInvitations ||= [];
        parsed.caregiverLinks ||= [];
        parsed.caregiverNotifications ||= [];
        parsed.caretakerAccessCodes ||= [];
        parsed.caregiverProfiles ||= [];
        parsed.messages ||= [];
        parsed.patients ||= [{ ...parsed.patient, ownerUid: 'demo-owner' }];
        parsed.medicines = (parsed.medicines || []).map((item) => ({ ...item, ownerUid: item.ownerUid || 'demo-owner' }));
        parsed.events = (parsed.events || []).map((item) => ({ ...item, ownerUid: item.ownerUid || 'demo-owner' }));
        parsed.alerts = (parsed.alerts || []).map((item) => ({ ...item, ownerUid: item.ownerUid || 'demo-owner' }));
        parsed.caregivers = (parsed.caregivers || []).map((item) => ({ ...item, ownerUid: item.ownerUid || 'demo-owner' }));
        parsed.settings = { ...defaultSettings, ...parsed.settings };
        if (parsed.settings.lateThresholdMinutes === 30 && parsed.settings.missedThresholdMinutes === 120) {
          parsed.settings.lateThresholdMinutes = 5;
          parsed.settings.missedThresholdMinutes = 30;
        }
        return parsed;
      }
    } catch (err) {
      console.error('Error loading database file, falling back to defaults:', err);
    }
    const initial: DatabaseSchema = {
      patient: defaultPatient,
      medicines: [],
      events: [],
      alerts: [],
      caregivers: defaultCaregivers,
      settings: defaultSettings,
      users: [],
      caregiverInvitations: [],
      caregiverLinks: [],
      caregiverNotifications: [],
      caretakerAccessCodes: [],
      caregiverProfiles: [],
      messages: [],
    };
    this.save(initial);
    return initial;
  }

  public save(dataToSave?: DatabaseSchema) {
    if (dataToSave) {
      this.data = dataToSave;
    }
    try {
      this.ensureDirectory();
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.warn('Notice: Unable to persist database to filesystem:', err);
    }
  }

  // Getters
  public setOwner(ownerUid: string) {
    const resolvedOwnerUid = ownerUid || 'demo-owner';
    this.ownerUid = resolvedOwnerUid;
    this.ownerContext.enterWith(resolvedOwnerUid);
  }

  public getCurrentOwnerUid(): string {
    return this.scopedOwnerUid;
  }

  private ownerPatient(): PatientProfile | undefined {
    return this.data.patients?.find((item) => item.ownerUid === this.scopedOwnerUid);
  }

  public getPatient(): PatientProfile {
    const patient = this.ownerPatient();
    if (patient) return patient;
    const created: PatientProfile = this.scopedOwnerUid === 'demo-owner'
      ? { ...defaultPatient, ownerUid: 'demo-owner' }
      : { id: `patient-${this.scopedOwnerUid.slice(0, 12)}`, name: 'Complete your profile', age: 0, gender: '', bloodGroup: '', timezone: 'Asia/Kolkata', ownerUid: this.scopedOwnerUid };
    this.data.patients = [...(this.data.patients || []), created];
    this.save();
    return created;
  }

  public getUsers(): AuthUser[] {
    return this.data.users || [];
  }

  public getUserById(id: string): AuthUser | undefined {
    return this.getUsers().find((user) => user.id === id);
  }

  public hasPatientOwner(ownerUid: string): boolean {
    return Boolean(this.data.patients?.some((patient) => patient.ownerUid === ownerUid));
  }

  public updateUser(id: string, updates: Partial<AuthUser>): AuthUser | null {
    const users = this.getUsers();
    const index = users.findIndex((user) => user.id === id);
    if (index === -1) return null;
    users[index] = { ...users[index], ...updates };
    this.data.users = users;
    this.save();
    return users[index];
  }

  public getInvitationById(id: string) { return this.data.caregiverInvitations?.find((item) => item.id === id); }
  public getInvitationsForPatient(patientId: string) { return (this.data.caregiverInvitations || []).filter((item) => item.patientId === patientId); }
  public getInvitationsForCaregiver(email: string) { return (this.data.caregiverInvitations || []).filter((item) => item.caregiverEmail.toLowerCase() === email.toLowerCase()); }
  public addInvitation(invitation: CaregiverInvitation) { this.data.caregiverInvitations = [...(this.data.caregiverInvitations || []), invitation]; this.save(); return invitation; }
  public updateInvitation(id: string, updates: Partial<CaregiverInvitation>) { const item = this.getInvitationById(id); if (!item) return null; Object.assign(item, updates); this.save(); return item; }
  public getLinksForPatient(patientId: string) { return (this.data.caregiverLinks || []).filter((item) => item.patientId === patientId); }
  public getLinksForCaregiver(caregiverUid: string) { return (this.data.caregiverLinks || []).filter((item) => item.caregiverUid === caregiverUid && item.status === 'ACCEPTED'); }
  public addLink(link: CaregiverLink) { this.data.caregiverLinks = [...(this.data.caregiverLinks || []), link]; this.save(); return link; }
  public updateLink(id: string, updates: Partial<CaregiverLink>) { const item = (this.data.caregiverLinks || []).find((link) => link.id === id); if (!item) return null; Object.assign(item, updates); this.save(); return item; }
  public addCaregiverNotification(notification: CaregiverNotification) { this.data.caregiverNotifications = [notification, ...(this.data.caregiverNotifications || [])]; this.save(); return notification; }
  public getAllCaregiverNotifications() { return this.data.caregiverNotifications || []; }
  public getCaregiverNotifications(recipientUid: string) { return (this.data.caregiverNotifications || []).filter((item) => item.recipientUid === recipientUid); }
  public markCaregiverNotificationRead(id: string, recipientUid: string) { const item = (this.data.caregiverNotifications || []).find((item) => item.id === id && item.recipientUid === recipientUid); if (!item) return null; item.isRead = true; this.save(); return item; }
  public getAcceptedMessageLinksForUser(uid: string) { return (this.data.caregiverLinks || []).filter((item) => item.status === 'ACCEPTED' && (item.caregiverUid === uid || item.patientOwnerUid === uid)); }
  public getMessagesForLink(linkId: string) { return (this.data.messages || []).filter((item) => item.linkId === linkId).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); }
  public addMessage(message: Message) { this.data.messages = [...(this.data.messages || []), message]; this.save(); return message; }
  public addCaretakerAccessCode(code: CaretakerAccessCode) { this.data.caretakerAccessCodes = [code, ...(this.data.caretakerAccessCodes || [])]; this.save(); return code; }
  public getValidCaretakerAccessCode(patientOwnerUid: string, codeHash: string) { return (this.data.caretakerAccessCodes || []).find((item) => item.patientOwnerUid === patientOwnerUid && item.codeHash === codeHash && !item.usedAt && new Date(item.expiresAt).getTime() > Date.now()); }
  public markCaretakerAccessCodeUsed(id: string) { const item = (this.data.caretakerAccessCodes || []).find((code) => code.id === id); if (!item) return null; item.usedAt = new Date().toISOString(); this.save(); return item; }
  public revokeCaretakerAccessCodes(patientOwnerUid: string) { const now = new Date().toISOString(); (this.data.caretakerAccessCodes || []).filter((item) => item.patientOwnerUid === patientOwnerUid && !item.usedAt && !item.revokedAt).forEach((item) => { item.revokedAt = now; }); this.save(); }
  public getCurrentCaretakerAccessCode(patientOwnerUid: string) { return (this.data.caretakerAccessCodes || []).find((item) => item.patientOwnerUid === patientOwnerUid && !item.usedAt && !item.revokedAt && new Date(item.expiresAt).getTime() > Date.now()); }
  public upsertCaregiverProfile(profile: CaregiverProfile) { const profiles = this.data.caregiverProfiles || []; const index = profiles.findIndex((item) => item.firebaseUid === profile.firebaseUid); if (index === -1) profiles.push(profile); else profiles[index] = { ...profiles[index], ...profile, updatedAt: profile.updatedAt }; this.data.caregiverProfiles = profiles; this.save(); return profile; }

  public addUser(user: AuthUser): AuthUser {
    this.data.users = [...this.getUsers(), user];
    this.save();
    return user;
  }

  public getUserPasswordHash(email: string): string | undefined {
    return this.getUsers().find((user) => user.email === email)?.passwordHash;
  }

  public updatePatient(patient: Partial<PatientProfile>): PatientProfile {
    const current = this.getPatient();
    const updated = { ...current, ...patient, ownerUid: this.scopedOwnerUid };
    this.data.patients = (this.data.patients || []).map((item) => item.id === current.id ? updated : item);
    if (this.scopedOwnerUid === 'demo-owner') this.data.patient = updated;
    this.save();
    return updated;
  }

  public getMedicines(): Medicine[] {
    return this.data.medicines.filter((item) => item.ownerUid === this.scopedOwnerUid);
  }

  public getMedicineById(id: string): Medicine | undefined {
    return this.getMedicines().find((m) => m.id === id);
  }

  public addMedicine(medicine: Medicine): Medicine {
    medicine.ownerUid = this.scopedOwnerUid;
    this.data.medicines.push(medicine);
    this.save();
    return medicine;
  }

  public updateMedicine(id: string, updates: Partial<Medicine>): Medicine | null {
    const idx = this.data.medicines.findIndex((m) => m.id === id && m.ownerUid === this.scopedOwnerUid);
    if (idx === -1) return null;
    this.data.medicines[idx] = { ...this.data.medicines[idx], ...updates };
    this.save();
    return this.data.medicines[idx];
  }

  public deleteMedicine(id: string): boolean {
    const initialLen = this.data.medicines.length;
    this.data.medicines = this.data.medicines.filter((m) => !(m.id === id && m.ownerUid === this.scopedOwnerUid));
    // Also remove future pending events for this medicine
    this.data.events = this.data.events.filter((e) => !(e.medicineId === id && e.status === 'Pending'));
    this.save();
    return this.data.medicines.length < initialLen;
  }

  public getEvents(filter?: { date?: string; medicineId?: string; status?: string }): MedicationEvent[] {
    let list = this.data.events.filter((item) => item.ownerUid === this.scopedOwnerUid);
    if (filter?.date) {
      list = list.filter((e) => e.scheduledDate === filter.date);
    }
    if (filter?.medicineId) {
      list = list.filter((e) => e.medicineId === filter.medicineId);
    }
    if (filter?.status) {
      list = list.filter((e) => e.status === filter.status);
    }
    return list;
  }

  public getEventById(id: string): MedicationEvent | undefined {
    return this.getEvents().find((e) => e.id === id);
  }

  public addEvent(event: MedicationEvent): MedicationEvent {
    event.ownerUid = this.scopedOwnerUid;
    // Prevent duplicate events for same medicine, date, and time
    const exists = this.data.events.find(
      (e) =>
        e.medicineId === event.medicineId &&
        e.scheduledDate === event.scheduledDate &&
        e.scheduledTime === event.scheduledTime
    );
    if (exists) {
      return exists;
    }
    this.data.events.push(event);
    this.save();
    return event;
  }

  public updateEvent(id: string, updates: Partial<MedicationEvent>): MedicationEvent | null {
    const idx = this.data.events.findIndex((e) => e.id === id && e.ownerUid === this.scopedOwnerUid);
    if (idx === -1) return null;
    this.data.events[idx] = { ...this.data.events[idx], ...updates };
    this.save();
    return this.data.events[idx];
  }

  public getAlerts(): Alert[] {
    return this.data.alerts.filter((item) => item.ownerUid === this.scopedOwnerUid).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public addAlert(alert: Alert): Alert {
    alert.ownerUid = this.scopedOwnerUid;
    this.data.alerts.unshift(alert);
    this.save();
    return alert;
  }

  public acknowledgeAlert(id: string, by: string, action?: string): Alert | null {
    const alert = this.data.alerts.find((a) => a.id === id && a.ownerUid === this.scopedOwnerUid);
    if (!alert) return null;
    alert.acknowledged = true;
    alert.acknowledgedAt = new Date().toISOString();
    alert.acknowledgedBy = by;
    if (action) alert.actionTaken = action;
    this.save();
    return alert;
  }

  public getCaregivers(): Caregiver[] {
    return this.data.caregivers.filter((item) => item.ownerUid === this.scopedOwnerUid);
  }

  public getSettings(): AppSettings {
    const scoped = (this.data as any).settingsByOwner?.[this.scopedOwnerUid] || (this.scopedOwnerUid === 'demo-owner' ? this.data.settings : defaultSettings);
    return scoped;
  }

  public updateSettings(settings: Partial<AppSettings>): AppSettings {
    (this.data as any).settingsByOwner ||= {};
    (this.data as any).settingsByOwner[this.scopedOwnerUid] = { ...this.getSettings(), ...settings };
    if (this.scopedOwnerUid === 'demo-owner') this.data.settings = (this.data as any).settingsByOwner[this.scopedOwnerUid];
    this.save();
    return this.data.settings;
  }

  public setAllData(schema: DatabaseSchema) {
    this.data = schema;
    this.save();
  }

  public loadDemoForCurrentOwner(schema: DatabaseSchema) {
    const owner = this.scopedOwnerUid;
    this.data.medicines = this.data.medicines.filter((item) => item.ownerUid !== owner);
    this.data.events = this.data.events.filter((item) => item.ownerUid !== owner);
    this.data.alerts = this.data.alerts.filter((item) => item.ownerUid !== owner);
    this.data.medicines.push(...schema.medicines.map((item) => ({ ...item, ownerUid: owner })));
    this.data.events.push(...schema.events.map((item) => ({ ...item, ownerUid: owner })));
    this.data.alerts.push(...schema.alerts.map((item) => ({ ...item, ownerUid: owner })));
    this.updatePatient({ name: owner === 'demo-owner' ? defaultPatient.name : this.getPatient().name });
    this.save();
  }

  public resetToEmpty() {
    this.data.medicines = this.data.medicines.filter((item) => item.ownerUid !== this.scopedOwnerUid);
    this.data.events = this.data.events.filter((item) => item.ownerUid !== this.scopedOwnerUid);
    this.data.alerts = this.data.alerts.filter((item) => item.ownerUid !== this.scopedOwnerUid);
    this.save();
  }
}

export const db = new Database();
