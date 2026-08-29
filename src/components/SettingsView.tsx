import React, { useEffect, useState } from 'react';
import { UserRound, MapPin, HeartPulse, Stethoscope, Bell, Download, LogOut, Save, ShieldCheck } from 'lucide-react';
import { AppSettings, PatientProfile } from '../types.js';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, type User } from 'firebase/auth';
import { playReminderChime } from '../utils/audio.js';

interface SettingsViewProps {
  settings: AppSettings | null;
  patient: PatientProfile | null;
  onUpdateSettings: (settings: Partial<AppSettings>) => Promise<void>;
  onUpdatePatient: (patient: Partial<PatientProfile>) => Promise<void>;
  onLoadDemoData: () => Promise<void>;
  onResetDatabase: () => Promise<void>;
  onLogout: () => Promise<void>;
  authUser?: User | null;
  onSendPasswordReset?: () => Promise<void>;
  caregiverAccess?: { invitations: any[]; links: any[] };
  onRevokeCaregiver?: (id: string) => Promise<void>;
  onGenerateCaretakerCode?: () => Promise<{ code: string; expiresAt: string }>;
  onDecideCaretakerRequest?: (id: string, decision: 'accept' | 'decline') => Promise<void>;
  onLoadCurrentCaretakerCode?: () => Promise<{ code: string; expiresAt: string } | null>;
}

const Field: React.FC<{ label: string; value: string | number; type?: string; onChange: (value: string) => void }> = ({ label, value, type = 'text', onChange }) => (
  <label className="block"><span className="field-label">{label}</span><input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" /></label>
);

