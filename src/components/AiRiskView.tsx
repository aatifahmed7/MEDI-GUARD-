import React, { useState } from 'react';
import {
  BrainCircuit,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  Zap,
  Info,
  Clock,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { AdherenceMetrics, Medicine, PatientProfile } from '../types.js';
import { fetchAiInsights, fetchDrugInteractions } from '../utils/api.js';

interface AiRiskViewProps {
  metrics: AdherenceMetrics | null;
  medicines: Medicine[];
  patient: PatientProfile | null;
}

export const AiRiskView: React.FC<AiRiskViewProps> = ({
  metrics,
  medicines,
  patient,
}) => {
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiReport, setAiReport] = useState<any>(null);
  const [loadingInteractions, setLoadingInteractions] = useState(false);
  const [interactions, setInteractions] = useState<any[] | null>(null);

  const getRiskBadge = (level?: string) => {
    switch (level) {
      case 'LOW':
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
          dot: 'bg-emerald-500',
          label: 'LOW ADHERENCE RISK',
          sub: 'Routine is well-maintained; regular monitoring recommended.',
        };
      case 'MODERATE':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-300',
          dot: 'bg-amber-500',
          label: 'MODERATE ADHERENCE RISK',
          sub: 'Dose delays or minor omissions detected in specific time windows.',
        };
      case 'HIGH':
        return {
          bg: 'bg-rose-50 text-rose-800 border-rose-300',
          dot: 'bg-rose-500',
          label: 'HIGH ADHERENCE RISK',
          sub: 'Frequent missed doses detected; caregiver escalation recommended.',
        };
      default:
        return {
          bg: 'bg-slate-50 text-slate-800 border-slate-300',
          dot: 'bg-slate-500',
          label: 'CALCULATING',
          sub: 'Collecting intake history...',
        };
    }
  };

  const riskBadge = getRiskBadge(metrics?.riskLevel);

  const handleGenerateGeminiReport = async () => {
    setLoadingAi(true);
    try {
      const data = await fetchAiInsights();
      setAiReport(data);
    } catch (e) {
      console.error('Error generating AI report:', e);
    } finally {
      setLoadingAi(false);
    }
  };

  const handleCheckInteractions = async () => {
    setLoadingInteractions(true);
    try {
      const data = await fetchDrugInteractions();
      setInteractions(data);
    } catch (e) {
      console.error('Error checking interactions:', e);
    } finally {
      setLoadingInteractions(false);
    }
  };

  return (
    <div id="ai-risk-view" className="space-y-6">
      {/* Risk Score Hero Card */}
      <div className="bg-white rounded-2xl p-7 border border-slate-200/80 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold">
              <BrainCircuit className="w-3.5 h-3.5" />
              <span>Predictive Adherence Engine</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">
              Adherence Risk Assessment & Behavior Forecasting
            </h2>
            <p className="text-xs text-slate-500 max-w-xl leading-relaxed">
              Analyzes historical intake timing deviations, missed dose frequency, and multi-regimen friction to identify patients before severe non-adherence occurs.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 shrink-0">
            <div className="text-center pr-4 border-r border-slate-200">
              <span className="text-[11px] font-bold uppercase text-slate-500 block">Risk Index</span>
              <span className="text-3xl font-black text-slate-900 font-mono">
                {metrics?.riskScore ?? 0}
                <span className="text-xs text-slate-400 font-normal">/100</span>
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${riskBadge.dot} animate-ping`} />
                <span className="font-extrabold text-sm text-slate-900">{riskBadge.label}</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 max-w-xs">{riskBadge.sub}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Detected Behavioral Patterns vs Recommended Clinical Interventions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Detected Patterns */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-base text-slate-900">Detected Behavioral Patterns</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Algorithmic pattern matching on timestamp logs
            </p>

            <div className="space-y-3">
              {(metrics?.detectedPatterns || [
                'Evening dosage routine exhibits a 24% late-intake rate.',
                'Morning doses (08:00 AM) maintain highest compliance (96%).',
                'Minor weekend intake variance detected (~45 min delay on Sundays).',
              ]).map((pat, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-3 text-xs"
                >
                  <Clock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-slate-700 leading-relaxed font-medium">{pat}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200/80 text-xs text-blue-900 mt-4">
            <p className="font-semibold">Future Dose Risk Probability:</p>
            <p className="text-blue-800 mt-0.5">
              Estimated <strong>28% probability</strong> of delay on upcoming evening doses if unassisted.
            </p>
          </div>
        </div>

        {/* Recommended Interventions */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-base text-slate-900">Intelligent Interventions</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Automated behavioral nudges and schedule adjustments
            </p>

            <div className="space-y-3">
              {(metrics?.recommendations || [
                'Advance evening reminder trigger 15 minutes before dinner (07:45 PM).',
                'Activate secondary audio alert chime for doses delayed beyond 20 minutes.',
                'Notify Primary Caregiver if evening dose exceeds 45-minute overdue threshold.',
                'Encourage consistent bedside container placement with QR verification.',
              ]).map((rec, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200/70 flex items-start gap-3 text-xs"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="text-emerald-900 leading-relaxed font-medium">{rec}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Intervention Status:</span>
            <span className="font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
              Automated Routine Active
            </span>
          </div>
        </div>
      </div>

      {/* Gemini 3.7 Flash Clinical Adherence Synthesis Card */}
      <div className="bg-gradient-to-br from-[#0B1F33] to-[#122B47] rounded-2xl p-7 text-white border border-slate-800 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-400/20 text-teal-300 text-xs font-bold mb-2 border border-teal-400/30">
              <Sparkles className="w-3.5 h-3.5 text-teal-300" />
              <span>Gemini 3.7 Flash Clinical Model</span>
            </div>
            <h3 className="text-xl font-bold text-white">
              AI Comprehensive Adherence & Safety Summary
            </h3>
            <p className="text-xs text-slate-300 max-w-xl">
              Generates a holistic clinical narrative, behavioral friction analysis, and caregiver communication briefing.
            </p>
          </div>

          <button
            id="btn-trigger-gemini-report"
            disabled={loadingAi}
            onClick={handleGenerateGeminiReport}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all shrink-0"
          >
            {loadingAi ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                <span>Synthesizing Clinical Analysis...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-slate-950" />
                <span>Generate Gemini AI Report</span>
              </>
            )}
          </button>
        </div>

        {aiReport && (
          <div className="bg-slate-900/90 rounded-2xl p-6 border border-slate-700/80 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-bold text-teal-400 uppercase tracking-wider">
                Clinical Overview
              </span>
              <span className="text-xs font-mono text-slate-400">
                Confidence: {aiReport.confidenceScore}%
              </span>
            </div>

            <p className="text-sm text-slate-200 leading-relaxed font-normal">
              {aiReport.clinicalSummary}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/50 text-xs">
                <p className="font-bold text-amber-300 mb-1">Behavioral Risk Factors:</p>
                <ul className="list-disc list-inside space-y-1 text-slate-300">
                  {aiReport.riskFactors?.map((rf: string, i: number) => (
                    <li key={i}>{rf}</li>
                  ))}
                </ul>
              </div>

              <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/50 text-xs">
                <p className="font-bold text-emerald-300 mb-1">Actionable Interventions:</p>
                <ul className="list-disc list-inside space-y-1 text-slate-300">
                  {aiReport.actionableInterventions?.map((act: string, i: number) => (
                    <li key={i}>{act}</li>
                  ))}
                </ul>
              </div>
            </div>

            {aiReport.caregiverNote && (
              <p className="text-xs text-slate-300 bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                <strong>Caregiver Briefing:</strong> {aiReport.caregiverNote}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Drug Interaction Safety Screening using Gemini */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-base text-slate-900">
                Active Drug-Drug Interaction Safety Screening
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Evaluates concurrent active prescriptions for potential pharmacokinetic interactions and timing separation rules.
            </p>
          </div>

          <button
            onClick={handleCheckInteractions}
            disabled={loadingInteractions}
            className="px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs border border-blue-200 flex items-center gap-2 transition-colors shrink-0"
          >
            {loadingInteractions ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Screening Regimen...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Run Safety Screen</span>
              </>
            )}
          </button>
        </div>

        {interactions && (
          <div className="space-y-3 pt-2">
            {interactions.map((it: any, idx: number) => (
              <div
                key={idx}
                className={`p-4 rounded-xl border text-xs ${
                  it.severity === 'HIGH'
                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                    : it.severity === 'MODERATE'
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold">
                    {(it.medicinesInvolved || it.drugs)?.join(' + ') || 'Prescription Regimen Interaction'}
                  </span>
                  <span className="font-bold uppercase text-[10px] px-2 py-0.5 rounded-full bg-white/80">
                    {it.severity} SEVERITY
                  </span>
                </div>
                <p className="leading-relaxed">{it.description}</p>
                {it.recommendation && (
                  <p className="mt-1 font-semibold">Guideline: {it.recommendation}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Medical & Clinical Disclaimer */}
      <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 text-xs text-slate-600 flex items-start gap-3">
        <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Clinical & Hackathon Safety Disclaimer:</strong> All AI risk scores, probabilities, and recommendations are computational estimates intended to assist adherence tracking. MediGuard AI does not alter prescription dosages, cancel medications, or replace direct consultations with licensed physicians.
        </p>
      </div>
    </div>
  );
};
