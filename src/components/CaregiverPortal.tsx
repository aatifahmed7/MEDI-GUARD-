import React, { useEffect, useState } from 'react';
import { Bell, HeartPulse, LogOut } from 'lucide-react';
import { CaregiverInvitation, CaregiverLink, PatientProfile } from '../types.js';
import { CaregiverMessagesPanel } from './CaregiverMessagesPanel.js';

interface PatientSummary { patient: PatientProfile; events: any[]; alerts: any[]; metrics: any; link: CaregiverLink; }
interface CaregiverPortalProps {
  name: string;
  invitations: CaregiverInvitation[];
  links: CaregiverLink[];
  summary: PatientSummary | null;
  notifications: any[];
  onDecision: (id: string, decision: 'accept' | 'decline') => Promise<void>;
  onSelectPatient: (id: string) => Promise<void>;
  onAcknowledge: (id: string) => Promise<void>;
  onMarkNotificationRead: (id: string) => Promise<void>;
  onLogout: () => Promise<void>;
  onRequestAccess: (patientEmail: string, accessCode: string) => Promise<void>;
}

export const CaregiverPortal: React.FC<CaregiverPortalProps> = ({ name, invitations, links, summary, notifications, onDecision, onSelectPatient, onAcknowledge, onMarkNotificationRead, onLogout, onRequestAccess }) => {
  const [tab, setTab] = useState<'dashboard' | 'requests' | 'patients' | 'alerts' | 'adherence' | 'history' | 'notifications' | 'messages' | 'settings'>('dashboard');
  const [patientEmail, setPatientEmail] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [requestMessage, setRequestMessage] = useState('');
  const unread = notifications.filter((notification) => !notification.isRead).length;
  const today = summary?.events || [];
  const showMonitoring = Boolean(summary) && !['requests', 'notifications', 'settings', 'patients', 'messages'].includes(tab);

  useEffect(() => {
    if (window.location.pathname === '/caretaker/messages') {
      setTab('messages');
    }
  }, []);

  return <div className="min-h-screen bg-[#F4F7FB] text-slate-900 flex">
    <aside className="w-64 bg-[#0B1F33] text-white fixed inset-y-0 left-0 p-5 flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-3 pb-5 border-b border-slate-700"><div className="w-10 h-10 rounded-xl bg-[#20C997] text-slate-950 grid place-items-center text-xl font-black">M</div><div><b>MediGuard AI</b><p className="text-[10px] uppercase tracking-wider text-slate-400">Caregiver Portal</p></div></div>
        <nav className="mt-6 space-y-1">{[
          ['dashboard', 'Dashboard'], ['requests', 'Care Requests'], ['patients', 'My Patients'], ['alerts', 'Alerts'], ['adherence', 'Adherence'], ['history', 'Medication History'], ['notifications', `Notifications${unread ? ` (${unread})` : ''}`], ['messages', 'Messages'], ['settings', 'Settings'],
        ].map(([id, label]) => <button key={id} onClick={() => {
          setTab(id as typeof tab);
          if (id === 'messages') {
            window.history.replaceState({}, '', '/caretaker/messages');
          } else if (window.location.pathname.startsWith('/caretaker')) {
            window.history.replaceState({}, '', '/caretaker/dashboard');
          }
        }} className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold ${tab === id ? 'bg-teal-400/20 text-teal-300' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>{label}</button>)}</nav>
      </div>
      <button onClick={onLogout} className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white"><LogOut className="w-4 h-4" /> Sign out</button>
    </aside>

    <main className="ml-64 flex-1 p-8 max-w-6xl">
      <header className="flex items-center justify-between mb-8"><div><p className="text-xs uppercase tracking-[0.16em] text-teal-700 font-black">CAREGIVER PORTAL</p><h1 className="text-3xl font-black mt-1">Good Evening, {name}</h1><p className="text-sm text-slate-500 mt-1">Monitor medication adherence for the people you support.</p></div><div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold"><Bell className="w-4 h-4 text-teal-700" /> {unread} unread</div></header>

      {invitations.map((inv) => <div key={inv.id} className="mb-4 p-5 rounded-2xl bg-white border border-amber-200 shadow-sm"><p className="text-xs font-black uppercase tracking-wider text-amber-700">ACCESS REQUEST SENT</p><h2 className="font-bold mt-1">Waiting for {inv.patientName || 'the patient'} to approve your request.</h2><p className="text-sm text-slate-500 mt-2">Patient: {inv.patientName || 'Protected until approval'} • Status: PENDING</p></div>)}
      {!links.length && <section className="mb-6 p-6 bg-white rounded-2xl border border-slate-200"><p className="text-xs font-black uppercase tracking-wider text-teal-700">CARETaker SETUP</p><h2 className="text-xl font-black mt-1">Connect to a Patient</h2><p className="text-sm text-slate-500 mt-2">Enter the patient's email and temporary MediGuard access code to request permission.</p><div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4"><input value={patientEmail} onChange={(e) => setPatientEmail(e.target.value)} type="email" placeholder="Patient email address" className="px-3 py-2 rounded-xl border border-slate-300 text-sm" /><input value={accessCode} onChange={(e) => setAccessCode(e.target.value)} placeholder="Patient access code" className="px-3 py-2 rounded-xl border border-slate-300 text-sm uppercase" /></div><button onClick={async () => { try { await onRequestAccess(patientEmail, accessCode); setRequestMessage('Access request sent. Waiting for the patient to approve.'); } catch (error: any) { setRequestMessage(error?.message || 'Unable to request access.'); } }} className="mt-3 px-4 py-2 rounded-xl bg-teal-700 text-white text-xs font-bold">Request Access</button>{requestMessage && <p className="text-xs text-teal-700 mt-2">{requestMessage}</p>}<p className="text-xs text-slate-500 mt-3">Don't have an access code? Ask the patient to generate one from MediGuard Settings.</p></section>}

      {tab === 'requests' && <section className="p-8 text-center bg-white rounded-2xl border border-slate-200"><h2 className="font-black text-lg">Care Requests</h2><p className="text-sm text-slate-500 mt-2">Pending invitations require your explicit acceptance before any patient information is shown.</p></section>}
      {tab === 'patients' && <section className="grid grid-cols-1 md:grid-cols-2 gap-4">{links.length ? links.map((link) => <button key={link.id} onClick={() => onSelectPatient(link.patientId)} className="text-left p-5 bg-white rounded-2xl border border-slate-200 hover:border-teal-400"><p className="text-xs text-slate-500 uppercase font-bold">My Care Circle</p><h2 className="text-lg font-black mt-2">{link.patientName || link.patientId}</h2><p className="text-sm text-slate-500">{link.relationship}</p><span className="inline-block mt-4 text-xs font-bold text-teal-700">View patient</span></button>) : <EmptyState />}</section>}
      {tab === 'notifications' && <section className="space-y-3"><h2 className="font-black text-xl">Notifications</h2>{notifications.length ? notifications.map((notification) => <div key={notification.id} className="p-4 bg-white rounded-2xl border border-slate-200 flex items-center justify-between gap-3"><p className="text-sm">{notification.message}</p>{!notification.isRead && <button onClick={() => onMarkNotificationRead(notification.id)} className="text-xs font-bold text-teal-700">Mark read</button>}</div>) : <EmptyState />}</section>}
      {tab === 'messages' && <CaregiverMessagesPanel links={links} />}
      {tab === 'settings' && <section className="p-6 bg-white rounded-2xl border border-slate-200"><h2 className="font-black text-xl">Caregiver Profile & Settings</h2><p className="text-sm text-slate-500 mt-2">Signed in as {name}. Patient records are read-only in this portal.</p></section>}
      {tab === 'alerts' && <section className="space-y-3"><h2 className="font-black text-xl">Alerts</h2>{summary?.alerts.length ? summary.alerts.map((alert: any) => <div key={alert.id} className="p-4 bg-white rounded-2xl border border-slate-200 flex items-center justify-between gap-3"><p className="text-sm">{alert.message}</p>{!alert.acknowledged && <button onClick={() => onAcknowledge(alert.id)} className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold">Acknowledge</button>}</div>) : <EmptyState />}</section>}
      {tab === 'adherence' && <section className="p-6 bg-white rounded-2xl border border-slate-200"><h2 className="font-black text-xl">Adherence</h2><p className="text-3xl font-black text-teal-700 mt-4">{summary?.metrics?.overallScore ?? 0}%</p><p className="text-sm text-slate-500 mt-1">Current linked-patient adherence score. Read-only monitoring.</p></section>}
      {tab === 'history' && <section className="p-6 bg-white rounded-2xl border border-slate-200"><h2 className="font-black text-xl">Medication History</h2><div className="mt-4 space-y-2">{summary?.events?.map((event: any) => <p key={event.id} className="text-sm p-3 bg-slate-50 rounded-xl">{event.scheduledDate} • {event.medicineName} • {event.status}</p>) || <EmptyState />}</div></section>}
      {showMonitoring && <>{!summary ? <EmptyState /> : <><section className="grid grid-cols-2 lg:grid-cols-4 gap-4"><Stat label="Patient" value={summary.patient.name} /><Stat label="Today's adherence" value={`${summary.metrics?.overallScore ?? 0}%`} /><Stat label="Risk" value={summary.metrics?.riskLevel || 'LOW'} /><Stat label="Missed doses" value={String(summary.metrics?.missed || 0)} /></section><section className="mt-6 bg-white rounded-2xl border border-slate-200 p-6"><h2 className="font-black text-lg">Today's Medication Status</h2><div className="mt-4 space-y-3">{today.length ? today.map((event: any) => <div key={event.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50"><div><b className="text-sm">{event.medicineName}</b><p className="text-xs text-slate-500">{event.dosage} • {event.scheduledTime}</p></div><span className="text-xs font-black">{event.status === 'Missed' ? 'MISSED' : event.status === 'Taken Late' ? 'TAKEN LATE' : event.status === 'Taken on Time' ? 'TAKEN ON TIME' : 'PENDING'}</span></div>) : <p className="text-sm text-slate-500">No medication events for today.</p>}</div></section></>}</>}
    </main>
  </div>;
};

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => <div className="bg-white p-5 rounded-2xl border border-slate-200"><p className="text-xs text-slate-500">{label}</p><h2 className="font-black text-lg mt-1">{value}</h2></div>;
const EmptyState: React.FC = () => <div className="col-span-full p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300"><HeartPulse className="w-10 h-10 text-slate-300 mx-auto" /><p className="font-bold mt-3">No patients are connected yet.</p><p className="text-sm text-slate-500 mt-1">Accept a care request to view permitted adherence information.</p></div>;