const calculateAge = (dateOfBirth?: string) => {
  if (!dateOfBirth) return '';
  const birth = new Date(`${dateOfBirth}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return '';
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const beforeBirthday = today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());
  if (beforeBirthday) age -= 1;
  return String(Math.max(0, age));
};

export const SettingsView: React.FC<SettingsViewProps> = ({ settings, patient, onUpdateSettings, onUpdatePatient, onLogout, authUser, onSendPasswordReset, caregiverAccess, onRevokeCaregiver, onGenerateCaretakerCode, onDecideCaretakerRequest, onLoadCurrentCaretakerCode }) => {
  const [profile, setProfile] = useState<PatientProfile>(patient || { id: '', name: '', age: 0, gender: '', bloodGroup: '' });
  const [early, setEarly] = useState(settings?.earlyReminderMinutes || 10);
  const [late, setLate] = useState(settings?.lateThresholdMinutes || 5);
  const [missed, setMissed] = useState(settings?.missedThresholdMinutes || 30);
  const [sound, setSound] = useState(settings?.audioAlerts ?? true);
  const [reminderSound, setReminderSound] = useState(settings?.reminderSound || 'soft-chime');
  const [saved, setSaved] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [securityMessage, setSecurityMessage] = useState('');
  const [accessCode, setAccessCode] = useState<{ code: string; expiresAt: string } | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const isEmailProvider = Boolean(authUser?.providerData.some((provider) => provider.providerId === 'password'));
  const authMethod = authUser?.providerData[0]?.providerId === 'google.com' ? 'Google' : authUser?.providerData[0]?.providerId === 'phone' ? 'Phone' : isEmailProvider ? 'Email' : 'Firebase';

  useEffect(() => { if (patient) setProfile(patient); }, [patient]);
  useEffect(() => { void onLoadCurrentCaretakerCode?.().then((code) => { if (code) setAccessCode(code); }); }, [onLoadCurrentCaretakerCode]);
  useEffect(() => { onLoadCurrentCaretakerCode?.().then((code) => { if (code) setAccessCode(code); }).catch(() => undefined); }, [onLoadCurrentCaretakerCode]);
  useEffect(() => { if (settings) { setEarly(settings.earlyReminderMinutes); setLate(settings.lateThresholdMinutes); setMissed(settings.missedThresholdMinutes); setSound(settings.audioAlerts); setReminderSound(settings.reminderSound || 'soft-chime'); } }, [settings]);

  const update = (key: keyof PatientProfile, value: string) => setProfile((current) => ({ ...current, [key]: value }));
  const save = async () => { await onUpdatePatient({ ...profile, age: Number(calculateAge(profile.dateOfBirth)) || profile.age }); await onUpdateSettings({ earlyReminderMinutes: early, lateThresholdMinutes: late, missedThresholdMinutes: missed, audioAlerts: sound, reminderSound }); setSaved(true); window.setTimeout(() => setSaved(false), 2200); };
  const changePassword = async () => {
    if (!authUser || !isEmailProvider) return;
    if (newPassword.length < 8 || newPassword !== confirmNewPassword) { setSecurityMessage('Use at least 8 characters and make both new passwords match.'); return; }
    try { await reauthenticateWithCredential(authUser, EmailAuthProvider.credential(authUser.email || '', currentPassword)); await updatePassword(authUser, newPassword); setCurrentPassword(''); setNewPassword(''); setConfirmNewPassword(''); setSecurityMessage('Password updated successfully.'); } catch { setSecurityMessage('Current password could not be verified. Please try again.'); }
  };

  return <div id="settings-view" className="space-y-6">
    <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">ACCOUNT & SETTINGS</p><h2 className="text-3xl font-black text-slate-900 mt-1">Personal & Care Information</h2><p className="text-sm text-slate-500 mt-2">Manage your profile, care contacts, medication preferences, security, and data.</p></div>
    {saved && <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-center gap-2"><ShieldCheck className="w-4 h-4" />Changes saved successfully.</div>}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <section className="account-card lg:col-span-2"><h3><HeartPulse /> Caretaker Access</h3>{caregiverAccess?.links?.length ? caregiverAccess.links.map((link: any) => <div key={link.id} className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200"><div><b>{link.caregiverName}</b><p className="text-xs text-slate-600">{link.relationship} • {link.caregiverEmail} • CONNECTED</p></div>{onRevokeCaregiver && <button onClick={() => onRevokeCaregiver(link.id)} className="secondary-account-button">Remove Access</button>}</div>) : <p className="text-sm text-slate-500">No caretaker is currently connected.</p>}{caregiverAccess?.invitations?.filter((inv: any) => inv.status === 'PENDING').map((inv: any) => <div key={inv.id} className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200"><p className="text-xs text-amber-800">{inv.caregiverName || inv.caregiverEmail} requested caretaker access. Status: PENDING</p><div className="flex gap-2 mt-2"><button onClick={() => onDecideCaretakerRequest?.(inv.id, 'accept')} className="primary-account-button">Accept</button><button onClick={() => onDecideCaretakerRequest?.(inv.id, 'decline')} className="secondary-account-button">Decline</button></div></div>)}<div className="mt-4 flex flex-wrap gap-2"><button onClick={async () => { if (onGenerateCaretakerCode) setAccessCode(await onGenerateCaretakerCode()); }} className="primary-account-button">Generate Caretaker Access Code</button>{accessCode && <div className="p-3 rounded-xl bg-slate-50 border border-slate-200"><b className="font-mono tracking-wider">{accessCode.code}</b><p className="text-xs text-slate-500">Valid for 24 hours • Copy and give this code to your caretaker.</p><button type="button" onClick={() => navigator.clipboard?.writeText(accessCode.code)} className="text-xs font-bold text-teal-700 mt-1">Copy Code</button></div>}</div></section>
      <section className="account-card"><h3><UserRound /> Patient Profile</h3><div className="grid grid-cols-2 gap-3"><Field label="Full Name" value={profile.name} onChange={(v) => update('name', v)} /><label className="block"><span className="field-label">Age (calculated)</span><input readOnly value={calculateAge(profile.dateOfBirth) || 'Add date of birth'} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-500" /></label><Field label="Date of Birth" type="date" value={profile.dateOfBirth || ''} onChange={(v) => update('dateOfBirth', v)} /><label className="block"><span className="field-label">Gender (optional)</span><select value={profile.gender || ''} onChange={(e) => update('gender', e.target.value)} className="account-select"><option value="">Prefer not to say</option><option>Male</option><option>Female</option><option>Other</option></select></label><Field label="Preferred Language" value={profile.preferredLanguage || ''} onChange={(v) => update('preferredLanguage', v)} /><label className="block"><span className="field-label">Time Zone</span><select value={profile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone} onChange={(e) => update('timezone', e.target.value)} className="account-select"><option value="Asia/Kolkata">Asia/Kolkata (IST)</option><option value="Asia/Dubai">Asia/Dubai</option><option value="Europe/London">Europe/London</option><option value="America/New_York">America/New_York</option><option value="America/Los_Angeles">America/Los_Angeles</option></select></label></div></section>
      <section className="account-card"><h3><MapPin /> Contact Information</h3><div className="grid grid-cols-2 gap-3"><Field label="Email Address" type="email" value={profile.email || ''} onChange={(v) => update('email', v)} /><Field label="Phone Number" type="tel" value={profile.phone || ''} onChange={(v) => update('phone', v)} /><Field label="Country" value={profile.country || ''} onChange={(v) => update('country', v)} /><Field label="State" value={profile.state || ''} onChange={(v) => update('state', v)} /><Field label="City / Town" value={profile.city || ''} onChange={(v) => update('city', v)} /><Field label="Postal Code" value={profile.postalCode || ''} onChange={(v) => update('postalCode', v)} /></div></section>
      <section className="account-card"><h3><HeartPulse /> Caregiver / Emergency Contact</h3><div className="grid grid-cols-2 gap-3"><Field label="Caregiver Name" value={profile.caregiverName || ''} onChange={(v) => update('caregiverName', v)} /><Field label="Relationship" value={profile.caregiverRelationship || ''} onChange={(v) => update('caregiverRelationship', v)} /><Field label="Phone Number" type="tel" value={profile.caregiverPhone || ''} onChange={(v) => update('caregiverPhone', v)} /><Field label="Email Address" type="email" value={profile.caregiverEmail || ''} onChange={(v) => update('caregiverEmail', v)} /></div></section>
      <section className="account-card"><h3><Stethoscope /> Consulting Doctor</h3><div className="grid grid-cols-2 gap-3"><Field label="Doctor Name" value={profile.doctorName || ''} onChange={(v) => update('doctorName', v)} /><Field label="Specialization" value={profile.doctorSpecialization || ''} onChange={(v) => update('doctorSpecialization', v)} /><Field label="Hospital / Clinic" value={profile.doctorClinic || ''} onChange={(v) => update('doctorClinic', v)} /><Field label="Phone Number" type="tel" value={profile.doctorPhone || ''} onChange={(v) => update('doctorPhone', v)} /></div><p className="text-xs text-slate-500 mt-3">For reference only. MediGuard does not contact your doctor.</p></section>
      <section className="account-card"><h3><Bell /> Medication Preferences</h3><div className="grid grid-cols-3 gap-3"><label className="block"><span className="field-label">Early Reminder</span><select value={early} onChange={(e) => setEarly(Number(e.target.value))} className="account-select"><option value="5">5 min</option><option value="10">10 min</option><option value="15">15 min</option></select></label><Field label="Mark Late After" type="number" value={late} onChange={(v) => setLate(Number(v))} /><Field label="Mark Missed After" type="number" value={missed} onChange={(v) => setMissed(Number(v))} /></div><label className="block mt-3"><span className="field-label">Reminder Sound</span><select value={reminderSound} onChange={(e) => setReminderSound(e.target.value as typeof reminderSound)} className="account-select"><option value="soft-chime">Soft Chime</option><option value="gentle-bell">Gentle Bell</option><option value="calm-alert">Calm Alert</option><option value="digital-beep">Digital Beep</option><option value="soft-pulse">Soft Pulse</option></select></label><button type="button" onClick={() => playReminderChime('due')} className="secondary-account-button">Preview Sound</button><label className="toggle-row"><input type="checkbox" checked={sound} onChange={(e) => setSound(e.target.checked)} /> Reminder sound</label><button onClick={save} className="primary-account-button"><Save /> Save Changes</button></section>
      <section className="account-card"><h3><Download /> Data & Reports</h3><p className="text-sm text-slate-500">Download your medication history or adherence report.</p><div className="flex flex-wrap gap-2 mt-4"><button className="secondary-account-button"><Download /> Medication History</button><button className="secondary-account-button"><Download /> Adherence Report</button></div></section>
    </div>
    <section className="account-card"><div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"><div><h3><ShieldCheck /> Account & Security</h3><p className="text-sm text-slate-500">Signed in as: <strong>{authUser?.email || profile.email || 'Current Firebase account'}</strong></p><p className="text-xs text-slate-500 mt-1">Authentication method: {authMethod} • Email verified: {authUser?.emailVerified ? 'Yes' : 'No'} • Account status: Active</p></div><button onClick={onLogout} className="logout-account-button"><LogOut /> Log Out</button></div>{isEmailProvider ? <div className="mt-5 border-t border-slate-100 pt-4 grid grid-cols-1 md:grid-cols-3 gap-3"><Field label="Current password" type="password" value={currentPassword} onChange={setCurrentPassword} /><Field label="New password" type="password" value={newPassword} onChange={setNewPassword} /><Field label="Confirm new password" type="password" value={confirmNewPassword} onChange={setConfirmNewPassword} /><button onClick={changePassword} className="primary-account-button md:col-span-1">Change Password</button>{onSendPasswordReset && <button onClick={onSendPasswordReset} className="secondary-account-button">Send Password Reset Email</button>}</div> : <p className="mt-4 text-sm text-slate-600">Password managed by {authMethod}. Use your identity provider to manage account security.</p>}{securityMessage && <p className="mt-3 text-xs font-semibold text-teal-700">{securityMessage}</p>}</section>
  </div>;
};
