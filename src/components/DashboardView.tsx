import React from 'react';
import {
  Pill,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  BrainCircuit,
  QrCode,
  BellRing,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  CalendarCheck,
  ChevronRight,
  HeartPulse,
} from 'lucide-react';
import {
  MedicationEvent,
  Medicine,
  AdherenceMetrics,
  PatientProfile,
  Alert,
  AppSettings,
} from '../types.js';
import { getReminderState, reminderLabel } from '../services/reminderService.js';

interface DashboardViewProps {
  patient: PatientProfile | null;
  medicines: Medicine[];
  events: MedicationEvent[];
  todayEvents: MedicationEvent[];
  metrics: AdherenceMetrics | null;
  alerts: Alert[];
  onNavigate: (tab: any) => void;
  onRecordDose: (eventId: string, status?: string) => void;
  onOpenVerification: (event: MedicationEvent) => void;
  greetingText: string;
  settings: AppSettings | null;
  currentTime: Date;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  patient,
  medicines,
  events,
  todayEvents,
  metrics,
  alerts,
  onNavigate,
  onRecordDose,
  onOpenVerification,
  greetingText,
  settings,
  currentTime,
}) => {
  const takenToday = todayEvents.filter((e) => e.status === 'Taken on Time' || e.status === 'Taken Late').length;
  const pendingToday = todayEvents.filter((e) => e.status === 'Due Now' || e.status === 'Upcoming' || e.status === 'Pending').length;
  const missedToday = todayEvents.filter((e) => e.status === 'Missed').length;

  const activeAlerts = alerts.filter((a) => !a.acknowledged);
  const adherenceScore = metrics?.overallScore ?? 0;
  const riskLevel = metrics?.riskLevel || 'MODERATE';
  const reminderSettings = settings || {
    earlyReminderMinutes: 15,
    lateThresholdMinutes: 5,
    missedThresholdMinutes: 30,
    requireVerification: false,
    audioAlerts: false,
    voiceReminders: false,
    simulatedTimeOffsetMinutes: 0,
  };
  const stateRank = { MISSED: 0, DELAYED: 1, DUE: 2, UPCOMING: 3, SNOOZED: 4, TAKEN_LATE: 5, TAKEN_ON_TIME: 6 };
  const orderedTodayEvents = [...todayEvents].sort((a, b) => {
    const aState = getReminderState(a, currentTime, reminderSettings);
    const bState = getReminderState(b, currentTime, reminderSettings);
    return stateRank[aState] - stateRank[bState] || a.scheduledTime.localeCompare(b.scheduledTime);
  });

  // SVG Gauge calculations
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (adherenceScore / 100) * circumference;

  return (
    <div id="dashboard-view" className="space-y-6">
      {/* Active Alerts Banner if unacknowledged */}
      {activeAlerts.length > 0 && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-rose-900 uppercase tracking-wider">
                {activeAlerts.length} Critical Caregiver Alert{activeAlerts.length > 1 ? 's' : ''} Active
              </p>
              <p className="text-sm text-rose-800 font-medium">
                {activeAlerts[0]?.message}
              </p>
            </div>
          </div>
          <button
            id="btn-alert-review"
            onClick={() => onNavigate('settings')}
            className="shrink-0 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shadow-xs"
          >
            Review in Settings
          </button>
        </div>
      )}

      {/* Row 1: 4 Bento Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Doses Today */}
        <div className="bg-white p-6 rounded-3xl shadow-xs border border-slate-100 flex flex-col justify-between h-36">
          <div className="flex justify-between items-start">
            <span className="text-[#64748B] text-xs font-semibold uppercase tracking-wider">Doses Today</span>
            <span className="bg-[#F5F8FC] px-2.5 py-1 rounded-lg text-[#0D6EFD] font-bold text-xs">
              {takenToday}/{todayEvents.length}
            </span>
          </div>
          <div>
            <div className="text-4xl font-bold text-[#0B1F33]">{todayEvents.length}</div>
            <div className="text-[#64748B] text-xs mt-1 font-medium">
              {pendingToday} pending • {medicines.length} prescriptions
            </div>
          </div>
        </div>

        {/* Card 2: Adherence Rate */}
        <div className="bg-white p-6 rounded-3xl shadow-xs border border-slate-100 flex flex-col justify-between h-36">
          <div className="flex justify-between items-start">
            <span className="text-[#64748B] text-xs font-semibold uppercase tracking-wider">Adherence Rate</span>
            <span className="text-[#16A34A] font-bold text-xs flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-md">
              <TrendingUp className="w-3.5 h-3.5" /> +4.2%
            </span>
          </div>
          <div>
            <div className="text-4xl font-bold text-[#0B1F33]">{adherenceScore}%</div>
            <div className="text-[#64748B] text-xs mt-1 font-medium">
              14-Day weighted clinical index
            </div>
          </div>
        </div>

        {/* Card 3: Missed Doses */}
        <div className="bg-white p-6 rounded-3xl shadow-xs border border-slate-100 flex flex-col justify-between h-36">
          <div className="flex justify-between items-start">
            <span className="text-[#64748B] text-xs font-semibold uppercase tracking-wider">Missed Doses</span>
            <span className="text-[#64748B] font-bold text-xs bg-slate-100 px-2 py-0.5 rounded-md">
              7 Days
            </span>
          </div>
          <div>
            <div className={`text-4xl font-bold ${missedToday > 0 ? 'text-rose-600' : 'text-[#0B1F33]'}`}>
              {missedToday}
            </div>
            <div className="text-[#64748B] text-xs mt-1 font-medium">
              {missedToday === 0 ? 'Zero missed today (On track)' : 'Requires caregiver alert review'}
            </div>
          </div>
        </div>

        {/* Card 4: AI Risk Level (Bento Accent Card) */}
        <div className="bg-[#20C997] p-6 rounded-3xl shadow-xs text-white flex flex-col justify-between h-36">
          <div className="flex justify-between items-start">
            <span className="text-slate-900/80 text-xs font-bold uppercase tracking-wider">AI Risk Level</span>
            <span className="bg-white/25 px-2.5 py-1 rounded-lg font-bold text-xs text-slate-950 backdrop-blur-xs">
              Predicted
            </span>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-slate-950 uppercase tracking-tight">
              {riskLevel} RISK
            </div>
            <div className="text-slate-900/80 text-xs mt-1 font-medium">
              Index: {metrics?.riskScore ?? 12}/100 • Stable intake
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Bento Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Today's Schedule Card */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-xs border border-slate-100 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-bold text-lg text-[#0B1F33]">Today's Schedule</h3>
                <p className="text-xs text-[#64748B]">Real-time medication timeline with QR intake verification</p>
              </div>
              <button
                onClick={() => onNavigate('schedule')}
                className="text-xs text-[#0D6EFD] font-bold hover:underline flex items-center gap-1"
              >
                <span>View Full Schedule</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {todayEvents.length === 0 ? (
              <div className="text-center py-10 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
                <Pill className="w-10 h-10 text-[#64748B] mx-auto mb-2 opacity-60" />
                <p className="text-sm font-semibold text-[#0B1F33]">No medication scheduled for today.</p>
                <p className="text-xs text-[#64748B] mt-1">Add your first medicine to build today's schedule.</p>
                <button onClick={() => onNavigate('medicines')} className="mt-3 px-4 py-2 bg-[#0D6EFD] hover:bg-blue-600 text-white text-xs font-bold rounded-xl shadow-xs">
                  Add your first medicine
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {orderedTodayEvents.map((evt, index) => {
                  const reminderState = getReminderState(evt, currentTime, reminderSettings);
                  const isTaken = reminderState === 'TAKEN_ON_TIME' || reminderState === 'TAKEN_LATE';
                  const isDue = reminderState === 'DUE' || reminderState === 'DELAYED';
                  const isMissed = reminderState === 'MISSED';

                  const previousState = index > 0 ? getReminderState(orderedTodayEvents[index - 1], currentTime, reminderSettings) : null;
                  const section = isTaken ? 'COMPLETED TODAY' : reminderState === 'UPCOMING' ? 'UPCOMING TODAY' : 'ACTION REQUIRED';
                  const previousSection = previousState === null ? null : (previousState === 'TAKEN_ON_TIME' || previousState === 'TAKEN_LATE') ? 'COMPLETED TODAY' : previousState === 'UPCOMING' ? 'UPCOMING TODAY' : 'ACTION REQUIRED';

                  return (
                    <React.Fragment key={evt.id}>
                      {section !== previousSection && <h4 className="pt-3 text-xs font-black uppercase tracking-[0.14em] text-[#64748B]">{section}</h4>}
                    <div
                      className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl transition-all gap-3 ${
                        isDue
                          ? 'border border-[#0D6EFD]/30 bg-[#0D6EFD]/5 shadow-xs'
                          : isTaken
                          ? 'bg-slate-50/70 border border-slate-100'
                          : isMissed
                          ? 'bg-rose-50/50 border border-rose-100'
                          : 'bg-[#F5F8FC] border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                            isDue
                              ? 'bg-[#0D6EFD] text-white shadow-xs'
                              : isTaken
                              ? 'bg-emerald-100 text-emerald-800'
                              : isMissed
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-white text-[#0B1F33] border border-slate-200'
                          }`}
                        >
                          {evt.scheduledTime}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-[#0B1F33] text-sm">{evt.medicineName}</h4>
                            <span className="text-xs text-[#64748B] font-mono">{evt.dosage}</span>
                          </div>
                          <p className="text-xs text-[#64748B] mt-0.5">
                            {evt.notes || 'Take as prescribed'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 justify-end flex-wrap">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold ${
                            evt.status === 'Taken on Time'
                              ? 'bg-emerald-100 text-emerald-800'
                              : evt.status === 'Taken Late'
                              ? 'bg-amber-100 text-amber-800'
                              : evt.status === 'Due Now'
                              ? 'bg-[#0D6EFD] text-white animate-pulse'
                              : evt.status === 'Missed'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {reminderLabel(reminderState)}
                        </span>

                        {evt.verificationStatus === 'Verified' && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-[#16A34A] font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> QR Verified
                          </span>
                        )}

                        {!isTaken && (
                          <div className="flex items-center gap-1.5 ml-1">
                            <button
                              id={`btn-verify-${evt.id}`}
                              onClick={() => onOpenVerification(evt)}
                              title="Verify Dose with QR Code"
                              className="px-3 py-1.5 rounded-xl bg-[#20C997] hover:bg-teal-500 text-slate-950 text-xs font-bold flex items-center gap-1 shadow-xs"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                              <span>Verify</span>
                            </button>
                            <button
                              id={`btn-take-${evt.id}`}
                              onClick={() => onRecordDose(evt.id, 'Taken on Time')}
                              className="px-3 py-1.5 rounded-xl bg-[#0B1F33] hover:bg-slate-800 text-white text-xs font-semibold shadow-xs"
                            >
                              Taken
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-[#64748B] gap-2">
            <span>Next upcoming dose: <strong>{todayEvents.find(e => e.status === 'Pending' || e.status === 'Upcoming')?.medicineName || 'All doses taken today'}</strong></span>
            <button
              onClick={() => onNavigate('medicines')}
              className="text-[#0D6EFD] font-semibold hover:underline"
            >
              Manage Prescriptions →
            </button>
          </div>
        </div>

        {/* Right Column (1 Col): 2 Stacked Bento Cards */}
        <div className="space-y-6">
          {/* Bento Card A: AI Prediction Circular Gauge */}
          <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-100 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BrainCircuit className="w-4 h-4 text-[#0D6EFD]" />
                <h3 className="font-bold text-[#0B1F33]">AI Prediction</h3>
              </div>
              <span className="text-[10px] uppercase font-bold text-[#64748B] bg-slate-100 px-2 py-0.5 rounded">
                Machine Learning
              </span>
            </div>

            <div className="flex items-center justify-center my-3">
              <div className="relative flex items-center justify-center">
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r={radius}
                    className="text-slate-100"
                    strokeWidth="10"
                    stroke="currentColor"
                    fill="transparent"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r={radius}
                    className="text-[#20C997] transition-all duration-1000 ease-out"
                    strokeWidth="10"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="text-2xl font-bold text-[#0B1F33]">{adherenceScore}%</span>
                  <p className="text-[10px] text-[#64748B] uppercase font-semibold">Adherence</p>
                </div>
              </div>
            </div>

            <div className="bg-[#F5F8FC] p-3.5 rounded-2xl text-xs text-[#0B1F33] mb-3">
              <p className="font-semibold text-slate-800 mb-1">Behavioral Analysis:</p>
              <p className="text-[#64748B] text-[11px] leading-relaxed">
                {metrics?.detectedPatterns?.[0] || 'More adherence data is needed before a pattern can be generated.'}
              </p>
            </div>

            <button
              id="btn-goto-ai-risk"
              onClick={() => onNavigate('airisk')}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#0B1F33] text-xs font-bold transition-all text-center"
            >
              Detailed AI Risk Report →
            </button>
          </div>

          {/* Bento Card B: Verification & Caregiver Dark Bento Card */}
          <div className="bg-[#0B1F33] rounded-3xl p-6 shadow-xs text-white border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs uppercase font-semibold text-[#64748B]">Safety & Verification</span>
                <span className="bg-[#20C997]/20 text-[#20C997] text-[10px] px-2 py-0.5 rounded-md font-bold">
                  Active
                </span>
              </div>
              <h4 className="text-base font-bold text-white mb-1.5">QR Intake Confirmation</h4>
              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                Scan prescribed medication barcode or pill packaging to confirm correct dosage before taking.
              </p>
            </div>

            <div className="space-y-2">
              <button
                id="btn-bento-verify"
                onClick={() => onNavigate('verification')}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#20C997] hover:bg-teal-400 text-slate-950 rounded-xl font-bold text-xs shadow-md transition-all"
              >
                <QrCode className="w-4 h-4" />
                <span>Open QR Camera Scanner</span>
              </button>
              <button
                id="btn-bento-caregivers"
                onClick={() => onNavigate('caregivers')}
                className="w-full flex items-center justify-center gap-2 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold text-xs transition-all"
              >
                <HeartPulse className="w-3.5 h-3.5 text-rose-400" />
                <span>Caregiver Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
