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
          name: m.name,
          description: `Customer requested: "${m.original_item.product_query}"`,
          quantity: m.quantity,
          unit: m.unit,
          unit_price: m.unit_selling_price,
          unit_cost: m.unit_cost,
          discount_pct: 0,
          line_total: m.line_total || (m.quantity * m.unit_selling_price),
          verification_status: m.match_type,
          match_confidence: m.match_confidence,
          stock_available: m.stock_available
        }))
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">AI Enquiry Studio</h2>
        <p className="text-sm text-slate-500 mt-1">
          Extract structured items from customer RFQs and match with catalogue pricing.
        </p>
      </div>

      {/* Main Studio Grid */}
      <div className="grid lg:grid-cols-12 gap-8">
        {/* Left Column: Input Form (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-7 space-y-5">
            {/* Quick Sample Selector */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-brand-600" />
                <span>Test Samples</span>
              </label>
              <div className="space-y-2">
                {SAMPLE_ENQUIRIES.map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectSample(sample)}
                    className="w-full text-left text-xs sm:text-sm p-3 rounded-xl border border-slate-200 hover:border-brand-500 hover:bg-brand-50/50 transition-colors text-slate-700 font-medium truncate"
                  >
                    {sample.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Title / Reference</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Assembly Line Supplies"
                className="w-full h-11 text-sm px-4 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
              />
            </div>

            {/* Raw Text Input */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Customer Message
              </label>
              <textarea
                rows={9}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste email, WhatsApp RFQ, or message..."
                className="w-full text-sm p-4 font-mono border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 leading-relaxed bg-white"
              ></textarea>
            </div>

            {/* Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <label className="flex items-center gap-2.5 cursor-pointer text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={forceDemo}
                  onChange={(e) => setForceDemo(e.target.checked)}
                  className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300"
                />
                <span>Local NLP Engine</span>
              </label>

              <button
                type="button"
                onClick={handleProcessEnquiry}
                disabled={loading || !rawText.trim()}
                className="h-11 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-6 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Process Enquiry</span>
                  </>
                )}
              </button>
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: AI Extraction & Verified Matching Preview (7 cols) */}
        <div className="lg:col-span-7">
          {result ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-7 space-y-6">
              {/* Top Banner with Execution Timing */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                  <span className="text-sm font-bold text-slate-900">Extracted Items</span>
                  <span className="text-xs font-mono bg-slate-100 px-2.5 py-1 rounded-md text-slate-600 font-semibold">
                    {result.ai_mode_used}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm text-teal-700 font-semibold bg-teal-50 px-3 py-1.5 rounded-full border border-teal-200">
                  <Clock className="w-4 h-4 text-teal-600" />
                  <span>AI Latency: {result.processing_time_seconds}s</span>
                </div>
              </div>

              {/* Extracted Metadata Card */}
              <div className="p-4 sm:p-5 rounded-xl bg-slate-50 border border-slate-200/80 grid sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-400 font-medium">Customer:</span>{' '}
                  <span className="font-semibold text-slate-900">
                    {result.extracted_structure.customer_name || 'Not detected'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Company:</span>{' '}
                  <span className="font-semibold text-slate-900">
                    {result.extracted_structure.company_name || 'Not detected'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Phone / Email:</span>{' '}
                  <span className="font-semibold text-slate-900">
                    {result.extracted_structure.contact_phone || result.extracted_structure.contact_email || 'Missing'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Delivery Destination:</span>{' '}
                  <span className="font-semibold text-slate-900">
                    {result.extracted_structure.delivery_location || 'MIDC Pune'}
                  </span>
                </div>
              </div>

              {/* Missing Information Alerts */}
              {result.extracted_structure.missing_information?.length > 0 && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-900 space-y-1.5">
                  <div className="font-bold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Missing Customer / RFQ Data Detected:</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-amber-800">
                    {result.extracted_structure.missing_information.map((m, idx) => (
                      <li key={idx}>{m}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Product Matching Table */}
              <div className="space-y-3.5">
                <h4 className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                  <span>Matched Catalogue Items ({result.matched_items.length})</span>
                  <span className="text-brand-600 font-mono font-bold text-sm sm:text-base">
                    Est. Subtotal: ₹{result.total_estimated_subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </h4>

                <div className="space-y-3.5">
                  {result.matched_items.map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-4 sm:p-5 rounded-xl border text-sm transition-all space-y-2.5 ${
                        item.has_stock_warning
                          ? 'border-amber-300 bg-amber-50/40'
                          : item.match_type === 'VERIFIED_EXACT'
                          ? 'border-emerald-200 bg-emerald-50/20'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono font-bold text-slate-900">
                            {item.quantity} {item.unit}
                          </span>
                          <span className="text-slate-400">×</span>
                          <span className="font-bold text-slate-900">
                            {item.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          {item.match_type === 'VERIFIED_EXACT' ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Exact Verified ({(item.match_confidence * 100).toFixed(0)}%)
                            </span>
                          ) : item.match_type === 'SUGGESTED_MATCH' ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800">
                              Suggested ({(item.match_confidence * 100).toFixed(0)}%)
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                              Unmatched
                            </span>
                          )}
                          <span className="font-mono font-bold text-slate-900">
                            ₹{item.line_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      <div className="text-xs sm:text-sm text-slate-500">
                        <span className="font-semibold text-slate-700">Customer requested:</span> "{item.original_item.product_query}"
                        {item.sku && <span className="ml-2 font-mono text-brand-700 bg-brand-50 px-2 py-0.5 rounded font-semibold text-xs">[{item.sku}]</span>}
                      </div>

                      {/* Warnings pill */}
                      {item.has_stock_warning && (
                        <div className="text-xs sm:text-sm font-semibold text-amber-800 bg-amber-100/70 p-2.5 rounded-lg flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>{item.warning_details}</span>
                        </div>
                      )}

                      {/* Candidate selector */}
                      {item.candidates && item.candidates.length > 1 && (
                        <div className="pt-2.5 border-t border-slate-200/60 flex items-center gap-2.5 flex-wrap">
                          <span className="text-xs font-semibold text-slate-500">Switch SKU:</span>
                          <select
                            value={item.matched_product_id || ''}
                            onChange={(e) => handleCandidateChange(idx, Number(e.target.value))}
                            className="h-9 text-xs py-1 px-3 border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
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
              <div className="pt-3">
                <button
                  type="button"
                  onClick={handleConvertToQuotation}
                  className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold px-6 rounded-xl shadow-md transition-all flex items-center justify-center gap-2.5 hover:shadow-lg active:scale-[0.99]"
                >
                  <FileCheck className="w-5 h-5 text-emerald-400" />
                  <span>Open in Quotation Builder</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
              <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mb-4">
                <Sparkles className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800">No Enquiry Extracted Yet</h3>
              <p className="text-sm text-slate-500 max-w-sm mt-1.5 mb-6 leading-relaxed">
                Select one of the sample presets on the left or paste a customer email/WhatsApp to run verified AI matching.
              </p>
              <button
                type="button"
                onClick={handleProcessEnquiry}
                className="h-11 bg-brand-50 hover:bg-brand-100 text-brand-700 text-sm font-semibold px-5 rounded-xl transition-colors border border-brand-200"
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
