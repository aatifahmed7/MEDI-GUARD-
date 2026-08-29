import React, { useState } from 'react';
import { HeartPulse, Pill, ArrowRight } from 'lucide-react';

interface RoleSelectionViewProps {
  onSelect: (role: 'Patient' | 'Caregiver') => Promise<void>;
}

export const RoleSelectionView: React.FC<RoleSelectionViewProps> = ({ onSelect }) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const choose = async (role: 'Patient' | 'Caregiver') => {
    setBusy(true);
    setError('');
    try { await onSelect(role); } catch (err: any) { setError(err?.message || 'Unable to save your role.'); setBusy(false); }
  };
  return <main className="min-h-screen bg-[#F4F7FB] text-[#102033] flex items-center justify-center p-6">
    <section className="w-full max-w-4xl bg-white rounded-[28px] shadow-2xl shadow-[#071E33]/10 p-8 sm:p-12">
      <div className="text-center max-w-xl mx-auto"><div className="mx-auto w-14 h-14 rounded-2xl bg-[#14B8A6] text-[#071E33] grid place-items-center text-2xl font-black">M</div><p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-[#0F766E]">Welcome to MediGuard AI</p><h1 className="mt-2 text-3xl sm:text-4xl font-black">How will you use MediGuard?</h1><p className="mt-3 text-sm text-slate-500">Choose how you would like to use MediGuard.</p></div>
      <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-5">{[{ role: 'Patient' as const, title: 'Patient', copy: 'Manage your medicines, schedules, reminders, verification and adherence.', Icon: Pill }, { role: 'Caregiver' as const, title: 'Caretaker', copy: 'Support a patient and monitor their medication adherence and important alerts.', Icon: HeartPulse }].map(({ role, title, copy, Icon }) => <button key={role} disabled={busy} onClick={() => choose(role)} className="group text-left p-6 rounded-2xl border border-slate-200 hover:border-[#14B8A6] hover:shadow-lg transition-all disabled:opacity-60"><div className="w-12 h-12 rounded-xl bg-[#E6FFFA] text-[#0F766E] grid place-items-center"><Icon className="w-6 h-6" /></div><h2 className="mt-5 text-xl font-black">{title}</h2><p className="mt-2 text-sm leading-relaxed text-slate-500">{copy}</p><span className="mt-6 inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#0F766E]">Continue as {title} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></span></button>)}</div>
      {error && <p className="mt-6 text-center text-sm font-semibold text-rose-700">{error}</p>}
    </section>
  </main>;
};
