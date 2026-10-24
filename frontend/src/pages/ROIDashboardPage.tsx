import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { ROISummaryResponse } from '../types';
import {
  TrendingUp,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Calculator,
  Calendar,
  Layers,
  HelpCircle,
  FileCheck2,
  DollarSign,
  Info
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  AreaChart,
  Area
} from 'recharts';

export const ROIDashboardPage: React.FC = () => {
  const [roiData, setRoiData] = useState<ROISummaryResponse | null>(null);
  const [filterType, setFilterType] = useState<string>(''); // '' (all), 'MEASURED', 'DEMO_SEEDED'
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadRoiSummary();
  }, [filterType]);

  const loadRoiSummary = async () => {
    try {
      setLoading(true);
      const res = await api.roi.getSummary(filterType || undefined);
      setRoiData(res);
    } catch (err) {
      console.error('Failed to load ROI metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const trendData = roiData?.trend_data || [];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white rounded-2xl p-6 sm:p-7 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-semibold mb-2 border border-teal-500/30">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
            <span>PRAGYAN 2K26 Track 4-01 Core Differentiator</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">Verifiable Return on Investment Hub</h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Quantifiable, audited time-and-motion measurements proving real productivity gains for MSME estimators and business owners.
          </p>
        </div>

        {/* Data Source Filter Pill */}
        <div className="flex items-center gap-2 bg-slate-800/80 p-1.5 rounded-xl border border-slate-700">
          <button
            onClick={() => setFilterType('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterType === ''
                ? 'bg-brand-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Data ({roiData?.total_quotations_processed || 0})
          </button>
          <button
            onClick={() => setFilterType('MEASURED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterType === 'MEASURED'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Measured Tests ({roiData?.measured_quotations_count || 0})
          </button>
          <button
            onClick={() => setFilterType('DEMO_SEEDED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterType === 'DEMO_SEEDED'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Seeded Baselines ({roiData?.demo_quotations_count || 0})
          </button>
        </div>
      </div>

      {/* Primary KPI Grid (6 Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Card 1 */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 mb-1">Total Processed</div>
          <div className="text-2xl font-extrabold text-slate-900">
            {roiData?.total_quotations_processed || 0}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Quotations audited</div>
        </div>

        {/* Card 2 */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 mb-1">Manual Baseline</div>
          <div className="text-2xl font-extrabold text-slate-700">
            {roiData?.avg_manual_prep_time_minutes.toFixed(1)} <span className="text-xs font-normal">min</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Before VyaparPilot</div>
        </div>

        {/* Card 3 */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 mb-1">AI-Assisted Time</div>
          <div className="text-2xl font-extrabold text-brand-600">
            {roiData?.avg_ai_assisted_prep_time_minutes.toFixed(1)} <span className="text-xs font-normal">min</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">AI + Review + Edit</div>
        </div>

        {/* Card 4 */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 mb-1">Time Saved / Quote</div>
          <div className="text-2xl font-extrabold text-teal-600">
            {roiData?.avg_time_saved_per_quotation_minutes.toFixed(1)} <span className="text-xs font-normal">min</span>
          </div>
          <div className="text-[10px] text-emerald-600 font-bold mt-1">
            {roiData?.avg_time_reduction_percentage.toFixed(1)}% reduction
          </div>
        </div>

        {/* Card 5 */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 mb-1">Total Hours Saved</div>
          <div className="text-2xl font-extrabold text-indigo-600">
            {roiData?.total_time_saved_hours.toFixed(1)} <span className="text-xs font-normal">hrs</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Estimator time saved</div>
        </div>

        {/* Card 6 */}
        <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
          <div className="text-[11px] font-semibold text-emerald-800 mb-1">Net Economic Value</div>
          <div className="text-2xl font-extrabold text-emerald-700">
            ₹{Math.round(roiData?.net_productivity_benefit || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-emerald-700 font-medium mt-1">
            After AI operating costs
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Chart 1: Time Comparison */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Preparation Time: Manual vs AI-Assisted (Minutes)
              </h3>
              <p className="text-[11px] text-slate-400">Comparing manual baseline against total assisted turnaround</p>
            </div>
            <Clock className="w-4 h-4 text-brand-600" />
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  formatter={(val: any) => [`${val} mins`, '']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="manual_time_mins" name="Manual Baseline (Mins)" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="ai_assisted_time_mins" name="AI-Assisted Turnaround (Mins)" fill="#0067c9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Cumulative Time Saved & Value Generated */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Monetary Productivity Value Generated (INR ₹)
              </h3>
              <p className="text-[11px] text-slate-400">Labour value unlocked at configured rate of ₹{roiData?.configured_labour_cost_per_hour}/hr</p>
            </div>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="valGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  formatter={(val: any) => [`₹${val}`, 'Value Generated']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="labour_value_saved" stroke="#0d9488" strokeWidth={2} fillOpacity={1} fill="url(#valGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Methodology, Formula & Sample Size Breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 grid md:grid-cols-2 gap-6 text-xs">
        <div>
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm mb-2">
            <Calculator className="w-4 h-4 text-brand-600" />
            <span>Mathematical Formulas & Verifiable Methodology</span>
          </div>
          <p className="text-slate-600 leading-relaxed mb-3">
            VyaparPilot AI strictly rejects vanity AI metrics. Every calculation is derived from timestamps and audit logs stored in the database:
          </p>
          <div className="space-y-2 font-mono text-[11px] bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <span className="text-brand-700 font-bold">Time Saved</span> = Manual Baseline − (AI Processing + Human Review + Corrections)
            </div>
            <div>
              <span className="text-brand-700 font-bold">% Time Reduction</span> = (Time Saved / Manual Baseline) × 100
            </div>
            <div>
              <span className="text-brand-700 font-bold">Estimated Labour Value</span> = (Time Saved in Hours) × Hourly Wage (₹{roiData?.configured_labour_cost_per_hour}/hr)
            </div>
            <div>
              <span className="text-brand-700 font-bold">Net Benefit</span> = Labour Value Saved − AI Operating API Costs (₹{roiData?.total_ai_operating_costs.toFixed(2)})
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm mb-2">
            <Info className="w-4 h-4 text-teal-600" />
            <span>Sample Size & Dataset Transparency</span>
          </div>
          <p className="text-slate-600 leading-relaxed mb-3">
            To prevent biased claims, all data points are tagged by origin:
          </p>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50">
              <span className="font-semibold text-slate-700">Live Measured Workflow Tests:</span>
              <span className="font-mono font-bold text-brand-700">{roiData?.sample_size_info.measured} quotations</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50">
              <span className="font-semibold text-slate-700">Seeded Historical Baseline Records:</span>
              <span className="font-mono font-bold text-slate-800">{roiData?.sample_size_info.demo} quotations</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50">
              <span className="font-semibold text-slate-700">Guardrails & Errors Caught in Flow:</span>
              <span className="font-mono font-bold text-amber-700">{roiData?.total_validation_errors_caught} alerts</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50">
              <span className="font-semibold text-slate-700">Field Correction Rate:</span>
              <span className="font-mono font-bold text-teal-700">{roiData?.field_correction_rate_pct}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
