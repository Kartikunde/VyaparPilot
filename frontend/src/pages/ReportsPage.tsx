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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Executive Business Reports</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Commercial pipeline health, approved revenue, and product demand analytics.
          </p>
        </div>

        <a
          href={api.reports.exportCsvUrl()}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-sm transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export All Quotations CSV</span>
        </a>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 mb-1">Approved Revenue</div>
          <div className="text-2xl font-extrabold text-emerald-600">
            ₹{Math.round(summary?.approved_revenue || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Confirmed signed deals</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 mb-1">Total Pipeline Value</div>
          <div className="text-2xl font-extrabold text-slate-900">
            ₹{Math.round(summary?.total_pipeline_value || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Across all quotations</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 mb-1">Average Quote Value</div>
          <div className="text-2xl font-extrabold text-slate-900">
            ₹{Math.round(summary?.average_quotation_value || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Per transaction</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 mb-1">Average Gross Margin</div>
          <div className="text-2xl font-extrabold text-brand-600">
            {summary?.average_gross_margin_pct || 0}%
          </div>
          <div className="text-[10px] text-emerald-600 font-semibold mt-1">Protected by guardrails</div>
        </div>
      </div>

      {/* Two Column Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-3">
            Quotation Workflow Distribution
          </h3>

          <div className="space-y-2.5 text-xs">
            {summary?.status_distribution &&
              Object.entries(summary.status_distribution).map(([status, count]: [string, any]) => (
                <div key={status} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="font-semibold text-slate-700">{status.replace(/_/g, ' ')}</span>
                  <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {count}
                  </span>
                </div>
              ))}
          </div>
        </div>

        {/* Top Quoted Products */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-3">
            Top Quoted Products (Demand Analysis)
          </h3>

          <div className="space-y-2.5 text-xs">
            {summary?.top_quoted_products?.map((p: any, idx: number) => (
              <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-800">{p.name}</div>
                  <div className="text-[10px] text-slate-400">Total volume: {p.total_quantity} units</div>
                </div>
                <span className="font-mono text-xs font-bold text-brand-700 bg-brand-50 px-2 py-1 rounded">
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
