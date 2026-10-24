import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { AuditEvent } from '../types';
import { History, ShieldCheck, Search, Filter, Code2, X } from 'lucide-react';

export const AuditPage: React.FC = () => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedMetadata, setSelectedMetadata] = useState<string | null>(null);

  const eventTypes = [
    { label: 'All Actions', value: '' },
    { label: 'AI Extraction', value: 'AI_EXTRACTION_COMPLETED' },
    { label: 'Quotation Created', value: 'QUOTATION_CREATED' },
    { label: 'Quotation Approved', value: 'QUOTATION_APPROVED' },
    { label: 'Quotation Rejected', value: 'QUOTATION_REJECTED' },
    { label: 'Guardrail Triggered', value: 'GUARDRAIL_TRIGGERED' },
    { label: 'PDF Generated', value: 'PDF_GENERATED' }
  ];

  useEffect(() => {
    loadAuditEvents();
  }, [eventTypeFilter]);

  const loadAuditEvents = async () => {
    try {
      setLoading(true);
      const res = await api.audit.list({
        event_type: eventTypeFilter || undefined,
        limit: 50
      });
      setEvents(res.items || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error('Failed to load audit events:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Immutable Audit Trail & Governance</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tamper-evident system log tracking every AI extraction, pricing guardrail alert, and human approval.
          </p>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Tenant Isolated Append-Only Log</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap gap-1.5">
        {eventTypes.map((et) => (
          <button
            key={et.value}
            onClick={() => setEventTypeFilter(et.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              eventTypeFilter === et.value
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            {et.label}
          </button>
        ))}
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
                <th className="py-3 px-4 w-44">Timestamp</th>
                <th className="py-3 px-4 w-48">Action Type</th>
                <th className="py-3 px-4">Event Description</th>
                <th className="py-3 px-4 w-36">Initiated By</th>
                <th className="py-3 px-4 text-right w-24">Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {events.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    No audit records found matching the filter.
                  </td>
                </tr>
              ) : (
                events.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {new Date(e.created_at).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-[10px] font-bold text-brand-700 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded">
                        {e.event_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">
                      {e.description}
                    </td>
                    <td className="py-3 px-4 text-slate-500 truncate">
                      {e.user_email || 'System / AI Engine'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {e.metadata_json && (
                        <button
                          onClick={() => setSelectedMetadata(e.metadata_json || null)}
                          className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 font-mono text-[10px] font-bold"
                        >
                          View JSON
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* JSON Metadata Inspector Modal */}
      {selectedMetadata && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Code2 className="w-4 h-4 text-brand-600" />
                <span>Audit Event Structured Payload</span>
              </h3>
              <button onClick={() => setSelectedMetadata(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <pre className="p-4 rounded-xl bg-slate-900 text-emerald-400 font-mono text-xs overflow-x-auto max-h-80">
              {(() => {
                try {
                  return JSON.stringify(JSON.parse(selectedMetadata), null, 2);
                } catch {
                  return selectedMetadata;
                }
              })()}
            </pre>

            <div className="pt-3 flex justify-end">
              <button
                onClick={() => setSelectedMetadata(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
