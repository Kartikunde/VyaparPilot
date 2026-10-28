import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { BarChart3, Download, TrendingUp, DollarSign, Package, CheckCircle2, FileText } from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      const res = await api.reports.getSummary();
      setSummary(res);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[450px]">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Business Reports</h2>
          <p className="text-sm text-slate-500 mt-1">
            Commercial pipeline, revenue, and product demand metrics.
          </p>
        </div>

        <a
          href={api.reports.exportCsvUrl()}
          target="_blank"
          rel="noreferrer"
          className="h-11 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold shadow-sm transition-colors shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV</span>
        </a>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-xs min-h-[148px] flex flex-col justify-between">
          <div className="text-sm font-semibold text-slate-600 mb-1.5">Approved Revenue</div>
          <div className="text-3xl sm:text-4xl font-extrabold text-emerald-600">
            ₹{Math.round(summary?.approved_revenue || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-xs sm:text-sm text-slate-400 mt-2">Confirmed signed deals</div>
        </div>

        <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-xs min-h-[148px] flex flex-col justify-between">
          <div className="text-sm font-semibold text-slate-600 mb-1.5">Total Pipeline Value</div>
          <div className="text-3xl sm:text-4xl font-extrabold text-slate-900">
            ₹{Math.round(summary?.total_pipeline_value || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-xs sm:text-sm text-slate-400 mt-2">Across all quotations</div>
        </div>

        <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-xs min-h-[148px] flex flex-col justify-between">
          <div className="text-sm font-semibold text-slate-600 mb-1.5">Average Quote Value</div>
          <div className="text-3xl sm:text-4xl font-extrabold text-slate-900">
            ₹{Math.round(summary?.average_quotation_value || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-xs sm:text-sm text-slate-400 mt-2">Per transaction</div>
        </div>

        <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-xs min-h-[148px] flex flex-col justify-between">
          <div className="text-sm font-semibold text-slate-600 mb-1.5">Average Gross Margin</div>
          <div className="text-3xl sm:text-4xl font-extrabold text-brand-600">
            {summary?.average_gross_margin_pct || 0}%
          </div>
          <div className="text-xs sm:text-sm text-emerald-600 font-semibold mt-2">Protected by guardrails</div>
        </div>
      </div>

      {/* Two Column Grid */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Status Distribution */}
        <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
            Quotation Workflow Distribution
          </h3>

          <div className="space-y-3 text-sm">
            {summary?.status_distribution &&
              Object.entries(summary.status_distribution).map(([status, count]: [string, any]) => (
                <div key={status} className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="font-semibold text-slate-700">{status.replace(/_/g, ' ')}</span>
                  <span className="font-mono font-bold text-slate-900 bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-2xs">
                    {count}
                  </span>
                </div>
              ))}
          </div>
        </div>

        {/* Top Quoted Products */}
        <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
            Top Quoted Products (Demand Analysis)
          </h3>

          <div className="space-y-3 text-sm">
            {summary?.top_quoted_products?.map((p: any, idx: number) => (
              <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-800">{p.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">Total volume: {p.total_quantity} units</div>
                </div>
                <span className="font-mono text-xs sm:text-sm font-bold text-brand-700 bg-brand-50 border border-brand-200/70 px-2.5 py-1 rounded-lg">
                  {p.quotation_count} quotes
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
