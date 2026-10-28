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
  ShieldCheck,
  Copy,
  Check,
  ExternalLink
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

  // 24-Hour Acceptance Deadline & Retailer Sending State
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [deadlineHours, setDeadlineHours] = useState<number>(24);
  const [sendCustomNote, setSendCustomNote] = useState('');
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadQuotation();
  }, [id]);

  // Server-authoritative live countdown ticker
  useEffect(() => {
    if (secondsRemaining === null || secondsRemaining <= 0) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          // Auto-refresh when time hits zero to get authoritative EXPIRED status
          loadQuotation();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsRemaining]);

  const loadQuotation = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await api.quotations.get(Number(id));
      setQuotation(res);
      if (typeof res.seconds_remaining === 'number') {
        setSecondsRemaining(Math.max(0, Math.floor(res.seconds_remaining)));
      } else {
        setSecondsRemaining(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load quotation.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendToRetailer = async () => {
    if (!quotation) return;
    setActionLoading(true);
    try {
      await api.quotations.sendToRetailer(quotation.id, {
        deadline_hours: Number(deadlineHours) || 24,
        custom_note: sendCustomNote.trim() || undefined
      });
      setSendModalOpen(false);
      await loadQuotation();
    } catch (err: any) {
      alert(err.message || 'Failed to send quotation to retailer.');
    } finally {
      setActionLoading(false);
    }
  };

  const copyPortalLink = () => {
    if (!quotation?.public_token) return;
    const link = `${window.location.origin}/portal/${quotation.public_token}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const formatCountdown = (totalSeconds: number | null): string => {
    if (totalSeconds === null) return '';
    if (totalSeconds <= 0) return '00h 00m 00s (Expired)';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
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
      <div className="flex items-center justify-center min-h-[450px]">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !quotation) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center max-w-lg mx-auto shadow-xs">
        <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-900">Quotation Not Found</h3>
        <p className="text-sm text-slate-500 mt-1 mb-6">{error || 'This record does not exist or has been removed.'}</p>
        <NavLink to="/quotations" className="text-sm font-semibold text-brand-600 hover:underline">
          &larr; Back to Quotations Directory
        </NavLink>
      </div>
    );
  }

  const warnings: GuardrailWarning[] = quotation.guardrail_warnings_json
    ? JSON.parse(quotation.guardrail_warnings_json)
    : [];

  return (
    <div className="space-y-8">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <NavLink
            to="/quotations"
            className="w-11 h-11 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 inline-flex items-center justify-center transition-colors shadow-xs"
            title="Back to Quotations"
          >
            <ArrowLeft className="w-5 h-5" />
          </NavLink>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-mono text-xl sm:text-2xl font-extrabold text-slate-900">
                {quotation.quotation_number}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                quotation.status === 'APPROVED'
                  ? 'bg-emerald-100 text-emerald-800'
                  : quotation.status === 'ACCEPTED'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : quotation.status === 'PENDING_RESPONSE'
                  ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                  : quotation.status === 'EXPIRED'
                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                  : quotation.status === 'PENDING_APPROVAL'
                  ? 'bg-amber-100 text-amber-800'
                  : quotation.status === 'NEEDS_REVIEW'
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-slate-100 text-slate-700'
              }`}>
                {quotation.status === 'PENDING_RESPONSE' ? 'PENDING RESPONSE (SENT)' : quotation.status}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">{quotation.title || 'Quotation Details'}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
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
            className="h-11 inline-flex items-center gap-2 px-5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold shadow-sm transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{downloadingPdf ? 'Downloading...' : 'Download PDF'}</span>
          </button>

          {/* Workflow Buttons */}
          {(quotation.status === 'DRAFT' || quotation.status === 'NEEDS_REVIEW') && (
            <button
              onClick={handleSubmitForApproval}
              disabled={actionLoading}
              className="h-11 inline-flex items-center gap-2 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold shadow-sm transition-colors"
            >
              <Send className="w-4 h-4" />
              <span>Submit for Approval</span>
            </button>
          )}

          {quotation.status === 'PENDING_APPROVAL' && (
            <>
              <button
                onClick={() => setApproveModalOpen(true)}
                className="h-11 inline-flex items-center gap-2 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Approve</span>
              </button>
              <button
                onClick={() => setRejectModalOpen(true)}
                className="h-11 inline-flex items-center gap-2 px-5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold shadow-sm transition-colors"
              >
                <XCircle className="w-4 h-4" />
                <span>Reject</span>
              </button>
            </>
          )}

          {/* Send Proposal to Retailer Button */}
          {(quotation.status === 'APPROVED' || quotation.status === 'PENDING_RESPONSE' || quotation.status === 'DRAFT') && (
            <button
              onClick={() => setSendModalOpen(true)}
              className="h-11 inline-flex items-center gap-2 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm transition-colors"
            >
              <Send className="w-4 h-4" />
              <span>
                {quotation.status === 'PENDING_RESPONSE'
                  ? 'Extend Window'
                  : 'Send to Retailer'}
              </span>
            </button>
          )}

          {quotation.status === 'EXPIRED' && (
            <button
              onClick={() => setSendModalOpen(true)}
              className="h-11 inline-flex items-center gap-2 px-5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold shadow-sm transition-colors"
            >
              <Send className="w-4 h-4" />
              <span>Renew Proposal</span>
            </button>
          )}
        </div>
      </div>

      {/* 24-Hour Retailer Proposal Tracking Cards */}
      {quotation.status === 'PENDING_RESPONSE' && (
        <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-brand-950 text-white rounded-2xl p-7 sm:p-8 shadow-sm border border-indigo-700/50 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <span className="px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-bold flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-300" />
                  <span>24h Decision Window</span>
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white">Pending Retailer Response</h3>
              <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
                Awaiting retailer decision within the 24-hour response deadline.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 md:text-right min-w-[220px]">
              <div className="text-xs uppercase font-bold text-amber-300 tracking-wider">Remaining Time</div>
              <div className="text-3xl font-mono font-extrabold text-white tracking-tight mt-1">
                {formatCountdown(secondsRemaining)}
              </div>
              {quotation.expires_at && (
                <div className="text-xs text-slate-300 mt-1">
                  Expires: {new Date(quotation.expires_at).toLocaleString('en-IN', {
                    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Copyable Retailer Portal Link */}
          {quotation.public_token && (
            <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-sm">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-slate-300 text-xs font-semibold uppercase tracking-wider">Retailer Direct Link:</span>
                <code className="bg-black/40 px-3 py-1.5 rounded-lg text-xs sm:text-sm text-amber-200 font-mono select-all break-all border border-white/10">
                  {`${window.location.origin}/portal/${quotation.public_token}`}
                </code>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={copyPortalLink}
                  className="h-9 px-4 rounded-xl bg-white/20 hover:bg-white/30 text-white font-semibold flex items-center gap-2 text-xs transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Link Copied!' : 'Copy Link'}</span>
                </button>
                <a
                  href={`/portal/${quotation.public_token}`}
                  target="_blank"
                  rel="noreferrer"
                  className="h-9 px-4 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-semibold flex items-center gap-2 text-xs transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Open Portal</span>
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {quotation.status === 'ACCEPTED' && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-6 sm:p-7 shadow-xs flex items-start gap-4">
          <div className="p-2.5 bg-emerald-100 rounded-xl text-emerald-700 mt-0.5">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-emerald-950">Proposal Accepted by Retailer</h3>
            <p className="text-sm text-emerald-800 mt-1 leading-relaxed">
              Accepted within the 24-hour deadline on{' '}
              <span className="font-semibold">
                {quotation.responded_at ? new Date(quotation.responded_at).toLocaleString('en-IN') : 'record'}
              </span>
              {quotation.response_notes ? ` with notes: "${quotation.response_notes}"` : ''}.
            </p>
          </div>
        </div>
      )}

      {quotation.status === 'REJECTED' && (
        <div className="bg-slate-100 border border-slate-300 rounded-2xl p-6 sm:p-7 shadow-xs flex items-start gap-4">
          <div className="p-2.5 bg-slate-200 rounded-xl text-slate-700 mt-0.5">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Proposal Declined by Retailer</h3>
            <p className="text-sm text-slate-700 mt-1 leading-relaxed">
              Declined on{' '}
              <span className="font-semibold">
                {quotation.responded_at ? new Date(quotation.responded_at).toLocaleString('en-IN') : 'record'}
              </span>
              {quotation.response_notes ? ` with reason: "${quotation.response_notes}"` : ''}.
            </p>
          </div>
        </div>
      )}

      {quotation.status === 'EXPIRED' && (
        <div className="bg-rose-50 border border-rose-300 rounded-2xl p-6 sm:p-7 shadow-xs flex items-start gap-4">
          <div className="p-2.5 bg-rose-100 rounded-xl text-rose-700 mt-0.5">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-rose-950">Proposal Expired</h3>
              <p className="text-sm text-rose-800 mt-1 leading-relaxed">
                The 24-hour response deadline expired on{' '}
                <span className="font-semibold">
                  {quotation.expires_at ? new Date(quotation.expires_at).toLocaleString('en-IN') : 'deadline'}
                </span>
                . The retailer portal has locked decision buttons.
              </p>
            </div>
            <button
              onClick={() => setSendModalOpen(true)}
              className="h-10 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold self-start sm:self-auto shrink-0 shadow-xs"
            >
              Renew Proposal (New 24h Window)
            </button>
          </div>
        </div>
      )}

      {/* Pricing Guardrail Warnings Banner if any */}
      {warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 sm:p-6 shadow-xs">
          <div className="flex items-center gap-2.5 text-sm font-bold text-amber-900 mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <span>Pricing Guardrails Triggered ({warnings.length})</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            {warnings.map((w, idx) => (
              <div key={idx} className="p-3.5 rounded-xl bg-white border border-amber-200/80 text-xs sm:text-sm text-amber-950">
                <span className="font-bold text-amber-800">{w.code}:</span> {w.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Customer & Quote Metadata Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-7 sm:p-8 grid sm:grid-cols-3 gap-8 text-sm">
        <div className="space-y-1.5">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Customer Information
          </div>
          <div className="font-bold text-slate-900 text-base">{quotation.customer_company}</div>
          <div className="text-slate-600">Attn: {quotation.customer_name}</div>
          <div className="text-slate-500">Phone: {quotation.customer_phone || 'N/A'}</div>
          <div className="text-slate-500">Email: {quotation.customer_email || 'N/A'}</div>
          {quotation.customer_gstin && (
            <div className="text-brand-700 font-mono pt-1 font-semibold text-xs">GSTIN: {quotation.customer_gstin}</div>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Dates & Validity
          </div>
          <div><span className="text-slate-400">Created:</span> {new Date(quotation.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
          <div><span className="text-slate-400">Valid Until:</span> {quotation.valid_until ? new Date(quotation.valid_until).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '30 Days'}</div>
          {quotation.approved_at && (
            <div className="text-emerald-700 font-semibold pt-1">
              Approved on: {new Date(quotation.approved_at).toLocaleDateString('en-IN')}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Tax & Compliance
          </div>
          <div><span className="text-slate-400">Tax Type:</span> {quotation.tax_type.replace(/_/g, ' ')}</div>
          <div><span className="text-slate-400">Standard Rate:</span> {quotation.tax_rate}%</div>
          <div className="pt-1">
            <span className="text-slate-400">Gross Margin:</span>{' '}
            <span className={`font-bold ${quotation.estimated_gross_margin_pct < 15 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {quotation.estimated_gross_margin_pct.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Itemized Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 sm:p-6 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
            Quotation Items ({quotation.items.length})
          </h3>
          <span className="text-xs sm:text-sm text-slate-500 font-mono">Currency: INR (₹)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-bold text-xs uppercase tracking-wider bg-slate-50/50">
                <th className="py-4 px-5 w-14">#</th>
                <th className="py-4 px-5">SKU & Product Name</th>
                <th className="py-4 px-5 text-right">Quantity</th>
                <th className="py-4 px-5">Unit</th>
                <th className="py-4 px-5 text-right">Unit Price (₹)</th>
                <th className="py-4 px-5 text-right">Discount</th>
                <th className="py-4 px-5 text-right">Line Total (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {quotation.items.map((it, idx) => (
                <tr key={it.id || idx} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-4 px-5 text-slate-400">{idx + 1}</td>
                  <td className="py-4 px-5">
                    <div className="font-semibold text-slate-900">{it.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {it.sku && <span className="font-mono text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded font-semibold mr-2">[{it.sku}]</span>}
                      {it.description}
                    </div>
                  </td>
                  <td className="py-4 px-5 text-right font-bold text-slate-900">{it.quantity}</td>
                  <td className="py-4 px-5 text-slate-600">{it.unit}</td>
                  <td className="py-4 px-5 text-right font-mono text-slate-900">
                    ₹{it.unit_price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-4 px-5 text-right text-slate-500">
                    {it.discount_pct > 0 ? `${it.discount_pct}%` : '-'}
                  </td>
                  <td className="py-4 px-5 text-right font-mono font-bold text-slate-900">
                    ₹{it.line_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Calculation Totals Footer */}
        <div className="p-7 sm:p-8 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row justify-between gap-8 text-sm">
          <div className="max-w-md space-y-2.5">
            <div>
              <span className="font-bold text-slate-800">Payment Terms:</span>{' '}
              <span className="text-slate-600">{quotation.payment_terms || 'Standard Terms'}</span>
            </div>
            <div>
              <span className="font-bold text-slate-800">Delivery Terms:</span>{' '}
              <span className="text-slate-600">{quotation.delivery_terms || 'Ex-works'}</span>
            </div>
            <div>
              <span className="font-bold text-slate-800">Notes:</span>{' '}
              <span className="text-slate-600">{quotation.notes || 'None'}</span>
            </div>
          </div>

          <div className="w-full sm:w-80 space-y-2.5 border-t sm:border-t-0 sm:border-l border-slate-200 sm:pl-8 pt-4 sm:pt-0">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-mono font-semibold">₹{quotation.subtotal.toFixed(2)}</span>
            </div>

            {quotation.discount_amount > 0 && (
              <div className="flex justify-between text-rose-600 font-semibold">
                <span>Discount ({quotation.discount_percentage}%):</span>
                <span className="font-mono">- ₹{quotation.discount_amount.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between text-slate-600">
              <span>{quotation.tax_type === 'INTRA_STATE_GST' ? `GST (${quotation.tax_rate}%):` : `IGST (${quotation.tax_rate}%):`}</span>
              <span className="font-mono font-semibold">₹{quotation.tax_amount.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-slate-600">
              <span>Freight / Delivery:</span>
              <span className="font-mono font-semibold">₹{quotation.delivery_charge.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-base font-extrabold text-brand-700 pt-3 border-t border-slate-200">
              <span>Grand Total (INR):</span>
              <span className="text-xl">₹{quotation.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Approval Modal */}
      {approveModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg p-7 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Approve Quotation {quotation.quotation_number}</h3>
            <p className="text-sm text-slate-500">
              Approving marks prices as verified and authorizes PDF sharing with the client.
            </p>
            <textarea
              rows={3}
              value={approvalComments}
              onChange={(e) => setApprovalComments(e.target.value)}
              placeholder="Approval comments or signature note..."
              className="w-full text-sm p-4 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setApproveModalOpen(false)}
                className="h-11 px-5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="h-11 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm"
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
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg p-7 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Reject Quotation</h3>
            <p className="text-sm text-slate-500">
              Please provide the exact reason for rejection (e.g., negative margin, excessive discount, stock constraint).
            </p>
            <textarea
              rows={3}
              required
              value={rejectionComments}
              onChange={(e) => setRejectionComments(e.target.value)}
              placeholder="Reason for rejection (mandatory)..."
              className="w-full text-sm p-4 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setRejectModalOpen(false)}
                className="h-11 px-5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading || !rejectionComments.trim()}
                className="h-11 px-6 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold disabled:opacity-50 shadow-sm"
              >
                {actionLoading ? 'Rejecting...' : 'Reject Quotation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Proposal to Retailer Modal */}
      {sendModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg p-7 sm:p-8 space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
                <Send className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Send Proposal to Retailer</h3>
                <p className="text-xs sm:text-sm text-slate-500">Initiate authoritative 24-hour acceptance countdown</p>
              </div>
            </div>

            <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-xl text-sm text-indigo-950 space-y-1.5">
              <div className="font-bold flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span>24-Hour Acceptance Window Policy</span>
              </div>
              <p className="text-xs sm:text-sm text-indigo-800 leading-relaxed">
                A secure public portal link will be generated for {quotation.customer_company || quotation.customer_name}. The retailer must accept or reject within this deadline. If expired, acceptance is blocked.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs sm:text-sm font-semibold text-slate-700">
                Acceptance Deadline Window (Hours)
              </label>
              <div className="grid grid-cols-4 gap-2.5 mb-2">
                {[24, 48, 72, 0.1].map((hrs) => (
                  <button
                    key={hrs}
                    type="button"
                    onClick={() => setDeadlineHours(hrs)}
                    className={`h-10 text-xs sm:text-sm font-semibold rounded-xl border transition-all ${
                      deadlineHours === hrs
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {hrs === 0.1 ? '6m (Test)' : `${hrs}h`}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min="0.01"
                step="0.5"
                value={deadlineHours}
                onChange={(e) => setDeadlineHours(parseFloat(e.target.value) || 24)}
                className="w-full h-11 text-sm px-4 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                placeholder="Custom hours (e.g. 24)"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs sm:text-sm font-semibold text-slate-700">
                Custom Message / Instructions (Optional)
              </label>
              <textarea
                rows={3}
                value={sendCustomNote}
                onChange={(e) => setSendCustomNote(e.target.value)}
                placeholder="e.g. Special festive pricing applied, valid for next 24 hours only."
                className="w-full text-sm p-3.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSendModalOpen(false)}
                className="h-11 px-5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendToRetailer}
                disabled={actionLoading}
                className="h-11 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-xs flex items-center gap-2 disabled:opacity-50 transition-colors"
              >
                {actionLoading && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                <span>Start 24h Window & Send</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
