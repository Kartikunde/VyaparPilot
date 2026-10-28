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
  Sparkles,
  UserPlus,
  X
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

  // Quick Customer Modal
  const [showQuickCustomerModal, setShowQuickCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustCompany, setNewCustCompany] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');

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
          } else {
            // Auto-create customer extracted by AI from enquiry!
            try {
              const autoCust = await api.customers.create({
                name: stateData.customer_name || 'Procurement In-charge',
                company_name: stateData.company_name,
                phone: stateData.contact_phone || '+91 98220 12345',
                email: stateData.contact_email || 'procurement@client.com',
                city: stateData.delivery_location || 'Pune',
                state: 'Maharashtra',
                billing_address: stateData.delivery_location || 'Industrial Area',
                shipping_address: stateData.delivery_location || 'Industrial Area'
              });
              setCustomers(prev => [...prev, autoCust]);
              setSelectedCustomerId(autoCust.id);
            } catch (createErr) {
              console.error('Failed to auto-create customer from enquiry:', createErr);
              if (custList.length > 0) setSelectedCustomerId(custList[0].id);
            }
          }
        } else if (custList.length > 0) {
          setSelectedCustomerId(custList[0].id);
        }

        // Set line items from AI enquiry match
        if (stateData.items && Array.isArray(stateData.items)) {
          const normalizedItems = stateData.items.map((it: any) => {
            const qty = Number(it.quantity) || 1;
            const price = Number(it.unit_price) || 0;
            const disc = Number(it.discount_pct) || 0;
            const gross = qty * price;
            const calcTotal = gross - (gross * (disc / 100));
            return {
              ...it,
              quantity: qty,
              unit_price: price,
              discount_pct: disc,
              line_total: typeof it.line_total === 'number' && !isNaN(it.line_total) ? it.line_total : calcTotal,
              verification_status: it.verification_status || 'VERIFIED_EXACT',
              match_confidence: it.match_confidence || 1.0
            };
          });
          setItems(normalizedItems);
        }
      } else if (custList.length > 0) {
        setSelectedCustomerId(custList[0].id);
      }
    } catch (err) {
      console.error('Failed to load builder prerequisites:', err);
    }
  };

  // Recalculate financial breakdown whenever inputs or items change
  useEffect(() => {
    if (items.length > 0) {
      runRealtimeCalculation();
    } else {
      setCalcResponse(null);
    }
  }, [items, overallDiscountPct, taxRate, taxType, deliveryCharge]);

  const runRealtimeCalculation = async () => {
    try {
      const calcReq = {
        items: items.map(it => ({
          product_id: it.product_id,
          name: it.name,
          description: it.description,
          quantity: it.quantity,
          unit: it.unit,
          unit_price: it.unit_price,
          unit_cost: it.unit_cost,
          discount_pct: it.discount_pct,
          line_total: it.line_total
        })),
        overall_discount_pct: overallDiscountPct,
        tax_rate: taxRate,
        tax_type: taxType,
        delivery_charge: deliveryCharge
      };
      const res = await api.quotations.calculate(calcReq);
      setCalcResponse(res);
    } catch (calcErr) {
      console.error('Real-time calculation failed:', calcErr);
    }
  };

  const handleAddItemFromCatalogue = (productId: number) => {
    const prod = catalogueProducts.find(p => p.id === productId);
    if (!prod) return;

    const newItem: QuotationItem = {
      product_id: prod.id,
      sku: prod.sku,
      name: prod.name,
      description: prod.description,
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

  const handleQuickAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName || !newCustCompany || !newCustPhone) return;
    try {
      const created = await api.customers.create({
        name: newCustName,
        company_name: newCustCompany,
        phone: newCustPhone,
        email: newCustEmail || undefined,
        city: 'Pune',
        state: 'Maharashtra',
      });
      setCustomers(prev => [...prev, created]);
      setSelectedCustomerId(created.id);
      setShowQuickCustomerModal(false);
      setNewCustName('');
      setNewCustCompany('');
      setNewCustPhone('');
      setNewCustEmail('');
    } catch (err: any) {
      alert(err.message || 'Failed to create customer');
    }
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
        title: title || 'Quotation',
        enquiry_id: enquiryId,
        payment_terms: paymentTerms,
        delivery_terms: deliveryTerms,
        notes: notes,
        overall_discount_pct: overallDiscountPct,
        tax_type: taxType,
        tax_rate: taxRate,
        delivery_charge: deliveryCharge,
        items: items.map(it => ({
          product_id: it.product_id,
          name: it.name,
          description: it.description,
          quantity: it.quantity,
          unit: it.unit,
          unit_price: it.unit_price,
          unit_cost: it.unit_cost,
          discount_pct: it.discount_pct,
          line_total: it.line_total,
          verification_status: it.verification_status,
          match_confidence: it.match_confidence
        }))
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
    <div className="space-y-8">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Quotation Builder</h2>
          <p className="text-sm text-slate-500 mt-1">
            Create quotations with automated pricing guardrails and tax calculations.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => handleSaveQuotation(false)}
            disabled={saving || items.length === 0}
            className="h-11 inline-flex items-center gap-2 px-5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold shadow-xs disabled:opacity-50 transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Save Draft</span>
          </button>

          <button
            type="button"
            onClick={() => handleSaveQuotation(true)}
            disabled={saving || items.length === 0}
            className="h-11 inline-flex items-center gap-2 px-5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold shadow-sm disabled:opacity-50 transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Submit for Approval</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          {error}
        </div>
      )}

      {/* Main Builder Grid */}
      <div className="grid lg:grid-cols-12 gap-8">
        {/* Left Form: Items & Details (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Header Card: Customer & Details */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-7 grid sm:grid-cols-2 gap-5">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-semibold text-slate-700">Select Customer</label>
                <button
                  type="button"
                  onClick={() => setShowQuickCustomerModal(true)}
                  className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                >
                  <UserPlus className="w-3.5 h-3.5" /> + New Customer
                </button>
              </div>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(Number(e.target.value))}
                className="w-full h-11 text-sm px-4 border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
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
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Quotation Title / Subject</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Induction Motors & Cylinders Supply"
                className="w-full h-11 text-sm px-4 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
              />
            </div>
          </div>

          {/* Line Items Table Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-7 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                Itemized Line Items ({items.length})
              </h3>

              <div className="flex items-center gap-2.5">
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddItemFromCatalogue(Number(e.target.value));
                      e.target.value = '';
                    }
                  }}
                  defaultValue=""
                  className="h-10 text-xs sm:text-sm px-3.5 border border-slate-300 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
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
                  className="h-10 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold transition-colors"
                >
                  + Custom Row
                </button>
              </div>
            </div>

            {items.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-slate-200 rounded-xl text-slate-400 text-sm">
                No items added yet. Click "+ Add from Catalogue" or "+ Custom Row" above.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-bold text-xs uppercase tracking-wider bg-slate-50/80">
                      <th className="py-3.5 px-4">Item Description</th>
                      <th className="py-3.5 px-2 w-24">Qty</th>
                      <th className="py-3.5 px-2 w-24">Unit</th>
                      <th className="py-3.5 px-2 w-28">Price (₹)</th>
                      <th className="py-3.5 px-2 w-20">Disc %</th>
                      <th className="py-3.5 px-4 text-right w-28">Total (₹)</th>
                      <th className="py-3.5 px-2 text-center w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((it, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <input
                            type="text"
                            value={it.name}
                            onChange={(e) => handleUpdateItem(idx, 'name', e.target.value)}
                            placeholder="Item name"
                            className="w-full h-10 text-sm font-semibold px-3 border border-slate-200 rounded-lg focus:border-brand-500 focus:outline-none"
                          />
                          <input
                            type="text"
                            value={it.description || ''}
                            onChange={(e) => handleUpdateItem(idx, 'description', e.target.value)}
                            placeholder="Specs / notes"
                            className="w-full h-8 text-xs text-slate-500 px-3 border border-slate-100 rounded-lg mt-1.5 focus:border-brand-500 focus:outline-none"
                          />
                        </td>
                        <td className="py-3.5 px-2">
                          <input
                            type="number"
                            min="0.1"
                            step="any"
                            value={it.quantity}
                            onChange={(e) => handleUpdateItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                            className="w-full h-10 text-sm px-3 border border-slate-200 rounded-lg focus:border-brand-500 focus:outline-none"
                          />
                        </td>
                        <td className="py-3.5 px-2">
                          <input
                            type="text"
                            value={it.unit}
                            onChange={(e) => handleUpdateItem(idx, 'unit', e.target.value.toUpperCase())}
                            className="w-full h-10 text-sm px-3 border border-slate-200 rounded-lg focus:border-brand-500 focus:outline-none"
                          />
                        </td>
                        <td className="py-3.5 px-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={it.unit_price}
                            onChange={(e) => handleUpdateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                            className="w-full h-10 text-sm px-3 border border-slate-200 rounded-lg text-right font-mono focus:border-brand-500 focus:outline-none"
                          />
                        </td>
                        <td className="py-3.5 px-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={it.discount_pct}
                            onChange={(e) => handleUpdateItem(idx, 'discount_pct', parseFloat(e.target.value) || 0)}
                            className="w-full h-10 text-sm px-3 border border-slate-200 rounded-lg text-right focus:border-brand-500 focus:outline-none"
                          />
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                          ₹{(typeof it.line_total === 'number' ? it.line_total : ((Number(it.quantity) || 0) * (Number(it.unit_price) || 0) * (1 - (Number(it.discount_pct) || 0) / 100))).toFixed(2)}
                        </td>
                        <td className="py-3.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="w-8 h-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 inline-flex items-center justify-center transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
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
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-7 grid sm:grid-cols-2 gap-5 text-sm">
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">Payment Terms</label>
              <textarea
                rows={3}
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="w-full p-3.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">Delivery Terms</label>
              <textarea
                rows={3}
                value={deliveryTerms}
                onChange={(e) => setDeliveryTerms(e.target.value)}
                className="w-full p-3.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>
          </div>
        </div>

        {/* Right Form: Calculations & Pricing Guardrails (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Pricing Guardrail Warnings Box */}
          {calcResponse?.warnings && calcResponse.warnings.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Pricing Guardrails Triggered ({calcResponse.warnings.length})</span>
              </div>
              <div className="space-y-2">
                {calcResponse.warnings.map((w, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl text-xs sm:text-sm leading-snug border ${
                      w.severity === 'CRITICAL'
                        ? 'bg-rose-100/70 border-rose-300 text-rose-900'
                        : 'bg-amber-100/70 border-amber-300 text-amber-900'
                    }`}
                  >
                    <div className="font-bold flex items-center justify-between mb-1">
                      <span>{w.item_name || 'Quotation'}</span>
                      <span className="text-xs uppercase tracking-wider font-mono">{w.severity}</span>
                    </div>
                    {w.message}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Financial Calculation Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-7 space-y-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 pb-3 border-b border-slate-100">
              Financial Summary
            </h3>

            {/* Inputs: Discount & Taxes */}
            <div className="space-y-4 text-sm">
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Overall Quotation Discount (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={overallDiscountPct}
                  onChange={(e) => setOverallDiscountPct(parseFloat(e.target.value) || 0)}
                  className="w-full h-11 px-4 border border-slate-300 rounded-xl font-mono text-right focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Tax Classification (GST)</label>
                <select
                  value={taxType}
                  onChange={(e) => setTaxType(e.target.value)}
                  className="w-full h-11 px-4 border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                >
                  <option value="INTRA_STATE_GST">Intra-State GST (9% CGST + 9% SGST)</option>
                  <option value="INTER_STATE_IGST">Inter-State GST (18% IGST)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Freight / Delivery Charges (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={deliveryCharge}
                  onChange={(e) => setDeliveryCharge(parseFloat(e.target.value) || 0)}
                  className="w-full h-11 px-4 border border-slate-300 rounded-xl font-mono text-right focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>
            </div>

            {/* Financial Summary Breakdown */}
            <div className="pt-4 border-t border-slate-100 space-y-2.5 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-mono font-semibold">₹{calcResponse ? calcResponse.subtotal.toFixed(2) : '0.00'}</span>
              </div>

              {overallDiscountPct > 0 && (
                <div className="flex justify-between text-rose-600 font-semibold">
                  <span>Discount ({overallDiscountPct}%):</span>
                  <span className="font-mono">- ₹{calcResponse ? calcResponse.discount_amount.toFixed(2) : '0.00'}</span>
                </div>
              )}

              {taxType === 'INTRA_STATE_GST' ? (
                <>
                  <div className="flex justify-between text-slate-600">
                    <span>CGST (9%):</span>
                    <span className="font-mono font-semibold">₹{calcResponse ? calcResponse.cgst_amount.toFixed(2) : '0.00'}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>SGST (9%):</span>
                    <span className="font-mono font-semibold">₹{calcResponse ? calcResponse.sgst_amount.toFixed(2) : '0.00'}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-slate-600">
                  <span>IGST (18%):</span>
                  <span className="font-mono font-semibold">₹{calcResponse ? calcResponse.igst_amount.toFixed(2) : '0.00'}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-600">
                <span>Freight / Delivery:</span>
                <span className="font-mono font-semibold">₹{calcResponse ? calcResponse.delivery_charge.toFixed(2) : '0.00'}</span>
              </div>

              <div className="flex justify-between text-base font-extrabold text-brand-700 pt-3 border-t border-slate-200">
                <span>Grand Total (INR):</span>
                <span className="text-xl">₹{calcResponse ? calcResponse.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}</span>
              </div>

              {/* Internal Gross Margin Badge */}
              <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-slate-500 font-semibold">Total Product Cost:</span>
                  <span className="font-mono font-bold">₹{calcResponse ? calcResponse.total_cost.toFixed(2) : '0.00'}</span>
                </div>
                <div className="flex items-center justify-between text-xs sm:text-sm">
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

      {/* Quick Add Customer Modal */}
      {showQuickCustomerModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-xl border border-slate-200 overflow-hidden space-y-4">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-brand-600" />
                <span>Quick Add Customer</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowQuickCustomerModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickAddCustomer} className="p-6 sm:p-7 space-y-4 text-sm">
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Company / Organization Name *</label>
                <input
                  type="text"
                  required
                  value={newCustCompany}
                  onChange={(e) => setNewCustCompany(e.target.value)}
                  placeholder="e.g. Precision Engineering Works"
                  className="w-full h-11 text-sm px-4 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Contact Person Name *</label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="e.g. Rajesh Sharma"
                  className="w-full h-11 text-sm px-4 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    placeholder="e.g. 9822012345"
                    className="w-full h-11 text-sm px-4 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Email Address</label>
                  <input
                    type="email"
                    value={newCustEmail}
                    onChange={(e) => setNewCustEmail(e.target.value)}
                    placeholder="e.g. rajesh@precision.com"
                    className="w-full h-11 text-sm px-4 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowQuickCustomerModal(false)}
                  className="h-11 px-5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-11 px-6 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold shadow-xs transition-colors"
                >
                  Create & Select Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
