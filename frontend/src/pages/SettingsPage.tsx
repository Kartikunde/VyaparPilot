import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Business, BusinessSettings } from '../types';
import { Building2, ShieldCheck, DollarSign, Clock, Save, CheckCircle2 } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [profile, setProfile] = useState<Business | null>(null);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const [profRes, setRes] = await Promise.all([
        api.business.getProfile(),
        api.business.getSettings(),
      ]);
      setProfile(profRes);
      setSettings(setRes);
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setSuccessMsg(null);
    try {
      await api.business.updateProfile({
        name: profile.name,
        tagline: profile.tagline,
        phone: profile.phone,
        address: profile.address,
        city: profile.city,
        state: profile.state,
        pincode: profile.pincode,
        gstin: profile.gstin,
        pan: profile.pan,
        bank_name: profile.bank_name,
        bank_account_no: profile.bank_account_no,
        bank_ifsc: profile.bank_ifsc,
      });
      setSuccessMsg('Business profile updated successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setSuccessMsg(null);
    try {
      await api.business.updateSettings({
        labour_cost_per_hour: settings.labour_cost_per_hour,
        default_manual_prep_time_minutes: settings.default_manual_prep_time_minutes,
        min_margin_threshold_pct: settings.min_margin_threshold_pct,
        max_discount_threshold_pct: settings.max_discount_threshold_pct,
        default_tax_rate: settings.default_tax_rate,
        default_payment_terms: settings.default_payment_terms,
        default_delivery_terms: settings.default_delivery_terms,
      });
      setSuccessMsg('Pricing guardrails & ROI parameters updated successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to update settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Business Settings & Guardrails</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure company profile for official PDF quotations, pricing guardrails, and hourly labour cost for ROI calculation.
        </p>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Profile Card */}
        {profile && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-4 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-brand-600" />
              <span>Company Information & PDF Branding</span>
            </h3>

            <form onSubmit={handleSaveProfile} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Business Name</label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tagline / Business Nature</label>
                <input
                  type="text"
                  value={profile.tagline || ''}
                  onChange={(e) => setProfile({ ...profile, tagline: e.target.value })}
                  placeholder="e.g. Precision Engineering & Industrial Wholesaler"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="text"
                    value={profile.email}
                    disabled
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Address</label>
                <input
                  type="text"
                  value={profile.address}
                  onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={profile.city}
                    onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">State</label>
                  <input
                    type="text"
                    value={profile.state}
                    onChange={(e) => setProfile({ ...profile, state: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Pincode</label>
                  <input
                    type="text"
                    value={profile.pincode}
                    onChange={(e) => setProfile({ ...profile, pincode: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">GSTIN</label>
                  <input
                    type="text"
                    value={profile.gstin || ''}
                    onChange={(e) => setProfile({ ...profile, gstin: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">PAN</label>
                  <input
                    type="text"
                    value={profile.pan || ''}
                    onChange={(e) => setProfile({ ...profile, pan: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Update Profile</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Pricing Guardrails & ROI Parameters Card */}
        {settings && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-4 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Pricing Guardrails & ROI Baselines</span>
            </h3>

            <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="font-bold text-slate-900 text-xs">Deterministic Pricing Guardrails</div>
                <div>
                  <label className="block text-slate-600 mb-1">
                    Minimum Gross Margin Threshold (%):
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    value={settings.min_margin_threshold_pct}
                    onChange={(e) => setSettings({ ...settings, min_margin_threshold_pct: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Quotations below this gross margin will require mandatory owner review.</p>
                </div>

                <div>
                  <label className="block text-slate-600 mb-1">
                    Maximum Permitted Discount (%):
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    value={settings.max_discount_threshold_pct}
                    onChange={(e) => setSettings({ ...settings, max_discount_threshold_pct: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Discounts exceeding this trigger policy alerts.</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-teal-50/50 border border-teal-200 space-y-3">
                <div className="font-bold text-slate-900 text-xs">Verifiable ROI Measurement Inputs</div>
                <div>
                  <label className="block text-slate-600 mb-1">
                    Staff / Estimator Hourly Cost (₹ / hour):
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={settings.labour_cost_per_hour}
                    onChange={(e) => setSettings({ ...settings, labour_cost_per_hour: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Used to convert saved hours into authentic Rupee return.</p>
                </div>

                <div>
                  <label className="block text-slate-600 mb-1">
                    Historical Manual Prep Baseline (Minutes):
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="120"
                    value={settings.default_manual_prep_time_minutes}
                    onChange={(e) => setSettings({ ...settings, default_manual_prep_time_minutes: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Typical time your business previously took to prepare a manual quotation.</p>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Update Guardrails & ROI</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
