import React, { useMemo, useState } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  Download, 
  FileText, 
  Clock, 
  User, 
  Activity, 
  X, 
  Sparkles, 
  Layers, 
  Sliders, 
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Webhook,
  DollarSign
} from 'lucide-react';
import { 
  getSystemAuditTrail, 
  filterAuditLogs, 
  exportAuditLogs 
} from '../services/complianceAuditService';
import { useRecovery } from '../context/RecoveryContext';

/**
 * Enterprise Compliance & Audit Console — RecoverAI M7 Page 2 Part 3
 * System audit log visualizer with filter controls, detailed inspector modal, and JSON exporter.
 * Displays system audit trail for policy changes, manual overrides, recovery decisions, and simulated webhook events.
 * 
 * STRICT BOUNDARY:
 * - Restricted to MERCHANT role via ProtectedRoute.
 * - Pure simulation console operating in React memory.
 * - 0 backend API calls, 0 DB writes, 0 storage writes.
 */
export function AuditConsole() {
  const { auditLogs: runtimeAuditLogs } = useRecovery();

  const auditLogs = useMemo(() => {
    if (Array.isArray(runtimeAuditLogs) && runtimeAuditLogs.length > 0) {
      return getSystemAuditTrail({ customEvents: runtimeAuditLogs });
    }
    return getSystemAuditTrail(null);
  }, [runtimeAuditLogs]);

  // Filter state in React memory
  const [searchQuery, setSearchQuery] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Selected audit entry for detail inspection modal
  const [selectedAudit, setSelectedAudit] = useState(null);

  // Filtered audit logs
  const filteredLogs = useMemo(() => {
    return filterAuditLogs(auditLogs, {
      searchQuery,
      eventType: eventTypeFilter,
      status: statusFilter
    });
  }, [auditLogs, searchQuery, eventTypeFilter, statusFilter]);

  // KPI Summary Metrics
  const metrics = useMemo(() => {
    const total = auditLogs.length;
    const policyChanges = auditLogs.filter(e => e.eventType === 'POLICY_CHANGE').length;
    const overrides = auditLogs.filter(e => e.eventType === 'MANUAL_ACTION_OVERRIDE').length;
    const outcomes = auditLogs.filter(e => e.eventType === 'RECOVERY_OUTCOME').length;
    return { total, policyChanges, overrides, outcomes };
  }, [auditLogs]);

  // JSON Export Handler
  const handleExportJSON = () => {
    const jsonStr = exportAuditLogs(filteredLogs);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `recoverai_compliance_audit_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setEventTypeFilter('ALL');
    setStatusFilter('ALL');
  };

  const formatTimestamp = (isoStr) => {
    try {
      const d = new Date(isoStr);
      return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
    } catch {
      return isoStr;
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status?.toUpperCase()) {
      case 'COMPLETED':
        return 'bg-cyan-950/80 text-cyan-400 border-cyan-800/80';
      case 'SIMULATED':
        return 'bg-emerald-950/80 text-emerald-400 border-emerald-800/80';
      case 'OVERRIDDEN':
        return 'bg-amber-950/80 text-amber-400 border-amber-800/80';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 text-left">
      
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        
        {/* Badges & Actions */}
        <div className="flex items-center justify-between flex-wrap gap-3 relative z-10">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-950/80 text-cyan-400 border border-cyan-800/60">
              <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
              Compliance & Audit System
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800/80 text-emerald-400 border border-slate-700">
              <Sparkles className="h-3.5 w-3.5" />
              SIMULATED ENVIRONMENT
            </span>
          </div>

          <button
            type="button"
            onClick={handleExportJSON}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-950/80 hover:bg-cyan-900/80 text-cyan-300 hover:text-white text-xs font-bold border border-cyan-800/60 transition-all cursor-pointer shadow-md focus:outline-none focus:ring-2 focus:ring-cyan-400"
          >
            <Download className="h-3.5 w-3.5 text-cyan-400" />
            <span>Export Audit Log (JSON)</span>
          </button>
        </div>

        {/* Title */}
        <div className="space-y-1 relative z-10">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            RecoverAI Compliance & Audit Console
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
            Centralized enterprise compliance audit trail visualizer tracking system policy modifications, AI decisions, manual overrides, simulated webhooks, and recovery outcomes.
          </p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-1">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">Total Audit Events</span>
          <span className="text-2xl font-extrabold text-white block">{metrics.total}</span>
          <span className="text-[11px] text-slate-500 block">Immutable Session Snapshots</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-1">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">Policy Modifications</span>
          <span className="text-2xl font-extrabold text-cyan-400 block">{metrics.policyChanges}</span>
          <span className="text-[11px] text-slate-500 block">Rule Config Adjustments</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-1">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">Manual Overrides</span>
          <span className="text-2xl font-extrabold text-amber-400 block">{metrics.overrides}</span>
          <span className="text-[11px] text-slate-500 block">Operator Policy Overrides</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-1">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">Recovery Outcomes</span>
          <span className="text-2xl font-extrabold text-emerald-400 block">{metrics.outcomes}</span>
          <span className="text-[11px] text-slate-500 block">Correlated Revenue Outcomes</span>
        </div>

      </div>

      {/* Audit Log Table & Filters Container */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        
        {/* Filter Controls Bar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <div className="relative flex-1">
              <Search className="h-4 w-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search audit ID, event type, actor, or customer ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Event Type Filter */}
            <select
              value={eventTypeFilter}
              onChange={(e) => setEventTypeFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 focus:outline-none focus:border-cyan-500 transition-all cursor-pointer"
            >
              <option value="ALL">All Event Types</option>
              <option value="POLICY_CHANGE">POLICY_CHANGE</option>
              <option value="MANUAL_ACTION_OVERRIDE">MANUAL_ACTION_OVERRIDE</option>
              <option value="RECOVERY_DECISION">RECOVERY_DECISION</option>
              <option value="RECOVERY_ACTION_PLAN">RECOVERY_ACTION_PLAN</option>
              <option value="RECOVERY_EXECUTION_SIMULATED">RECOVERY_EXECUTION_SIMULATED</option>
              <option value="CUSTOMER_RETRY">CUSTOMER_RETRY</option>
              <option value="RECOVERY_OUTCOME">RECOVERY_OUTCOME</option>
              <option value="WEBHOOK_SIMULATED">WEBHOOK_SIMULATED</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 focus:outline-none focus:border-cyan-500 transition-all cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="SIMULATED">SIMULATED</option>
              <option value="OVERRIDDEN">OVERRIDDEN</option>
            </select>

            {(searchQuery || eventTypeFilter !== 'ALL' || statusFilter !== 'ALL') && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition-all cursor-pointer"
                title="Reset Filters"
              >
                <RotateCcw className="h-3.5 w-3.5 text-cyan-400" />
              </button>
            )}
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          {filteredLogs.length > 0 ? (
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800 text-[10px]">
                <tr>
                  <th className="py-3 px-4">Audit ID</th>
                  <th className="py-3 px-4">Event Type</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {filteredLogs.map((entry) => (
                  <tr key={entry.auditId} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-cyan-300">{entry.auditId}</td>
                    <td className="py-3 px-4 font-sans font-semibold text-slate-200">
                      <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] font-mono text-cyan-400">
                        {entry.eventType}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-sans">{entry.source}</td>
                    <td className="py-3 px-4 text-slate-300 font-sans">{entry.actor}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${getStatusBadgeClass(entry.status)}`}>
                        {entry.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[10px]">{formatTimestamp(entry.timestamp)}</td>
                    <td className="py-3 px-4 text-right font-sans">
                      <button
                        type="button"
                        onClick={() => setSelectedAudit(entry)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white text-[11px] font-bold border border-slate-700 transition-all cursor-pointer"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-10 text-center bg-slate-950/40 rounded-xl space-y-2">
              <Filter className="h-6 w-6 text-slate-500 mx-auto mb-1" />
              <p className="text-slate-300 text-xs font-semibold">No audit entries match your current search/filter criteria</p>
              <p className="text-slate-500 text-[11px]">Try adjusting your search query, event type, or status filter.</p>
            </div>
          )}
        </div>

        {/* Audit Safety Footer Disclaimer */}
        <div className="pt-2">
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2.5 flex items-center gap-2 text-[11px] font-medium text-slate-400">
            <ShieldCheck className="h-4 w-4 shrink-0 text-cyan-400" />
            <span>Simulated Compliance Audit — No real database or external audit logging service connected.</span>
          </div>
        </div>

      </div>

      {/* Detail Inspection Modal */}
      {selectedAudit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-2xl w-full space-y-5 shadow-2xl relative text-left">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-cyan-950 text-cyan-400 flex items-center justify-center border border-cyan-800">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">Audit Record Metadata Inspection</h3>
                  <span className="text-[11px] font-mono text-cyan-400 block">ID: {selectedAudit.auditId}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAudit(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Grid Context */}
            <div className="space-y-4 text-xs">
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider block mb-0.5">Event Type</span>
                  <span className="font-mono font-bold text-cyan-300 text-xs block">{selectedAudit.eventType}</span>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider block mb-0.5">Source & Actor</span>
                  <span className="font-semibold text-slate-200 text-xs block truncate" title={`${selectedAudit.source} / ${selectedAudit.actor}`}>
                    {selectedAudit.actor}
                  </span>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider block mb-0.5">Timestamp</span>
                  <span className="font-mono text-slate-400 text-xs block">{formatTimestamp(selectedAudit.timestamp)}</span>
                </div>
              </div>

              {/* Event Specific Metadata Inspection */}
              <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">Metadata Summary</span>
                
                <p className="text-slate-300 text-xs leading-relaxed font-medium">
                  {selectedAudit.metadata?.details}
                </p>

                {/* Policy Change Specific */}
                {selectedAudit.eventType === 'POLICY_CHANGE' && (
                  <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] font-mono border-t border-slate-800">
                    <div>
                      <span className="text-slate-500 block">Previous Value:</span>
                      <span className="text-amber-400 font-bold">{selectedAudit.metadata.previousValue}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">New Value:</span>
                      <span className="text-emerald-400 font-bold">{selectedAudit.metadata.newValue}</span>
                    </div>
                  </div>
                )}

                {/* Manual Override Specific */}
                {selectedAudit.eventType === 'MANUAL_ACTION_OVERRIDE' && (
                  <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] font-mono border-t border-slate-800">
                    <div>
                      <span className="text-slate-500 block">Original Strategy:</span>
                      <span className="text-indigo-400 font-bold">{selectedAudit.metadata.originalAction}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Revised Override:</span>
                      <span className="text-rose-400 font-bold">{selectedAudit.metadata.revisedAction}</span>
                    </div>
                  </div>
                )}

                {/* Webhook Specific */}
                {selectedAudit.eventType === 'WEBHOOK_SIMULATED' && (
                  <div className="pt-2 text-[11px] font-mono border-t border-slate-800 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Endpoint:</span>
                      <span className="text-slate-300">{selectedAudit.metadata.endpoint}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Response Code:</span>
                      <span className="text-emerald-400 font-bold">{selectedAudit.metadata.responseCode} OK</span>
                    </div>
                  </div>
                )}

                {/* Recovery Outcome Specific */}
                {selectedAudit.eventType === 'RECOVERY_OUTCOME' && (
                  <div className="pt-2 text-[11px] font-mono border-t border-slate-800 flex justify-between">
                    <span className="text-slate-500">Net Recovered Amount:</span>
                    <span className="text-emerald-400 font-bold">₹{selectedAudit.metadata.recoveredAmount?.toLocaleString('en-IN')} INR</span>
                  </div>
                )}
              </div>

              {/* Raw JSON Inspector */}
              <div className="space-y-1 font-mono text-[11px]">
                <span className="text-[10px] font-sans font-semibold uppercase tracking-wider text-slate-400 block">Raw Immutable Snapshot (JSON)</span>
                <pre className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-cyan-300 overflow-x-auto max-h-40 scrollbar-thin text-[10px] leading-relaxed">
                  {JSON.stringify(selectedAudit, null, 2)}
                </pre>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedAudit(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all cursor-pointer shadow-lg"
              >
                Close Inspection
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
