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
    <div className="space-y-7">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Audit Trail</h2>
          <p className="text-sm text-slate-500 mt-1">
            Activity log for system events, AI extractions, and human approvals.
          </p>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold shrink-0">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Secure Audit Log</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap gap-2">
        {eventTypes.map((et) => (
          <button
            key={et.value}
            onClick={() => setEventTypeFilter(et.value)}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors ${
              eventTypeFilter === et.value
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            {et.label}
          </button>
        ))}
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold text-xs uppercase tracking-wider">
                <th className="py-4 px-5 w-48">Timestamp</th>
                <th className="py-4 px-5 w-52">Action Type</th>
                <th className="py-4 px-5">Event Description</th>
                <th className="py-4 px-5 w-40">Initiated By</th>
                <th className="py-4 px-5 text-right w-28">Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {events.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-slate-400 text-sm">
                    No audit records found matching the filter.
                  </td>
                </tr>
              ) : (
                events.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-5 text-slate-500 font-mono text-xs">
                      {new Date(e.created_at).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </td>
                    <td className="py-4 px-5">
                      <span className="font-mono text-xs font-bold text-brand-700 bg-brand-50 border border-brand-200 px-2.5 py-1 rounded-md">
                        {e.event_type}
                      </span>
                    </td>
                    <td className="py-4 px-5 font-medium text-slate-800 leading-relaxed">
                      {e.description}
                    </td>
                    <td className="py-4 px-5 text-slate-500 truncate text-xs sm:text-sm">
                      {e.user_email || 'System / AI Engine'}
                    </td>
                    <td className="py-4 px-5 text-right">
                      {e.metadata_json && (
                        <button
                          onClick={() => setSelectedMetadata(e.metadata_json || null)}
                          className="h-8 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-xs font-semibold transition-colors"
                        >
                          Payload
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
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-xl p-7 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Code2 className="w-5 h-5 text-brand-600" />
                <span>Audit Event Structured Payload</span>
              </h3>
              <button onClick={() => setSelectedMetadata(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <pre className="p-5 rounded-xl bg-slate-900 text-emerald-400 font-mono text-xs overflow-x-auto max-h-96 leading-relaxed">
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
                className="h-10 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition-colors"
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
