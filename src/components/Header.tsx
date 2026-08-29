import React from 'react';
import { Clock, ShieldAlert, RefreshCw, Volume2, VolumeX, LogOut } from 'lucide-react';
import { AppSettings, PatientProfile } from '../types.js';

interface HeaderProps {
  title: string;
  subtitle?: string;
  patient: PatientProfile | null;
  settings: AppSettings | null;
  onRefreshData: () => void;
  onToggleSound: () => void;
  simulatedTimeText: string;
  activeAlertsCount: number;
  onOpenCaregivers: () => void;
  onLogout: () => void;
  demoMode?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  patient,
  settings,
  onRefreshData,
  onToggleSound,
  simulatedTimeText,
  activeAlertsCount,
  onOpenCaregivers,
  onLogout,
  demoMode = false,
}) => {
  return (
    <header
      id="mediguard-header"
      className="bg-transparent px-8 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0"
    >
      <div>
        <h2 className="text-2xl font-bold text-[#0B1F33] tracking-tight">{title}</h2>
        {subtitle ? (
          <p className="text-xs text-[#64748B] italic mt-0.5">{subtitle}</p>
        ) : (
          <p className="text-xs text-[#64748B] italic mt-0.5">Remind • Verify • Track • Predict • Intervene</p>
        )}
      </div>

      <div className="flex items-center flex-wrap gap-2.5">
        {/* Date & Live Clock Pill */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200/80 text-[#0B1F33] text-xs font-semibold shadow-xs">
          <Clock className="w-3.5 h-3.5 text-[#0D6EFD]" />
          <span>{simulatedTimeText}</span>
          {demoMode && settings?.simulatedTimeOffsetMinutes !== 0 && (
            <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.2 rounded font-bold">
              Simulated
            </span>
          )}
        </div>

        {/* Audio Alerts Toggle */}
        <button
          id="btn-sound-toggle"
          onClick={onToggleSound}
          title={settings?.audioAlerts ? 'Sound Alerts: On' : 'Sound Alerts: Muted'}
          className={`px-3 py-1.5 rounded-full border text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs ${
            settings?.audioAlerts
              ? 'bg-[#0D6EFD]/10 border-[#0D6EFD]/30 text-[#0D6EFD]'
              : 'bg-white border-slate-200 text-[#64748B] hover:bg-slate-50'
          }`}
        >
          {settings?.audioAlerts ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{settings?.audioAlerts ? 'Sound ON' : 'Muted'}</span>
        </button>

        {/* Caregiver Alert Indicator */}
        {activeAlertsCount > 0 && (
          <button
            id="btn-header-alerts"
            onClick={onOpenCaregivers}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold hover:bg-rose-100 transition-colors animate-pulse shadow-xs"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
            <span>{activeAlertsCount} Alert{activeAlertsCount > 1 ? 's' : ''}</span>
          </button>
        )}

        {/* Refresh button */}
        <button
          id="btn-refresh-data"
          onClick={onRefreshData}
          title="Refresh Data & Adherence Calculations"
          className="p-2 rounded-full bg-white border border-slate-200 text-[#64748B] hover:text-[#0B1F33] hover:bg-slate-50 transition-colors shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>

        <button id="btn-logout" onClick={onLogout} title="Sign out" className="p-2 rounded-full bg-white border border-slate-200 text-[#64748B] hover:text-rose-600 hover:bg-rose-50 transition-colors shadow-xs">
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
