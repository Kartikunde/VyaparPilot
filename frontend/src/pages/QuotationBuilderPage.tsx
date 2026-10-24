import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { Product, Customer, QuotationItem, QuotationCalculationResponse } from '../types';
import {
  FileText,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  Save,
  Package,
  Layers,
  Sparkles
} from 'lucide-react';

export const QuotationBuilderPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const stateData = location.state as any;

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [catalogueProducts, setCatalogueProducts] = useState<Product[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number>(0);
  const [title, setTitle] = useState('');
  const [enquiryId, setEnquiryId] = useState<number | undefined>(undefined);

  // Financial fields
  const [items, setItems] = useState<QuotationItem[]>([]);
  const [overallDiscountPct, setOverallDiscountPct] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(18);
  const [taxType, setTaxType] = useState<string>('INTRA_STATE_GST');
  const [deliveryCharge, setDeliveryCharge] = useState<number>(0);
  const [paymentTerms, setPaymentTerms] = useState<string>('50% advance with PO, balance against proforma invoice before dispatch.');
  const [deliveryTerms, setDeliveryTerms] = useState<string>('Ex-works warehouse, freight extra at actuals.');
  const [notes, setNotes] = useState<string>('Standard 12 months manufacturer warranty applicable.');

  const [calcResponse, setCalcResponse] = useState<QuotationCalculationResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPrerequisites();
  }, []);

  const loadPrerequisites = async () => {
    try {
      const [custList, prodList] = await Promise.all([
        api.customers.list(),
        api.products.list({ page_size: 100 }),
      ]);
      setCustomers(custList);
      setCatalogueProducts(prodList.items);

      // Pre-fill from navigation state if coming from AI Enquiry Studio
      if (stateData) {
        if (stateData.title) setTitle(stateData.title);
        if (stateData.enquiry_id) setEnquiryId(stateData.enquiry_id);

        // Try to match customer
        if (stateData.company_name) {
          const matchedCust = custList.find(c =>
            c.company_name.toLowerCase().includes(stateData.company_name.toLowerCase()) ||
            (stateData.customer_name && c.name.toLowerCase().includes(stateData.customer_name.toLowerCase()))
          );
          if (matchedCust) {
            setSelectedCustomerId(matchedCust.id);
          } else if (custList.length > 0) {
            setSelectedCustomerId(custList[0].id);
          }
        } else if (custList.length > 0) {
          setSelectedCustomerId(custList[0].id);
        }

        if (stateData.items && stateData.items.length > 0) {
          setItems(stateData.items);
        }
      } else if (custList.length > 0 && !selectedCustomerId) {
        setSelectedCustomerId(custList[0].id);
      }
    } catch (err) {
      console.error('Failed to load prerequisites:', err);
    }
  };

  // Recalculate preview whenever items or terms change
  useEffect(() => {
    if (items.length > 0) {
      runCalculationPreview();
    }
  }, [items, overallDiscountPct, taxRate, taxType, deliveryCharge]);

  const runCalculationPreview = async () => {
    try {
      const res = await api.quotations.calculate({
        items: items.map(it => ({
          product_id: it.product_id,
          sku: it.sku,
          name: it.name,
          description: it.description,
          quantity: it.quantity,
          unit: it.unit,
          unit_price: it.unit_price,
          unit_cost: it.unit_cost,
          discount_pct: it.discount_pct,
          verification_status: it.verification_status,
          match_confidence: it.match_confidence
        })),
        discount_percentage: overallDiscountPct,
        tax_rate: taxRate,
        tax_type: taxType,
        delivery_charge: deliveryCharge
      });
      setCalcResponse(res);
    } catch (err) {
      console.error('Calc error:', err);
    }
  };

  const handleAddItemFromCatalogue = (productId: number) => {
    const prod = catalogueProducts.find(p => p.id === productId);
    if (!prod) return;

    const newItem: QuotationItem = {
      product_id: prod.id,
      sku: prod.sku,
      name: prod.name,
      description: prod.description || '',
      quantity: 1,
      unit: prod.unit,
      unit_price: prod.unit_selling_price,
      unit_cost: prod.unit_cost,
      discount_pct: 0,
      line_total: prod.unit_selling_price,
      verification_status: 'VERIFIED_EXACT',
      match_confidence: 1.0,
      stock_available: prod.stock_quantity
    };
    setItems([...items, newItem]);
  };

  const handleAddCustomItem = () => {
    const newItem: QuotationItem = {
      name: '',
      description: '',
      quantity: 1,
      unit: 'PCS',
      unit_price: 0,
      unit_cost: 0,
      discount_pct: 0,
      line_total: 0,
      verification_status: 'MANUAL',
      match_confidence: 1.0
    };
    setItems([...items, newItem]);
  };

  const handleUpdateItem = (index: number, field: keyof QuotationItem, value: any) => {
    const updated = [...items];
    const it = { ...updated[index], [field]: value };

    // Recalculate line total
    const gross = (Number(it.quantity) || 0) * (Number(it.unit_price) || 0);
    const disc = gross * ((Number(it.discount_pct) || 0) / 100);
    it.line_total = gross - disc;

    updated[index] = it;
    setItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
  };

  const handleSaveQuotation = async (submitForApproval: boolean = false) => {
    if (!selectedCustomerId) {
      setError('Please select a customer for this quotation.');
      return;
    }
    if (items.length === 0) {
      setError('Please add at least one line item.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await api.quotations.create({
        customer_id: selectedCustomerId,
        enquiry_id: enquiryId,
        title: title || 'Industrial Quotation',
        items: items.map(it => ({
          product_id: it.product_id,
          sku: it.sku,
          name: it.name,
          description: it.description,
          quantity: Number(it.quantity),
          unit: it.unit,
          unit_price: Number(it.unit_price),
          unit_cost: Number(it.unit_cost),
          discount_pct: Number(it.discount_pct),
          verification_status: it.verification_status,
          match_confidence: it.match_confidence
        })),
        discount_percentage: overallDiscountPct,
        tax_rate: taxRate,
        tax_type: taxType,
        delivery_charge: deliveryCharge,
        payment_terms: paymentTerms,
        delivery_terms: deliveryTerms,
        notes: notes
      });

      if (submitForApproval) {
        await api.quotations.submitApproval(res.id);
      }

      navigate(`/quotations/${res.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to save quotation.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Quotation Builder & Pricing Engine</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Deterministic Decimal calculations, pricing guardrails, and instant tax bifurcation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleSaveQuotation(false)}
            disabled={saving || items.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Draft</span>
          </button>

          <button
            type="button"
            onClick={() => handleSaveQuotation(true)}
            disabled={saving || items.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-sm disabled:opacity-50"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Submit for Approval</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
          {error}
        </div>
      )}

      {/* Main Builder Grid */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left Form: Items & Details (8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          {/* Header Card: Customer & Details */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Select Customer</label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(Number(e.target.value))}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value={0}>Choose Customer...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company_name} — {c.name} ({c.city || 'Pune'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Quotation Title / Subject</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Induction Motors & Cylinders Supply"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Line Items Table Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Itemized Line Items ({items.length})
              </h3>

              <div className="flex items-center gap-2">
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddItemFromCatalogue(Number(e.target.value));
                      e.target.value = '';
                    }
                  }}
                  defaultValue=""
                  className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-700"
                >
                  <option value="" disabled>+ Add from Catalogue...</option>
                  {catalogueProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.sku}] {p.name} (₹{p.unit_selling_price})
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleAddCustomItem}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold"
                >
                  + Custom Row
                </button>
              </div>
            </div>

            {items.length === 0 ? (
              <div className="py-10 text-center border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                No items added yet. Click "+ Add from Catalogue" or "+ Custom Row" above.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-semibold text-[11px] bg-slate-50/60">
                      <th className="py-2.5 px-3">Item Description</th>
                      <th className="py-2.5 px-2 w-20">Qty</th>
                      <th className="py-2.5 px-2 w-20">Unit</th>
                      <th className="py-2.5 px-2 w-24">Price (₹)</th>
                      <th className="py-2.5 px-2 w-16">Disc %</th>
                      <th className="py-2.5 px-3 text-right w-24">Total (₹)</th>
                      <th className="py-2.5 px-2 text-center w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((it, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            value={it.name}
                            onChange={(e) => handleUpdateItem(idx, 'name', e.target.value)}
                            placeholder="Item name"
                            className="w-full text-xs font-semibold px-2 py-1 border border-slate-200 rounded focus:border-brand-500"
                          />
                          <input
                            type="text"
                            value={it.description || ''}
                            onChange={(e) => handleUpdateItem(idx, 'description', e.target.value)}
                            placeholder="Specs / notes"
                            className="w-full text-[11px] text-slate-500 px-2 py-0.5 border border-slate-100 rounded mt-1"
                          />
                        </td>
                        <td className="py-2.5 px-2">
                          <input
                            type="number"
                            min="0.1"
                            step="any"
                            value={it.quantity}
                            onChange={(e) => handleUpdateItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                            className="w-full text-xs px-2 py-1 border border-slate-200 rounded"
                          />
                        </td>
                        <td className="py-2.5 px-2">
                          <input
                            type="text"
                            value={it.unit}
                            onChange={(e) => handleUpdateItem(idx, 'unit', e.target.value.toUpperCase())}
                            className="w-full text-xs px-2 py-1 border border-slate-200 rounded"
                          />
                        </td>
                        <td className="py-2.5 px-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={it.unit_price}
                            onChange={(e) => handleUpdateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                            className="w-full text-xs px-2 py-1 border border-slate-200 rounded text-right font-mono"
                          />
                        </td>
                        <td className="py-2.5 px-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={it.discount_pct}
                            onChange={(e) => handleUpdateItem(idx, 'discount_pct', parseFloat(e.target.value) || 0)}
                            className="w-full text-xs px-2 py-1 border border-slate-200 rounded text-right"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          ₹{it.line_total.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-slate-400 hover:text-rose-600 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Terms & Conditions */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 grid sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Payment Terms</label>
              <textarea
                rows={2}
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Delivery Terms</label>
              <textarea
                rows={2}
                value={deliveryTerms}
                onChange={(e) => setDeliveryTerms(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Right Form: Calculations & Pricing Guardrails (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Pricing Guardrail Warnings Box */}
          {calcResponse?.warnings && calcResponse.warnings.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Pricing Guardrails Triggered ({calcResponse.warnings.length})</span>
              </div>
              <div className="space-y-1.5">
                {calcResponse.warnings.map((w, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-lg text-[11px] leading-snug border ${
                      w.severity === 'CRITICAL'
                        ? 'bg-rose-100/70 border-rose-300 text-rose-900'
                        : 'bg-amber-100/70 border-amber-300 text-amber-900'
                    }`}
                  >
                    <div className="font-bold flex items-center justify-between mb-0.5">
                      <span>{w.item_name || 'Quotation'}</span>
                      <span className="text-[9px] uppercase tracking-wider font-mono">{w.severity}</span>
                    </div>
                    {w.message}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Financial Calculation Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 pb-2 border-b border-slate-100">
              Deterministic Financial Breakdown
            </h3>

            {/* Inputs: Discount & Taxes */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 mb-1">Overall Quotation Discount (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={overallDiscountPct}
                  onChange={(e) => setOverallDiscountPct(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono text-right"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1">Tax Classification (GST)</label>
                <select
                  value={taxType}
                  onChange={(e) => setTaxType(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="INTRA_STATE_GST">Intra-State GST (9% CGST + 9% SGST)</option>
                  <option value="INTER_STATE_IGST">Inter-State GST (18% IGST)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 mb-1">Freight / Delivery Charges (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={deliveryCharge}
                  onChange={(e) => setDeliveryCharge(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono text-right"
                />
              </div>
            </div>

            {/* Financial Summary Breakdown */}
            <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-mono">₹{calcResponse ? calcResponse.subtotal.toFixed(2) : '0.00'}</span>
              </div>

              {overallDiscountPct > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Discount ({overallDiscountPct}%):</span>
                  <span className="font-mono">- ₹{calcResponse ? calcResponse.discount_amount.toFixed(2) : '0.00'}</span>
                </div>
              )}

              {taxType === 'INTRA_STATE_GST' ? (
                <>
                  <div className="flex justify-between text-slate-600">
                    <span>CGST (9%):</span>
                    <span className="font-mono">₹{calcResponse ? calcResponse.cgst_amount.toFixed(2) : '0.00'}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>SGST (9%):</span>
                    <span className="font-mono">₹{calcResponse ? calcResponse.sgst_amount.toFixed(2) : '0.00'}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-slate-600">
                  <span>IGST (18%):</span>
                  <span className="font-mono">₹{calcResponse ? calcResponse.igst_amount.toFixed(2) : '0.00'}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-600">
                <span>Freight / Delivery:</span>
                <span className="font-mono">₹{calcResponse ? calcResponse.delivery_charge.toFixed(2) : '0.00'}</span>
              </div>

              <div className="flex justify-between text-sm font-extrabold text-brand-700 pt-2 border-t border-slate-200">
                <span>Grand Total (INR):</span>
                <span>₹{calcResponse ? calcResponse.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}</span>
              </div>

              {/* Internal Gross Margin Badge */}
              <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-slate-500 font-semibold">Total Product Cost:</span>
                  <span className="font-mono font-bold">₹{calcResponse ? calcResponse.total_cost.toFixed(2) : '0.00'}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-semibold">Estimated Gross Margin:</span>
                  <span className={`font-mono font-extrabold ${calcResponse && calcResponse.estimated_gross_margin_pct < 15 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {calcResponse ? calcResponse.estimated_gross_margin_pct.toFixed(1) : 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
