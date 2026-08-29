import React, { useState } from 'react';
import {
  HeartPulse,
  ShieldAlert,
  CheckCircle2,
  Phone,
  Mail,
  User,
  Clock,
  AlertTriangle,
  Send,
  Plus,
  Info,
} from 'lucide-react';
import { Alert, CaregiverContact, PatientProfile } from '../types.js';

interface CaregiverViewProps {
  alerts: Alert[];
  caregivers: CaregiverContact[];
  patient: PatientProfile | null;
  onAcknowledgeAlert: (id: string, acknowledgedBy: string, actionTaken?: string) => Promise<void>;
  onTriggerTestAlert: (type: 'MISSED_DOSE' | 'WRONG_MEDICINE' | 'REFILL_NEEDED') => void;
}

export const CaregiverView: React.FC<CaregiverViewProps> = ({
  alerts,
  caregivers,
  patient,
  onAcknowledgeAlert,
  onTriggerTestAlert,
}) => {
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [selectedAlertForAck, setSelectedAlertForAck] = useState<Alert | null>(null);
  const [ackName, setAckName] = useState('Michael Vance (Son)');
  const [ackNotes, setAckNotes] = useState('Called patient, verified they are safe and took the dose.');

  const filteredAlerts = alerts
    .filter((a) => (filterPriority === 'ALL' ? true : a.priority === filterPriority))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const unacknowledgedCount = alerts.filter((a) => !a.acknowledged).length;

  const handleConfirmAck = async () => {
    if (!selectedAlertForAck) return;
    await onAcknowledgeAlert(selectedAlertForAck.id, ackName, ackNotes);
    setSelectedAlertForAck(null);
  };

  return (
    <div id="caregiver-view" className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <HeartPulse className="w-6 h-6 text-rose-600" />
            <h2 className="text-xl font-bold text-slate-900">Caregiver Alert & Support Center</h2>
          </div>
          <p className="text-xs text-slate-500 max-w-xl leading-relaxed">
            Real-time safety monitor providing immediate notifications to family members and healthcare providers when doses are missed or safety violations occur.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold ${
              unacknowledgedCount > 0
                ? 'bg-rose-100 text-rose-800 animate-pulse'
                : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            {unacknowledgedCount} Unresolved Alert{unacknowledgedCount === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {/* Grid: Caregiver Contacts & Escalation Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 1 Col: Designated Caregivers */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-sm">Designated Caregivers</h3>
            <span className="text-xs text-slate-500 font-mono">
              {caregivers.length || 2} Active
            </span>
          </div>

          <div className="space-y-3">
            {(caregivers.length > 0
              ? caregivers
              : [
                  {
                    id: 'cg-1',
                    name: 'Michael Vance',
                    relationship: 'Son / Primary Family Caregiver',
                    phone: '+1 (555) 987-6543',
                    email: 'michael.vance@example.com',
                    isPrimary: true,
                    alertLevel: 'ALL' as const,
                  },
                  {
                    id: 'cg-2',
                    name: 'Nurse Clara Rodriguez, RN',
                    relationship: 'Home Care Nurse',
                    phone: '+1 (555) 456-7890',
                    email: 'clara.rodriguez@cityhealth.org',
                    isPrimary: false,
                    alertLevel: 'CRITICAL_ONLY' as const,
                  },
                ]
            ).map((cg, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                      <User className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{cg.name}</p>
                      <p className="text-[11px] text-slate-500">{cg.relationship}</p>
                    </div>
                  </div>
                  {cg.isPrimary && (
                    <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded">
                      Primary
                    </span>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-slate-600 text-[11px]">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" />
                    {cg.phone}
                  </span>
                  <span className="font-semibold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                    Tier: {cg.alertLevel}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Test Alert Dispatch for Hackathon */}
          <div className="pt-3 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Dispatch Safety Test Alerts:
            </p>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => onTriggerTestAlert('MISSED_DOSE')}
                className="w-full py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold text-xs border border-rose-300 transition-colors text-left flex items-center justify-between"
              >
                <span>🚨 Simulate Missed Dose Escalation</span>
                <span className="text-[10px] bg-rose-200 px-1.5 py-0.5 rounded">HIGH</span>
              </button>
              <button
                onClick={() => onTriggerTestAlert('WRONG_MEDICINE')}
                className="w-full py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold text-xs border border-rose-300 transition-colors text-left flex items-center justify-between"
              >
                <span>⚠ Simulate Wrong Medicine Warning</span>
                <span className="text-[10px] bg-rose-200 px-1.5 py-0.5 rounded">CRITICAL</span>
              </button>
              <button
                onClick={() => onTriggerTestAlert('REFILL_NEEDED')}
                className="w-full py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs border border-amber-300 transition-colors text-left flex items-center justify-between"
              >
                <span>📦 Simulate Refill Inventory Alert</span>
                <span className="text-[10px] bg-amber-200 px-1.5 py-0.5 rounded">MEDIUM</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right 2 Cols: Alerts Log Feed & Sign-Off Portal */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Caregiver Incident & Alert Feed</h3>
              <p className="text-xs text-slate-500">Live priority queue with audit trail confirmation</p>
            </div>

            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 focus:outline-hidden bg-slate-50"
            >
              <option value="ALL">All Priorities ({alerts.length})</option>
              <option value="CRITICAL">Critical Only</option>
              <option value="HIGH">High Priority</option>
              <option value="MEDIUM">Medium Priority</option>
              <option value="LOW">Low Priority</option>
            </select>
          </div>

          {filteredAlerts.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800">All Clear</p>
              <p className="text-xs text-slate-500 mt-0.5">
                No active or unacknowledged caregiver alerts found.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[520px] overflow-y-auto custom-scrollbar">
              {filteredAlerts.map((alt) => {
                const isCritical = alt.priority === 'CRITICAL' || alt.priority === 'HIGH';

                return (
                  <div
                    key={alt.id}
                    className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                      alt.acknowledged
                        ? 'bg-slate-50/70 border-slate-200 opacity-75'
                        : isCritical
                        ? 'bg-rose-50/80 border-rose-300 shadow-2xs'
                        : 'bg-amber-50/80 border-amber-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            alt.acknowledged
                              ? 'bg-emerald-100 text-emerald-700'
                              : isCritical
                              ? 'bg-rose-600 text-white'
                              : 'bg-amber-500 text-white'
                          }`}
                        >
                          {alt.acknowledged ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : (
                            <ShieldAlert className="w-5 h-5" />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                                isCritical
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-amber-500 text-white'
                              }`}
                            >
                              {alt.priority} PRIORITY
                            </span>
                            <span className="text-xs font-bold text-slate-800 font-mono">
                              {alt.alertType.replace('_', ' ')}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              {new Date(alt.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>

                          <p className="text-xs text-slate-800 font-medium mt-1 leading-relaxed">
                            {alt.message}
                          </p>

                          {alt.acknowledged && (
                            <div className="mt-2 p-2 bg-white/80 rounded-lg border border-slate-200 text-[11px] text-slate-600">
                              <span className="font-bold text-emerald-800">
                                Acknowledged by {alt.acknowledgedBy} at{' '}
                                {alt.acknowledgedAt ? new Date(alt.acknowledgedAt).toLocaleTimeString() : ''}
                              </span>
                              {alt.actionTaken && (
                                <p className="text-slate-500 italic mt-0.5">
                                  Action: "{alt.actionTaken}"
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {!alt.acknowledged && (
                        <button
                          onClick={() => setSelectedAlertForAck(alt)}
                          className="shrink-0 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors shadow-2xs"
                        >
                          Sign-Off & Acknowledge
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Acknowledge Sign-Off Modal */}
      {selectedAlertForAck && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <h3 className="font-bold text-lg text-slate-900">
              Caregiver Incident Sign-Off
            </h3>
            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
              {selectedAlertForAck.message}
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Acknowledged By *
              </label>
              <input
                type="text"
                value={ackName}
                onChange={(e) => setAckName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Clinical Action / Response Notes
              </label>
              <textarea
                rows={2}
                value={ackNotes}
                onChange={(e) => setAckNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-hidden"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedAlertForAck(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAck}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs"
              >
                Confirm Sign-Off
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
