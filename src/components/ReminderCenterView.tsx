import React, { useState } from 'react';
import {
  BellRing,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Volume2,
  QrCode,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  Info,
} from 'lucide-react';
import { MedicationEvent, Medicine, AppSettings } from '../types.js';
import { playReminderChime } from '../utils/audio.js';
import { getReminderState } from '../services/reminderService.js';

interface ReminderCenterViewProps {
  events: MedicationEvent[];
  medicines: Medicine[];
  settings: AppSettings | null;
  onRecordDose: (eventId: string, status?: string) => void;
  onOpenVerification: (event: MedicationEvent) => void;
}

export const ReminderCenterView: React.FC<ReminderCenterViewProps> = ({
  events,
  medicines,
  settings,
  onRecordDose,
  onOpenVerification,
}) => {
  const [snoozedEvents, setSnoozedEvents] = useState<Record<string, number>>({});
  const [testChimePlaying, setTestChimePlaying] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayEvents = events.filter((e) => e.scheduledDate === todayStr);

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Categorize reminders
  const categorized = todayEvents.map((evt) => {
    const [sh, sm] = evt.scheduledTime.split(':').map(Number);
    const scheduledMins = sh * 60 + sm;
    const diff = currentMinutes - scheduledMins;

    const isAlreadyTaken = evt.status === 'Taken on Time' || evt.status === 'Taken Late';
    const isExplicitMissed = evt.status === 'Missed';

    let category: 'DUE_NOW' | 'DELAYED' | 'UPCOMING' | 'COMPLETED_ON_TIME' | 'TAKEN_LATE' | 'MISSED_WINDOW';

    if (evt.status === 'Taken Late') {
      category = 'TAKEN_LATE';
    } else if (evt.status === 'Taken on Time') {
      category = 'COMPLETED_ON_TIME';
    } else if (isExplicitMissed) {
      category = 'MISSED_WINDOW';
    } else {
      const reminderState = getReminderState(evt, now, settings || {
        earlyReminderMinutes: 15,
        lateThresholdMinutes: 5,
        missedThresholdMinutes: 30,
        requireVerification: false,
        audioAlerts: false,
        voiceReminders: false,
        simulatedTimeOffsetMinutes: 0,
      });
      category = reminderState === 'UPCOMING' ? 'UPCOMING'
        : reminderState === 'DUE' ? 'DUE_NOW'
        : reminderState === 'DELAYED' ? 'DELAYED'
        : reminderState === 'MISSED' ? 'MISSED_WINDOW'
        : 'COMPLETED_ON_TIME';
    }

    return {
      event: evt,
      medicine: medicines.find((m) => m.id === evt.medicineId),
      diff,
      category,
    };
  });

  const dueNowList = categorized.filter((c) => c.category === 'DUE_NOW');
  const delayedList = categorized.filter((c) => c.category === 'DELAYED');
  const upcomingList = categorized.filter((c) => c.category === 'UPCOMING');
  const missedList = categorized.filter((c) => c.category === 'MISSED_WINDOW');
  const takenLateList = categorized.filter((c) => c.category === 'TAKEN_LATE');
  const completedList = categorized.filter((c) => c.category === 'COMPLETED_ON_TIME');

  const handleSnooze = (eventId: string) => {
    setSnoozedEvents((prev) => ({ ...prev, [eventId]: Date.now() + 10 * 60000 }));
    playReminderChime('warning');
  };

  const handleTestChime = () => {
    setTestChimePlaying(true);
    playReminderChime('due');
    setTimeout(() => setTestChimePlaying(false), 800);
  };

  return (
    <div id="reminder-center-view" className="space-y-6">
      {/* Reminder Engine Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BellRing className="w-5 h-5 text-blue-600 animate-bounce" />
            <h3 className="font-bold text-lg text-slate-900">Intelligent Reminder Engine</h3>
          </div>
          <p className="text-xs text-slate-500 max-w-xl leading-relaxed">
            Time-aware active monitor comparing current clock against prescription schedules to trigger progressive reminders, late-intake logging, and caregiver escalation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleTestChime}
            className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center gap-2 border border-blue-200 transition-all"
          >
            <Volume2 className={`w-4 h-4 ${testChimePlaying ? 'animate-pulse' : ''}`} />
            <span>Test Sound Chime</span>
          </button>
        </div>
      </div>

      {/* 1. DUE NOW SECTION (Highest Attention) */}
      {dueNowList.length > 0 && (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-blue-600 animate-ping" />
          <h4 className="font-bold text-slate-900 text-base">
            DUE NOW ({dueNowList.length})
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dueNowList.map(({ event, medicine }) => {
              const isSnoozed = Boolean(snoozedEvents[event.id]);

              return (
                <div
                  key={event.id}
                  className="bg-gradient-to-br from-blue-50/90 to-indigo-50/70 p-5 rounded-2xl border-2 border-blue-400 shadow-md relative overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="bg-blue-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                          It is time for your medicine
                        </span>
                        {isSnoozed && (
                          <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded">
                            Snoozed (10m)
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-mono font-bold text-blue-900 bg-white/80 px-2.5 py-1 rounded-lg border border-blue-200">
                        {event.scheduledTime}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-slate-900 mt-1">
                      {event.medicineName}
                    </h3>
                    <p className="text-xs font-semibold text-blue-700 font-mono">
                      Dosage: {event.dosage} • 1 Unit ({medicine?.foodTiming || 'With Water'})
                    </p>

                    {event.notes && (
                      <p className="text-xs text-slate-600 mt-2 bg-white/70 p-2.5 rounded-xl border border-blue-100">
                        Instructions: {event.notes}
                      </p>
                    )}
                  </div>

                  <div className="pt-4 mt-4 border-t border-blue-200/60 flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => onOpenVerification(event)}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <QrCode className="w-4 h-4" />
                      <span>Verify & Take</span>
                    </button>
                    <button
                      onClick={() => onRecordDose(event.id, 'Taken on Time')}
                      className="py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs"
                    >
                      I've Taken It
                    </button>
                    <button
                      onClick={() => handleSnooze(event.id)}
                      className="py-2.5 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200"
                    >
                      Remind in 10m
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
      )}

      {/* 2. DELAYED / OVERDUE SECTION */}
      {delayedList.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <h4 className="font-bold text-slate-900 text-base">
              DELAYED / OVERDUE ({delayedList.length})
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {delayedList.map(({ event, diff }) => (
              <div
                key={event.id}
                className="bg-amber-50/80 p-5 rounded-2xl border border-amber-300 shadow-2xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="bg-amber-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full uppercase">
                      Delayed by ~{Math.abs(Math.round(diff))} mins
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-900">
                      Scheduled: {event.scheduledTime}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900">{event.medicineName}</h3>
                  <p className="text-xs text-amber-800 font-medium">
                    {event.dosage} • Please take dose immediately to preserve medication efficacy.
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-amber-200 flex items-center gap-2">
                  <button
                    onClick={() => onRecordDose(event.id, 'Taken Late')}
                    className="flex-1 py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-xs"
                  >
                    <span>Taken Now (Log as Taken Late)</span>
                  </button>
                  <button
                    onClick={() => onRecordDose(event.id, 'Missed')}
                    className="py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
                  >
                    Mark as Missed
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {missedList.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-rose-600" /><h4 className="font-bold text-slate-900 text-base">MISSED TODAY ({missedList.length})</h4></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {missedList.map(({ event, diff }) => <div key={event.id} className="bg-rose-50 p-5 rounded-2xl border border-rose-200"><div className="flex justify-between gap-3"><div><h3 className="font-bold text-slate-900">{event.medicineName}</h3><p className="text-xs text-slate-600">{event.dosage} • Scheduled: {event.scheduledTime}</p></div><span className="text-xs font-bold text-rose-700">MISSED</span></div><p className="text-xs text-rose-800 mt-3">Missed cutoff reached at {event.scheduledTime} ({Math.max(0, Math.round(diff))} minutes late).</p></div>)}
          </div>
        </div>
      )}

      {/* 3. UPCOMING DOSES */}
      {upcomingList.length > 0 && <div className="space-y-3">
        <h4 className="font-bold text-slate-900 text-base">
          Upcoming Scheduled Doses ({upcomingList.length})
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingList.map(({ event, medicine }) => (
              <div
                key={event.id}
                className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                    {event.scheduledTime}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium font-mono">
                    {medicine?.foodTiming || 'Standard'}
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 text-sm">{event.medicineName}</h4>
                <p className="text-xs text-slate-500">{event.dosage} • Status: Upcoming</p>
              </div>
            ))}
        </div>
      </div>
      }

      {takenLateList.length > 0 && <div className="space-y-3"><h4 className="font-bold text-slate-900 text-base">TAKEN LATE ({takenLateList.length})</h4><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{takenLateList.map(({ event, diff }) => <div key={event.id} className="bg-amber-50 p-4 rounded-2xl border border-amber-200"><h4 className="font-bold text-slate-900">{event.medicineName} <span className="font-normal text-xs">{event.dosage}</span></h4><p className="text-xs text-slate-600 mt-1">Scheduled: {event.scheduledTime} • Taken: {event.actualTime || 'Recorded'}</p><p className="text-xs text-amber-800 font-bold mt-2">{Math.max(0, Math.round(diff))} minutes late • TAKEN LATE</p></div>)}</div></div>}

      {completedList.length > 0 && <div className="space-y-3"><h4 className="font-bold text-slate-900 text-base">COMPLETED ON TIME ({completedList.length})</h4><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{completedList.map(({ event }) => <div key={event.id} className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200"><h4 className="font-bold text-slate-900">{event.medicineName} <span className="font-normal text-xs">{event.dosage}</span></h4><p className="text-xs text-slate-600 mt-1">Scheduled: {event.scheduledTime} • Taken: {event.actualTime || 'Recorded'}</p><p className="text-xs text-emerald-700 font-bold mt-2">COMPLETED ON TIME</p></div>)}</div></div>}

      {/* Prototype Realism Disclaimer */}
      <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 flex items-center gap-3 text-xs text-slate-600">
        <Info className="w-4 h-4 text-slate-500 shrink-0" />
        <p>
          <strong>Notification Architecture Note:</strong> For this hackathon demonstration, active in-app and browser notifications with synthesized audio are implemented. The architecture supports automated background Web Push, Twilio SMS, and SendGrid email webhooks for multi-channel caregiver alerting.
        </p>
      </div>
    </div>
  );
};
