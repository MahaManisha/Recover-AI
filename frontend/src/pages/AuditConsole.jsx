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
import { buildRecoveryLifecycleHistory, buildRecoveryLifecycleReplay, buildRecoveryLifecycleAnomalyDiagnostic, buildRecoveryLifecycleProposalAuthorization, buildRecoveryLifecycleExecutionHandoff, executeGovernedProposalHandoff, buildRecoveryLifecycleExecutionAccountability } from '../services/agentConsoleStream';
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
  const { auditLogs: runtimeAuditLogs, recoveryEvents, activeMerchantId } = useRecovery();

  const auditLogs = useMemo(() => {
    if (Array.isArray(runtimeAuditLogs) && runtimeAuditLogs.length > 0) {
      return getSystemAuditTrail({ customEvents: runtimeAuditLogs });
    }
    return getSystemAuditTrail(null);
  }, [runtimeAuditLogs]);

  // Milestone 10.9 Lifecycle History Aggregation
  const lifecycleHistory = useMemo(() => {
    return buildRecoveryLifecycleHistory(recoveryEvents || [], runtimeAuditLogs || [], activeMerchantId);
  }, [recoveryEvents, runtimeAuditLogs, activeMerchantId]);

  const [selectedLifecycleId, setSelectedLifecycleId] = useState(null);
  const [selectedStepIndex, setSelectedStepIndex] = useState(0);
  const [selectedProposalId, setSelectedProposalId] = useState(null);
  const [operatorDecision, setOperatorDecision] = useState('APPROVE');
  const [handoffExecutionResult, setHandoffExecutionResult] = useState(null);
  const [isExecutingHandoff, setIsExecutingHandoff] = useState(false);

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

  const reconciliationSummary = useMemo(() => {
    let confirmed = 0;
    let failed = 0;
    let pending = 0;
    let inconsistent = 0;
    let insufficientData = 0;

    auditLogs.forEach(log => {
      const status = log.reconciliationStatus || log.status;
      if (status === 'RECONCILIATION_CONFIRMED' || log.eventType === 'RECOVERY_OUTCOME' || status === 'COMPLETED') confirmed++;
      else if (status === 'RECONCILIATION_FAILED' || status === 'FAILED') failed++;
      else if (status === 'RECONCILIATION_PENDING' || status === 'PENDING') pending++;
      else if (status === 'RECONCILIATION_INCONSISTENT' || status === 'OVERRIDDEN') inconsistent++;
      else insufficientData++;
    });

    return { confirmed, failed, pending, inconsistent, insufficientData };
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
    <div className="w-full space-y-6 text-left">
      
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

      {/* Control Center Outcome Reconciliation & Lifecycle Finalization Summary (M10.6/M10.7) */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">CONTROL CENTER — RECONCILIATION METRICS:</span>
            <span className="text-[10px] font-mono text-cyan-400">AUTHORITATIVE RECONCILIATION</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-mono">
            <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-xl p-2.5 text-center">
              <span className="text-[10px] text-slate-400 uppercase block">CONFIRMED</span>
              <span className="text-base font-extrabold text-emerald-300">{reconciliationSummary.confirmed}</span>
            </div>
            <div className="bg-rose-950/40 border border-rose-800/60 rounded-xl p-2.5 text-center">
              <span className="text-[10px] text-slate-400 uppercase block">FAILED EXECUTIONS</span>
              <span className="text-base font-extrabold text-rose-300">{reconciliationSummary.failed}</span>
            </div>
            <div className="bg-amber-950/40 border border-amber-800/60 rounded-xl p-2.5 text-center">
              <span className="text-[10px] text-slate-400 uppercase block">PENDING OUTCOMES</span>
              <span className="text-base font-extrabold text-amber-300">{reconciliationSummary.pending}</span>
            </div>
            <div className="bg-purple-950/40 border border-purple-800/60 rounded-xl p-2.5 text-center">
              <span className="text-[10px] text-slate-400 uppercase block">INCONSISTENT</span>
              <span className="text-base font-extrabold text-purple-300">{reconciliationSummary.inconsistent}</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-center col-span-2 sm:col-span-1">
              <span className="text-[10px] text-slate-400 uppercase block">INSUFFICIENT DATA</span>
              <span className="text-base font-extrabold text-slate-400">{reconciliationSummary.insufficientData}</span>
            </div>
          </div>
        </div>

        <div className="space-y-2 pt-3 border-t border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">CONTROL CENTER — LIFECYCLE CLOSURE METRICS:</span>
            <span className="text-[10px] font-mono text-emerald-400">FINALIZED STATE</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-mono">
            <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-xl p-2.5 text-center">
              <span className="text-[10px] text-slate-400 uppercase block">CLOSED RECOVERED</span>
              <span className="text-base font-extrabold text-emerald-300">{reconciliationSummary.confirmed}</span>
            </div>
            <div className="bg-rose-950/40 border border-rose-800/60 rounded-xl p-2.5 text-center">
              <span className="text-[10px] text-slate-400 uppercase block">BLOCKED LIFECYCLES</span>
              <span className="text-base font-extrabold text-rose-300">{reconciliationSummary.failed}</span>
            </div>
            <div className="bg-cyan-950/40 border border-cyan-800/60 rounded-xl p-2.5 text-center">
              <span className="text-[10px] text-slate-400 uppercase block">OPEN LIFECYCLES</span>
              <span className="text-base font-extrabold text-cyan-300">{Math.max(0, metrics.total - reconciliationSummary.confirmed - reconciliationSummary.failed)}</span>
            </div>
            <div className="bg-amber-950/40 border border-amber-800/60 rounded-xl p-2.5 text-center">
              <span className="text-[10px] text-slate-400 uppercase block">PENDING LIFECYCLES</span>
              <span className="text-base font-extrabold text-amber-300">{reconciliationSummary.pending}</span>
            </div>
            <div className="bg-purple-950/40 border border-purple-800/60 rounded-xl p-2.5 text-center col-span-2 sm:col-span-1">
              <span className="text-[10px] text-slate-400 uppercase block">UNRESOLVED</span>
              <span className="text-base font-extrabold text-purple-300">{reconciliationSummary.inconsistent + reconciliationSummary.insufficientData}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Milestone 10.9 — Recovery Lifecycle History Section */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">RECOVERY LIFECYCLE HISTORY (M10.9):</h3>
          </div>
          <span className="text-xs font-mono text-cyan-400 font-semibold">
            {lifecycleHistory?.lifecycles?.length || 0} AUDITED LIFECYCLES ({lifecycleHistory?.transitionCount || 0} TOTAL TRANSITIONS)
          </span>
        </div>

        {lifecycleHistory?.lifecycles?.length > 0 ? (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300 font-mono">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[10px] uppercase">
                  <tr>
                    <th className="p-2.5">LIFECYCLE ID</th>
                    <th className="p-2.5">CUSTOMER</th>
                    <th className="p-2.5">PRODUCT</th>
                    <th className="p-2.5">STATE</th>
                    <th className="p-2.5">CLOSURE</th>
                    <th className="p-2.5">OUTCOME</th>
                    <th className="p-2.5">TRANSITIONS</th>
                    <th className="p-2.5">LAST ACTIVITY</th>
                    <th className="p-2.5 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {lifecycleHistory.lifecycles.map((lc) => {
                    const isSelected = selectedLifecycleId === lc.lifecycleIdentity?.caseId;
                    return (
                      <tr 
                        key={lc.lifecycleIdentity?.caseId} 
                        onClick={() => {
                          if (isSelected) {
                            setSelectedLifecycleId(null);
                            setSelectedStepIndex(0);
                          } else {
                            setSelectedLifecycleId(lc.lifecycleIdentity?.caseId);
                            setSelectedStepIndex(0);
                          }
                        }}
                        className={`hover:bg-slate-800/40 transition-colors cursor-pointer ${isSelected ? 'bg-indigo-950/40 border-l-2 border-indigo-500' : ''}`}
                      >
                        <td className="p-2.5 text-cyan-300 font-bold max-w-[140px] truncate" title={lc.lifecycleIdentity?.caseId}>
                          {lc.lifecycleIdentity?.caseId}
                        </td>
                        <td className="p-2.5 text-slate-200">{lc.customerId}</td>
                        <td className="p-2.5 text-slate-400">{lc.productName}</td>
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                            lc.currentState === 'RECOVERED'
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                              : (lc.currentState === 'BLOCKED'
                                ? 'bg-rose-950 text-rose-300 border-rose-800'
                                : (lc.currentState === 'EXECUTING'
                                  ? 'bg-amber-950 text-amber-300 border-amber-800'
                                  : 'bg-slate-950 text-cyan-300 border-slate-800'))
                          }`}>
                            {lc.currentState}
                          </span>
                        </td>
                        <td className="p-2.5 font-bold">
                          <span className={lc.closureStatus === 'CLOSED' ? 'text-emerald-400' : (lc.closureStatus === 'BLOCKED' ? 'text-rose-400' : 'text-slate-400')}>
                            {lc.closureStatus}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-300">{lc.recoveryOutcome}</td>
                        <td className="p-2.5 font-extrabold text-cyan-400">{lc.totalTransitions}</td>
                        <td className="p-2.5 text-slate-400 text-[10px]">{formatTimestamp(lc.lastTransitionAt)}</td>
                        <td className="p-2.5 text-right">
                          <button
                            type="button"
                            className="px-2 py-1 bg-indigo-950/80 border border-indigo-800/80 hover:bg-indigo-900 text-indigo-300 rounded text-[10px] font-bold"
                          >
                            {isSelected ? 'Hide Timeline' : 'Inspect Timeline'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Selected Lifecycle Timeline Inspector & M10.10 Time-Travel Step Replay */}
            {selectedLifecycleId && (() => {
              const activeLc = lifecycleHistory.lifecycles.find(l => l.lifecycleIdentity?.caseId === selectedLifecycleId);
              if (!activeLc) return null;

              const replay = buildRecoveryLifecycleReplay(activeLc, selectedStepIndex, activeMerchantId);

              return (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4 font-mono shadow-xl">
                  {/* Timeline Inspector Header */}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2 flex-wrap gap-2">
                    <div>
                      <span className="text-xs font-bold text-white uppercase block">TIMELINE & TIME-TRAVEL REPLAY: {activeLc.lifecycleIdentity?.caseId}</span>
                      <span className="text-[10px] text-slate-400 font-sans font-medium">Customer: {activeLc.customerId} | Product: {activeLc.productName}</span>
                    </div>

                    {/* M10.10 Step Replay Navigation Controls */}
                    {activeLc.transitions.length > 0 && (
                      <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2 py-1 rounded-lg">
                        <button
                          type="button"
                          onClick={() => setSelectedStepIndex(0)}
                          disabled={selectedStepIndex === 0}
                          className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-950 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                          First
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedStepIndex(prev => Math.max(0, prev - 1))}
                          disabled={selectedStepIndex === 0}
                          className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-950 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                          &lt; Prev
                        </button>
                        <span className="px-2.5 py-0.5 text-xs font-extrabold text-cyan-300 bg-cyan-950/80 rounded border border-cyan-800">
                          Step {selectedStepIndex + 1} / {activeLc.transitions.length}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedStepIndex(prev => Math.min(activeLc.transitions.length - 1, prev + 1))}
                          disabled={selectedStepIndex >= activeLc.transitions.length - 1}
                          className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-950 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                          Next &gt;
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedStepIndex(activeLc.transitions.length - 1)}
                          disabled={selectedStepIndex >= activeLc.transitions.length - 1}
                          className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-950 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                          Last
                        </button>
                      </div>
                    )}
                  </div>

                  {/* M10.10 Point-in-Time Replay Explanation Card */}
                  {replay && replay.valid && (
                    <div className="bg-indigo-950/30 border border-indigo-900/60 rounded-xl p-3.5 space-y-3">
                      <div className="flex items-center justify-between border-b border-indigo-900/40 pb-2 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-cyan-400" />
                          <span className="text-xs font-bold text-white uppercase">{replay.explanation?.title}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                          replay.explanation?.complianceStatus === 'COMPLIANT'
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                            : (replay.explanation?.complianceStatus === 'REVIEW_REQUIRED'
                              ? 'bg-amber-950 text-amber-300 border-amber-800'
                              : 'bg-rose-950 text-rose-300 border-rose-800')
                        }`}>
                          COMPLIANCE: {replay.explanation?.complianceStatus}
                        </span>
                      </div>

                      {/* Explanation Summary Banner */}
                      <p className="text-xs font-sans text-slate-200 leading-relaxed bg-slate-900/80 p-2.5 rounded border border-slate-800">
                        {replay.explanation?.summary}
                      </p>

                      {/* Reconstructed Point-in-Time State Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                        <div className="bg-slate-900 p-2 rounded border border-slate-800 flex justify-between items-center">
                          <span className="text-slate-400">Point-in-Time State:</span>
                          <span className="text-cyan-300 font-bold">{replay.reconstructedState?.effectiveState}</span>
                        </div>
                        <div className="bg-slate-900 p-2 rounded border border-slate-800 flex justify-between items-center">
                          <span className="text-slate-400">Pipeline Stage:</span>
                          <span className="text-indigo-300 font-bold">{replay.reconstructedState?.pipelineStage}</span>
                        </div>
                        <div className="bg-slate-900 p-2 rounded border border-slate-800 flex justify-between items-center">
                          <span className="text-slate-400">Terminal State:</span>
                          <span className={replay.reconstructedState?.terminal ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                            {replay.reconstructedState?.terminal ? 'YES' : 'NO'}
                          </span>
                        </div>
                        <div className="bg-slate-900 p-2 rounded border border-slate-800 flex justify-between items-center">
                          <span className="text-slate-400">State Changed:</span>
                          <span className={replay.stepDelta?.stateChanged ? 'text-amber-400 font-bold' : 'text-slate-500'}>
                            {replay.stepDelta?.stateChanged ? 'YES' : 'NO'}
                          </span>
                        </div>
                      </div>

                      {/* Step Delta Details */}
                      <div className="grid grid-cols-2 sm:grid-cols-2 gap-2 text-[10px] text-slate-300">
                        <div className="bg-slate-900/80 p-2 rounded border border-slate-800 flex justify-between items-center">
                          <span className="text-slate-400">Step Interval:</span>
                          <span className="text-slate-200">
                            {replay.stepDelta?.timeSincePreviousStepMs != null
                              ? `${Math.round(replay.stepDelta.timeSincePreviousStepMs / 1000)} seconds`
                              : 'Initial Step (0s)'}
                          </span>
                        </div>
                        <div className="bg-slate-900/80 p-2 rounded border border-slate-800 flex justify-between items-center">
                          <span className="text-slate-400">Governance Rule:</span>
                          <span className="text-slate-200 truncate max-w-[200px]" title={replay.explanation?.governanceRuleApplied}>
                            {replay.explanation?.governanceRuleApplied}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Milestone 10.11 — Anomaly Diagnostic & Guided Operator Resolution Workbench */}
                  {(() => {
                    const diagnostic = buildRecoveryLifecycleAnomalyDiagnostic(activeLc, selectedStepIndex, activeMerchantId);
                    if (!diagnostic || (!diagnostic.hasAnomaly && !activeLc.operatorReviewRequired)) return null;

                    return (
                      <div className="bg-amber-950/20 border border-amber-800/60 rounded-xl p-4 space-y-4 font-sans">
                        <div className="flex items-center justify-between border-b border-amber-800/40 pb-2 flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-400" />
                            <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                              ANOMALY DIAGNOSTIC & RESOLUTION WORKBENCH (M10.11)
                            </span>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-extrabold border ${
                            diagnostic.anomalySeverity === 'CRITICAL' ? 'bg-rose-950 text-rose-300 border-rose-800' :
                            diagnostic.anomalySeverity === 'HIGH' ? 'bg-amber-950 text-amber-300 border-amber-800' :
                            'bg-slate-900 text-yellow-300 border-slate-700'
                          }`}>
                            SEVERITY: {diagnostic.anomalySeverity} | CATEGORY: {diagnostic.primaryAnomalyCategory}
                          </span>
                        </div>

                        {/* Diagnostic Overview */}
                        <div className="space-y-1">
                          <div className="text-xs text-slate-300">
                            <strong className="text-amber-400">Root Cause Layer:</strong> <span className="font-mono text-cyan-300">{diagnostic.rootCause?.originatingLayer}</span>
                          </div>
                          <p className="text-xs text-slate-200 bg-slate-900/90 p-2.5 rounded border border-slate-800 leading-relaxed font-sans">
                            {diagnostic.rootCause?.summary}
                          </p>
                        </div>

                        {/* Evidence Categorization */}
                        <div className="space-y-2">
                          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">SUPPORTING TELEMETRY EVIDENCE:</span>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                            {/* RECORDED FACT */}
                            <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 space-y-1.5">
                              <span className="text-[10px] font-extrabold text-cyan-400 uppercase block tracking-wider font-mono">RECORDED FACT</span>
                              {diagnostic.rootCause?.evidence?.filter(e => e.category === 'RECORDED_FACT').map((e, idx) => (
                                <div key={idx} className="text-[11px] text-slate-300 border-t border-slate-800/60 pt-1">
                                  <span className="text-slate-400 block">{e.label}:</span>
                                  <span className="text-white font-mono font-bold">{e.value}</span>
                                  <span className="text-[9px] text-slate-500 block font-mono">Field: {e.sourceField}</span>
                                </div>
                              ))}
                              {!diagnostic.rootCause?.evidence?.some(e => e.category === 'RECORDED_FACT') && (
                                <span className="text-[11px] text-slate-500 italic block">None recorded</span>
                              )}
                            </div>

                            {/* DETERMINISTIC DERIVATION */}
                            <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 space-y-1.5">
                              <span className="text-[10px] font-extrabold text-indigo-400 uppercase block tracking-wider font-mono">DETERMINISTIC DERIVATION</span>
                              {diagnostic.rootCause?.evidence?.filter(e => e.category === 'DETERMINISTIC_DERIVATION').map((e, idx) => (
                                <div key={idx} className="text-[11px] text-slate-300 border-t border-slate-800/60 pt-1">
                                  <span className="text-slate-400 block">{e.label}:</span>
                                  <span className="text-indigo-300 font-mono font-bold">{e.value}</span>
                                  <span className="text-[9px] text-slate-500 block font-mono">Rule: {e.sourceRule}</span>
                                </div>
                              ))}
                              {!diagnostic.rootCause?.evidence?.some(e => e.category === 'DETERMINISTIC_DERIVATION') && (
                                <span className="text-[11px] text-slate-500 italic block">None derived</span>
                              )}
                            </div>

                            {/* UNAVAILABLE */}
                            <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 space-y-1.5">
                              <span className="text-[10px] font-extrabold text-rose-400 uppercase block tracking-wider font-mono">UNAVAILABLE</span>
                              {diagnostic.rootCause?.evidence?.filter(e => e.category === 'UNAVAILABLE').map((e, idx) => (
                                <div key={idx} className="text-[11px] text-slate-300 border-t border-slate-800/60 pt-1">
                                  <span className="text-slate-400 block">{e.label}:</span>
                                  <span className="text-rose-300 font-mono font-bold">{e.value}</span>
                                  <span className="text-[9px] text-slate-400 block font-sans">{e.reason}</span>
                                </div>
                              ))}
                              {!diagnostic.rootCause?.evidence?.some(e => e.category === 'UNAVAILABLE') && (
                                <span className="text-[11px] text-slate-500 italic block">None unrecorded</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Resolution Options */}
                        <div className="space-y-2 pt-1 border-t border-amber-800/40">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">GUIDED OPERATOR RESOLUTION OPTIONS (PROPOSALS ONLY):</span>
                            <span className="text-[9px] text-amber-400 font-mono font-bold">Explicit operator review required — 0 side effects</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {diagnostic.resolutionOptions?.map((opt) => (
                              <div 
                                key={opt.optionId} 
                                className={`p-3 rounded-xl border text-xs space-y-2 transition-all ${
                                  opt.recommended ? 'bg-indigo-950/40 border-indigo-700/80' : 'bg-slate-900/80 border-slate-800'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-bold text-white font-mono">{opt.label}</span>
                                  {opt.recommended && (
                                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-700">
                                      RECOMMENDED
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-300 leading-relaxed font-sans">{opt.description}</p>
                                <div className="flex items-center justify-between text-[10px] font-mono pt-1 border-t border-slate-800/60">
                                  <span className={opt.policyCompliant ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                                    Policy Compliant: {opt.policyCompliant ? 'YES' : 'NO (Override Required)'}
                                  </span>
                                  <span className="text-amber-300">
                                    Proposed State: {opt.governancePayload?.proposedNextState}
                                  </span>
                                </div>
                                <div className="text-[10px] bg-slate-950 p-2 rounded border border-slate-800 text-slate-400 font-mono">
                                  <span className="text-cyan-400 block font-bold mb-0.5">Proposed Governance Payload:</span>
                                  <pre className="text-[9px] text-slate-300 overflow-x-auto">{JSON.stringify(opt.governancePayload, null, 2)}</pre>
                                  <span className="text-[9px] text-amber-400 italic block mt-1">
                                    Proposed operator action — requires explicit review in governed dispatch path
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Milestone 10.12 — Governed Proposal Authorization Evaluation Workbench */}
                        {(() => {
                          const activeProposalId = selectedProposalId || diagnostic.resolutionOptions?.[0]?.optionId;
                          if (!activeProposalId) return null;

                          const authEval = buildRecoveryLifecycleProposalAuthorization(
                            diagnostic,
                            activeLc,
                            activeProposalId,
                            operatorDecision,
                            { currentMerchantId: activeMerchantId, operatorActor: 'Merchant Operator', operatorRole: 'MERCHANT_ADMIN' },
                            null
                          )?.proposalAuthorization;

                          if (!authEval) return null;

                          return (
                            <div className="mt-3 p-3 bg-slate-950/90 rounded-xl border border-indigo-800/60 space-y-2.5 font-sans">
                              <div className="flex items-center justify-between border-b border-indigo-800/40 pb-1.5 flex-wrap gap-2">
                                <div className="flex items-center gap-2">
                                  <ShieldCheck className="h-4 w-4 text-indigo-400" />
                                  <span className="text-[10px] font-bold text-white uppercase tracking-wider font-mono">
                                    M10.12 AUTHORIZATION EVALUATION ENGINE (OBSERVATIONAL CONTRACT)
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] text-slate-400 font-mono">Operator Decision:</span>
                                  <button 
                                    onClick={() => setOperatorDecision('APPROVE')} 
                                    className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold ${operatorDecision === 'APPROVE' ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-slate-900 text-slate-400 border border-slate-800'}`}
                                  >
                                    APPROVE
                                  </button>
                                  <button 
                                    onClick={() => setOperatorDecision('REJECT')} 
                                    className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold ${operatorDecision === 'REJECT' ? 'bg-rose-950 text-rose-300 border border-rose-700' : 'bg-slate-900 text-slate-400 border border-slate-800'}`}
                                  >
                                    REJECT
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                                <div className="bg-slate-900 p-2.5 rounded border border-slate-800 space-y-1">
                                  <span className="text-[9px] font-mono font-bold text-slate-400 block uppercase">AUTHORIZATION STATUS</span>
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-extrabold inline-block border ${
                                    authEval.isAuthorized ? 'bg-emerald-950 text-emerald-300 border-emerald-800' :
                                    authEval.authorizationStatus === 'POLICY_BLOCKED' ? 'bg-amber-950 text-amber-300 border-amber-800' :
                                    authEval.authorizationStatus === 'STALE_CONTEXT' ? 'bg-purple-950 text-purple-300 border-purple-800' :
                                    'bg-rose-950 text-rose-300 border-rose-800'
                                  }`}>
                                    {authEval.authorizationStatus}
                                  </span>
                                </div>

                                <div className="bg-slate-900 p-2.5 rounded border border-slate-800 space-y-1">
                                  <span className="text-[9px] font-mono font-bold text-slate-400 block uppercase">AUTHORIZATION REASON</span>
                                  <span className="text-[11px] font-mono text-cyan-300 font-bold block truncate" title={authEval.authorizationReason}>
                                    {authEval.authorizationReason}
                                  </span>
                                </div>

                                <div className="bg-slate-900 p-2.5 rounded border border-slate-800 space-y-1">
                                  <span className="text-[9px] font-mono font-bold text-slate-400 block uppercase">STALENESS EVALUATION</span>
                                  <span className={`text-[11px] font-mono font-bold block ${authEval.stalenessEvaluation?.isStale ? 'text-amber-400' : 'text-emerald-400'}`}>
                                    {authEval.stalenessEvaluation?.stalenessStatus} ({authEval.stalenessEvaluation?.reason})
                                  </span>
                                </div>
                              </div>

                              <div className="text-[9px] text-slate-400 bg-slate-900 p-2 rounded border border-slate-800 font-mono space-y-1">
                                <div className="flex items-center justify-between text-indigo-300">
                                  <span>In-Memory Audit Contract Generated (0 DB / 0 Storage / 0 Network Calls):</span>
                                  <span className="font-bold text-cyan-400">{authEval.authorizationAuditEvent?.eventId}</span>
                                </div>
                                <span className="text-amber-400 italic block">
                                  Notice: Authorization evaluation is NOT execution. Handed off to independent authoritative execution boundary.
                                </span>
                              </div>

                              {/* Milestone 10.13 — Governed Execution Handoff & Authorization Re-Validation Engine */}
                              {(() => {
                                const handoffEval = buildRecoveryLifecycleExecutionHandoff(
                                  authEval,
                                  activeLc,
                                  { currentMerchantId: activeMerchantId, operatorActor: 'Merchant Operator', operatorRole: 'MERCHANT_ADMIN' },
                                  null
                                );

                                const handleHandoffDispatch = async () => {
                                  setIsExecutingHandoff(true);
                                  try {
                                    const result = await executeGovernedProposalHandoff(
                                      authEval,
                                      activeLc,
                                      { currentMerchantId: activeMerchantId, operatorActor: 'Merchant Operator', operatorRole: 'MERCHANT_ADMIN' },
                                      null
                                    );
                                    setHandoffExecutionResult(result);
                                  } catch (err) {
                                    setHandoffExecutionResult({
                                      valid: false,
                                      handoffStatus: 'DISPATCH_ERROR',
                                      revalidationStatus: { isAuthorized: false, authorizationReason: err.message }
                                    });
                                  } finally {
                                    setIsExecutingHandoff(false);
                                  }
                                };

                                return (
                                  <div className="mt-3 p-3 bg-slate-950 rounded-xl border border-cyan-800/80 space-y-2.5 font-sans">
                                    <div className="flex items-center justify-between border-b border-cyan-800/40 pb-1.5 flex-wrap gap-2">
                                      <div className="flex items-center gap-2">
                                        <Webhook className="h-4 w-4 text-cyan-400" />
                                        <span className="text-[10px] font-bold text-white uppercase tracking-wider font-mono">
                                          M10.13 GOVERNED EXECUTION HANDOFF & RE-VALIDATION ENGINE
                                        </span>
                                      </div>
                                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-extrabold border ${
                                        handoffEval.valid ? 'bg-cyan-950 text-cyan-300 border-cyan-800' : 'bg-rose-950 text-rose-300 border-rose-800'
                                      }`}>
                                        HANDOFF: {handoffEval.handoffStatus}
                                      </span>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                                      <div className="bg-slate-900 p-2.5 rounded border border-slate-800 space-y-1">
                                        <span className="text-[9px] font-mono font-bold text-slate-400 block uppercase">INDEPENDENT RE-VALIDATION</span>
                                        <span className={`text-[11px] font-mono font-bold block ${handoffEval.valid ? 'text-emerald-400' : 'text-rose-400'}`}>
                                          {handoffEval.valid ? 'VALIDATED' : `FAILED (${handoffEval.revalidationStatus?.authorizationReason})`}
                                        </span>
                                      </div>
                                      <div className="bg-slate-900 p-2.5 rounded border border-slate-800 space-y-1">
                                        <span className="text-[9px] font-mono font-bold text-slate-400 block uppercase">EXECUTION LOCK STATUS</span>
                                        <span className="text-[11px] font-mono font-bold text-indigo-300 block truncate">
                                          {handoffEval.executionLockStatus?.candidateKey || 'NO_LOCK'}
                                        </span>
                                      </div>
                                      <div className="bg-slate-900 p-2.5 rounded border border-slate-800 space-y-1">
                                        <span className="text-[9px] font-mono font-bold text-slate-400 block uppercase">RECONCILIATION REQUIREMENT</span>
                                        <span className="text-[11px] font-mono font-bold text-amber-400 block">
                                          {handoffEval.requiresReconciliation ? 'REQUIRES M10.6 RECONCILIATION' : 'NONE'}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Action Trigger */}
                                    <div className="flex items-center justify-between pt-1">
                                      <span className="text-[9px] text-slate-400 font-mono">
                                        Authoritative Execution Handoff Control:
                                      </span>
                                      <button
                                        onClick={handleHandoffDispatch}
                                        disabled={!handoffEval.valid || isExecutingHandoff}
                                        className={`px-3 py-1 rounded text-xs font-mono font-bold transition-all border shadow ${
                                          handoffEval.valid && !isExecutingHandoff
                                            ? 'bg-cyan-950 text-cyan-200 border-cyan-600 hover:bg-cyan-900 cursor-pointer'
                                            : 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed'
                                        }`}
                                      >
                                        {isExecutingHandoff ? 'DISPATCHING HANDOFF...' : 'EXECUTE GOVERNED PROPOSAL HANDOFF (M10.13)'}
                                      </button>
                                    </div>

                                    {handoffExecutionResult && (
                                      <div className="bg-slate-900/90 p-2.5 rounded border border-slate-800 space-y-1 font-mono text-[10px]">
                                        <div className="flex items-center justify-between text-cyan-300">
                                          <span>DISPATCH HANDOFF RESULT:</span>
                                          <span className="font-bold text-emerald-400">{handoffExecutionResult.handoffStatus}</span>
                                        </div>
                                        <div className="text-slate-300">
                                          <span>Dispatch Event ID: </span>
                                          <span className="text-white font-bold">{handoffExecutionResult.dispatchResult?.event_id || handoffExecutionResult.executionAuditEvent?.eventId}</span>
                                        </div>
                                        <span className="text-amber-400 italic block mt-1">
                                          Notice: EXECUTED status confirms request was successfully handed to backend execution boundary. Financial recovery outcome is NOT finalized until M10.6 reconciliation.
                                        </span>
                                      </div>
                                    )}
                                    {/* Milestone 10.14 — Governed Execution Outcome Correlation & Accountability Engine */}
                                    {(() => {
                                      const accountabilityTrace = buildRecoveryLifecycleExecutionAccountability(
                                        activeLc,
                                        authEval,
                                        handoffExecutionResult || handoffEval,
                                        { currentMerchantId: activeMerchantId }
                                      );

                                      if (!accountabilityTrace) return null;

                                      return (
                                        <div className="mt-3 p-3 bg-slate-950 rounded-xl border border-indigo-700/80 space-y-2.5 font-sans">
                                          <div className="flex items-center justify-between border-b border-indigo-800/40 pb-1.5 flex-wrap gap-2">
                                            <div className="flex items-center gap-2">
                                              <Layers className="h-4 w-4 text-indigo-400" />
                                              <span className="text-[10px] font-bold text-white uppercase tracking-wider font-mono">
                                                M10.14 GOVERNED EXECUTION OUTCOME CORRELATION & ACCOUNTABILITY ENGINE
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-extrabold border ${
                                                accountabilityTrace.correlationStatus === 'CORRELATED' ? 'bg-indigo-950 text-indigo-300 border-indigo-800' :
                                                accountabilityTrace.correlationStatus === 'PARTIALLY_CORRELATED' ? 'bg-purple-950 text-purple-300 border-purple-800' :
                                                'bg-rose-950 text-rose-300 border-rose-800'
                                              }`}>
                                                CORRELATION: {accountabilityTrace.correlationStatus}
                                              </span>
                                              <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-extrabold border ${
                                                accountabilityTrace.accountabilityStatus === 'OUTCOME_CONSISTENT' ? 'bg-emerald-950 text-emerald-300 border-emerald-800' :
                                                accountabilityTrace.accountabilityStatus === 'OUTCOME_PENDING' ? 'bg-amber-950 text-amber-300 border-amber-800' :
                                                accountabilityTrace.accountabilityStatus === 'HANDOFF_FAILED' ? 'bg-slate-900 text-slate-400 border-slate-700' :
                                                'bg-rose-950 text-rose-300 border-rose-800'
                                              }`}>
                                                ACCOUNTABILITY: {accountabilityTrace.accountabilityStatus}
                                              </span>
                                            </div>
                                          </div>

                                          {/* 5-Stage Visual Correlation Pipeline (Pure Observational View) */}
                                          <div className="space-y-1">
                                            <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider block">END-TO-END GOVERNANCE CORRELATION PIPELINE:</span>
                                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-[10px] font-mono">
                                              <div className="bg-slate-900 p-2 rounded border border-slate-800 space-y-0.5">
                                                <span className="text-slate-400 block text-[8px] uppercase">1. Authorization</span>
                                                <span className={`font-bold block truncate ${accountabilityTrace.authorizationIdentity?.isAuthorized ? 'text-emerald-400' : 'text-slate-400'}`}>
                                                  {accountabilityTrace.authorizationIdentity?.authorizationStatus || 'N/A'}
                                                </span>
                                              </div>
                                              <div className="bg-slate-900 p-2 rounded border border-slate-800 space-y-0.5">
                                                <span className="text-slate-400 block text-[8px] uppercase">2. Handoff</span>
                                                <span className={`font-bold block truncate ${accountabilityTrace.executionHandoffIdentity?.valid ? 'text-cyan-400' : 'text-slate-400'}`}>
                                                  {accountabilityTrace.executionHandoffIdentity?.handoffStatus || 'N/A'}
                                                </span>
                                              </div>
                                              <div className="bg-slate-900 p-2 rounded border border-slate-800 space-y-0.5">
                                                <span className="text-slate-400 block text-[8px] uppercase">3. Backend Event</span>
                                                <span className={`font-bold block truncate ${accountabilityTrace.backendExecutionIdentity?.observed ? 'text-indigo-300' : 'text-amber-400'}`}>
                                                  {accountabilityTrace.backendExecutionIdentity?.observed ? 'OBSERVED' : 'UNOBSERVED'}
                                                </span>
                                              </div>
                                              <div className="bg-slate-900 p-2 rounded border border-slate-800 space-y-0.5">
                                                <span className="text-slate-400 block text-[8px] uppercase">4. Reconciliation</span>
                                                <span className="font-bold text-indigo-300 block truncate">
                                                  {accountabilityTrace.reconciliationIdentity?.reconciliationStatus || 'PENDING'}
                                                </span>
                                              </div>
                                              <div className="bg-slate-900 p-2 rounded border border-slate-800 space-y-0.5">
                                                <span className="text-slate-400 block text-[8px] uppercase">5. Finalization</span>
                                                <span className={`font-bold block truncate ${accountabilityTrace.finalizationIdentity?.terminal ? 'text-emerald-400' : 'text-slate-300'}`}>
                                                  {accountabilityTrace.finalizationIdentity?.closureStatus || 'OPEN'}
                                                </span>
                                              </div>
                                            </div>
                                          </div>

                                          {/* Explanation & Telemetry Evidence */}
                                          <div className="bg-slate-900 p-2.5 rounded border border-slate-800 space-y-1 font-mono text-[10px]">
                                            <div className="flex items-center justify-between text-indigo-300">
                                              <span>ACCOUNTABILITY EXPLANATION:</span>
                                              <span className="font-bold text-white">{accountabilityTrace.explanation?.summary}</span>
                                            </div>
                                            <p className="text-[10px] text-slate-300 font-sans leading-relaxed pt-0.5">
                                              {accountabilityTrace.explanation?.detailedReason}
                                            </p>
                                            <span className="text-[9px] text-amber-400 italic block mt-1">
                                              Notice: M10.14 provides pure observational accountability correlation. Zero payment executions, state mutations, or autonomous triggers are performed.
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                );
                              })()}
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })()}

                  {/* Transition History Sequence */}
                  <div className="space-y-2">
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">ALL RECORDED TRANSITION STEPS:</div>
                    {activeLc.transitions.map((t, idx) => {
                      const isReplayedStep = idx === selectedStepIndex;
                      return (
                        <div 
                          key={idx} 
                          onClick={() => setSelectedStepIndex(idx)}
                          className={`p-2.5 rounded text-xs flex items-center justify-between flex-wrap gap-2 cursor-pointer transition-all border ${
                            isReplayedStep ? 'bg-indigo-950/80 border-cyan-500 shadow-md ring-1 ring-cyan-500/50' : 'bg-slate-900/80 border-slate-800 hover:bg-slate-800/60'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold ${isReplayedStep ? 'text-cyan-400 font-black' : 'text-slate-500'}`}>{idx + 1}.</span>
                            <span className="text-[10px] text-slate-400">{formatTimestamp(t.timestamp)}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-950 border border-slate-800 text-cyan-300">
                              {t.previousState} &rarr; {t.nextState}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                              t.allowed ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-rose-950 text-rose-300 border-rose-800'
                            }`}>
                              {t.transitionType}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-300 flex items-center gap-3">
                            <span className="text-slate-400">Actor: <span className="text-indigo-300 font-semibold">{t.actor}</span></span>
                            <span className="text-slate-400">Source: <span className="text-cyan-300 font-semibold">{t.source}</span></span>
                            <span className="text-slate-300 italic max-w-xs truncate" title={t.reason}>{t.reason}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-slate-500 font-mono">
            No recovery lifecycle audit records found for the current merchant.
          </div>
        )}
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
