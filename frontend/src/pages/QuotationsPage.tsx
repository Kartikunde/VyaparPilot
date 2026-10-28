import React, { useState, useEffect } from 'react';
import { NavLink, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { Quotation, QuotationStatusCounts } from '../types';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  XCircle,
  ExternalLink
} from 'lucide-react';

export const QuotationsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlStatus = searchParams.get('status') || '';

  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [statusCounts, setStatusCounts] = useState<QuotationStatusCounts | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState(urlStatus);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const s = searchParams.get('status') || '';
    if (s !== statusFilter) {
      setStatusFilter(s);
      setPage(1);
    }
  }, [searchParams]);

  useEffect(() => {
    loadQuotations();
  }, [page, statusFilter, search]);

  const loadQuotations = async () => {
    try {
      setLoading(true);
      const [res, counts] = await Promise.all([
        api.quotations.list({
          page,
          page_size: 15,
          status_filter: statusFilter || undefined,
          search: search || undefined
        }),
        api.quotations.getStatusCounts()
      ]);
      setQuotations(res.items || []);
      setTotal(res.total || 0);
      setStatusCounts(counts);
    } catch (err) {
      console.error('Failed to load quotations:', err);
    } finally {
      setLoading(false);
    }
  };

  const statusPills: { label: string; value: string; count: number }[] = [
    { label: 'All', value: '', count: statusCounts?.total || 0 },
    { label: 'Draft', value: 'DRAFT', count: statusCounts?.draft || 0 },
    { label: 'Pending Approval', value: 'PENDING_APPROVAL', count: statusCounts?.pending_approval || 0 },
    { label: 'Approved', value: 'APPROVED', count: statusCounts?.approved || 0 },
    { label: 'Pending Response (24h)', value: 'PENDING_RESPONSE', count: statusCounts?.pending_response || 0 },
    { label: 'Accepted', value: 'ACCEPTED', count: statusCounts?.accepted || 0 },
    { label: 'Declined / Rejected', value: 'REJECTED', count: statusCounts?.rejected || 0 },
    { label: 'Expired', value: 'EXPIRED', count: statusCounts?.expired || 0 }
  ];

  const getStatusBadge = (q: Quotation) => {
    switch (q.status) {
      case 'APPROVED':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> Approved
          </span>
        );
      case 'PENDING_RESPONSE': {
        const remaining = typeof q.seconds_remaining === 'number' ? q.seconds_remaining : null;
        let countdownStr = '';
        if (remaining !== null) {
          if (remaining <= 0) {
            countdownStr = 'Expired';
          } else {
            const h = Math.floor(remaining / 3600);
            const m = Math.floor((remaining % 3600) / 60);
            countdownStr = h > 0 ? `${h}h ${m}m` : `${m}m left`;
          }
        }
        return (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 inline-flex items-center gap-1.5 whitespace-nowrap">
            <Clock className="w-3.5 h-3.5 text-indigo-500" />
            <span>Pending {countdownStr ? `(${countdownStr})` : ''}</span>
          </span>
        );
      }
      case 'ACCEPTED':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-600 text-white inline-flex items-center gap-1.5 shadow-xs">
            <CheckCircle2 className="w-3.5 h-3.5" /> Accepted
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-300 inline-flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" /> Expired
          </span>
        );
      case 'PENDING_APPROVAL':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Pending Approval
          </span>
        );
      case 'NEEDS_REVIEW':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 inline-flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> Needs Review
          </span>
        );
      case 'REJECTED':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300 inline-flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5 text-slate-500" /> Rejected
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            Draft
          </span>
        );
    }
  };

  return (
    <div className="space-y-7">
      {/* Page Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Quotations</h2>
          <p className="text-sm text-slate-500 mt-1">
            Manage and track commercial quotations across all lifecycle stages.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <NavLink
            to="/enquiries"
            className="h-11 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-brand-200 bg-brand-50 hover:bg-brand-100 text-brand-700 text-sm font-semibold shadow-xs transition-colors"
          >
            <span>AI Studio</span>
          </NavLink>
          <NavLink
            to="/quotations/new"
            className="h-11 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Quotation</span>
          </NavLink>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {statusPills.map((p) => (
            <button
              key={p.value}
              onClick={() => {
                setStatusFilter(p.value);
                setPage(1);
                if (p.value) {
                  setSearchParams({ status: p.value });
                } else {
                  setSearchParams({});
                }
              }}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center gap-2 ${
                statusFilter === p.value
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <span>{p.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                statusFilter === p.value
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-200 text-slate-700'
              }`}>
                {p.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full lg:w-80 shrink-0">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by quote # or customer..."
            className="w-full h-11 text-sm pl-10 pr-4 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
          />
        </div>
      </div>

      {/* Quotations Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold text-xs uppercase tracking-wider">
                <th className="py-4 px-5">Quote #</th>
                <th className="py-4 px-5">Date</th>
                <th className="py-4 px-5">Customer & Project</th>
                <th className="py-4 px-5 text-right">Grand Total (₹)</th>
                <th className="py-4 px-5 text-center">Gross Margin</th>
                <th className="py-4 px-5 text-center">Status</th>
                <th className="py-4 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {quotations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400 text-sm">
                    No quotations found in this view.
                  </td>
                </tr>
              ) : (
                quotations.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-5 font-mono font-bold text-slate-900">
                      <NavLink to={`/quotations/${q.id}`} className="hover:text-brand-600">
                        {q.quotation_number}
                      </NavLink>
                    </td>
                    <td className="py-4 px-5 text-slate-500 text-xs sm:text-sm">
                      {new Date(q.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-4 px-5">
                      <div className="font-semibold text-slate-900">{q.customer_company || 'Customer'}</div>
                      <div className="text-xs text-slate-400 truncate max-w-xs mt-0.5">{q.title || q.customer_name}</div>
                    </td>
                    <td className="py-4 px-5 text-right font-bold text-slate-900">
                      ₹{q.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-5 text-center">
                      <span className={`font-semibold ${q.estimated_gross_margin_pct < 15 ? 'text-rose-600 font-bold' : 'text-emerald-700'}`}>
                        {q.estimated_gross_margin_pct.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-4 px-5 text-center">
                      {getStatusBadge(q)}
                    </td>
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <NavLink
                          to={`/quotations/${q.id}`}
                          className="h-9 px-3.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold inline-flex items-center"
                        >
                          View
                        </NavLink>
                        {q.public_token && (
                          <a
                            href={`/portal/${q.public_token}`}
                            target="_blank"
                            rel="noreferrer"
                            title="Open Retailer Proposal Portal"
                            className="w-9 h-9 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 inline-flex items-center justify-center transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        <a
                          href={api.quotations.getPdfUrl(q.id)}
                          target="_blank"
                          rel="noreferrer"
                          title="Download PDF"
                          className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-brand-50 hover:text-brand-600 text-slate-600 inline-flex items-center justify-center transition-colors"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between text-sm text-slate-600">
          <div>
            Showing <span className="font-semibold text-slate-800">{quotations.length}</span> of <span className="font-semibold text-slate-800">{total}</span> quotations
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="h-9 px-4 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              Previous
            </button>
            <span className="font-bold text-slate-800 text-xs px-2">Page {page}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={quotations.length < 15}
              className="h-9 px-4 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
