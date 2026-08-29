import React, { useState } from 'react';
import {
  Pill,
  Plus,
  Search,
  Clock,
  QrCode,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Download,
  Eye,
  ShieldCheck,
  Utensils,
  Calendar,
} from 'lucide-react';
import QRCode from 'qrcode';
import { Medicine } from '../types.js';

interface MedicinesViewProps {
  medicines: Medicine[];
  onAddMedicine: () => void;
  onEditMedicine: (medicine: Medicine) => void;
  onDeleteMedicine: (id: string) => void;
  onToggleActive: (id: string, active: boolean) => void;
}

export const MedicinesView: React.FC<MedicinesViewProps> = ({
  medicines,
  onAddMedicine,
  onEditMedicine,
  onDeleteMedicine,
  onToggleActive,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFoodFilter, setSelectedFoodFilter] = useState('ALL');
  const [qrModalMed, setQrModalMed] = useState<Medicine | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const filtered = medicines.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.dosage.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.instructions && m.instructions.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFood = selectedFoodFilter === 'ALL' || m.foodTiming === selectedFoodFilter;
    return matchesSearch && matchesFood;
  });

  const handleOpenQr = async (med: Medicine) => {
    try {
      const url = await QRCode.toDataURL(med.qrCodeData || `MED-${med.id}`, {
        width: 300,
        margin: 2,
        color: {
          dark: '#0B1F33',
          light: '#FFFFFF',
        },
      });
      setQrDataUrl(url);
      setQrModalMed(med);
    } catch (err) {
      console.error('Error generating QR:', err);
    }
  };

  return (
    <div id="medicines-view" className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex-1 flex flex-col sm:flex-row items-center gap-3">
          {/* Search */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search prescription or dosage..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Food filter */}
          <select
            value={selectedFoodFilter}
            onChange={(e) => setSelectedFoodFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 focus:outline-hidden bg-slate-50"
          >
            <option value="ALL">All Food Guidelines</option>
            <option value="Before Food">Before Food</option>
            <option value="After Food">After Food</option>
            <option value="With Food">With Food</option>
          </select>
        </div>

        <button
          id="btn-add-medicine"
          onClick={onAddMedicine}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Prescription</span>
        </button>
      </div>

      {/* Medicines Cards Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
          <Pill className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Prescriptions Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {searchQuery
              ? 'Try modifying your search or food timing filters.'
              : 'Add your first prescribed medication to start intelligent scheduling and verification.'}
          </p>
          {!searchQuery && (
            <button
              onClick={onAddMedicine}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs"
            >
              Add Medicine Now
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((med) => {
            const inventoryPercent = Math.min(
              100,
              Math.round((med.remainingQuantity / (med.quantity || 1)) * 100)
            );
            const isLowStock = med.remainingQuantity <= 5;

            return (
              <div
                key={med.id}
                className={`bg-white rounded-2xl border transition-all flex flex-col justify-between shadow-2xs hover:shadow-md ${
                  med.active ? 'border-slate-200/90' : 'border-slate-200 opacity-60 bg-slate-50/50'
                }`}
              >
                <div className="p-5">
                  {/* Card Top Row */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-xs"
                        style={{ backgroundColor: med.color || '#0D6EFD' }}
                      >
                        <Pill className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-base leading-tight">
                          {med.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                            {med.dosage}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">{med.form}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => onToggleActive(med.id, !med.active)}
                      className={`text-[11px] font-bold px-2 py-1 rounded-full transition-colors ${
                        med.active
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {med.active ? 'Active' : 'Paused'}
                    </button>
                  </div>

                  {/* Schedule & Timing Badges */}
                  <div className="space-y-2.5 my-4">
                    <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{med.frequency}:</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {med.reminderTimes.map((t, idx) => (
                          <span
                            key={idx}
                            className="bg-slate-100 text-slate-800 font-mono text-[11px] font-bold px-2 py-0.5 rounded"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                      <Utensils className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-semibold text-slate-800">{med.foodTiming}</span>
                    </div>

                    {med.instructions && (
                      <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 italic leading-relaxed">
                        "{med.instructions}"
                      </p>
                    )}
                  </div>

                  {/* Stock Inventory Progress */}
                  <div className="pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
                      <span className="text-slate-500">Remaining Inventory</span>
                      <span
                        className={`font-bold font-mono ${
                          isLowStock ? 'text-rose-600' : 'text-slate-800'
                        }`}
                      >
                        {med.remainingQuantity} / {med.quantity} doses
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isLowStock
                            ? 'bg-rose-500'
                            : inventoryPercent < 40
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${inventoryPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-100 rounded-b-2xl flex items-center justify-between">
                  <button
                    onClick={() => handleOpenQr(med)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-blue-600 transition-colors"
                  >
                    <QrCode className="w-3.5 h-3.5 text-blue-600" />
                    <span>Bedside QR Code</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onEditMedicine(med)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      title="Edit Prescription"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Are you sure you want to remove ${med.name}?`)) {
                          onDeleteMedicine(med.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Delete Prescription"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* QR Code Inspection & Print Modal */}
      {qrModalMed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center animate-in zoom-in-95">
            <h3 className="font-bold text-lg text-slate-900">{qrModalMed.name}</h3>
            <p className="text-xs text-slate-500 font-mono mb-4">{qrModalMed.dosage} • {qrModalMed.frequency}</p>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 inline-block mx-auto mb-4">
              <img
                src={qrDataUrl}
                alt={`${qrModalMed.name} QR Code`}
                className="w-48 h-48 mx-auto"
              />
            </div>

            <div className="text-left bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs mb-4">
              <p className="font-semibold text-slate-800">Bedside Verification Tag:</p>
              <p className="font-mono text-[11px] text-slate-600 break-all">{qrModalMed.qrCodeData}</p>
              <p className="font-mono text-[11px] text-slate-500 mt-1">Barcode: {qrModalMed.barcode}</p>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={qrDataUrl}
                download={`${qrModalMed.name.replace(/\s+/g, '_')}_QR.png`}
                className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save QR Image</span>
              </a>
              <button
                onClick={() => setQrModalMed(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
