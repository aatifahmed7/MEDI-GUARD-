import React from 'react';
import {
  LayoutDashboard,
  Pill,
  Calendar,
  BellRing,
  QrCode,
  BarChart3,
  BrainCircuit,
  History,
  Settings,
  Sparkles,
  ShieldCheck,
  User,
} from 'lucide-react';
import { PatientProfile } from '../types.js';

export type NavigationTab =
  | 'dashboard'
  | 'medicines'
  | 'schedule'
  | 'reminders'
  | 'verification'
  | 'analytics'
  | 'airisk'
  | 'caregivers'
  | 'history'
  | 'messages'
  | 'settings'

interface SidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  patient: PatientProfile | null;
  activeAlertsCount: number;
  onOpenAiAssistant: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  patient,
  activeAlertsCount,
  onOpenAiAssistant,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'medicines', label: 'My Medicines', icon: Pill },
    { id: 'schedule', label: 'Medication Schedule', icon: Calendar },
    { id: 'reminders', label: 'Reminder Center', icon: BellRing, badge: null },
    { id: 'verification', label: 'Medicine Verification', icon: QrCode },
    { id: 'analytics', label: 'Adherence Analytics', icon: BarChart3 },
    { id: 'airisk', label: 'AI Risk Analysis', icon: BrainCircuit, highlight: true },
    { id: 'history', label: 'Medication History', icon: History },
    { id: 'messages', label: 'Messages', icon: User },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside
      id="mediguard-sidebar"
      className="w-64 bg-[#0B1F33] text-white flex flex-col h-screen fixed left-0 top-0 z-30 shadow-xl border-r border-slate-800 justify-between p-5"
    >
      {/* Brand Header & Navigation */}
      <div className="flex flex-col flex-1 min-h-0">
        {/* Brand */}
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800/80">
          <div className="w-10 h-10 bg-[#20C997] rounded-xl flex items-center justify-center text-slate-950 text-xl font-bold shadow-md shadow-[#20C997]/20">
            M
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-bold text-lg text-white leading-tight">MediGuard AI</h1>
            </div>
            <p className="text-[10px] text-[#64748B] uppercase tracking-wider font-semibold">
              Smart Intelligence
            </p>
          </div>
        </div>

        {/* Patient Profile Chip */}
        <div className="mb-4 p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/40 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-200 text-xs font-bold shrink-0">
            <User className="w-4 h-4" />
          </div>
          <div className="overflow-hidden flex-1">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-white truncate">
                {patient?.name || 'Eleanor Vance'}
              </p>
              <span className="text-[9px] text-[#20C997] font-mono font-bold">
                {patient?.bloodGroup || 'A+'}
              </span>
            </div>
            <p className="text-[10px] text-[#64748B] truncate">
              {patient?.age ? `${patient.age} yrs • ` : ''}Demo Patient
            </p>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-btn-${item.id}`}
                onClick={() => onSelectTab(item.id as NavigationTab)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-[#0D6EFD]/20 text-[#0D6EFD] font-semibold border border-[#0D6EFD]/30'
                    : 'text-[#64748B] hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isActive
                        ? 'bg-[#0D6EFD]'
                        : 'bg-transparent border border-[#64748B]'
                    }`}
                  />
                  <Icon
                    className={`w-4 h-4 ${
                      isActive
                        ? 'text-[#0D6EFD]'
                        : item.highlight
                        ? 'text-[#20C997]'
                        : 'text-[#64748B]'
                    }`}
                  />
                  <span className="tracking-tight">{item.label}</span>
                </div>
                {item.badge !== null && item.badge !== undefined && (
                  <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full animate-pulse">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Area: AI Launcher & System Status */}
      <div className="pt-3 border-t border-slate-700/50 space-y-3 shrink-0">
        <button
          id="btn-open-ai-chat"
          onClick={onOpenAiAssistant}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-[#20C997] to-emerald-500 text-slate-950 font-bold text-xs shadow-md shadow-[#20C997]/20 hover:opacity-95 transition-all"
        >
          <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
          <span>Ask MediGuard AI</span>
        </button>

        <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/40 flex items-center justify-between">
          <div>
            <p className="text-[9px] uppercase text-[#64748B] font-bold">System Status</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 bg-[#16A34A] rounded-full animate-pulse" />
              <span className="text-[11px] font-medium text-slate-300">Active & Monitoring</span>
            </div>
          </div>
          <span className="text-[9px] text-[#64748B] font-mono">MVP</span>
        </div>
      </div>
    </aside>
  );
};
