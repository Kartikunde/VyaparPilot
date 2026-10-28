import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Product } from '../types';
import {
  Package,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  AlertTriangle,
  Edit2,
  Trash2,
  CheckCircle2,
  X
} from 'lucide-react';

export const ProductCataloguePage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [loading, setLoading] = useState(false);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    description: '',
    category: 'Motors & Pumps',
    unit: 'PCS',
    hsn_code: '',
    unit_selling_price: 0,
    unit_cost: 0,
    stock_quantity: 0,
    reorder_threshold: 5,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // CSV Import state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importStatus, setImportStatus] = useState<any | null>(null);
  const [importLoading, setImportLoading] = useState(false);

  const categories = [
    'Motors & Pumps',
    'Pneumatics',
    'Electrical Switchgear',
    'Cables & Wiring',
    'Packaging Materials',
    'Fasteners & Hardware',
    'Bearings & Transmission',
    'Pipes & Valves'
  ];

  useEffect(() => {
    loadProducts();
  }, [page, search, category, lowStockOnly]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const res = await api.products.list({
        page,
        page_size: 15,
        search: search || undefined,
        category: category || undefined,
        low_stock_only: lowStockOnly
      });
      setProducts(res.items);
      setTotal(res.total);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingProduct(null);
    setFormData({
      sku: `SKU-${Math.floor(100 + Math.random() * 900)}`,
      name: '',
      description: '',
      category: 'Motors & Pumps',
      unit: 'PCS',
      hsn_code: '85015210',
      unit_selling_price: 1000,
      unit_cost: 750,
      stock_quantity: 20,
      reorder_threshold: 5,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleOpenEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormData({
      sku: p.sku,
      name: p.name,
      description: p.description || '',
      category: p.category,
      unit: p.unit,
      hsn_code: p.hsn_code || '',
      unit_selling_price: p.unit_selling_price,
      unit_cost: p.unit_cost,
      stock_quantity: p.stock_quantity,
      reorder_threshold: p.reorder_threshold,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);
    try {
      if (editingProduct) {
        await api.products.update(editingProduct.id, formData);
      } else {
        await api.products.create(formData);
      }
      setModalOpen(false);
      loadProducts();
    } catch (err: any) {
      setFormError(err.message || 'Operation failed.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this catalogue item?')) return;
    try {
      await api.products.delete(id);
      loadProducts();
    } catch (err: any) {
      alert(err.message || 'Failed to delete product.');
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvFile) return;
    setImportLoading(true);
    try {
      const res = await api.products.importCsv(csvFile);
      setImportStatus(res);
      loadProducts();
    } catch (err: any) {
      setImportStatus({ error: err.message || 'CSV Import failed.' });
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <div className="space-y-7">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Product Catalogue</h2>
          <p className="text-sm text-slate-500 mt-1">
            Master catalogue items, pricing, costs, and inventory thresholds.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <a
            href={api.products.exportCsvUrl()}
            target="_blank"
            rel="noreferrer"
            className="h-11 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold shadow-xs transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </a>

          <button
            onClick={() => { setImportModalOpen(true); setImportStatus(null); setCsvFile(null); }}
            className="h-11 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold shadow-xs transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="h-11 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by SKU, product name..."
            className="w-full h-11 text-sm pl-10 pr-4 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
          />
        </div>

        <div className="flex items-center gap-4 w-full sm:w-auto">
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
            className="h-11 text-sm px-4 border border-slate-300 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <label className="flex items-center gap-2 text-sm text-slate-700 font-medium cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => { setLowStockOnly(e.target.checked); setPage(1); }}
              className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300"
            />
            <span>Low Stock Alert</span>
          </label>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold text-xs uppercase tracking-wider">
                <th className="py-4 px-5">SKU</th>
                <th className="py-4 px-5">Product Name & Category</th>
                <th className="py-4 px-5 text-right">Selling Price (₹)</th>
                <th className="py-4 px-5 text-right">Cost Price (₹)</th>
                <th className="py-4 px-5 text-center">Margin %</th>
                <th className="py-4 px-5 text-center">Stock</th>
                <th className="py-4 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400 text-sm">
                    No products found matching the criteria.
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const marginPct = p.unit_selling_price > 0
                    ? ((p.unit_selling_price - p.unit_cost) / p.unit_selling_price) * 100
                    : 0;
                  const isLowStock = p.stock_quantity <= p.reorder_threshold;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-5 font-mono font-bold text-brand-700">
                        {p.sku}
                      </td>
                      <td className="py-4 px-5">
                        <div className="font-semibold text-slate-900">{p.name}</div>
                        <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{p.category}</span>
                          <span>•</span>
                          <span>Unit: {p.unit}</span>
                          {p.hsn_code && (
                            <>
                              <span>•</span>
                              <span>HSN: {p.hsn_code}</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-5 text-right font-bold text-slate-900">
                        ₹{p.unit_selling_price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 px-5 text-right text-slate-500">
                        ₹{p.unit_cost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 px-5 text-center">
                        <span
                          className={`font-semibold ${
                            marginPct < 15 ? 'text-rose-600 font-bold' : 'text-emerald-700'
                          }`}
                        >
                          {marginPct.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-4 px-5 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                            isLowStock
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {isLowStock && <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
                          {p.stock_quantity} {p.unit}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEditModal(p)}
                            className="w-9 h-9 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-brand-600 inline-flex items-center justify-center transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="w-9 h-9 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 inline-flex items-center justify-center transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between text-sm text-slate-600">
          <div>
            Showing <span className="font-semibold text-slate-800">{products.length}</span> of <span className="font-semibold text-slate-800">{total}</span> items
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
              disabled={products.length < 15}
              className="h-9 px-4 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-xl p-7 sm:p-8 overflow-y-auto max-h-[90vh] space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                {editingProduct ? 'Edit Catalogue Item' : 'Add New Catalogue Product'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
                {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">SKU / Item Code</label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full h-11 px-4 border border-slate-300 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full h-11 px-4 border border-slate-300 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Product Title</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Three-Phase Induction Motor 5HP 1440 RPM"
                  className="w-full h-11 px-4 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Specifications / Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Technical details, mounting, efficiency rating..."
                  className="w-full p-3.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Unit of Measure</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value.toUpperCase() })}
                    placeholder="PCS, METERS, BOXES..."
                    className="w-full h-11 px-4 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">HSN Code (GST)</label>
                  <input
                    type="text"
                    value={formData.hsn_code}
                    onChange={(e) => setFormData({ ...formData, hsn_code: e.target.value })}
                    placeholder="85015210"
                    className="w-full h-11 px-4 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Unit Selling Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.unit_selling_price}
                    onChange={(e) => setFormData({ ...formData, unit_selling_price: parseFloat(e.target.value) || 0 })}
                    className="w-full h-11 px-4 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Unit Cost Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.unit_cost}
                    onChange={(e) => setFormData({ ...formData, unit_cost: parseFloat(e.target.value) || 0 })}
                    className="w-full h-11 px-4 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Stock Quantity</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) || 0 })}
                    className="w-full h-11 px-4 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Reorder Threshold</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.reorder_threshold}
                    onChange={(e) => setFormData({ ...formData, reorder_threshold: parseInt(e.target.value) || 0 })}
                    className="w-full h-11 px-4 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="h-11 px-5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="h-11 px-6 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold shadow-sm"
                >
                  {formSubmitting ? 'Saving...' : editingProduct ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg p-7 sm:p-8 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Bulk Import Products via CSV</h3>
              <button onClick={() => setImportModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleImportSubmit} className="space-y-4 text-sm">
              <p className="text-slate-500 text-xs leading-relaxed">
                Upload a CSV file containing columns: <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-700 font-semibold">sku, name, category, unit, unit_selling_price, unit_cost, stock_quantity</code>.
              </p>

              <input
                type="file"
                accept=".csv"
                onChange={(e) => setCsvFile(e.target.files ? e.target.files[0] : null)}
                className="w-full text-sm p-3 border border-dashed border-slate-300 rounded-xl cursor-pointer bg-slate-50"
              />

              {importStatus && (
                <div className={`p-4 rounded-xl text-sm ${importStatus.error ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'}`}>
                  {importStatus.error ? (
                    <div>{importStatus.error}</div>
                  ) : (
                    <div>
                      Successfully imported: {importStatus.created_count} created, {importStatus.updated_count} updated.
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setImportModalOpen(false)}
                  className="h-11 px-5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={!csvFile || importLoading}
                  className="h-11 px-6 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold shadow-sm disabled:opacity-50"
                >
                  {importLoading ? 'Importing...' : 'Upload & Process'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
