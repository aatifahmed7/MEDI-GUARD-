import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  BarChart3,
  PieChart as PieIcon,
  Clock,
  Pill,
  Award,
  Info,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { AdherenceMetrics, MedicationEvent, Medicine } from '../types.js';

interface AnalyticsViewProps {
  metrics: AdherenceMetrics | null;
  events: MedicationEvent[];
  medicines: Medicine[];
}

const STATUS_COLORS = {
  'Taken on Time': '#16A34A',
  'Taken Late': '#F59E0B',
  Missed: '#DC2626',
};

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  metrics,
  events,
  medicines,
}) => {
  const [timeRange, setTimeRange] = useState<'7D' | '14D'>('14D');

  if (!metrics) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
        <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-3 animate-spin" />
        <h3 className="font-bold text-slate-700">Calculating Clinical Adherence Metrics...</h3>
      </div>
    );
  }

  // Trend data slice
  const trendData =
    timeRange === '7D'
      ? metrics.dailyTrend.slice(-7)
      : metrics.dailyTrend;

  // Donut data
  const statusPieData = [
    { name: 'Taken on Time', value: metrics.takenOnTime, color: '#16A34A' },
    { name: 'Taken Late', value: metrics.takenLate, color: '#F59E0B' },
    { name: 'Missed', value: metrics.missed, color: '#DC2626' },
  ].filter((d) => d.value > 0);

  // Time of day data
  const timeOfDayData = [
    {
      slot: 'Morning (8 AM)',
      adherence: metrics.timeOfDayCompliance.Morning.score,
      total: metrics.timeOfDayCompliance.Morning.total,
      onTime: metrics.timeOfDayCompliance.Morning.onTime,
    },
    {
      slot: 'Afternoon (1 PM)',
      adherence: metrics.timeOfDayCompliance.Afternoon.score,
      total: metrics.timeOfDayCompliance.Afternoon.total,
      onTime: metrics.timeOfDayCompliance.Afternoon.onTime,
    },
    {
      slot: 'Evening (8 PM)',
      adherence: metrics.timeOfDayCompliance.Evening.score,
      total: metrics.timeOfDayCompliance.Evening.total,
      onTime: metrics.timeOfDayCompliance.Evening.onTime,
    },
    {
      slot: 'Night (9 PM+)',
      adherence: metrics.timeOfDayCompliance.Night.score,
      total: metrics.timeOfDayCompliance.Night.total,
      onTime: metrics.timeOfDayCompliance.Night.onTime,
    },
  ];

  return (
    <div id="analytics-view" className="space-y-6">
      {/* Top Adherence Score KPI Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Overall Score */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Adherence Score</span>
            <Award className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-3xl font-extrabold text-blue-600">{metrics.overallScore}%</p>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Clinical Target: ≥ 80%
          </p>
        </div>

        {/* On Time Doses */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Taken on Time</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-3xl font-extrabold text-emerald-600">{metrics.takenOnTime}</p>
          <p className="text-xs text-slate-500 mt-1">
            Full 1.0 weight credit
          </p>
        </div>

        {/* Taken Late */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Taken Late</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-3xl font-extrabold text-amber-600">{metrics.takenLate}</p>
          <p className="text-xs text-slate-500 mt-1">
            Partial 0.6 weight credit
          </p>
        </div>

        {/* Missed Doses */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Missed Doses</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-3xl font-extrabold text-rose-600">{metrics.missed}</p>
          <p className="text-xs text-slate-500 mt-1">
            0.0 credit (Escalated)
          </p>
        </div>
      </div>

      {/* 1. Longitudinal Adherence Trend Line */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-lg text-slate-900">Longitudinal Adherence Trend (%)</h3>
            </div>
            <p className="text-xs text-slate-500">
              Daily adherence trajectory over time with 80% clinical threshold benchmark
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
            <button
              onClick={() => setTimeRange('7D')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                timeRange === '7D'
                  ? 'bg-white text-blue-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setTimeRange('14D')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                timeRange === '14D'
                  ? 'bg-white text-blue-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              14 Days
            </button>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748B' }} unit="%" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0B1F33',
                  borderRadius: '10px',
                  color: '#fff',
                  border: 'none',
                  fontSize: '12px',
                }}
                formatter={(val: any) => [`${val}%`, 'Daily Adherence']}
              />
              <ReferenceLine
                y={80}
                stroke="#16A34A"
                strokeDasharray="4 4"
                label={{
                  value: '80% Target',
                  fill: '#16A34A',
                  fontSize: 11,
                  position: 'right',
                }}
              />
              <Line
                type="monotone"
                dataKey="score"
                name="Adherence Score"
                stroke="#0D6EFD"
                strokeWidth={3}
                dot={{ r: 4, fill: '#0D6EFD' }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: Donut Status Distribution & Time of Day Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut: Status Breakdown */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <PieIcon className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-base text-slate-900">Dose Intake Distribution</h3>
            </div>
            <p className="text-xs text-slate-500">
              Proportion of taken on time vs late vs missed doses
            </p>
          </div>

          <div className="h-64 w-full my-3">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {statusPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0B1F33',
                    borderRadius: '8px',
                    color: '#fff',
                    border: 'none',
                    fontSize: '12px',
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-center text-xs">
            <div>
              <p className="text-slate-500">On Time</p>
              <p className="font-bold text-emerald-600">{metrics.takenOnTime}</p>
            </div>
            <div>
              <p className="text-slate-500">Late</p>
              <p className="font-bold text-amber-600">{metrics.takenLate}</p>
            </div>
            <div>
              <p className="text-slate-500">Missed</p>
              <p className="font-bold text-rose-600">{metrics.missed}</p>
            </div>
          </div>
        </div>

        {/* Bar: Time of Day Compliance */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-base text-slate-900">Adherence by Time of Day (%)</h3>
            </div>
            <p className="text-xs text-slate-500">
              Identifies specific time windows with elevated friction or dose delays
            </p>
          </div>

          <div className="h-64 w-full my-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeOfDayData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="slot" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748B' }} unit="%" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0B1F33',
                    borderRadius: '8px',
                    color: '#fff',
                    border: 'none',
                    fontSize: '12px',
                  }}
                  formatter={(val: any) => [`${val}%`, 'Adherence']}
                />
                <Bar dataKey="adherence" radius={[6, 6, 0, 0]}>
                  {timeOfDayData.map((entry, index) => (
                    <Cell
                      key={`bar-${index}`}
                      fill={
                        entry.adherence >= 85
                          ? '#16A34A'
                          : entry.adherence >= 70
                          ? '#F59E0B'
                          : '#DC2626'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              Evening doses (8 PM) show the highest delay rate (~24% friction) across past 14 days.
            </span>
          </div>
        </div>
      </div>

      {/* Row 3: Medicine-Wise Adherence Performance Table */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-2 mb-4">
          <Pill className="w-5 h-5 text-blue-600" />
          <h3 className="font-bold text-base text-slate-900">Prescription-Specific Adherence Breakdown</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <th className="pb-3">Medicine & Strength</th>
                <th className="pb-3">Total Evaluated</th>
                <th className="pb-3">On Time</th>
                <th className="pb-3">Late</th>
                <th className="pb-3">Missed</th>
                <th className="pb-3">Adherence Score</th>
                <th className="pb-3">Status Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {metrics.medicineAdherence.map((med, idx) => (
                <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 font-bold text-slate-900">{med.medicineName}</td>
                  <td className="py-3.5 font-mono text-slate-600">{med.totalScheduled} doses</td>
                  <td className="py-3.5 font-mono text-emerald-600 font-bold">{med.onTime}</td>
                  <td className="py-3.5 font-mono text-amber-600 font-bold">{med.late}</td>
                  <td className="py-3.5 font-mono text-rose-600 font-bold">{med.missed}</td>
                  <td className="py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold font-mono text-slate-900">{med.score}%</span>
                      <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden hidden sm:block">
                        <div
                          className={`h-full rounded-full ${
                            med.score >= 85
                              ? 'bg-emerald-500'
                              : med.score >= 70
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                          style={{ width: `${med.score}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        med.score >= 85
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : med.score >= 70
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {med.score >= 85 ? 'Excellent' : med.score >= 70 ? 'Moderate' : 'At Risk'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adherence Scoring Formula Card */}
      <div className="p-5 rounded-2xl bg-slate-900 text-slate-200 border border-slate-800 text-xs">
        <h4 className="font-bold text-white mb-1.5 flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-400" />
          <span>Clinical Scoring Calculation Standard:</span>
        </h4>
        <p className="font-mono text-slate-300 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
          Adherence Score (%) = [ (On-Time Doses × 1.0) + (Late Doses × 0.6) + (Missed × 0.0) ] ÷ Total Evaluated Doses × 100
        </p>
      </div>
    </div>
  );
};
