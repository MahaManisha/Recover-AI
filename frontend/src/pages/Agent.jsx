import React, { useMemo, useState } from 'react';
import { 
  Bot, 
  Sparkles, 
  Activity, 
  AlertTriangle, 
  TrendingUp, 
  Zap, 
  CheckCircle2, 
  ShieldCheck, 
  Cpu, 
  Layers,
  Sliders,
  RotateCcw,
  Check,
  History,
  AlertCircle
} from 'lucide-react';
import { 
  getAgentConsoleState, 
  getAgentPolicyDefaults, 
  evaluateAgentPolicy, 
  createAgentOverride, 
  createPolicyAuditEntry 
} from '../services/agentConsoleStream';
import { useRecovery } from '../context/RecoveryContext';

/**
 * RecoverAI Autonomous Agent Console — RecoverAI M6 Page 2 Part 2
 * Includes Telemetry summary, Decision Pipeline visualizer, Agent Policy Control Panel,
 * Manual Action Override Simulator, and Policy/Override Audit Trail.
 * 
 * STRICT BOUNDARY:
 * - Internal / Operator view.
 * - Pure simulation view driven by React memory state.
 * - 0 external side effects, 0 DB calls, 0 storage writes.
 */
export function Agent() {
  const { activeRecoverySession } = useRecovery();

  console.log('[Agent] activeRecoverySession', {
    currentStatus: activeRecoverySession?.currentStatus,
    customerId: activeRecoverySession?.customerId,
    amount: activeRecoverySession?.amount,
    failureCode: activeRecoverySession?.failureCode,
    hasOutcome: Boolean(activeRecoverySession?.recoveryOutcome),
    timestamp: activeRecoverySession?.lastUpdated
  });

  const baseConsoleState = useMemo(() => getAgentConsoleState(activeRecoverySession), [activeRecoverySession]);

  // Policy state in React memory
  const [policy, setPolicy] = useState(() => getAgentPolicyDefaults());

  // Selected action override input state
  const [selectedOverrideAction, setSelectedOverrideAction] = useState('KEEP_RECOMMENDATION');

  // Applied override result state
  const [activeOverride, setActiveOverride] = useState(null);

  // Audit trail list state
  const [auditTrail, setAuditTrail] = useState([
    {
      auditId: 'audit_init_001',
      type: 'POLICY_INITIALIZED',
      previousValue: 'N/A',
      newValue: 'Auto-Outreach: ENABLED, Min-Threshold: HIGH, Max-Retries: 1',
      source: 'OPERATOR_SIMULATION',
      timestamp: new Date().toISOString()
    }
  ]);

  // Dynamically evaluated policy result
  const evalResult = useMemo(() => {
    return evaluateAgentPolicy(baseConsoleState, policy);
  }, [baseConsoleState, policy]);

  // Current effective action considering active override or policy evaluation
  const effectiveAction = activeOverride ? activeOverride.overrideAction : evalResult.evaluatedAction;

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  // Policy Change Handlers with Audit Logging
  const handleToggleAutoOutreach = () => {
    const nextVal = !policy.autoOutreachEnabled;
    const prevVal = policy.autoOutreachEnabled ? 'ENABLED' : 'DISABLED';
    const newValStr = nextVal ? 'ENABLED' : 'DISABLED';
    
    setPolicy(prev => ({ ...prev, autoOutreachEnabled: nextVal }));
    
    const audit = createPolicyAuditEntry(prevVal, newValStr, 'POLICY_AUTO_OUTREACH');
    setAuditTrail(prev => [audit, ...prev]);
  };

  const handleChangeThreshold = (newThreshold) => {
    const prevVal = policy.minPriorityThreshold;
    setPolicy(prev => ({ ...prev, minPriorityThreshold: newThreshold }));
    
    const audit = createPolicyAuditEntry(prevVal, newThreshold, 'POLICY_PRIORITY_THRESHOLD');
    setAuditTrail(prev => [audit, ...prev]);
  };

  const handleChangeRetryLimit = (newLimit) => {
    const prevVal = policy.maxRetryLimit;
    const numLimit = Number(newLimit);
    setPolicy(prev => ({ ...prev, maxRetryLimit: numLimit }));
    
    const audit = createPolicyAuditEntry(prevVal, numLimit, 'POLICY_RETRY_LIMIT');
    setAuditTrail(prev => [audit, ...prev]);
  };

  // Apply Override Handler
  const handleApplyOverride = () => {
    const result = createAgentOverride(evalResult, selectedOverrideAction);
    setActiveOverride(result);

    const audit = createPolicyAuditEntry(
      evalResult.evaluatedAction, 
      result.overrideAction, 
      'MANUAL_ACTION_OVERRIDE'
    );
    setAuditTrail(prev => [audit, ...prev]);
  };

  // Reset Override Handler
  const handleResetOverride = () => {
    setActiveOverride(null);
    setSelectedOverrideAction('KEEP_RECOMMENDATION');

    const audit = createPolicyAuditEntry(
      effectiveAction, 
      evalResult.evaluatedAction, 
      'RESET_ACTION_OVERRIDE'
    );
    setAuditTrail(prev => [audit, ...prev]);
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 text-left">
      
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        
        {/* Status Badges */}
        <div className="flex items-center justify-between flex-wrap gap-2 relative z-10">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-cyan-950 text-cyan-300 border border-cyan-800/80 shadow-md">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              {baseConsoleState.agentStatus}
            </span>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-950/80 text-indigo-300 border border-indigo-800/60">
              <Cpu className="h-3.5 w-3.5 text-indigo-400" />
              {baseConsoleState.mode}
            </span>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800/80 text-slate-300 border border-slate-700">
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
            Simulated Agent Console — Demo Environment
          </span>
        </div>

        {/* Title */}
        <div className="space-y-1 relative z-10">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Bot className="h-7 w-7 text-cyan-400" />
            RecoverAI Autonomous Agent
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
            Real-time autonomous recovery agent telemetry, decision stream evaluation, policy control, and manual override simulation.
          </p>
        </div>
      </div>

      {/* Telemetry Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Card 1: Evaluated Failed Payments */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg space-y-2 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Evaluated Failed Payments</span>
            <div className="h-8 w-8 rounded-lg bg-rose-950/80 border border-rose-800/60 flex items-center justify-center text-rose-400">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <div className="pt-1">
            <span className="text-2xl font-extrabold text-white tracking-tight block">
              {baseConsoleState.evaluatedFailedPayments}
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5 block font-medium">
              Opportunities detected & evaluated
            </span>
          </div>
        </div>

        {/* Card 2: Recommended Action Strategy */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg space-y-2 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Recommended Strategy</span>
            <div className="h-8 w-8 rounded-lg bg-indigo-950/80 border border-indigo-800/60 flex items-center justify-center text-indigo-400">
              <Zap className="h-4 w-4" />
            </div>
          </div>
          <div className="pt-1">
            <span className="text-lg sm:text-xl font-extrabold text-indigo-300 tracking-tight block break-words">
              {effectiveAction}
            </span>
            <span className="text-[11px] text-indigo-400/90 mt-0.5 block font-medium truncate">
              {activeOverride ? 'Manual Operator Override Active' : evalResult.policyReason}
            </span>
          </div>
        </div>

        {/* Card 3: Auto-Execution Stream */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg space-y-2 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Auto-Execution Stream</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="pt-1">
            <span className="text-2xl font-extrabold text-emerald-300 tracking-tight block">
              {activeOverride ? activeOverride.overrideStatus : baseConsoleState.executionStreamStatus}
            </span>
            <span className="text-[11px] text-emerald-400/90 mt-0.5 block font-medium">
              Simulated execution pipeline
            </span>
          </div>
        </div>

      </div>

      {/* M6 Page 2 Part 2 — Agent Policy Control Panel & Action Override Simulator Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Panel 1: AGENT POLICY CONTROLS */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Sliders className="h-5 w-5 text-indigo-400" />
              <h2 className="text-base font-bold text-white tracking-tight">AGENT POLICY CONTROLS</h2>
            </div>
            <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800">
              Config Memory
            </span>
          </div>

          <div className="space-y-4 text-xs">
            
            {/* Control A: Auto-Outreach Toggle */}
            <div className="flex items-center justify-between bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
              <div>
                <span className="font-bold text-white block">Auto-Outreach Engine</span>
                <span className="text-[11px] text-slate-400 block">Automated customer outreach recovery</span>
              </div>
              <button
                type="button"
                onClick={handleToggleAutoOutreach}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer border ${
                  policy.autoOutreachEnabled
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800 hover:bg-emerald-900'
                    : 'bg-rose-950 text-rose-300 border-rose-800 hover:bg-rose-900'
                }`}
              >
                {policy.autoOutreachEnabled ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>

            {/* Control B: Priority Threshold */}
            <div className="flex items-center justify-between bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
              <div>
                <span className="font-bold text-white block">Min Priority Threshold</span>
                <span className="text-[11px] text-slate-400 block">Minimum urgency score required</span>
              </div>
              <select
                value={policy.minPriorityThreshold}
                onChange={(e) => handleChangeThreshold(e.target.value)}
                className="bg-slate-900 text-cyan-300 font-extrabold text-xs px-3 py-1.5 rounded-lg border border-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="LOW" className="bg-slate-900 text-white">LOW</option>
                <option value="MEDIUM" className="bg-slate-900 text-white">MEDIUM</option>
                <option value="HIGH" className="bg-slate-900 text-cyan-300">HIGH</option>
                <option value="CRITICAL" className="bg-slate-900 text-rose-400">CRITICAL</option>
              </select>
            </div>

            {/* Control C: Maximum Retry Limit */}
            <div className="flex items-center justify-between bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
              <div>
                <span className="font-bold text-white block">Maximum Retry Limit</span>
                <span className="text-[11px] text-slate-400 block">Max customer retry attempts allowed</span>
              </div>
              <select
                value={policy.maxRetryLimit}
                onChange={(e) => handleChangeRetryLimit(e.target.value)}
                className="bg-slate-900 text-white font-bold text-xs px-3 py-1.5 rounded-lg border border-slate-700 focus:outline-none cursor-pointer"
              >
                <option value={0}>0 attempts</option>
                <option value={1}>1 attempt (Default)</option>
                <option value={2}>2 attempts</option>
                <option value={3}>3 attempts</option>
              </select>
            </div>

            {/* Policy Evaluation Output Feedback */}
            <div className="p-3 rounded-lg border border-indigo-900/60 bg-indigo-950/40 text-[11px] text-indigo-300 space-y-1">
              <span className="font-bold block uppercase tracking-wider text-[10px] text-indigo-400">Evaluated Agent Decision</span>
              <p className="leading-relaxed font-mono font-medium">
                Recommendation: <span className="font-extrabold text-white">{evalResult.evaluatedAction}</span>
              </p>
              <p className="text-slate-400 text-[10.5px]">Reason: {evalResult.policyReason}</p>
            </div>

          </div>
        </div>

        {/* Panel 2: ACTION OVERRIDE SIMULATOR */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-cyan-400" />
              <h2 className="text-base font-bold text-white tracking-tight">ACTION OVERRIDE SIMULATOR</h2>
            </div>
            <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
              Operator Control
            </span>
          </div>

          <div className="space-y-4 text-xs">
            
            {/* Current Evaluated Action Banner */}
            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-1">
              <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider block">Current Agent Recommendation</span>
              <span className="text-base font-extrabold text-teal-300 block">{evalResult.evaluatedAction}</span>
            </div>

            {/* Override Action Select */}
            <div className="space-y-2">
              <label className="text-slate-300 font-semibold block">Select Manual Override Action:</label>
              <select
                value={selectedOverrideAction}
                onChange={(e) => setSelectedOverrideAction(e.target.value)}
                className="w-full bg-slate-950 text-white font-bold text-xs p-3 rounded-xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-400 cursor-pointer"
              >
                <option value="KEEP_RECOMMENDATION">KEEP_RECOMMENDATION (Use Agent Recommendation)</option>
                <option value="RECOVERY_OUTREACH">RECOVERY_OUTREACH (Send Outreach Message)</option>
                <option value="MONITOR">MONITOR (Observe Opportunity without Outreach)</option>
                <option value="NO_ACTION">NO_ACTION (Dismiss Opportunity)</option>
                <option value="MANUAL_REVIEW">MANUAL_REVIEW (Escalate to Human Agent)</option>
              </select>
            </div>

            {/* Override Action Controls */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleApplyOverride}
                className="flex-1 py-2.5 px-4 rounded-xl bg-cyan-950 hover:bg-cyan-900 text-cyan-300 hover:text-white font-bold text-xs border border-cyan-800 transition-all cursor-pointer shadow-lg"
              >
                Apply Override
              </button>

              {activeOverride && (
                <button
                  type="button"
                  onClick={handleResetOverride}
                  className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700 transition-all cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>

            {/* Active Override Result Box */}
            {activeOverride && (
              <div className="bg-amber-950/40 border border-amber-800/80 rounded-xl p-3.5 space-y-2 font-mono text-[11px]">
                <div className="flex items-center justify-between text-amber-300 font-bold border-b border-amber-900/60 pb-1.5">
                  <span className="flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
                    Simulated Override Result
                  </span>
                  <span className="text-[10px] bg-amber-950 px-2 py-0.5 rounded border border-amber-800">
                    {activeOverride.overrideStatus}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-300 pt-1">
                  <div>
                    <span className="text-slate-500 block text-[9.5px]">Original Recommendation:</span>
                    <span className="font-bold text-white">{activeOverride.originalRecommendation}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9.5px]">Override Action:</span>
                    <span className="font-extrabold text-amber-300">{activeOverride.overrideAction}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9.5px]">Operator Intervention:</span>
                    <span className="font-bold text-white">{activeOverride.operatorIntervention}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9.5px]">Timestamp:</span>
                    <span className="text-slate-400">{new Date(activeOverride.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>

      {/* Decision Pipeline Section */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-xl space-y-5">
        
        {/* Section Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white tracking-tight">Autonomous Recovery Decision Pipeline</h2>
          </div>
          <span className="text-[11px] text-slate-400 bg-slate-950 px-2.5 py-1 rounded border border-slate-800 font-mono">
            {baseConsoleState.pipeline.length} Sequential Stages
          </span>
        </div>

        {/* Decision Flow Timeline */}
        <div className="space-y-4">
          {baseConsoleState.pipeline.map((stage) => {
            const isActionStage = stage.stageCode === 'ACTION_PLANNING';
            const displayAction = isActionStage ? effectiveAction : stage.details.recommendedAction;

            return (
              <div 
                key={stage.stageCode} 
                className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-3 relative hover:border-slate-700 transition-all"
              >
                {/* Stage Header */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <div className="h-7 w-7 rounded-full bg-slate-900 border border-slate-700 text-cyan-400 text-xs font-bold flex items-center justify-center font-mono">
                      0{stage.stageNumber}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white tracking-tight">{stage.stage}</h3>
                      <span className="text-[10px] font-mono text-slate-400">{stage.event}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-extrabold ${
                      stage.status === 'SIMULATED' || activeOverride
                        ? 'bg-amber-950 text-amber-300 border border-amber-800/80'
                        : 'bg-cyan-950 text-cyan-300 border border-cyan-800/80'
                    }`}>
                      <CheckCircle2 className="h-3 w-3" />
                      {activeOverride && isActionStage ? 'OVERRIDDEN' : stage.status}
                    </span>
                  </div>
                </div>

                {/* Stage Summary */}
                <p className="text-xs text-slate-300 leading-relaxed pl-10">
                  {stage.summary}
                </p>

                {/* Stage Details Pills */}
                <div className="pl-10 flex flex-wrap gap-2 text-[11px] font-mono pt-1">
                  {Object.entries(stage.details).map(([key, val]) => {
                    const renderVal = key === 'recommendedAction' ? displayAction : val;
                    return (
                      <div key={key} className="bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-md text-slate-300 flex items-center gap-1">
                        <span className="text-slate-500 uppercase text-[9px] font-sans font-semibold">{key}:</span>
                        <span className={`font-bold ${
                          renderVal === 'CRITICAL' ? 'text-rose-400' :
                          renderVal === 'RECOVERY_OUTREACH' ? 'text-teal-300' :
                          renderVal === 'SIMULATED_SUCCESS' ? 'text-emerald-300' :
                          renderVal === 'MONITOR' ? 'text-amber-300' :
                          'text-cyan-300'
                        }`}>
                          {typeof renderVal === 'number' && key.toLowerCase().includes('amount') ? formatCurrency(renderVal) : String(renderVal)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* M6 Page 2 Part 2 — Policy & Override Audit Trail Section */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-indigo-400" />
            <h2 className="text-base font-bold text-white tracking-tight">POLICY & OVERRIDE AUDIT TRAIL</h2>
          </div>
          <span className="text-[11px] text-slate-400 bg-slate-950 px-2.5 py-1 rounded border border-slate-800 font-mono">
            {auditTrail.length} Logged Entries
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[650px]">
            <thead>
              <tr className="border-b border-slate-800/80 text-slate-400 uppercase text-[10px] font-semibold tracking-wider bg-slate-950/60">
                <th className="py-2.5 px-3">Audit ID</th>
                <th className="py-2.5 px-3">Event Type</th>
                <th className="py-2.5 px-3">Previous Value</th>
                <th className="py-2.5 px-3">New Value</th>
                <th className="py-2.5 px-3">Source</th>
                <th className="py-2.5 px-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200 font-mono text-[11px]">
              {auditTrail.map((entry) => (
                <tr key={entry.auditId} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-cyan-300">{entry.auditId}</td>
                  <td className="py-2.5 px-3 font-sans font-bold text-white">{entry.type}</td>
                  <td className="py-2.5 px-3 text-slate-400">{entry.previousValue}</td>
                  <td className="py-2.5 px-3 text-emerald-300 font-bold">{entry.newValue}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] text-indigo-300 font-sans font-semibold">
                      {entry.source}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                    {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Safety Disclaimer Banner */}
        <div className="pt-2">
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 flex items-center gap-2 text-[11px] font-semibold text-slate-400">
            <ShieldCheck className="h-4 w-4 shrink-0 text-cyan-400" />
            <span>Simulation only — policy changes and overrides do not execute external recovery actions.</span>
          </div>
        </div>

      </div>

    </div>
  );
}
