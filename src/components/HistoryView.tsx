import React, { useState } from 'react';
import {
  History,
  Download,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Printer,
  Calendar,
  FileSpreadsheet,
} from 'lucide-react';
import { MedicationEvent, Medicine } from '../types.js';

interface HistoryViewProps {
  events: MedicationEvent[];
  medicines: Medicine[];
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  events,
  medicines,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedMed, setSelectedMed] = useState('ALL');

  const filteredEvents = events
    .filter((e) => {
      const matchSearch =
        e.medicineName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.dosage.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.notes && e.notes.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchStatus = selectedStatus === 'ALL' || e.status === selectedStatus;
      const matchMed = selectedMed === 'ALL' || e.medicineId === selectedMed;

      return matchSearch && matchStatus && matchMed;
    })
    .sort((a, b) => {
      const dateDiff = b.scheduledDate.localeCompare(a.scheduledDate);
      if (dateDiff !== 0) return dateDiff;
      return b.scheduledTime.localeCompare(a.scheduledTime);
    });

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      'Scheduled Date',
      'Scheduled Time',
      'Actual Date',
      'Actual Time',
      'Medicine Name',
      'Dosage',
      'Status',
      'Verification Status',
      'Verified With',
      'Verification Code',
      'Notes',
    ];

    const rows = filteredEvents.map((e) => [
      e.scheduledDate,
      e.scheduledTime,
      e.actualDate || '',
      e.actualTime || '',
      `"${e.medicineName}"`,
      `"${e.dosage}"`,
      e.status,
      e.verificationStatus,
      e.verifiedWith || '',
      `"${e.verificationCodeScanned || ''}"`,
      `"${(e.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `mediguard_adherence_audit_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="history-view" className="space-y-6">
      {/* Header Controls */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <History className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-slate-900">Medication Intake Audit History</h2>
          </div>
          <p className="text-xs text-slate-500 max-w-xl">
            Complete cryptographic audit trail of all scheduled doses, recorded timestamp verifications, and compliance evaluations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Sheet</span>
          </button>
          <button
            id="btn-export-csv"
            onClick={handleExportCsv}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-blue-600/20 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV Report</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex-1 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search history records..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-hidden"
            />
          </div>

          <select
            value={selectedMed}
            onChange={(e) => setSelectedMed(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-slate-50"
          >
            <option value="ALL">All Medicines ({medicines.length})</option>
            {medicines.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-slate-50"
          >
            <option value="ALL">All Statuses</option>
            <option value="Taken on Time">Taken on Time</option>
            <option value="Taken Late">Taken Late</option>
            <option value="Missed">Missed</option>
            <option value="Due Now">Due Now</option>
            <option value="Upcoming">Upcoming</option>
          </select>
        </div>

        <span className="text-xs font-mono text-slate-500 font-bold">
          Showing {filteredEvents.length} record{filteredEvents.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-16">
            <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No History Records Found</h3>
            <p className="text-xs text-slate-500 mt-1">
              Try adjusting your search queries or status filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Date & Time</th>
                  <th className="py-3.5 px-4">Medicine</th>
                  <th className="py-3.5 px-4">Dosage</th>
                  <th className="py-3.5 px-4">Intake Status</th>
                  <th className="py-3.5 px-4">Actual Recorded Time</th>
                  <th className="py-3.5 px-4">Verification</th>
                  <th className="py-3.5 px-4">Audit Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredEvents.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      <div>{ev.scheduledDate}</div>
                      <div className="text-[11px] text-blue-600 font-normal">{ev.scheduledTime}</div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{ev.medicineName}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">{ev.dosage}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          ev.status === 'Taken on Time'
                            ? 'bg-emerald-100 text-emerald-800'
                            : ev.status === 'Taken Late'
                            ? 'bg-amber-100 text-amber-800'
                            : ev.status === 'Missed'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {ev.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-800">
                      {ev.actualTime ? `${ev.actualDate || ''} ${ev.actualTime}` : '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      {ev.verificationStatus === 'Verified' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[10px]">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{ev.verifiedWith || 'QR'} Verified</span>
                        </span>
                      ) : ev.verificationStatus === 'Wrong Medicine' ? (
                        <span className="inline-flex items-center gap-1 text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200 text-[10px]">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Mismatch</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Unverified</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 text-[11px] max-w-xs truncate">
                      {ev.notes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
