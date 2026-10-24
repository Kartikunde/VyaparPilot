import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { api } from '../api/client';
import { Quotation } from '../types';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight
} from 'lucide-react';

export const QuotationsPage: React.FC = () => {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadQuotations();
  }, [page, statusFilter, search]);

  const loadQuotations = async () => {
    try {
      setLoading(true);
      const res = await api.quotations.list({
        page,
        page_size: 15,
        status_filter: statusFilter || undefined,
        search: search || undefined
      });
      setQuotations(res.items || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error('Failed to load quotations:', err);
    } finally {
      setLoading(false);
    }
  };

  const statusPills = [
    { label: 'All', value: '' },
    { label: 'Draft', value: 'DRAFT' },
    { label: 'Needs Review', value: 'NEEDS_REVIEW' },
    { label: 'Pending Approval', value: 'PENDING_APPROVAL' },
    { label: 'Approved', value: 'APPROVED' },
    { label: 'Rejected', value: 'REJECTED' }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Approved</span>;
      case 'PENDING_APPROVAL':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1"><Clock className="w-3 h-3" /> Pending Approval</span>;
      case 'NEEDS_REVIEW':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Needs Review</span>;
      case 'REJECTED':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-300">Rejected</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">Draft</span>;
    }
  };

  return (
    <div className="space-y-5">
      {/* Page Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Quotations Directory</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage quotations, track approval workflows, and export verified customer PDF documents.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <NavLink
            to="/enquiries"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-brand-200 bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-semibold shadow-xs"
          >
            <span>From AI Enquiry</span>
          </NavLink>
          <NavLink
            to="/quotations/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Quotation</span>
          </NavLink>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {statusPills.map((p) => (
            <button
              key={p.value}
              onClick={() => { setStatusFilter(p.value); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === p.value
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by quote # or customer..."
            className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Quotations Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
                <th className="py-3 px-4">Quote #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Customer & Project</th>
                <th className="py-3 px-4 text-right">Grand Total (₹)</th>
                <th className="py-3 px-4 text-center">Gross Margin</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {quotations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No quotations found in this view.
                  </td>
                </tr>
              ) : (
                quotations.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      <NavLink to={`/quotations/${q.id}`} className="hover:text-brand-600">
                        {q.quotation_number}
                      </NavLink>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(q.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{q.customer_company || 'Customer'}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-xs">{q.title || q.customer_name}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      ₹{q.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`font-semibold ${q.estimated_gross_margin_pct < 15 ? 'text-rose-600 font-bold' : 'text-emerald-700'}`}>
                        {q.estimated_gross_margin_pct.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {getStatusBadge(q.status)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <NavLink
                          to={`/quotations/${q.id}`}
                          className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold"
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
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing <span className="font-semibold">{quotations.length}</span> of <span className="font-semibold">{total}</span> quotations
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-700 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="font-semibold text-slate-700">Page {page}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={quotations.length < 15}
              className="px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-700 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
