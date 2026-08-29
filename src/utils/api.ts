import {
  Medicine,
  MedicationEvent,
  Alert,
  PatientProfile,
  AppSettings,
  AdherenceMetrics,
  CaregiverLink,
  Message,
} from '../types.js';

import { AuthSession } from '../types.js';
import { firebaseAuth } from '../firebase/firebase.js';

async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const token = await firebaseAuth?.currentUser?.getIdToken();
  const headers = new Headers(init.headers);
  const legacyToken = window.sessionStorage.getItem('mediguard_session');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  else if (legacyToken) headers.set('Authorization', `Bearer ${legacyToken}`);
  else throw new Error('Please sign in again.');
  return fetch(input, { ...init, headers });
}

export async function authenticate(email: string, password: string): Promise<AuthSession> {
  const res = await fetch('/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Unable to sign in');
  return data;
}

export async function createAccount(fullName: string, email: string, password: string): Promise<AuthSession> {
  const res = await fetch('/api/auth/signup', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fullName, email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Unable to create account');
  return data;
}

export async function authenticateDemo(): Promise<AuthSession> {
  const res = await fetch('/api/auth/demo', { method: 'POST' });
  return res.json();
}

export async function authenticateGoogle(credential: string): Promise<AuthSession> {
  const res = await fetch('/api/auth/google', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ credential }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Unable to sign in with Google');
  return data;
}

export async function requestPhoneOtp(phone: string): Promise<{ message: string }> {
  const res = await fetch('/api/auth/phone/request', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Unable to send OTP');
  return data;
}

export async function restoreSession(token?: string): Promise<AuthSession | null> {
  const firebaseUser = firebaseAuth?.currentUser;
  console.info('[MediGuard session] request started', { authenticated: Boolean(firebaseUser) });
  const authToken = firebaseUser ? await firebaseUser.getIdToken(true) : token;
  if (!authToken) return null;
  console.info('[MediGuard session] Firebase ID token retrieved', { uid: firebaseUser?.uid });
  const res = await fetch('/api/auth/session', { headers: { Authorization: `Bearer ${authToken}` } });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    console.error('SESSION STATUS:', res.status);
    console.error('SESSION ERROR:', data);
    const error = new Error(data.error || `Session request failed (${res.status}).`);
    Object.assign(error, { status: res.status, endpoint: '/api/auth/session' });
    throw error;
  }
  const session = await res.json();
  console.info('[MediGuard session] response succeeded', { uid: session.user?.id, role: session.role ?? session.user?.role ?? null });
  return session;
}

export async function selectAccountRole(role: 'Patient' | 'Caregiver') {
  const res = await apiFetch('/api/auth/role', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role }) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Unable to save account role.');
  return data;
}

export async function generateCaretakerAccessCode() {
  const res = await apiFetch('/api/caretaker/access-code', { method: 'POST' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Unable to generate access code.');
  return data;
}

export async function fetchCurrentCaretakerAccessCode() {
  const res = await apiFetch('/api/caretaker/access-code/current');
  if (res.status === 404) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Unable to load access code.');
  return data;
}

export async function requestCaretakerAccess(payload: { patientEmail: string; accessCode: string }) {
  const res = await apiFetch('/api/caretaker/access-request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Unable to request patient access.');
  return data;
}

export async function decideCaretakerAccessRequest(id: string, decision: 'accept' | 'decline') {
  const res = await apiFetch(`/api/caregiver/access-requests/${id}/${decision}`, { method: 'POST' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Unable to update access request.');
  return data;
}

export async function fetchPatient(): Promise<PatientProfile> {
  const res = await apiFetch('/api/patient');
  return res.json();
}

export async function updatePatient(patient: Partial<PatientProfile>): Promise<PatientProfile> {
  const res = await apiFetch('/api/patient', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patient),
  });
  return res.json();
}

export async function fetchMedicines(): Promise<Medicine[]> {
  const res = await apiFetch('/api/medicines');
  return res.json();
}

export async function saveMedicine(medicine: Partial<Medicine>): Promise<Medicine> {
  if (medicine.id) {
    const res = await apiFetch(`/api/medicines/${medicine.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(medicine),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Unable to save prescription. Please try again.');
    return data.medicine || data;
  } else {
    const res = await apiFetch('/api/medicines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(medicine),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Unable to save prescription. Please try again.');
    return data.medicine || data;
  }
}

export async function deleteMedicine(id: string): Promise<{ success: boolean }> {
  const res = await apiFetch(`/api/medicines/${id}`, { method: 'DELETE' });
  return res.json();
}

export async function fetchEvents(filter?: { date?: string; medicineId?: string; status?: string }): Promise<MedicationEvent[]> {
  const params = new URLSearchParams();
  if (filter?.date) params.set('date', filter.date);
  if (filter?.medicineId) params.set('medicineId', filter.medicineId);
  if (filter?.status) params.set('status', filter.status);

  const res = await apiFetch(`/api/events?${params.toString()}`);
  return res.json();
}

export async function recordDose(payload: {
  eventId: string;
  status?: string;
  actualTime?: string;
  actualDate?: string;
  verifiedWith?: 'QR' | 'Barcode' | 'Manual' | 'Visual';
  verificationCodeScanned?: string;
  notes?: string;
}): Promise<MedicationEvent> {
  const res = await apiFetch('/api/events/record', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Unable to record dose');
  }
  return res.json();
}

export async function verifyDose(payload: {
  eventId: string;
  scannedCode: string;
  method?: 'QR' | 'Barcode' | 'Manual';
  actualTime?: string;
  actualDate?: string;
}): Promise<{
  success: boolean;
  verificationStatus: string;
  message: string;
  event?: MedicationEvent;
}> {
  const res = await apiFetch('/api/events/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Unable to verify medicine');
  }
  return res.json();
}

export async function fetchAlerts(): Promise<Alert[]> {
  const res = await apiFetch('/api/alerts');
  return res.json();
}

export async function acknowledgeAlert(
  id: string,
  acknowledgedBy: string,
  actionTaken?: string
): Promise<Alert> {
  const res = await apiFetch(`/api/alerts/${id}/acknowledge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ acknowledgedBy, actionTaken }),
  });
  return res.json();
}

