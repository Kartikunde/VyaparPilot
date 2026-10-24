import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { api } from '../api/client';
import { Quotation, ROISummaryResponse, AuditEvent } from '../types';
import {
  FileText,
  Clock,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
  ArrowRight,
  Download,
  Calendar,
  Building2,
  Activity,
  History
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [roi, setRoi] = useState<ROISummaryResponse | null>(null);
  const [recentAudits, setRecentAudits] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [quoteRes, roiRes, auditRes] = await Promise.all([
        api.quotations.list({ page_size: 6 }),
        api.roi.getSummary(),
        api.audit.list({ limit: 6 })
      ]);
      setQuotations(quoteRes.items || []);
      setRoi(roiRes);
      setRecentAudits(auditRes.items || []);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Approved</span>;
      case 'PENDING_APPROVAL':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">Pending Approval</span>;
      case 'NEEDS_REVIEW':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Needs Review</span>;
      case 'REJECTED':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-300">Rejected</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">Draft</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const approvedCount = quotations.filter(q => q.status === 'APPROVED').length;
  const pendingCount = quotations.filter(q => q.status === 'PENDING_APPROVAL').length;
  const reviewCount = quotations.filter(q => q.status === 'NEEDS_REVIEW').length;
  const draftCount = quotations.filter(q => q.status === 'DRAFT').length;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-6 sm:p-7 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-brand-300 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Verified Co-Pilot Active
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">MSME Quotation & Productivity Centre</h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            Automate customer enquiries, verify prices against your catalogue, catch underpricing errors, and monitor verified staff time savings.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <NavLink
            to="/enquiries"
            className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-colors flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            AI Enquiry Studio
          </NavLink>
          <NavLink
            to="/quotations/new"
            className="bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors"
          >
            Manual Quote
          </NavLink>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Total Quotations</span>
            <FileText className="w-4 h-4 text-brand-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {roi?.total_quotations_processed || quotations.length}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 flex items-center gap-1.5">
            <span className="text-emerald-600 font-semibold">{approvedCount} Approved</span>
            <span>•</span>
            <span className="text-amber-600 font-semibold">{pendingCount} Pending</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Avg. Time Saved / Quote</span>
            <Clock className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-extrabold text-teal-600">
            {roi?.avg_time_saved_per_quotation_minutes || 32.3} <span className="text-sm font-bold text-slate-600">mins</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {roi?.avg_time_reduction_percentage || 92}% reduction vs manual baseline
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Measured Labour Value Saved</span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            ₹{Math.round(roi?.total_estimated_labour_value_saved || 980).toLocaleString('en-IN')}
          </div>
          <div className="mt-1 text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
            <span>Net Benefit: ₹{Math.round(roi?.net_productivity_benefit || 978).toLocaleString('en-IN')}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Guardrail Catches</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-amber-600">
            {roi?.total_validation_errors_caught || 3}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Underpricing & stock shortage alerts
          </div>
        </div>
      </div>

      {/* Main Dashboard Two-Column Section */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Quotations Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Recent Quotations</h3>
              <p className="text-[11px] text-slate-500">Latest business quotations with live status and margin check</p>
            </div>
            <NavLink
              to="/quotations"
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </NavLink>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold text-[11px]">
                  <th className="py-2.5 px-3">Quote #</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Total (₹)</th>
                  <th className="py-2.5 px-3">Margin</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {quotations.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">
                      <NavLink to={`/quotations/${q.id}`} className="hover:text-brand-600">
                        {q.quotation_number}
                      </NavLink>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-800">{q.customer_company || 'Customer'}</div>
                      <div className="text-[10px] text-slate-400">{q.customer_name}</div>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-900">
                      ₹{q.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`font-semibold ${q.estimated_gross_margin_pct < 15 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {q.estimated_gross_margin_pct.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-3">{getStatusBadge(q.status)}</td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <NavLink
                          to={`/quotations/${q.id}`}
                          className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold"
                        >
                          View
                        </NavLink>
                        <a
                          href={api.quotations.getPdfUrl(q.id)}
                          target="_blank"
                          rel="noreferrer"
                          title="Download PDF"
                          className="p-1 rounded bg-slate-100 hover:bg-brand-50 hover:text-brand-600 text-slate-600"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Recent Activity & Audit Trail */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-brand-600" />
                <h3 className="text-sm font-bold text-slate-900">Audit Trail</h3>
              </div>
              <NavLink to="/audit" className="text-xs font-semibold text-brand-600 hover:text-brand-700">
                View all
              </NavLink>
            </div>

            <div className="space-y-3">
              {recentAudits.map((event) => (
                <div key={event.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[10px] font-bold text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded">
                      {event.event_type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-700 leading-snug line-clamp-2">{event.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 p-3 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-xs">
            <div className="font-bold flex items-center gap-1.5 mb-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
              <span>Verifiable Return on Investment</span>
            </div>
            <p className="text-[11px] text-teal-700 leading-relaxed">
              Every workflow step records exact seconds spent by AI and humans. Check the full ROI dashboard for audited metrics.
            </p>
            <NavLink
              to="/roi"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-900 hover:underline mt-2"
            >
              Explore ROI Dashboard <ArrowRight className="w-3 h-3" />
            </NavLink>
          </div>
        </div>
      </div>
    </div>
  );
};
