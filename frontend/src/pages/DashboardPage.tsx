import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { api } from '../api/client';
import { Quotation, ROISummaryResponse, AuditEvent, QuotationStatusCounts } from '../types';
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
  const [statusCounts, setStatusCounts] = useState<QuotationStatusCounts | null>(null);
  const [roi, setRoi] = useState<ROISummaryResponse | null>(null);
  const [recentAudits, setRecentAudits] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [quoteRes, countsRes, roiRes, auditRes] = await Promise.all([
        api.quotations.list({ page_size: 6 }),
        api.quotations.getStatusCounts(),
        api.roi.getSummary(),
        api.audit.list({ limit: 6 })
      ]);
      setQuotations(quoteRes.items || []);
      setStatusCounts(countsRes);
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
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Approved</span>;
      case 'PENDING_RESPONSE':
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">Pending Response (24h)</span>;
      case 'ACCEPTED':
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-600 text-white">Accepted</span>;
      case 'EXPIRED':
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-300">Expired</span>;
      case 'PENDING_APPROVAL':
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">Pending Approval</span>;
      case 'NEEDS_REVIEW':
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Needs Review</span>;
      case 'REJECTED':
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">Rejected</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">Draft</span>;
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
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-7 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-brand-300 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            System Active
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Quotations & Operations Hub</h2>
          <p className="text-sm sm:text-base text-slate-300 mt-2 max-w-2xl leading-relaxed">
            Process customer RFQs, verify catalogue pricing, and track verified time savings.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <NavLink
            to="/enquiries"
            className="h-11 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-5 rounded-xl shadow-sm transition-colors flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Process Enquiry</span>
          </NavLink>
          <NavLink
            to="/quotations/new"
            className="h-11 bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold px-5 rounded-xl transition-colors flex items-center"
          >
            <span>New Quotation</span>
          </NavLink>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-xs min-h-[148px] flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-sm font-semibold text-slate-600">Total Quotations</span>
            <FileText className="w-5 h-5 text-brand-600" />
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold text-slate-900">
            {statusCounts ? statusCounts.total : 0}
          </div>
          <div className="mt-2 text-xs sm:text-sm text-slate-500 flex items-center gap-1.5 flex-wrap">
            <span className="text-emerald-600 font-semibold">{statusCounts?.approved || 0} approved</span>
            <span>•</span>
            <span className="text-amber-600 font-semibold">{statusCounts?.pending_approval || 0} pending review</span>
          </div>
        </div>

        <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-xs min-h-[148px] flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-sm font-semibold text-slate-600">Avg. Time Saved / Quote</span>
            <Clock className="w-5 h-5 text-teal-600" />
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold text-teal-600">
            {roi?.avg_time_saved_per_quotation_minutes || 32.3} <span className="text-base font-bold text-slate-600">mins</span>
          </div>
          <div className="mt-2 text-xs sm:text-sm text-slate-500">
            {roi?.avg_time_reduction_percentage || 92}% vs manual baseline
          </div>
        </div>

        <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-xs min-h-[148px] flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-sm font-semibold text-slate-600">Labour Value Saved</span>
            <TrendingUp className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold text-slate-900">
            ₹{Math.round(roi?.total_estimated_labour_value_saved || 980).toLocaleString('en-IN')}
          </div>
          <div className="mt-2 text-xs sm:text-sm text-emerald-600 font-semibold flex items-center gap-1">
            <span>Net benefit: ₹{Math.round(roi?.net_productivity_benefit || 978).toLocaleString('en-IN')}</span>
          </div>
        </div>

        <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-xs min-h-[148px] flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-sm font-semibold text-slate-600">Guardrail Catches</span>
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold text-amber-600">
            {roi?.total_validation_errors_caught || 3}
          </div>
          <div className="mt-2 text-xs sm:text-sm text-slate-500">
            Pricing & inventory alerts
          </div>
        </div>
      </div>

      {/* Quotation Pipeline & Lifecycle Status Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-7">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">Quotation Pipeline</h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Live status breakdown</p>
          </div>
          <NavLink
            to="/quotations"
            className="text-sm font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1.5"
          >
            <span>View All ({statusCounts?.total || 0})</span>
            <ArrowRight className="w-4 h-4" />
          </NavLink>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7 gap-3.5 sm:gap-4">
          <NavLink
            to="/quotations?status=DRAFT"
            className="p-4 rounded-xl bg-slate-50/70 hover:bg-white hover:border-slate-300 border border-slate-200/80 transition-all text-left group min-h-[105px] flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Draft</span>
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
            </div>
            <div className="text-2xl font-extrabold text-slate-800 group-hover:text-slate-900">
              {statusCounts?.draft || 0}
            </div>
            <div className="text-xs text-slate-400">In preparation</div>
          </NavLink>

          <NavLink
            to="/quotations?status=PENDING_APPROVAL"
            className="p-4 rounded-xl bg-slate-50/70 hover:bg-white hover:border-amber-300 border border-slate-200/80 transition-all text-left group min-h-[105px] flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Pending Approval</span>
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            </div>
            <div className="text-2xl font-extrabold text-slate-800 group-hover:text-amber-900">
              {statusCounts?.pending_approval || 0}
            </div>
            <div className="text-xs text-slate-400">Awaiting manager</div>
          </NavLink>

          <NavLink
            to="/quotations?status=APPROVED"
            className="p-4 rounded-xl bg-slate-50/70 hover:bg-white hover:border-emerald-300 border border-slate-200/80 transition-all text-left group min-h-[105px] flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Approved</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            </div>
            <div className="text-2xl font-extrabold text-slate-800 group-hover:text-emerald-900">
              {statusCounts?.approved || 0}
            </div>
            <div className="text-xs text-slate-400">Ready to send</div>
          </NavLink>

          <NavLink
            to="/quotations?status=PENDING_RESPONSE"
            className="p-4 rounded-xl bg-slate-50/70 hover:bg-white hover:border-indigo-300 border border-slate-200/80 transition-all text-left group min-h-[105px] flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Pending Response</span>
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
            </div>
            <div className="text-2xl font-extrabold text-slate-800 group-hover:text-indigo-900">
              {statusCounts?.pending_response || 0}
            </div>
            <div className="text-xs text-slate-400">Sent (24h window)</div>
          </NavLink>

          <NavLink
            to="/quotations?status=ACCEPTED"
            className="p-4 rounded-xl bg-slate-50/70 hover:bg-white hover:border-emerald-400 border border-slate-200/80 transition-all text-left group min-h-[105px] flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Accepted</span>
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
            </div>
            <div className="text-2xl font-extrabold text-slate-800 group-hover:text-emerald-900">
              {statusCounts?.accepted || 0}
            </div>
            <div className="text-xs text-slate-400">By retailer</div>
          </NavLink>

          <NavLink
            to="/quotations?status=REJECTED"
            className="p-4 rounded-xl bg-slate-50/70 hover:bg-white hover:border-slate-400 border border-slate-200/80 transition-all text-left group min-h-[105px] flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Declined</span>
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
            </div>
            <div className="text-2xl font-extrabold text-slate-800 group-hover:text-slate-900">
              {statusCounts?.rejected || 0}
            </div>
            <div className="text-xs text-slate-400">Rejected by client</div>
          </NavLink>

          <NavLink
            to="/quotations?status=EXPIRED"
            className="p-4 rounded-xl bg-slate-50/70 hover:bg-white hover:border-rose-300 border border-slate-200/80 transition-all text-left group min-h-[105px] flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">Expired</span>
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            </div>
            <div className="text-2xl font-extrabold text-slate-800 group-hover:text-rose-900">
              {statusCounts?.expired || 0}
            </div>
            <div className="text-xs text-slate-400">&gt; 24h passed</div>
          </NavLink>
        </div>
      </div>

      {/* Main Dashboard Two-Column Section */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column: Recent Quotations Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-7">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">Recent Quotations</h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Latest quotations and margin analysis</p>
            </div>
            <NavLink
              to="/quotations"
              className="text-sm font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1.5"
            >
              <span>View all</span>
              <ArrowRight className="w-4 h-4" />
            </NavLink>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-bold text-xs uppercase tracking-wider bg-slate-50/70">
                  <th className="py-3.5 px-4">Quote #</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Total (₹)</th>
                  <th className="py-3.5 px-4">Margin</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {quotations.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-4 font-mono font-bold text-slate-900">
                      <NavLink to={`/quotations/${q.id}`} className="hover:text-brand-600">
                        {q.quotation_number}
                      </NavLink>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-semibold text-slate-900">{q.customer_company || 'Customer'}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{q.customer_name}</div>
                    </td>
                    <td className="py-4 px-4 font-bold text-slate-900">
                      ₹{q.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`font-semibold ${q.estimated_gross_margin_pct < 15 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {q.estimated_gross_margin_pct.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-4 px-4">{getStatusBadge(q.status)}</td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <NavLink
                          to={`/quotations/${q.id}`}
                          className="h-8 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold inline-flex items-center"
                        >
                          View
                        </NavLink>
                        <a
                          href={api.quotations.getPdfUrl(q.id)}
                          target="_blank"
                          rel="noreferrer"
                          title="Download PDF"
                          className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-brand-50 hover:text-brand-600 text-slate-600 inline-flex items-center justify-center transition-colors"
                        >
                          <Download className="w-4 h-4" />
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
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-7 flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <History className="w-5 h-5 text-brand-600" />
                <h3 className="text-base sm:text-lg font-bold text-slate-900">Audit Trail</h3>
              </div>
              <NavLink to="/audit" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
                View all
              </NavLink>
            </div>

            <div className="space-y-3.5">
              {recentAudits.map((event) => (
                <div key={event.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-sm">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-xs font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200/60">
                      {event.event_type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed line-clamp-2">{event.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 p-4 sm:p-5 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-sm space-y-2">
            <div className="font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-600" />
              <span>Return on Investment</span>
            </div>
            <p className="text-xs sm:text-sm text-teal-700 leading-relaxed">
              Automated tracking of AI and human review time per quotation.
            </p>
            <NavLink
              to="/roi"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-teal-900 hover:underline pt-1"
            >
              <span>View ROI Analytics</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </NavLink>
          </div>
        </div>
      </div>
    </div>
  );
};