export async function fetchMetrics(): Promise<AdherenceMetrics> {
  const res = await apiFetch('/api/metrics');
  return res.json();
}

export async function fetchSettings(): Promise<{ settings: AppSettings; caregivers: any[] }> {
  const res = await apiFetch('/api/settings');
  return res.json();
}

export async function updateSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
  const res = await apiFetch('/api/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  return res.json();
}

export async function seedDemoData(): Promise<{ success: boolean; message: string }> {
  const res = await apiFetch('/api/demo/seed', { method: 'POST' });
  return res.json();
}

export async function resetDatabase(): Promise<{ success: boolean; message: string }> {
  const res = await apiFetch('/api/demo/reset', { method: 'POST' });
  return res.json();
}

export async function fetchAiInsights(): Promise<any> {
  const res = await apiFetch('/api/ai/insights');
  return res.json();
}

export async function fetchDrugInteractions(): Promise<any> {
  const res = await apiFetch('/api/ai/interactions');
  const data = await res.json();
  return Array.isArray(data) ? data : data.interactions || [];
}

export async function sendChatMessage(history: { role: 'user' | 'assistant'; content: string }[], message: string): Promise<{ reply: string }> {
  const res = await apiFetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ history, message }),
  });
  return res.json();
}

export async function fetchPythonBundle(): Promise<Record<string, string>> {
  const res = await apiFetch('/api/python-bundle');
  return res.json();
}

export async function fetchConversationLinks(): Promise<CaregiverLink[]> {
  const res = await apiFetch('/api/messages/links');
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Unable to load conversations.');
  return data;
}

export async function fetchMessages(linkId: string): Promise<Message[]> {
  const res = await apiFetch(`/api/messages/${linkId}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Unable to load messages.');
  return data;
}

export async function sendMessage(payload: { linkId: string; text: string }): Promise<Message> {
  const res = await apiFetch('/api/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Unable to send message.');
  return data;
}

export async function fetchCaregiverAccess() {
  const res = await apiFetch('/api/caregiver/access');
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Unable to load caregiver access.');
  return data;
}

export async function inviteCaregiver(payload: { caregiverEmail: string; caregiverName?: string; relationship: string }) {
  const res = await apiFetch('/api/caregiver/invitations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Unable to send caregiver request.');
  return data;
}

export async function fetchCaregiverInvitations() {
  const res = await apiFetch('/api/caregiver/invitations');
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Unable to load care requests.');
  return data;
}

export async function decideCaregiverInvitation(id: string, decision: 'accept' | 'decline') {
  const res = await apiFetch(`/api/caregiver/invitations/${id}/${decision}`, { method: 'POST' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Unable to update care request.');
  return data;
}

export async function fetchCaregiverLinks() {
  const res = await apiFetch('/api/caregiver/links');
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Unable to load supported patients.');
  return data;
}

export async function fetchCaregiverPatientSummary(patientId: string) {
  const res = await apiFetch(`/api/caregiver/patients/${patientId}/summary`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Unable to load patient summary.');
  return data;
}

export async function acknowledgeCaregiverAlert(id: string, note?: string) {
  const res = await apiFetch(`/api/caregiver/alerts/${id}/acknowledge`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ note }) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Unable to acknowledge alert.');
  return data;
}

export async function fetchCaregiverNotifications() {
  const res = await apiFetch('/api/caregiver/notifications');
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Unable to load caregiver notifications.');
  return data;
}

export async function markCaregiverNotificationRead(id: string) {
  const res = await apiFetch(`/api/caregiver/notifications/${id}/read`, { method: 'POST' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Unable to mark notification read.');
  return data;
}

export async function revokeCaregiverLink(id: string) {
  const res = await apiFetch(`/api/caregiver/links/${id}/revoke`, { method: 'POST' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Unable to remove caregiver access.');
  return data;
}

export async function createAlert(alert: Record<string, unknown>) {
  const res = await apiFetch('/api/alerts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(alert),
  });
  return res.json();
}
