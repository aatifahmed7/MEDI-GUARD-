import React, { useState, useEffect, useRef } from 'react';
import {
  QrCode,
  CheckCircle2,
  AlertTriangle,
  Camera,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  Barcode,
  HelpCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { MedicationEvent, Medicine } from '../types.js';
import { playReminderChime } from '../utils/audio.js';

interface VerificationViewProps {
  events: MedicationEvent[];
  medicines: Medicine[];
  activeEvent: MedicationEvent | null;
  onVerifyDose: (payload: {
    eventId: string;
    scannedCode: string;
    method?: 'QR' | 'Barcode' | 'Manual';
  }) => Promise<{
    success: boolean;
    verificationStatus: string;
    message: string;
    event?: MedicationEvent;
  }>;
}

export const VerificationView: React.FC<VerificationViewProps> = ({
  events,
  medicines,
  activeEvent,
  onVerifyDose,
}) => {
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [scannedInput, setScannedInput] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
    const [cameraError, setCameraError] = useState('');
    const [cameraFacingMode, setCameraFacingMode] = useState<'environment' | 'user'>('environment');
    const [imagePreview, setImagePreview] = useState('');
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
  const [verificationResult, setVerificationResult] = useState<{
    status: 'IDLE' | 'SUCCESS' | 'ERROR';
    message: string;
  }>({ status: 'IDLE', message: '' });

  // Filter events needing verification or today's events
  const todayStr = new Date().toISOString().split('T')[0];
  const pendingEvents = events.filter(
    (e) =>
      e.scheduledDate === todayStr &&
      (e.status === 'Due Now' ||
        e.status === 'Upcoming' ||
        e.status === 'Pending' ||
        e.verificationStatus === 'Not Verified')
  );

  useEffect(() => {
    if (activeEvent) {
      setSelectedEventId(activeEvent.id);
      const med = medicines.find((m) => m.id === activeEvent.medicineId);
      if (med?.qrCodeData) {
        setScannedInput(med.qrCodeData);
      }
    } else if (pendingEvents.length > 0 && !selectedEventId) {
      setSelectedEventId(pendingEvents[0].id);
      const med = medicines.find((m) => m.id === pendingEvents[0].medicineId);
      if (med?.qrCodeData) {
        setScannedInput(med.qrCodeData);
      }
    }
  }, [activeEvent, pendingEvents, medicines]);

  const currentEvent = events.find((e) => e.id === selectedEventId) || pendingEvents[0] || events[0];
  const currentMed = medicines.find((m) => m.id === currentEvent?.medicineId);

  const handleSelectEvent = (id: string) => {
    setSelectedEventId(id);
    setVerificationResult({ status: 'IDLE', message: '' });
    const ev = events.find((e) => e.id === id);
    const med = medicines.find((m) => m.id === ev?.medicineId);
    if (med?.qrCodeData) {
      setScannedInput(med.qrCodeData);
    }
  };

  const handleRunVerification = async (codeToVerify?: string) => {
    if (!currentEvent) return;
    const code = codeToVerify !== undefined ? codeToVerify : scannedInput;

    setIsScanning(true);
      try {
        const res = await onVerifyDose({
          eventId: currentEvent.id,
          scannedCode: code,
          method: 'QR',
        });

        if (res.success) {
          setVerificationResult({
            status: 'SUCCESS',
            message: res.message,
          });
          playReminderChime('success');
          confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.6 },
          });
        } else {
          setVerificationResult({
            status: 'ERROR',
            message: res.message,
          });
          playReminderChime('warning');
        }
      } catch (e: any) {
        setVerificationResult({
          status: 'ERROR',
          message: e?.message || 'Verification process error',
        });
      } finally {
        setIsScanning(false);
      }
    };

    const stopCamera = () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      setIsScanning(false);
    };

    const startCamera = async () => {
      setCameraError('');
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Camera access is not supported in this browser. Use manual code or upload an image.');
        return;
      }
      try {
        stopCamera();
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: cameraFacingMode } });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setIsScanning(true);
      } catch {
        setCameraError('Camera permission was not granted. You can still upload an image or enter a code manually.');
      }
    };

    useEffect(() => {
      if (!isScanning || !videoRef.current) return;
      const BarcodeDetectorClass = (window as any).BarcodeDetector;
      if (!BarcodeDetectorClass) return;
      const detector = new BarcodeDetectorClass({ formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a', 'upc_e'] });
      const timer = window.setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2 || !currentEvent) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes[0]?.rawValue) {
            setScannedInput(codes[0].rawValue);
            stopCamera();
            await handleRunVerification(codes[0].rawValue);
          }
        } catch { /* Browser detector may reject unsupported frames. */ }
      }, 500);
      return () => window.clearInterval(timer);
    }, [isScanning, currentEvent]);

    useEffect(() => () => stopCamera(), []);

    const handleImageUpload = async (file?: File) => {
      if (!file) return;
      setImagePreview(URL.createObjectURL(file));
      const BarcodeDetectorClass = (window as any).BarcodeDetector;
      if (!BarcodeDetectorClass) return;
      try {
        const bitmap = await createImageBitmap(file);
        const codes = await new BarcodeDetectorClass().detect(bitmap);
        if (codes[0]?.rawValue) {
          setScannedInput(codes[0].rawValue);
          await handleRunVerification(codes[0].rawValue);
        }
        bitmap.close();
      } catch { /* Keep the image preview and manual fallback available. */ }
    };

  return (
    <div id="verification-view" className="space-y-6">
      {/* Overview Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-2.5 mb-1.5">
          <ShieldCheck className="w-6 h-6 text-emerald-600" />
          <h3 className="font-bold text-xl text-slate-900">QR & Barcode Medicine Verification</h3>
        </div>
        <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
          Protects patients from medication errors by physically verifying the bottle/strip before intake is confirmed. Incorrect scans trigger an immediate safety lockout and caregiver alert.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Scheduled Dose Selector & Scanner Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
            <h4 className="font-bold text-slate-900 text-sm">1. Select Scheduled Dose to Verify</h4>

            {events.length === 0 ? (
              <p className="text-xs text-slate-500">No scheduled events available.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                {(pendingEvents.length > 0 ? pendingEvents : events.slice(0, 5)).map((ev) => {
                  const isSelected = ev.id === currentEvent?.id;
                  return (
                    <button
                      key={ev.id}
                      onClick={() => handleSelectEvent(ev.id)}
                      className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-blue-50/80 border-blue-500 shadow-xs'
                          : 'bg-slate-50/50 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div>
                        <p className="font-bold text-slate-900 text-xs">{ev.medicineName}</p>
                        <p className="text-[11px] text-slate-500 font-mono">
                          {ev.dosage} • Time: {ev.scheduledTime}
                        </p>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          ev.verificationStatus === 'Verified'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {ev.verificationStatus}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="pt-3 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                2. Scanned Tag / QR Data Payload
              </label>
              <input
                type="text"
                value={scannedInput}
                onChange={(e) => setScannedInput(e.target.value)}
                placeholder="Scan or enter QR verification code..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={startCamera} className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center gap-2"><Camera className="w-4 h-4" /> Scan with camera</button>
              <button type="button" onClick={() => document.getElementById('medicine-image-upload')?.click()} className="px-3 py-2 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold">Upload medicine image</button>
              <input id="medicine-image-upload" type="file" accept=".jpg,.jpeg,.png,.webp,image/*" className="hidden" onChange={(e) => handleImageUpload(e.target.files?.[0])} />
            </div>

            <button
              id="btn-verify-now"
              disabled={isScanning || !currentEvent}
              onClick={() => handleRunVerification()}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all"
            >
              {isScanning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying Optical Data...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verify Scanned Medicine</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Interactive Scanner Viewfinder & Result Card (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-[#0B1F33] rounded-2xl p-6 text-white border border-slate-800 shadow-lg relative overflow-hidden flex flex-col items-center justify-center min-h-[260px]">
            {/* Camera targeting grid */}
            <div className="relative w-full max-w-md aspect-video rounded-2xl border-2 border-dashed border-emerald-400/60 flex items-center justify-center bg-slate-900/40 overflow-hidden">
              <video ref={videoRef} muted playsInline className={`absolute inset-0 w-full h-full object-cover ${isScanning ? '' : 'hidden'}`} />
              {!isScanning && <QrCode className="w-24 h-24 text-emerald-400 opacity-40" />}
              {/* Laser scanning line */}
              <div className="absolute left-2 right-2 h-0.5 bg-emerald-400 shadow-md shadow-emerald-400 top-1/2 -translate-y-1/2 animate-pulse" />
            </div>

            <div className="mt-4 text-center">
              <p className="text-xs font-semibold text-emerald-400 flex items-center justify-center gap-1.5">
                <Camera className="w-3.5 h-3.5" />
                <span>{isScanning ? 'Camera scanner active' : 'Ready to scan QR or barcode'}</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Expected: {currentMed?.name || 'Medicine'} ({currentMed?.dosage || ''})
              </p>
            </div>
            <div className="mt-3 flex gap-2"><button type="button" onClick={startCamera} className="px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 text-xs font-bold">Start Camera</button><button type="button" onClick={stopCamera} className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs font-bold">Stop Camera</button><button type="button" onClick={() => { setCameraFacingMode((mode) => mode === 'environment' ? 'user' : 'environment'); void startCamera(); }} className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs font-bold">Switch Camera</button></div>
            {cameraError && <p className="mt-2 text-xs text-rose-300 text-center">{cameraError}</p>}
            {imagePreview && <img src={imagePreview} alt="Uploaded medicine" className="mt-3 max-h-24 rounded-lg object-contain" />}
          </div>

          {/* Verification Result Banner */}
          {verificationResult.status === 'SUCCESS' && (
            <div className="p-5 rounded-2xl bg-emerald-50 border-2 border-emerald-400 text-emerald-950 animate-in fade-in zoom-in-95">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-emerald-900">
                    CORRECT MEDICINE VERIFIED
                  </h4>
                  <p className="text-xs text-emerald-800 font-medium mt-0.5 leading-relaxed">
                    {verificationResult.message}
                  </p>
                  <p className="text-[11px] text-emerald-700 font-semibold mt-2">
                    Verification recorded • Confirm the dose from the schedule to update adherence
                  </p>
                </div>
              </div>
            </div>
          )}

          {verificationResult.status === 'ERROR' && (
            <div className="p-5 rounded-2xl bg-rose-50 border-2 border-rose-500 text-rose-950 animate-in fade-in zoom-in-95">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-rose-900">
                    CRITICAL SAFETY ALERT: WRONG MEDICINE DETECTED
                  </h4>
                  <p className="text-xs text-rose-800 font-medium mt-0.5 leading-relaxed">
                    {verificationResult.message}
                  </p>
                  <p className="text-[11px] text-rose-700 font-bold mt-2">
                    ⚠ Intake blocked • High Priority alert dispatched to Caregiver Center
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
