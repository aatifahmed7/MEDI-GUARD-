import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  AlertTriangle,
  QrCode,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Filter,
  Utensils,
  ShieldCheck,
} from 'lucide-react';
import { MedicationEvent, Medicine } from '../types.js';

interface ScheduleViewProps {
  events: MedicationEvent[];
  medicines: Medicine[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onRecordDose: (eventId: string, status?: string) => void;
  onOpenVerification: (event: MedicationEvent) => void;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  events,
  medicines,
  selectedDate,
  onSelectDate,
  onRecordDose,
  onOpenVerification,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Filter events by selected date
  const dayEvents = events
    .filter((e) => e.scheduledDate === selectedDate)
    .filter((e) => (filterStatus === 'ALL' ? true : e.status === filterStatus))
    .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

  const changeDateBy = (offsetDays: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + offsetDays);
    onSelectDate(d.toISOString().split('T')[0]);
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  // Group events by time slots: Morning (5-11), Afternoon (12-16), Evening (17-20), Night (21+)
  const slotGroups = [
    { title: 'Morning Doses (06:00 AM – 11:59 AM)', range: [6, 11] },
    { title: 'Afternoon Doses (12:00 PM – 04:59 PM)', range: [12, 16] },
    { title: 'Evening Doses (05:00 PM – 08:59 PM)', range: [17, 20] },
    { title: 'Night / Bedtime Doses (09:00 PM+)', range: [21, 24] },
  ];

  return (
    <div id="schedule-view" className="space-y-6">
      {/* Date Picker & Controls Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => changeDateBy(-1)}
              className="p-1.5 rounded-lg hover:bg-white text-slate-700 transition-colors"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-lg shadow-2xs text-xs font-bold text-slate-800">
              <CalendarIcon className="w-4 h-4 text-blue-600" />
              <span>{selectedDate}</span>
              {isToday && (
                <span className="bg-blue-100 text-blue-800 text-[10px] px-1.5 py-0.2 rounded font-bold">
                  Today
                </span>
              )}
            </div>
            <button
              onClick={() => changeDateBy(1)}
              className="p-1.5 rounded-lg hover:bg-white text-slate-700 transition-colors"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => onSelectDate(new Date().toISOString().split('T')[0])}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
              isToday
                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Go to Today
          </button>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 focus:outline-hidden bg-slate-50"
          >
            <option value="ALL">All Statuses ({dayEvents.length})</option>
            <option value="Taken on Time">Taken on Time</option>
            <option value="Taken Late">Taken Late</option>
            <option value="Due Now">Due Now</option>
            <option value="Upcoming">Upcoming</option>
            <option value="Missed">Missed</option>
          </select>
        </div>
      </div>

      {/* Timeline Schedule Sections */}
      {dayEvents.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
          <CalendarIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Medication Events for this Date</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            There are no scheduled doses for {selectedDate}. Select another date or add new prescriptions.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {slotGroups.map((slot, sIdx) => {
            const slotEvents = dayEvents.filter((ev) => {
              const [h] = ev.scheduledTime.split(':').map(Number);
              return h >= slot.range[0] && h <= slot.range[1];
            });

            if (slotEvents.length === 0) return null;

            return (
              <div key={sIdx} className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <h3 className="font-bold text-slate-900 text-sm">{slot.title}</h3>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">
                    {slotEvents.length} scheduled dose{slotEvents.length > 1 ? 's' : ''}
                  </span>
                </div>

                <div className="space-y-3">
                  {slotEvents.map((evt) => {
                    const med = medicines.find((m) => m.id === evt.medicineId);
                    const isTaken = evt.status === 'Taken on Time' || evt.status === 'Taken Late';
                    const isDue = evt.status === 'Due Now' || evt.status === 'Pending';
                    const isMissed = evt.status === 'Missed';

                    return (
                      <div
                        key={evt.id}
                        className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                          isDue
                            ? 'bg-blue-50/60 border-blue-200 shadow-xs'
                            : isTaken
                            ? 'bg-slate-50/80 border-slate-200'
                            : isMissed
                            ? 'bg-rose-50/60 border-rose-200'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex items-start sm:items-center gap-3.5">
                          {/* Time badge */}
                          <div
                            className={`px-3 py-2 rounded-xl text-center font-mono font-bold text-xs shrink-0 ${
                              isDue
                                ? 'bg-blue-600 text-white'
                                : isTaken
                                ? 'bg-emerald-100 text-emerald-900'
                                : isMissed
                                ? 'bg-rose-100 text-rose-900'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            <span className="block text-sm">{evt.scheduledTime}</span>
                            <span className="text-[10px] font-normal uppercase opacity-80">
                              {Number(evt.scheduledTime.split(':')[0]) < 12 ? 'AM' : 'PM'}
                            </span>
                          </div>

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-slate-900 text-sm">{evt.medicineName}</h4>
                              <span className="font-mono text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                {evt.dosage}
                              </span>
                              {med?.foodTiming && (
                                <span className="text-[11px] text-slate-600 flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded font-medium">
                                  <Utensils className="w-3 h-3 text-slate-400" />
                                  {med.foodTiming}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                              {evt.notes || med?.instructions || 'Standard dosage administration'}
                            </p>
                            {evt.actualTime && (
                              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                                Logged intake time: <strong className="text-slate-700">{evt.actualTime}</strong>
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Status & Action Buttons */}
                        <div className="flex items-center gap-2 justify-end flex-wrap">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold ${
                              evt.status === 'Taken on Time'
                                ? 'bg-emerald-100 text-emerald-800'
                                : evt.status === 'Taken Late'
                                ? 'bg-amber-100 text-amber-800'
                                : evt.status === 'Due Now'
                                ? 'bg-blue-600 text-white animate-pulse'
                                : evt.status === 'Missed'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {evt.status}
                          </span>

                          {evt.verificationStatus === 'Verified' && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> QR Verified
                            </span>
                          )}

                          {evt.verificationStatus === 'Wrong Medicine' && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-rose-700 font-semibold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                              <AlertTriangle className="w-3 h-3" /> Mismatch Alert
                            </span>
                          )}

                          {!isTaken && (
                            <div className="flex items-center gap-1.5 ml-2">
                              <button
                                onClick={() => onOpenVerification(evt)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-2xs"
                              >
                                <QrCode className="w-3.5 h-3.5" />
                                <span>Verify QR</span>
                              </button>
                              <button
                                onClick={() => onRecordDose(evt.id, 'Taken on Time')}
                                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold"
                              >
                                Mark Taken
                              </button>
                              <button
                                onClick={() => onRecordDose(evt.id, 'Missed')}
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                title="Mark as Missed"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
