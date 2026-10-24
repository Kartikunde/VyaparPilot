import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, NavLink } from 'react-router-dom';
import { api } from '../api/client';
import { Quotation, GuardrailWarning } from '../types';
import {
  FileText,
  Download,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Building2,
  Calendar,
  Send,
  ArrowLeft,
  FileCheck2,
  ShieldCheck
} from 'lucide-react';

export const QuotationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Approval modal state
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [approvalComments, setApprovalComments] = useState('');
  const [rejectionComments, setRejectionComments] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    loadQuotation();
  }, [id]);

  const loadQuotation = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await api.quotations.get(Number(id));
      setQuotation(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load quotation.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitForApproval = async () => {
    if (!quotation) return;
    setActionLoading(true);
    try {
      await api.quotations.submitApproval(quotation.id);
      await loadQuotation();
    } catch (err: any) {
      alert(err.message || 'Failed to submit quotation.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!quotation) return;
    setActionLoading(true);
    try {
      await api.quotations.approve(quotation.id, {
        comments: approvalComments || 'Approved with verified catalogue prices.',
        review_time_seconds: 90.0
      });
      setApproveModalOpen(false);
      await loadQuotation();
    } catch (err: any) {
      alert(err.message || 'Failed to approve quotation.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!quotation || !rejectionComments.trim()) return;
    setActionLoading(true);
    try {
      await api.quotations.reject(quotation.id, rejectionComments);
      setRejectModalOpen(false);
      await loadQuotation();
    } catch (err: any) {
      alert(err.message || 'Failed to reject quotation.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !quotation) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center max-w-lg mx-auto">
        <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
        <h3 className="text-base font-bold text-slate-900">Quotation Not Found</h3>
        <p className="text-xs text-slate-500 mt-1 mb-4">{error || 'This record does not exist or has been removed.'}</p>
        <NavLink to="/quotations" className="text-xs font-semibold text-brand-600 hover:underline">
          &larr; Back to Quotations Directory
        </NavLink>
      </div>
    );
  }

  const warnings: GuardrailWarning[] = quotation.guardrail_warnings_json
    ? JSON.parse(quotation.guardrail_warnings_json)
    : [];

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <NavLink
            to="/quotations"
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
            title="Back to Quotations"
          >
            <ArrowLeft className="w-4 h-4" />
          </NavLink>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-extrabold text-slate-900">
                {quotation.quotation_number}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                quotation.status === 'APPROVED'
                  ? 'bg-emerald-100 text-emerald-800'
                  : quotation.status === 'PENDING_APPROVAL'
                  ? 'bg-amber-100 text-amber-800'
                  : quotation.status === 'NEEDS_REVIEW'
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-slate-100 text-slate-700'
              }`}>
                {quotation.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{quotation.title || 'Quotation Details'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* PDF Download Button */}
          <button
            type="button"
            onClick={async () => {
              try {
                setDownloadingPdf(true);
                await api.quotations.downloadPdf(quotation.id, quotation.quotation_number);
              } catch (e: any) {
                console.error('Blob download failed, using direct link fallback:', e);
                window.open(api.quotations.getPdfUrl(quotation.id), '_blank');
              } finally {
                setDownloadingPdf(false);
              }
            }}
            disabled={downloadingPdf}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{downloadingPdf ? 'Downloading PDF...' : 'Download Official PDF'}</span>
          </button>

          {/* Workflow Buttons */}
          {(quotation.status === 'DRAFT' || quotation.status === 'NEEDS_REVIEW') && (
            <button
              onClick={handleSubmitForApproval}
              disabled={actionLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit for Approval</span>
            </button>
          )}

          {quotation.status === 'PENDING_APPROVAL' && (
            <>
              <button
                onClick={() => setApproveModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Approve</span>
              </button>
              <button
                onClick={() => setRejectModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Reject</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Pricing Guardrail Warnings Banner if any */}
      {warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-900 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Pricing Guardrail Triggers Recorded for this Quotation ({warnings.length})</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-2 text-xs">
            {warnings.map((w, idx) => (
              <div key={idx} className="p-2.5 rounded-lg bg-white border border-amber-200/80 text-[11px] text-amber-950">
                <span className="font-bold text-amber-800">{w.code}:</span> {w.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Customer & Quote Metadata Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 grid sm:grid-cols-3 gap-6 text-xs">
        <div>
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Customer Information
          </div>
          <div className="font-bold text-slate-900 text-sm">{quotation.customer_company}</div>
          <div className="text-slate-600 mt-0.5">Attn: {quotation.customer_name}</div>
          <div className="text-slate-500">Phone: {quotation.customer_phone || 'N/A'}</div>
          <div className="text-slate-500">Email: {quotation.customer_email || 'N/A'}</div>
          {quotation.customer_gstin && (
            <div className="text-brand-700 font-mono mt-1 font-semibold">GSTIN: {quotation.customer_gstin}</div>
          )}
        </div>

        <div>
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Dates & Validity
          </div>
          <div><span className="text-slate-400">Created:</span> {new Date(quotation.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
          <div><span className="text-slate-400">Valid Until:</span> {quotation.valid_until ? new Date(quotation.valid_until).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '30 Days'}</div>
          {quotation.approved_at && (
            <div className="text-emerald-700 font-semibold mt-1">
              Approved on: {new Date(quotation.approved_at).toLocaleDateString('en-IN')}
            </div>
          )}
        </div>

        <div>
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Tax & Compliance
          </div>
          <div><span className="text-slate-400">Tax Type:</span> {quotation.tax_type.replace(/_/g, ' ')}</div>
          <div><span className="text-slate-400">Standard Rate:</span> {quotation.tax_rate}%</div>
          <div>
            <span className="text-slate-400">Gross Margin:</span>{' '}
            <span className={`font-bold ${quotation.estimated_gross_margin_pct < 15 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {quotation.estimated_gross_margin_pct.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Itemized Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Quotation Items ({quotation.items.length})
          </h3>
          <span className="text-xs text-slate-500 font-mono">Currency: INR (₹)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-semibold text-[11px]">
                <th className="py-3 px-4 w-12">#</th>
                <th className="py-3 px-4">SKU & Product Name</th>
                <th className="py-3 px-4 text-right">Quantity</th>
                <th className="py-3 px-4">Unit</th>
                <th className="py-3 px-4 text-right">Unit Price (₹)</th>
                <th className="py-3 px-4 text-right">Discount</th>
                <th className="py-3 px-4 text-right">Line Total (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {quotation.items.map((it, idx) => (
                <tr key={it.id || idx} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 text-slate-400">{idx + 1}</td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">{it.name}</div>
                    <div className="text-[10px] text-slate-400">
                      {it.sku && <span className="font-mono text-brand-700 bg-brand-50 px-1 py-0.2 rounded font-semibold mr-1.5">[{it.sku}]</span>}
                      {it.description}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900">{it.quantity}</td>
                  <td className="py-3 px-4 text-slate-600">{it.unit}</td>
                  <td className="py-3 px-4 text-right font-mono text-slate-900">
                    ₹{it.unit_price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-500">
                    {it.discount_pct > 0 ? `${it.discount_pct}%` : '-'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                    ₹{it.line_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Calculation Totals Footer */}
        <div className="p-6 bg-slate-50/60 border-t border-slate-200 flex flex-col sm:flex-row justify-between gap-6 text-xs">
          <div className="max-w-md space-y-2">
            <div>
              <span className="font-bold text-slate-700">Payment Terms:</span>{' '}
              <span className="text-slate-600">{quotation.payment_terms || 'Standard Terms'}</span>
            </div>
            <div>
              <span className="font-bold text-slate-700">Delivery Terms:</span>{' '}
              <span className="text-slate-600">{quotation.delivery_terms || 'Ex-works'}</span>
            </div>
            <div>
              <span className="font-bold text-slate-700">Notes:</span>{' '}
              <span className="text-slate-600">{quotation.notes || 'None'}</span>
            </div>
          </div>

          <div className="w-full sm:w-72 space-y-2 border-t sm:border-t-0 sm:border-l border-slate-200 sm:pl-6 pt-3 sm:pt-0">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-mono">₹{quotation.subtotal.toFixed(2)}</span>
            </div>

            {quotation.discount_amount > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>Discount ({quotation.discount_percentage}%):</span>
                <span className="font-mono">- ₹{quotation.discount_amount.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between text-slate-600">
              <span>{quotation.tax_type === 'INTRA_STATE_GST' ? `GST (${quotation.tax_rate}%):` : `IGST (${quotation.tax_rate}%):`}</span>
              <span className="font-mono">₹{quotation.tax_amount.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-slate-600">
              <span>Freight / Delivery:</span>
              <span className="font-mono">₹{quotation.delivery_charge.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-sm font-extrabold text-brand-700 pt-2 border-t border-slate-200">
              <span>Grand Total (INR):</span>
              <span>₹{quotation.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Approval Modal */}
      {approveModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-2">Approve Quotation {quotation.quotation_number}</h3>
            <p className="text-xs text-slate-500 mb-4">
              Approving marks prices as verified and authorizes PDF sharing with the client.
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

      {/* Rejection Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-2">Reject Quotation</h3>
            <p className="text-xs text-slate-500 mb-4">
              Please provide the exact reason for rejection (e.g., negative margin, excessive discount, stock constraint).
            </p>
            <textarea
              rows={3}
              required
              value={rejectionComments}
              onChange={(e) => setRejectionComments(e.target.value)}
              placeholder="Reason for rejection (mandatory)..."
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
