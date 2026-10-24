import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { EnquiryMatchingResponse, MatchedEnquiryItem } from '../types';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Package,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Clock,
  Layers,
  FileCheck
} from 'lucide-react';

const SAMPLE_ENQUIRIES = [
  {
    name: 'Sample 1: Chakan Motors & Pneumatics (Standard)',
    title: 'Urgent RFQ for Assembly Line Motors & Valves',
    text: `Dear Apex Industrial Team,
We urgently require the following items for our Chakan assembly unit commissioning next week:
1. 3-Phase Induction Motor 5HP 1440 RPM - 4 Nos
2. Heavy Duty Pneumatic Cylinder 50mm bore - 8 Nos
3. 5/2 Way Solenoid Valve 24V DC - 10 Nos
Please quote your best rate with GST and delivery lead time to Chakan MIDC.
Regards,
Rajesh Sharma
Kalyani Precision Engineering Works, Pune`
  },
  {
    name: 'Sample 2: WhatsApp Cables & Switchgear (Fast)',
    title: 'WhatsApp RFQ: Wiring & Contactors',
    text: `Hi Vikram, Need urgent rate for Baramati plant:
100 meters 4-Core 4.0 sq.mm Copper Armoured Power Cable
5 nos 3-Pole Power Contactor 32A 230V Coil
Delivery required within 3 days. Send quote with GST. Thanks, Anand Joshi, Sahyadri Agro`
  },
  {
    name: 'Sample 3: Stock Warning & Low Margin Trigger',
    title: 'Bulk Order - VFD Drives & Motors',
    text: `Hello Apex Sales,
Please send official proforma quotation for:
1. Variable Frequency Drive (VFD) 7.5kW 10HP - 10 PCS (Urgent requirement)
2. Three-Phase Induction Motor 10HP 1440 RPM - 4 PCS
Please give 25% special distributor discount if possible. Delivery to Faridabad factory.
Mohit Agarwal, Vardhman Auto Components`
  }
];

