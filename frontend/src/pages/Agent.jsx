import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { 
  Bot, 
  Sparkles, 
  Activity, 
  TrendingUp, 
  Zap, 
  CheckCircle2, 
  ShieldCheck, 
  Cpu, 
  Clock,
  Inbox,
  AlertTriangle,
  Play,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Layers,
  Brain,
  GitCommit
} from 'lucide-react';
import { 
  getAgentConsoleState, 
  executeAgentAction,
  evaluateAgentDecision,
  evaluateAutonomyEligibility,
  getCandidateIdentity,
  getCandidateLockStatus,
  evaluateStrategyPerformance,
  evaluateRecoveryStrategy,
  optimizeRecoveryStrategy,
  evaluateRecoveryLearning,
  buildRecoveryDecisionTrace,
  evaluateRecoveryOutcomeFeedback,
  buildRecoveryIntelligenceControlCenter,
  prioritizeRecoveryCases,
  scheduleRecoveryDecisions,
  orchestrateRecoveryDecision,
  evaluateGuardedRecoveryDispatch,
  reconcileRecoveryExecutionOutcome,
  finalizeRecoveryLifecycle,
  evaluateRecoveryLifecycleTransition,
  getCanonicalLifecycleState,
  buildRecoveryLifecycleHistory,
  buildRecoveryLifecycleReplay,
  buildRecoveryLifecycleAnomalyDiagnostic
} from '../services/agentConsoleStream';
import { useRecovery } from '../context/RecoveryContext';
import { useAuth } from '../context/AuthContext';
import { 
  fetchBackendRecoveryEvents, 
  fetchMerchantAutonomy, 
  updateMerchantAutonomy 
} from '../services/api';

/**
 * RecoverAI Agent Console — Milestone 9.3
 * Durable Autonomous Execution Safety & Configuration.
 * Autonomy configuration is persisted in backend database per merchant.
 * Autonomy is DISABLED by default. Supports durable execution safety, refresh idempotency,
 * and fail-safe defaults (disabled on API error).
 */
