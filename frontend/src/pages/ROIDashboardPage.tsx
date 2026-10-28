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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRoiSummary();
  }, [filterType]);

  const loadRoiSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.roi.getSummary(filterType || undefined);
      setRoiData(res);
    } catch (err: any) {
      console.error('Failed to load ROI metrics:', err);
      setError(err?.message || 'Failed to load ROI metrics from the server.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] gap-3.5">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-slate-500 font-medium">Loading verified ROI analytics...</p>
      </div>
    );
  }

  if (error && !roiData) {
    return (
      <div className="bg-white border border-rose-200 rounded-2xl p-10 max-w-xl mx-auto my-12 text-center shadow-xs">
        <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-2">Unable to Load ROI Metrics</h3>
        <p className="text-sm text-slate-600 mb-6 leading-relaxed">{error}</p>
        <button
          onClick={loadRoiSummary}
          className="h-11 px-6 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-xs"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const trendData = roiData?.trend_data || [];

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white rounded-2xl p-7 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/20 text-teal-300 text-xs font-semibold mb-2.5 border border-teal-500/30">
            <ShieldCheck className="w-4 h-4 text-teal-400" />
            <span>Productivity Analytics</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Return on Investment (ROI)</h2>
          <p className="text-sm sm:text-base text-slate-300 mt-2 max-w-2xl leading-relaxed">
            Audited time savings and verified economic impact per quotation.
          </p>
        </div>

        {/* Data Source Filter Pill */}
        <div className="flex items-center gap-2 bg-slate-800/80 p-2 rounded-xl border border-slate-700 shrink-0">
          <button
            onClick={() => setFilterType('')}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              filterType === ''
                ? 'bg-brand-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All ({roiData?.total_quotations_processed || 0})
          </button>
          <button
            onClick={() => setFilterType('MEASURED')}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              filterType === 'MEASURED'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Live Measured ({roiData?.measured_quotations_count || 0})
          </button>
          <button
            onClick={() => setFilterType('DEMO_SEEDED')}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              filterType === 'DEMO_SEEDED'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Baselines ({roiData?.demo_quotations_count || 0})
          </button>
        </div>
      </div>

      {/* Primary KPI Grid (6 Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-5">
        {/* Card 1 */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs min-h-[148px] flex flex-col justify-between">
          <div className="text-xs sm:text-sm font-semibold text-slate-500 mb-1.5">Total Processed</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            {roiData?.total_quotations_processed || 0}
          </div>
          <div className="text-xs text-slate-400 mt-1">Quotations audited</div>
        </div>

        {/* Card 2 */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs min-h-[148px] flex flex-col justify-between">
          <div className="text-xs sm:text-sm font-semibold text-slate-500 mb-1.5">Manual Baseline</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-700">
            {(roiData?.avg_manual_prep_time_minutes ?? 0).toFixed(1)} <span className="text-sm font-normal text-slate-500">min</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">Before VyaparPilot</div>
        </div>

        {/* Card 3 */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs min-h-[148px] flex flex-col justify-between">
          <div className="text-xs sm:text-sm font-semibold text-slate-500 mb-1.5">AI-Assisted Time</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-brand-600">
            {(roiData?.avg_ai_assisted_prep_time_minutes ?? 0).toFixed(1)} <span className="text-sm font-normal text-slate-500">min</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">AI + Review + Edit</div>
        </div>

        {/* Card 4 */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs min-h-[148px] flex flex-col justify-between">
          <div className="text-xs sm:text-sm font-semibold text-slate-500 mb-1.5">Time Saved / Quote</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-teal-600">
            {(roiData?.avg_time_saved_per_quotation_minutes ?? 0).toFixed(1)} <span className="text-sm font-normal text-slate-500">min</span>
          </div>
          <div className="text-xs text-emerald-600 font-bold mt-1">
            {(roiData?.avg_time_reduction_percentage ?? 0).toFixed(1)}% reduction
          </div>
        </div>

        {/* Card 5 */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs min-h-[148px] flex flex-col justify-between">
          <div className="text-xs sm:text-sm font-semibold text-slate-500 mb-1.5">Total Hours Saved</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-indigo-600">
            {(roiData?.total_time_saved_hours ?? 0).toFixed(1)} <span className="text-sm font-normal text-slate-500">hrs</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">Estimator time saved</div>
        </div>

        {/* Card 6 */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs min-h-[148px] flex flex-col justify-between">
          <div className="text-xs sm:text-sm font-semibold text-emerald-800 mb-1.5">Net Economic Value</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700">
            ₹{Math.round(roiData?.net_productivity_benefit || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-emerald-700 font-medium mt-1">
            After AI operating costs
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Chart 1: Time Comparison */}
        <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                Turnaround Time: Manual vs AI (Minutes)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Manual baseline vs assisted turnaround</p>
            </div>
            <Clock className="w-5 h-5 text-brand-600" />
          </div>

          <div className="h-72 flex items-center justify-center">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip
                    formatter={(val: any) => [`${val} mins`, '']}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '13px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} />
                  <Bar dataKey="manual_time_mins" name="Manual Baseline (Mins)" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="ai_assisted_time_mins" name="AI Turnaround (Mins)" fill="#0067c9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center p-8 text-slate-400 text-sm">
                <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-600">No Workflow Measurements Yet</p>
                <p className="mt-1 text-xs">Process customer enquiries or approve quotations to populate live time comparison data.</p>
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: Cumulative Time Saved & Value Generated */}
        <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                Productivity Value Generated (₹)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Calculated at ₹{roiData?.configured_labour_cost_per_hour ?? 350}/hr</p>
            </div>
            <TrendingUp className="w-5 h-5 text-emerald-600" />
          </div>

          <div className="h-72 flex items-center justify-center">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="valGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip
                    formatter={(val: any) => [`₹${val}`, 'Value Generated']}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '13px' }}
                  />
                  <Area type="monotone" dataKey="labour_value_saved" stroke="#0d9488" strokeWidth={2.5} fillOpacity={1} fill="url(#valGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center p-8 text-slate-400 text-sm">
                <TrendingUp className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-600">No Economic Value Logged Yet</p>
                <p className="mt-1 text-xs">Monetary value is calculated automatically as your team saves estimation hours.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Methodology, Formula & Sample Size Breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-7 sm:p-8 grid md:grid-cols-2 gap-8 text-sm">
        <div className="space-y-4">
          <div className="flex items-center gap-2.5 text-slate-900 font-bold text-base">
            <Calculator className="w-5 h-5 text-brand-600" />
            <span>Mathematical Formulas & Verifiable Methodology</span>
          </div>
          <p className="text-slate-600 leading-relaxed">
            VyaparPilot AI strictly rejects vanity AI metrics. Every calculation is derived from timestamps and audit logs stored in the database:
          </p>
          <div className="space-y-2.5 font-mono text-xs sm:text-sm bg-slate-50 p-4 rounded-xl border border-slate-200 leading-normal">
            <div>
              <span className="text-brand-700 font-bold">Time Saved</span> = Manual Baseline − (AI Processing + Human Review + Corrections)
            </div>
            <div>
              <span className="text-brand-700 font-bold">% Time Reduction</span> = (Time Saved / Manual Baseline) × 100
            </div>
            <div>
              <span className="text-brand-700 font-bold">Estimated Labour Value</span> = (Time Saved in Hours) × Hourly Wage (₹{roiData?.configured_labour_cost_per_hour ?? 350}/hr)
            </div>
            <div>
              <span className="text-brand-700 font-bold">Net Benefit</span> = Labour Value Saved − AI Operating API Costs (₹{(roiData?.total_ai_operating_costs ?? 0).toFixed(2)})
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2.5 text-slate-900 font-bold text-base">
            <Info className="w-5 h-5 text-teal-600" />
            <span>Sample Size & Dataset Transparency</span>
          </div>
          <p className="text-slate-600 leading-relaxed">
            To prevent biased claims, all data points are tagged by origin:
          </p>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50">
              <span className="font-semibold text-slate-700">Live Measured Workflow Tests:</span>
              <span className="font-mono font-bold text-brand-700">{roiData?.sample_size_info?.measured ?? 0} quotations</span>
            </div>
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50">
              <span className="font-semibold text-slate-700">Seeded Historical Baseline Records:</span>
              <span className="font-mono font-bold text-slate-800">{roiData?.sample_size_info?.demo ?? 0} quotations</span>
            </div>
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50">
              <span className="font-semibold text-slate-700">Guardrails & Errors Caught in Flow:</span>
              <span className="font-mono font-bold text-amber-700">{roiData?.total_validation_errors_caught ?? 0} alerts</span>
            </div>
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50">
              <span className="font-semibold text-slate-700">Field Correction Rate:</span>
              <span className="font-mono font-bold text-teal-700">{roiData?.field_correction_rate_pct ?? 0}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
