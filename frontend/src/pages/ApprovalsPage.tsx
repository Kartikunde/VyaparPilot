import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { api } from '../api/client';
import { Quotation, GuardrailWarning } from '../types';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ArrowRight,
  ShieldCheck,
  Building2,
  FileText
} from 'lucide-react';

export const ApprovalsPage: React.FC = () => {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [selectedQuote, setSelectedQuote] = useState<Quotation | null>(null);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [approvalComments, setApprovalComments] = useState('');
  const [rejectionComments, setRejectionComments] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadPendingQuotations();
  }, []);

  const loadPendingQuotations = async () => {
    try {
      setLoading(true);
      // Fetch both PENDING_APPROVAL and NEEDS_REVIEW
      const [pendingRes, reviewRes] = await Promise.all([
        api.quotations.list({ status_filter: 'PENDING_APPROVAL', page_size: 50 }),
        api.quotations.list({ status_filter: 'NEEDS_REVIEW', page_size: 50 })
      ]);
      setQuotations([...(pendingRes.items || []), ...(reviewRes.items || [])]);
    } catch (err) {
      console.error('Failed to load approvals:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedQuote) return;
    setActionLoading(true);
    try {
      await api.quotations.approve(selectedQuote.id, {
        comments: approvalComments || 'Approved by authorized manager.',
        review_time_seconds: 90.0
      });
      setApproveModalOpen(false);
      setSelectedQuote(null);
      await loadPendingQuotations();
    } catch (err: any) {
      alert(err.message || 'Failed to approve quotation.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedQuote || !rejectionComments.trim()) return;
    setActionLoading(true);
    try {
      await api.quotations.reject(selectedQuote.id, rejectionComments);
      setRejectModalOpen(false);
      setSelectedQuote(null);
      await loadPendingQuotations();
    } catch (err: any) {
      alert(err.message || 'Failed to reject quotation.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Human Approval & Risk Governance Hub</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Owner & manager review queue for quotations with guardrail warnings or awaiting final commercial sign-off.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : quotations.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">All Quotations Approved</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            There are currently no quotations pending review or approval. Your pipeline is up to date!
          </p>
          <NavLink
            to="/enquiries"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700"
          >
            Process New Customer Enquiry
          </NavLink>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {quotations.map((q) => {
            const warnings: GuardrailWarning[] = q.guardrail_warnings_json
              ? JSON.parse(q.guardrail_warnings_json)
              : [];

            return (
              <div
                key={q.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between hover:border-slate-300 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono text-sm font-extrabold text-slate-900">
                      {q.quotation_number}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      q.status === 'NEEDS_REVIEW'
                        ? 'bg-rose-100 text-rose-800 flex items-center gap-1'
                        : 'bg-amber-100 text-amber-800 flex items-center gap-1'
                    }`}>
                      {q.status === 'NEEDS_REVIEW' && <AlertTriangle className="w-3 h-3" />}
                      {q.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="font-bold text-xs text-slate-800">{q.customer_company}</div>
                  <div className="text-[11px] text-slate-500 mb-3">{q.title || `Quotation for ${q.customer_name}`}</div>

                  {/* Financial Mini Breakdown */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 grid grid-cols-2 gap-2 text-xs mb-3">
                    <div>
                      <span className="text-slate-400">Grand Total:</span>
                      <div className="font-bold font-mono text-slate-900">
                        ₹{q.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400">Gross Margin:</span>
                      <div className={`font-bold ${q.estimated_gross_margin_pct < 15 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {q.estimated_gross_margin_pct.toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  {/* Warning Alerts */}
                  {warnings.length > 0 && (
                    <div className="space-y-1 mb-4">
                      {warnings.map((w, idx) => (
                        <div
                          key={idx}
                          className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900 leading-snug flex items-start gap-1.5"
                        >
                          <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
                          <span><b>{w.code}:</b> {w.message}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bottom Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <NavLink
                    to={`/quotations/${q.id}`}
                    className="text-xs font-semibold text-brand-600 hover:text-brand-700"
                  >
                    Inspect Full Details &rarr;
                  </NavLink>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => { setSelectedQuote(q); setRejectModalOpen(true); setRejectionComments(''); }}
                      className="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 text-xs font-semibold"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => { setSelectedQuote(q); setApproveModalOpen(true); setApprovalComments(''); }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
                    >
                      Approve
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Approve Modal */}
      {approveModalOpen && selectedQuote && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-2">
              Approve Quotation {selectedQuote.quotation_number}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Sign off on commercial terms and authorize client PDF generation.
            </p>
            <textarea
              rows={3}
              value={approvalComments}
              onChange={(e) => setApprovalComments(e.target.value)}
              placeholder="Approval comments or signature note..."
              className="w-full text-xs p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 mb-4"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setApproveModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
              >
                {actionLoading ? 'Approving...' : 'Confirm Approval'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalOpen && selectedQuote && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-2">Reject Quotation</h3>
            <p className="text-xs text-slate-500 mb-4">
              Specify the exact reason for rejection (required for audit compliance).
            </p>
            <textarea
              rows={3}
              required
              value={rejectionComments}
              onChange={(e) => setRejectionComments(e.target.value)}
              placeholder="Reason for rejection (e.g. negative margin, unauthorized discount)..."
              className="w-full text-xs p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 mb-4"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setRejectModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading || !rejectionComments.trim()}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold disabled:opacity-50"
              >
                {actionLoading ? 'Rejecting...' : 'Reject Quotation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