export const EnquiriesPage: React.FC = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState(SAMPLE_ENQUIRIES[0].title);
  const [rawText, setRawText] = useState(SAMPLE_ENQUIRIES[0].text);
  const [forceDemo, setForceDemo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EnquiryMatchingResponse | null>(null);

  const handleProcessEnquiry = async () => {
    if (!rawText.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.enquiries.process({
        raw_text: rawText,
        title: title || 'Customer Enquiry',
        force_demo_mode: forceDemo
      });
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Failed to process enquiry.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSample = (sample: typeof SAMPLE_ENQUIRIES[0]) => {
    setTitle(sample.title);
    setRawText(sample.text);
    setResult(null);
  };

  const handleCandidateChange = (itemIdx: number, candidateProductId: number) => {
    if (!result) return;
    const updatedItems = [...result.matched_items];
    const item = updatedItems[itemIdx];
    const chosen = item.candidates.find(c => c.product_id === candidateProductId);

    if (chosen) {
      item.matched_product_id = chosen.product_id;
      item.sku = chosen.sku;
      item.name = chosen.name;
      item.unit_selling_price = chosen.unit_selling_price;
      item.unit_cost = chosen.unit_cost;
      item.stock_available = chosen.stock_quantity;
      item.line_total = item.quantity * chosen.unit_selling_price;
      item.match_type = 'VERIFIED_EXACT';
      item.match_confidence = 1.0;
      item.has_stock_warning = item.quantity > chosen.stock_quantity;
      item.warning_details = item.has_stock_warning
        ? `Requested ${item.quantity} ${item.unit}, but only ${chosen.stock_quantity} available in stock.`
        : undefined;

      const newSubtotal = updatedItems.reduce((acc, it) => acc + it.line_total, 0);
      setResult({
        ...result,
        matched_items: updatedItems,
        total_estimated_subtotal: newSubtotal
      });
    }
  };

  const handleConvertToQuotation = () => {
    if (!result) return;
    // Pass extracted & matched items state to quotation builder
    navigate('/quotations/new', {
      state: {
        enquiry_id: result.enquiry_id,
        title: title,
        customer_name: result.extracted_structure.customer_name,
        company_name: result.extracted_structure.company_name,
        contact_phone: result.extracted_structure.contact_phone,
        contact_email: result.extracted_structure.contact_email,
        delivery_location: result.extracted_structure.delivery_location,
        items: result.matched_items.map(m => ({
          product_id: m.matched_product_id,
          sku: m.sku || '',
          name: m.name || m.original_item.product_query,
          description: m.description || m.original_item.specifications || '',
          quantity: m.quantity,
          unit: m.unit,
          unit_price: m.unit_selling_price,
          unit_cost: m.unit_cost,
          discount_pct: 0,
          verification_status: m.match_type,
          match_confidence: m.match_confidence
        }))
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">AI Customer Enquiry Studio</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Ingest raw customer messages, extract structured items, verify catalogue prices, and flag inventory constraints.
        </p>
      </div>

      {/* Main Studio Grid */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left Column: Input Form (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            {/* Quick Sample Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                Quick Test Samples (Click to Load)
              </label>
              <div className="space-y-1.5">
                {SAMPLE_ENQUIRIES.map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectSample(sample)}
                    className="w-full text-left text-xs p-2 rounded-lg border border-slate-200 hover:border-brand-500 hover:bg-brand-50/50 transition-colors text-slate-700 font-medium truncate"
                  >
                    {sample.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Enquiry Title / Reference</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. RFQ: Commissioning Supplies"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Raw Text Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Paste Customer Message (Email / WhatsApp / RFQ)
              </label>
              <textarea
                rows={9}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste the message from the customer here..."
                className="w-full text-xs p-3 font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 leading-relaxed"
              ></textarea>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={forceDemo}
                  onChange={(e) => setForceDemo(e.target.checked)}
                  className="rounded text-brand-600 focus:ring-brand-500"
                />
                <span>Force Local Demo NLP</span>
              </label>

              <button
                type="button"
                onClick={handleProcessEnquiry}
                disabled={loading || !rawText.trim()}
                className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Extracting & Verifying...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" /> Run AI Verification
                  </>
                )}
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: AI Extraction & Verified Matching Preview (7 cols) */}
        <div className="lg:col-span-7">
          {result ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-5">
              {/* Top Banner with Execution Timing */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-xs font-bold text-slate-900">Extracted & Verified Results</span>
                  <span className="text-[10px] font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                    {result.ai_mode_used}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-teal-700 font-semibold bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
                  <Clock className="w-3.5 h-3.5 text-teal-600" />
                  <span>AI Latency: {result.processing_time_seconds}s</span>
                </div>
              </div>

              {/* Extracted Metadata Card */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 grid sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 font-medium">Customer:</span>{' '}
                  <span className="font-semibold text-slate-800">
                    {result.extracted_structure.customer_name || 'Not detected'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Company:</span>{' '}
                  <span className="font-semibold text-slate-800">
                    {result.extracted_structure.company_name || 'Not detected'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Phone / Email:</span>{' '}
                  <span className="font-semibold text-slate-800">
                    {result.extracted_structure.contact_phone || result.extracted_structure.contact_email || 'Missing'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Delivery Destination:</span>{' '}
                  <span className="font-semibold text-slate-800">
                    {result.extracted_structure.delivery_location || 'MIDC Pune'}
                  </span>
                </div>
              </div>

              {/* Missing Information Alerts */}
              {result.extracted_structure.missing_information?.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                  <div className="font-bold flex items-center gap-1 mb-1 text-amber-900">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Missing Customer / RFQ Data Detected:</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
                    {result.extracted_structure.missing_information.map((m, idx) => (
                      <li key={idx}>{m}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Product Matching Table */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Matched Catalogue Items ({result.matched_items.length})</span>
                  <span className="text-brand-600 font-mono font-bold">
                    Est. Subtotal: ₹{result.total_estimated_subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </h4>

                <div className="space-y-3">
                  {result.matched_items.map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border text-xs transition-all ${
                        item.has_stock_warning
                          ? 'border-amber-300 bg-amber-50/40'
                          : item.match_type === 'VERIFIED_EXACT'
                          ? 'border-emerald-200 bg-emerald-50/20'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900">
                            {item.quantity} {item.unit}
                          </span>
                          <span className="text-slate-400">×</span>
                          <span className="font-bold text-slate-900">
                            {item.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.match_type === 'VERIFIED_EXACT' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Exact Verified ({(item.match_confidence * 100).toFixed(0)}%)
                            </span>
                          ) : item.match_type === 'SUGGESTED_MATCH' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800">
                              Suggested ({(item.match_confidence * 100).toFixed(0)}%)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                              Unmatched
                            </span>
                          )}
                          <span className="font-mono font-bold text-slate-900">
                            ₹{item.line_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-500 mb-2">
                        <span className="font-semibold text-slate-600">Customer requested:</span> "{item.original_item.product_query}"
                        {item.sku && <span className="ml-2 font-mono text-brand-700 bg-brand-50 px-1 py-0.2 rounded font-semibold">[{item.sku}]</span>}
                      </div>

                      {/* Warnings pill */}
                      {item.has_stock_warning && (
                        <div className="mt-1 text-[11px] font-semibold text-amber-800 bg-amber-100/70 px-2 py-1 rounded flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                          <span>{item.warning_details}</span>
                        </div>
                      )}

                      {/* Candidate selector */}
                      {item.candidates && item.candidates.length > 1 && (
                        <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center gap-2">
                          <span className="text-[10px] font-semibold text-slate-500">Switch SKU:</span>
                          <select
                            value={item.matched_product_id || ''}
                            onChange={(e) => handleCandidateChange(idx, Number(e.target.value))}
                            className="text-[11px] py-1 px-2 border border-slate-300 rounded bg-white text-slate-700"
                          >
                            {item.candidates.map((c) => (
                              <option key={c.product_id} value={c.product_id}>
                                {c.sku} — {c.name} (₹{c.unit_selling_price}, Stock: {c.stock_quantity})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 1-Click Convert to Quotation Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleConvertToQuotation}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 hover:shadow-lg"
                >
                  <FileCheck className="w-4 h-4 text-emerald-400" />
                  <span>Convert to Verified Quotation in Builder</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center flex flex-col items-center justify-center min-h-[350px]">
              <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mb-3">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No Enquiry Extracted Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
                Select one of the sample presets on the left or paste a customer email/WhatsApp to run verified AI matching.
              </p>
              <button
                type="button"
                onClick={handleProcessEnquiry}
                className="bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-semibold px-4 py-2 rounded-lg transition-colors border border-brand-200"
              >
                Run Sample 1 Now
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
