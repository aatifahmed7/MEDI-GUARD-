import React, { useState, useEffect } from 'react';
import { X, Pill, Clock, Plus, Trash2, ShieldCheck, Sparkles } from 'lucide-react';
import { Medicine, FrequencyType, FoodTiming, DosageForm } from '../types.js';

interface MedicineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (medicine: Partial<Medicine>) => Promise<void>;
  initialData?: Medicine | null;
  patientId: string;
}

const colorPalette = [
  '#0D6EFD', // Blue
  '#10B981', // Emerald
  '#8B5CF6', // Purple
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#6366F1', // Indigo
  '#14B8A6', // Teal
];

export const MedicineModal: React.FC<MedicineModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  patientId,
}) => {
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('500 mg');
  const [form, setForm] = useState<DosageForm>('Tablet');
  const [quantity, setQuantity] = useState(30);
  const [remainingQuantity, setRemainingQuantity] = useState(30);
  const [reminderTimes, setReminderTimes] = useState<string[]>(['08:00']);
  const [frequency, setFrequency] = useState<FrequencyType>('Once daily');
  const [durationDays, setDurationDays] = useState(30);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  );
  const [foodTiming, setFoodTiming] = useState<FoodTiming>('After Food');
  const [instructions, setInstructions] = useState('Take with full glass of water.');
  const [color, setColor] = useState(colorPalette[0]);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setDosage(initialData.dosage);
      setForm(initialData.form || 'Tablet');
      setQuantity(initialData.quantity);
      setRemainingQuantity(initialData.remainingQuantity);
      setReminderTimes(initialData.reminderTimes || ['08:00']);
      setFrequency(initialData.frequency);
      setDurationDays(initialData.durationDays);
      setStartDate(initialData.startDate);
      setEndDate(initialData.endDate);
      setFoodTiming(initialData.foodTiming);
      setInstructions(initialData.instructions);
      setColor(initialData.color || colorPalette[0]);
      setNotes(initialData.notes || '');
    } else {
      setName('');
      setDosage('500 mg');
      setForm('Tablet');
      setQuantity(30);
      setRemainingQuantity(30);
      setReminderTimes(['08:00']);
      setFrequency('Once daily');
      setDurationDays(30);
      setStartDate(new Date().toISOString().split('T')[0]);
      setEndDate(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
      setFoodTiming('After Food');
      setInstructions('Take with a full glass of water.');
      setColor(colorPalette[Math.floor(Math.random() * colorPalette.length)]);
      setNotes('');
    }
  }, [initialData, isOpen]);

  useEffect(() => {
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    const days = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
    if (Number.isFinite(days) && days > 0) setDurationDays(days);
  }, [startDate, endDate]);

  // Adjust reminder times when frequency changes
  const handleFrequencyChange = (freq: FrequencyType) => {
    setFrequency(freq);
    if (freq === 'Once daily') setReminderTimes(['08:00']);
    else if (freq === 'Twice daily') setReminderTimes(['08:00', '20:00']);
    else if (freq === 'Three times daily') setReminderTimes(['08:00', '13:00', '20:00']);
    else if (freq === 'Every 8 hours') setReminderTimes(['06:00', '14:00', '22:00']);
    else if (freq === 'Every 12 hours') setReminderTimes(['08:00', '20:00']);
  };

  const handleAddTime = () => {
    setReminderTimes([...reminderTimes, '12:00']);
  };

  const handleRemoveTime = (index: number) => {
    if (reminderTimes.length > 1) {
      setReminderTimes(reminderTimes.filter((_, i) => i !== index));
    }
  };

  const handleTimeChange = (index: number, val: string) => {
    const updated = [...reminderTimes];
    updated[index] = val;
    setReminderTimes(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !dosage.trim() || quantity <= 0 || !startDate || !endDate || endDate < startDate || reminderTimes.some((time) => !time)) {
      setSaveError('Please complete the required prescription fields.');
      return;
    }
    setIsSaving(true);
    setSaveError('');

    const qrCodeData = `MED-${name.toUpperCase().replace(/\s+/g, '-').slice(0, 8)}-${dosage.replace(/\s+/g, '')}`;
    const barcode = initialData?.barcode || `890${Math.floor(100000000 + Math.random() * 900000000)}`;

    try {
      await onSave({
        ...(initialData?.id ? { id: initialData.id } : {}),
        patientId,
        name: name.trim(),
        dosage,
        form,
        quantity: Number(quantity),
        remainingQuantity: Number(remainingQuantity),
        reminderTimes,
        frequency,
        durationDays: Number(durationDays),
        startDate,
        endDate,
        foodTiming,
        instructions,
        color,
        notes,
        qrCodeData,
        barcode,
        active: true,
      });
      onClose();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Unable to save prescription. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] shadow-2xl border border-slate-200 flex flex-col my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: color }}
            >
              <Pill className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {initialData ? 'Edit Prescription' : 'Add New Medicine'}
              </h3>
              <p className="text-xs text-slate-500">
                Configure dosage, scheduling timeline, and intake instructions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
          {/* Row 1: Name & Dosage */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Medicine Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Metformin HCl, Lisinopril, Paracetamol"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Dosage / Strength *
              </label>
              <input
                type="text"
                required
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                placeholder="e.g. 500 mg, 10 mg, 1 tablet"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Row 2: Form & Frequency & Food Timing */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Dosage Form
              </label>
              <select
                value={form}
                onChange={(e) => setForm(e.target.value as DosageForm)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
              >
                <option value="Tablet">Tablet</option>
                <option value="Capsule">Capsule</option>
                <option value="Syrup">Syrup</option>
                <option value="Injection">Injection</option>
                <option value="Inhaler">Inhaler</option>
                <option value="Drops">Drops</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Frequency
              </label>
              <select
                value={frequency}
                onChange={(e) => handleFrequencyChange(e.target.value as FrequencyType)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
              >
                <option value="Once daily">Once daily</option>
                <option value="Twice daily">Twice daily</option>
                <option value="Three times daily">Three times daily</option>
                <option value="Every 8 hours">Every 8 hours</option>
                <option value="Every 12 hours">Every 12 hours</option>
                <option value="Weekly">Weekly</option>
                <option value="As needed">As needed</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Food Timing
              </label>
              <select
                value={foodTiming}
                onChange={(e) => setFoodTiming(e.target.value as FoodTiming)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
              >
                <option value="Before Food">Before Food</option>
                <option value="After Food">After Food</option>
                <option value="With Food">With Food</option>
                <option value="Empty Stomach">Empty Stomach</option>
                <option value="No Restriction">No Restriction</option>
              </select>
            </div>
          </div>

          {/* Row 3: Reminder Times */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Reminder Time(s)
              </label>
              <button
                type="button"
                onClick={handleAddTime}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Time Slot
              </button>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {reminderTimes.map((time, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200"
                >
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  <input
                    type="time"
                    required
                    value={time}
                    onChange={(e) => handleTimeChange(idx, e.target.value)}
                    className="bg-transparent text-sm font-bold text-slate-900 focus:outline-hidden"
                  />
                  {reminderTimes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTime(idx)}
                      className="text-slate-400 hover:text-rose-500 ml-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Row 4: Prescription dates */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Start Date</label>
              <input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">End Date</label>
              <input type="date" required min={startDate} value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
            </div>
            <div className="flex items-end">
              <div className="w-full rounded-xl bg-teal-50 border border-teal-100 px-3.5 py-2.5 text-sm font-bold text-teal-800">Duration: {durationDays > 0 ? `${durationDays} day${durationDays === 1 ? '' : 's'}` : 'Choose valid dates'}</div>
            </div>
          </div>

          {/* Row 4: Quantity & Inventory */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Total Quantity
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Remaining Stock
              </label>
              <input
                type="number"
                min="0"
                value={remainingQuantity}
                onChange={(e) => setRemainingQuantity(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <div className="hidden sm:block" />
          </div>

          {/* Row 5: Instructions */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Instructions & Special Guidelines
            </label>
            <textarea
              rows={2}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. Take with food. Avoid grapefruit juice. Do not crush tablet."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Color tag picker */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Visual Identifier Color
            </label>
            <div className="flex items-center gap-3">
              {colorPalette.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-transform ${
                    color === c ? 'scale-125 ring-2 ring-offset-2 ring-slate-900' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            {saveError && <p className="mr-auto max-w-xs text-xs font-semibold text-rose-700">{saveError}</p>}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : initialData ? 'Save Changes' : 'Save Prescription'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
