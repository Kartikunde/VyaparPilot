import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client';
import { RetailerPortalData } from '../types';
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Building2,
  Phone,
  Mail,
  MapPin,
  FileText,
  Calendar,
  ShieldCheck,
  Check,
  X,
  FileCheck2
} from 'lucide-react';

export const RetailerPortalPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();

  const [data, setData] = useState<RetailerPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Live timer state
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);

  // Response action state
  const [actionType, setActionType] = useState<'ACCEPT' | 'REJECT' | null>(null);
  const [retailerName, setRetailerName] = useState('');
  const [responseNotes, setResponseNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadPortalData();
  }, [token]);

  // Server-authoritative live countdown ticker
  useEffect(() => {
    if (secondsRemaining === null || secondsRemaining <= 0) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          // Auto-refresh when time hits zero to get authoritative EXPIRED status
          loadPortalData();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsRemaining]);

  const normalizePortalData = (raw: any): RetailerPortalData => {
    if (raw?.quotation) {
      return {
        ...raw.quotation,
        business_name: raw.business?.name,
        business_address: raw.business?.address,
        business_phone: raw.business?.phone,
        business_email: raw.business?.email,
        business_gstin: raw.business?.gstin,
      };
    }
    return raw;
  };

  const loadPortalData = async () => {
    if (!token) {
      setError('Invalid or missing quotation portal link.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await api.quotations.getPublicPortal(token);
      const normalized = normalizePortalData(res);
      setData(normalized);
      if (typeof normalized.seconds_remaining === 'number') {
        setSecondsRemaining(Math.max(0, Math.floor(normalized.seconds_remaining)));
      } else {
        setSecondsRemaining(null);
      }
    } catch (err: any) {
      console.error('Failed to load quotation portal:', err);
      setError(err.message || 'Unable to load quotation. The link may be expired, invalid, or already resolved.');
    } finally {
      setLoading(false);
    }
  };

  const handleDecisionSubmit = async () => {
    if (!token || !actionType) return;
    try {
      setSubmitting(true);
      setActionFeedback(null);
      const res = await api.quotations.retailerRespondPublic(token, {
        action: actionType,
        notes: responseNotes.trim() || undefined,
        retailer_name: retailerName.trim() || undefined,
      });
      const normalized = normalizePortalData(res);
      setData(normalized);
      setActionFeedback({
        type: 'success',
        message: actionType === 'ACCEPT'
          ? 'Quotation proposal accepted successfully! The supplier has been notified.'
          : 'Quotation proposal rejected. Feedback has been recorded.',
      });
      setActionType(null);
      setSecondsRemaining(null);
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err.message || 'Failed to submit decision. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatCountdown = (totalSeconds: number | null): string => {
    if (totalSeconds === null) return '';
    if (totalSeconds <= 0) return '00h 00m 00s (Expired)';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
  };

  const isExpired = Boolean(
    data?.status === 'EXPIRED' ||
    data?.is_expired ||
    (data?.status === 'PENDING_RESPONSE' && secondsRemaining !== null && secondsRemaining <= 0)
  );

  const isPending = data?.status === 'PENDING_RESPONSE' && !isExpired;
  const isAccepted = data?.status === 'ACCEPTED';
  const isRejected = data?.status === 'REJECTED';

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-10 max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-base font-semibold text-slate-800">Loading verified quotation proposal...</p>
          <p className="text-xs text-slate-500">Verifying secure acceptance deadline and seller credentials.</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-rose-200 p-10 max-w-md w-full text-center space-y-4">
          <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Quotation Link Not Found</h2>
          <p className="text-sm text-slate-600 leading-relaxed">{error || 'This link may have been revoked or does not exist.'}</p>
          <div className="pt-3">
            <button
              onClick={() => window.location.reload()}
              className="h-11 px-6 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/90 text-slate-800 pb-20">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold text-base shadow-xs">
              VP
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>VyaparPilot Retailer Portal</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Verified
                </span>
              </div>
              <p className="text-xs text-slate-400">Secure 24-Hour Acceptance Window</p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs sm:text-sm font-mono font-bold text-slate-800 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
              {data.quotation_number}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 pt-8 space-y-8">
        {/* Status / Countdown Banner */}
        {isPending && (
          <div className="bg-gradient-to-r from-brand-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-7 sm:p-8 shadow-lg border border-brand-700/50 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-semibold">
                  <Clock className="w-4 h-4 text-amber-300" />
                  <span>24h Decision Window</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Quotation Review</h1>
                <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
                  Review and accept or reject this proposal before the 24-hour deadline expires.
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 sm:text-right border border-white/20 min-w-[220px]">
                <div className="text-xs uppercase font-bold text-amber-300 tracking-wider">Remaining Time</div>
                <div className="text-3xl font-mono font-extrabold text-white tracking-tight mt-1">
                  {formatCountdown(secondsRemaining)}
                </div>
                {data.expires_at && (
                  <div className="text-xs text-slate-300 mt-1">
                    Deadline: {new Date(data.expires_at).toLocaleString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {isExpired && (
          <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-6 sm:p-7 shadow-sm text-rose-900">
            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-rose-100 rounded-xl text-rose-700 mt-0.5">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-lg font-bold text-rose-950">This quotation has expired. You can no longer accept or reject it.</h2>
                <p className="text-sm text-rose-800 leading-relaxed">
                  The 24-hour response deadline passed on{' '}
                  <span className="font-semibold">
                    {data.expires_at
                      ? new Date(data.expires_at).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : 'the scheduled time'}
                  </span>
                  . Please contact the supplier to request a fresh quotation with updated pricing and availability.
                </p>
              </div>
            </div>
          </div>
        )}

        {isAccepted && (
          <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-6 sm:p-7 shadow-sm text-emerald-950">
            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-emerald-100 rounded-xl text-emerald-700 mt-0.5">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-lg font-bold text-emerald-950">Quotation Proposal Accepted</h2>
                <p className="text-sm text-emerald-800 leading-relaxed">
                  This quotation was accepted on{' '}
                  <span className="font-semibold">
                    {data.responded_at
                      ? new Date(data.responded_at).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : 'record'}
                  </span>
                  {data.response_notes ? ` with note: "${data.response_notes}"` : ''}.
                  The supplier has commenced order processing.
                </p>
              </div>
            </div>
          </div>
        )}

        {isRejected && (
          <div className="bg-slate-100 border-2 border-slate-300 rounded-2xl p-6 sm:p-7 shadow-sm text-slate-800">
            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-slate-200 rounded-xl text-slate-700 mt-0.5">
                <XCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-lg font-bold text-slate-900">Quotation Proposal Declined</h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  This quotation was declined on{' '}
                  <span className="font-semibold">
                    {data.responded_at
                      ? new Date(data.responded_at).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : 'record'}
                  </span>
                  {data.response_notes ? ` with reason: "${data.response_notes}"` : ''}.
                </p>
              </div>
            </div>
          </div>
        )}

        {actionFeedback && (
          <div className={`p-4 sm:p-5 rounded-2xl text-sm font-semibold flex items-center gap-3 ${
            actionFeedback.type === 'success' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'
          }`}>
            {actionFeedback.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertTriangle className="w-5 h-5 text-rose-600" />}
            <span>{actionFeedback.message}</span>
          </div>
        )}

        {/* Party Details Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-7 sm:p-8 grid sm:grid-cols-2 gap-8 text-sm">
          {/* Supplier Info */}
          <div className="space-y-2.5 border-b sm:border-b-0 sm:border-r border-slate-200/80 pb-6 sm:pb-0 sm:pr-8">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-brand-600" />
              <span>Issued By (Supplier)</span>
            </div>
            <div className="text-base font-bold text-slate-900">{data.business_name || 'Industrial Supplier'}</div>
            {data.business_address && (
              <div className="text-slate-600 flex items-start gap-2">
                <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <span>{data.business_address}</span>
              </div>
            )}
            {data.business_phone && (
              <div className="text-slate-600 flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{data.business_phone}</span>
              </div>
            )}
            {data.business_email && (
              <div className="text-slate-600 flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{data.business_email}</span>
              </div>
            )}
            {data.business_gstin && (
              <div className="text-brand-700 font-mono font-semibold pt-1 text-xs">
                GSTIN: {data.business_gstin}
              </div>
            )}
          </div>

          {/* Retailer / Buyer Info */}
          <div className="space-y-2.5">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <FileCheck2 className="w-4 h-4 text-emerald-600" />
              <span>Prepared For (Retailer / Client)</span>
            </div>
            <div className="text-base font-bold text-slate-900">{data.customer_company || data.customer_name || 'Retailer Partner'}</div>
            {data.customer_name && (
              <div className="text-slate-600">Attn: {data.customer_name}</div>
            )}
            {data.customer_phone && (
              <div className="text-slate-600 flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{data.customer_phone}</span>
              </div>
            )}
            {data.customer_email && (
              <div className="text-slate-600 flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{data.customer_email}</span>
              </div>
            )}
            {data.customer_gstin && (
              <div className="text-slate-700 font-mono font-semibold pt-1 text-xs">
                GSTIN: {data.customer_gstin}
              </div>
            )}
            {data.sent_at && (
              <div className="text-slate-400 text-xs pt-1 flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                <span>Sent on: {new Date(data.sent_at).toLocaleString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</span>
              </div>
            )}
          </div>
        </div>

        {/* Line Items Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Quotation Line Items ({data.items?.length || 0})
            </h3>
            <span className="text-xs sm:text-sm text-slate-500 font-medium font-mono">All amounts in INR (₹)</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold text-xs uppercase tracking-wider">
                  <th className="py-4 px-5 w-14 text-center">#</th>
                  <th className="py-4 px-5">Item Details</th>
                  <th className="py-4 px-5 text-center">Qty</th>
                  <th className="py-4 px-5 text-right">Unit Price (₹)</th>
                  <th className="py-4 px-5 text-center">Discount</th>
                  <th className="py-4 px-5 text-right">Line Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(!data.items || data.items.length === 0) ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No items specified in this quotation proposal.
                    </td>
                  </tr>
                ) : (
                  data.items.map((it, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-4 px-5 text-center font-mono text-slate-400 text-xs">
                        {idx + 1}
                      </td>
                      <td className="py-4 px-5">
                        <div className="font-bold text-slate-900">{it.name}</div>
                        {it.description && (
                          <div className="text-xs text-slate-500 mt-1 line-clamp-2">
                            {it.description}
                          </div>
                        )}
                        {it.sku && (
                          <div className="text-xs font-mono text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded font-semibold inline-block mt-1">
                            SKU: {it.sku}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-5 text-center font-semibold text-slate-800">
                        {it.quantity} {it.unit}
                      </td>
                      <td className="py-4 px-5 text-right font-mono text-slate-800">
                        ₹{Number(it.unit_price).toFixed(2)}
                      </td>
                      <td className="py-4 px-5 text-center text-slate-600">
                        {it.discount_pct > 0 ? `${it.discount_pct}%` : '—'}
                      </td>
                      <td className="py-4 px-5 text-right font-mono font-bold text-slate-900">
                        ₹{Number(it.line_total).toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Totals Breakdown */}
          <div className="p-6 sm:p-7 bg-slate-50/80 border-t border-slate-200 grid sm:grid-cols-2 gap-6 text-sm">
            <div className="space-y-2.5 text-slate-600">
              {data.payment_terms && (
                <div>
                  <span className="font-bold text-slate-800">Payment Terms:</span> {data.payment_terms}
                </div>
              )}
              {data.delivery_terms && (
                <div>
                  <span className="font-bold text-slate-800">Delivery Terms:</span> {data.delivery_terms}
                </div>
              )}
              {data.notes && (
                <div>
                  <span className="font-bold text-slate-800">Notes:</span> {data.notes}
                </div>
              )}
            </div>

            <div className="space-y-2 text-slate-600 sm:max-w-sm sm:ml-auto w-full">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-mono text-slate-800 font-semibold">₹{Number(data.subtotal).toFixed(2)}</span>
              </div>
              {data.discount_amount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Discount:</span>
                  <span className="font-mono">-₹{Number(data.discount_amount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Tax / GST ({data.tax_rate}%):</span>
                <span className="font-mono text-slate-800 font-semibold">₹{Number(data.tax_amount).toFixed(2)}</span>
              </div>
              {data.delivery_charge > 0 && (
                <div className="flex justify-between">
                  <span>Delivery Charges:</span>
                  <span className="font-mono text-slate-800 font-semibold">₹{Number(data.delivery_charge).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between pt-3 border-t border-slate-200 text-base font-extrabold text-slate-900">
                <span>Final Quotation Amount:</span>
                <span className="font-mono text-brand-600 text-xl">₹{Number(data.grand_total).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Panel for Retailer */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-7 sm:p-8 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Retailer Decision</h3>
              <p className="text-sm text-slate-500 mt-0.5">
                {isPending
                  ? 'Accept or reject this quotation proposal within the 24-hour window.'
                  : isExpired
                  ? 'The 24-hour response deadline has passed. Actions are disabled.'
                  : `Quotation has already been finalized (${data.status}).`}
              </p>
            </div>

            {isPending && !actionType && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActionType('REJECT')}
                  className="h-11 px-5 rounded-xl border border-rose-300 bg-white hover:bg-rose-50 text-rose-700 text-sm font-bold transition-all shadow-xs flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  <span>Reject Quotation</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActionType('ACCEPT')}
                  className="h-11 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-all shadow-sm flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Accept Quotation</span>
                </button>
              </div>
            )}

            {!isPending && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled
                  className="h-11 px-5 rounded-xl bg-slate-100 text-slate-400 text-sm font-semibold cursor-not-allowed border border-slate-200"
                >
                  Accept Quotation
                </button>
                <button
                  type="button"
                  disabled
                  className="h-11 px-5 rounded-xl bg-slate-100 text-slate-400 text-sm font-semibold cursor-not-allowed border border-slate-200"
                >
                  Reject Quotation
                </button>
              </div>
            )}
          </div>

          {/* Action Confirmation Form */}
          {actionType && isPending && (
            <div className={`mt-5 p-6 rounded-xl border space-y-4 ${
              actionType === 'ACCEPT' ? 'bg-emerald-50/70 border-emerald-200' : 'bg-rose-50/70 border-rose-200'
            }`}>
              <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
                {actionType === 'ACCEPT' ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>Confirm Acceptance of Quotation {data.quotation_number}</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-rose-600" />
                    <span>Confirm Rejection of Quotation {data.quotation_number}</span>
                  </>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                    Your Name / Representative (Optional)
                  </label>
                  <input
                    type="text"
                    value={retailerName}
                    onChange={(e) => setRetailerName(e.target.value)}
                    placeholder="e.g. Rahul Sharma (Store Manager)"
                    className="w-full h-11 text-sm px-4 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                    {actionType === 'ACCEPT' ? 'Delivery or Processing Notes (Optional)' : 'Reason for Rejection (Optional)'}
                  </label>
                  <input
                    type="text"
                    value={responseNotes}
                    onChange={(e) => setResponseNotes(e.target.value)}
                    placeholder={actionType === 'ACCEPT' ? 'e.g. Please expedite delivery to Pune warehouse' : 'e.g. Price higher than competitor, quantity change required'}
                    className="w-full h-11 text-sm px-4 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setActionType(null)}
                  disabled={submitting}
                  className="h-11 px-5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDecisionSubmit}
                  disabled={submitting}
                  className={`h-11 px-6 rounded-xl text-white text-sm font-bold shadow-xs flex items-center gap-2 ${
                    actionType === 'ACCEPT'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  } disabled:opacity-50`}
                >
                  {submitting && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                  <span>{actionType === 'ACCEPT' ? 'Submit Acceptance' : 'Submit Rejection'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