export function Agent() {
  const { user } = useAuth();
  const { 
    activeRecoverySession, 
    recoveryEvents, 
    activeMerchantId, 
    setActiveRecoverySession, 
    appendRecoveryEvent,
    appendAuditLog
  } = useRecovery();

  const currentMerchantId = user?.merchantId || user?.id || activeMerchantId || '0a9a09a5-ef18-45da-a0ce-7c5f0f23a991';

  const [dbEvents, setDbEvents] = useState([]);
  const [executionState, setExecutionState] = useState('IDLE'); // 'IDLE' | 'EXECUTING' | 'SUCCEEDED' | 'FAILED' | 'BLOCKED'
  const [executionMode, setExecutionMode] = useState('MANUAL'); // 'MANUAL' | 'AUTONOMOUS'
  const [executionMessage, setExecutionMessage] = useState(null);
  const [localExecutionLogs, setLocalExecutionLogs] = useState([]);
  const [autonomyEnabled, setAutonomyEnabled] = useState(false); // M9.1/M9.2/M9.3 Default: DISABLED
  const [autonomyLoading, setAutonomyLoading] = useState(true);
  const [executedCandidates, setExecutedCandidates] = useState(new Set());
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [agentStepIndex, setAgentStepIndex] = useState(0);

  // Load persistent merchant autonomy configuration from database
  const loadAutonomyConfig = useCallback(async () => {
    if (!currentMerchantId) return;
    setAutonomyLoading(true);
    try {
      const res = await fetchMerchantAutonomy(currentMerchantId);
      if (res && res.success && res.data) {
        setAutonomyEnabled(Boolean(res.data.autonomyEnabled));
      } else {
        setAutonomyEnabled(false); // Fail-safe default: DISABLED
      }
    } catch (err) {
      console.error('[Agent Console M9.3] Error loading merchant autonomy config:', err);
      setAutonomyEnabled(false); // Fail-safe default: DISABLED
    } finally {
      setAutonomyLoading(false);
    }
  }, [currentMerchantId]);

  useEffect(() => {
    loadAutonomyConfig();
  }, [loadAutonomyConfig]);

  // Persistent Autonomy Toggle Handler
  const handleToggleAutonomy = async () => {
    if (autonomyLoading) return;
    const nextState = !autonomyEnabled;
    
    // Optimistic UI state update
    setAutonomyEnabled(nextState);

    try {
      const res = await updateMerchantAutonomy(currentMerchantId, nextState);
      if (res && res.success && res.data) {
        setAutonomyEnabled(Boolean(res.data.autonomyEnabled));
        if (appendAuditLog) {
          appendAuditLog({
            auditId: `aud_auto_cfg_${Date.now()}`,
            eventType: 'AUTONOMY_CONFIGURATION_CHANGED',
            source: 'AGENT_CONSOLE',
            actor: 'Merchant Operator',
            status: 'COMPLETED',
            timestamp: new Date().toISOString(),
            metadata: {
              settingName: 'autonomyEnabled',
              previousValue: String(!nextState),
              newValue: String(nextState),
              merchantId: currentMerchantId,
              details: `Merchant operator ${nextState ? 'ENABLED' : 'DISABLED'} durable autonomous recovery execution.`
            }
          });
        }
      } else {
        console.error('[Agent Console M9.3] Failed to save autonomy config. Reverting to DISABLED.', res?.error);
        setAutonomyEnabled(false); // Fail-safe revert to DISABLED
      }
    } catch (err) {
      console.error('[Agent Console M9.3] Autonomy config update error:', err);
      setAutonomyEnabled(false); // Fail-safe revert to DISABLED
    }
  };

  const refreshBackendEvents = useCallback(async () => {
    if (!currentMerchantId) return;
    try {
      const res = await fetchBackendRecoveryEvents(currentMerchantId);
      if (res && res.success && Array.isArray(res.data)) {
        setDbEvents(res.data);
      }
    } catch (err) {
      console.error('[Agent Console] Error fetching backend recovery events:', err);
    }
  }, [currentMerchantId]);

  useEffect(() => {
    refreshBackendEvents();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshBackendEvents();
      }
    };

    const handleFocus = () => {
      refreshBackendEvents();
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    const interval = setInterval(refreshBackendEvents, 1500);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, [refreshBackendEvents]);

  const baseConsoleState = useMemo(() => {
    return getAgentConsoleState(activeRecoverySession, recoveryEvents, dbEvents, currentMerchantId, autonomyEnabled);
  }, [activeRecoverySession, recoveryEvents, dbEvents, currentMerchantId, autonomyEnabled]);

  const strategyPerformance = useMemo(() => {
    return evaluateStrategyPerformance(dbEvents, recoveryEvents, currentMerchantId);
  }, [dbEvents, recoveryEvents, currentMerchantId]);

  const decisionTrace = useMemo(() => {
    const activeCase = baseConsoleState.activeCase || baseConsoleState.activeCases?.[0] || null;
    if (!baseConsoleState.hasActiveCase || !activeCase) return null;

    const allCasesList = baseConsoleState.allCases || baseConsoleState.activeCases || [];
    const targetCase = selectedCaseId
      ? (allCasesList.find(c => c.caseId === selectedCaseId) || activeCase)
      : activeCase;

    const baseStrat = evaluateRecoveryStrategy(targetCase);
    const adaptiveStrat = optimizeRecoveryStrategy(targetCase, baseStrat, strategyPerformance);
    const learningRes = evaluateRecoveryLearning(strategyPerformance, adaptiveStrat, dbEvents, targetCase);

    return buildRecoveryDecisionTrace(
      targetCase,
      baseStrat,
      adaptiveStrat,
      learningRes,
      { status: baseConsoleState.agentDecision?.policyStatus || 'ALLOWED', reason: baseConsoleState.agentDecision?.policyReason },
      { mode: executionMode, status: targetCase.status === 'RECOVERED' ? 'SUCCEEDED' : 'IDLE', actor: executionMode === 'AUTONOMOUS' ? 'Autonomous AI Agent' : 'Merchant Operator' },
      { status: targetCase.status }
    );
  }, [baseConsoleState, selectedCaseId, strategyPerformance, dbEvents, executionMode]);

  const outcomeFeedback = useMemo(() => {
    if (!decisionTrace) return null;
    return evaluateRecoveryOutcomeFeedback(
      decisionTrace,
      { status: decisionTrace.lifecycleOutcome?.finalState || 'FAILED' },
      strategyPerformance,
      currentMerchantId
    );
  }, [decisionTrace, strategyPerformance, currentMerchantId]);

  const controlCenterModel = useMemo(() => {
    return buildRecoveryIntelligenceControlCenter(dbEvents, currentMerchantId, activeRecoverySession, autonomyEnabled);
  }, [dbEvents, currentMerchantId, activeRecoverySession, autonomyEnabled]);

  const prioritizedQueue = useMemo(() => {
    const allCasesList = baseConsoleState.allCases || baseConsoleState.activeCases || [];
    const activeCases = allCasesList.filter(c => c.status !== 'RECOVERED' && c.status !== 'SUCCESS');
    return prioritizeRecoveryCases(
      activeCases,
      strategyPerformance,
      currentMerchantId,
      { status: baseConsoleState.agentDecision?.policyStatus || 'ALLOWED' },
      autonomyEnabled
    );
  }, [baseConsoleState.allCases, baseConsoleState.activeCases, strategyPerformance, currentMerchantId, baseConsoleState.agentDecision, autonomyEnabled]);

  const decisionSchedule = useMemo(() => {
    return scheduleRecoveryDecisions(
      prioritizedQueue,
      strategyPerformance,
      null,
      { status: baseConsoleState.agentDecision?.policyStatus || 'ALLOWED' },
      autonomyEnabled
    );
  }, [prioritizedQueue, strategyPerformance, baseConsoleState.agentDecision, autonomyEnabled]);

  const orchestratedDecision = useMemo(() => {
    const selectedCase = (prioritizedQueue?.queue || []).find(c => c.caseId === selectedCaseId) || prioritizedQueue?.queue?.[0] || null;
    if (!selectedCase) return null;

    const selectedSched = (decisionSchedule?.scheduledCases || []).find(c => c.caseId === selectedCaseId) || decisionSchedule?.scheduledCases?.[0] || null;
    const baseStrat = selectedCase ? evaluateRecoveryStrategy(selectedCase) : null;
    const optStrat = selectedCase ? optimizeRecoveryStrategy(selectedCase, baseStrat, strategyPerformance) : null;
    const learnRes = selectedCase ? evaluateRecoveryLearning(strategyPerformance, optStrat, dbEvents, selectedCase) : null;
    const feedbackRes = decisionTrace ? evaluateRecoveryOutcomeFeedback(decisionTrace, { status: selectedCase?.originalCase?.status }, strategyPerformance, currentMerchantId) : null;

    return orchestrateRecoveryDecision(
      selectedCase,
      selectedSched,
      baseStrat,
      optStrat,
      learnRes,
      feedbackRes,
      { status: baseConsoleState.agentDecision?.policyStatus || 'ALLOWED' },
      { eligible: autonomyEnabled, executionMode: autonomyEnabled ? 'AUTONOMOUS' : 'MANUAL' },
      { status: executionState },
      { status: selectedCase?.originalCase?.status },
      currentMerchantId
    );
  }, [prioritizedQueue, decisionSchedule, selectedCaseId, strategyPerformance, dbEvents, decisionTrace, baseConsoleState.agentDecision, autonomyEnabled, executionState, currentMerchantId]);

  const guardedDispatch = useMemo(() => {
    const selectedCase = (prioritizedQueue?.queue || []).find(c => c.caseId === selectedCaseId) || prioritizedQueue?.queue?.[0] || null;
    if (!selectedCase || !orchestratedDecision) return null;

    const selectedSched = (decisionSchedule?.scheduledCases || []).find(c => c.caseId === selectedCaseId) || decisionSchedule?.scheduledCases?.[0] || null;

    return evaluateGuardedRecoveryDispatch(
      orchestratedDecision,
      selectedCase,
      selectedSched,
      { status: baseConsoleState.agentDecision?.policyStatus || 'ALLOWED' },
      { eligible: autonomyEnabled, executionMode: autonomyEnabled ? 'AUTONOMOUS' : 'MANUAL' },
      { status: executionState },
      { status: selectedCase?.originalCase?.status },
      currentMerchantId,
      autonomyEnabled ? 'AUTONOMOUS' : 'MANUAL'
    );
  }, [orchestratedDecision, prioritizedQueue, decisionSchedule, selectedCaseId, baseConsoleState.agentDecision, autonomyEnabled, executionState, currentMerchantId]);

  const reconciliationOutcome = useMemo(() => {
    const selectedCase = (prioritizedQueue?.queue || []).find(c => c.caseId === selectedCaseId) || prioritizedQueue?.queue?.[0] || null;
    if (!selectedCase) return null;

    const backendLifecycle = (dbEvents || []).find(e => (e.activityId || e.id || e.paymentAttemptId) === (selectedCase?.activityId || selectedCase?.paymentAttemptId || selectedCaseId)) || selectedCase?.originalCase || null;
    
    const execResult = executionState === 'SUCCEEDED'
      ? { status: 'SUCCESS', amount: selectedCase?.amountAtRisk || selectedCase?.amount || selectedCase?.originalCase?.amount, mode: autonomyEnabled ? 'AUTONOMOUS' : 'MANUAL', paymentAttemptId: selectedCase?.paymentAttemptId || selectedCase?.originalCase?.paymentAttemptId || selectedCaseId }
      : (executionState === 'FAILED' ? { status: 'FAILED', mode: autonomyEnabled ? 'AUTONOMOUS' : 'MANUAL', paymentAttemptId: selectedCase?.paymentAttemptId || selectedCase?.originalCase?.paymentAttemptId || selectedCaseId } : null);

    return reconcileRecoveryExecutionOutcome(
      guardedDispatch,
      execResult,
      backendLifecycle,
      backendLifecycle,
      currentMerchantId,
      new Date().toISOString()
    );
  }, [guardedDispatch, executionState, prioritizedQueue, selectedCaseId, dbEvents, currentMerchantId, autonomyEnabled]);

  const lifecycleFinalization = useMemo(() => {
    const selectedCase = (prioritizedQueue?.queue || []).find(c => c.caseId === selectedCaseId) || prioritizedQueue?.queue?.[0] || null;
    if (!selectedCase || !reconciliationOutcome) return null;

    const backendLifecycle = (dbEvents || []).find(e => (e.activityId || e.id || e.paymentAttemptId) === (selectedCase?.activityId || selectedCase?.paymentAttemptId || selectedCaseId)) || selectedCase?.originalCase || null;

    return finalizeRecoveryLifecycle(
      reconciliationOutcome,
      backendLifecycle,
      currentMerchantId,
      new Date().toISOString()
    );
  }, [reconciliationOutcome, prioritizedQueue, selectedCaseId, dbEvents, currentMerchantId]);

  const selectedCaseHistory = useMemo(() => {
    const allHistories = buildRecoveryLifecycleHistory(dbEvents, [], currentMerchantId);
    const selectedCase = (prioritizedQueue?.queue || []).find(c => c.caseId === selectedCaseId) || prioritizedQueue?.queue?.[0] || baseConsoleState?.activeCase || null;
    if (!selectedCase) return null;

    const targetId = selectedCase.activityId || selectedCase.paymentAttemptId || selectedCase.caseId;
    const history = (allHistories?.lifecycles || []).find(l => {
      const id = l.lifecycleIdentity;
      return id.activityId === targetId || id.paymentAttemptId === targetId || id.rawCaseId === selectedCase.caseId;
    }) || null;

    return { history, selectedCase };
  }, [dbEvents, currentMerchantId, prioritizedQueue, selectedCaseId, baseConsoleState.activeCase]);

  const selectedCaseReplay = useMemo(() => {
    if (!selectedCaseHistory?.history) return null;
    return buildRecoveryLifecycleReplay(selectedCaseHistory.history, agentStepIndex, currentMerchantId);
  }, [selectedCaseHistory, agentStepIndex, currentMerchantId]);

  const selectedCaseDiagnostic = useMemo(() => {
    if (!selectedCaseHistory?.history) return null;
    return buildRecoveryLifecycleAnomalyDiagnostic(selectedCaseHistory.history, agentStepIndex, currentMerchantId);
  }, [selectedCaseHistory, agentStepIndex, currentMerchantId]);

  // Combine live activity with local execution logs using Map deduplication
  const combinedLiveActivity = useMemo(() => {
    const activityMap = new Map();

    (baseConsoleState.liveActivity || []).forEach(log => {
      activityMap.set(log.id, log);
    });

    localExecutionLogs.forEach(log => {
      activityMap.set(log.id, log);
    });

    return Array.from(activityMap.values());
  }, [baseConsoleState.liveActivity, localExecutionLogs]);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  // Explicit / Controlled Action Execution Handler
  const handleExecuteAction = useCallback(async (targetCaseOverride = null, modeOverride = 'MANUAL') => {
    if (executionState === 'EXECUTING') return; // Idempotency lock

    const targetCase = targetCaseOverride || baseConsoleState.activeCases?.[0];
    const mode = modeOverride || 'MANUAL';

    if (!targetCase) {
      setExecutionState('BLOCKED');
      setExecutionMessage('No active recovery case available for execution.');
      return;
    }

    const candidateKey = getCandidateIdentity(targetCase);

    // Check Candidate Lock Registry
    const existingLock = getCandidateLockStatus(candidateKey);
    if (existingLock && existingLock.state === 'EXECUTING') {
      setExecutionState('BLOCKED');
      setExecutionMessage('Execution already in progress for this recovery lifecycle.');
      return;
    }

    const decision = (targetCaseOverride && targetCaseOverride.caseId !== baseConsoleState.activeCases?.[0]?.caseId)
      ? evaluateAgentDecision(targetCaseOverride)
      : baseConsoleState.agentDecision;

    if (!decision) {
      setExecutionState('BLOCKED');
      setExecutionMessage('No evaluated decision available for target case.');
      return;
    }

    if (decision.policyStatus !== 'ALLOWED') {
      setExecutionState('BLOCKED');
      setExecutionMessage(`Execution blocked by policy: ${decision.policyReason}`);
      return;
    }

    // 1. Lock UI & Transition to EXECUTING
    setExecutionMode(mode);
    setExecutionState('EXECUTING');
    setExecutionMessage(`${mode === 'AUTONOMOUS' ? 'Autonomous agent' : 'Operator'} executing payment retry action for customer ${targetCase.customerId}...`);

    const execLogItem = {
      id: mode === 'AUTONOMOUS' ? `act_auto_exec_${targetCase.caseId}_${Date.now()}` : `act_exec_start_${targetCase.caseId}_${Date.now()}`,
      type: mode === 'AUTONOMOUS' ? 'AUTONOMOUS RECOVERY EXECUTION' : 'RECOVERY ACTION EXECUTING',
      actionType: mode === 'AUTONOMOUS' ? 'AUTONOMOUS RECOVERY EXECUTION' : 'RECOVERY ACTION EXECUTING',
      summary: mode === 'AUTONOMOUS'
        ? `Agent authorized RETRY_PAYMENT under active policy and autonomy controls for customer ${targetCase.customerId} (${targetCase.productName})`
        : `Payment retry execution initiated for customer ${targetCase.customerId} (${targetCase.productName})`,
      timestamp: new Date().toISOString()
    };
    setLocalExecutionLogs(prev => [execLogItem, ...prev]);

    // 2. Invoke executeAgentAction service
    const result = await executeAgentAction(targetCase, decision, currentMerchantId, { 
      executionMode: mode, 
      autonomyEnabled 
    });

    if (result.status === 'SUCCEEDED') {
      // Update RecoveryContext session state
      setActiveRecoverySession(prev => prev ? {
        ...prev,
        currentStatus: 'RECOVERED',
        recoveryOutcome: {
          recoveryId: `recovery_${Date.now()}`,
          status: 'RECOVERED',
          recoveredRevenue: targetCase.amount,
          timestamp: new Date().toISOString()
        }
      } : null);

      appendRecoveryEvent({
        activityId: targetCase.caseId,
        actionType: 'RECOVERY_COMPLETED',
        type: 'RECOVERY COMPLETED',
        summary: `Payment recovered for customer ${targetCase.customerId} (${targetCase.productName}) — ${targetCase.currency} ${targetCase.amount.toLocaleString('en-IN')} saved`,
        status: 'RECOVERED',
        recoveredAmount: targetCase.amount,
        timestamp: new Date().toISOString()
      });

      // Dispatched Compliance Audit Entry for M9.2
      if (appendAuditLog) {
        appendAuditLog({
          auditId: `aud_auto_exec_${targetCase.caseId}_${Date.now()}`,
          eventType: mode === 'AUTONOMOUS' ? 'AUTONOMOUS_RECOVERY_EXECUTION' : 'RECOVERY_EXECUTION',
          source: 'AGENT_CONSOLE',
          actor: mode === 'AUTONOMOUS' ? 'Autonomous AI Agent' : 'Merchant Operator',
          status: 'COMPLETED',
          timestamp: new Date().toISOString(),
          metadata: {
            executionMode: mode,
            merchantId: currentMerchantId,
            customerId: targetCase.customerId,
            productId: targetCase.productId || 'prod_demo',
            productName: targetCase.productName,
            amount: targetCase.amount,
            currency: targetCase.currency,
            action: 'RETRY_PAYMENT',
            policyResult: 'ALLOWED',
            details: mode === 'AUTONOMOUS'
              ? `Agent authorized RETRY_PAYMENT under active policy and autonomy controls. ${formatCurrency(targetCase.amount)} net revenue saved.`
              : `Merchant operator executed manual RETRY_PAYMENT action. ${formatCurrency(targetCase.amount)} net revenue saved.`
          }
        });
      }

      const succLogItem = {
        id: mode === 'AUTONOMOUS' ? `act_auto_succ_${targetCase.caseId}` : `act_exec_succ_${targetCase.caseId}_${Date.now()}`,
        type: 'RECOVERY ACTION SUCCEEDED',
        actionType: 'RECOVERY ACTION SUCCEEDED',
        summary: `${mode === 'AUTONOMOUS' ? 'Autonomous recovery' : 'Recovery'} retry succeeded for customer ${targetCase.customerId} — ${targetCase.currency} ${targetCase.amount.toLocaleString('en-IN')} saved`,
        timestamp: new Date().toISOString()
      };
      setLocalExecutionLogs(prev => [succLogItem, ...prev]);

      setExecutionState('SUCCEEDED');
      setExecutionMessage(result.message || 'Payment retry executed successfully. Lifecycle updated to RECOVERED.');

      refreshBackendEvents();
    } else if (result.status === 'BLOCKED') {
      setExecutionState('BLOCKED');
      setExecutionMessage(result.reason || 'Execution was blocked by safety gates.');
    } else {
      setExecutionState('FAILED');
      setExecutionMessage(result.reason || 'Payment retry execution failed.');

      const failLogItem = {
        id: `act_exec_fail_${targetCase.caseId}_${Date.now()}`,
        type: 'RECOVERY ACTION FAILED',
        actionType: 'RECOVERY ACTION FAILED',
        summary: `Payment retry execution failed for customer ${targetCase.customerId}: ${result.reason}`,
        timestamp: new Date().toISOString()
      };
      setLocalExecutionLogs(prev => [failLogItem, ...prev]);
    }
  }, [executionState, baseConsoleState.activeCases, baseConsoleState.agentDecision, currentMerchantId, autonomyEnabled, setActiveRecoverySession, appendRecoveryEvent, appendAuditLog, refreshBackendEvents]);

  // Controlled Autonomous Execution Detection Loop
  useEffect(() => {
    if (!autonomyEnabled) return;
    if (baseConsoleState.activeCases && baseConsoleState.activeCases.length > 0) {
      baseConsoleState.activeCases.forEach((activeCase) => {
        const candidateKey = getCandidateIdentity(activeCase);
        if (!candidateKey) return;

        // Skip if already executed or locked in memory
        const lock = getCandidateLockStatus(candidateKey);
        if (lock && (lock.state === 'EXECUTING' || lock.state === 'SUCCEEDED')) {
          return;
        }

        const decision = (baseConsoleState.agentDecision && baseConsoleState.agentDecision.caseId === activeCase.caseId)
          ? baseConsoleState.agentDecision
          : evaluateAgentDecision(activeCase);

        const eligibility = evaluateAutonomyEligibility(
          activeCase,
          decision,
          autonomyEnabled,
          currentMerchantId
        );

        if (eligibility.eligible && !executedCandidates.has(candidateKey)) {
          console.log('[Agent Console M9.2] Controlled Autonomous Execution Triggered for Candidate:', candidateKey);
          setExecutedCandidates(prev => new Set(prev).add(candidateKey));
          handleExecuteAction(activeCase, 'AUTONOMOUS');
        }
      });
    }
  }, [autonomyEnabled, baseConsoleState.activeCases, baseConsoleState.agentDecision, currentMerchantId, executedCandidates, handleExecuteAction]);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 text-left">
      
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        
        {/* Status Badges */}
        <div className="flex items-center justify-between flex-wrap gap-3 relative z-10">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-cyan-950 text-cyan-300 border border-cyan-800/80 shadow-md">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              AGENT STATUS: {baseConsoleState.agentStatus}
            </span>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-950/80 text-indigo-300 border border-indigo-800/60">
              <Cpu className="h-3.5 w-3.5 text-indigo-400" />
              {baseConsoleState.mode}
            </span>

            {/* M9.1 / M9.2 / M9.3 Autonomy Status Badge */}
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold border ${
              autonomyLoading
                ? 'bg-slate-950 text-slate-400 border-slate-800'
                : autonomyEnabled
                ? 'bg-emerald-950/90 text-emerald-300 border-emerald-800/80'
                : 'bg-amber-950/80 text-amber-300 border-amber-800/60'
            }`}>
              {autonomyLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
                  <span>AUTONOMY CONFIGURATION LOADING</span>
                </>
              ) : (
                <>
                  <Zap className={`h-3.5 w-3.5 ${autonomyEnabled ? 'text-emerald-400' : 'text-amber-400'}`} />
                  <span>AUTONOMY: {autonomyEnabled ? (baseConsoleState.autonomyEligibility.eligible ? 'AUTONOMOUS READY' : 'AUTONOMY ENABLED') : 'OPERATOR CONTROLLED'}</span>
                </>
              )}
            </span>
          </div>

          {/* Autonomy Mode Control Switch */}
          <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
              AUTONOMY MODE
            </span>
            <button
              type="button"
              onClick={handleToggleAutonomy}
              disabled={autonomyLoading}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold text-xs transition-all border cursor-pointer ${
                autonomyLoading
                  ? 'bg-slate-900 text-slate-500 border-slate-800 cursor-not-allowed'
                  : autonomyEnabled
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-700 hover:bg-emerald-900'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
              }`}
            >
              {autonomyLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              ) : autonomyEnabled ? (
                <>
                  <ToggleRight className="h-4 w-4 text-emerald-400" />
                  <span>ENABLED</span>
                </>
              ) : (
                <>
                  <ToggleLeft className="h-4 w-4 text-slate-400" />
                  <span>DISABLED</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Title & Subtitle */}
        <div className="space-y-1 relative z-10">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Bot className="h-7 w-7 text-cyan-400" />
            AGENT CONSOLE
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
            Autonomous Recovery Agent — Milestone 9.2 Controlled Autonomous Execution
          </p>
        </div>
      </div>

      {/* CONTROL CENTER STATUS & OPERATOR ATTENTION QUEUE */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white tracking-tight">AUTONOMOUS RECOVERY INTELLIGENCE CONTROL CENTER</h2>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-mono font-extrabold border ${
              controlCenterModel?.controlCenterStatus === 'HEALTHY'
                ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                : controlCenterModel?.controlCenterStatus === 'ATTENTION_REQUIRED'
                ? 'bg-amber-950 text-amber-300 border-amber-800'
                : 'bg-slate-950 text-slate-400 border-slate-800'
            }`}>
              STATUS: {controlCenterModel?.controlCenterStatus || 'HEALTHY'}
            </span>
          </div>
        </div>

        {/* Operator Attention Queue */}
        {(controlCenterModel?.operatorAttentionQueue || []).length > 0 && (
          <div className="bg-slate-950/80 border border-amber-900/40 rounded-xl p-4 space-y-3 text-xs">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <span className="font-bold text-amber-300 uppercase tracking-wider">OPERATOR ATTENTION REQUIRED QUEUE</span>
            </div>
            <div className="space-y-2">
              {(controlCenterModel?.operatorAttentionQueue || []).map((item) => (
                <div key={item.id} className="p-3 bg-slate-900/80 border border-slate-800 rounded-lg flex items-start justify-between flex-wrap gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-extrabold border ${
                        item.severity === 'HIGH' || item.severity === 'CRITICAL'
                          ? 'bg-rose-950 text-rose-300 border-rose-800'
                          : item.severity === 'WARNING'
                          ? 'bg-amber-950 text-amber-300 border-amber-800'
                          : 'bg-indigo-950 text-indigo-300 border-indigo-800'
                      }`}>
                        {item.severity}
                      </span>
                      <span className="font-bold text-white">{item.title}</span>
                    </div>
                    <p className="text-slate-300 text-[11px] font-sans">{item.reason}</p>
                  </div>
                  <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950 px-2 py-1 rounded border border-cyan-800">
                    {item.recommendation}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        
        {/* Card 1: ACTIVE RECOVERY CASES */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg space-y-2 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">ACTIVE RECOVERY CASES</span>
            <div className="h-8 w-8 rounded-lg bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <div className="pt-1">
            <span className="text-2xl font-extrabold text-white tracking-tight block">
              {baseConsoleState.activeCasesCount ?? 0}
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5 block font-medium">
              Opportunities requiring action
            </span>
          </div>
        </div>

        {/* Card 2: PENDING ACTIONS */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg space-y-2 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">PENDING ACTIONS</span>
            <div className="h-8 w-8 rounded-lg bg-amber-950/80 border border-amber-800/60 flex items-center justify-center text-amber-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="pt-1">
            <span className="text-2xl font-extrabold text-amber-300 tracking-tight block">
              {baseConsoleState.pendingActionsCount ?? 0}
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5 block font-medium">
              Awaiting execution or review
            </span>
          </div>
        </div>

        {/* Card 3: RECOVERED REVENUE */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg space-y-2 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">RECOVERED REVENUE</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="pt-1">
            <span className="text-2xl font-extrabold text-emerald-300 tracking-tight block">
              {formatCurrency(baseConsoleState.recoveredRevenueAmount ?? 0)}
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5 block font-medium">
              Total revenue saved
            </span>
          </div>
        </div>

        {/* Card 4: RECOVERY EFFICIENCY */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg space-y-2 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">RECOVERY EFFICIENCY</span>
            <div className="h-8 w-8 rounded-lg bg-indigo-950/80 border border-indigo-800/60 flex items-center justify-center text-indigo-400">
              <Zap className="h-4 w-4" />
            </div>
          </div>
          <div className="pt-1">
            <span className="text-2xl font-extrabold text-indigo-300 tracking-tight block">
              {baseConsoleState.recoveryEfficiencyPct ?? 0}%
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5 block font-medium">
              Success rate
            </span>
          </div>
        </div>

      </div>

      {/* SECTION 2: INTELLIGENT RECOVERY QUEUE & DECISION ORCHESTRATION (Milestone 10.4) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white tracking-tight">EVIDENCE-AWARE PRIORITIZATION & DECISION ORCHESTRATION QUEUE</h2>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950 px-2.5 py-0.5 rounded border border-indigo-800">
              Milestone 10.4 Decision Orchestration
            </span>
          </div>
        </div>

        {/* M10.4 Active Case Decision Orchestration Banner */}
        {orchestratedDecision && (
          <div className="bg-indigo-950/40 border border-indigo-800/80 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-indigo-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">SELECTED CASE ORCHESTRATED DECISION:</span>
                <span className={`px-2 py-0.5 rounded text-xs font-mono font-extrabold border ${
                  orchestratedDecision.recommendedDecision === 'RETRY_NOW'
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                    : orchestratedDecision.recommendedDecision === 'RETRY_SHORT_TERM'
                    ? 'bg-cyan-950 text-cyan-300 border-cyan-800'
                    : orchestratedDecision.recommendedDecision === 'OPERATOR_REVIEW'
                    ? 'bg-amber-950 text-amber-300 border-amber-800'
                    : orchestratedDecision.recommendedDecision === 'BLOCKED'
                    ? 'bg-rose-950 text-rose-300 border-rose-800'
                    : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}>
                  {orchestratedDecision.recommendedDecision}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-slate-400">READINESS:</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                  orchestratedDecision.executionAssessment?.readiness === 'READY'
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                    : orchestratedDecision.executionAssessment?.readiness === 'WAITING'
                    ? 'bg-cyan-950 text-cyan-300 border-cyan-800'
                    : 'bg-rose-950 text-rose-300 border-rose-800'
                }`}>
                  {orchestratedDecision.executionAssessment?.readiness}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-2 text-xs border-t border-indigo-900/40 pt-2">
              <div className="text-slate-300">
                <span>Next Step: <strong className="text-cyan-300">{orchestratedDecision.nextStep}</strong></span>
              </div>
              <div className="text-slate-400 text-[11px] font-mono">
                Execution Mode: <span className="text-indigo-300">{orchestratedDecision.autonomyAssessment?.executionMode}</span>
              </div>
            </div>
          </div>
        )}

        {/* M10.5 Guarded Action Dispatch Box */}
        {guardedDispatch && (
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">GUARDED ACTION DISPATCH EVALUATION:</span>
                <span className={`px-2 py-0.5 rounded text-xs font-mono font-extrabold border ${
                  guardedDispatch.dispatchDecision === 'DISPATCH_ALLOWED'
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                    : guardedDispatch.dispatchDecision === 'DISPATCH_REQUIRES_OPERATOR'
                    ? 'bg-amber-950 text-amber-300 border-amber-800'
                    : guardedDispatch.dispatchDecision === 'DISPATCH_BLOCKED'
                    ? 'bg-rose-950 text-rose-300 border-rose-800'
                    : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}>
                  {guardedDispatch.dispatchDecision}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-slate-400">SELECTED ACTION:</span>
                <span className="text-cyan-300 font-bold">{guardedDispatch.selectedAction}</span>
              </div>
            </div>

            {/* Safety Checks Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono">
              <div className="bg-slate-900 p-2 rounded border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Ownership:</span>
                <span className={guardedDispatch.safetyChecks?.merchantOwnership === 'PASS' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                  {guardedDispatch.safetyChecks?.merchantOwnership}
                </span>
              </div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Lifecycle:</span>
                <span className={guardedDispatch.safetyChecks?.lifecycleState === 'PASS' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                  {guardedDispatch.safetyChecks?.lifecycleState}
                </span>
              </div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Policy:</span>
                <span className={guardedDispatch.safetyChecks?.policyAuthorization === 'PASS' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                  {guardedDispatch.safetyChecks?.policyAuthorization}
                </span>
              </div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Retry Limit:</span>
                <span className={guardedDispatch.safetyChecks?.retryLimit === 'PASS' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                  {guardedDispatch.safetyChecks?.retryLimit}
                </span>
              </div>
            </div>

            {guardedDispatch.blockingReasons?.length > 0 && (
              <div className="p-2 bg-rose-950/30 border border-rose-900/50 rounded text-xs text-rose-300 font-sans space-y-0.5">
                <strong className="block text-[11px] text-rose-400 uppercase font-mono">Dispatch Blocking Reasons:</strong>
                <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                  {guardedDispatch.blockingReasons.map((br, idx) => (
                    <li key={idx}>{br}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* M10.6 Recovery Execution Outcome Reconciliation Box */}
        {reconciliationOutcome && (
          <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-3 shadow-lg">
            <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-cyan-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">RECOVERY EXECUTION OUTCOME:</span>
                <span className={`px-2 py-0.5 rounded text-xs font-mono font-extrabold border ${
                  reconciliationOutcome.reconciliationStatus === 'RECONCILIATION_CONFIRMED'
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                    : reconciliationOutcome.reconciliationStatus === 'RECONCILIATION_FAILED'
                    ? 'bg-rose-950 text-rose-300 border-rose-800'
                    : reconciliationOutcome.reconciliationStatus === 'RECONCILIATION_PENDING'
                    ? 'bg-amber-950 text-amber-300 border-amber-800'
                    : reconciliationOutcome.reconciliationStatus === 'RECONCILIATION_INCONSISTENT'
                    ? 'bg-purple-950 text-purple-300 border-purple-800'
                    : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}>
                  {reconciliationOutcome.reconciliationStatus}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-slate-400">OUTCOME AUTHORITY:</span>
                <span className="text-cyan-300 font-bold">{reconciliationOutcome.reasoning?.backendStatus ? 'BACKEND' : 'NONE'}</span>
              </div>
            </div>

            {/* Metrics & Outcome Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono">
              <div className="bg-slate-900 p-2 rounded border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Execution Status:</span>
                <span className={reconciliationOutcome.executionAssessment?.executionSucceeded ? 'text-emerald-400 font-bold' : (reconciliationOutcome.executionAssessment?.executionFailed ? 'text-rose-400 font-bold' : 'text-slate-400')}>
                  {reconciliationOutcome.executionAssessment?.executionSucceeded ? 'SUCCESS' : (reconciliationOutcome.executionAssessment?.executionFailed ? 'FAILED' : 'IDLE')}
                </span>
              </div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Backend Outcome:</span>
                <span className={reconciliationOutcome.backendOutcome === 'RECOVERED' ? 'text-emerald-400 font-bold' : (reconciliationOutcome.backendOutcome === 'FAILED' ? 'text-rose-400 font-bold' : 'text-amber-400')}>
                  {reconciliationOutcome.backendOutcome}
                </span>
              </div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Reconciled Outcome:</span>
                <span className={reconciliationOutcome.reconciledOutcome === 'RECOVERED' ? 'text-emerald-400 font-bold' : (reconciliationOutcome.reconciledOutcome === 'FAILED' ? 'text-rose-400 font-bold' : 'text-cyan-400')}>
                  {reconciliationOutcome.reconciledOutcome}
                </span>
              </div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Recovery Confirmed:</span>
                <span className={reconciliationOutcome.recoveryConfirmed ? 'text-emerald-400 font-bold' : 'text-slate-400 font-bold'}>
                  {reconciliationOutcome.recoveryConfirmed ? 'true' : 'false'}
                </span>
              </div>
            </div>

            {/* Correlation & Financial Details Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono text-slate-300">
              <div><span className="text-slate-500">Recovered Amount:</span> {reconciliationOutcome?.recoveredAmount != null ? `₹${Number(reconciliationOutcome.recoveredAmount).toLocaleString('en-IN')}` : 'N/A'}</div>
              <div><span className="text-slate-500">Retry Count:</span> {reconciliationOutcome.retryCount}</div>
              <div className="truncate" title={reconciliationOutcome.paymentAttemptId}><span className="text-slate-500">Attempt ID:</span> {reconciliationOutcome.paymentAttemptId || 'N/A'}</div>
              <div className="truncate" title={reconciliationOutcome.paymentResultId}><span className="text-slate-500">Result ID:</span> {reconciliationOutcome.paymentResultId || 'N/A'}</div>
            </div>

            {/* Next Step Banner */}
            <div className="p-2 bg-slate-900/90 border border-slate-800 rounded text-xs text-slate-200 flex items-center justify-between">
              <span className="text-[11px] font-mono text-slate-400">NEXT STEP:</span>
              <span className="font-semibold text-cyan-300">{reconciliationOutcome.nextStep}</span>
            </div>

            {/* Inconsistencies Warning Box */}
            {reconciliationOutcome.inconsistencies?.length > 0 && (
              <div className="p-2 bg-purple-950/30 border border-purple-900/50 rounded text-xs text-purple-300 space-y-1">
                <strong className="block text-[11px] text-purple-400 uppercase font-mono">Detected Inconsistencies ({reconciliationOutcome.inconsistencies.length}):</strong>
                <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                  {reconciliationOutcome.inconsistencies.map((inc, idx) => (
                    <li key={idx}><span className="font-bold text-amber-300">[{inc.severity}]</span> {inc.description}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* M10.7 Recovery Lifecycle Finalization Box */}
        {lifecycleFinalization && (
          <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-3 shadow-lg">
            <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">LIFECYCLE FINALIZATION:</span>
                <span className={`px-2 py-0.5 rounded text-xs font-mono font-extrabold border ${
                  lifecycleFinalization.terminal
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                    : 'bg-indigo-950 text-indigo-300 border-indigo-800'
                }`}>
                  {lifecycleFinalization.lifecycleClassification}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-slate-400">CLOSURE STATUS:</span>
                <span className={`font-bold px-2 py-0.5 rounded text-xs border ${
                  lifecycleFinalization.closureStatus === 'CLOSED'
                    ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                    : (lifecycleFinalization.closureStatus === 'BLOCKED'
                      ? 'bg-rose-950 text-rose-300 border-rose-800'
                      : 'bg-slate-900 text-cyan-300 border-slate-800')
                }`}>
                  {lifecycleFinalization.closureStatus}
                </span>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono">
              <div className="bg-slate-900 p-2 rounded border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Terminal:</span>
                <span className={lifecycleFinalization.terminal ? 'text-emerald-400 font-bold' : 'text-slate-400 font-bold'}>
                  {lifecycleFinalization.terminal ? 'true' : 'false'}
                </span>
              </div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Active Queue:</span>
                <span className={lifecycleFinalization.active ? 'text-amber-400 font-bold' : 'text-slate-400 font-bold'}>
                  {lifecycleFinalization.active ? 'true' : 'false'}
                </span>
              </div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Case Status:</span>
                <span className="text-cyan-300 font-bold">{lifecycleFinalization.activeCaseStatus}</span>
              </div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Outcome:</span>
                <span className={lifecycleFinalization.recoveryConfirmed ? 'text-emerald-400 font-bold' : 'text-slate-400 font-bold'}>
                  {lifecycleFinalization.recoveryOutcome}
                </span>
              </div>
            </div>

            {/* Eligibility Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-mono">
              <div className="bg-slate-900/80 p-2 rounded border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Feedback Eligibility:</span>
                <span className={lifecycleFinalization.feedbackEligibility?.eligible ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                  {lifecycleFinalization.feedbackEligibility?.eligible ? 'ELIGIBLE' : 'INELIGIBLE'}
                </span>
              </div>
              <div className="bg-slate-900/80 p-2 rounded border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Learning Eligibility:</span>
                <span className={lifecycleFinalization.learningEligibility?.eligible ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                  {lifecycleFinalization.learningEligibility?.eligible ? 'ELIGIBLE' : 'INELIGIBLE'}
                </span>
              </div>
            </div>

            {/* Closure Reason & Next Step */}
            <div className="p-2.5 bg-slate-900/90 border border-slate-800 rounded text-xs space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400 font-mono">CLOSURE REASON:</span>
                <span className="text-slate-200 font-sans font-medium">{lifecycleFinalization.closureReason}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/80">
                <span className="text-slate-400 font-mono">FINAL NEXT STEP:</span>
                <span className="font-semibold text-emerald-400 font-sans">{lifecycleFinalization.nextStep}</span>
              </div>
            </div>
          </div>
        )}

        {/* M10.8 Recovery Lifecycle State Machine Box */}
        {(lifecycleFinalization?.transitionGovernance || guardedDispatch?.transitionGovernance) && (
          <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-3 shadow-lg">
            {(() => {
              const tg = lifecycleFinalization?.transitionGovernance || guardedDispatch?.transitionGovernance;
              return (
                <>
                  <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800/80 pb-2">
                    <div className="flex items-center gap-2">
                      <GitCommit className="h-4 w-4 text-cyan-400" />
                      <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">RECOVERY LIFECYCLE STATE MACHINE:</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-mono font-extrabold border ${
                        tg.allowed
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          : 'bg-rose-950 text-rose-300 border-rose-800'
                      }`}>
                        {tg.transitionType}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className="text-slate-400">TRANSITION:</span>
                      <span className="font-bold text-cyan-300">{tg.transition}</span>
                    </div>
                  </div>

                  {/* State Machine Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono">
                    <div className="bg-slate-900 p-2 rounded border border-slate-800 flex justify-between items-center">
                      <span className="text-slate-400">Current State:</span>
                      <span className="text-cyan-300 font-bold">{tg.previousState}</span>
                    </div>
                    <div className="bg-slate-900 p-2 rounded border border-slate-800 flex justify-between items-center">
                      <span className="text-slate-400">Proposed State:</span>
                      <span className="text-indigo-300 font-bold">{tg.nextState}</span>
                    </div>
                    <div className="bg-slate-900 p-2 rounded border border-slate-800 flex justify-between items-center">
                      <span className="text-slate-400">Allowed:</span>
                      <span className={tg.allowed ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                        {tg.allowed ? 'YES' : 'NO'}
                      </span>
                    </div>
                    <div className="bg-slate-900 p-2 rounded border border-slate-800 flex justify-between items-center">
                      <span className="text-slate-400">Execution Allowed:</span>
                      <span className={tg.executionAllowed ? 'text-emerald-400 font-bold' : 'text-slate-400 font-bold'}>
                        {tg.executionAllowed ? 'YES' : 'NO'}
                      </span>
                    </div>
                  </div>

                  {/* Validation Checks Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono">
                    <div className="bg-slate-900/80 p-2 rounded border border-slate-800 flex justify-between items-center">
                      <span className="text-slate-400">Terminal Protection:</span>
                      <span className={tg.terminalProtection === 'ACTIVE' ? 'text-amber-400 font-bold' : 'text-slate-500'}>
                        {tg.terminalProtection}
                      </span>
                    </div>
                    <div className="bg-slate-900/80 p-2 rounded border border-slate-800 flex justify-between items-center">
                      <span className="text-slate-400">Merchant Ownership:</span>
                      <span className={tg.merchantValidation === 'PASSED' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                        {tg.merchantValidation}
                      </span>
                    </div>
                    <div className="bg-slate-900/80 p-2 rounded border border-slate-800 flex justify-between items-center">
                      <span className="text-slate-400">Correlation:</span>
                      <span className={tg.correlationValidation === 'PASSED' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                        {tg.correlationValidation}
                      </span>
                    </div>
                    <div className="bg-slate-900/80 p-2 rounded border border-slate-800 flex justify-between items-center">
                      <span className="text-slate-400">Operator Required:</span>
                      <span className={tg.requiresOperator ? 'text-amber-400 font-bold' : 'text-slate-500'}>
                        {tg.requiresOperator ? 'YES' : 'NO'}
                      </span>
                    </div>
                  </div>

                  {/* Reason Banner */}
                  <div className="p-2 bg-slate-900/90 border border-slate-800 rounded text-xs flex items-center justify-between">
                    <span className="text-[11px] font-mono text-slate-400">GOVERNANCE REASON:</span>
                    <span className="font-medium text-slate-200 text-right truncate ml-2" title={tg.reason}>{tg.reason}</span>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* M10.9 Recovery Lifecycle History Box */}
        {selectedCaseHistory?.history && (
          <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-3 shadow-lg">
            <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-cyan-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">RECOVERY LIFECYCLE HISTORY:</span>
                <span className="px-2 py-0.5 rounded text-xs font-mono font-extrabold bg-cyan-950 text-cyan-300 border border-cyan-800">
                  {selectedCaseHistory.history.totalTransitions} TRANSITIONS
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-slate-400">CLOSURE STATUS:</span>
                <span className={`font-bold px-2 py-0.5 rounded text-xs border ${
                  selectedCaseHistory.history.closureStatus === 'CLOSED'
                    ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                    : (selectedCaseHistory.history.closureStatus === 'BLOCKED'
                      ? 'bg-rose-950 text-rose-300 border-rose-800'
                      : 'bg-slate-900 text-cyan-300 border-slate-800')
                }`}>
                  {selectedCaseHistory.history.closureStatus}
                </span>
              </div>
            </div>

            {/* Selected Case History Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono">
              <div className="bg-slate-900 p-2 rounded border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Current State:</span>
                <span className="text-cyan-300 font-bold">{selectedCaseHistory.history.currentState}</span>
              </div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Previous State:</span>
                <span className="text-slate-300 font-bold">{selectedCaseHistory.history.previousState}</span>
              </div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Terminal:</span>
                <span className={selectedCaseHistory.history.terminal ? 'text-emerald-400 font-bold' : 'text-slate-400 font-bold'}>
                  {selectedCaseHistory.history.terminal ? 'YES' : 'NO'}
                </span>
              </div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Recovery Outcome:</span>
                <span className={selectedCaseHistory.history.recoveryOutcome === 'RECOVERED' ? 'text-emerald-400 font-bold' : (selectedCaseHistory.history.recoveryOutcome === 'FAILED' ? 'text-rose-400 font-bold' : 'text-cyan-400 font-bold')}>
                  {selectedCaseHistory.history.recoveryOutcome}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 gap-2 text-[10px] font-mono">
              <div className="bg-slate-900/80 p-2 rounded border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Last Transition At:</span>
                <span className="text-slate-200">
                  {selectedCaseHistory.history.lastTransitionAt ? new Date(selectedCaseHistory.history.lastTransitionAt).toLocaleTimeString() : 'N/A'}
                </span>
              </div>
              <div className="bg-slate-900/80 p-2 rounded border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Operator Review:</span>
                <span className={selectedCaseHistory.history.operatorReviewRequired ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                  {selectedCaseHistory.history.operatorReviewRequired ? 'REQUIRED' : 'NOT REQUIRED'}
                </span>
              </div>
            </div>

            {/* M10.10 Compact Time-Travel Step Replay Widget */}
            {selectedCaseReplay && selectedCaseReplay.valid && (
              <div className="p-3 bg-indigo-950/30 border border-indigo-900/60 rounded-lg space-y-2 text-[10px] font-mono">
                <div className="flex items-center justify-between border-b border-indigo-900/40 pb-1.5 flex-wrap gap-2">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-cyan-400" />
                    <span className="font-bold text-white uppercase tracking-wider text-[11px]">LIFECYCLE STEP REPLAY (M10.10)</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setAgentStepIndex(prev => Math.max(0, prev - 1))}
                      disabled={agentStepIndex === 0}
                      className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed font-bold cursor-pointer"
                    >
                      &lt;
                    </button>
                    <span className="px-2 py-0.5 bg-cyan-950 text-cyan-300 font-extrabold border border-cyan-800 rounded">
                      Step {agentStepIndex + 1} / {selectedCaseReplay.totalSteps}
                    </span>
                    <button
                      type="button"
                      onClick={() => setAgentStepIndex(prev => Math.min(selectedCaseReplay.totalSteps - 1, prev + 1))}
                      disabled={agentStepIndex >= selectedCaseReplay.totalSteps - 1}
                      className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed font-bold cursor-pointer"
                    >
                      &gt;
                    </button>
                  </div>
                </div>

                <div className="p-2 bg-slate-900/90 rounded border border-slate-800 text-slate-200 text-xs font-sans">
                  {selectedCaseReplay.explanation?.summary}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  <div><span className="text-slate-500">Stage:</span> <span className="text-indigo-300 font-bold">{selectedCaseReplay.reconstructedState?.pipelineStage}</span></div>
                  <div><span className="text-slate-500">Effective State:</span> <span className="text-cyan-300 font-bold">{selectedCaseReplay.reconstructedState?.effectiveState}</span></div>
                  <div><span className="text-slate-500">Compliance:</span> <span className={selectedCaseReplay.explanation?.complianceStatus === 'COMPLIANT' ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>{selectedCaseReplay.explanation?.complianceStatus}</span></div>
                  <div><span className="text-slate-500">Interval:</span> <span className="text-slate-300">{selectedCaseReplay.stepDelta?.timeSincePreviousStepMs != null ? `${Math.round(selectedCaseReplay.stepDelta.timeSincePreviousStepMs / 1000)}s` : 'Initial'}</span></div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* M10.3 Scheduling Summary Bar */}
        {decisionSchedule && decisionSchedule.schedulingSummary && (
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs">
            <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-lg p-2 text-center">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">IMMEDIATE</span>
              <span className="text-sm font-extrabold text-emerald-300 font-mono">{decisionSchedule.schedulingSummary.immediateCount}</span>
            </div>
            <div className="bg-cyan-950/40 border border-cyan-800/60 rounded-lg p-2 text-center">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">SHORT-TERM</span>
              <span className="text-sm font-extrabold text-cyan-300 font-mono">{decisionSchedule.schedulingSummary.shortTermCount}</span>
            </div>
            <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-2 text-center">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">NORMAL</span>
              <span className="text-sm font-extrabold text-slate-300 font-mono">{decisionSchedule.schedulingSummary.normalCount}</span>
            </div>
            <div className="bg-amber-950/40 border border-amber-800/60 rounded-lg p-2 text-center">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">DEFERRED</span>
              <span className="text-sm font-extrabold text-amber-300 font-mono">{decisionSchedule.schedulingSummary.deferredCount}</span>
            </div>
            <div className="bg-rose-950/40 border border-rose-800/60 rounded-lg p-2 text-center">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">OPERATOR REVIEW</span>
              <span className="text-sm font-extrabold text-rose-300 font-mono">{decisionSchedule.schedulingSummary.operatorReviewCount}</span>
            </div>
            <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-2 text-center">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">BLOCKED</span>
              <span className="text-sm font-extrabold text-slate-400 font-mono">{decisionSchedule.schedulingSummary.blockedCount}</span>
            </div>
          </div>
        )}

        {/* Safety Operational Messaging Banner */}
        <div className="bg-slate-950/70 border border-indigo-900/40 rounded-xl p-3 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <ShieldCheck className="h-4 w-4 text-indigo-400 shrink-0" />
            <span><strong>Decision Orchestration Notice:</strong> Decision orchestration provides deterministic recommendations for operator review. It does not execute payment retries or alter policy authorization.</span>
          </div>
          <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-850">
            Total Queue Value: ₹{(prioritizedQueue?.summary?.totalAmountAtRisk || 0).toLocaleString('en-IN')}
          </span>
        </div>

        {/* Queue Items List */}
        {decisionSchedule && decisionSchedule.scheduledCases && decisionSchedule.scheduledCases.length > 0 ? (
          <div className="space-y-3">
            {decisionSchedule.scheduledCases.map((item) => {
              const isSelected = (selectedCaseId ? selectedCaseId === item.caseId : item.rank === 1);
              return (
                <div
                  key={item.caseId}
                  onClick={() => setSelectedCaseId(item.caseId)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer space-y-3 ${
                    isSelected
                      ? 'bg-indigo-950/40 border-indigo-600/80 shadow-lg ring-1 ring-indigo-500/50'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-950/90'
                  }`}
                >
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    {/* Left: Rank & Customer Info */}
                    <div className="flex items-center gap-3">
                      <span className={`h-8 w-8 rounded-lg flex items-center justify-center font-extrabold font-mono text-xs border ${
                        item.rank === 1
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                          : item.rank === 2
                          ? 'bg-cyan-950 text-cyan-300 border-cyan-700'
                          : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}>
                        #{item.rank}
                      </span>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{item.customerId}</span>
                          <span className="text-xs text-slate-400 font-mono">({item.productName})</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
                          <span>Amount: <strong className="text-white">₹{item.amountAtRisk.toLocaleString()}</strong></span>
                          <span>•</span>
                          <span>Failure: <strong className="text-cyan-300 font-mono">{item.failureCode}</strong></span>
                          <span>•</span>
                          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                            item.evidenceQuality === 'STRONG'
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                              : item.evidenceQuality === 'MODERATE'
                              ? 'bg-cyan-950 text-cyan-300 border-cyan-800'
                              : 'bg-amber-950 text-amber-300 border-amber-800'
                          }`}>
                            EVIDENCE: {item.evidenceQuality}
                          </span>
                          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                            item.stalenessCategory === 'FRESH'
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                              : item.stalenessCategory === 'AGING'
                              ? 'bg-amber-950 text-amber-300 border-amber-800'
                              : 'bg-rose-950 text-rose-300 border-rose-800'
                          }`}>
                            AGE: {item.stalenessCategory}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Scores, Decision Window & Badges */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">RECOMMENDED TIME</span>
                        <span className="text-xs font-extrabold text-cyan-300 font-mono block">{item.recommendedDecisionTime}</span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">QUEUE SCORE</span>
                        <span className="text-lg font-extrabold text-indigo-400 font-mono">{item.queueScore}/100</span>
                      </div>

                      <span className={`px-2.5 py-1 rounded text-xs font-mono font-extrabold border ${
                        item.recommendedDecisionWindow === 'IMMEDIATE'
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          : item.recommendedDecisionWindow === 'SHORT_TERM'
                          ? 'bg-cyan-950 text-cyan-300 border-cyan-800'
                          : item.recommendedDecisionWindow === 'DEFERRED'
                          ? 'bg-amber-950 text-amber-300 border-amber-800'
                          : item.recommendedDecisionWindow === 'OPERATOR_REVIEW'
                          ? 'bg-rose-950 text-rose-300 border-rose-800'
                          : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}>
                        WINDOW: {item.recommendedDecisionWindow}
                      </span>
                    </div>
                  </div>

                  {/* Why This Rank? Explanation Box */}
                  <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-lg text-xs space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                      <span className="font-bold text-indigo-300 font-mono uppercase tracking-wider text-[10px]">WHY THIS RANK & SCHEDULING WINDOW?</span>
                      <span className="text-[10px] text-slate-400">Next Action: <strong className="text-cyan-300">{item.nextBestAction}</strong></span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                      {item.positiveFactors?.length > 0 && (
                        <div>
                          <span className="text-emerald-400 font-bold block mb-0.5">Top Positive Drivers:</span>
                          <ul className="list-disc list-inside text-slate-300 space-y-0.5">
                            {item.positiveFactors.map((pf, idx) => (
                              <li key={idx}>{pf}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {item.negativeFactors?.length > 0 && (
                        <div>
                          <span className="text-amber-400 font-bold block mb-0.5">Key Risk & Deferment Factors:</span>
                          <ul className="list-disc list-inside text-slate-300 space-y-0.5">
                            {item.negativeFactors.map((nf, idx) => (
                              <li key={idx}>{nf}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    <p className="text-slate-400 text-[11px] font-sans pt-1 border-t border-slate-800/60">
                      {item.deferReason || item.urgencyReason || item.reasoning || item.deterministicReasoning}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500 text-xs font-mono border border-dashed border-slate-800 rounded-xl">
            NO ACTIVE RECOVERY CANDIDATES IN QUEUE
          </div>
        )}
      </div>

      {/* SECTION 1: LIVE AGENT ACTIVITY */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white tracking-tight">LIVE AGENT ACTIVITY</h2>
          </div>
          <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
            Real-time Telemetry
          </span>
        </div>

        {combinedLiveActivity && combinedLiveActivity.length > 0 ? (
          <div className="space-y-3">
            {combinedLiveActivity.map((evt) => (
              <div key={evt.id} className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border ${
                    evt.type === 'RECOVERY COMPLETED' || evt.type === 'RECOVERY ACTION SUCCEEDED'
                      ? 'bg-emerald-950 border-emerald-800 text-emerald-400'
                      : evt.type === 'RECOVERY ACTION EXECUTING'
                      ? 'bg-cyan-950 border-cyan-800 text-cyan-400'
                      : evt.type === 'AGENT DECISION GENERATED'
                      ? 'bg-indigo-950 border-indigo-800 text-indigo-400'
                      : 'bg-rose-950 border-rose-800 text-rose-400'
                  }`}>
                    <Activity className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-bold text-white block">{evt.type}</span>
                    <span className="text-slate-300 text-[11px] block">{evt.summary}</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-slate-500 whitespace-nowrap">
                  {evt.timestamp ? new Date(evt.timestamp).toLocaleTimeString() : 'Just now'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-8 text-center space-y-2">
            <Inbox className="h-8 w-8 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-300">NO ACTIVE AGENT ACTIVITY</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Agent activity will appear here when recovery events are processed.
            </p>
          </div>
        )}
      </div>

      {/* SECTION 2: ACTIVE RECOVERY CASES */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white tracking-tight">ACTIVE RECOVERY CASES</h2>
          </div>
          <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800">
            Opportunity Monitor ({baseConsoleState.activeCasesCount})
          </span>
        </div>

        {baseConsoleState.activeCases && baseConsoleState.activeCases.length > 0 ? (
          <div className="space-y-4">
            {baseConsoleState.activeCases.map((item) => (
              <div key={item.caseId} className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 space-y-4 hover:border-slate-700 transition-all">
                <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                    <span className="text-sm font-bold text-white tracking-tight">
                      ACTIVE RECOVERY CASE
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      #{item.caseId}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-950 text-rose-300 border border-rose-800/80">
                      STATUS: FAILED / ACTIVE
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 text-[10px] block font-semibold uppercase tracking-wider mb-0.5">Customer</span>
                    <span className="font-bold text-white truncate block">{item.customerId}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 text-[10px] block font-semibold uppercase tracking-wider mb-0.5">Product</span>
                    <span className="font-bold text-slate-200 truncate block">{item.productName}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 text-[10px] block font-semibold uppercase tracking-wider mb-0.5">Amount at Risk</span>
                    <span className="font-extrabold text-emerald-400 block">{formatCurrency(item.amount)}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 text-[10px] block font-semibold uppercase tracking-wider mb-0.5">Failure</span>
                    <span className="font-bold text-rose-400 block">{item.failureCode}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 text-[10px] block font-semibold uppercase tracking-wider mb-0.5">Priority</span>
                    <span className="font-extrabold text-amber-300 block">{item.priority}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 text-[10px] block font-semibold uppercase tracking-wider mb-0.5">Recommended Recovery</span>
                    <span className="font-bold text-indigo-300 block">{item.recommendedAction}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-8 text-center space-y-2">
            <CheckCircle2 className="h-8 w-8 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-300">NO ACTIVE RECOVERY CASES</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              No customer recovery opportunities currently require agent action.
            </p>
          </div>
        )}
      </div>

      {/* SECTION 3: AGENT DECISION */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white tracking-tight">AGENT DECISION</h2>
          </div>
          <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
            Decision & Execution Control
          </span>
        </div>

        {baseConsoleState.hasActiveCase && baseConsoleState.agentDecision ? (
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 space-y-4">
            {/* Header Badges */}
            <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-indigo-950 text-indigo-300 border border-indigo-800">
                  DECISION EVALUATED
                </span>
                
                {/* M9.6 Strategy Source Badge */}
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                  baseConsoleState.agentDecision.strategySource === 'HISTORICAL_ADAPTATION'
                    ? 'bg-cyan-950 text-cyan-300 border-cyan-700'
                    : 'bg-slate-900 text-slate-400 border-slate-700'
                }`}>
                  SOURCE: {baseConsoleState.agentDecision.strategySource || 'BASELINE'}
                </span>

                {/* M9.6 Adaptation Status Badge */}
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                  baseConsoleState.agentDecision.adaptationStatus === 'SUPPORTED_BY_HISTORY'
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                    : baseConsoleState.agentDecision.adaptationStatus === 'HISTORICALLY_WEAK'
                    ? 'bg-rose-950 text-rose-300 border-rose-700'
                    : 'bg-slate-950 text-slate-400 border-slate-800'
                }`}>
                  STATUS: {baseConsoleState.agentDecision.adaptationStatus || 'BASELINE'}
                </span>

                <span className="text-xs font-mono text-slate-400">
                  Case: {baseConsoleState.agentDecision.customerId} / {baseConsoleState.agentDecision.productName}
                </span>
              </div>

              <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
                EXECUTION MODE: {executionMode}
              </span>
            </div>

            {/* Decision Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              
              {/* RECOMMENDED STRATEGY */}
              <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider block">RECOMMENDED STRATEGY</span>
                <span className={`text-sm font-extrabold block ${
                  baseConsoleState.agentDecision.strategy === 'NO_ACTION'
                    ? 'text-slate-400'
                    : baseConsoleState.agentDecision.strategy === 'MONITOR'
                    ? 'text-amber-300'
                    : baseConsoleState.agentDecision.strategy === 'OPERATOR_REVIEW'
                    ? 'text-orange-400'
                    : 'text-cyan-300'
                }`}>
                  {baseConsoleState.agentDecision.actionLabel || 'Retry Payment'}
                </span>
                <span className="text-[10px] font-mono text-slate-400 block">
                  {baseConsoleState.agentDecision.strategySource === 'HISTORICAL_ADAPTATION' ? 'Adaptive Engine' : 'Baseline Strategy'}
                </span>
              </div>

              {/* PRIORITY */}
              <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider block">PRIORITY</span>
                <span className="text-sm font-extrabold text-amber-300 block">{baseConsoleState.agentDecision.priority}</span>
                <span className="text-[10px] font-mono text-slate-400 block">Opportunity tier</span>
              </div>

              {/* POLICY */}
              <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider block">POLICY</span>
                <span className={`text-sm font-extrabold block ${
                  baseConsoleState.agentDecision.policyStatus === 'ALLOWED'
                    ? 'text-emerald-400'
                    : baseConsoleState.agentDecision.policyStatus === 'BLOCKED'
                    ? 'text-rose-400'
                    : 'text-amber-300'
                }`}>
                  {baseConsoleState.agentDecision.policyStatus}
                </span>
                <span className="text-[10px] text-slate-400 truncate block">{baseConsoleState.agentDecision.policyReason}</span>
              </div>

              {/* CONFIDENCE */}
              <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider block">CONFIDENCE</span>
                <span className="text-sm font-extrabold text-indigo-300 block">{baseConsoleState.agentDecision.confidence}</span>
                <span className="text-[10px] font-mono text-slate-400 block">Deterministic certainty</span>
              </div>

            </div>

            {/* REASONING Box & Historical Evidence */}
            <div className="bg-slate-900/90 border border-indigo-900/60 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-400 block">DETERMINISTIC ADAPTIVE REASONING</span>
                <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                  {baseConsoleState.agentDecision.historicalEvidence?.observations > 0 && (
                    <span className="text-cyan-300">
                      Evidence: {baseConsoleState.agentDecision.historicalEvidence.observations} obs ({baseConsoleState.agentDecision.historicalEvidence.caseRecoveryRate}% recovery rate)
                    </span>
                  )}
                  <span>Autonomy: {baseConsoleState.autonomyEligibility.eligible ? 'AUTONOMOUS READY' : 'OPERATOR REQUIRED'}</span>
                </div>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed font-sans">
                {baseConsoleState.agentDecision.reasoning}
              </p>
            </div>

            {/* Explicit Action Execution Control */}
            {baseConsoleState.agentDecision.policyStatus === 'ALLOWED' && (
              <div className="pt-2 flex items-center justify-between flex-wrap gap-3 border-t border-slate-800/80">
                <div className="text-xs space-y-0.5">
                  <span className="font-bold text-white block">Execution Control</span>
                  <span className="text-[11px] text-slate-400 block">
                    {baseConsoleState.agentDecision.recommendedAction !== 'RETRY_PAYMENT'
                      ? `Strategy '${baseConsoleState.agentDecision.actionLabel}' is non-executable.`
                      : executionState === 'EXECUTING'
                      ? `${executionMode === 'AUTONOMOUS' ? 'Autonomous agent' : 'Operator'} executing payment retry action...`
                      : executionState === 'SUCCEEDED'
                      ? 'Action executed successfully'
                      : autonomyEnabled
                      ? 'Autonomy ENABLED — Candidates will execute autonomously'
                      : 'Autonomy DISABLED — Explicit operator activation required'}
                  </span>
                </div>

                {baseConsoleState.agentDecision.recommendedAction === 'RETRY_PAYMENT' ? (
                  <button
                    type="button"
                    onClick={() => handleExecuteAction(baseConsoleState.activeCases?.[0], 'MANUAL')}
                    disabled={executionState === 'EXECUTING'}
                    className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 border shadow-lg cursor-pointer ${
                      executionState === 'EXECUTING'
                        ? 'bg-cyan-950/60 text-cyan-300 border-cyan-800/50 cursor-not-allowed opacity-80'
                        : executionState === 'SUCCEEDED'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-800 hover:bg-emerald-900'
                        : 'bg-cyan-950 hover:bg-cyan-900 text-cyan-300 hover:text-white border-cyan-800'
                    }`}
                  >
                    {executionState === 'EXECUTING' ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
                        <span>EXECUTING RETRY ({executionMode})...</span>
                      </>
                    ) : executionState === 'SUCCEEDED' ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        <span>RETRY EXECUTED</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 text-cyan-400 fill-cyan-400/20" />
                        <span>EXECUTE RECOVERY ACTION</span>
                      </>
                    )}
                  </button>
                ) : (
                  <span className="px-4 py-2 rounded-xl font-bold text-xs bg-slate-950 text-slate-500 border border-slate-800">
                    ACTION NOT EXECUTABLE
                  </span>
                )}
              </div>
            )}

          </div>
        ) : (
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-8 text-center space-y-2">
            <Zap className="h-8 w-8 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-300">NO ACTIVE DECISION</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              The recovery agent has not evaluated an active opportunity yet.
            </p>
          </div>
        )}
      </div>

      {/* Milestone 10.11 Compact Operator Resolution Guidance Banner */}
      {selectedCaseDiagnostic && (selectedCaseDiagnostic.hasAnomaly || selectedCaseHistory?.history?.operatorReviewRequired) && (
        <div className="bg-slate-900/90 border border-amber-800/60 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-amber-800/40 pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              <h2 className="text-base font-bold text-white tracking-tight">OPERATOR RESOLUTION GUIDANCE (M10.11)</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold border ${
                selectedCaseDiagnostic.anomalySeverity === 'CRITICAL' ? 'bg-rose-950 text-rose-300 border-rose-800' :
                selectedCaseDiagnostic.anomalySeverity === 'HIGH' ? 'bg-amber-950 text-amber-300 border-amber-800' :
                'bg-slate-950 text-yellow-300 border-slate-800'
              }`}>
                SEVERITY: {selectedCaseDiagnostic.anomalySeverity}
              </span>
              <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                CATEGORY: {selectedCaseDiagnostic.primaryAnomalyCategory}
              </span>
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3 font-sans text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Root Cause Layer: <strong className="text-cyan-300 font-mono">{selectedCaseDiagnostic.rootCause?.originatingLayer}</strong></span>
              <span className="text-amber-400 font-bold font-mono">Proposed Guidance Only — 0 Autonomous Execution</span>
            </div>
            <p className="text-slate-200 bg-slate-900 p-2.5 rounded border border-slate-800 leading-relaxed font-sans">
              {selectedCaseDiagnostic.rootCause?.summary}
            </p>

            {/* Concise Evidence Summary */}
            <div className="space-y-1 pt-1 font-mono text-[11px]">
              <span className="text-slate-400 font-bold block text-[10px] uppercase">Recorded Evidence Summary:</span>
              {selectedCaseDiagnostic.rootCause?.evidence?.slice(0, 3).map((e, idx) => (
                <div key={idx} className="flex justify-between items-center bg-slate-900/60 px-2.5 py-1 rounded border border-slate-800">
                  <span className="text-slate-400">{e.label}:</span>
                  <span className={e.category === 'RECORDED_FACT' ? 'text-cyan-300 font-bold' : e.category === 'DETERMINISTIC_DERIVATION' ? 'text-indigo-300 font-bold' : 'text-rose-400'}>
                    {e.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Recommended & Other Options */}
            <div className="space-y-2 pt-2 border-t border-slate-800 font-sans">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">PROPOSED RESOLUTION OPTIONS (GUIDANCE ONLY):</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedCaseDiagnostic.resolutionOptions?.map((opt) => (
                  <div key={opt.optionId} className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white font-mono">{opt.label}</span>
                      {opt.recommended && <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-800">RECOMMENDED</span>}
                    </div>
                    <p className="text-[11px] text-slate-300">{opt.description}</p>
                    <div className="text-[9px] font-mono text-slate-400 italic">
                      Proposed operator action — requires explicit governed operator dispatch
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: EXECUTION STATUS */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white tracking-tight">EXECUTION STATUS</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-950 text-slate-400 border border-slate-800">
              MODE: {executionMode}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-extrabold border ${
              executionState === 'SUCCEEDED'
                ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                : executionState === 'EXECUTING'
                ? 'bg-cyan-950 text-cyan-300 border-cyan-800 animate-pulse'
                : executionState === 'FAILED'
                ? 'bg-rose-950 text-rose-300 border-rose-800'
                : executionState === 'BLOCKED'
                ? 'bg-amber-950 text-amber-300 border-amber-800'
                : 'bg-slate-950 text-slate-400 border-slate-800'
            }`}>
              {executionState}
            </span>
          </div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between text-xs flex-wrap gap-2">
          <div className="space-y-0.5">
            <span className="text-slate-400 font-semibold block text-[11px]">Execution Pipeline State:</span>
            <span className="text-white font-bold block">
              {executionMessage || (executionState === 'IDLE' ? 'No action executed — Operator activation required' : `State: ${executionState}`)}
            </span>
          </div>
          <div className="text-right space-y-0.5">
            <span className="text-slate-400 font-semibold block text-[11px]">Execution Stream:</span>
            <span className={`font-extrabold block ${
              executionState === 'SUCCEEDED' ? 'text-emerald-400' :
              executionState === 'EXECUTING' ? 'text-cyan-400' :
              executionState === 'FAILED' ? 'text-rose-400' :
              'text-slate-400'
            }`}>
              {executionState} ({executionMode})
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 5: RECOVERY STRATEGY PERFORMANCE & HISTORICAL OUTCOMES */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white tracking-tight">RECOVERY STRATEGY PERFORMANCE & HISTORICAL OUTCOMES</h2>
          </div>
          <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950 px-2.5 py-0.5 rounded border border-cyan-800">
            Milestone 9.5 Strategy Learning & Performance
          </span>
        </div>

        {/* Overview & Execution Mode Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Card 1: Overall Recovery Performance */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">CASE RECOVERY RATE</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-cyan-300">
                {strategyPerformance.overview.caseRecoveryRate}%
              </span>
              <span className="text-xs text-slate-400 font-medium">
                ({strategyPerformance.overview.recoveredCases}/{strategyPerformance.overview.totalCases} cases)
              </span>
            </div>
            <span className="text-[11px] text-slate-400 block">
              Financial Recovery: <strong className="text-emerald-400">{strategyPerformance.overview.financialRecoveryRate}%</strong> ({formatCurrency(strategyPerformance.overview.totalRevenueRecovered)})
            </span>
          </div>

          {/* Card 2: Autonomous Performance */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">AUTONOMOUS PERFORMANCE</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-emerald-300">
                {strategyPerformance.executionModes.AUTONOMOUS.recoveryRate}%
              </span>
              <span className="text-xs text-slate-400 font-medium">
                ({strategyPerformance.executionModes.AUTONOMOUS.successful}/{strategyPerformance.executionModes.AUTONOMOUS.attempts} retries)
              </span>
            </div>
            <span className="text-[11px] text-slate-400 block">
              Autonomous Revenue Saved: <strong className="text-emerald-400">{formatCurrency(strategyPerformance.executionModes.AUTONOMOUS.revenueRecovered)}</strong>
            </span>
          </div>

          {/* Card 3: Manual Performance */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">MANUAL OPERATOR PERFORMANCE</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-indigo-300">
                {strategyPerformance.executionModes.MANUAL.recoveryRate}%
              </span>
              <span className="text-xs text-slate-400 font-medium">
                ({strategyPerformance.executionModes.MANUAL.successful}/{strategyPerformance.executionModes.MANUAL.attempts} retries)
              </span>
            </div>
            <span className="text-[11px] text-slate-400 block">
              Manual Revenue Saved: <strong className="text-indigo-300">{formatCurrency(strategyPerformance.executionModes.MANUAL.revenueRecovered)}</strong>
            </span>
          </div>

        </div>

        {/* Strategy Performance Breakdown Table */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl overflow-hidden text-xs">
          <div className="px-4 py-3 bg-slate-900/80 border-b border-slate-800 font-bold text-slate-300 flex items-center justify-between">
            <span>STRATEGY BREAKDOWN ANALYTICS</span>
            <span className="text-[10px] font-mono text-slate-500">Live Recovery Events</span>
          </div>
          <div className="divide-y divide-slate-800/60">
            {Object.entries(strategyPerformance?.strategies || {}).map(([stratName, metrics]) => (
              <div key={stratName} className="p-4 flex items-center justify-between flex-wrap gap-3 hover:bg-slate-900/40 transition-colors">
                <div className="space-y-0.5 min-w-[160px]">
                  <span className="font-extrabold text-white block">{stratName}</span>
                  <span className="text-[10px] font-mono text-slate-400 block">
                    {metrics.recommended} recommended ({metrics.executed} executed)
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-extrabold text-cyan-300 block">{metrics.caseRecoveryRate}% Recovery Rate</span>
                  <span className="text-[10px] text-slate-400 block">
                    {metrics.successful} recovered / {metrics.failed} failed
                  </span>
                </div>
                <div className="text-right min-w-[120px]">
                  <span className="font-extrabold text-emerald-400 block">{formatCurrency(metrics.revenueRecovered)}</span>
                  <span className="text-[10px] text-slate-400 block">Saved Revenue</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Historical Insights Panel */}
        <div className="bg-slate-950/80 border border-cyan-900/40 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-cyan-400" />
            <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider">HISTORICAL STRATEGY INSIGHTS</span>
          </div>
          <div className="space-y-1.5 pt-1">
            {(strategyPerformance?.insights || []).map((insightText, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs text-slate-300 font-sans">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                <span>{insightText}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* SECTION 6: RECOVERY LEARNING & DECISION CONFIDENCE */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white tracking-tight">RECOVERY LEARNING & DECISION CONFIDENCE</h2>
          </div>
          <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950 px-2.5 py-0.5 rounded border border-indigo-800">
            Milestone 9.7 Strategy Learning & Confidence
          </span>
        </div>

        {/* Learning Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* Card 1: Decision Confidence */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">DECISION CONFIDENCE</span>
            <span className={`text-2xl font-extrabold block ${
              baseConsoleState.agentDecision?.learning?.confidenceLevel === 'HIGH'
                ? 'text-emerald-400'
                : baseConsoleState.agentDecision?.learning?.confidenceLevel === 'LOW'
                ? 'text-amber-400'
                : 'text-indigo-300'
            }`}>
              {baseConsoleState.agentDecision?.learning?.confidenceLevel || 'MEDIUM'}
            </span>
            <span className="text-[11px] text-slate-400 block">
              Evidence Quality: <strong className="text-cyan-300">{baseConsoleState.agentDecision?.learning?.evidenceQuality || 'LIMITED'}</strong>
            </span>
          </div>

          {/* Card 2: Strategy Effectiveness */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">STRATEGY EFFECTIVENESS</span>
            <span className={`text-2xl font-extrabold block ${
              baseConsoleState.agentDecision?.learning?.strategyEffectiveness === 'EFFECTIVE'
                ? 'text-emerald-400'
                : baseConsoleState.agentDecision?.learning?.strategyEffectiveness === 'WEAK'
                ? 'text-rose-400'
                : 'text-amber-300'
            }`}>
              {baseConsoleState.agentDecision?.learning?.strategyEffectiveness || 'UNKNOWN'}
            </span>
            <span className="text-[11px] text-slate-400 block">
              Observed Outcomes
            </span>
          </div>

          {/* Card 3: Improvement Status */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">IMPROVEMENT STATUS</span>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-extrabold block ${
                baseConsoleState.agentDecision?.learning?.improvementStatus === 'IMPROVED'
                  ? 'text-emerald-400'
                  : baseConsoleState.agentDecision?.learning?.improvementStatus === 'REGRESSED'
                  ? 'text-rose-400'
                  : 'text-slate-300'
              }`}>
                {baseConsoleState.agentDecision?.learning?.improvementStatus || 'STABLE'}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 block">
              Vs Baseline: <strong className="text-cyan-300">
                {baseConsoleState.agentDecision?.learning?.improvementScore > 0 ? `+${baseConsoleState.agentDecision?.learning?.improvementScore}%` : `${baseConsoleState.agentDecision?.learning?.improvementScore || 0}%`}
              </strong>
            </span>
          </div>

          {/* Card 4: Recommendation Stability */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">RECOMMENDATION STABILITY</span>
            <span className="text-sm font-extrabold text-cyan-300 block truncate">
              {baseConsoleState.agentDecision?.learning?.recommendationStability || 'STABLE'}
            </span>
            <span className="text-[11px] text-slate-400 block">
              {baseConsoleState.agentDecision?.learning?.regressionDetected ? '⚠️ Regression Flagged' : 'Normal Operation'}
            </span>
          </div>

        </div>

        {/* Learning Reasoning Box */}
        <div className="bg-slate-950/80 border border-indigo-900/40 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-indigo-400" />
            <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">LEARNING ANALYSIS & CONFIDENCE EXPLANATION</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed font-sans pt-1">
            {baseConsoleState.agentDecision?.learning?.learningReasoning || 'Insufficient historical evidence recorded for deterministic learning evaluation.'}
          </p>
        </div>

      </div>

      {/* SECTION 7: RECOVERY DECISION TRACE & INTELLIGENCE DASHBOARD */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white tracking-tight">RECOVERY DECISION TRACE & INTELLIGENCE DASHBOARD</h2>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Active Case Selector Dropdown */}
            {(baseConsoleState?.allCases || baseConsoleState?.activeCases || []).length > 1 && (
              <select
                value={selectedCaseId || baseConsoleState?.activeCase?.caseId || baseConsoleState?.activeCases?.[0]?.caseId || ''}
                onChange={(e) => setSelectedCaseId(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded px-2.5 py-1 focus:outline-none focus:border-cyan-500 font-mono"
              >
                {(baseConsoleState?.allCases || baseConsoleState?.activeCases || []).map(c => (
                  <option key={c.caseId} value={c.caseId}>
                    Case: {c.customerId} ({c.failureCode || 'SERVER_ERROR'}) - {c.status}
                  </option>
                ))}
              </select>
            )}

            <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950 px-2.5 py-0.5 rounded border border-cyan-800">
              Milestone 9.8 Decision Traceability
            </span>
          </div>
        </div>

        {decisionTrace ? (
          <div className="space-y-6">
            
            {/* Attribution Header Badge Card */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex items-center justify-between flex-wrap gap-3 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">OUTCOME CAUSAL ATTRIBUTION</span>
                <span className={`text-base font-extrabold px-3 py-1 rounded-md inline-block ${
                  decisionTrace.outcomeAttribution === 'ADAPTIVE_SUCCESS' || decisionTrace.outcomeAttribution === 'BASELINE_SUCCESS'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : decisionTrace.outcomeAttribution === 'POLICY_BLOCKED'
                    ? 'bg-rose-950 text-rose-300 border border-rose-800'
                    : 'bg-slate-900 text-slate-300 border border-slate-800'
                }`}>
                  {decisionTrace.outcomeAttribution}
                </span>
              </div>

              <div className="text-right font-mono text-[11px] text-slate-400 space-y-0.5">
                <div>Case ID: <strong className="text-slate-200">{decisionTrace.caseIdentity.caseId}</strong></div>
                <div>Trace Completeness: <strong className="text-cyan-400">{decisionTrace.traceStatus}</strong></div>
              </div>
            </div>

            {/* 9-Step Decision Flow Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              
              {/* Step 1: Failure Detected */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <span className="font-extrabold text-cyan-400">1. FAILURE DETECTED</span>
                  <span className="text-[10px] font-mono text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-900">FAILED</span>
                </div>
                <div className="space-y-1 text-[11px] text-slate-300 font-mono">
                  <div>Code: <strong className="text-white">{decisionTrace.detection.failureCode}</strong></div>
                  <div>Amount: <strong className="text-emerald-400">{formatCurrency(decisionTrace.detection.amount)}</strong></div>
                  <div>Priority: <strong className="text-amber-400">{decisionTrace.detection.priority}</strong></div>
                </div>
                <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">{decisionTrace.detection.reasoning}</p>
              </div>

              {/* Step 2: Baseline Strategy */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <span className="font-extrabold text-indigo-400">2. BASELINE STRATEGY</span>
                  <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-900">M9.4</span>
                </div>
                <div className="space-y-1 text-[11px] text-slate-300 font-mono">
                  <div>Strategy: <strong className="text-white">{decisionTrace.baselineDecision.strategy}</strong></div>
                  <div>Action: <strong className="text-cyan-300">{decisionTrace.baselineDecision.actionLabel}</strong></div>
                  <div>Confidence: <strong className="text-indigo-300">{decisionTrace.baselineDecision.confidence}</strong></div>
                </div>
                <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">{decisionTrace.baselineDecision.reasoning}</p>
              </div>

              {/* Step 3: Historical Evidence */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <span className="font-extrabold text-cyan-400">3. HISTORICAL EVIDENCE</span>
                  <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-900">M9.5</span>
                </div>
                <div className="space-y-1 text-[11px] text-slate-300 font-mono">
                  <div>Observations: <strong className="text-white">{decisionTrace.historicalEvidence.observations}</strong></div>
                  <div>Recovery Rate: <strong className="text-emerald-400">{decisionTrace.historicalEvidence.caseRecoveryRate}%</strong></div>
                  <div>Source: <strong className="text-cyan-300">{decisionTrace.historicalEvidence.strategySource}</strong></div>
                </div>
                <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                  {decisionTrace.historicalEvidence.observations >= 5 ? 'Sufficient historical observations for optimization.' : 'Below minimum sample threshold (5 observations required).'}
                </p>
              </div>

              {/* Step 4: Adaptive Optimization */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <span className="font-extrabold text-emerald-400">4. ADAPTIVE OPTIMIZATION</span>
                  <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-900">M9.6</span>
                </div>
                <div className="space-y-1 text-[11px] text-slate-300 font-mono">
                  <div>Optimized: <strong className="text-white">{decisionTrace.adaptiveDecision.optimizedStrategy}</strong></div>
                  <div>Status: <strong className="text-emerald-300">{decisionTrace.adaptiveDecision.adaptationStatus}</strong></div>
                  <div>Changed: <strong className={decisionTrace.adaptiveDecision.strategyChanged ? 'text-amber-400' : 'text-slate-400'}>{decisionTrace.adaptiveDecision.strategyChanged ? 'YES' : 'NO'}</strong></div>
                </div>
                <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">{decisionTrace.adaptiveDecision.reasoning}</p>
              </div>

              {/* Step 5: Learning Assessment */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <span className="font-extrabold text-indigo-400">5. LEARNING ASSESSMENT</span>
                  <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-900">M9.7</span>
                </div>
                <div className="space-y-1 text-[11px] text-slate-300 font-mono">
                  <div>Confidence: <strong className="text-white">{decisionTrace.learningAssessment.confidenceLevel}</strong></div>
                  <div>Quality: <strong className="text-cyan-300">{decisionTrace.learningAssessment.evidenceQuality}</strong></div>
                  <div>Improvement: <strong className="text-emerald-300">{decisionTrace.learningAssessment.improvementStatus}</strong></div>
                </div>
                <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">{decisionTrace.learningAssessment.reasoning}</p>
              </div>

              {/* Step 6: Policy Authorization */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <span className="font-extrabold text-amber-400">6. POLICY AUTHORIZATION</span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                    decisionTrace.policyAssessment.status === 'ALLOWED' ? 'text-emerald-300 bg-emerald-950/60 border-emerald-900' : 'text-rose-300 bg-rose-950/60 border-rose-900'
                  }`}>{decisionTrace.policyAssessment.status}</span>
                </div>
                <div className="space-y-1 text-[11px] text-slate-300 font-mono">
                  <div>Status: <strong className="text-white">{decisionTrace.policyAssessment.status}</strong></div>
                  <div>Retry Limit: <strong className="text-emerald-300">{decisionTrace.policyAssessment.retryLimitStatus}</strong></div>
                </div>
                <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">{decisionTrace.policyAssessment.reason}</p>
              </div>

              {/* Step 7: Autonomy Eligibility */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <span className="font-extrabold text-cyan-400">7. AUTONOMY ELIGIBILITY</span>
                  <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-900">{decisionTrace.autonomyAssessment.status}</span>
                </div>
                <div className="space-y-1 text-[11px] text-slate-300 font-mono">
                  <div>Mode: <strong className="text-white">{decisionTrace.autonomyAssessment.mode}</strong></div>
                  <div>Eligible: <strong className="text-cyan-300">{decisionTrace.autonomyAssessment.eligible ? 'YES' : 'NO'}</strong></div>
                </div>
                <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">{decisionTrace.autonomyAssessment.reason}</p>
              </div>

              {/* Step 8: Execution Dispatch */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <span className="font-extrabold text-indigo-400">8. EXECUTION DISPATCH</span>
                  <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-900">{decisionTrace.executionAssessment.status}</span>
                </div>
                <div className="space-y-1 text-[11px] text-slate-300 font-mono">
                  <div>Actor: <strong className="text-white">{decisionTrace.executionAssessment.actor}</strong></div>
                  <div>Action: <strong className="text-cyan-300">{decisionTrace.executionAssessment.requestedAction}</strong></div>
                </div>
                <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">Execution Mode: {decisionTrace.executionAssessment.mode}</p>
              </div>

              {/* Step 9: Recovery Outcome */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <span className="font-extrabold text-emerald-400">9. RECOVERY OUTCOME</span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                    decisionTrace.lifecycleOutcome.isRecovered ? 'text-emerald-300 bg-emerald-950/60 border-emerald-900' : 'text-slate-400 bg-slate-900 border-slate-800'
                  }`}>{decisionTrace.lifecycleOutcome.finalState}</span>
                </div>
                <div className="space-y-1 text-[11px] text-slate-300 font-mono">
                  <div>Lifecycle: <strong className="text-white">{decisionTrace.lifecycleOutcome.finalState}</strong></div>
                  <div>Saved Revenue: <strong className="text-emerald-400">{formatCurrency(decisionTrace.lifecycleOutcome.recoveredAmount)}</strong></div>
                </div>
                <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">Attribution: {decisionTrace.outcomeAttribution}</p>
              </div>

            </div>

            {/* Before vs After Strategy Comparison Card */}
            <div className="bg-slate-950/80 border border-cyan-900/40 rounded-xl p-4 space-y-3 text-xs">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <Activity className="h-4 w-4 text-cyan-400" />
                <span className="font-bold text-cyan-300 uppercase tracking-wider">BEFORE VS AFTER STRATEGY COMPARISON</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-[11px]">
                <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 space-y-1">
                  <span className="text-slate-500 text-[10px] block">M9.4 BASELINE</span>
                  <span className="font-extrabold text-indigo-300 block">{decisionTrace.comparison.baseStrategy}</span>
                </div>
                <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 space-y-1">
                  <span className="text-slate-500 text-[10px] block">M9.6 OPTIMIZED</span>
                  <span className="font-extrabold text-cyan-300 block">{decisionTrace.comparison.optimizedStrategy}</span>
                </div>
                <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 space-y-1">
                  <span className="text-slate-500 text-[10px] block">CHANGE STATUS</span>
                  <span className={`font-extrabold block ${decisionTrace.comparison.strategyChanged ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {decisionTrace.comparison.strategyChanged ? 'ADAPTIVE STRATEGY APPLIED' : 'BASELINE RETAINED'}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed font-sans">{decisionTrace.comparison.changeReason}</p>
            </div>

          </div>
        ) : (
          <div className="text-center py-8 text-slate-500 text-xs font-mono border border-dashed border-slate-800 rounded-xl">
            NO RECOVERY DECISION TRACE DATA AVAILABLE
          </div>
        )}

      </div>

      {/* SECTION 8: RECOVERY OUTCOME FEEDBACK & STRATEGY CALIBRATION */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white tracking-tight">RECOVERY OUTCOME FEEDBACK & STRATEGY CALIBRATION</h2>
          </div>
          
          <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950 px-2.5 py-0.5 rounded border border-emerald-800">
            Milestone 9.9 Strategy Calibration
          </span>
        </div>

        {outcomeFeedback ? (
          <div className="space-y-6">
            
            {/* Overview Feedback Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              
              {/* Card 1: Calibration Status */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">CALIBRATION STATUS</span>
                <span className={`text-2xl font-extrabold block ${
                  outcomeFeedback.calibrationStatus === 'CALIBRATED'
                    ? 'text-emerald-400'
                    : outcomeFeedback.calibrationStatus === 'NEEDS_REVIEW'
                    ? 'text-rose-400'
                    : 'text-amber-400'
                }`}>
                  {outcomeFeedback.calibrationStatus}
                </span>
                <span className="text-[11px] text-slate-400 block">
                  Outcome: <strong className="text-cyan-300">{outcomeFeedback.outcomeClassification}</strong>
                </span>
              </div>

              {/* Card 2: Outcome Alignment */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">OUTCOME ALIGNMENT</span>
                <span className={`text-2xl font-extrabold block ${
                  outcomeFeedback.outcomeAlignment === 'ALIGNED'
                    ? 'text-emerald-400'
                    : outcomeFeedback.outcomeAlignment === 'MISALIGNED'
                    ? 'text-rose-400'
                    : 'text-slate-400'
                }`}>
                  {outcomeFeedback.outcomeAlignment}
                </span>
                <span className="text-[11px] text-slate-400 block">
                  Expected: <strong className="text-indigo-300">{outcomeFeedback.expectedOutcome}</strong>
                </span>
              </div>

              {/* Card 3: Confidence Calibration */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">CONFIDENCE CALIBRATION</span>
                <span className={`text-2xl font-extrabold block ${
                  outcomeFeedback.confidenceCalibration === 'WELL_CALIBRATED'
                    ? 'text-emerald-400'
                    : outcomeFeedback.confidenceCalibration === 'OVERCONFIDENT'
                    ? 'text-rose-400'
                    : 'text-indigo-300'
                }`}>
                  {outcomeFeedback.confidenceCalibration}
                </span>
                <span className="text-[11px] text-slate-400 block">
                  Strategy: <strong className="text-cyan-300">{outcomeFeedback.strategyCalibration}</strong>
                </span>
              </div>

              {/* Card 4: Adaptive Outcome Feedback */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">ADAPTIVE FEEDBACK</span>
                <span className="text-sm font-extrabold text-cyan-300 block truncate">
                  {outcomeFeedback.adaptiveFeedback}
                </span>
                <span className="text-[11px] text-slate-400 block">
                  Pattern: <strong className="text-slate-300">{outcomeFeedback.repeatedPattern}</strong>
                </span>
              </div>

            </div>

            {/* Deterministic Reasoning Box */}
            <div className="bg-slate-950/80 border border-emerald-900/40 rounded-xl p-4 space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span className="font-bold text-emerald-300 uppercase tracking-wider">STRATEGY CALIBRATION & OUTCOME REASONING</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans pt-1">
                {outcomeFeedback.feedbackReasoning}
              </p>
            </div>

          </div>
        ) : (
          <div className="text-center py-8 text-slate-500 text-xs font-mono border border-dashed border-slate-800 rounded-xl">
            NO OUTCOME FEEDBACK DATA AVAILABLE
          </div>
        )}

      </div>

      {/* Safety Disclaimer Banner */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 flex items-center gap-3 text-xs font-semibold text-slate-400">
        <ShieldCheck className="h-4 w-4 shrink-0 text-cyan-400" />
        <span>RecoverAI Agent Console — Connected to shared RecoveryContext & backend recovery stream. Milestone 9.9 Strategy Calibration Active.</span>
      </div>

    </div>
  );
}
