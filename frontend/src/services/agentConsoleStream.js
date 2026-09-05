import { createBackendRecoveryEvent, authorizeBackendProposal } from './api.js';

/**
 * Autonomous AI Agent Console Telemetry & Policy Control Service — RecoverAI M6 Page 2 Part 2
 * Provides structured telemetry, decision streams, policy evaluation, action override simulation,
 * and operator audit trail entries.
 */

/**
 * Returns default agent policy configuration schema.
 * 
 * @returns {Object} Default policy configuration
 */
export function getAgentPolicyDefaults() {
  return {
    autoOutreachEnabled: true,
    minPriorityThreshold: 'HIGH',
    maxRetryLimit: 1
  };
}

/**
 * Returns structured autonomous agent telemetry and 5-stage decision pipeline stream.
 * Accepts optional activeRecoverySession to build pipeline from actual Customer runtime transaction data.
 * 
 */
/**
 * Returns structured autonomous agent telemetry derived from authentic recovery state.
 * Accepts activeRecoverySession, recoveryEvents, dbEvents, currentMerchantId, and autonomyEnabled.
 */
export function getAgentConsoleState(activeRecoverySession = null, recoveryEvents = [], dbEvents = [], currentMerchantId = null, autonomyEnabled = false) {
  const timestamp = new Date().toISOString();

  // 1. Gather all candidate events/sessions matching currentMerchantId
  const rawItems = [];

  if (activeRecoverySession) {
    if (!activeRecoverySession.merchantId || !currentMerchantId || activeRecoverySession.merchantId === currentMerchantId) {
      rawItems.push(activeRecoverySession);
    }
  }

  (recoveryEvents || []).forEach(e => {
    if (!e.merchantId || !currentMerchantId || e.merchantId === currentMerchantId) {
      rawItems.push(e);
    }
  });

  (dbEvents || []).forEach(e => {
    if (!e.merchantId || !currentMerchantId || e.merchantId === currentMerchantId) {
      rawItems.push(e);
    }
  });

  // 2. Consolidate by payment case identifier
  const caseMap = new Map();

  rawItems.forEach(item => {
    const key = item.activityId || item.paymentAttemptId || item.id || (item.merchantId && item.customerId && item.productId ? `${item.merchantId}_${item.customerId}_${item.productId}` : null);
    if (!key) return;

    const existing = caseMap.get(key);
    const status = item.currentStatus || item.status || (item.recoveryOutcome ? 'RECOVERED' : 'FAILED');
    const isRecovered = status === 'RECOVERED' || Boolean(item.recoveryOutcome) || item.recommendedAction === 'RECOVERED';
    const amount = Number(item.amount || item.attemptedAmount || item.recoveredAmount || item.recoveryAssessment?.amount || 0);

    if (!existing) {
      caseMap.set(key, {
        caseId: key,
        activityId: item.activityId || key,
        paymentAttemptId: item.paymentAttemptId || key,
        paymentResultId: item.paymentResultId || null,
        customerId: item.customerId || item.recoveryAssessment?.customerId || 'Customer',
        productId: item.productId || 'prod_demo',
        productName: item.productName || item.product?.name || item.name || 'Digital Product',
        amount: amount,
        currency: item.currency || 'INR',
        failureCode: item.failureCode || item.resultEvent?.failureCode || 'SERVER_ERROR',
        priority: item.priority || item.recoveryPriority?.priority || 'CRITICAL',
        recommendedAction: isRecovered ? 'RECOVERED' : (item.recommendedAction || item.recoveryDecision?.recommendedAction || 'RETRY_PAYMENT'),
        status: isRecovered ? 'RECOVERED' : 'FAILED',
        retryCount: item.retryCount || 0,
        timestamp: item.lastUpdated || item.timestamp || item.created_at || timestamp,
        merchantId: item.merchantId || currentMerchantId
      });
    } else {
      // Canonical lifecycle rule: RECOVERED status overrides FAILED
      if (isRecovered) {
        existing.status = 'RECOVERED';
        existing.recommendedAction = 'RECOVERED';
        if (amount > 0) existing.amount = amount;
      }
      if (item.productName) existing.productName = item.productName;
      if (item.customerId) existing.customerId = item.customerId;
    }
  });

  const allCases = Array.from(caseMap.values());
  const activeCases = allCases.filter(c => {
    const fin = finalizeRecoveryLifecycle(null, c, currentMerchantId);
    return fin.active === true && fin.terminal === false;
  });
  const recoveredCases = allCases.filter(c => c.status === 'RECOVERED');

  const activeCasesCount = activeCases.length;
  const totalFailedCount = allCases.length;
  const recoveredRevenueAmount = recoveredCases.reduce((sum, c) => sum + (c.amount || 0), 0);
  const recoveryEfficiencyPct = totalFailedCount > 0 ? Math.round((recoveredCases.length / totalFailedCount) * 100) : 0;

  // 3. Build live activity log items and evaluate decisions for active cases
  const liveActivity = [];
  let primaryDecision = null;

  if (activeCases.length > 0) {
    primaryDecision = evaluateAgentDecision(activeCases[0], null, dbEvents, recoveryEvents, currentMerchantId);
  }

  allCases.forEach(c => {
    // 1. Initial Failure Case Detection
    liveActivity.push({
      id: `act_fail_${c.caseId}`,
      type: 'RECOVERY CASE DETECTED',
      actionType: 'RECOVERY CASE DETECTED',
      summary: `Payment failure detected for customer ${c.customerId} (${c.productName}) — ${c.currency} ${c.amount.toLocaleString('en-IN')} at risk`,
      timestamp: c.timestamp
    });

    if (c.status === 'RECOVERED') {
      // 2. Decision Generated (Historical)
      liveActivity.push({
        id: `act_dec_${c.caseId}`,
        type: 'AGENT DECISION GENERATED',
        actionType: 'AGENT DECISION GENERATED',
        summary: `Recommended action: Retry Payment — Policy: ALLOWED — Confidence: HIGH`,
        timestamp: c.timestamp
      });

      // 3. Action Executed & Succeeded
      liveActivity.push({
        id: `act_exec_succ_${c.caseId}`,
        type: 'RECOVERY ACTION SUCCEEDED',
        actionType: 'RECOVERY ACTION SUCCEEDED',
        summary: `Recovery retry succeeded for customer ${c.customerId} — ${c.currency} ${c.amount.toLocaleString('en-IN')} saved`,
        timestamp: c.timestamp
      });

      // 4. Recovery Completed
      liveActivity.push({
        id: `act_rec_${c.caseId}`,
        type: 'RECOVERY COMPLETED',
        actionType: 'RECOVERY COMPLETED',
        summary: `Payment recovered for customer ${c.customerId} (${c.productName}) — ${c.currency} ${c.amount.toLocaleString('en-IN')} saved`,
        timestamp: c.timestamp
      });
    } else {
      if (primaryDecision && primaryDecision.caseId === c.caseId) {
        liveActivity.push({
          id: `act_strat_${c.caseId}`,
          type: 'RECOVERY STRATEGY GENERATED',
          actionType: 'RECOVERY STRATEGY GENERATED',
          summary: `Strategy selected: ${primaryDecision.actionLabel} — ${c.failureCode || 'SERVER_ERROR'} failure evaluated — Confidence: ${primaryDecision.confidence}`,
          timestamp: c.timestamp
        });

        if (primaryDecision.strategySource === 'HISTORICAL_ADAPTATION') {
          liveActivity.push({
            id: `act_adapt_${c.caseId}`,
            type: 'ADAPTIVE STRATEGY RECOMMENDED',
            actionType: 'ADAPTIVE STRATEGY RECOMMENDED',
            summary: `Adaptive optimization applied (${primaryDecision.adaptationStatus}): ${primaryDecision.reasoning}`,
            timestamp: c.timestamp
          });
        }

        if (primaryDecision.learning?.learningStatus === 'LEARNING_ACTIVE') {
          liveActivity.push({
            id: `act_feedback_${c.caseId}`,
            type: 'RECOVERY OUTCOME FEEDBACK EVALUATED',
            actionType: 'RECOVERY OUTCOME FEEDBACK EVALUATED',
            summary: `Outcome feedback evaluated: ${primaryDecision.learning.learningReasoning}`,
            timestamp: c.timestamp
          });
        }

        liveActivity.push({
          id: `act_dec_${c.caseId}`,
          type: 'AGENT DECISION GENERATED',
          actionType: 'AGENT DECISION GENERATED',
          summary: `Recommended action: ${primaryDecision.actionLabel} — Policy: ${primaryDecision.policyStatus} — Confidence: ${primaryDecision.confidence}`,
          timestamp: c.timestamp
        });
      }
    }

    // 5. Outcome Reconciled Timeline Event (M10.6)
    const recEvent = reconcileRecoveryExecutionOutcome(null, null, c, c, currentMerchantId, c.timestamp);
    liveActivity.push({
      id: `act_reconcile_${c.caseId}`,
      type: 'RECOVERY_EXECUTION_OUTCOME_RECONCILED',
      actionType: 'RECOVERY_EXECUTION_OUTCOME_RECONCILED',
      summary: `Outcome reconciled: ${recEvent.reconciledOutcome} (${recEvent.reconciliationStatus}) — Authority: ${recEvent.reasoning?.backendStatus ? 'BACKEND' : 'NONE'}`,
      timestamp: c.timestamp,
      executionOutcome: recEvent.executionAssessment?.executionSucceeded ? 'SUCCESS' : (recEvent.executionAssessment?.executionFailed ? 'FAILED' : 'NOT_EXECUTED'),
      backendOutcome: recEvent.backendOutcome,
      reconciledOutcome: recEvent.reconciledOutcome,
      outcomeAuthority: recEvent.reasoning?.backendStatus ? 'BACKEND' : 'NONE',
      reconciliationStatus: recEvent.reconciliationStatus,
      recoveryConfirmed: recEvent.recoveryConfirmed,
      inconsistencies: recEvent.inconsistencies
    });

    // 6. Lifecycle Finalized Timeline Event (M10.7)
    const finEvent = finalizeRecoveryLifecycle(recEvent, c, currentMerchantId, c.timestamp);
    liveActivity.push({
      id: `act_finalize_${c.caseId}`,
      type: 'RECOVERY_LIFECYCLE_FINALIZED',
      actionType: 'RECOVERY_LIFECYCLE_FINALIZED',
      summary: `Lifecycle finalized: ${finEvent.lifecycleClassification} (${finEvent.closureStatus}) — Active: ${finEvent.active ? 'true' : 'false'}`,
      timestamp: c.timestamp,
      lifecycleClassification: finEvent.lifecycleClassification,
      closureStatus: finEvent.closureStatus,
      terminal: finEvent.terminal,
      recoveryOutcome: finEvent.recoveryOutcome,
      recoveryConfirmed: finEvent.recoveryConfirmed,
      recoveredAmount: finEvent.recoveredAmount,
      activeCaseStatus: finEvent.activeCaseStatus,
      closureReason: finEvent.closureReason
    });
  });

  // Evaluate M9.1 / M9.2 Autonomy Eligibility for primary active case
  const primaryAutonomyEligibility = activeCases.length > 0
    ? evaluateAutonomyEligibility(activeCases[0], primaryDecision, autonomyEnabled, currentMerchantId)
    : { eligible: false, reason: 'No active recovery cases requiring autonomous execution.', gateFailures: ['NO_ACTIVE_CASES'] };

  return {
    agentStatus: 'READY',
    mode: 'MODE: RULE_BASED_ORCHESTRATION',
    environment: 'RUNTIME_CUSTOMER_ENVIRONMENT',
    evaluatedFailedPayments: totalFailedCount,
    activeCasesCount: activeCasesCount,
    pendingActionsCount: 0,
    recoveredRevenueAmount: recoveredRevenueAmount,
    recoveryEfficiencyPct: recoveryEfficiencyPct,
    recommendedRecoveryActions: activeCasesCount,
    executionStreamStatus: 'IDLE',
    timestamp: timestamp,
    allCases: allCases,
    activeCases: activeCases,
    activeCase: activeCases[0] || null,
    liveActivity: liveActivity,
    agentDecision: primaryDecision,
    hasActiveCase: activeCasesCount > 0,
    autonomyEnabled: Boolean(autonomyEnabled),
    autonomyEligibility: primaryAutonomyEligibility,
    pipeline: activeCasesCount > 0 ? [
      {
        stageNumber: 1,
        stage: 'Signal Evaluation',
        stageCode: 'SIGNAL_EVALUATION',
        status: 'COMPLETED',
        event: 'PAYMENT_FAILED_DETECTED',
        summary: `Detected payment result (${activeCases[0].failureCode}) for customer ${activeCases[0].customerId}`,
        details: {
          customerId: activeCases[0].customerId,
          failureCode: activeCases[0].failureCode,
          attemptedAmount: activeCases[0].amount,
          currency: activeCases[0].currency
        }
      },
      {
        stageNumber: 2,
        stage: 'Priority Scoring',
        stageCode: 'PRIORITY_SCORING',
        status: 'COMPLETED',
        event: 'RECOVERY_PRIORITY_CALCULATED',
        summary: `Calculated priority tier (${activeCases[0].priority})`,
        details: {
          priority: activeCases[0].priority
        }
      },
      {
        stageNumber: 3,
        stage: 'Recovery Assessment',
        stageCode: 'RECOVERY_ASSESSMENT',
        status: 'COMPLETED',
        event: 'REVENUE_RISK_EVALUATED',
        summary: `Evaluated revenue-at-risk (${activeCases[0].currency} ${activeCases[0].amount})`,
        details: {
          revenueAtRisk: activeCases[0].amount,
          currency: activeCases[0].currency
        }
      },
      {
        stageNumber: 4,
        stage: 'Action Planning',
        stageCode: 'ACTION_PLANNING',
        status: 'COMPLETED',
        event: 'RECOVERY_ACTION_PLANNED',
        summary: `Recommended recovery action: ${primaryDecision ? primaryDecision.actionLabel : activeCases[0].recommendedAction}`,
        details: {
          recommendedAction: primaryDecision ? primaryDecision.actionLabel : activeCases[0].recommendedAction
        }
      },
      {
        stageNumber: 5,
        stage: 'Outreach Execution',
        stageCode: 'OUTREACH_EXECUTION',
        status: primaryAutonomyEligibility.eligible ? 'AUTONOMOUS_READY' : 'IDLE',
        event: primaryAutonomyEligibility.eligible ? 'AUTONOMOUS_EXECUTION_READY' : 'AWAITING_SIMULATED_EXECUTION',
        summary: primaryAutonomyEligibility.eligible 
          ? 'Autonomous safety gates cleared — Qualified for autonomous retry execution'
          : `Execution state IDLE (${primaryAutonomyEligibility.reason})`,
        details: {
          executionStatus: primaryAutonomyEligibility.eligible ? 'AUTONOMOUS_READY' : 'IDLE',
          autonomyEligible: primaryAutonomyEligibility.eligible
        }
      }
    ] : []
  };
}

/**
 * Evaluates active recovery case context and deterministically recommends the optimal recovery strategy.
 * Milestone 9.4 — Strategy Engine
 * 
 * STRICT BOUNDARIES:
 * - Pure, side-effect free, deterministic function.
 * - Does NOT mutate state, call payment APIs, or modify storage.
 * - Strategy selection is separate from Policy authorization and Autonomy eligibility.
 * 
 * @param {Object|null} activeCase - Active unrecovered recovery case
 * @param {Object|null} [policyConfig] - Merchant policy configuration overrides
 * @returns {Object} Structured strategy result object
 */
export function evaluateRecoveryStrategy(activeCase, policyConfig = null) {
  const timestamp = new Date().toISOString();

  if (!activeCase || typeof activeCase !== 'object') {
    return {
      strategy: 'OPERATOR_REVIEW',
      action: 'OPERATOR_REVIEW',
      label: 'Operator Review',
      reasoning: 'Critical recovery context is missing or invalid. Escalated for operator review.',
      confidence: 'LOW',
      policyRequired: true,
      timestamp
    };
  }

  const status = activeCase.status || 'FAILED';
  const failureCode = (activeCase.failureCode || 'SERVER_ERROR').toUpperCase();
  const priority = (activeCase.priority || 'CRITICAL').toUpperCase();
  const retryCount = Number(activeCase.retryCount || 0);
  const amount = Number(activeCase.amount || 0);
  const currency = activeCase.currency || 'INR';
  const productName = activeCase.productName || 'Digital Product';

  const maxRetryLimit = policyConfig?.maxRetryLimit ?? 1;

  // Rule 1: Resolved or Recovered cases -> NO_ACTION
  if (status === 'RECOVERED' || status === 'SUCCESS' || status === 'CANCELLED') {
    return {
      strategy: 'NO_ACTION',
      action: 'NO_ACTION',
      label: 'No Action Required',
      reasoning: `Opportunity is already ${status.toLowerCase()} — No further recovery strategy required.`,
      confidence: 'HIGH',
      policyRequired: false,
      timestamp
    };
  }

  // Rule 2: Exceeded Retry Limit -> OPERATOR_REVIEW
  if (retryCount >= maxRetryLimit) {
    return {
      strategy: 'OPERATOR_REVIEW',
      action: 'OPERATOR_REVIEW',
      label: 'Operator Review Required',
      reasoning: `Payment failure reached configured retry limit (${retryCount}/${maxRetryLimit}). Further autonomous retry is not permitted and operator review is required.`,
      confidence: 'HIGH',
      policyRequired: true,
      timestamp
    };
  }

  // Rule 3: Known Recoverable Failures vs Unrecoverable / Unknown Failures
  const RECOVERABLE_FAILURES = ['SERVER_ERROR', 'NETWORK_TIMEOUT', 'NETWORK_ERROR', 'INSUFFICIENT_FUNDS', 'CARD_DECLINED', 'EXPIRED_CARD', 'PROCESSING_ERROR'];
  if (!RECOVERABLE_FAILURES.includes(failureCode)) {
    return {
      strategy: 'OPERATOR_REVIEW',
      action: 'OPERATOR_REVIEW',
      label: 'Operator Review Required',
      reasoning: `Failure code '${failureCode}' is not recognized as a safely recoverable failure. Human operator review is required.`,
      confidence: 'MEDIUM',
      policyRequired: true,
      timestamp
    };
  }

  // Rule 4: Priority-Based Strategy Assignment
  if (priority === 'LOW') {
    return {
      strategy: 'MONITOR',
      action: 'MONITOR',
      label: 'Monitor Activity',
      reasoning: `Low priority opportunity (${priority}) detected for ${productName} (${currency} ${amount.toLocaleString('en-IN')}). Strategy set to MONITOR to observe activity.`,
      confidence: 'MEDIUM',
      policyRequired: true,
      timestamp
    };
  }

  // Rule 5: High / Critical Priority Recoverable Failure -> RETRY_PAYMENT
  let confidence = 'HIGH';
  if (priority === 'MEDIUM') {
    confidence = 'MEDIUM';
  }

  let failureExplanation = '';
  if (failureCode === 'SERVER_ERROR' || failureCode === 'NETWORK_TIMEOUT' || failureCode === 'NETWORK_ERROR') {
    failureExplanation = `Payment failed with temporary recoverable error (${failureCode})`;
  } else if (failureCode === 'INSUFFICIENT_FUNDS' || failureCode === 'CARD_DECLINED' || failureCode === 'EXPIRED_CARD') {
    failureExplanation = `Payment attempt declined due to ${failureCode}`;
  } else {
    failureExplanation = `Payment failure detected with error ${failureCode}`;
  }

  return {
    strategy: 'RETRY_PAYMENT',
    action: 'RETRY_PAYMENT',
    label: 'Retry Payment',
    reasoning: `${failureExplanation} for ${productName} (${currency} ${amount.toLocaleString('en-IN')}). Retry count (${retryCount}/${maxRetryLimit}) is within policy limits. Payment retry strategy recommended.`,
    confidence,
    policyRequired: true,
    timestamp
  };
}

/**
 * Milestone 9.6 — Adaptive Recovery Strategy Optimization Engine.
 * Optimizes M9.4 base strategy recommendation using M9.5 historical outcome performance.
 * 
 * STRICT BOUNDARIES:
 * - Pure, deterministic function.
 * - 0 API calls, 0 DB writes, 0 storage writes, 0 side effects.
 * - Does NOT bypass policy, bypass autonomy, or modify merchant configuration.
 * - Does NOT execute payments or alter retry limits.
 * - Strictly merchant-scoped.
 * 
 * @param {Object|null} activeCase - Active recovery case object
 * @param {Object|null} baseStrategy - Output of evaluateRecoveryStrategy()
 * @param {Object|null} strategyPerformance - Output of evaluateStrategyPerformance()
 * @param {Object|null} [policyConfig] - Merchant policy configuration overrides
 * @returns {Object} Structured adaptive optimization result
 */
export function optimizeRecoveryStrategy(activeCase, baseStrategy, strategyPerformance, policyConfig = null) {
  const timestamp = new Date().toISOString();

  if (!baseStrategy) {
    return {
      baseStrategy: 'OPERATOR_REVIEW',
      optimizedStrategy: 'OPERATOR_REVIEW',
      action: 'OPERATOR_REVIEW',
      actionLabel: 'Operator Review Required',
      adaptationStatus: 'BASELINE',
      strategySource: 'BASELINE',
      historicalEvidence: { observations: 0, successful: 0, caseRecoveryRate: 0, financialRecoveryRate: 0, strategyScore: 0 },
      reasoning: 'Baseline strategy is OPERATOR_REVIEW due to missing case context.',
      confidence: 'LOW',
      timestamp
    };
  }

  // Hierarchy Step 1: Baseline Strategy Checks (Preserve NO_ACTION & OPERATOR_REVIEW baseline limits)
  if (baseStrategy.strategy === 'NO_ACTION') {
    return {
      baseStrategy: 'NO_ACTION',
      optimizedStrategy: 'NO_ACTION',
      action: 'NO_ACTION',
      actionLabel: 'No Action Required',
      adaptationStatus: 'BASELINE',
      strategySource: 'BASELINE',
      historicalEvidence: { observations: 0, successful: 0, caseRecoveryRate: 0, financialRecoveryRate: 0, strategyScore: 0 },
      reasoning: baseStrategy.reasoning,
      confidence: baseStrategy.confidence,
      timestamp
    };
  }

  const retryCount = Number(activeCase?.retryCount || 0);
  const maxRetryLimit = policyConfig?.maxRetryLimit ?? 1;

  if (retryCount >= maxRetryLimit) {
    return {
      baseStrategy: baseStrategy.strategy,
      optimizedStrategy: 'OPERATOR_REVIEW',
      action: 'OPERATOR_REVIEW',
      actionLabel: 'Operator Review Required',
      adaptationStatus: 'BASELINE',
      strategySource: 'BASELINE',
      historicalEvidence: { observations: 0, successful: 0, caseRecoveryRate: 0, financialRecoveryRate: 0, strategyScore: 0 },
      reasoning: `Baseline strategy is OPERATOR_REVIEW because payment retry limit (${retryCount}/${maxRetryLimit}) has been reached. Historical success cannot override retry limits.`,
      confidence: 'HIGH',
      timestamp
    };
  }

  // Hierarchy Step 2: Minimum Sample Size Threshold Check (MIN_SAMPLE_THRESHOLD = 5)
  const MIN_SAMPLE_THRESHOLD = 5;
  const targetStratMetrics = strategyPerformance?.strategies?.[baseStrategy.strategy] || { recommended: 0, executed: 0, successful: 0, caseRecoveryRate: 0, financialRecoveryRate: 0 };
  const sampleObservations = targetStratMetrics.executed || targetStratMetrics.recommended || 0;

  if (sampleObservations < MIN_SAMPLE_THRESHOLD) {
    return {
      baseStrategy: baseStrategy.strategy,
      optimizedStrategy: baseStrategy.strategy,
      action: baseStrategy.action,
      actionLabel: baseStrategy.label,
      adaptationStatus: 'INSUFFICIENT_DATA',
      strategySource: 'BASELINE',
      historicalEvidence: {
        observations: sampleObservations,
        successful: targetStratMetrics.successful || 0,
        caseRecoveryRate: targetStratMetrics.caseRecoveryRate || 0,
        financialRecoveryRate: targetStratMetrics.financialRecoveryRate || 0,
        strategyScore: 0
      },
      reasoning: `${baseStrategy.reasoning} Historical strategy data is below minimum sample threshold (${sampleObservations}/${MIN_SAMPLE_THRESHOLD} completed observations required), so baseline strategy is preserved without adaptive modification.`,
      confidence: baseStrategy.confidence,
      timestamp
    };
  }

  // Hierarchy Step 3: Historical Scoring & Classification
  // Deterministic scoring formula: 0.5 * caseRecoveryRate + 0.3 * financialRecoveryRate + 0.2 * executionSuccessRate
  const caseRate = targetStratMetrics.caseRecoveryRate || 0;
  const finRate = targetStratMetrics.financialRecoveryRate || 0;
  const execSuccessRate = targetStratMetrics.executed > 0 ? Math.round((targetStratMetrics.successful / targetStratMetrics.executed) * 100) : 0;

  const strategyScore = Math.round(0.5 * caseRate + 0.3 * finRate + 0.2 * execSuccessRate);

  let adaptationStatus = 'SUPPORTED_BY_HISTORY';
  let confidence = 'HIGH';
  let optimizedStrategy = baseStrategy.strategy;
  let actionLabel = baseStrategy.label;
  let adaptationReasoning = '';

  if (caseRate >= 70) {
    adaptationStatus = 'SUPPORTED_BY_HISTORY';
    confidence = 'HIGH';
    adaptationReasoning = `Baseline strategy is ${baseStrategy.label}. Merchant historical outcome analytics support ${baseStrategy.label} with a ${caseRate}% recovery rate across ${sampleObservations} executed attempts (${targetStratMetrics.successful} successful recoveries).`;
  } else if (caseRate >= 40) {
    adaptationStatus = 'MIXED_HISTORY';
    confidence = 'MEDIUM';
    adaptationReasoning = `Baseline strategy is ${baseStrategy.label}. Merchant historical data shows moderate recovery performance (${caseRate}% recovery rate across ${sampleObservations} observations). Recommended to proceed under policy controls.`;
  } else {
    adaptationStatus = 'HISTORICALLY_WEAK';
    confidence = 'LOW';
    adaptationReasoning = `Baseline strategy is ${baseStrategy.label}. Historical recovery performance for this strategy is low (${caseRate}% recovery rate across ${sampleObservations} observations). Operator review is recommended prior to retry.`;
    optimizedStrategy = 'OPERATOR_REVIEW';
    actionLabel = 'Operator Review Recommended';
  }

  return {
    baseStrategy: baseStrategy.strategy,
    optimizedStrategy,
    action: optimizedStrategy,
    actionLabel,
    adaptationStatus,
    strategySource: 'HISTORICAL_ADAPTATION',
    historicalEvidence: {
      observations: sampleObservations,
      successful: targetStratMetrics.successful || 0,
      caseRecoveryRate: caseRate,
      financialRecoveryRate: finRate,
      strategyScore
    },
    reasoning: adaptationReasoning,
    confidence,
    timestamp
  };
}

// Milestone 9.7 Named Constants
export const MIN_SAMPLE_THRESHOLD = 5;
export const RECENT_WINDOW_DAYS = 30;
export const IMPROVEMENT_THRESHOLD_HIGH = 10; // +10%
export const IMPROVEMENT_THRESHOLD_LOW = -10;  // -10%

/**
 * Milestone 9.7 — Recovery Strategy Learning & Decision Confidence Engine.
 * Evaluates whether adaptive strategy recommendations are improving recovery outcomes compared with baseline.
 * 
 * STRICT BOUNDARIES:
 * - Pure, deterministic, side-effect free function.
 * - 0 API calls, 0 DB writes, 0 storage writes, 0 side effects.
 * - Does NOT modify policy, maxRetryLimit, financial thresholds, or autonomy state.
 * - Does NOT execute payments or alter recovery lifecycles.
 * - Strictly merchant-scoped.
 * 
 * @param {Object|null} strategyPerformance - Output of evaluateStrategyPerformance()
 * @param {Object|null} adaptiveStrategy - Output of optimizeRecoveryStrategy()
 * @param {Array|null} historicalContext - Raw backend events array
 * @param {Object|null} currentCase - Active recovery case object
 * @returns {Object} Structured learning result
 */
export function evaluateRecoveryLearning(strategyPerformance, adaptiveStrategy, historicalContext = null, currentCase = null) {
  const timestamp = new Date().toISOString();

  if (!strategyPerformance || !strategyPerformance.hasHistory) {
    return {
      learningStatus: 'INSUFFICIENT_DATA',
      confidenceLevel: 'LOW',
      evidenceQuality: 'LIMITED',
      baselinePerformance: { caseRecoveryRate: 0, observations: 0 },
      adaptivePerformance: { caseRecoveryRate: 0, observations: 0 },
      improvementStatus: 'INSUFFICIENT_EVIDENCE',
      improvementScore: 0,
      strategyEffectiveness: 'UNKNOWN',
      recommendationStability: 'UNCERTAIN',
      regressionDetected: false,
      regressionReason: null,
      learningReasoning: 'No historical recovery events recorded for this merchant. Learning status set to INSUFFICIENT_DATA.',
      sampleSize: 0,
      timestamp
    };
  }

  const sampleSize = strategyPerformance.overview?.totalCases || 0;
  const baseStratName = adaptiveStrategy?.baseStrategy || 'RETRY_PAYMENT';
  const optStratName = adaptiveStrategy?.optimizedStrategy || baseStratName;

  const baseMetrics = strategyPerformance.strategies?.[baseStratName] || { caseRecoveryRate: 0, executed: 0 };
  const optMetrics = strategyPerformance.strategies?.[optStratName] || { caseRecoveryRate: 0, executed: 0 };

  const baseRate = baseMetrics.caseRecoveryRate || 0;
  const optRate = optMetrics.caseRecoveryRate || 0;
  const targetObservations = (adaptiveStrategy?.historicalEvidence?.observations !== undefined && adaptiveStrategy?.historicalEvidence?.observations !== null) ? adaptiveStrategy.historicalEvidence.observations : sampleSize;

  // 1. Evidence Quality Classification
  let evidenceQuality = 'LIMITED';
  if (targetObservations >= 10) {
    evidenceQuality = 'STRONG';
  } else if (targetObservations >= MIN_SAMPLE_THRESHOLD) {
    evidenceQuality = 'MODERATE';
  } else {
    evidenceQuality = 'LIMITED';
  }

  // Sample Threshold Check
  if (targetObservations < MIN_SAMPLE_THRESHOLD) {
    return {
      learningStatus: 'INSUFFICIENT_DATA',
      confidenceLevel: 'LOW',
      evidenceQuality: 'LIMITED',
      baselinePerformance: { caseRecoveryRate: baseRate, observations: baseMetrics.executed || 0 },
      adaptivePerformance: { caseRecoveryRate: optRate, observations: optMetrics.executed || 0 },
      improvementStatus: 'INSUFFICIENT_EVIDENCE',
      improvementScore: 0,
      strategyEffectiveness: 'UNKNOWN',
      recommendationStability: baseStratName === optStratName ? 'STABLE' : 'UNCERTAIN',
      regressionDetected: false,
      regressionReason: null,
      learningReasoning: `Historical sample size (${targetObservations}/${MIN_SAMPLE_THRESHOLD} required observations) is below threshold. Decision confidence is LOW and evidence quality is LIMITED.`,
      sampleSize: targetObservations,
      timestamp
    };
  }

  // 2. Improvement Status & Score
  const improvementScore = optRate - baseRate;
  let improvementStatus = 'STABLE';
  if (improvementScore >= IMPROVEMENT_THRESHOLD_HIGH) {
    improvementStatus = 'IMPROVED';
  } else if (improvementScore <= IMPROVEMENT_THRESHOLD_LOW) {
    improvementStatus = 'REGRESSED';
  } else {
    improvementStatus = 'STABLE';
  }

  // 3. Strategy Effectiveness Classification
  let strategyEffectiveness = 'UNKNOWN';
  if (optRate >= 70) {
    strategyEffectiveness = 'EFFECTIVE';
  } else if (optRate >= 40) {
    strategyEffectiveness = 'MIXED';
  } else {
    strategyEffectiveness = 'WEAK';
  }

  // 4. Recommendation Stability
  let recommendationStability = 'STABLE';
  if (baseStratName !== optStratName) {
    recommendationStability = 'CHANGED_FROM_BASELINE';
  } else if (strategyEffectiveness === 'WEAK') {
    recommendationStability = 'UNCERTAIN';
  } else {
    recommendationStability = 'STABLE';
  }

  // 5. Decision Confidence Classification
  let confidenceLevel = 'MEDIUM';
  if (evidenceQuality === 'STRONG' && optRate >= 70 && recommendationStability !== 'UNCERTAIN') {
    confidenceLevel = 'HIGH';
  } else if (evidenceQuality === 'LIMITED' || strategyEffectiveness === 'WEAK' || optStratName === 'OPERATOR_REVIEW') {
    confidenceLevel = 'LOW';
  } else {
    confidenceLevel = 'MEDIUM';
  }

  // 6. Historical Regression Detection (Recent 30 Days Window)
  let regressionDetected = false;
  let regressionReason = null;

  if (Array.isArray(historicalContext) && historicalContext.length > 0) {
    const thirtyDaysAgo = Date.now() - (RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const recentEvents = historicalContext.filter(e => e && e.timestamp && new Date(e.timestamp).getTime() >= thirtyDaysAgo);
    
    if (recentEvents.length >= MIN_SAMPLE_THRESHOLD) {
      const recentRecovered = recentEvents.filter(e => e.status === 'RECOVERED').length;
      const recentRate = Math.round((recentRecovered / recentEvents.length) * 100);
      
      if (recentRate < optRate - 15) {
        regressionDetected = true;
        regressionReason = `Recent 30-day recovery rate (${recentRate}%) has dropped significantly below historical baseline (${optRate}%).`;
      }
    }
  }

  // 7. Transparent Deterministic Learning Reasoning
  let learningReasoning = '';
  if (improvementStatus === 'IMPROVED') {
    learningReasoning = `Adaptive strategy (${optStratName}) demonstrates an outcome improvement (+${improvementScore}%) over baseline (${baseStratName}). Evidence quality is ${evidenceQuality} across ${targetObservations} observations.`;
  } else if (regressionDetected) {
    learningReasoning = `${regressionReason} Strategy effectiveness is flagged for operator awareness.`;
  } else if (recommendationStability === 'CHANGED_FROM_BASELINE') {
    learningReasoning = `Adaptive strategy selected '${optStratName}' over baseline '${baseStratName}' based on ${targetObservations} historical merchant observations (${optRate}% recovery rate).`;
  } else {
    learningReasoning = `Adaptive strategy (${optStratName}) shows stable alignment with baseline strategy. Historical case recovery rate is ${optRate}% across ${targetObservations} observations (${confidenceLevel} confidence).`;
  }

  return {
    learningStatus: 'LEARNING_ACTIVE',
    confidenceLevel,
    evidenceQuality,
    baselinePerformance: { caseRecoveryRate: baseRate, observations: baseMetrics.executed || 0 },
    adaptivePerformance: { caseRecoveryRate: optRate, observations: optMetrics.executed || 0 },
    improvementStatus,
    improvementScore,
    strategyEffectiveness,
    recommendationStability,
    regressionDetected,
    regressionReason,
    learningReasoning,
    sampleSize: targetObservations,
    timestamp
  };
}

/**
 * Evaluates active recovery case and derives structured Agent Decision & Reasoning.
 * Consumes evaluateRecoveryStrategy, evaluateStrategyPerformance, optimizeRecoveryStrategy,
 * evaluateRecoveryLearning, and separately evaluates policy status and autonomy eligibility.
 * 
 * @param {Object|null} activeCase - Active unrecovered failed recovery case
 * @param {Object|null} [policyConfig] - Merchant policy configuration
 * @param {Array|null} [dbEvents] - Authoritative backend recovery events
 * @param {Array|null} [runtimeEvents] - Runtime recovery events
 * @param {string|null} [currentMerchantId] - Active merchant ID
 * @returns {Object|null} Structured agent decision object
 */
export function evaluateAgentDecision(activeCase, policyConfig = null, dbEvents = null, runtimeEvents = null, currentMerchantId = null) {
  if (!activeCase || typeof activeCase !== 'object') return null;

  // 1. Evaluate Baseline Strategy (M9.4)
  const baseStrategy = evaluateRecoveryStrategy(activeCase, policyConfig);

  // 2. Evaluate Strategy Performance (M9.5)
  const strategyPerf = evaluateStrategyPerformance(dbEvents, runtimeEvents, currentMerchantId || activeCase.merchantId);

  // 3. Optimize Strategy Adaptively (M9.6)
  const adaptiveResult = optimizeRecoveryStrategy(activeCase, baseStrategy, strategyPerf, policyConfig);

  // 4. Evaluate Recovery Learning & Confidence (M9.7)
  const learningResult = evaluateRecoveryLearning(strategyPerf, adaptiveResult, dbEvents, activeCase);

  const failureCode = activeCase.failureCode || 'SERVER_ERROR';
  const priority = activeCase.priority || 'CRITICAL';
  const amount = Number(activeCase.amount) || 0;
  const currency = activeCase.currency || 'INR';
  const productName = activeCase.productName || 'Digital Product';
  const customerId = activeCase.customerId || 'Customer';

  // 5. Policy Evaluation (Strictly Authoritative - Separate from Learning & Strategy)
  let policyStatus = 'ALLOWED';
  let policyReason = 'Action complies with merchant recovery policy and priority thresholds.';

  if (activeCase.status === 'RECOVERED') {
    policyStatus = 'BLOCKED';
    policyReason = 'Case is already recovered — No action permitted.';
  } else if (adaptiveResult.optimizedStrategy === 'OPERATOR_REVIEW' || priority === 'LOW') {
    policyStatus = 'REVIEW REQUIRED';
    policyReason = 'Opportunity requires explicit operator review prior to execution.';
  }

  return {
    decisionId: `dec_${activeCase.caseId}`,
    caseId: activeCase.caseId,
    customerId,
    productName,
    amount,
    currency,
    failureCode,
    priority,
    baseStrategy: adaptiveResult.baseStrategy,
    strategy: adaptiveResult.optimizedStrategy,
    recommendedAction: adaptiveResult.action,
    actionLabel: adaptiveResult.actionLabel,
    adaptationStatus: adaptiveResult.adaptationStatus,
    strategySource: adaptiveResult.strategySource,
    historicalEvidence: adaptiveResult.historicalEvidence,
    learning: learningResult,
    reasoning: adaptiveResult.reasoning,
    policyStatus,
    policyReason,
    confidence: learningResult.confidenceLevel || adaptiveResult.confidence,
    timestamp: activeCase.timestamp || new Date().toISOString()
  };
}

/**
 * Milestone 9.8 — Recovery Decision Traceability & Intelligence Dashboard Engine.
 * Constructs an end-to-end explainable decision trace combining M9.4 baseline strategy,
 * M9.5 historical performance evidence, M9.6 adaptive strategy optimization, M9.7 learning results,
 * policy evaluation, autonomy eligibility, execution state, and backend lifecycle outcome.
 * 
 * STRICT BOUNDARIES:
 * - Pure, deterministic, side-effect free function.
 * - 0 API calls, 0 DB writes, 0 storage writes, 0 side effects.
 * - Does NOT execute retries, enable autonomy, modify policy, or alter recovery lifecycles.
 * - Strictly merchant-scoped.
 * 
 * @param {Object|null} recoveryCase - Recovery case object
 * @param {Object|null} baselineStrategy - M9.4 baseline strategy
 * @param {Object|null} adaptiveStrategy - M9.6 adaptive strategy
 * @param {Object|null} learningResult - M9.7 learning result
 * @param {Object|null} policyDecision - Policy evaluation result
 * @param {Object|null} executionState - Execution state object
 * @param {Object|null} lifecycleOutcome - Authoritative backend lifecycle outcome
 * @returns {Object} Structured decision trace object
 */
export function buildRecoveryDecisionTrace(
  recoveryCase,
  baselineStrategy = null,
  adaptiveStrategy = null,
  learningResult = null,
  policyDecision = null,
  executionState = null,
  lifecycleOutcome = null
) {
  const timestamp = new Date().toISOString();

  if (!recoveryCase || typeof recoveryCase !== 'object') {
    return {
      caseIdentity: { merchantId: 'UNKNOWN', customerId: 'UNKNOWN', productId: 'UNKNOWN' },
      detection: { failureCode: 'UNKNOWN', failureReason: 'Missing case context', amount: 0, currency: 'INR', priority: 'LOW', status: 'UNKNOWN' },
      baselineDecision: { strategy: 'UNKNOWN', actionLabel: 'Unknown', priority: 'LOW', confidence: 'LOW', reasoning: 'Missing context' },
      historicalEvidence: { observations: 0, caseRecoveryRate: 0, financialRecoveryRate: 0, strategySource: 'BASELINE' },
      adaptiveDecision: { baseStrategy: 'UNKNOWN', optimizedStrategy: 'UNKNOWN', adaptationStatus: 'BASELINE', strategySource: 'BASELINE', reasoning: 'Missing context', strategyChanged: false },
      learningAssessment: { learningStatus: 'INSUFFICIENT_DATA', confidenceLevel: 'LOW', evidenceQuality: 'LIMITED', improvementStatus: 'INSUFFICIENT_EVIDENCE', strategyEffectiveness: 'UNKNOWN', recommendationStability: 'UNCERTAIN', regressionDetected: false, reasoning: 'Missing context' },
      policyAssessment: { status: 'BLOCKED', reason: 'Missing case context', isAllowed: false },
      autonomyAssessment: { status: 'DISABLED', mode: 'MANUAL', eligible: false, reason: 'Missing case context' },
      executionAssessment: { mode: 'MANUAL', requestedAction: 'NO_ACTION', status: 'IDLE', actor: 'System', result: 'IDLE' },
      lifecycleOutcome: { originalState: 'FAILED', finalState: 'FAILED', recoveredAmount: 0, isRecovered: false },
      outcomeAttribution: 'NOT_EXECUTED',
      comparison: { baseStrategy: 'UNKNOWN', optimizedStrategy: 'UNKNOWN', strategyChanged: false, changeReason: 'Missing context', actualOutcome: 'NOT_EXECUTED' },
      traceStatus: 'INSUFFICIENT_DATA',
      timestamp
    };
  }

  // 1. Case Identity & Correlation
  const caseIdentity = {
    caseId: recoveryCase.caseId || 'UNKNOWN',
    merchantId: recoveryCase.merchantId || 'UNKNOWN',
    customerId: recoveryCase.customerId || 'Customer',
    productId: recoveryCase.productId || 'Digital Product',
    productName: recoveryCase.productName || 'Digital Product',
    activityId: recoveryCase.activityId || recoveryCase.caseId,
    paymentAttemptId: recoveryCase.paymentAttemptId || `att_${recoveryCase.caseId}`,
    paymentResultId: recoveryCase.paymentResultId || null
  };

  // 2. Detection Trace
  const detection = {
    failureCode: recoveryCase.failureCode || 'SERVER_ERROR',
    failureReason: recoveryCase.failureReason || `Payment attempt failed with ${recoveryCase.failureCode || 'SERVER_ERROR'}`,
    amount: Number(recoveryCase.amount) || 0,
    currency: recoveryCase.currency || 'INR',
    priority: recoveryCase.priority || 'CRITICAL',
    status: recoveryCase.status || 'FAILED',
    reasoning: `Recovery case detected because payment attempt failed with ${recoveryCase.failureCode || 'SERVER_ERROR'} for ${caseIdentity.productName} (${recoveryCase.currency || caseIdentity.currency || 'INR'} ${Number(recoveryCase.amount).toLocaleString('en-IN')}).`
  };

  // 3. Baseline Strategy Trace (M9.4)
  const baseStrat = baselineStrategy || { strategy: 'RETRY_PAYMENT', action: 'RETRY_PAYMENT', label: 'Retry Payment', priority: detection.priority, confidence: 'HIGH', reasoning: 'Base strategy recommended.' };
  const baselineDecision = {
    strategy: baseStrat.strategy || 'RETRY_PAYMENT',
    recommendedAction: baseStrat.action || 'RETRY_PAYMENT',
    actionLabel: baseStrat.label || baseStrat.actionLabel || 'Retry Payment',
    priority: baseStrat.priority || detection.priority,
    confidence: baseStrat.confidence || 'HIGH',
    reasoning: baseStrat.reasoning || 'M9.4 Baseline strategy evaluation',
    retryCount: Number(recoveryCase.retryCount || 0),
    maxRetryLimit: 1
  };

  // 4. Historical Evidence Trace (M9.5)
  const adaptEvid = adaptiveStrategy?.historicalEvidence || {};
  const historicalEvidence = {
    observations: adaptEvid.observations || 0,
    caseRecoveryRate: adaptEvid.caseRecoveryRate || 0,
    financialRecoveryRate: adaptEvid.financialRecoveryRate || 0,
    executionSuccessRate: adaptEvid.observations > 0 ? Math.round((adaptEvid.successful / adaptEvid.observations) * 100) : 0,
    strategySource: adaptiveStrategy?.strategySource || 'BASELINE'
  };

  // 5. Adaptive Strategy Trace (M9.6)
  const optStrat = adaptiveStrategy || { baseStrategy: baselineDecision.strategy, optimizedStrategy: baselineDecision.strategy, adaptationStatus: 'BASELINE', strategySource: 'BASELINE', reasoning: 'Baseline retained.' };
  const strategyChanged = optStrat.baseStrategy !== optStrat.optimizedStrategy;
  const adaptiveDecision = {
    baseStrategy: optStrat.baseStrategy || baselineDecision.strategy,
    optimizedStrategy: optStrat.optimizedStrategy || baselineDecision.strategy,
    adaptationStatus: optStrat.adaptationStatus || 'BASELINE',
    strategySource: optStrat.strategySource || 'BASELINE',
    reasoning: optStrat.reasoning || baselineDecision.reasoning,
    strategyChanged
  };

  // 6. Learning Assessment Trace (M9.7)
  const learn = learningResult || { learningStatus: 'INSUFFICIENT_DATA', confidenceLevel: 'LOW', evidenceQuality: 'LIMITED', improvementStatus: 'INSUFFICIENT_EVIDENCE', strategyEffectiveness: 'UNKNOWN', recommendationStability: 'STABLE', regressionDetected: false, learningReasoning: 'Insufficient data' };
  const learningAssessment = {
    learningStatus: learn.learningStatus || 'INSUFFICIENT_DATA',
    confidenceLevel: learn.confidenceLevel || 'LOW',
    evidenceQuality: learn.evidenceQuality || 'LIMITED',
    improvementStatus: learn.improvementStatus || 'INSUFFICIENT_EVIDENCE',
    strategyEffectiveness: learn.strategyEffectiveness || 'UNKNOWN',
    recommendationStability: learn.recommendationStability || 'STABLE',
    regressionDetected: learn.regressionDetected || false,
    reasoning: learn.learningReasoning || 'M9.7 Learning evaluation'
  };

  // 7. Policy Assessment Trace
  const pol = policyDecision || { status: 'ALLOWED', reason: 'Policy allows action.' };
  const isAllowed = pol.status === 'ALLOWED';
  const policyAssessment = {
    status: pol.status || 'ALLOWED',
    reason: pol.reason || pol.policyReason || 'Complies with merchant policy',
    financialThresholdStatus: 'COMPLIANT',
    retryLimitStatus: baselineDecision.retryCount < baselineDecision.maxRetryLimit ? 'COMPLIANT' : 'EXCEEDED',
    isAllowed
  };

  // 8. Autonomy Assessment Trace
  const aut = recoveryCase.autonomyEligibility || { eligible: false, reason: 'Operator required' };
  const autonomyAssessment = {
    status: aut.eligible ? 'ELIGIBLE' : 'NOT_ELIGIBLE',
    mode: recoveryCase.executionMode || 'MANUAL',
    eligible: Boolean(aut.eligible),
    reason: aut.reason || (aut.eligible ? 'Autonomy enabled and candidate passes locks' : 'Merchant operator execution required')
  };

  // 9. Execution Assessment Trace
  const exec = executionState || { mode: recoveryCase.executionMode || 'MANUAL', status: 'IDLE', actor: 'Operator', result: 'IDLE' };
  const executionAssessment = {
    mode: exec.mode || recoveryCase.executionMode || 'MANUAL',
    requestedAction: adaptiveDecision.optimizedStrategy,
    status: exec.status || (recoveryCase.status === 'RECOVERED' ? 'SUCCEEDED' : 'IDLE'),
    actor: exec.actor || (recoveryCase.executionMode === 'AUTONOMOUS' ? 'Autonomous AI Agent' : 'Merchant Operator'),
    result: exec.result || (recoveryCase.status === 'RECOVERED' ? 'SUCCEEDED' : 'IDLE')
  };

  // 10. Lifecycle Outcome & Attribution
  const isRecovered = recoveryCase.status === 'RECOVERED' || lifecycleOutcome?.status === 'RECOVERED';
  const finalState = isRecovered ? 'RECOVERED' : (recoveryCase.status || 'FAILED');
  const recoveredAmount = isRecovered ? detection.amount : 0;

  let outcomeAttribution = 'NOT_EXECUTED';
  if (isRecovered) {
    if (strategyChanged) {
      outcomeAttribution = 'ADAPTIVE_SUCCESS';
    } else {
      outcomeAttribution = 'BASELINE_SUCCESS';
    }
  } else if (policyAssessment.status === 'BLOCKED') {
    outcomeAttribution = 'POLICY_BLOCKED';
  } else if (executionAssessment.status === 'FAILED') {
    if (strategyChanged) {
      outcomeAttribution = 'ADAPTIVE_FAILURE';
    } else {
      outcomeAttribution = 'BASELINE_FAILURE';
    }
  } else {
    outcomeAttribution = 'NOT_EXECUTED';
  }

  const lifecycleOutcomeData = {
    originalState: 'FAILED',
    finalState,
    recoveredAmount,
    retryCount: baselineDecision.retryCount,
    isRecovered
  };

  // 11. Before / After Strategy Comparison
  const comparison = {
    baseStrategy: baselineDecision.strategy,
    optimizedStrategy: adaptiveDecision.optimizedStrategy,
    strategyChanged,
    changeReason: strategyChanged ? adaptiveDecision.reasoning : 'Baseline strategy retained as optimal recommendation.',
    actualOutcome: outcomeAttribution
  };

  // 12. Trace Completeness Status
  let traceStatus = 'COMPLETE';
  if (!isRecovered && executionAssessment.status === 'IDLE') {
    traceStatus = 'PARTIAL';
  } else if (historicalEvidence.observations === 0) {
    traceStatus = 'PARTIAL';
  }

  // 13. Decision Orchestration Trace (M10.4)
  const orchestration = {
    recommendedDecision: isRecovered ? 'NO_ACTION' : (exec.status === 'EXECUTING' ? 'WAIT_FOR_OUTCOME' : (isAllowed ? 'RETRY_NOW' : 'BLOCKED')),
    recommendedAction: isAllowed && !isRecovered ? 'RETRY_PAYMENT' : 'NONE',
    nextStep: isRecovered ? 'No action — recovery already confirmed' : (exec.status === 'EXECUTING' ? 'Wait for payment outcome' : (isAllowed ? 'Retry payment now' : 'Case blocked by policy')),
    executionReadiness: isAllowed && !isRecovered ? 'READY' : (isRecovered ? 'READY' : 'BLOCKED')
  };

  // 14. Outcome Reconciliation Trace (M10.6)
  const outcomeReconciliation = reconcileRecoveryExecutionOutcome(
    null,
    { status: executionAssessment.status, amount: detection.amount, mode: executionAssessment.mode },
    { status: finalState, recoveredAmount, amount: detection.amount, merchantId: caseIdentity.merchantId, activityId: caseIdentity.activityId, paymentAttemptId: caseIdentity.paymentAttemptId },
    recoveryCase,
    caseIdentity.merchantId,
    timestamp
  );

  // 15. Lifecycle Finalization Trace (M10.7)
  const finalization = finalizeRecoveryLifecycle(
    outcomeReconciliation,
    recoveryCase,
    caseIdentity.merchantId,
    timestamp
  );

  // 16. Lifecycle State Machine Governance (M10.8)
  const prevCanonicalState = getCanonicalLifecycleState(finalization.lifecycleClassification, finalization.recoveryOutcome);
  const transitionGovernance = evaluateRecoveryLifecycleTransition(
    prevCanonicalState,
    prevCanonicalState,
    {
      merchantId: caseIdentity.merchantId,
      caseId: caseIdentity.caseId,
      activityId: caseIdentity.activityId,
      paymentAttemptId: caseIdentity.paymentAttemptId,
      customerId: caseIdentity.customerId,
      productId: caseIdentity.productId,
      terminal: finalization.terminal,
      authoritativeStatus: finalization.recoveryOutcome
    }
  );

  // 17. Lifecycle Audit Event Trace (M10.9)
  const lifecycleAuditHistory = buildRecoveryLifecycleAuditEvent(
    { merchantId: caseIdentity.merchantId, caseId: caseIdentity.caseId, activityId: caseIdentity.activityId, paymentAttemptId: caseIdentity.paymentAttemptId, customerId: caseIdentity.customerId, productId: caseIdentity.productId, productName: caseIdentity.productName },
    finalization.terminal ? AUDIT_EVENT_FINALIZED : AUDIT_EVENT_TRANSITION_EVALUATED,
    prevCanonicalState,
    prevCanonicalState,
    transitionGovernance,
    outcomeReconciliation,
    finalization,
    caseIdentity.merchantId,
    timestamp
  );

  // 18. Lifecycle Step Replay Trace (M10.10)
  const singleHistoryItem = {
    lifecycleIdentity: caseIdentity,
    merchantId: caseIdentity.merchantId,
    currentState: prevCanonicalState,
    previousState: prevCanonicalState,
    transitions: [
      {
        timestamp,
        previousState: prevCanonicalState,
        nextState: prevCanonicalState,
        transitionType: transitionGovernance.transitionType,
        allowed: transitionGovernance.allowed,
        reason: transitionGovernance.reason,
        actor: executionAssessment.actor,
        executionMode: executionAssessment.mode,
        source: lifecycleAuditHistory.source
      }
    ],
    terminal: finalization.terminal,
    closureStatus: finalization.closureStatus,
    recoveryOutcome: finalization.recoveryOutcome,
    totalTransitions: 1
  };
  const stepReplayContext = buildRecoveryLifecycleReplay(singleHistoryItem, 0, caseIdentity.merchantId);
  const anomalyDiagnostic = buildRecoveryLifecycleAnomalyDiagnostic(singleHistoryItem, 0, caseIdentity.merchantId);
  const selectedProposalOptionId = anomalyDiagnostic?.resolutionOptions?.[0]?.optionId || null;
  const proposalAuthorization = buildRecoveryLifecycleProposalAuthorization(
    anomalyDiagnostic,
    singleHistoryItem,
    selectedProposalOptionId,
    null,
    { currentMerchantId: caseIdentity.merchantId },
    null
  );

  return {
    caseIdentity,
    detection,
    baselineDecision,
    historicalEvidence,
    adaptiveDecision,
    learningAssessment,
    policyAssessment,
    autonomyAssessment,
    executionAssessment,
    orchestration,
    lifecycleOutcome: lifecycleOutcomeData,
    reconciliation: outcomeReconciliation,
    finalization,
    transitionGovernance,
    lifecycleAuditHistory,
    stepReplayContext,
    anomalyDiagnostic,
    proposalAuthorization,
    outcomeAttribution,
    comparison,
    traceStatus,
    timestamp
  };
}

/**
 * Milestone 9.9 — Recovery Outcome Feedback & Strategy Calibration Engine.
 * Evaluates decision traces against authoritative backend recovery lifecycle outcomes.
 * 
 * STRICT BOUNDARIES:
 * - Pure, deterministic, side-effect free function.
 * - 0 API calls, 0 DB writes, 0 storage writes, 0 side effects.
 * - Does NOT modify policy, maxRetryLimit, financial thresholds, or autonomy state.
 * - Does NOT execute payments or alter recovery lifecycles.
 * - Strictly merchant-scoped.
 * 
 * @param {Object|null} decisionTrace - Output of buildRecoveryDecisionTrace()
 * @param {Object|null} actualOutcome - Authoritative backend recovery state
 * @param {Object|null} historicalPerformance - Output of evaluateStrategyPerformance()
 * @param {string|null} currentMerchantId - Active merchant ID
 * @returns {Object} Structured feedback and calibration result
 */
export function evaluateRecoveryOutcomeFeedback(
  decisionTrace,
  actualOutcome = null,
  historicalPerformance = null,
  currentMerchantId = null
) {
  const timestamp = new Date().toISOString();

  if (!decisionTrace || typeof decisionTrace !== 'object' || !decisionTrace.caseIdentity) {
    return {
      feedbackStatus: 'INSUFFICIENT_DATA',
      outcomeClassification: 'INSUFFICIENT_EVIDENCE',
      expectedStrategy: 'UNKNOWN',
      actualStrategy: 'UNKNOWN',
      expectedOutcome: 'UNCERTAIN',
      actualOutcome: 'UNKNOWN',
      outcomeAlignment: 'UNKNOWN',
      calibrationStatus: 'INSUFFICIENT_DATA',
      confidenceCalibration: 'UNDETERMINED',
      strategyCalibration: 'INSUFFICIENT_EVIDENCE',
      adaptiveFeedback: 'ADAPTIVE_OUTCOME_INCONCLUSIVE',
      regressionSignal: 'NONE',
      repeatedPattern: 'NO_REPEATED_PATTERN',
      feedbackReasoning: 'No decision trace available to evaluate outcome feedback.',
      sampleSize: 0,
      timestamp
    };
  }

  const sampleSize = decisionTrace.historicalEvidence?.observations || 0;
  const reconciledOutcome = actualOutcome?.reconciledOutcome || decisionTrace.reconciliation?.reconciledOutcome || null;
  const isRecovered = reconciledOutcome === 'RECOVERED' || actualOutcome?.recoveryConfirmed === true || decisionTrace.lifecycleOutcome?.isRecovered || actualOutcome?.status === 'RECOVERED';
  const rawActualOutcome = isRecovered ? 'RECOVERED' : (reconciledOutcome || actualOutcome?.status || decisionTrace.lifecycleOutcome?.finalState || 'FAILED');
  const baseStrat = decisionTrace.baselineDecision?.strategy || 'RETRY_PAYMENT';
  const optStrat = decisionTrace.adaptiveDecision?.optimizedStrategy || baseStrat;
  const stratChanged = decisionTrace.adaptiveDecision?.strategyChanged || false;
  const polStatus = decisionTrace.policyAssessment?.status || 'ALLOWED';
  const confLevel = decisionTrace.learningAssessment?.confidenceLevel || 'MEDIUM';
  const stratEffect = decisionTrace.learningAssessment?.strategyEffectiveness || 'UNKNOWN';

  // 1. Expected Outcome Derivation (Deterministic, no probability calculation)
  let expectedOutcome = 'UNCERTAIN';
  if (polStatus === 'BLOCKED' || optStrat === 'OPERATOR_REVIEW' || optStrat === 'NO_ACTION' || optStrat === 'MONITOR') {
    expectedOutcome = 'NO_EXECUTION_EXPECTED';
  } else if (confLevel === 'HIGH' && stratEffect === 'EFFECTIVE') {
    expectedOutcome = 'LIKELY_RECOVERY';
  } else if (stratEffect === 'WEAK') {
    expectedOutcome = 'LIKELY_NON_RECOVERY';
  } else {
    expectedOutcome = 'UNCERTAIN';
  }

  // 2. Outcome Classification
  let outcomeClassification = 'INSUFFICIENT_EVIDENCE';
  if (sampleSize < MIN_SAMPLE_THRESHOLD) {
    outcomeClassification = 'INSUFFICIENT_EVIDENCE';
  } else if (polStatus === 'BLOCKED') {
    outcomeClassification = 'POLICY_BLOCKED';
  } else if (!isRecovered && decisionTrace.executionAssessment?.status === 'IDLE') {
    outcomeClassification = 'NOT_EXECUTED';
  } else if (expectedOutcome === 'LIKELY_RECOVERY' && isRecovered) {
    outcomeClassification = 'EXPECTED_SUCCESS';
  } else if (expectedOutcome !== 'LIKELY_RECOVERY' && isRecovered) {
    outcomeClassification = 'UNEXPECTED_SUCCESS';
  } else if (expectedOutcome === 'LIKELY_RECOVERY' && !isRecovered) {
    outcomeClassification = 'UNEXPECTED_FAILURE';
  } else {
    outcomeClassification = 'EXPECTED_FAILURE';
  }

  // 3. Outcome Alignment
  let outcomeAlignment = 'UNKNOWN';
  if (!isRecovered && decisionTrace.executionAssessment?.status === 'IDLE') {
    outcomeAlignment = 'NOT_EXECUTED';
  } else if (expectedOutcome === 'LIKELY_RECOVERY' && isRecovered) {
    outcomeAlignment = 'ALIGNED';
  } else if (expectedOutcome === 'NO_EXECUTION_EXPECTED' && !isRecovered) {
    outcomeAlignment = 'ALIGNED';
  } else if (expectedOutcome === 'LIKELY_RECOVERY' && !isRecovered) {
    outcomeAlignment = 'MISALIGNED';
  } else {
    outcomeAlignment = 'ALIGNED';
  }

  // 4. Confidence Calibration Evaluation
  let confidenceCalibration = 'UNDETERMINED';
  if (sampleSize < MIN_SAMPLE_THRESHOLD) {
    confidenceCalibration = 'UNDETERMINED';
  } else if (confLevel === 'HIGH' && isRecovered) {
    confidenceCalibration = 'WELL_CALIBRATED';
  } else if (confLevel === 'LOW' && !isRecovered) {
    confidenceCalibration = 'WELL_CALIBRATED';
  } else if (confLevel === 'HIGH' && !isRecovered && decisionTrace.executionAssessment?.status === 'SUCCEEDED') {
    confidenceCalibration = 'OVERCONFIDENT';
  } else if (confLevel === 'LOW' && isRecovered) {
    confidenceCalibration = 'UNDERCONFIDENT';
  } else {
    confidenceCalibration = 'WELL_CALIBRATED';
  }

  // 5. Strategy Calibration Evaluation
  let strategyCalibration = 'INSUFFICIENT_EVIDENCE';
  if (sampleSize < MIN_SAMPLE_THRESHOLD) {
    strategyCalibration = 'INSUFFICIENT_EVIDENCE';
  } else if (stratEffect === 'EFFECTIVE' && isRecovered) {
    strategyCalibration = 'PERFORMING_AS_EXPECTED';
  } else if (stratEffect === 'EFFECTIVE' && !isRecovered && decisionTrace.executionAssessment?.status === 'SUCCEEDED') {
    strategyCalibration = 'UNDERPERFORMING';
  } else if (stratEffect === 'WEAK' && isRecovered) {
    strategyCalibration = 'OUTPERFORMING';
  } else {
    strategyCalibration = 'PERFORMING_AS_EXPECTED';
  }

  // 6. Baseline vs Adaptive Feedback
  let adaptiveFeedback = 'ADAPTIVE_OUTCOME_INCONCLUSIVE';
  if (stratChanged && isRecovered) {
    adaptiveFeedback = 'ADAPTIVE_OUTCOME_SUPPORTED';
  } else if (stratChanged && !isRecovered && decisionTrace.executionAssessment?.status === 'SUCCEEDED') {
    adaptiveFeedback = 'ADAPTIVE_OUTCOME_NOT_SUPPORTED';
  } else {
    adaptiveFeedback = 'ADAPTIVE_OUTCOME_INCONCLUSIVE';
  }

  // 7. Regression Signal & Repeated Pattern Detection
  let regressionSignal = 'NONE';
  if (decisionTrace.learningAssessment?.regressionDetected) {
    regressionSignal = 'SIGNIFICANT';
  } else if (confidenceCalibration === 'OVERCONFIDENT') {
    regressionSignal = 'WATCH';
  }

  let repeatedPattern = 'NO_REPEATED_PATTERN';
  if (sampleSize >= 5 && historicalPerformance?.executionModes?.AUTONOMOUS?.recoveryRate >= 70) {
    repeatedPattern = 'REPEATED_SUCCESSFUL_AUTONOMY';
  } else if (confidenceCalibration === 'OVERCONFIDENT') {
    repeatedPattern = 'REPEATED_OVERCONFIDENCE';
  }

  // 8. Calibration Status
  let calibrationStatus = 'INSUFFICIENT_DATA';
  if (sampleSize < MIN_SAMPLE_THRESHOLD) {
    calibrationStatus = 'INSUFFICIENT_DATA';
  } else if (outcomeAlignment === 'MISALIGNED' || confidenceCalibration === 'OVERCONFIDENT') {
    calibrationStatus = 'NEEDS_REVIEW';
  } else {
    calibrationStatus = 'CALIBRATED';
  }

  // 9. Transparent Deterministic Feedback Reasoning
  let feedbackReasoning = '';
  if (sampleSize < MIN_SAMPLE_THRESHOLD) {
    feedbackReasoning = `Insufficient historical observations (${sampleSize}/${MIN_SAMPLE_THRESHOLD} required) to calibrate outcome confidence. Calibration status set to INSUFFICIENT_DATA.`;
  } else if (calibrationStatus === 'NEEDS_REVIEW') {
    feedbackReasoning = `Outcome misalignment detected. Strategy outcome is ${outcomeClassification} (${confidenceCalibration} confidence). Operator review recommended.`;
  } else if (adaptiveFeedback === 'ADAPTIVE_OUTCOME_SUPPORTED') {
    feedbackReasoning = `Authoritative backend outcome confirms RECOVERED, supporting the adaptive strategy change from ${baseStrat} to ${optStrat}.`;
  } else {
    feedbackReasoning = `Authoritative outcome (${rawActualOutcome}) is ALIGNED with expected recovery strategy (${optStrat}). Decision confidence is WELL_CALIBRATED across ${sampleSize} observations.`;
  }

  return {
    feedbackStatus: sampleSize >= MIN_SAMPLE_THRESHOLD ? 'FEEDBACK_ACTIVE' : 'INSUFFICIENT_DATA',
    outcomeClassification,
    expectedStrategy: baseStrat,
    actualStrategy: optStrat,
    expectedOutcome,
    actualOutcome: rawActualOutcome,
    outcomeAlignment,
    calibrationStatus,
    confidenceCalibration,
    strategyCalibration,
    adaptiveFeedback,
    regressionSignal,
    repeatedPattern,
    feedbackReasoning,
    sampleSize,
    timestamp
  };
}

/**
 * Milestone 10.5 — Guarded Dispatch Taxonomy Constants
 */
export const DISPATCH_DECISION_ALLOWED = 'DISPATCH_ALLOWED';
export const DISPATCH_DECISION_REQUIRES_OPERATOR = 'DISPATCH_REQUIRES_OPERATOR';
export const DISPATCH_DECISION_BLOCKED = 'DISPATCH_BLOCKED';
export const DISPATCH_DECISION_WAITING = 'DISPATCH_WAITING';
export const DISPATCH_DECISION_NOT_APPLICABLE = 'DISPATCH_NOT_APPLICABLE';

export const ACTION_SELECTION_RETRY_PAYMENT = 'RETRY_PAYMENT';
export const ACTION_SELECTION_NONE = 'NONE';

/**
 * Milestone 10.5 — Pure Recovery Action Selection & Guarded Dispatch Engine.
 * Evaluates whether an orchestrated decision is permitted to send a dispatch request to the existing executor.
 * 
 * STRICT BOUNDARIES:
 * - Pure, deterministic, side-effect free function.
 * - 0 API calls, 0 DB writes, 0 storage writes, 0 side effects.
 * - Does NOT execute retries, enable autonomy, modify policy, acquire locks, or create background queues.
 * - Strictly merchant-scoped.
 * 
 * @param {Object|null} orchestratedDecision - Output from orchestrateRecoveryDecision()
 * @param {Object|null} prioritizedCase - Output from evaluateEvidenceAwarePriority()
 * @param {Object|null} schedulingResult - Output for case from scheduleRecoveryDecisions()
 * @param {Object|null} policyDecision - Policy assessment
 * @param {Object|null} autonomyAssessment - Autonomy eligibility assessment
 * @param {Object|null} executionState - Current candidate execution state
 * @param {Object|null} lifecycleOutcome - Backend lifecycle status
 * @param {string|null} currentMerchantId - Active merchant ID
 * @param {string} dispatchMode - 'MANUAL' | 'AUTONOMOUS'
 * @param {string|null} currentTime - ISO timestamp
 * @returns {Object} Structured guarded dispatch evaluation result
 */
export function evaluateGuardedRecoveryDispatch(
  orchestratedDecision = null,
  prioritizedCase = null,
  schedulingResult = null,
  policyDecision = null,
  autonomyAssessment = null,
  executionState = null,
  lifecycleOutcome = null,
  currentMerchantId = null,
  dispatchMode = 'MANUAL',
  currentTime = new Date().toISOString()
) {
  const timestamp = new Date().toISOString();

  const caseId = prioritizedCase?.caseId || orchestratedDecision?.caseIdentity?.caseId || 'UNKNOWN';
  const merchantId = prioritizedCase?.merchantId || orchestratedDecision?.caseIdentity?.merchantId || currentMerchantId || 'UNKNOWN';
  const customerId = prioritizedCase?.customerId || orchestratedDecision?.caseIdentity?.customerId || 'Customer';
  const productId = prioritizedCase?.productId || orchestratedDecision?.caseIdentity?.productId || 'Product';
  const productName = prioritizedCase?.productName || orchestratedDecision?.caseIdentity?.productName || 'Digital Product';
  const activityId = prioritizedCase?.activityId || caseId;
  const paymentAttemptId = prioritizedCase?.paymentAttemptId || `att_${caseId}`;

  const caseIdentity = { caseId, activityId, paymentAttemptId, merchantId, customerId, productId, productName };

  // 1. Action Selection Derivation from M10.4
  const orchRec = orchestratedDecision?.recommendedDecision || 'NO_ACTION';
  let selectedAction = ACTION_SELECTION_NONE;
  let actionType = 'NONE';

  if (orchRec === 'RETRY_NOW' || orchRec === 'RETRY_SHORT_TERM') {
    selectedAction = ACTION_SELECTION_RETRY_PAYMENT;
    actionType = 'PAYMENT_RETRY';
  } else if (orchRec === 'OPERATOR_REVIEW' && (orchestratedDecision?.recommendedAction === 'RETRY_PAYMENT')) {
    selectedAction = ACTION_SELECTION_RETRY_PAYMENT;
    actionType = 'PAYMENT_RETRY';
  } else {
    selectedAction = ACTION_SELECTION_NONE;
    actionType = 'NONE';
  }

  // 2. State & Policy Checks
  const rawState = lifecycleOutcome?.status || prioritizedCase?.originalCase?.status || 'FAILED';
  const isRecovered = rawState === 'RECOVERED' || rawState === 'SUCCESS' || lifecycleOutcome?.isRecovered;
  const isExecuting = executionState?.status === 'EXECUTING' || rawState === 'EXECUTING';

  const policyStatus = policyDecision?.status || prioritizedCase?.policyStatus || 'ALLOWED';
  const retryCount = Number(prioritizedCase?.retryCount) || 0;
  const maxRetryLimit = Number(prioritizedCase?.maxRetryLimit) || 3;
  const autonomyEligible = autonomyAssessment?.eligible || (autonomyAssessment?.executionMode === 'AUTONOMOUS');

  // 3. Evaluate 8 Safety Checks
  const safetyChecks = {
    merchantOwnership: merchantId === currentMerchantId ? 'PASS' : 'FAIL',
    lifecycleState: isRecovered ? 'FAIL' : (isExecuting ? 'FAIL' : 'PASS'),
    policyAuthorization: policyStatus === 'ALLOWED' ? 'PASS' : (policyStatus === 'REVIEW_REQUIRED' ? 'PASS' : 'FAIL'),
    retryLimit: retryCount < maxRetryLimit ? 'PASS' : 'FAIL',
    actionEligibility: selectedAction === ACTION_SELECTION_RETRY_PAYMENT ? 'PASS' : 'FAIL',
    executionState: !isExecuting ? 'PASS' : 'FAIL',
    autonomyEligibility: dispatchMode === 'AUTONOMOUS' ? (autonomyEligible ? 'PASS' : 'FAIL') : 'NOT_REQUIRED',
    dispatchMode: (dispatchMode === 'MANUAL' || dispatchMode === 'AUTONOMOUS') ? 'PASS' : 'FAIL'
  };

  const blockingReasons = [];
  const passedChecks = [];
  const failedChecks = [];

  if (safetyChecks.merchantOwnership === 'FAIL') {
    blockingReasons.push(`Merchant ownership validation failed (${merchantId} !== ${currentMerchantId}).`);
    failedChecks.push('Merchant ownership');
  } else passedChecks.push('Merchant ownership verified');

  if (isRecovered) {
    blockingReasons.push('Lifecycle state is RECOVERED. Recovery already confirmed.');
    failedChecks.push('Lifecycle state');
  } else if (isExecuting) {
    blockingReasons.push('Execution is currently active (EXECUTING). Waiting for payment outcome.');
    failedChecks.push('Execution state lock');
  } else passedChecks.push('Lifecycle state eligible for dispatch');

  if (policyStatus === 'BLOCKED') {
    blockingReasons.push(`Merchant policy status is BLOCKED (${policyDecision?.reason || 'Rule violation'}).`);
    failedChecks.push('Policy authorization');
  } else passedChecks.push(`Policy authorization ${policyStatus}`);

  if (retryCount >= maxRetryLimit) {
    blockingReasons.push(`Max retry limit reached (${retryCount}/${maxRetryLimit}).`);
    failedChecks.push('Retry limit');
  } else passedChecks.push(`Retry limit available (${retryCount}/${maxRetryLimit})`);

  if (selectedAction === ACTION_SELECTION_NONE) {
    blockingReasons.push('Selected action is NONE. Action is non-dispatchable.');
    failedChecks.push('Action eligibility');
  } else passedChecks.push(`Action selected: ${selectedAction}`);

  if (dispatchMode === 'AUTONOMOUS' && !autonomyEligible) {
    blockingReasons.push('Autonomous dispatch mode requested, but autonomy eligibility is false.');
    failedChecks.push('Autonomy eligibility');
  } else if (dispatchMode === 'AUTONOMOUS') passedChecks.push('Autonomy eligibility verified');

  // 4. Dispatch Decision Determination
  let dispatchDecision = DISPATCH_DECISION_NOT_APPLICABLE;
  let dispatchAllowed = false;
  let executionReadiness = 'NOT_READY';
  let nextStep = '';

  // Milestone 10.8 — Lifecycle State Machine Transition Governance
  const currentCanonicalState = isRecovered ? STATE_RECOVERED : (isExecuting ? STATE_EXECUTING : (rawState === 'FAILED' ? STATE_FAILED : STATE_OPEN));
  const targetCanonicalState = selectedAction === ACTION_SELECTION_RETRY_PAYMENT ? STATE_EXECUTING : currentCanonicalState;

  const transitionGovernance = evaluateRecoveryLifecycleTransition(
    currentCanonicalState,
    targetCanonicalState,
    {
      merchantId,
      currentMerchantId,
      caseId,
      activityId,
      paymentAttemptId,
      customerId,
      productId,
      terminal: isRecovered || retryCount >= maxRetryLimit || policyStatus === 'BLOCKED',
      authoritativeStatus: rawState
    }
  );

  if (selectedAction === ACTION_SELECTION_RETRY_PAYMENT && !transitionGovernance.allowed) {
    safetyChecks.lifecycleState = 'FAIL';
    if (!blockingReasons.includes(transitionGovernance.reason)) {
      blockingReasons.push(transitionGovernance.reason);
    }
    if (!failedChecks.includes('Transition governance')) {
      failedChecks.push('Transition governance');
    }
  }

  if (isRecovered) {
    dispatchDecision = DISPATCH_DECISION_NOT_APPLICABLE;
    dispatchAllowed = false;
    executionReadiness = 'READY';
    nextStep = 'No action — recovery already confirmed';
  } else if (isExecuting) {
    dispatchDecision = DISPATCH_DECISION_WAITING;
    dispatchAllowed = false;
    executionReadiness = 'WAITING';
    nextStep = 'Wait for payment outcome';
  } else if (safetyChecks.merchantOwnership === 'FAIL' || policyStatus === 'BLOCKED' || retryCount >= maxRetryLimit || !transitionGovernance.allowed) {
    dispatchDecision = DISPATCH_DECISION_BLOCKED;
    dispatchAllowed = false;
    executionReadiness = 'BLOCKED';
    nextStep = !transitionGovernance.allowed ? `Dispatch blocked by lifecycle governance: ${transitionGovernance.reason}` : 'Case blocked by policy, ownership, or retry limit';
  } else if (policyStatus === 'REVIEW_REQUIRED' || orchRec === 'OPERATOR_REVIEW') {
    dispatchDecision = DISPATCH_DECISION_REQUIRES_OPERATOR;
    dispatchAllowed = (dispatchMode === 'MANUAL');
    executionReadiness = 'NOT_READY';
    nextStep = 'Operator must initiate manual retry';
  } else if (dispatchMode === 'AUTONOMOUS' && !autonomyEligible) {
    dispatchDecision = DISPATCH_DECISION_REQUIRES_OPERATOR;
    dispatchAllowed = false;
    executionReadiness = 'NOT_READY';
    nextStep = 'Operator initiation required — autonomy ineligible';
  } else if (selectedAction === ACTION_SELECTION_RETRY_PAYMENT && safetyChecks.policyAuthorization === 'PASS' && safetyChecks.retryLimit === 'PASS' && transitionGovernance.allowed) {
    dispatchDecision = DISPATCH_DECISION_ALLOWED;
    dispatchAllowed = true;
    executionReadiness = 'READY';
    nextStep = dispatchMode === 'AUTONOMOUS' ? 'Autonomous retry dispatch permitted' : 'Retry payment ready for operator dispatch';
  } else {
    dispatchDecision = DISPATCH_DECISION_NOT_APPLICABLE;
    dispatchAllowed = false;
    executionReadiness = 'NOT_READY';
    nextStep = 'Non-dispatchable recommendation';
  }

  const summary = dispatchAllowed
    ? `Guarded dispatch ALLOWED for ${customerId} (${productName}) under ${dispatchMode} mode.`
    : `Guarded dispatch ${dispatchDecision} for ${customerId} (${productName}). ${nextStep}.`;

  const reasoning = {
    summary,
    passedChecks,
    failedChecks,
    blockingReasons
  };

  return {
    caseIdentity,
    selectedAction,
    actionType,
    dispatchDecision,
    dispatchAllowed,
    dispatchMode,
    authorizationStatus: policyStatus,
    executionReadiness,
    lifecycleStatus: rawState,
    blockingReasons,
    safetyChecks,
    reasoning,
    nextStep,
    transitionGovernance,
    timestamp
  };
}

/**
 * Milestone 10.6 — Reconciliation Taxonomy Constants
 */
export const RECONCILIATION_CONFIRMED = 'RECONCILIATION_CONFIRMED';
export const RECONCILIATION_FAILED = 'RECONCILIATION_FAILED';
export const RECONCILIATION_PENDING = 'RECONCILIATION_PENDING';
export const RECONCILIATION_NOT_EXECUTED = 'RECONCILIATION_NOT_EXECUTED';
export const RECONCILIATION_INCONSISTENT = 'RECONCILIATION_INCONSISTENT';
export const RECONCILIATION_INSUFFICIENT_DATA = 'RECONCILIATION_INSUFFICIENT_DATA';

export const OUTCOME_RECOVERED = 'RECOVERED';
export const OUTCOME_FAILED = 'FAILED';
export const OUTCOME_PENDING = 'PENDING';
export const OUTCOME_NOT_EXECUTED = 'NOT_EXECUTED';
export const OUTCOME_UNKNOWN = 'UNKNOWN';

/**
 * Milestone 10.6 — Pure Recovery Execution Outcome Reconciliation Engine.
 * Reconciles execution attempts against authoritative backend lifecycle state.
 * 
 * STRICT BOUNDARIES:
 * - Pure, deterministic, side-effect free function.
 * - 0 API calls, 0 DB writes, 0 storage writes, 0 side effects.
 * - Does NOT execute payment retries, alter retry limits, modify policy, or mutate inputs.
 * - Authoritative backend lifecycle strictly overrides frontend execution state.
 * - Strictly merchant-isolated.
 * 
 * @param {Object|null} guardedDispatch - Output from evaluateGuardedRecoveryDispatch()
 * @param {Object|null} executionResult - Execution attempt result object
 * @param {Object|null} backendLifecycle - Backend lifecycle state object
 * @param {Object|null} recoveryEvent - Authoritative backend RecoveryEvent record
 * @param {string|null} currentMerchantId - Active merchant ID
 * @param {string} currentTime - ISO timestamp string
 * @returns {Object} Structured outcome reconciliation model
 */
export function reconcileRecoveryExecutionOutcome(
  guardedDispatch = null,
  executionResult = null,
  backendLifecycle = null,
  recoveryEvent = null,
  currentMerchantId = null,
  currentTime = new Date().toISOString()
) {
  const timestamp = currentTime || new Date().toISOString();

  // 1. Identity Resolution (Hierarchy: activityId -> paymentAttemptId -> merchantId + customerId + productId)
  // Never use productId alone.
  const primaryBackend = backendLifecycle || recoveryEvent || null;

  const caseId = primaryBackend?.activityId || recoveryEvent?.activityId || guardedDispatch?.caseIdentity?.caseId || executionResult?.caseId || 'UNKNOWN';
  const activityId = primaryBackend?.activityId || recoveryEvent?.activityId || guardedDispatch?.caseIdentity?.activityId || caseId;
  const paymentAttemptId = primaryBackend?.paymentAttemptId || recoveryEvent?.paymentAttemptId || executionResult?.paymentAttemptId || guardedDispatch?.caseIdentity?.paymentAttemptId || null;
  const paymentResultId = primaryBackend?.paymentResultId || recoveryEvent?.paymentResultId || executionResult?.paymentResultId || null;
  const merchantId = primaryBackend?.merchantId || recoveryEvent?.merchantId || guardedDispatch?.caseIdentity?.merchantId || executionResult?.merchantId || 'UNKNOWN';
  const customerId = primaryBackend?.customerId || recoveryEvent?.customerId || guardedDispatch?.caseIdentity?.customerId || executionResult?.customerId || 'UNKNOWN';
  const productId = primaryBackend?.productId || recoveryEvent?.productId || guardedDispatch?.caseIdentity?.productId || executionResult?.productId || 'UNKNOWN';
  const productName = primaryBackend?.productName || recoveryEvent?.productName || guardedDispatch?.caseIdentity?.productName || executionResult?.productName || 'Digital Product';

  const caseIdentity = {
    caseId,
    activityId,
    paymentAttemptId,
    paymentResultId,
    merchantId,
    customerId,
    productId,
    productName
  };

  const inconsistencies = [];

  // Check 1: Insufficient identity data check
  const hasValidIdentity = (activityId && activityId !== 'UNKNOWN') || (paymentAttemptId && paymentAttemptId !== 'UNKNOWN') || (merchantId !== 'UNKNOWN' && customerId !== 'UNKNOWN' && productId !== 'UNKNOWN');

  if (!hasValidIdentity || (!guardedDispatch && !executionResult && !primaryBackend)) {
    return {
      caseIdentity,
      dispatchAssessment: guardedDispatch || null,
      executionAssessment: {
        executionStarted: false,
        executionCompleted: false,
        executionSucceeded: false,
        executionFailed: false,
        executionMode: 'NONE',
        executionId: null
      },
      backendOutcome: OUTCOME_UNKNOWN,
      reconciledOutcome: OUTCOME_UNKNOWN,
      reconciliationStatus: RECONCILIATION_INSUFFICIENT_DATA,
      recoveryConfirmed: false,
      recoveredAmount: null,
      retryCount: 0,
      paymentAttemptId,
      paymentResultId,
      blockingReasons: ['Case identity could not be safely established from available inputs.'],
      inconsistencies: [],
      reasoning: {
        summary: 'Operator review required — outcome could not be safely reconciled due to insufficient identity data.',
        passedChecks: [],
        failedChecks: ['Identity Verification']
      },
      nextStep: 'Operator review required — outcome could not be safely reconciled',
      timestamp
    };
  }

  // 2. Merchant Isolation Verification
  let merchantIsolationFailed = false;
  if (currentMerchantId && merchantId && merchantId !== 'UNKNOWN' && merchantId !== currentMerchantId) {
    merchantIsolationFailed = true;
    inconsistencies.push({
      type: 'MERCHANT_ID_MISMATCH',
      severity: 'CRITICAL',
      description: `Merchant ID mismatch detected (event merchant: ${merchantId} !== active merchant: ${currentMerchantId}).`
    });
  }

  if (merchantIsolationFailed) {
    return {
      caseIdentity,
      dispatchAssessment: guardedDispatch || null,
      executionAssessment: {
        executionStarted: Boolean(executionResult),
        executionCompleted: Boolean(executionResult?.status === 'SUCCESS' || executionResult?.status === 'FAILED'),
        executionSucceeded: executionResult?.status === 'SUCCESS',
        executionFailed: executionResult?.status === 'FAILED',
        executionMode: executionResult?.mode || guardedDispatch?.dispatchMode || 'MANUAL',
        executionId: executionResult?.executionId || null
      },
      backendOutcome: OUTCOME_UNKNOWN,
      reconciledOutcome: OUTCOME_UNKNOWN,
      reconciliationStatus: RECONCILIATION_INCONSISTENT,
      recoveryConfirmed: false,
      recoveredAmount: null,
      retryCount: primaryBackend?.retryCount || guardedDispatch?.retryCount || 0,
      paymentAttemptId,
      paymentResultId,
      blockingReasons: [`Merchant ownership validation failed (${merchantId} !== ${currentMerchantId}).`],
      inconsistencies,
      reasoning: {
        summary: `Reconciliation INCONSISTENT due to cross-merchant boundary violation (${merchantId} !== ${currentMerchantId}).`,
        passedChecks: [],
        failedChecks: ['Merchant Isolation']
      },
      nextStep: 'Operator review required — execution and backend state disagree',
      timestamp
    };
  }

  // 3. Execution Assessment Extraction
  const execStatus = executionResult?.status || executionResult?.result || null;
  const executionStarted = Boolean(executionResult && execStatus && execStatus !== 'NOT_EXECUTED' && execStatus !== 'IDLE');
  const executionCompleted = Boolean(executionResult && (execStatus === 'SUCCESS' || execStatus === 'SUCCEEDED' || execStatus === 'FAILED'));
  const executionSucceeded = execStatus === 'SUCCESS' || execStatus === 'SUCCEEDED' || executionResult?.executionSucceeded === true;
  const executionFailed = execStatus === 'FAILED' || executionResult?.executionFailed === true;
  const executionMode = executionResult?.mode || guardedDispatch?.dispatchMode || 'MANUAL';
  const executionId = executionResult?.executionId || executionResult?.id || paymentAttemptId || null;

  const executionAssessment = {
    executionStarted,
    executionCompleted,
    executionSucceeded,
    executionFailed,
    executionMode,
    executionId
  };

  const executionOutcome = executionSucceeded
    ? OUTCOME_RECOVERED
    : (executionFailed
      ? OUTCOME_FAILED
      : (execStatus === 'EXECUTING' || execStatus === 'PENDING'
        ? OUTCOME_PENDING
        : (executionResult ? OUTCOME_NOT_EXECUTED : OUTCOME_NOT_EXECUTED)));

  // 4. Backend Lifecycle Outcome Extraction (Precedence: Backend RecoveryEvent -> Backend Payment Result -> Execution Result)
  const rawBackendStatus = primaryBackend?.status || null;
  const isBackendRecovered = rawBackendStatus === 'RECOVERED' || rawBackendStatus === 'SUCCESS' || primaryBackend?.isRecovered === true;
  const isBackendFailed = rawBackendStatus === 'FAILED' || rawBackendStatus === 'PAYMENT_FAILED';
  const isBackendPending = rawBackendStatus === 'EXECUTING' || rawBackendStatus === 'PENDING';

  let backendOutcome = OUTCOME_UNKNOWN;
  if (isBackendRecovered) {
    backendOutcome = OUTCOME_RECOVERED;
  } else if (isBackendFailed) {
    backendOutcome = OUTCOME_FAILED;
  } else if (isBackendPending) {
    backendOutcome = OUTCOME_PENDING;
  }

  // 5. Inconsistency Detection
  if (executionSucceeded && isBackendFailed) {
    inconsistencies.push({
      type: 'EXECUTION_BACKEND_MISMATCH',
      severity: 'HIGH',
      description: 'Execution reported SUCCESS but authoritative backend lifecycle remains FAILED.'
    });
  }

  if (executionFailed && isBackendRecovered) {
    inconsistencies.push({
      type: 'EXECUTION_BACKEND_MISMATCH',
      severity: 'HIGH',
      description: 'Execution reported FAILED but authoritative backend lifecycle confirms RECOVERED.'
    });
  }

  if ((executionSucceeded || executionFailed) && isBackendPending) {
    inconsistencies.push({
      type: 'EXECUTION_PENDING_MISMATCH',
      severity: 'WARNING',
      description: 'Execution completed but backend lifecycle remains PENDING.'
    });
  }

  if (executionResult?.paymentAttemptId && primaryBackend?.paymentAttemptId && executionResult.paymentAttemptId !== primaryBackend.paymentAttemptId) {
    inconsistencies.push({
      type: 'CORRELATION_ID_MISMATCH',
      severity: 'HIGH',
      description: `Payment attempt ID mismatch (${executionResult.paymentAttemptId} !== ${primaryBackend.paymentAttemptId}).`
    });
  }

  if (executionResult?.paymentResultId && primaryBackend?.paymentResultId && executionResult.paymentResultId !== primaryBackend.paymentResultId) {
    inconsistencies.push({
      type: 'CORRELATION_ID_MISMATCH',
      severity: 'HIGH',
      description: `Payment result ID mismatch (${executionResult.paymentResultId} !== ${primaryBackend.paymentResultId}).`
    });
  }

  // 6. Outcome Reconciliation & Status Taxonomies
  let reconciliationStatus = RECONCILIATION_INSUFFICIENT_DATA;
  let reconciledOutcome = OUTCOME_UNKNOWN;
  let outcomeAuthority = 'NONE';
  let recoveryConfirmed = false;
  let nextStep = 'Await explicit recovery execution';

  // Rule 1: Authoritative Backend RECOVERED
  if (isBackendRecovered) {
    reconciliationStatus = RECONCILIATION_CONFIRMED;
    reconciledOutcome = OUTCOME_RECOVERED;
    outcomeAuthority = 'BACKEND';
    recoveryConfirmed = true;
    nextStep = 'No action — recovery confirmed';
  }
  // Rule 2: Authoritative Backend FAILED
  else if (isBackendFailed) {
    outcomeAuthority = 'BACKEND';
    recoveryConfirmed = false;
    if (executionSucceeded) {
      reconciliationStatus = RECONCILIATION_INCONSISTENT;
      reconciledOutcome = OUTCOME_FAILED; // Authoritative backend wins!
      nextStep = 'Operator review required — execution and backend state disagree';
    } else {
      reconciliationStatus = RECONCILIATION_FAILED;
      reconciledOutcome = OUTCOME_FAILED;
      nextStep = 'Review failed recovery outcome';
    }
  }
  // Rule 3: Authoritative Backend PENDING/EXECUTING
  else if (isBackendPending) {
    reconciliationStatus = RECONCILIATION_PENDING;
    reconciledOutcome = OUTCOME_PENDING;
    outcomeAuthority = 'BACKEND';
    recoveryConfirmed = false;
    nextStep = 'Wait for authoritative payment outcome';
  }
  // Rule 4: No authoritative backend state, evaluate execution result
  else if (executionResult) {
    if (executionSucceeded) {
      reconciliationStatus = RECONCILIATION_PENDING;
      reconciledOutcome = OUTCOME_PENDING;
      outcomeAuthority = 'EXECUTION';
      recoveryConfirmed = false;
      nextStep = 'Wait for authoritative payment outcome';
    } else if (executionFailed) {
      reconciliationStatus = RECONCILIATION_FAILED;
      reconciledOutcome = OUTCOME_FAILED;
      outcomeAuthority = 'EXECUTION';
      recoveryConfirmed = false;
      nextStep = 'Review failed recovery outcome';
    } else {
      reconciliationStatus = RECONCILIATION_NOT_EXECUTED;
      reconciledOutcome = OUTCOME_NOT_EXECUTED;
      outcomeAuthority = 'NONE';
      recoveryConfirmed = false;
      nextStep = 'Await explicit recovery execution';
    }
  }
  // Rule 5: Fallback Not Executed
  else {
    reconciliationStatus = RECONCILIATION_NOT_EXECUTED;
    reconciledOutcome = OUTCOME_NOT_EXECUTED;
    outcomeAuthority = 'NONE';
    recoveryConfirmed = false;
    nextStep = 'Await explicit recovery execution';
  }

  // Override status to RECONCILIATION_INCONSISTENT if severe correlation mismatches exist (and not already confirmed)
  const hasCriticalOrHighInconsistency = inconsistencies.some(i => i.severity === 'CRITICAL' || i.severity === 'HIGH');
  if (hasCriticalOrHighInconsistency && reconciliationStatus !== RECONCILIATION_CONFIRMED) {
    reconciliationStatus = RECONCILIATION_INCONSISTENT;
    nextStep = 'Operator review required — execution and backend state disagree';
  }

  // 7. Authoritative Amounts & Retry Count
  let recoveredAmount = null;
  if (recoveryConfirmed) {
    const rawAmt = primaryBackend?.recoveredAmount !== undefined && primaryBackend?.recoveredAmount !== null
      ? primaryBackend.recoveredAmount
      : (primaryBackend?.amount !== undefined ? primaryBackend.amount : executionResult?.amount);
    recoveredAmount = rawAmt !== undefined && rawAmt !== null ? Number(rawAmt) : null;
  } else {
    recoveredAmount = 0;
  }

  const retryCount = Number(
    primaryBackend?.retryCount !== undefined
      ? primaryBackend.retryCount
      : (guardedDispatch?.safetyChecks?.retryLimit || executionResult?.retryCount || 0)
  );

  const reasoning = {
    summary: `Outcome reconciled as ${reconciledOutcome} (${reconciliationStatus}) under ${outcomeAuthority} authority. ${nextStep}.`,
    backendStatus: backendOutcome,
    executionStatus: executionOutcome,
    inconsistencyCount: inconsistencies.length,
    inconsistencies
  };

  return {
    caseIdentity,
    dispatchAssessment: guardedDispatch || null,
    executionAssessment,
    backendOutcome,
    reconciledOutcome,
    reconciliationStatus,
    recoveryConfirmed,
    recoveredAmount,
    retryCount,
    paymentAttemptId,
    paymentResultId,
    blockingReasons: guardedDispatch?.blockingReasons || [],
    inconsistencies,
    reasoning,
    nextStep,
    timestamp
  };
}

/**
 * Milestone 10.7 — Lifecycle Classification Constants
 */
export const LIFECYCLE_TERMINAL_RECOVERED = 'TERMINAL_RECOVERED';
export const LIFECYCLE_TERMINAL_FAILED = 'TERMINAL_FAILED';
export const LIFECYCLE_TERMINAL_BLOCKED = 'TERMINAL_BLOCKED';
export const LIFECYCLE_NON_TERMINAL_PENDING = 'NON_TERMINAL_PENDING';
export const LIFECYCLE_NON_TERMINAL_EXECUTING = 'NON_TERMINAL_EXECUTING';
export const LIFECYCLE_NON_TERMINAL_ACTIVE = 'NON_TERMINAL_ACTIVE';
export const LIFECYCLE_UNRESOLVED = 'UNRESOLVED';
export const LIFECYCLE_INCONSISTENT = 'INCONSISTENT';

export const CLOSURE_STATUS_OPEN = 'OPEN';
export const CLOSURE_STATUS_CLOSED = 'CLOSED';
export const CLOSURE_STATUS_BLOCKED = 'BLOCKED';
export const CLOSURE_STATUS_UNRESOLVED = 'UNRESOLVED';

export const ACTIVE_CASE_STATUS_ACTIVE = 'ACTIVE';
export const ACTIVE_CASE_STATUS_INACTIVE = 'INACTIVE';
export const ACTIVE_CASE_STATUS_OPERATOR_REVIEW = 'OPERATOR_REVIEW';

/**
 * Milestone 10.8 — Canonical Lifecycle State Taxonomy Constants
 */
export const STATE_OPEN = 'OPEN';
export const STATE_PENDING = 'PENDING';
export const STATE_EXECUTING = 'EXECUTING';
export const STATE_RECOVERED = 'RECOVERED';
export const STATE_FAILED = 'FAILED';
export const STATE_BLOCKED = 'BLOCKED';
export const STATE_UNRESOLVED = 'UNRESOLVED';

export const RECOVERY_LIFECYCLE_STATES = {
  OPEN: STATE_OPEN,
  PENDING: STATE_PENDING,
  EXECUTING: STATE_EXECUTING,
  RECOVERED: STATE_RECOVERED,
  FAILED: STATE_FAILED,
  BLOCKED: STATE_BLOCKED,
  UNRESOLVED: STATE_UNRESOLVED
};

/**
 * Milestone 10.8 — Lifecycle Transition Type Constants
 */
export const TRANSITION_TYPE_VALID = 'VALID';
export const TRANSITION_TYPE_NO_OP = 'NO_OP';
export const TRANSITION_TYPE_INVALID = 'INVALID';
export const TRANSITION_TYPE_TERMINAL_BLOCKED = 'TERMINAL_BLOCKED';
export const TRANSITION_TYPE_MERCHANT_MISMATCH = 'MERCHANT_MISMATCH';
export const TRANSITION_TYPE_CORRELATION_UNRESOLVED = 'CORRELATION_UNRESOLVED';
export const TRANSITION_TYPE_AUTHORITATIVE_STATE_CONFLICT = 'AUTHORITATIVE_STATE_CONFLICT';
export const TRANSITION_TYPE_OPERATOR_REVIEW = 'OPERATOR_REVIEW';

export const TRANSITION_TYPES = {
  VALID: TRANSITION_TYPE_VALID,
  NO_OP: TRANSITION_TYPE_NO_OP,
  INVALID: TRANSITION_TYPE_INVALID,
  TERMINAL_BLOCKED: TRANSITION_TYPE_TERMINAL_BLOCKED,
  MERCHANT_MISMATCH: TRANSITION_TYPE_MERCHANT_MISMATCH,
  CORRELATION_UNRESOLVED: TRANSITION_TYPE_CORRELATION_UNRESOLVED,
  AUTHORITATIVE_STATE_CONFLICT: TRANSITION_TYPE_AUTHORITATIVE_STATE_CONFLICT,
  OPERATOR_REVIEW: TRANSITION_TYPE_OPERATOR_REVIEW,
  DETECTION_INITIALIZATION: 'DETECTION_INITIALIZATION'
};

/**
 * Maps M10.7 lifecycle classification and raw outcome to canonical state taxonomy.
 * 
 * @param {string|Object|null} classificationOrFin - M10.7 classification string or finalization object
 * @param {string|null} [rawStatus] - Raw status string
 * @returns {string} Canonical state (OPEN, PENDING, EXECUTING, RECOVERED, FAILED, BLOCKED, UNRESOLVED)
 */
export function getCanonicalLifecycleState(classificationOrFin, rawStatus = null) {
  if (!classificationOrFin) return STATE_UNRESOLVED;

  let classification = typeof classificationOrFin === 'object' ? classificationOrFin.lifecycleClassification : classificationOrFin;
  let status = rawStatus || (typeof classificationOrFin === 'object' ? classificationOrFin.recoveryOutcome : null);

  switch (classification) {
    case LIFECYCLE_TERMINAL_RECOVERED:
      return STATE_RECOVERED;
    case LIFECYCLE_TERMINAL_BLOCKED:
      return STATE_BLOCKED;
    case LIFECYCLE_NON_TERMINAL_ACTIVE:
      if (status === 'FAILED' || status === OUTCOME_FAILED) return STATE_FAILED;
      return STATE_OPEN;
    case LIFECYCLE_NON_TERMINAL_PENDING:
      return STATE_PENDING;
    case LIFECYCLE_NON_TERMINAL_EXECUTING:
      return STATE_EXECUTING;
    case LIFECYCLE_INCONSISTENT:
    case LIFECYCLE_UNRESOLVED:
      return STATE_UNRESOLVED;
    default:
      if ([STATE_OPEN, STATE_PENDING, STATE_EXECUTING, STATE_RECOVERED, STATE_FAILED, STATE_BLOCKED, STATE_UNRESOLVED].includes(classification)) {
        return classification;
      }
      return STATE_UNRESOLVED;
  }
}

/**
 * Milestone 10.8 — Pure Recovery Lifecycle Transition Governance Engine.
 * Governs validity of transitions between lifecycle states.
 * 
 * STRICT BOUNDARIES:
 * - Pure, deterministic, side-effect free function.
 * - 0 API calls, 0 DB writes, 0 storage writes, 0 side effects.
 * - Does NOT execute retries, enable autonomy, modify policy, or alter stored priority.
 * - Strictly merchant-aware and correlation-aware.
 * 
 * @param {string|null} previousLifecycleState - Starting canonical lifecycle state
 * @param {string|null} nextLifecycleState - Proposed next canonical lifecycle state
 * @param {Object|null} context - Governance context (merchantId, caseId, activityId, etc.)
 * @returns {Object} Structured transition governance evaluation result
 */
export function evaluateRecoveryLifecycleTransition(
  previousLifecycleState,
  nextLifecycleState,
  context = {}
) {
  const timestamp = new Date().toISOString();
  const ctx = context || {};

  const prev = previousLifecycleState ? String(previousLifecycleState).toUpperCase() : null;
  const next = nextLifecycleState ? String(nextLifecycleState).toUpperCase() : null;

  const validStates = new Set([
    STATE_OPEN,
    STATE_PENDING,
    STATE_EXECUTING,
    STATE_RECOVERED,
    STATE_FAILED,
    STATE_BLOCKED,
    STATE_UNRESOLVED
  ]);

  const caseId = ctx.caseId || ctx.activityId || 'UNKNOWN';
  const merchantId = ctx.merchantId || ctx.currentMerchantId || 'UNKNOWN';
  const previousMerchantId = ctx.previousMerchantId || merchantId;
  const nextMerchantId = ctx.nextMerchantId || merchantId;

  // 1. Fail-Safe Input Validation & Unknown State Protection
  if (!prev || !next || !validStates.has(prev) || !validStates.has(next)) {
    return {
      allowed: false,
      transition: `${prev || 'UNKNOWN'} -> ${next || 'UNKNOWN'}`,
      previousState: prev || 'UNKNOWN',
      nextState: next || 'UNKNOWN',
      transitionType: TRANSITION_TYPE_INVALID,
      reason: `Invalid or unknown lifecycle state transition parameters (${prev || 'NULL'} -> ${next || 'NULL'}).`,
      severity: 'HIGH',
      requiresOperator: true,
      executionAllowed: false,
      lifecycleTerminal: false,
      merchantValidation: 'UNKNOWN',
      correlationValidation: 'UNKNOWN',
      terminalProtection: 'INACTIVE',
      timestamp
    };
  }

  // 2. Merchant Isolation Governance
  let merchantValidation = 'PASSED';
  if (
    (ctx.currentMerchantId && previousMerchantId !== 'UNKNOWN' && previousMerchantId !== ctx.currentMerchantId) ||
    (ctx.currentMerchantId && nextMerchantId !== 'UNKNOWN' && nextMerchantId !== ctx.currentMerchantId) ||
    (previousMerchantId !== 'UNKNOWN' && nextMerchantId !== 'UNKNOWN' && previousMerchantId !== nextMerchantId)
  ) {
    merchantValidation = 'FAILED';
    return {
      allowed: false,
      transition: `${prev} -> ${next}`,
      previousState: prev,
      nextState: next,
      transitionType: TRANSITION_TYPE_MERCHANT_MISMATCH,
      reason: `Cross-merchant lifecycle transition strictly prohibited (${previousMerchantId} vs ${nextMerchantId}).`,
      severity: 'CRITICAL',
      requiresOperator: true,
      executionAllowed: false,
      lifecycleTerminal: false,
      merchantValidation: 'FAILED',
      correlationValidation: 'PASSED',
      terminalProtection: 'INACTIVE',
      timestamp
    };
  }

  // 3. Correlation Identity Governance
  let correlationValidation = 'PASSED';
  const hasActivity = Boolean(ctx.activityId);
  const hasPayment = Boolean(ctx.paymentAttemptId);
  const hasMerchantCustomerProduct = Boolean(ctx.merchantId && ctx.customerId && ctx.productId);
  const hasOnlyProduct = Boolean(ctx.productId && !ctx.merchantId && !ctx.customerId && !hasActivity && !hasPayment);

  if (hasOnlyProduct || (!hasActivity && !hasPayment && !hasMerchantCustomerProduct && caseId === 'UNKNOWN')) {
    correlationValidation = 'FAILED';
    return {
      allowed: false,
      transition: `${prev} -> ${next}`,
      previousState: prev,
      nextState: next,
      transitionType: TRANSITION_TYPE_CORRELATION_UNRESOLVED,
      reason: 'Lifecycle correlation unresolved. Cannot verify canonical payment lifecycle identity.',
      severity: 'HIGH',
      requiresOperator: true,
      executionAllowed: false,
      lifecycleTerminal: false,
      merchantValidation: 'PASSED',
      correlationValidation: 'FAILED',
      terminalProtection: 'INACTIVE',
      timestamp
    };
  }

  // 4. Same-State Transitions (NO_OP)
  if (prev === next) {
    const isTerminalState = (prev === STATE_RECOVERED || prev === STATE_BLOCKED || ctx.terminal === true);
    return {
      allowed: true,
      transition: `${prev} -> ${next}`,
      previousState: prev,
      nextState: next,
      transitionType: TRANSITION_TYPE_NO_OP,
      reason: isTerminalState ? `Lifecycle is in terminal state '${prev}'. State unchanged.` : 'Lifecycle state remains unchanged.',
      severity: 'NONE',
      requiresOperator: false,
      executionAllowed: !isTerminalState && (prev === STATE_OPEN || prev === STATE_FAILED),
      lifecycleTerminal: isTerminalState,
      merchantValidation: 'PASSED',
      correlationValidation: 'PASSED',
      terminalProtection: isTerminalState ? 'ACTIVE' : 'INACTIVE',
      timestamp
    };
  }

  // 5. Terminal State Protection & Authoritative Conflict Governance
  const isPrevTerminal = (prev === STATE_RECOVERED || prev === STATE_BLOCKED || ctx.terminal === true);
  const isAuthoritativeRecovered = ctx.authoritativeStatus === 'RECOVERED' || ctx.reconciledOutcome === 'RECOVERED';
  const isAuthoritativeBlocked = ctx.authoritativeStatus === 'BLOCKED' || ctx.closureStatus === 'BLOCKED';

  if (isPrevTerminal || isAuthoritativeRecovered || isAuthoritativeBlocked) {
    const conflictType = (prev === STATE_RECOVERED || isAuthoritativeRecovered)
      ? TRANSITION_TYPE_AUTHORITATIVE_STATE_CONFLICT
      : TRANSITION_TYPE_TERMINAL_BLOCKED;

    const conflictReason = (prev === STATE_RECOVERED || isAuthoritativeRecovered)
      ? 'Authoritative backend lifecycle is already RECOVERED.'
      : `Terminal lifecycle state cannot be transitioned into an active state.`;

    return {
      allowed: false,
      transition: `${prev} -> ${next}`,
      previousState: prev,
      nextState: next,
      transitionType: conflictType,
      reason: conflictReason,
      severity: 'HIGH',
      requiresOperator: prev === STATE_BLOCKED,
      executionAllowed: false,
      lifecycleTerminal: true,
      merchantValidation: 'PASSED',
      correlationValidation: 'PASSED',
      terminalProtection: 'ACTIVE',
      timestamp
    };
  }

  // 6. Explicit Valid Transition Matrix Rules
  const validTransitions = new Set([
    `${STATE_OPEN}->${STATE_PENDING}`,
    `${STATE_OPEN}->${STATE_EXECUTING}`,
    `${STATE_OPEN}->${STATE_RECOVERED}`,
    `${STATE_OPEN}->${STATE_FAILED}`,
    `${STATE_OPEN}->${STATE_BLOCKED}`,
    `${STATE_OPEN}->${STATE_UNRESOLVED}`,

    `${STATE_PENDING}->${STATE_EXECUTING}`,
    `${STATE_PENDING}->${STATE_RECOVERED}`,
    `${STATE_PENDING}->${STATE_FAILED}`,
    `${STATE_PENDING}->${STATE_UNRESOLVED}`,

    `${STATE_EXECUTING}->${STATE_RECOVERED}`,
    `${STATE_EXECUTING}->${STATE_FAILED}`,
    `${STATE_EXECUTING}->${STATE_UNRESOLVED}`,

    `${STATE_FAILED}->${STATE_OPEN}`,
    `${STATE_FAILED}->${STATE_PENDING}`,
    `${STATE_FAILED}->${STATE_EXECUTING}`,
    `${STATE_FAILED}->${STATE_BLOCKED}`,
    `${STATE_FAILED}->${STATE_RECOVERED}`,
    `${STATE_FAILED}->${STATE_UNRESOLVED}`,

    `${STATE_UNRESOLVED}->${STATE_OPEN}`,
    `${STATE_UNRESOLVED}->${STATE_BLOCKED}`,
    `${STATE_UNRESOLVED}->${STATE_RECOVERED}`
  ]);

  const transitionKey = `${prev}->${next}`;
  if (validTransitions.has(transitionKey)) {
    const isNextTerminal = (next === STATE_RECOVERED || next === STATE_BLOCKED);
    const isNextExecuting = (next === STATE_EXECUTING || next === STATE_PENDING);
    const isOperatorRequired = (next === STATE_UNRESOLVED || ctx.requiresOperator === true);

    return {
      allowed: true,
      transition: `${prev} -> ${next}`,
      previousState: prev,
      nextState: next,
      transitionType: isOperatorRequired ? TRANSITION_TYPE_OPERATOR_REVIEW : TRANSITION_TYPE_VALID,
      reason: `Valid recovery lifecycle transition from ${prev} to ${next}.`,
      severity: isOperatorRequired ? 'WARNING' : 'NONE',
      requiresOperator: isOperatorRequired,
      executionAllowed: isNextExecuting || (prev === STATE_FAILED && (next === STATE_OPEN || next === STATE_EXECUTING)),
      lifecycleTerminal: isNextTerminal,
      merchantValidation: 'PASSED',
      correlationValidation: 'PASSED',
      terminalProtection: 'INACTIVE',
      timestamp
    };
  }

  // 7. Fallback Invalid Transition Handler
  return {
    allowed: false,
    transition: `${prev} -> ${next}`,
    previousState: prev,
    nextState: next,
    transitionType: TRANSITION_TYPE_INVALID,
    reason: `Transition from ${prev} to ${next} is not permitted by lifecycle governance.`,
    severity: 'HIGH',
    requiresOperator: true,
    executionAllowed: false,
    lifecycleTerminal: false,
    merchantValidation: 'PASSED',
    correlationValidation: 'PASSED',
    terminalProtection: 'INACTIVE',
    };
}

/**
 * Milestone 10.9 — Canonical Lifecycle Audit Event Types
 */
export const AUDIT_EVENT_LIFECYCLE_DETECTED = 'RECOVERY_LIFECYCLE_DETECTED';
export const AUDIT_EVENT_TRANSITION_EVALUATED = 'RECOVERY_LIFECYCLE_TRANSITION_EVALUATED';
export const AUDIT_EVENT_TRANSITION_BLOCKED = 'RECOVERY_LIFECYCLE_TRANSITION_BLOCKED';
export const AUDIT_EVENT_RECONCILED = 'RECOVERY_LIFECYCLE_RECONCILED';
export const AUDIT_EVENT_FINALIZED = 'RECOVERY_LIFECYCLE_FINALIZED';
export const AUDIT_EVENT_REOPENED = 'RECOVERY_LIFECYCLE_REOPENED';
export const AUDIT_EVENT_OPERATOR_REVIEW = 'RECOVERY_LIFECYCLE_OPERATOR_REVIEW';
export const AUDIT_EVENT_FEEDBACK_RECORDED = 'RECOVERY_LIFECYCLE_FEEDBACK_RECORDED';

export const AUDIT_EVENT_TYPES = {
  RECOVERY_LIFECYCLE_DETECTED: AUDIT_EVENT_LIFECYCLE_DETECTED,
  RECOVERY_LIFECYCLE_TRANSITION_EVALUATED: AUDIT_EVENT_TRANSITION_EVALUATED,
  RECOVERY_LIFECYCLE_TRANSITION_BLOCKED: AUDIT_EVENT_TRANSITION_BLOCKED,
  RECOVERY_LIFECYCLE_RECONCILED: AUDIT_EVENT_RECONCILED,
  RECOVERY_LIFECYCLE_FINALIZED: AUDIT_EVENT_FINALIZED,
  RECOVERY_LIFECYCLE_REOPENED: AUDIT_EVENT_REOPENED,
  RECOVERY_LIFECYCLE_OPERATOR_REVIEW: AUDIT_EVENT_OPERATOR_REVIEW,
  RECOVERY_LIFECYCLE_FEEDBACK_RECORDED: AUDIT_EVENT_FEEDBACK_RECORDED
};

/**
 * Milestone 10.9 — Canonical Audit Event Sources
 */
export const AUDIT_SOURCE_BACKEND = 'BACKEND';
export const AUDIT_SOURCE_RECONCILIATION = 'RECONCILIATION';
export const AUDIT_SOURCE_FINALIZATION = 'LIFECYCLE_FINALIZATION';
export const AUDIT_SOURCE_TRANSITION = 'TRANSITION_GOVERNANCE';
export const AUDIT_SOURCE_ORCHESTRATION = 'ORCHESTRATION';
export const AUDIT_SOURCE_GUARDED_DISPATCH = 'GUARDED_DISPATCH';
export const AUDIT_SOURCE_EXECUTION = 'EXECUTION';
export const AUDIT_SOURCE_FEEDBACK = 'FEEDBACK';
export const AUDIT_SOURCE_OPERATOR = 'OPERATOR';

export const AUDIT_SOURCES = {
  BACKEND: AUDIT_SOURCE_BACKEND,
  RECONCILIATION: AUDIT_SOURCE_RECONCILIATION,
  LIFECYCLE_FINALIZATION: AUDIT_SOURCE_FINALIZATION,
  TRANSITION_GOVERNANCE: AUDIT_SOURCE_TRANSITION,
  ORCHESTRATION: AUDIT_SOURCE_ORCHESTRATION,
  GUARDED_DISPATCH: AUDIT_SOURCE_GUARDED_DISPATCH,
  EXECUTION: AUDIT_SOURCE_EXECUTION,
  FEEDBACK: AUDIT_SOURCE_FEEDBACK,
  OPERATOR: AUDIT_SOURCE_OPERATOR
};

/**
 * Milestone 10.9 — Canonical Audit Event Actors
 */
export const AUDIT_ACTOR_AGENT = 'Autonomous AI Agent';
export const AUDIT_ACTOR_OPERATOR = 'Merchant Operator';
export const AUDIT_ACTOR_SYSTEM = 'System';

export const AUDIT_ACTORS = {
  AGENT: AUDIT_ACTOR_AGENT,
  OPERATOR: AUDIT_ACTOR_OPERATOR,
  SYSTEM: AUDIT_ACTOR_SYSTEM
};

/**
 * Milestone 10.9 — Pure Canonical Lifecycle Audit Event Constructor.
 * Builds a single deterministic lifecycle audit event object.
 * 
 * STRICT BOUNDARIES:
 * - Pure, deterministic, side-effect free function.
 * - 0 API calls, 0 DB writes, 0 storage writes, 0 side effects.
 * - Never mutates inputs, never executes actions.
 * - Fails safely on missing or incomplete inputs.
 * 
 * @param {Object|null} lifecycleContext - Lifecycle identity context
 * @param {string} eventType - Audit event type
 * @param {string|null} previousState - Previous canonical state
 * @param {string|null} nextState - Next canonical state
 * @param {Object|null} transitionGovernance - Transition governance evaluation
 * @param {Object|null} reconciliationResult - Outcome reconciliation result
 * @param {Object|null} lifecycleFinalization - Lifecycle finalization result
 * @param {string|null} currentMerchantId - Active merchant ID
 * @param {string} currentTime - ISO timestamp
 * @returns {Object} Structured audit event object
 */
export function buildRecoveryLifecycleAuditEvent(
  lifecycleContext = null,
  eventType = AUDIT_EVENT_LIFECYCLE_DETECTED,
  previousState = null,
  nextState = null,
  transitionGovernance = null,
  reconciliationResult = null,
  lifecycleFinalization = null,
  currentMerchantId = null,
  currentTime = new Date().toISOString()
) {
  const timestamp = currentTime || new Date().toISOString();
  const ctx = lifecycleContext || {};

  const merchantId = ctx.merchantId || currentMerchantId || 'UNKNOWN';
  const customerId = ctx.customerId || 'Customer';
  const productId = ctx.productId || 'Product';
  const productName = ctx.productName || 'Digital Product';
  const caseId = ctx.caseId || ctx.activityId || 'UNKNOWN';
  const activityId = ctx.activityId || caseId;
  const paymentAttemptId = ctx.paymentAttemptId || null;
  const paymentResultId = ctx.paymentResultId || null;

  const prev = previousState || ctx.previousState || 'UNKNOWN';
  const next = nextState || ctx.nextState || 'UNKNOWN';

  // Section 23 Fail-Safe: Malformed or incomplete audit input
  if (!lifecycleContext || (caseId === 'UNKNOWN' && merchantId === 'UNKNOWN')) {
    return {
      auditId: `act_lifecycle_malformed_${String(timestamp).replace(/[:.]/g, '_')}`,
      eventType: eventType || AUDIT_EVENT_LIFECYCLE_DETECTED,
      timestamp,
      valid: false,
      requiresOperator: true,
      reason: "Insufficient lifecycle audit data",
      merchantId: 'UNKNOWN',
      customerId: 'Customer',
      productId: 'Product',
      caseId: 'UNKNOWN',
      activityId: 'UNKNOWN',
      previousLifecycleState: 'UNKNOWN',
      nextLifecycleState: 'UNKNOWN',
      transitionType: 'INVALID',
      transitionAllowed: false,
      terminal: false,
      active: false,
      closureStatus: 'UNRESOLVED',
      reconciliationStatus: 'RECONCILIATION_NOT_EXECUTED',
      recoveryOutcome: 'UNKNOWN',
      severity: 'HIGH',
      executionMode: 'MANUAL',
      actor: AUDIT_ACTOR_SYSTEM,
      source: AUDIT_SOURCE_TRANSITION,
      schemaVersion: '1.0.0'
    };
  }

  const isTerminal = lifecycleFinalization ? Boolean(lifecycleFinalization.terminal) : (next === 'RECOVERED' || next === 'BLOCKED');
  const isActive = lifecycleFinalization ? Boolean(lifecycleFinalization.active) : !isTerminal;

  const auditId = `act_lifecycle_${caseId}_${prev}_${next}_${eventType}_${String(timestamp).replace(/[:.]/g, '_')}`;

  return {
    auditId,
    eventType: eventType || AUDIT_EVENT_LIFECYCLE_DETECTED,
    timestamp,
    valid: true,

    merchantId,
    customerId,
    productId,
    productName,

    caseId,
    activityId,
    paymentAttemptId,
    paymentResultId,

    previousLifecycleState: prev,
    nextLifecycleState: next,

    transitionType: transitionGovernance?.transitionType || (eventType === AUDIT_EVENT_FINALIZED ? 'FINALIZATION' : 'EVALUATED'),
    transitionAllowed: transitionGovernance ? Boolean(transitionGovernance.allowed) : true,

    terminal: isTerminal,
    active: isActive,
    closureStatus: lifecycleFinalization?.closureStatus || (next === 'RECOVERED' ? 'CLOSED' : (next === 'BLOCKED' ? 'BLOCKED' : 'OPEN')),

    reconciliationStatus: reconciliationResult?.reconciliationStatus || 'RECONCILIATION_NOT_EXECUTED',
    recoveryOutcome: reconciliationResult?.reconciledOutcome || lifecycleFinalization?.recoveryOutcome || (next === 'RECOVERED' ? 'RECOVERED' : (next === 'BLOCKED' ? 'FAILED' : 'UNKNOWN')),

    reason: transitionGovernance?.reason || lifecycleFinalization?.closureReason || reconciliationResult?.reasoning?.summary || 'Lifecycle audit event recorded.',
    severity: transitionGovernance?.severity || (eventType === AUDIT_EVENT_TRANSITION_BLOCKED ? 'HIGH' : 'NONE'),
    requiresOperator: transitionGovernance ? Boolean(transitionGovernance.requiresOperator) : (next === 'UNRESOLVED'),

    executionMode: ctx.executionMode || (ctx.actor === AUDIT_ACTOR_AGENT ? 'AUTONOMOUS' : 'MANUAL'),
    actor: ctx.actor || (ctx.executionMode === 'AUTONOMOUS' ? AUDIT_ACTOR_AGENT : AUDIT_ACTOR_OPERATOR),

    source: ctx.source || (eventType === AUDIT_EVENT_FINALIZED ? AUDIT_SOURCE_FINALIZATION : (eventType === AUDIT_EVENT_RECONCILED ? AUDIT_SOURCE_RECONCILIATION : AUDIT_SOURCE_TRANSITION)),
    schemaVersion: '1.0.0'
  };
}

/**
 * Milestone 10.9 — Pure Recovery Lifecycle History Aggregator.
 * Groups recovery events and transition events into merchant-isolated, case-specific lifecycle histories.
 * 
 * STRICT BOUNDARIES:
 * - Pure, deterministic, side-effect free function.
 * - 0 API calls, 0 DB writes, 0 storage writes, 0 side effects.
 * - Strictly merchant-isolated.
 * - Never reinserts terminal lifecycles into active queues.
 * 
 * @param {Array|null} recoveryEvents - Authoritative backend recovery events
 * @param {Array|null} transitionEvents - Lifecycle audit events / transitions
 * @param {string|null} currentMerchantId - Active merchant ID
 * @returns {Object} Structured lifecycle history contract
 */
export function buildRecoveryLifecycleHistory(
  recoveryEvents = [],
  transitionEvents = [],
  currentMerchantId = null
) {
  const timestamp = new Date().toISOString();
  const lifecyclesMap = new Map();

  const safeRecoveryEvents = Array.isArray(recoveryEvents) ? recoveryEvents : [];
  const safeTransitionEvents = Array.isArray(transitionEvents) ? transitionEvents : [];

  // 1. Process Authoritative Backend Recovery Events
  safeRecoveryEvents.forEach(evt => {
    if (!evt) return;
    const mId = evt.merchantId || currentMerchantId;
    if (currentMerchantId && mId && mId !== currentMerchantId) return; // Merchant isolation check

    const key = evt.activityId || evt.paymentAttemptId || evt.id || (evt.merchantId && evt.customerId && evt.productId ? `cand_${evt.merchantId}_${evt.customerId}_${evt.productId}` : null);
    if (!key) return;

    const rawStatus = (evt.status || 'FAILED').toUpperCase();
    const isRecovered = rawStatus === 'RECOVERED' || Boolean(evt.recoveredAmount);
    const retryCount = Number(evt.retryCount || 0);
    const maxRetryLimit = Number(evt.maxRetryLimit || 1);
    const isBlocked = !isRecovered && (retryCount >= maxRetryLimit || rawStatus === 'BLOCKED');

    const fin = finalizeRecoveryLifecycle(null, evt, currentMerchantId, timestamp);
    const canonicalState = getCanonicalLifecycleState(fin.lifecycleClassification, isRecovered ? 'RECOVERED' : rawStatus);

    if (!lifecyclesMap.has(key)) {
      lifecyclesMap.set(key, {
        lifecycleIdentity: {
          caseId: key,
          activityId: evt.activityId || key,
          paymentAttemptId: evt.paymentAttemptId || key,
          merchantId: mId,
          customerId: evt.customerId || 'Customer',
          productId: evt.productId || 'Product'
        },
        merchantId: mId,
        customerId: evt.customerId || 'Customer',
        productId: evt.productId || 'Product',
        productName: evt.productName || 'Digital Product',
        currentState: canonicalState,
        previousState: isRecovered ? STATE_EXECUTING : (isBlocked ? STATE_FAILED : STATE_OPEN),
        transitions: [
          {
            timestamp: evt.created_at || evt.timestamp || timestamp,
            previousState: STATE_OPEN,
            nextState: isRecovered ? STATE_RECOVERED : (isBlocked ? STATE_BLOCKED : STATE_FAILED),
            transitionType: isRecovered ? TRANSITION_TYPE_VALID : (isBlocked ? TRANSITION_TYPE_TERMINAL_BLOCKED : TRANSITION_TYPE_VALID),
            allowed: true,
            reason: fin.closureReason || `Initial recovery event recorded (${rawStatus}).`,
            actor: evt.actor || (evt.executionMode === 'AUTONOMOUS' ? AUDIT_ACTOR_AGENT : AUDIT_ACTOR_OPERATOR),
            executionMode: evt.executionMode || 'MANUAL',
            source: AUDIT_SOURCE_BACKEND
          }
        ],
        terminal: fin.terminal,
        closureStatus: fin.closureStatus,
        recoveryOutcome: fin.recoveryOutcome,
        openedAt: evt.created_at || evt.timestamp || timestamp,
        lastTransitionAt: evt.timestamp || evt.created_at || timestamp,
        closedAt: fin.terminal ? (evt.timestamp || timestamp) : null,
        totalTransitions: 1,
        operatorReviewRequired: fin.activeCaseStatus === ACTIVE_CASE_STATUS_OPERATOR_REVIEW || isBlocked
      });
    } else {
      const existing = lifecyclesMap.get(key);
      if (isRecovered) {
        existing.currentState = STATE_RECOVERED;
        existing.terminal = true;
        existing.closureStatus = CLOSURE_STATUS_CLOSED;
        existing.recoveryOutcome = OUTCOME_RECOVERED;
        existing.closedAt = evt.timestamp || timestamp;
      }
    }
  });

  // 2. Process Transition Events & Deduplicate NO_OPs
  safeTransitionEvents.forEach(te => {
    if (!te) return;
    const mId = te.merchantId || currentMerchantId;
    if (currentMerchantId && mId && mId !== currentMerchantId) return; // Merchant isolation check

    const key = te.caseId || te.activityId || te.paymentAttemptId;
    if (!key) return;

    if (te.transitionType === TRANSITION_TYPE_NO_OP) return; // Skip NO_OP polling transitions

    if (lifecyclesMap.has(key)) {
      const lc = lifecyclesMap.get(key);
      const transitionKey = `${te.previousLifecycleState || te.previousState}->${te.nextLifecycleState || te.nextState}_${te.timestamp}`;

      const alreadyExists = lc.transitions.some(t => `${t.previousState}->${t.nextState}_${t.timestamp}` === transitionKey);
      if (!alreadyExists) {
        lc.transitions.push({
          timestamp: te.timestamp || timestamp,
          previousState: te.previousLifecycleState || te.previousState || lc.currentState,
          nextState: te.nextLifecycleState || te.nextState || lc.currentState,
          transitionType: te.transitionType || TRANSITION_TYPE_VALID,
          allowed: Boolean(te.transitionAllowed ?? te.allowed ?? true),
          reason: te.reason || 'Lifecycle transition recorded.',
          actor: te.actor || AUDIT_ACTOR_SYSTEM,
          executionMode: te.executionMode || 'MANUAL',
          source: te.source || AUDIT_SOURCE_TRANSITION
        });
        lc.currentState = te.nextLifecycleState || te.nextState || lc.currentState;
        lc.lastTransitionAt = te.timestamp || timestamp;
        lc.totalTransitions = lc.transitions.length;
        if (te.requiresOperator) lc.operatorReviewRequired = true;
      }
    }
  });

  const lifecycles = Array.from(lifecyclesMap.values());

  let transitionCount = 0;
  let terminalLifecycleCount = 0;
  let recoveredLifecycleCount = 0;
  let blockedLifecycleCount = 0;
  let unresolvedLifecycleCount = 0;
  let activeLifecycleCount = 0;

  lifecycles.forEach(lc => {
    transitionCount += lc.totalTransitions;
    if (lc.terminal) {
      terminalLifecycleCount++;
      if (lc.currentState === STATE_RECOVERED || lc.recoveryOutcome === OUTCOME_RECOVERED) recoveredLifecycleCount++;
      else if (lc.currentState === STATE_BLOCKED || lc.closureStatus === CLOSURE_STATUS_BLOCKED) blockedLifecycleCount++;
    } else {
      if (lc.currentState === STATE_UNRESOLVED || lc.closureStatus === CLOSURE_STATUS_UNRESOLVED) unresolvedLifecycleCount++;
      else activeLifecycleCount++;
    }
  });

  return {
    lifecycles,
    transitionCount,
    terminalLifecycleCount,
    recoveredLifecycleCount,
    blockedLifecycleCount,
    unresolvedLifecycleCount,
    activeLifecycleCount,
    timestamp
  };
}

/**
 * Milestone 10.10 — Pure Recovery Lifecycle Replay & Time-Travel Explanation Engine.
 * Reconstructs point-in-time state snapshot, step deltas, and multi-stage explanations for any historical step.
 * 
 * STRICT BOUNDARIES:
 * - Pure, deterministic, side-effect free function.
 * - 0 API calls, 0 DB writes, 0 storage writes, 0 side effects.
 * - Enforces merchant isolation.
 * - Never invents false historical facts (unrecorded metrics set to null or NOT_RECORDED).
 * - Never mutates input objects.
 * - Safe step index bounds normalization (0 <= stepIndex < totalSteps).
 * 
 * @param {Object|null} lifecycleHistoryItem - Aggregated lifecycle history item from buildRecoveryLifecycleHistory
 * @param {number|null} selectedStepIndex - 0-indexed step number to inspect/replay
 * @param {string|null} currentMerchantId - Active merchant ID context
 * @returns {Object} Structured lifecycle replay contract
 */
export function buildRecoveryLifecycleReplay(
  lifecycleHistoryItem = null,
  selectedStepIndex = 0,
  currentMerchantId = null
) {
  const timestamp = new Date().toISOString();

  // Fail-Safe: Missing or malformed lifecycle history item
  if (!lifecycleHistoryItem || typeof lifecycleHistoryItem !== 'object') {
    return {
      valid: false,
      reason: 'Insufficient lifecycle history data for replay.',
      lifecycleId: 'UNKNOWN',
      merchantId: currentMerchantId || 'UNKNOWN',
      totalSteps: 0,
      currentStepIndex: 0,
      activeStep: null,
      reconstructedState: null,
      stepDelta: null,
      explanation: {
        title: 'No Replay Data Available',
        summary: 'Lifecycle history item is empty or invalid.',
        governanceRuleApplied: 'NOT_RECORDED',
        complianceStatus: 'NOT_RECORDED'
      },
      schemaVersion: '1.0.0'
    };
  }

  // Merchant Isolation Check
  const itemMerchantId = lifecycleHistoryItem.merchantId || lifecycleHistoryItem.lifecycleIdentity?.merchantId;
  if (currentMerchantId && itemMerchantId && itemMerchantId !== currentMerchantId) {
    return {
      valid: false,
      reason: 'Merchant mismatch prohibited in lifecycle replay.',
      lifecycleId: lifecycleHistoryItem.lifecycleIdentity?.caseId || 'UNKNOWN',
      merchantId: currentMerchantId,
      totalSteps: 0,
      currentStepIndex: 0,
      activeStep: null,
      reconstructedState: null,
      stepDelta: null,
      explanation: {
        title: 'Merchant Access Denied',
        summary: 'Target lifecycle belongs to another merchant context.',
        governanceRuleApplied: 'MERCHANT_MISMATCH',
        complianceStatus: 'BLOCKED'
      },
      schemaVersion: '1.0.0'
    };
  }

  const transitions = Array.isArray(lifecycleHistoryItem.transitions) ? lifecycleHistoryItem.transitions : [];
  const totalSteps = transitions.length;

  if (totalSteps === 0) {
    return {
      valid: false,
      reason: 'Lifecycle history contains zero transitions.',
      lifecycleId: lifecycleHistoryItem.lifecycleIdentity?.caseId || 'UNKNOWN',
      merchantId: itemMerchantId || currentMerchantId || 'UNKNOWN',
      totalSteps: 0,
      currentStepIndex: 0,
      activeStep: null,
      reconstructedState: null,
      stepDelta: null,
      explanation: {
        title: 'No Transitions Recorded',
        summary: 'Selected lifecycle has no recorded transition history steps.',
        governanceRuleApplied: 'NOT_RECORDED',
        complianceStatus: 'NOT_RECORDED'
      },
      schemaVersion: '1.0.0'
    };
  }

  // Safe Step Index Bounds Normalization (0 <= currentStepIndex < totalSteps)
  let safeIndex = 0;
  if (selectedStepIndex != null && !isNaN(selectedStepIndex)) {
    const parsed = Math.floor(Number(selectedStepIndex));
    if (parsed < 0) {
      safeIndex = 0;
    } else if (parsed >= totalSteps) {
      safeIndex = totalSteps - 1;
    } else {
      safeIndex = parsed;
    }
  }

  const activeStepRaw = transitions[safeIndex] || {};
  const activeStep = {
    stepNumber: safeIndex + 1,
    timestamp: activeStepRaw.timestamp || null,
    previousState: activeStepRaw.previousState || 'UNKNOWN',
    nextState: activeStepRaw.nextState || 'UNKNOWN',
    transitionType: activeStepRaw.transitionType || 'VALID',
    allowed: Boolean(activeStepRaw.allowed ?? true),
    actor: activeStepRaw.actor || AUDIT_ACTOR_SYSTEM,
    executionMode: activeStepRaw.executionMode || 'MANUAL',
    source: activeStepRaw.source || 'TRANSITION_GOVERNANCE',
    reason: activeStepRaw.reason || 'Lifecycle transition step recorded.'
  };

  // Reconstruct point-in-time state at safeIndex
  const pointInTimeState = activeStep.nextState;
  const isFinalStep = safeIndex === totalSteps - 1;
  const isTerminalState = (pointInTimeState === 'RECOVERED' || pointInTimeState === 'BLOCKED' || (isFinalStep && Boolean(lifecycleHistoryItem.terminal)));

  let closureStatus = 'OPEN';
  if (pointInTimeState === 'RECOVERED') closureStatus = 'CLOSED';
  else if (pointInTimeState === 'BLOCKED') closureStatus = 'BLOCKED';
  else if (pointInTimeState === 'UNRESOLVED') closureStatus = 'UNRESOLVED';

  let recoveryOutcome = 'UNRESOLVED';
  if (pointInTimeState === 'RECOVERED') recoveryOutcome = 'RECOVERED';
  else if (pointInTimeState === 'BLOCKED') recoveryOutcome = 'FAILED';

  // Determine pipeline stage from source / action
  let pipelineStage = 'STATE_TRANSITION';
  if (activeStep.source === 'BACKEND') pipelineStage = 'DETECTION';
  else if (activeStep.source === 'LIFECYCLE_FINALIZATION') pipelineStage = 'FINALIZATION';
  else if (activeStep.source === 'RECONCILIATION') pipelineStage = 'RECONCILIATION';
  else if (activeStep.source === 'EXECUTION') pipelineStage = 'EXECUTION';
  else if (activeStep.source === 'GUARDED_DISPATCH') pipelineStage = 'DISPATCH';
  else if (activeStep.source === 'FEEDBACK') pipelineStage = 'FEEDBACK';
  else if (activeStep.nextState === 'EXECUTING') pipelineStage = 'EXECUTION';
  else if (activeStep.nextState === 'PENDING') pipelineStage = 'STRATEGY';
  else if (activeStep.nextState === 'OPEN') pipelineStage = 'DETECTION';

  const reconstructedState = {
    effectiveState: pointInTimeState,
    terminal: isTerminalState,
    closureStatus,
    recoveryOutcome,
    pipelineStage,
    operatorReviewRequired: Boolean(activeStepRaw.requiresOperator || (isFinalStep && lifecycleHistoryItem.operatorReviewRequired))
  };

  // Step Delta Calculation
  const previousStepRaw = safeIndex > 0 ? transitions[safeIndex - 1] : null;
  let timeSincePreviousStepMs = null;

  if (previousStepRaw && previousStepRaw.timestamp && activeStep.timestamp) {
    const tPrev = new Date(previousStepRaw.timestamp).getTime();
    const tCurr = new Date(activeStep.timestamp).getTime();
    if (!isNaN(tPrev) && !isNaN(tCurr) && tCurr >= tPrev) {
      timeSincePreviousStepMs = tCurr - tPrev;
    }
  }

  const stepDelta = {
    stateChanged: activeStep.previousState !== activeStep.nextState,
    previousState: activeStep.previousState,
    newState: activeStep.nextState,
    timeSincePreviousStepMs,
    isTerminalTransition: isTerminalState
  };

  // Explanation Generation
  let complianceStatus = 'COMPLIANT';
  if (!activeStep.allowed || activeStep.transitionType === 'INVALID' || activeStep.transitionType === 'MERCHANT_MISMATCH') {
    complianceStatus = 'BLOCKED';
  } else if (reconstructedState.operatorReviewRequired || activeStep.transitionType === 'OPERATOR_REVIEW') {
    complianceStatus = 'REVIEW_REQUIRED';
  }

  const actorLabel = activeStep.actor ? ` via ${activeStep.actor}` : '';
  const explanation = {
    title: `Step ${safeIndex + 1} of ${totalSteps}: Lifecycle Transition (${activeStep.previousState} → ${activeStep.nextState})`,
    summary: `Lifecycle state transitioned from ${activeStep.previousState} to ${activeStep.nextState}${actorLabel}.`,
    governanceRuleApplied: activeStep.reason || `Transition governed by ${activeStep.transitionType} policy.`,
    complianceStatus
  };

  return {
    valid: true,
    lifecycleId: lifecycleHistoryItem.lifecycleIdentity?.caseId || 'UNKNOWN',
    merchantId: itemMerchantId || currentMerchantId || 'UNKNOWN',
    totalSteps,
    currentStepIndex: safeIndex,
    activeStep,
    reconstructedState,
    stepDelta,
    explanation,
    schemaVersion: '1.0.0'
  };
}

/**
 * Milestone 10.11 — Pure Recovery Lifecycle Anomaly Diagnostic & Guided Operator Resolution Engine.
 * Analyzes lifecycle history items to identify root cause governance anomalies and derive policy-compliant resolution options.
 * 
 * STRICT BOUNDARIES:
 * - Pure, deterministic, side-effect free function.
 * - 0 API calls, 0 DB writes, 0 storage writes, 0 lifecycle state mutations.
 * - Strictly observational — does NOT execute retries or authorize actions.
 * - Resolution options are PROPOSALS ONLY.
 * - Strictly merchant-isolated.
 * 
 * @param {Object|null} lifecycleHistoryItem - Aggregated lifecycle history item from buildRecoveryLifecycleHistory
 * @param {number} currentStepIndex - 0-indexed historical step position
 * @param {string|null} currentMerchantId - Active authenticated merchant ID context
 * @returns {Object} Structured diagnostic and resolution contract
 */
export function buildRecoveryLifecycleAnomalyDiagnostic(
  lifecycleHistoryItem = null,
  currentStepIndex = 0,
  currentMerchantId = null
) {
  const timestamp = new Date().toISOString();

  // Fail-Safe 1: Null, undefined, or invalid lifecycle input
  if (!lifecycleHistoryItem || typeof lifecycleHistoryItem !== 'object') {
    return {
      valid: false,
      reason: 'Insufficient lifecycle history data for diagnostic.',
      lifecycleId: 'UNKNOWN',
      merchantId: currentMerchantId || 'UNKNOWN',
      hasAnomaly: false,
      anomalySeverity: 'NONE',
      primaryAnomalyCategory: 'NONE',
      rootCause: {
        originatingLayer: 'UNKNOWN',
        summary: 'Lifecycle history item is empty or invalid.',
        evidence: []
      },
      resolutionOptions: [],
      schemaVersion: '1.0.0'
    };
  }

  const caseId = lifecycleHistoryItem.lifecycleIdentity?.caseId || lifecycleHistoryItem.caseId || lifecycleHistoryItem.activityId || 'UNKNOWN';
  const itemMerchantId = lifecycleHistoryItem.merchantId || lifecycleHistoryItem.lifecycleIdentity?.merchantId;

  // Fail-Safe 2: Merchant Isolation Check
  if (currentMerchantId && itemMerchantId && itemMerchantId !== 'UNKNOWN' && itemMerchantId !== currentMerchantId) {
    return {
      valid: false,
      reason: 'Merchant mismatch prohibited in diagnostic.',
      lifecycleId: caseId,
      merchantId: currentMerchantId,
      hasAnomaly: true,
      anomalySeverity: 'CRITICAL',
      primaryAnomalyCategory: 'MERCHANT_MISMATCH',
      rootCause: {
        originatingLayer: 'POLICY_GOVERNANCE',
        summary: `Lifecycle belongs to another merchant context (${itemMerchantId} !== ${currentMerchantId}).`,
        evidence: [
          {
            category: 'RECORDED_FACT',
            label: 'Lifecycle Merchant Identity',
            value: String(itemMerchantId),
            sourceField: 'merchantId'
          },
          {
            category: 'RECORDED_FACT',
            label: 'Active Context Merchant Identity',
            value: String(currentMerchantId),
            sourceField: 'currentMerchantId'
          },
          {
            category: 'DETERMINISTIC_DERIVATION',
            label: 'Merchant Isolation Rule',
            value: 'BOUNDARY_VIOLATION',
            sourceRule: 'RULE_MERCHANT_ISOLATION'
          }
        ]
      },
      resolutionOptions: [],
      schemaVersion: '1.0.0'
    };
  }

  // Correlation Identity Inspection
  const activityId = lifecycleHistoryItem.lifecycleIdentity?.activityId || lifecycleHistoryItem.activityId;
  const paymentAttemptId = lifecycleHistoryItem.lifecycleIdentity?.paymentAttemptId || lifecycleHistoryItem.paymentAttemptId;
  const customerId = lifecycleHistoryItem.lifecycleIdentity?.customerId || lifecycleHistoryItem.customerId;
  const productId = lifecycleHistoryItem.lifecycleIdentity?.productId || lifecycleHistoryItem.productId;

  const hasValidCorrelation = Boolean(
    activityId ||
    paymentAttemptId ||
    (itemMerchantId && customerId && productId)
  );

  const currentState = lifecycleHistoryItem.currentState || 'UNKNOWN';
  const closureStatus = lifecycleHistoryItem.closureStatus || 'OPEN';
  const recoveryOutcome = lifecycleHistoryItem.recoveryOutcome || 'UNRESOLVED';
  const isTerminal = Boolean(lifecycleHistoryItem.terminal);
  const operatorReviewRequired = Boolean(lifecycleHistoryItem.operatorReviewRequired);

  const retryCount = Number(lifecycleHistoryItem.finalRetryCount ?? lifecycleHistoryItem.retryCount ?? 0);
  const maxRetryLimit = Number(lifecycleHistoryItem.maxRetryLimit ?? 1);

  const transitions = Array.isArray(lifecycleHistoryItem.transitions) ? lifecycleHistoryItem.transitions : [];
  const inconsistencies = Array.isArray(lifecycleHistoryItem.inconsistencies) ? lifecycleHistoryItem.inconsistencies : [];

  let hasAnomaly = false;
  let anomalySeverity = 'NONE';
  let primaryAnomalyCategory = 'NONE';
  let originatingLayer = 'NONE';
  let summary = 'Lifecycle operating normally without governance anomalies.';
  const evidence = [];
  const resolutionOptions = [];

  // Anomaly Rule 1: CORRELATION_UNRESOLVED
  if (!hasValidCorrelation) {
    hasAnomaly = true;
    anomalySeverity = 'HIGH';
    primaryAnomalyCategory = 'CORRELATION_UNRESOLVED';
    originatingLayer = 'DETECTION';
    summary = 'Correlation identity hierarchy is unresolved for this recovery lifecycle.';

    evidence.push({
      category: 'RECORDED_FACT',
      label: 'Case Identifier',
      value: String(caseId),
      sourceField: 'caseId'
    });
    evidence.push({
      category: 'UNAVAILABLE',
      label: 'Correlation Identity Hierarchy',
      value: 'NOT_RECORDED',
      reason: 'Required correlation identity (activityId, paymentAttemptId, or customer+product pair) was not recorded.'
    });

    resolutionOptions.push({
      optionId: 'RES_RECONCILE_STATE',
      label: 'Proposed Operator Action — Request Manual State Reconciliation',
      actionType: 'MANUAL_RECONCILIATION_REVIEW',
      recommended: true,
      policyCompliant: false,
      requiresExplicitOperatorAction: true,
      description: 'Propose manual reconciliation review due to unlinked correlation identity.',
      governancePayload: {
        proposedNextState: 'OPERATOR_REVIEW',
        transitionType: 'PROPOSED_OPERATOR_ACTION'
      }
    });
  }
  // Anomaly Rule 2: AUTHORITATIVE_STATE_CONFLICT
  else if (
    (isTerminal && closureStatus === 'OPEN') ||
    (currentState === 'RECOVERED' && recoveryOutcome === 'FAILED') ||
    (currentState === 'BLOCKED' && recoveryOutcome === 'RECOVERED')
  ) {
    hasAnomaly = true;
    anomalySeverity = 'CRITICAL';
    primaryAnomalyCategory = 'AUTHORITATIVE_STATE_CONFLICT';
    originatingLayer = 'FINALIZATION';
    summary = `Authoritative state conflict detected: State '${currentState}' disagrees with outcome '${recoveryOutcome}' and closure status '${closureStatus}'.`;

    evidence.push({
      category: 'RECORDED_FACT',
      label: 'Current Canonical State',
      value: String(currentState),
      sourceField: 'currentState'
    });
    evidence.push({
      category: 'RECORDED_FACT',
      label: 'Authoritative Recovery Outcome',
      value: String(recoveryOutcome),
      sourceField: 'recoveryOutcome'
    });
    evidence.push({
      category: 'DETERMINISTIC_DERIVATION',
      label: 'State Consistency Check',
      value: 'STATE_OUTCOME_CONFLICT',
      sourceRule: 'RULE_AUTHORITATIVE_STATE_CONSISTENCY'
    });

    resolutionOptions.push({
      optionId: 'RES_RECONCILE_STATE',
      label: 'Proposed Operator Action — Request Manual State Reconciliation',
      actionType: 'MANUAL_RECONCILIATION_REVIEW',
      recommended: true,
      policyCompliant: true,
      requiresExplicitOperatorAction: true,
      description: 'Propose manual state alignment for operator evaluation.',
      governancePayload: {
        proposedNextState: 'OPERATOR_REVIEW',
        transitionType: 'PROPOSED_OPERATOR_ACTION'
      }
    });
  }
  // Anomaly Rule 3: RECONCILIATION_INCONSISTENT
  else if (
    inconsistencies.length > 0 ||
    transitions.some(t => t.transitionType === 'INVALID' || t.reason?.includes('inconsistent'))
  ) {
    hasAnomaly = true;
    anomalySeverity = 'HIGH';
    primaryAnomalyCategory = 'RECONCILIATION_INCONSISTENT';
    originatingLayer = 'RECONCILIATION';
    summary = 'Execution outcome disagrees with backend recovery event telemetry.';

    evidence.push({
      category: 'RECORDED_FACT',
      label: 'Inconsistency Count',
      value: String(inconsistencies.length || 1),
      sourceField: 'inconsistencies'
    });
    if (inconsistencies[0]?.description) {
      evidence.push({
        category: 'RECORDED_FACT',
        label: 'Recorded Inconsistency',
        value: String(inconsistencies[0].description),
        sourceField: 'inconsistencies[0].description'
      });
    }
    evidence.push({
      category: 'DETERMINISTIC_DERIVATION',
      label: 'Reconciliation Audit Rule',
      value: 'OUTCOME_MISMATCH',
      sourceRule: 'RULE_RECONCILIATION_AUDIT'
    });

    resolutionOptions.push({
      optionId: 'RES_RECONCILE_STATE',
      label: 'Proposed Operator Action — Request Manual State Reconciliation',
      actionType: 'MANUAL_RECONCILIATION_REVIEW',
      recommended: true,
      policyCompliant: true,
      requiresExplicitOperatorAction: true,
      description: 'Propose operator review to reconcile execution and backend event disagreement.',
      governancePayload: {
        proposedNextState: 'OPERATOR_REVIEW',
        transitionType: 'PROPOSED_OPERATOR_ACTION'
      }
    });
  }
  // Anomaly Rule 4: RETRY_LIMIT_EXCEEDED
  else if (retryCount >= maxRetryLimit && currentState !== 'RECOVERED') {
    hasAnomaly = true;
    anomalySeverity = 'HIGH';
    primaryAnomalyCategory = 'RETRY_LIMIT_EXCEEDED';
    originatingLayer = 'POLICY_GOVERNANCE';
    summary = `Payment failure reached maximum configured retry limit (${retryCount}/${maxRetryLimit}). Autonomous retry is halted.`;

    evidence.push({
      category: 'RECORDED_FACT',
      label: 'Recorded Retry Count',
      value: String(retryCount),
      sourceField: 'retryCount'
    });
    evidence.push({
      category: 'RECORDED_FACT',
      label: 'Configured Max Retry Limit',
      value: String(maxRetryLimit),
      sourceField: 'maxRetryLimit'
    });
    evidence.push({
      category: 'DETERMINISTIC_DERIVATION',
      label: 'Retry Limit Gate Rule',
      value: `retryCount >= maxRetryLimit (${retryCount} >= ${maxRetryLimit})`,
      sourceRule: 'RULE_MAX_RETRY_LIMIT'
    });
    evidence.push({
      category: 'UNAVAILABLE',
      label: 'Historical Operator Override Notes',
      value: 'NOT_RECORDED',
      reason: 'No manual operator retry override notes recorded in historical telemetry.'
    });

    resolutionOptions.push({
      optionId: 'RES_CONFIRM_BLOCKED',
      label: 'Confirm Terminal Block',
      actionType: 'CONFIRM_TERMINAL_BLOCK',
      recommended: true,
      policyCompliant: true,
      requiresExplicitOperatorAction: true,
      description: 'Confirm lifecycle remains terminal blocked due to retry limit exhaustion.',
      governancePayload: {
        proposedNextState: 'BLOCKED',
        transitionType: 'TERMINAL_BLOCKED'
      }
    });

    resolutionOptions.push({
      optionId: 'RES_MANUAL_RETRY',
      label: 'Proposed Operator Action — Authorize Manual Retry Proposal',
      actionType: 'AUTHORIZE_MANUAL_RETRY',
      recommended: false,
      policyCompliant: false,
      requiresExplicitOperatorAction: true,
      description: 'Propose manual retry override for explicit operator review (policy non-compliant without explicit override).',
      governancePayload: {
        proposedNextState: 'EXECUTING',
        transitionType: 'PROPOSED_OPERATOR_ACTION'
      }
    });
  }
  // Anomaly Rule 5: OPERATOR_REVIEW_REQUIRED
  else if (operatorReviewRequired || currentState === 'UNRESOLVED') {
    hasAnomaly = true;
    anomalySeverity = 'WARNING';
    primaryAnomalyCategory = 'OPERATOR_REVIEW_REQUIRED';
    originatingLayer = 'POLICY_GOVERNANCE';
    summary = 'Human operator review is required to evaluate lifecycle status.';

    evidence.push({
      category: 'RECORDED_FACT',
      label: 'Operator Review Required Flag',
      value: 'true',
      sourceField: 'operatorReviewRequired'
    });
    evidence.push({
      category: 'DETERMINISTIC_DERIVATION',
      label: 'Governance Intervention Rule',
      value: 'REVIEW_REQUIRED',
      sourceRule: 'RULE_POLICY_GOVERNANCE'
    });
    evidence.push({
      category: 'UNAVAILABLE',
      label: 'Operator Resolution Notes',
      value: 'NOT_RECORDED',
      reason: 'No operator intervention notes logged yet.'
    });

    resolutionOptions.push({
      optionId: 'RES_MANUAL_RETRY',
      label: 'Proposed Operator Action — Authorize Manual Retry Proposal',
      actionType: 'AUTHORIZE_MANUAL_RETRY',
      recommended: true,
      policyCompliant: true,
      requiresExplicitOperatorAction: true,
      description: 'Propose manual retry action for operator review.',
      governancePayload: {
        proposedNextState: 'EXECUTING',
        transitionType: 'PROPOSED_OPERATOR_ACTION'
      }
    });

    resolutionOptions.push({
      optionId: 'RES_CONFIRM_BLOCKED',
      label: 'Confirm Terminal Block',
      actionType: 'CONFIRM_TERMINAL_BLOCK',
      recommended: false,
      policyCompliant: true,
      requiresExplicitOperatorAction: true,
      description: 'Propose confirming lifecycle closure as terminal blocked.',
      governancePayload: {
        proposedNextState: 'BLOCKED',
        transitionType: 'TERMINAL_BLOCKED'
      }
    });
  }
  // Rule 6: CLEAN / NO ANOMALY
  else {
    hasAnomaly = false;
    anomalySeverity = 'NONE';
    primaryAnomalyCategory = 'NONE';
    originatingLayer = 'NONE';
    summary = 'Lifecycle operating normally without governance anomalies.';

    evidence.push({
      category: 'RECORDED_FACT',
      label: 'Current Canonical State',
      value: String(currentState),
      sourceField: 'currentState'
    });
    evidence.push({
      category: 'DETERMINISTIC_DERIVATION',
      label: 'Governance Health Rule',
      value: 'HEALTHY',
      sourceRule: 'RULE_HEALTHY_LIFECYCLE'
    });

    resolutionOptions.push({
      optionId: 'RES_NONE',
      label: 'No Action Required',
      actionType: 'NO_ACTION_REQUIRED',
      recommended: true,
      policyCompliant: true,
      requiresExplicitOperatorAction: false,
      description: 'Lifecycle is in a clean state.',
      governancePayload: {
        proposedNextState: currentState,
        transitionType: 'VALID'
      }
    });
  }

  // Preserve Terminal Protection: Mark EXECUTING proposals non-policy-compliant if lifecycle is terminal
  if (isTerminal) {
    for (let i = 0; i < resolutionOptions.length; i++) {
      if (resolutionOptions[i].governancePayload?.proposedNextState === 'EXECUTING') {
        resolutionOptions[i].policyCompliant = false;
        resolutionOptions[i].description += ' (Note: Lifecycle is terminal; reopening prohibited by M10.7 terminal protection).';
      }
    }
  }

  return {
    valid: true,
    lifecycleId: caseId,
    merchantId: itemMerchantId || currentMerchantId || 'UNKNOWN',
    evaluatedState: currentState,
    evaluatedRetryCount: retryCount,
    hasAnomaly,
    anomalySeverity,
    primaryAnomalyCategory,
    rootCause: {
      originatingLayer,
      summary,
      evidence
    },
    resolutionOptions,
    schemaVersion: '1.0.0'
  };
}

// Milestone 10.12 — Canonical Authorization Status Vocabulary
export const AUTH_STATUS_AUTHORIZED = 'AUTHORIZED';
export const AUTH_STATUS_REJECTED = 'REJECTED';
export const AUTH_STATUS_POLICY_BLOCKED = 'POLICY_BLOCKED';
export const AUTH_STATUS_STALE_CONTEXT = 'STALE_CONTEXT';
export const AUTH_STATUS_INVALID_CONTEXT = 'INVALID_CONTEXT';

// Milestone 10.12 — Canonical Authorization Reason Vocabulary
export const AUTH_REASON_APPROVED_BY_OPERATOR = 'APPROVED_BY_OPERATOR';
export const AUTH_REASON_TERMINAL_PROTECTION_BLOCKED = 'TERMINAL_PROTECTION_BLOCKED';
export const AUTH_REASON_OPERATOR_EXPLICIT_REJECT = 'OPERATOR_EXPLICIT_REJECT';
export const AUTH_REASON_MERCHANT_ISOLATION_MISMATCH = 'MERCHANT_ISOLATION_MISMATCH';
export const AUTH_REASON_MAX_RETRY_LIMIT_EXCEEDED = 'MAX_RETRY_LIMIT_EXCEEDED';
export const AUTH_REASON_POLICY_RULE_BLOCK = 'POLICY_RULE_BLOCK';
export const AUTH_REASON_STATE_TRANSITION_DISALLOWED = 'STATE_TRANSITION_DISALLOWED';
export const AUTH_REASON_OBSOLETE_LIFECYCLE_STATE = 'OBSOLETE_LIFECYCLE_STATE';
export const AUTH_REASON_INCOMPLETE_IDENTITY_CONTEXT = 'INCOMPLETE_IDENTITY_CONTEXT';
export const AUTH_REASON_PROPOSAL_NOT_FOUND = 'PROPOSAL_NOT_FOUND';
export const AUTH_REASON_CLEAN_LIFECYCLE_NO_ACTION = 'CLEAN_LIFECYCLE_NO_ACTION';

/**
 * Milestone 10.12 — Governed Operator Resolution Authorization & Proposal Approval Engine.
 * Pure deterministic authorization evaluation layer that evaluates whether an explicitly selected
 * M10.11 resolution proposal may be authorized.
 * 
 * STRICT BOUNDARIES & INVARIANTS:
 * - Pure, deterministic, side-effect free function.
 * - 0 API calls, 0 DB writes, 0 storage writes, 0 lifecycle state mutations.
 * - Observational ONLY — does NOT execute retries, trigger payments, or dispatch calls.
 * - Authorization evaluation != Authoritative Security Enforcement.
 * - Strictly merchant-isolated and terminal-state protected.
 * - Canonical 5-Status Vocabulary: AUTHORIZED, REJECTED, POLICY_BLOCKED, STALE_CONTEXT, INVALID_CONTEXT.
 * - Canonical 11-Reason Vocabulary: APPROVED_BY_OPERATOR, TERMINAL_PROTECTION_BLOCKED, OPERATOR_EXPLICIT_REJECT,
 *   MERCHANT_ISOLATION_MISMATCH, MAX_RETRY_LIMIT_EXCEEDED, POLICY_RULE_BLOCK, STATE_TRANSITION_DISALLOWED,
 *   OBSOLETE_LIFECYCLE_STATE, INCOMPLETE_IDENTITY_CONTEXT, PROPOSAL_NOT_FOUND, CLEAN_LIFECYCLE_NO_ACTION.
 * 
 * @param {Object|null} anomalyDiagnostic - Diagnostic output from buildRecoveryLifecycleAnomalyDiagnostic
 * @param {Object|null} lifecycleHistoryItem - Aggregated lifecycle history item from buildRecoveryLifecycleHistory
 * @param {string|null} selectedOptionId - Selected proposal option identifier (e.g. 'RES_MANUAL_RETRY')
 * @param {string|null} operatorDecision - Explicit decision ('APPROVE' or 'REJECT')
 * @param {Object|null} operatorContext - Operator context ({ currentMerchantId, operatorActor, operatorRole })
 * @param {Object|null} policyConfig - Policy configuration rules/limits
 * @returns {Object} Structured proposal authorization evaluation contract
 */
export function buildRecoveryLifecycleProposalAuthorization(
  anomalyDiagnostic = null,
  lifecycleHistoryItem = null,
  selectedOptionId = null,
  operatorDecision = null,
  operatorContext = null,
  policyConfig = null
) {
  const timestamp = new Date().toISOString();

  // Extract identities (preserving safe null / unavailable semantics, NO fabricated values like 'prod_demo')
  const caseId = lifecycleHistoryItem?.lifecycleIdentity?.caseId || lifecycleHistoryItem?.caseId || anomalyDiagnostic?.lifecycleId || null;
  const merchantId = lifecycleHistoryItem?.merchantId || lifecycleHistoryItem?.lifecycleIdentity?.merchantId || anomalyDiagnostic?.merchantId || null;
  const customerId = lifecycleHistoryItem?.lifecycleIdentity?.customerId || lifecycleHistoryItem?.customerId || null;
  const rawProductId = lifecycleHistoryItem?.lifecycleIdentity?.productId || lifecycleHistoryItem?.productId || anomalyDiagnostic?.productId || null;
  const productId = (rawProductId && rawProductId !== 'Product' && rawProductId !== 'UNKNOWN' && rawProductId !== 'NOT_RECORDED') ? rawProductId : null;

  const opCtx = operatorContext || {};
  const currentMerchantId = opCtx.currentMerchantId || null;
  const operatorActor = opCtx.operatorActor || null;
  const operatorRole = opCtx.operatorRole || null;

  // Gate 1: Null/Invalid inputs or missing identity context
  if (!anomalyDiagnostic || typeof anomalyDiagnostic !== 'object' || !lifecycleHistoryItem || typeof lifecycleHistoryItem !== 'object') {
    const auditEvent = {
      eventId: `auth_audit_${caseId || 'unknown'}_${Date.now()}`,
      eventType: 'PROPOSAL_AUTHORIZATION_EVALUATION',
      timestamp,
      merchantId,
      caseId,
      customerId,
      productId,
      selectedOptionId: selectedOptionId || null,
      operatorActor,
      operatorRole,
      evaluatedLifecycleState: 'UNKNOWN',
      authorizationStatus: AUTH_STATUS_INVALID_CONTEXT,
      authorizationReason: AUTH_REASON_INCOMPLETE_IDENTITY_CONTEXT,
      isAuthorized: false,
      schemaVersion: '1.0.0'
    };

    return {
      valid: false,
      proposalAuthorization: {
        merchantId,
        caseId,
        customerId,
        productId,
        lifecycleIdentity: lifecycleHistoryItem?.lifecycleIdentity || null,
        proposalIdentity: {
          optionId: selectedOptionId || null,
          actionType: null,
          recommended: false,
          policyCompliant: false
        },
        operatorContext: {
          currentMerchantId,
          operatorActor,
          operatorRole
        },
        evaluatedLifecycleState: 'UNKNOWN',
        evaluatedPolicyContext: policyConfig || null,
        transitionGovernance: null,
        stalenessEvaluation: {
          isStale: false,
          stateChanged: false,
          retryCountChanged: false,
          policyContextChanged: false,
          stalenessStatus: 'FRESH',
          reason: 'Insufficient evaluation context.',
          signalAvailability: 'UNAVAILABLE'
        },
        authorizationStatus: AUTH_STATUS_INVALID_CONTEXT,
        authorizationReason: AUTH_REASON_INCOMPLETE_IDENTITY_CONTEXT,
        isAuthorized: false,
        authorizedProposal: null,
        governancePayload: null,
        authorizationAuditEvent: auditEvent,
        schemaVersion: '1.0.0'
      }
    };
  }

  // Gate 2: Proposal Selection Check
  if (!selectedOptionId || typeof selectedOptionId !== 'string') {
    const auditEvent = {
      eventId: `auth_audit_${caseId || 'unknown'}_${Date.now()}`,
      eventType: 'PROPOSAL_AUTHORIZATION_EVALUATION',
      timestamp,
      merchantId,
      caseId,
      customerId,
      productId,
      selectedOptionId: null,
      operatorActor,
      operatorRole,
      evaluatedLifecycleState: lifecycleHistoryItem.currentState || 'UNKNOWN',
      authorizationStatus: AUTH_STATUS_INVALID_CONTEXT,
      authorizationReason: AUTH_REASON_PROPOSAL_NOT_FOUND,
      isAuthorized: false,
      schemaVersion: '1.0.0'
    };

    return {
      valid: false,
      proposalAuthorization: {
        merchantId,
        caseId,
        customerId,
        productId,
        lifecycleIdentity: lifecycleHistoryItem.lifecycleIdentity || null,
        proposalIdentity: {
          optionId: null,
          actionType: null,
          recommended: false,
          policyCompliant: false
        },
        operatorContext: {
          currentMerchantId,
          operatorActor,
          operatorRole
        },
        evaluatedLifecycleState: lifecycleHistoryItem.currentState || 'UNKNOWN',
        evaluatedPolicyContext: policyConfig || null,
        transitionGovernance: null,
        stalenessEvaluation: {
          isStale: false,
          stateChanged: false,
          retryCountChanged: false,
          policyContextChanged: false,
          stalenessStatus: 'FRESH',
          reason: 'No proposal option selected.',
          signalAvailability: 'AUTHORITATIVE_DATA_AVAILABLE'
        },
        authorizationStatus: AUTH_STATUS_INVALID_CONTEXT,
        authorizationReason: AUTH_REASON_PROPOSAL_NOT_FOUND,
        isAuthorized: false,
        authorizedProposal: null,
        governancePayload: null,
        authorizationAuditEvent: auditEvent,
        schemaVersion: '1.0.0'
      }
    };
  }

  // Gate 3: Merchant Isolation Check
  if (currentMerchantId && merchantId && merchantId !== 'UNKNOWN' && currentMerchantId !== merchantId) {
    const auditEvent = {
      eventId: `auth_audit_${caseId || 'unknown'}_${Date.now()}`,
      eventType: 'PROPOSAL_AUTHORIZATION_EVALUATION',
      timestamp,
      merchantId,
      caseId,
      customerId,
      productId,
      selectedOptionId,
      operatorActor,
      operatorRole,
      evaluatedLifecycleState: lifecycleHistoryItem.currentState || 'UNKNOWN',
      authorizationStatus: AUTH_STATUS_INVALID_CONTEXT,
      authorizationReason: AUTH_REASON_MERCHANT_ISOLATION_MISMATCH,
      isAuthorized: false,
      schemaVersion: '1.0.0'
    };

    return {
      valid: false,
      proposalAuthorization: {
        merchantId,
        caseId,
        customerId,
        productId,
        lifecycleIdentity: lifecycleHistoryItem.lifecycleIdentity || null,
        proposalIdentity: {
          optionId: selectedOptionId,
          actionType: null,
          recommended: false,
          policyCompliant: false
        },
        operatorContext: {
          currentMerchantId,
          operatorActor,
          operatorRole
        },
        evaluatedLifecycleState: lifecycleHistoryItem.currentState || 'UNKNOWN',
        evaluatedPolicyContext: policyConfig || null,
        transitionGovernance: null,
        stalenessEvaluation: {
          isStale: false,
          stateChanged: false,
          retryCountChanged: false,
          policyContextChanged: false,
          stalenessStatus: 'FRESH',
          reason: 'Cross-merchant proposal evaluation strictly prohibited.',
          signalAvailability: 'AUTHORITATIVE_DATA_AVAILABLE'
        },
        authorizationStatus: AUTH_STATUS_INVALID_CONTEXT,
        authorizationReason: AUTH_REASON_MERCHANT_ISOLATION_MISMATCH,
        isAuthorized: false,
        authorizedProposal: null,
        governancePayload: null,
        authorizationAuditEvent: auditEvent,
        schemaVersion: '1.0.0'
      }
    };
  }

  // Gate 4: Proposal Resolution Option Lookup in M10.11 Anomaly Diagnostic
  const options = Array.isArray(anomalyDiagnostic.resolutionOptions) ? anomalyDiagnostic.resolutionOptions : [];
  const selectedOption = options.find(opt => opt.optionId === selectedOptionId) || null;

  if (!selectedOption) {
    const auditEvent = {
      eventId: `auth_audit_${caseId || 'unknown'}_${Date.now()}`,
      eventType: 'PROPOSAL_AUTHORIZATION_EVALUATION',
      timestamp,
      merchantId,
      caseId,
      customerId,
      productId,
      selectedOptionId,
      operatorActor,
      operatorRole,
      evaluatedLifecycleState: lifecycleHistoryItem.currentState || 'UNKNOWN',
      authorizationStatus: AUTH_STATUS_INVALID_CONTEXT,
      authorizationReason: AUTH_REASON_PROPOSAL_NOT_FOUND,
      isAuthorized: false,
      schemaVersion: '1.0.0'
    };

    return {
      valid: true,
      proposalAuthorization: {
        merchantId,
        caseId,
        customerId,
        productId,
        lifecycleIdentity: lifecycleHistoryItem.lifecycleIdentity || null,
        proposalIdentity: {
          optionId: selectedOptionId,
          actionType: null,
          recommended: false,
          policyCompliant: false
        },
        operatorContext: {
          currentMerchantId,
          operatorActor,
          operatorRole
        },
        evaluatedLifecycleState: lifecycleHistoryItem.currentState || 'UNKNOWN',
        evaluatedPolicyContext: policyConfig || null,
        transitionGovernance: null,
        stalenessEvaluation: {
          isStale: false,
          stateChanged: false,
          retryCountChanged: false,
          policyContextChanged: false,
          stalenessStatus: 'FRESH',
          reason: 'Proposal not found in diagnostic resolution options.',
          signalAvailability: 'AUTHORITATIVE_DATA_AVAILABLE'
        },
        authorizationStatus: AUTH_STATUS_INVALID_CONTEXT,
        authorizationReason: AUTH_REASON_PROPOSAL_NOT_FOUND,
        isAuthorized: false,
        authorizedProposal: null,
        governancePayload: null,
        authorizationAuditEvent: auditEvent,
        schemaVersion: '1.0.0'
      }
    };
  }

  // Gate 5: Explicit Operator Decision Check
  const isApprovedByOperator = operatorDecision === 'APPROVE';
  const isExplicitReject = operatorDecision === 'REJECT';

  // Gate 6: Staleness Model Evaluation
  const currentState = lifecycleHistoryItem.currentState || 'UNKNOWN';
  const evalState = anomalyDiagnostic.evaluatedState || anomalyDiagnostic.rootCause?.evidence?.find(e => e.sourceField === 'currentState')?.value || null;

  const currentRetryCount = Number(lifecycleHistoryItem.finalRetryCount ?? lifecycleHistoryItem.retryCount ?? 0);
  const evalRetryCount = anomalyDiagnostic.evaluatedRetryCount !== undefined && anomalyDiagnostic.evaluatedRetryCount !== null
    ? Number(anomalyDiagnostic.evaluatedRetryCount)
    : Number(anomalyDiagnostic.rootCause?.evidence?.find(e => e.sourceField === 'retryCount')?.value ?? currentRetryCount);

  const stateChanged = Boolean(evalState && currentState && evalState !== currentState);
  const retryCountChanged = Boolean(!isNaN(evalRetryCount) && evalRetryCount !== currentRetryCount);
  const policyContextChanged = Boolean(policyConfig?.stale === true);

  const isStale = stateChanged || retryCountChanged || policyContextChanged;

  const stalenessEvaluation = {
    isStale,
    stateChanged,
    retryCountChanged,
    policyContextChanged,
    stalenessStatus: isStale ? 'STALE' : 'FRESH',
    reason: isStale ? 'Evaluated lifecycle context is obsolete.' : 'Context is fresh and up-to-date.',
    signalAvailability: 'AUTHORITATIVE_DATA_AVAILABLE'
  };

  const proposedNextState = selectedOption.governancePayload?.proposedNextState || currentState;
  const isTerminal = Boolean(lifecycleHistoryItem.terminal || currentState === 'RECOVERED' || currentState === 'BLOCKED');

  // M10.8 Transition Governance Check
  const transitionGovernance = evaluateRecoveryLifecycleTransition(currentState, proposedNextState, {
    merchantId: currentMerchantId || merchantId,
    caseId,
    customerId,
    productId,
    terminal: isTerminal
  });

  // Evaluate final status & reason deterministically
  let authorizationStatus = AUTH_STATUS_REJECTED;
  let authorizationReason = AUTH_REASON_OPERATOR_EXPLICIT_REJECT;

  if (isExplicitReject || !operatorDecision) {
    authorizationStatus = AUTH_STATUS_REJECTED;
    authorizationReason = AUTH_REASON_OPERATOR_EXPLICIT_REJECT;
  } else if (isStale) {
    authorizationStatus = AUTH_STATUS_STALE_CONTEXT;
    authorizationReason = AUTH_REASON_OBSOLETE_LIFECYCLE_STATE;
  } else if (selectedOption.optionId === 'RES_NONE' || selectedOption.actionType === 'NO_ACTION_REQUIRED') {
    authorizationStatus = AUTH_STATUS_AUTHORIZED;
    authorizationReason = AUTH_REASON_CLEAN_LIFECYCLE_NO_ACTION;
  } else if (isTerminal && proposedNextState !== currentState && (proposedNextState === 'EXECUTING' || proposedNextState === 'PENDING' || proposedNextState === 'OPEN' || proposedNextState === 'UNRESOLVED')) {
    authorizationStatus = AUTH_STATUS_REJECTED;
    authorizationReason = AUTH_REASON_TERMINAL_PROTECTION_BLOCKED;
  } else if (!transitionGovernance.allowed) {
    authorizationStatus = AUTH_STATUS_REJECTED;
    authorizationReason = AUTH_REASON_STATE_TRANSITION_DISALLOWED;
  } else if (proposedNextState === 'EXECUTING' && currentRetryCount >= Number(lifecycleHistoryItem.maxRetryLimit ?? 1) && !selectedOption.policyCompliant && policyConfig?.allowRetryLimitExceededOverride !== true) {
    authorizationStatus = AUTH_STATUS_POLICY_BLOCKED;
    authorizationReason = AUTH_REASON_MAX_RETRY_LIMIT_EXCEEDED;
  } else if (!selectedOption.policyCompliant && policyConfig?.allowNonCompliantOverride !== true) {
    authorizationStatus = AUTH_STATUS_POLICY_BLOCKED;
    authorizationReason = AUTH_REASON_POLICY_RULE_BLOCK;
  } else if (policyConfig?.requireRoleVerification && (!operatorRole || operatorRole === 'UNAVAILABLE')) {
    authorizationStatus = AUTH_STATUS_POLICY_BLOCKED;
    authorizationReason = AUTH_REASON_POLICY_RULE_BLOCK;
  } else if (isApprovedByOperator) {
    authorizationStatus = AUTH_STATUS_AUTHORIZED;
    authorizationReason = AUTH_REASON_APPROVED_BY_OPERATOR;
  }

  const isAuthorized = authorizationStatus === AUTH_STATUS_AUTHORIZED;

  const auditEvent = {
    eventId: `auth_audit_${caseId || 'unknown'}_${Date.now()}`,
    eventType: 'PROPOSAL_AUTHORIZATION_EVALUATION',
    timestamp,
    merchantId,
    caseId,
    customerId,
    productId,
    selectedOptionId,
    operatorActor,
    operatorRole,
    evaluatedLifecycleState: currentState,
    authorizationStatus,
    authorizationReason,
    isAuthorized,
    schemaVersion: '1.0.0'
  };

  const governancePayload = isAuthorized ? {
    proposedNextState,
    transitionType: selectedOption.governancePayload?.transitionType || 'PROPOSED_OPERATOR_ACTION',
    requiresAuthoritativeRevalidation: true
  } : null;

  return {
    valid: true,
    proposalAuthorization: {
      merchantId,
      caseId,
      customerId,
      productId,
      lifecycleIdentity: lifecycleHistoryItem.lifecycleIdentity || { caseId, merchantId, customerId, productId },
      proposalIdentity: {
        optionId: selectedOptionId,
        actionType: selectedOption.actionType || null,
        recommended: Boolean(selectedOption.recommended),
        policyCompliant: Boolean(selectedOption.policyCompliant)
      },
      operatorContext: {
        currentMerchantId: currentMerchantId || merchantId || null,
        operatorActor: operatorActor || null,
        operatorRole: operatorRole || null
      },
      evaluatedLifecycleState: currentState,
      evaluatedRetryCount: currentRetryCount,
      evaluatedPolicyContext: policyConfig || null,
      transitionGovernance,
      stalenessEvaluation,
      authorizationStatus,
      authorizationReason,
      isAuthorized,
      authorizedProposal: isAuthorized ? selectedOption : null,
      governancePayload,
      authorizationAuditEvent: auditEvent,
      schemaVersion: '1.0.0'
    }
  };
}

export const buildProposalAuthorization = buildRecoveryLifecycleProposalAuthorization;

// Milestone 10.13 — Canonical Execution Handoff Status Vocabulary
export const HANDOFF_STATUS_EXECUTED = 'EXECUTED';
export const HANDOFF_STATUS_REVALIDATION_FAILED = 'REVALIDATION_FAILED';
export const HANDOFF_STATUS_STALE_BLOCKED = 'STALE_BLOCKED';
export const HANDOFF_STATUS_LOCK_FAILED = 'LOCK_FAILED';
export const HANDOFF_STATUS_DISPATCH_ERROR = 'DISPATCH_ERROR';

/**
 * Milestone 10.13 — Governed Execution Handoff & Authorization Re-Validation Engine (Pure Deterministic Portion).
 * Independently re-validates an M10.12 proposal authorization contract at the execution boundary immediately
 * prior to dispatch.
 * 
 * STRICT BOUNDARIES & INVARIANTS:
 * - Pure, deterministic, side-effect free function (0 API calls, 0 DB writes, 0 storage writes).
 * - Observational ONLY — does NOT trigger payments or dispatch backend API requests.
 * - Does NOT trust frontend isAuthorized=true without independent re-validation.
 * - Evaluates M10.12 status, staleness, merchant isolation, terminal protection, identity binding, and M10.8 transition rules.
 * 
 * @param {Object|null} proposalAuthorizationInput - Output contract from buildRecoveryLifecycleProposalAuthorization
 * @param {Object|null} lifecycleHistoryItem - Current authoritative lifecycle history item
 * @param {Object|null} operatorContext - Operator context ({ currentMerchantId, operatorActor, operatorRole })
 * @param {Object|null} policyConfig - Policy configuration rules/limits
 * @returns {Object} Structured execution handoff re-validation contract
 */
export function buildRecoveryLifecycleExecutionHandoff(
  proposalAuthorizationInput = null,
  lifecycleHistoryItem = null,
  operatorContext = null,
  policyConfig = null
) {
  const timestamp = new Date().toISOString();

  // Extract proposal authorization contract
  const authContract = proposalAuthorizationInput?.proposalAuthorization || proposalAuthorizationInput;
  
  const opCtx = operatorContext || authContract?.operatorContext || {};
  const currentMerchantId = opCtx.currentMerchantId || null;
  const operatorActor = (opCtx.operatorActor !== undefined) ? opCtx.operatorActor : (authContract?.operatorContext?.operatorActor || null);
  const operatorRole = (opCtx.operatorRole !== undefined) ? opCtx.operatorRole : (authContract?.operatorContext?.operatorRole || null);

  // Extract identity context
  const caseId = lifecycleHistoryItem?.lifecycleIdentity?.caseId || lifecycleHistoryItem?.caseId || authContract?.caseId || null;
  const historyMerchantId = lifecycleHistoryItem?.merchantId || lifecycleHistoryItem?.lifecycleIdentity?.merchantId || null;
  const authMerchantId = authContract?.merchantId || authContract?.lifecycleIdentity?.merchantId || null;
  const opMerchantId = currentMerchantId || null;
  const merchantId = historyMerchantId || authMerchantId || opMerchantId || null;
  const customerId = lifecycleHistoryItem?.lifecycleIdentity?.customerId || lifecycleHistoryItem?.customerId || authContract?.customerId || null;
  const rawProductId = lifecycleHistoryItem?.lifecycleIdentity?.productId || lifecycleHistoryItem?.productId || null;
  const productId = (rawProductId && rawProductId !== 'Product' && rawProductId !== 'UNKNOWN' && rawProductId !== 'NOT_RECORDED') ? rawProductId : null;

  const proposalIdentity = authContract?.proposalIdentity || {
    optionId: null,
    actionType: null,
    recommended: false,
    policyCompliant: false
  };

  const auditEvent = {
    eventId: `handoff_audit_${caseId || 'unknown'}_${Date.now()}`,
    eventType: AUDIT_EVENT_TRANSITION_EVALUATED,
    timestamp,
    merchantId,
    caseId,
    customerId,
    productId,
    proposalOptionId: proposalIdentity.optionId || null,
    operatorActor,
    operatorRole,
    evaluatedLifecycleState: lifecycleHistoryItem?.currentState || 'UNKNOWN',
    schemaVersion: '1.0.0'
  };

  // Gate 1: Check input presence & identity completeness
  if (!authContract || typeof authContract !== 'object' || !lifecycleHistoryItem || typeof lifecycleHistoryItem !== 'object') {
    return {
      valid: false,
      handoffStatus: HANDOFF_STATUS_REVALIDATION_FAILED,
      revalidationStatus: {
        isAuthorized: false,
        revalidated: false,
        authorizationStatus: authContract?.authorizationStatus || AUTH_STATUS_INVALID_CONTEXT,
        authorizationReason: AUTH_REASON_INCOMPLETE_IDENTITY_CONTEXT,
        stalenessEvaluation: { isStale: false, reason: 'Insufficient re-validation context.' }
      },
      executionLockStatus: { lockAcquired: false, candidateKey: null },
      proposalIdentity,
      dispatchResult: null,
      executionAuditEvent: { ...auditEvent, handoffStatus: HANDOFF_STATUS_REVALIDATION_FAILED, reason: AUTH_REASON_INCOMPLETE_IDENTITY_CONTEXT },
      requiresReconciliation: true,
      schemaVersion: '1.0.0'
    };
  }

  // Gate 2: Proposal Identity Check
  if (!proposalIdentity.optionId) {
    return {
      valid: false,
      handoffStatus: HANDOFF_STATUS_REVALIDATION_FAILED,
      revalidationStatus: {
        isAuthorized: false,
        revalidated: false,
        authorizationStatus: AUTH_STATUS_INVALID_CONTEXT,
        authorizationReason: AUTH_REASON_PROPOSAL_NOT_FOUND,
        stalenessEvaluation: { isStale: false, reason: 'Missing proposal identity.' }
      },
      executionLockStatus: { lockAcquired: false, candidateKey: getCandidateIdentity(lifecycleHistoryItem) },
      proposalIdentity,
      dispatchResult: null,
      executionAuditEvent: { ...auditEvent, handoffStatus: HANDOFF_STATUS_REVALIDATION_FAILED, reason: AUTH_REASON_PROPOSAL_NOT_FOUND },
      requiresReconciliation: true,
      schemaVersion: '1.0.0'
    };
  }

  // Gate 3: M10.12 Authorization Status Check
  if (authContract.authorizationStatus !== AUTH_STATUS_AUTHORIZED || authContract.isAuthorized !== true) {
    let handoffStatus = HANDOFF_STATUS_REVALIDATION_FAILED;
    if (authContract.authorizationStatus === AUTH_STATUS_STALE_CONTEXT) {
      handoffStatus = HANDOFF_STATUS_STALE_BLOCKED;
    }

    return {
      valid: false,
      handoffStatus,
      revalidationStatus: {
        isAuthorized: false,
        revalidated: false,
        authorizationStatus: authContract.authorizationStatus || AUTH_STATUS_REJECTED,
        authorizationReason: authContract.authorizationReason || AUTH_REASON_OPERATOR_EXPLICIT_REJECT,
        stalenessEvaluation: authContract.stalenessEvaluation || { isStale: false, reason: 'Authorization not granted.' }
      },
      executionLockStatus: { lockAcquired: false, candidateKey: getCandidateIdentity(lifecycleHistoryItem) },
      proposalIdentity,
      dispatchResult: null,
      executionAuditEvent: { ...auditEvent, handoffStatus, reason: authContract.authorizationReason || 'Authorization not granted' },
      requiresReconciliation: true,
      schemaVersion: '1.0.0'
    };
  }

  // Gate 4: Merchant Isolation Re-Validation
  const hasMerchantMismatch = !historyMerchantId || !authMerchantId ||
    (opMerchantId && opMerchantId !== 'UNKNOWN' && opMerchantId !== historyMerchantId) ||
    (opMerchantId && opMerchantId !== 'UNKNOWN' && opMerchantId !== authMerchantId) ||
    (historyMerchantId !== 'UNKNOWN' && authMerchantId !== 'UNKNOWN' && historyMerchantId !== authMerchantId);

  if (hasMerchantMismatch) {
    return {
      valid: false,
      handoffStatus: HANDOFF_STATUS_REVALIDATION_FAILED,
      revalidationStatus: {
        isAuthorized: false,
        revalidated: false,
        authorizationStatus: AUTH_STATUS_INVALID_CONTEXT,
        authorizationReason: AUTH_REASON_MERCHANT_ISOLATION_MISMATCH,
        stalenessEvaluation: { isStale: false, reason: 'Merchant isolation check failed at execution boundary.' }
      },
      executionLockStatus: { lockAcquired: false, candidateKey: getCandidateIdentity(lifecycleHistoryItem) },
      proposalIdentity,
      dispatchResult: null,
      executionAuditEvent: { ...auditEvent, handoffStatus: HANDOFF_STATUS_REVALIDATION_FAILED, reason: AUTH_REASON_MERCHANT_ISOLATION_MISMATCH },
      requiresReconciliation: true,
      schemaVersion: '1.0.0'
    };
  }

  // Gate 5: Proposal & Lifecycle Identity Consistency Re-Validation
  const authCaseId = authContract.caseId || authContract.lifecycleIdentity?.caseId;
  if (authCaseId && caseId && authCaseId !== caseId) {
    return {
      valid: false,
      handoffStatus: HANDOFF_STATUS_REVALIDATION_FAILED,
      revalidationStatus: {
        isAuthorized: false,
        revalidated: false,
        authorizationStatus: AUTH_STATUS_INVALID_CONTEXT,
        authorizationReason: 'PROPOSAL_IDENTITY_MISMATCH',
        stalenessEvaluation: { isStale: false, reason: 'Lifecycle identity disagrees with proposal authorization.' }
      },
      executionLockStatus: { lockAcquired: false, candidateKey: getCandidateIdentity(lifecycleHistoryItem) },
      proposalIdentity,
      dispatchResult: null,
      executionAuditEvent: { ...auditEvent, handoffStatus: HANDOFF_STATUS_REVALIDATION_FAILED, reason: 'PROPOSAL_IDENTITY_MISMATCH' },
      requiresReconciliation: true,
      schemaVersion: '1.0.0'
    };
  }

  // Gate 6: Terminal Protection Re-Validation
  const currentState = lifecycleHistoryItem.currentState || 'UNKNOWN';
  const isTerminal = Boolean(lifecycleHistoryItem.terminal || currentState === 'RECOVERED' || currentState === 'BLOCKED');
  const proposedNextState = authContract.governancePayload?.proposedNextState || currentState;

  if (isTerminal || currentState === 'RECOVERED' || currentState === 'BLOCKED') {
    return {
      valid: false,
      handoffStatus: HANDOFF_STATUS_REVALIDATION_FAILED,
      revalidationStatus: {
        isAuthorized: false,
        revalidated: false,
        authorizationStatus: AUTH_STATUS_REJECTED,
        authorizationReason: AUTH_REASON_TERMINAL_PROTECTION_BLOCKED,
        stalenessEvaluation: { isStale: true, reason: 'Lifecycle is terminal. Reopening strictly prohibited.' }
      },
      executionLockStatus: { lockAcquired: false, candidateKey: getCandidateIdentity(lifecycleHistoryItem) },
      proposalIdentity,
      dispatchResult: null,
      executionAuditEvent: { ...auditEvent, handoffStatus: HANDOFF_STATUS_REVALIDATION_FAILED, reason: AUTH_REASON_TERMINAL_PROTECTION_BLOCKED },
      requiresReconciliation: true,
      schemaVersion: '1.0.0'
    };
  }

  // Gate 7: Staleness Model Re-Validation
  const evalState = authContract.evaluatedLifecycleState;
  const currentRetryCount = Number(lifecycleHistoryItem.finalRetryCount ?? lifecycleHistoryItem.retryCount ?? 0);
  const evalRetryCount = authContract.evaluatedRetryCount !== undefined && authContract.evaluatedRetryCount !== null
    ? Number(authContract.evaluatedRetryCount)
    : Number(authContract.evaluatedPolicyContext?.retryCount ?? currentRetryCount);

  const stateChanged = Boolean(evalState && currentState && evalState !== currentState);
  const retryCountChanged = Boolean(!isNaN(evalRetryCount) && evalRetryCount !== currentRetryCount);
  const policyContextChanged = Boolean(policyConfig?.stale === true || authContract.stalenessEvaluation?.isStale === true);

  if (stateChanged || retryCountChanged || policyContextChanged) {
    return {
      valid: false,
      handoffStatus: HANDOFF_STATUS_STALE_BLOCKED,
      revalidationStatus: {
        isAuthorized: false,
        revalidated: false,
        authorizationStatus: AUTH_STATUS_STALE_CONTEXT,
        authorizationReason: AUTH_REASON_OBSOLETE_LIFECYCLE_STATE,
        stalenessEvaluation: {
          isStale: true,
          stateChanged,
          retryCountChanged,
          policyContextChanged,
          reason: 'Context changed between authorization and execution dispatch.'
        }
      },
      executionLockStatus: { lockAcquired: false, candidateKey: getCandidateIdentity(lifecycleHistoryItem) },
      proposalIdentity,
      dispatchResult: null,
      executionAuditEvent: { ...auditEvent, handoffStatus: HANDOFF_STATUS_STALE_BLOCKED, reason: AUTH_REASON_OBSOLETE_LIFECYCLE_STATE },
      requiresReconciliation: true,
      schemaVersion: '1.0.0'
    };
  }

  // Gate 7b: Operator Role Policy Requirement Re-Validation
  if (policyConfig?.requireRoleVerification && !operatorRole) {
    return {
      valid: false,
      handoffStatus: HANDOFF_STATUS_REVALIDATION_FAILED,
      revalidationStatus: {
        isAuthorized: false,
        revalidated: false,
        authorizationStatus: AUTH_STATUS_POLICY_BLOCKED,
        authorizationReason: AUTH_REASON_POLICY_RULE_BLOCK,
        stalenessEvaluation: { isStale: false, reason: 'Operator role verification required by policy config.' }
      },
      executionLockStatus: { lockAcquired: false, candidateKey: getCandidateIdentity(lifecycleHistoryItem) },
      proposalIdentity,
      dispatchResult: null,
      executionAuditEvent: { ...auditEvent, handoffStatus: HANDOFF_STATUS_REVALIDATION_FAILED, reason: AUTH_REASON_POLICY_RULE_BLOCK },
      requiresReconciliation: true,
      schemaVersion: '1.0.0'
    };
  }

  // Gate 8: M10.8 Transition Governance Check
  const transitionGovernance = evaluateRecoveryLifecycleTransition(currentState, proposedNextState, {
    merchantId: currentMerchantId || merchantId,
    caseId,
    customerId,
    productId,
    terminal: isTerminal
  });

  if (!transitionGovernance.allowed) {
    return {
      valid: false,
      handoffStatus: HANDOFF_STATUS_REVALIDATION_FAILED,
      revalidationStatus: {
        isAuthorized: false,
        revalidated: false,
        authorizationStatus: AUTH_STATUS_REJECTED,
        authorizationReason: AUTH_REASON_STATE_TRANSITION_DISALLOWED,
        stalenessEvaluation: { isStale: false, reason: transitionGovernance.reason }
      },
      executionLockStatus: { lockAcquired: false, candidateKey: getCandidateIdentity(lifecycleHistoryItem) },
      proposalIdentity,
      dispatchResult: null,
      executionAuditEvent: { ...auditEvent, handoffStatus: HANDOFF_STATUS_REVALIDATION_FAILED, reason: AUTH_REASON_STATE_TRANSITION_DISALLOWED },
      requiresReconciliation: true,
      schemaVersion: '1.0.0'
    };
  }

  // Gate 9: Role Verification Gate
  if (policyConfig?.requireRoleVerification && (!operatorRole || operatorRole === 'UNAVAILABLE')) {
    return {
      valid: false,
      handoffStatus: HANDOFF_STATUS_REVALIDATION_FAILED,
      revalidationStatus: {
        isAuthorized: false,
        revalidated: false,
        authorizationStatus: AUTH_STATUS_POLICY_BLOCKED,
        authorizationReason: AUTH_REASON_POLICY_RULE_BLOCK,
        stalenessEvaluation: { isStale: false, reason: 'Operator role unverified for execution dispatch.' }
      },
      executionLockStatus: { lockAcquired: false, candidateKey: getCandidateIdentity(lifecycleHistoryItem) },
      proposalIdentity,
      dispatchResult: null,
      executionAuditEvent: { ...auditEvent, handoffStatus: HANDOFF_STATUS_REVALIDATION_FAILED, reason: AUTH_REASON_POLICY_RULE_BLOCK },
      requiresReconciliation: true,
      schemaVersion: '1.0.0'
    };
  }

  const candidateKey = getCandidateIdentity(lifecycleHistoryItem);

  return {
    valid: true,
    handoffStatus: 'REVALIDATION_PASSED',
    revalidationStatus: {
      isAuthorized: true,
      revalidated: true,
      authorizationStatus: AUTH_STATUS_AUTHORIZED,
      authorizationReason: AUTH_REASON_APPROVED_BY_OPERATOR,
      stalenessEvaluation: {
        isStale: false,
        stateChanged: false,
        retryCountChanged: false,
        policyContextChanged: false,
        reason: 'Context re-validated successfully at execution boundary.'
      }
    },
    executionLockStatus: {
      lockAcquired: false,
      candidateKey
    },
    proposalIdentity,
    dispatchResult: null,
    governancePayload: authContract.governancePayload || {
      proposedNextState,
      transitionType: 'PROPOSED_OPERATOR_ACTION',
      requiresAuthoritativeRevalidation: true
    },
    executionAuditEvent: {
      ...auditEvent,
      handoffStatus: 'REVALIDATION_PASSED',
      reason: 'Proposal authorization re-validated successfully.'
    },
    requiresReconciliation: true,
    schemaVersion: '1.0.0'
  };
}

/**
 * Milestone 10.13 — Authoritative Governed Execution Boundary.
 * Executes governed proposal handoff by combining pure re-validation, candidate execution lock acquisition,
 * and dispatching to the existing backend recovery event API.
 * 
 * @param {Object|null} proposalAuthorization - M10.12 authorization contract
 * @param {Object|null} lifecycleHistoryItem - Authoritative lifecycle history item
 * @param {Object|null} operatorContext - Operator context ({ currentMerchantId, operatorActor, operatorRole })
 * @param {Object|null} [options] - Execution options ({ executionMode: 'MANUAL'|'AUTONOMOUS', policyConfig: Object })
 * @returns {Promise<Object>} Structured governed execution handoff result
 */
export async function executeGovernedProposalHandoff(
  proposalAuthorization = null,
  lifecycleHistoryItem = null,
  operatorContext = null,
  options = {}
) {
  const executionMode = options.executionMode || 'MANUAL';
  const policyConfig = options.policyConfig || null;

  // 1. Pure Independent Authorization Re-Validation
  const handoff = buildRecoveryLifecycleExecutionHandoff(
    proposalAuthorization,
    lifecycleHistoryItem,
    operatorContext,
    policyConfig
  );

  if (!handoff.valid || handoff.handoffStatus !== 'REVALIDATION_PASSED') {
    return {
      valid: false,
      handoffStatus: handoff.handoffStatus,
      revalidationStatus: handoff.revalidationStatus,
      executionLockStatus: { lockAcquired: false, candidateKey: handoff.executionLockStatus?.candidateKey || null },
      proposalIdentity: handoff.proposalIdentity,
      dispatchResult: null,
      executionAuditEvent: handoff.executionAuditEvent,
      requiresReconciliation: true,
      schemaVersion: '1.0.0'
    };
  }

  // 2. Candidate Execution Lock Acquisition
  const candidateKey = handoff.executionLockStatus?.candidateKey || getCandidateIdentity(lifecycleHistoryItem);
  const lockAcquired = acquireCandidateExecutionLock(candidateKey, executionMode);

  if (!lockAcquired) {
    const existingLock = getCandidateLockStatus(candidateKey);
    return {
      valid: false,
      handoffStatus: HANDOFF_STATUS_LOCK_FAILED,
      revalidationStatus: handoff.revalidationStatus,
      executionLockStatus: {
        lockAcquired: false,
        candidateKey,
        existingLockState: existingLock?.state || 'LOCKED'
      },
      proposalIdentity: handoff.proposalIdentity,
      dispatchResult: null,
      executionAuditEvent: {
        ...handoff.executionAuditEvent,
        handoffStatus: HANDOFF_STATUS_LOCK_FAILED,
        reason: 'Candidate execution lock held by another in-flight operation.'
      },
      requiresReconciliation: true,
      schemaVersion: '1.0.0'
    };
  }

  // 3. Construct Recovery Event Retry Payload (FAILED -> RECOVERED)
  const targetMerchantId = operatorContext?.currentMerchantId || lifecycleHistoryItem?.merchantId || proposalAuthorization?.proposalAuthorization?.merchantId;
  const caseId = lifecycleHistoryItem?.lifecycleIdentity?.caseId || lifecycleHistoryItem?.caseId || proposalAuthorization?.proposalAuthorization?.caseId;
  
  const rawProductId = lifecycleHistoryItem?.lifecycleIdentity?.productId || lifecycleHistoryItem?.productId || proposalAuthorization?.proposalAuthorization?.productId;
  const productId = (rawProductId && rawProductId !== 'Product' && rawProductId !== 'UNKNOWN' && rawProductId !== 'NOT_RECORDED') ? rawProductId : null;

  const retryPayload = {
    activityId: lifecycleHistoryItem?.lifecycleIdentity?.activityId || caseId,
    paymentAttemptId: lifecycleHistoryItem?.lifecycleIdentity?.paymentAttemptId || caseId,
    paymentResultId: `result_retried_${Date.now()}`,
    merchantId: targetMerchantId,
    customerId: lifecycleHistoryItem?.lifecycleIdentity?.customerId || lifecycleHistoryItem?.customerId || 'customer_demo',
    productId,
    productName: lifecycleHistoryItem?.productName || 'Digital Product',
    amount: Number(lifecycleHistoryItem?.amount || 0),
    recoveredAmount: Number(lifecycleHistoryItem?.amount || 0),
    currency: lifecycleHistoryItem?.currency || 'INR',
    failureCode: lifecycleHistoryItem?.failureCode || 'SERVER_ERROR',
    priority: lifecycleHistoryItem?.priority || 'CRITICAL',
    status: 'RECOVERED',
    recommendedAction: 'RECOVERED',
    retryCount: (Number(lifecycleHistoryItem?.finalRetryCount ?? lifecycleHistoryItem?.retryCount ?? 0)) + 1,
    proposalOptionId: handoff.proposalIdentity?.optionId || null,
    authorizationAuditEventId: proposalAuthorization?.proposalAuthorization?.authorizationAuditEvent?.eventId || null
  };

  // 3.5. M10.15 Trusted Backend Authorization Nonce Fetch
  try {
    const authRes = await authorizeBackendProposal({
      merchantId: targetMerchantId,
      caseId,
      activityId: retryPayload.activityId,
      proposalOptionId: handoff.proposalIdentity?.optionId || 'opt_retry',
      actionType: handoff.proposalIdentity?.actionType || 'RECOVERY_OUTREACH',
      requestedParams: {}
    });
    if (authRes && authRes.success && authRes.data?.authorizationProof) {
      retryPayload.authorizationProof = authRes.data.authorizationProof;
    }
  } catch (authErr) {
    console.warn('[M10.15 Handshake] Authorization proof fetch warning:', authErr);
  }

  retryPayload.authorizationAuditId = proposalAuthorization?.proposalAuthorization?.authorizationAuditEvent?.eventId || null;
  retryPayload.handoffAuditId = handoff.executionAuditEvent?.eventId || null;

  // 4. Dispatch to Existing Backend Execution API
  try {
    const apiResult = await createBackendRecoveryEvent(retryPayload);

    if (apiResult && apiResult.success) {
      releaseCandidateExecutionLock(candidateKey, 'SUCCEEDED', apiResult.data);
      
      const executionAuditEvent = {
        ...handoff.executionAuditEvent,
        handoffStatus: HANDOFF_STATUS_EXECUTED,
        reason: 'Governed proposal execution request successfully handed off to backend dispatch.',
        backendEventId: apiResult.data?.id || null
      };

      return {
        valid: true,
        handoffStatus: HANDOFF_STATUS_EXECUTED,
        revalidationStatus: handoff.revalidationStatus,
        executionLockStatus: {
          lockAcquired: true,
          candidateKey,
          lockReleased: true
        },
        proposalIdentity: handoff.proposalIdentity,
        dispatchResult: {
          success: true,
          message: 'Execution request accepted by backend API.',
          backendData: apiResult.data
        },
        executionAuditEvent,
        requiresReconciliation: true,
        schemaVersion: '1.0.0'
      };
    } else {
      releaseCandidateExecutionLock(candidateKey, 'FAILED', { reason: apiResult?.error || 'Backend dispatch failed' });
      
      const executionAuditEvent = {
        ...handoff.executionAuditEvent,
        handoffStatus: HANDOFF_STATUS_DISPATCH_ERROR,
        reason: apiResult?.error || 'Backend dispatch returned non-success response.'
      };

      return {
        valid: false,
        handoffStatus: HANDOFF_STATUS_DISPATCH_ERROR,
        revalidationStatus: handoff.revalidationStatus,
        executionLockStatus: {
          lockAcquired: true,
          candidateKey,
          lockReleased: true,
          error: apiResult?.error || 'Dispatch error'
        },
        proposalIdentity: handoff.proposalIdentity,
        dispatchResult: {
          success: false,
          error: apiResult?.error || 'Backend dispatch failed'
        },
        executionAuditEvent,
        requiresReconciliation: true,
        schemaVersion: '1.0.0'
      };
    }
  } catch (err) {
    releaseCandidateExecutionLock(candidateKey, 'FAILED', { reason: err.message || 'Dispatch exception' });
    
    const executionAuditEvent = {
      ...handoff.executionAuditEvent,
      handoffStatus: HANDOFF_STATUS_DISPATCH_ERROR,
      reason: `Dispatch exception: ${err.message}`
    };

    return {
      valid: false,
      handoffStatus: HANDOFF_STATUS_DISPATCH_ERROR,
      revalidationStatus: handoff.revalidationStatus,
      executionLockStatus: {
        lockAcquired: true,
        candidateKey,
        lockReleased: true,
        error: err.message
      },
      proposalIdentity: handoff.proposalIdentity,
      dispatchResult: {
        success: false,
        error: err.message || 'Network exception during dispatch'
      },
      executionAuditEvent,
      requiresReconciliation: true,
      schemaVersion: '1.0.0'
    };
  }
}

// Milestone 10.14 — Canonical Execution Outcome Correlation & Accountability Vocabulary
export const CORRELATION_STATUS_CORRELATED = 'CORRELATED';
export const CORRELATION_STATUS_PARTIALLY_CORRELATED = 'PARTIALLY_CORRELATED';
export const CORRELATION_STATUS_CORRELATION_UNRESOLVED = 'CORRELATION_UNRESOLVED';
export const CORRELATION_STATUS_EXECUTION_NOT_OBSERVED = 'EXECUTION_NOT_OBSERVED';

export const ACCOUNTABILITY_STATUS_OUTCOME_CONSISTENT = 'OUTCOME_CONSISTENT';
export const ACCOUNTABILITY_STATUS_OUTCOME_PENDING = 'OUTCOME_PENDING';
export const ACCOUNTABILITY_STATUS_ACCOUNTABILITY_ANOMALY = 'ACCOUNTABILITY_ANOMALY';
export const ACCOUNTABILITY_STATUS_HANDOFF_FAILED = 'HANDOFF_FAILED';

export const PROPOSAL_OUTCOME_CONSISTENT = 'CONSISTENT';
export const PROPOSAL_OUTCOME_INCONSISTENT = 'INCONSISTENT';
export const PROPOSAL_OUTCOME_PENDING = 'PENDING';
export const PROPOSAL_OUTCOME_UNRESOLVED = 'UNRESOLVED';

export const ACCOUNTABILITY_ANOMALY_NONE = 'NONE';
export const ACCOUNTABILITY_ANOMALY_LEGACY_UNLINKED = 'LEGACY_UNLINKED';
export const ACCOUNTABILITY_ANOMALY_CORRELATION_UNRESOLVED = 'CORRELATION_UNRESOLVED';
export const ACCOUNTABILITY_ANOMALY_DISPATCH_WITHOUT_RECONCILIATION = 'DISPATCH_WITHOUT_RECONCILIATION';
export const ACCOUNTABILITY_ANOMALY_UNAUTHORIZED_EXECUTION_OBSERVED = 'UNAUTHORIZED_EXECUTION_OBSERVED';
export const ACCOUNTABILITY_ANOMALY_PROPOSAL_OUTCOME_MISMATCH = 'PROPOSAL_OUTCOME_MISMATCH';

/**
 * Milestone 10.14 — Governed Execution Outcome Correlation & Accountability Engine.
 * Deterministically correlates M10.12 Authorization -> M10.13 Handoff -> Backend RecoveryEvent -> M10.6 Reconciliation -> M10.7 Finalization.
 * 
 * STRICT BOUNDARIES:
 * - Pure, deterministic, side-effect free computation.
 * - 0 API calls (fetch), 0 DB writes, 0 storage writes, 0 lock calls, 0 state mutations.
 * - Does NOT execute payments, retry retries, approve/reject proposals, or alter financial outcomes.
 * - M10.6 remains authoritative for reconciliation.
 * - M10.7 remains authoritative for final lifecycle outcome classification.
 * - Absence of historical authorization metadata is NOT evidence of unauthorized execution.
 * - Lifecycle correlation does NOT automatically prove specific proposal accountability.
 */
export function buildRecoveryLifecycleExecutionAccountability(
  lifecycleHistoryItem = null,
  proposalAuthorizationInput = null,
  executionHandoffInput = null,
  operatorContext = null
) {
  const timestamp = new Date().toISOString();

  // Extract contracts safely
  const authContract = proposalAuthorizationInput?.proposalAuthorization || proposalAuthorizationInput;
  const handoffContract = executionHandoffInput?.executionHandoffResult || executionHandoffInput;
  const opCtx = operatorContext || authContract?.operatorContext || {};
  const currentMerchantId = opCtx.currentMerchantId || null;

  // Derive identity fields strictly
  const caseId = lifecycleHistoryItem?.lifecycleIdentity?.caseId || lifecycleHistoryItem?.caseId || authContract?.caseId || handoffContract?.proposalIdentity?.caseId || null;
  const historyMerchantId = lifecycleHistoryItem?.merchantId || lifecycleHistoryItem?.lifecycleIdentity?.merchantId || null;
  const authMerchantId = authContract?.merchantId || authContract?.lifecycleIdentity?.merchantId || null;
  const handoffMerchantId = handoffContract?.executionAuditEvent?.merchantId || handoffContract?.proposalAuthorization?.merchantId || null;
  const opMerchantId = currentMerchantId || null;

  // Merchant Isolation Check
  const knownMerchants = [historyMerchantId, authMerchantId, handoffMerchantId, opMerchantId].filter(m => m && m !== 'UNKNOWN');
  const firstMerchant = knownMerchants[0] || null;
  const hasMerchantMismatch = !firstMerchant || knownMerchants.some(m => m !== firstMerchant);

  const rawProductId = lifecycleHistoryItem?.lifecycleIdentity?.productId || lifecycleHistoryItem?.productId || null;
  const productId = (rawProductId && rawProductId !== 'Product' && rawProductId !== 'UNKNOWN' && rawProductId !== 'NOT_RECORDED') ? rawProductId : null;
  const customerId = lifecycleHistoryItem?.lifecycleIdentity?.customerId || lifecycleHistoryItem?.customerId || authContract?.customerId || null;

  const lifecycleIdentity = { caseId, merchantId: historyMerchantId || 'UNKNOWN', customerId, productId };

  // Proposal Identity
  const proposalIdentity = handoffContract?.proposalIdentity || authContract?.proposalIdentity || {
    optionId: null,
    actionType: null,
    recommended: false,
    policyCompliant: false
  };

  // Stage 1: Authorization Identity
  const authorizationIdentity = authContract ? {
    isAuthorized: Boolean(authContract.isAuthorized),
    authorizationStatus: authContract.authorizationStatus || 'NOT_EVALUATED',
    authorizationReason: authContract.authorizationReason || null,
    authEventId: authContract.authorizationAuditEvent?.eventId || null,
    evaluatedState: authContract.evaluatedLifecycleState || null,
    evaluatedRetryCount: authContract.evaluatedRetryCount ?? null
  } : {
    isAuthorized: false,
    authorizationStatus: 'NOT_EVALUATED',
    authorizationReason: 'No proposal authorization contract provided.',
    authEventId: null,
    evaluatedState: null,
    evaluatedRetryCount: null
  };

  // Stage 2: Execution Handoff Identity
  const executionHandoffIdentity = handoffContract ? {
    valid: Boolean(handoffContract.valid),
    handoffStatus: handoffContract.handoffStatus || 'NOT_ATTEMPTED',
    candidateKey: handoffContract.executionLockStatus?.candidateKey || null,
    handoffEventId: handoffContract.executionAuditEvent?.eventId || null,
    requiresReconciliation: handoffContract.requiresReconciliation !== false
  } : {
    valid: false,
    handoffStatus: 'NOT_ATTEMPTED',
    candidateKey: null,
    handoffEventId: null,
    requiresReconciliation: true
  };

  // Stage 3: Backend Execution Identity (from M10.9 History / RecoveryEvents)
  const lastTransition = lifecycleHistoryItem?.transitions ? lifecycleHistoryItem.transitions[lifecycleHistoryItem.transitions.length - 1] : null;
  const hasBackendEvent = Boolean(lifecycleHistoryItem && lifecycleHistoryItem.transitions && lifecycleHistoryItem.transitions.length > 0);
  
  const backendExecutionIdentity = {
    observed: hasBackendEvent,
    activityId: lifecycleHistoryItem?.lifecycleIdentity?.activityId || caseId || null,
    paymentAttemptId: lifecycleHistoryItem?.lifecycleIdentity?.paymentAttemptId || null,
    paymentResultId: lifecycleHistoryItem?.finalPaymentResultId || null,
    dispatchEventId: handoffContract?.dispatchResult?.backendData?.id || handoffContract?.executionAuditEvent?.backendEventId || null,
    status: lastTransition?.status || lifecycleHistoryItem?.currentState || 'UNOBSERVED'
  };

  const rawStatus = (recoveryEvent?.status || recoveryEvent?.currentStatus || lifecycleHistoryItem?.status || lifecycleHistoryItem?.currentStatus || lifecycleHistoryItem?.currentState || '').toUpperCase();
  const inferredOutcome = rawStatus === 'RECOVERED' || rawStatus === 'SUCCESS'
    ? 'RECOVERED'
    : (rawStatus === 'FAILED' ? 'FAILED' : 'PENDING');

  // Stage 4: Reconciliation Identity (M10.6)
  const reconciliationIdentity = {
    reconciliationStatus: lifecycleHistoryItem?.reconciliationStatus || (hasBackendEvent ? (inferredOutcome === 'FAILED' ? 'RECONCILED_FAILED' : 'RECONCILED_SUCCESS') : 'RECONCILIATION_PENDING'),
    reconciledOutcome: lifecycleHistoryItem?.recoveryOutcome || inferredOutcome,
    recoveryConfirmed: Boolean(lifecycleHistoryItem?.recoveryConfirmed || inferredOutcome === 'RECOVERED'),
    recoveredAmount: Number(lifecycleHistoryItem?.recoveredAmount || (inferredOutcome === 'RECOVERED' ? (recoveryEvent?.amount || lifecycleHistoryItem?.amount || 0) : 0))
  };

  // Stage 5: Finalization Identity (M10.7)
  const finalizationIdentity = {
    lifecycleClassification: lifecycleHistoryItem?.lifecycleClassification || (inferredOutcome === 'FAILED' ? 'LIFECYCLE_NON_TERMINAL_ACTIVE' : 'LIFECYCLE_UNRESOLVED'),
    closureStatus: lifecycleHistoryItem?.closureStatus || 'OPEN',
    terminal: Boolean(lifecycleHistoryItem?.terminal),
    recoveryOutcome: lifecycleHistoryItem?.recoveryOutcome || inferredOutcome
  };

  // Check explicit proposal binding (to separate lifecycle correlation from proposal causality)
  const hasExplicitProposalBinding = Boolean(
    (handoffContract?.dispatchResult?.backendData?.id && (
      lifecycleHistoryItem?.transitions?.some(t => t.id === handoffContract.dispatchResult.backendData.id || t.eventId === handoffContract.dispatchResult.backendData.id || t.activityId === handoffContract.dispatchResult.backendData.id)
    )) ||
    (lifecycleHistoryItem?.proposalOptionId && proposalIdentity.optionId && lifecycleHistoryItem.proposalOptionId === proposalIdentity.optionId) ||
    (authContract?.authorizationAuditEvent?.eventId && lifecycleHistoryItem?.authorizationAuditEventId && authContract.authorizationAuditEvent.eventId === lifecycleHistoryItem.authorizationAuditEventId)
  );

  // Evidence collector
  const evidence = [];

  if (historyMerchantId) evidence.push({ label: 'Merchant Context', value: historyMerchantId, sourceStage: 'M10.9_HISTORY', category: 'RECORDED_FACT' });
  if (caseId) evidence.push({ label: 'Case Identity', value: caseId, sourceStage: 'M10.9_HISTORY', category: 'RECORDED_FACT' });
  if (productId) {
    evidence.push({ label: 'Product Identity', value: productId, sourceStage: 'M10.9_HISTORY', category: 'RECORDED_FACT' });
  } else {
    evidence.push({ label: 'Product Identity', value: 'UNAVAILABLE', sourceStage: 'M10.9_HISTORY', category: 'UNAVAILABLE', reason: 'Product identity unrecorded or missing in context.' });
  }

  if (authorizationIdentity.authEventId) {
    evidence.push({ label: 'Authorization Audit ID', value: authorizationIdentity.authEventId, sourceStage: 'M10.12_AUTHORIZATION', category: 'RECORDED_FACT' });
  } else {
    evidence.push({ label: 'Authorization Audit ID', value: 'UNAVAILABLE', sourceStage: 'M10.12_AUTHORIZATION', category: 'UNAVAILABLE', reason: 'No explicit M10.12 authorization audit event recorded for historical event.' });
  }

  if (executionHandoffIdentity.handoffEventId) {
    evidence.push({ label: 'Handoff Audit ID', value: executionHandoffIdentity.handoffEventId, sourceStage: 'M10.13_HANDOFF', category: 'RECORDED_FACT' });
  } else {
    evidence.push({ label: 'Handoff Audit ID', value: 'UNAVAILABLE', sourceStage: 'M10.13_HANDOFF', category: 'UNAVAILABLE', reason: 'No explicit M10.13 handoff audit event recorded for historical event.' });
  }

  if (backendExecutionIdentity.dispatchEventId) {
    evidence.push({ label: 'Backend Dispatch Event ID', value: backendExecutionIdentity.dispatchEventId, sourceStage: 'M10.13_HANDOFF', category: 'RECORDED_FACT' });
  }

  // Evaluate Correlation & Accountability Status
  let correlationStatus = CORRELATION_STATUS_CORRELATION_UNRESOLVED;
  let accountabilityStatus = ACCOUNTABILITY_STATUS_OUTCOME_PENDING;
  let proposalOutcomeConsistency = PROPOSAL_OUTCOME_PENDING;
  let anomalyCategory = ACCOUNTABILITY_ANOMALY_NONE;
  let anomalySeverity = 'NONE';
  let requiresOperatorReview = false;
  let summary = '';
  let detailedReason = '';

  if (hasMerchantMismatch) {
    correlationStatus = CORRELATION_STATUS_CORRELATION_UNRESOLVED;
    accountabilityStatus = ACCOUNTABILITY_STATUS_ACCOUNTABILITY_ANOMALY;
    proposalOutcomeConsistency = PROPOSAL_OUTCOME_UNRESOLVED;
    anomalyCategory = ACCOUNTABILITY_ANOMALY_CORRELATION_UNRESOLVED;
    anomalySeverity = 'CRITICAL';
    requiresOperatorReview = true;
    summary = 'Merchant Context Isolation Mismatch';
    detailedReason = 'Evidence spans multiple merchant contexts. Correlation rejected to prevent cross-merchant leakage.';
  } else if (!authContract && !handoffContract && hasBackendEvent) {
    // Check if this event belongs to an active governed execution context where governance was explicitly required
    const isExplicitGovernedViolation = Boolean(
      opCtx.requireGovernedAuthorization === true ||
      lifecycleHistoryItem?.governanceRequired === true ||
      opCtx.governedContext === true
    );

    if (isExplicitGovernedViolation) {
      correlationStatus = CORRELATION_STATUS_CORRELATION_UNRESOLVED;
      accountabilityStatus = ACCOUNTABILITY_STATUS_ACCOUNTABILITY_ANOMALY;
      proposalOutcomeConsistency = PROPOSAL_OUTCOME_UNRESOLVED;
      anomalyCategory = ACCOUNTABILITY_ANOMALY_UNAUTHORIZED_EXECUTION_OBSERVED;
      anomalySeverity = 'HIGH';
      requiresOperatorReview = true;
      summary = 'Backend Telemetry Observed Without Governed Authorization';
      detailedReason = 'Backend RecoveryEvent exists within an active governed execution context, but no initiating M10.12 proposal authorization or M10.13 handoff was recorded.';
    } else {
      // Historical / Pre-Governance Legacy Event
      correlationStatus = CORRELATION_STATUS_CORRELATION_UNRESOLVED;
      accountabilityStatus = ACCOUNTABILITY_STATUS_OUTCOME_PENDING;
      proposalOutcomeConsistency = PROPOSAL_OUTCOME_UNRESOLVED;
      anomalyCategory = ACCOUNTABILITY_ANOMALY_LEGACY_UNLINKED;
      anomalySeverity = 'INFO';
      requiresOperatorReview = false; // Absence of legacy auth is NOT an unauthorized execution security anomaly
      summary = 'Pre-Governance Legacy Telemetry (Link Unavailable)';
      detailedReason = 'Backend RecoveryEvent exists from historical pre-governance telemetry. Absence of M10.12/M10.13 authorization metadata is not an unauthorized security anomaly.';
    }
  } else if (handoffContract && !handoffContract.valid) {
    // Handoff failed at re-validation or locking gate
    correlationStatus = CORRELATION_STATUS_PARTIALLY_CORRELATED;
    accountabilityStatus = ACCOUNTABILITY_STATUS_HANDOFF_FAILED;
    proposalOutcomeConsistency = PROPOSAL_OUTCOME_UNRESOLVED;
    anomalyCategory = ACCOUNTABILITY_ANOMALY_NONE;
    anomalySeverity = 'INFO';
    requiresOperatorReview = false;
    summary = 'Execution Handoff Failed Re-Validation / Lock Gate';
    detailedReason = `Execution handoff was blocked prior to dispatch (${handoffContract.handoffStatus}). 0 downstream backend execution calls were attempted.`;
  } else if (handoffContract && handoffContract.handoffStatus === 'EXECUTED' && !hasBackendEvent) {
    // Handoff executed, but no backend event observed in history
    correlationStatus = CORRELATION_STATUS_EXECUTION_NOT_OBSERVED;
    accountabilityStatus = ACCOUNTABILITY_STATUS_ACCOUNTABILITY_ANOMALY;
    proposalOutcomeConsistency = PROPOSAL_OUTCOME_UNRESOLVED;
    anomalyCategory = ACCOUNTABILITY_ANOMALY_DISPATCH_WITHOUT_RECONCILIATION;
    anomalySeverity = 'HIGH';
    requiresOperatorReview = true;
    summary = 'Handoff Executed But Downstream Event Unobserved';
    detailedReason = 'M10.13 confirmed handoff dispatch, but no corresponding backend RecoveryEvent telemetry has been recorded yet.';
  } else if (authContract && handoffContract && handoffContract.handoffStatus === 'EXECUTED' && hasBackendEvent) {
    // Lifecycle correlation established
    correlationStatus = CORRELATION_STATUS_CORRELATED;
    
    if (finalizationIdentity.terminal) {
      if (!hasExplicitProposalBinding) {
        // Lifecycle records match, but specific proposal-to-outcome causality cannot be asserted without explicit proposal/handoff binding IDs
        accountabilityStatus = ACCOUNTABILITY_STATUS_OUTCOME_CONSISTENT;
        proposalOutcomeConsistency = PROPOSAL_OUTCOME_UNRESOLVED;
        anomalyCategory = ACCOUNTABILITY_ANOMALY_NONE;
        anomalySeverity = 'NONE';
        requiresOperatorReview = false;
        summary = 'Lifecycle Finalized (Proposal Accountability Unresolved)';
        detailedReason = 'Lifecycle records match and outcome is terminal, but specific proposal causality remains unresolved due to absence of explicit authorization/handoff binding IDs.';
      } else if (finalizationIdentity.recoveryOutcome === 'RECOVERED') {
        accountabilityStatus = ACCOUNTABILITY_STATUS_OUTCOME_CONSISTENT;
        proposalOutcomeConsistency = PROPOSAL_OUTCOME_CONSISTENT;
        anomalyCategory = ACCOUNTABILITY_ANOMALY_NONE;
        anomalySeverity = 'NONE';
        requiresOperatorReview = false;
        summary = 'Execution Outcome Fully Correlated & Consistent';
        detailedReason = 'Authorized proposal was safely dispatched via M10.13 handoff and confirmed as terminal RECOVERED by authoritative backend telemetry.';
      } else if (finalizationIdentity.recoveryOutcome === 'FAILED' || finalizationIdentity.closureStatus === 'BLOCKED') {
        accountabilityStatus = ACCOUNTABILITY_STATUS_OUTCOME_CONSISTENT;
        proposalOutcomeConsistency = PROPOSAL_OUTCOME_CONSISTENT;
        anomalyCategory = ACCOUNTABILITY_ANOMALY_NONE;
        anomalySeverity = 'NONE';
        requiresOperatorReview = false;
        summary = 'Execution Outcome Correlated (Terminal Failed / Blocked)';
        detailedReason = 'Authorized proposal was dispatched via M10.13 handoff. Authoritative reconciliation confirmed payment failure and retry limit enforcement.';
      } else {
        accountabilityStatus = ACCOUNTABILITY_STATUS_ACCOUNTABILITY_ANOMALY;
        proposalOutcomeConsistency = PROPOSAL_OUTCOME_INCONSISTENT;
        anomalyCategory = ACCOUNTABILITY_ANOMALY_PROPOSAL_OUTCOME_MISMATCH;
        anomalySeverity = 'HIGH';
        requiresOperatorReview = true;
        summary = 'Terminal Outcome Contradicts Authorized Proposal';
        detailedReason = 'Authorized proposal execution reached terminal state but outcome classification conflicts with governance expectations.';
      }
    } else {
      // Non-terminal pending state
      accountabilityStatus = ACCOUNTABILITY_STATUS_OUTCOME_PENDING;
      proposalOutcomeConsistency = hasExplicitProposalBinding ? PROPOSAL_OUTCOME_PENDING : PROPOSAL_OUTCOME_UNRESOLVED;
      anomalyCategory = ACCOUNTABILITY_ANOMALY_NONE;
      anomalySeverity = 'INFO';
      requiresOperatorReview = false;
      summary = 'Execution Outcome Pending Telemetry Reconciliation';
      detailedReason = 'Execution request was accepted by backend API. Lifecycle remains open awaiting authoritative provider reconciliation.';
    }
  } else {
    // Default fallback: partially correlated pending
    correlationStatus = CORRELATION_STATUS_PARTIALLY_CORRELATED;
    accountabilityStatus = ACCOUNTABILITY_STATUS_OUTCOME_PENDING;
    proposalOutcomeConsistency = PROPOSAL_OUTCOME_UNRESOLVED;
    anomalyCategory = ACCOUNTABILITY_ANOMALY_NONE;
    anomalySeverity = 'INFO';
    requiresOperatorReview = false;
    summary = 'Governance Context Partially Correlated';
    detailedReason = 'Authorization and context recorded. Awaiting complete end-to-end execution and reconciliation telemetry.';
  }

  return {
    valid: !hasMerchantMismatch,
    merchantId: historyMerchantId || authMerchantId || 'UNKNOWN',
    lifecycleIdentity,
    proposalIdentity,
    authorizationIdentity,
    executionHandoffIdentity,
    backendExecutionIdentity,
    reconciliationIdentity,
    finalizationIdentity,
    correlationStatus,
    accountabilityStatus,
    proposalOutcomeConsistency,
    anomalyCategory,
    anomalySeverity,
    evidence,
    requiresOperatorReview,
    explanation: {
      summary,
      detailedReason,
      recommendedOperatorAction: requiresOperatorReview ? 'Operator review required — verify governance correlation and telemetry' : 'No action required'
    },
    schemaVersion: '1.0.0'
  };
}

/**
 * Milestone 10.7 — Pure Recovery Outcome Closure & Lifecycle Finalization Engine.
 * Finalizes recovery lifecycles based on authoritative backend outcome and reconciliation.
 * 
 * STRICT BOUNDARIES:
 * - Pure, deterministic, side-effect free function.
 * - 0 API calls, 0 DB writes, 0 storage writes, 0 side effects.
 * - Does NOT execute payment retries, alter retry limits, modify policy, or mutate inputs.
 * - Authoritative backend lifecycle strictly governs terminal state finalization.
 * - Strictly merchant-isolated.
 * 
 * @param {Object|null} reconciliationResult - Output from reconcileRecoveryExecutionOutcome()
 * @param {Object|null} recoveryEvent - Authoritative backend RecoveryEvent record
 * @param {string|null} currentMerchantId - Active merchant ID
 * @param {string} currentTime - ISO timestamp string
 * @returns {Object} Structured lifecycle finalization model
 */
export function finalizeRecoveryLifecycle(
  reconciliationResult = null,
  recoveryEvent = null,
  currentMerchantId = null,
  currentTime = new Date().toISOString()
) {
  const timestamp = currentTime || new Date().toISOString();

  // 1. Reconciliation Evaluation & Identity Extraction
  const rec = reconciliationResult || (recoveryEvent ? reconcileRecoveryExecutionOutcome(null, null, recoveryEvent, recoveryEvent, currentMerchantId, timestamp) : null);

  const caseId = rec?.caseIdentity?.caseId || recoveryEvent?.activityId || recoveryEvent?.id || 'UNKNOWN';
  const activityId = rec?.caseIdentity?.activityId || recoveryEvent?.activityId || caseId;
  const paymentAttemptId = rec?.paymentAttemptId || recoveryEvent?.paymentAttemptId || null;
  const paymentResultId = rec?.paymentResultId || recoveryEvent?.paymentResultId || null;
  const merchantId = rec?.caseIdentity?.merchantId || recoveryEvent?.merchantId || 'UNKNOWN';
  const customerId = rec?.caseIdentity?.customerId || recoveryEvent?.customerId || 'UNKNOWN';
  const productId = rec?.caseIdentity?.productId || recoveryEvent?.productId || 'UNKNOWN';
  const productName = rec?.caseIdentity?.productName || recoveryEvent?.productName || 'Digital Product';

  const caseIdentity = {
    caseId,
    activityId,
    paymentAttemptId,
    paymentResultId,
    merchantId,
    customerId,
    productId,
    productName
  };

  const inconsistencies = [...(rec?.inconsistencies || [])];

  // Fail-safe 1: Missing identity or null inputs
  if (!rec || caseId === 'UNKNOWN' || (merchantId === 'UNKNOWN' && customerId === 'UNKNOWN')) {
    return {
      caseIdentity,
      lifecycleState: CLOSURE_STATUS_UNRESOLVED,
      lifecycleClassification: LIFECYCLE_UNRESOLVED,
      closureStatus: CLOSURE_STATUS_UNRESOLVED,
      terminal: false,
      active: true,
      recoveryOutcome: OUTCOME_UNKNOWN,
      recoveryConfirmed: false,
      recoveredAmount: null,
      finalRetryCount: 0,
      finalPaymentAttemptId: paymentAttemptId,
      finalPaymentResultId: paymentResultId,
      activeCaseStatus: ACTIVE_CASE_STATUS_OPERATOR_REVIEW,
      metricsImpact: { recoveredRevenueImpact: 0, failedCaseImpact: 0, activeCaseImpact: 0, pendingOutcomeImpact: 0 },
      feedbackEligibility: { eligible: false, reason: 'Identity or reconciliation input incomplete.' },
      learningEligibility: { eligible: false, reason: 'Identity or reconciliation input incomplete.' },
      operatorAttention: { severity: 'WARNING', title: 'Insufficient Case Context', reason: 'Lifecycle context incomplete for safe finalization.' },
      closureReason: 'Lifecycle requires operator review because outcome could not be safely reconciled due to missing identity data.',
      nextStep: 'Operator review required — lifecycle could not be safely finalized',
      inconsistencies,
      timestamp
    };
  }

  // Fail-safe 2: Merchant Isolation Verification
  if (currentMerchantId && merchantId && merchantId !== 'UNKNOWN' && merchantId !== currentMerchantId) {
    inconsistencies.push({
      type: 'MERCHANT_ID_MISMATCH',
      severity: 'CRITICAL',
      description: `Merchant ID mismatch during finalization (${merchantId} !== ${currentMerchantId}).`
    });

    return {
      caseIdentity,
      lifecycleState: CLOSURE_STATUS_UNRESOLVED,
      lifecycleClassification: LIFECYCLE_INCONSISTENT,
      closureStatus: CLOSURE_STATUS_UNRESOLVED,
      terminal: false,
      active: true,
      recoveryOutcome: OUTCOME_UNKNOWN,
      recoveryConfirmed: false,
      recoveredAmount: null,
      finalRetryCount: Number(recoveryEvent?.retryCount || rec?.retryCount || 0),
      finalPaymentAttemptId: paymentAttemptId,
      finalPaymentResultId: paymentResultId,
      activeCaseStatus: ACTIVE_CASE_STATUS_OPERATOR_REVIEW,
      metricsImpact: { recoveredRevenueImpact: 0, failedCaseImpact: 0, activeCaseImpact: 0, pendingOutcomeImpact: 0 },
      feedbackEligibility: { eligible: false, reason: 'Cross-merchant boundary violation.' },
      learningEligibility: { eligible: false, reason: 'Cross-merchant boundary violation.' },
      operatorAttention: { severity: 'CRITICAL', title: 'Merchant Isolation Mismatch', reason: `Merchant mismatch (${merchantId} !== ${currentMerchantId}).` },
      closureReason: 'Lifecycle requires operator review due to merchant boundary violation.',
      nextStep: 'Operator review required — merchant ownership mismatch',
      inconsistencies,
      timestamp
    };
  }

  // Extract Authoritative State & Metrics
  const reconciliationStatus = rec.reconciliationStatus;
  const reconciledOutcome = rec.reconciledOutcome;
  const recoveryConfirmed = Boolean(rec.recoveryConfirmed);
  const recoveredAmount = rec.recoveredAmount;
  const retryCount = Number(recoveryEvent?.retryCount ?? rec.retryCount ?? 0);
  const maxRetryLimit = Number(recoveryEvent?.maxRetryLimit ?? 1);

  let lifecycleClassification = LIFECYCLE_UNRESOLVED;
  let closureStatus = CLOSURE_STATUS_UNRESOLVED;
  let terminal = false;
  let active = true;
  let activeCaseStatus = ACTIVE_CASE_STATUS_ACTIVE;
  let recoveryOutcome = reconciledOutcome;
  let closureReason = '';
  let nextStep = '';
  let feedbackEligibility = { eligible: false, reason: 'Lifecycle is active/unresolved.' };
  let learningEligibility = { eligible: false, reason: 'Lifecycle is active/unresolved.' };
  let operatorAttention = { severity: 'NONE', title: 'Clean Finalization', reason: 'Lifecycle active.' };
  let metricsImpact = { recoveredRevenueImpact: 0, failedCaseImpact: 0, activeCaseImpact: 0, pendingOutcomeImpact: 0 };

  // Rule A: RECONCILIATION_INCONSISTENT or severe mismatches
  if (reconciliationStatus === RECONCILIATION_INCONSISTENT || inconsistencies.some(i => i.severity === 'CRITICAL' || i.severity === 'HIGH')) {
    lifecycleClassification = LIFECYCLE_INCONSISTENT;
    closureStatus = CLOSURE_STATUS_UNRESOLVED;
    terminal = false;
    active = true;
    activeCaseStatus = ACTIVE_CASE_STATUS_OPERATOR_REVIEW;
    recoveryOutcome = reconciledOutcome;
    closureReason = 'Lifecycle requires operator review because execution and backend state disagree.';
    nextStep = 'Operator review required — lifecycle inconsistency';
    feedbackEligibility = { eligible: false, reason: 'Outcome reconciliation is inconsistent.' };
    learningEligibility = { eligible: false, reason: 'Outcome reconciliation is inconsistent.' };
    operatorAttention = {
      severity: 'HIGH',
      title: 'Lifecycle State Inconsistency',
      reason: rec.reasoning?.summary || 'Execution result disagrees with backend RecoveryEvent lifecycle.'
    };
    metricsImpact = { recoveredRevenueImpact: 0, failedCaseImpact: 0, activeCaseImpact: 0, pendingOutcomeImpact: 0 };
  }
  // Rule B: RECONCILIATION_INSUFFICIENT_DATA
  else if (reconciliationStatus === RECONCILIATION_INSUFFICIENT_DATA) {
    lifecycleClassification = LIFECYCLE_UNRESOLVED;
    closureStatus = CLOSURE_STATUS_UNRESOLVED;
    terminal = false;
    active = true;
    activeCaseStatus = ACTIVE_CASE_STATUS_OPERATOR_REVIEW;
    recoveryOutcome = OUTCOME_UNKNOWN;
    closureReason = 'Lifecycle requires operator review because outcome could not be safely reconciled.';
    nextStep = 'Operator review required — lifecycle could not be safely finalized';
    feedbackEligibility = { eligible: false, reason: 'Insufficient reconciliation data.' };
    learningEligibility = { eligible: false, reason: 'Insufficient reconciliation data.' };
    operatorAttention = { severity: 'WARNING', title: 'Insufficient Reconciliation Data', reason: 'Required lifecycle identifiers or backend status missing.' };
    metricsImpact = { recoveredRevenueImpact: 0, failedCaseImpact: 0, activeCaseImpact: 0, pendingOutcomeImpact: 0 };
  }
  // Rule C: RECOVERED Terminal State
  else if (recoveryConfirmed || reconciledOutcome === OUTCOME_RECOVERED) {
    lifecycleClassification = LIFECYCLE_TERMINAL_RECOVERED;
    closureStatus = CLOSURE_STATUS_CLOSED;
    terminal = true;
    active = false;
    activeCaseStatus = ACTIVE_CASE_STATUS_INACTIVE;
    recoveryOutcome = OUTCOME_RECOVERED;
    closureReason = 'Recovery confirmed by authoritative backend lifecycle.';
    nextStep = 'No action — recovery lifecycle closed';
    feedbackEligibility = { eligible: true, reason: 'Authoritative terminal recovery confirmed.' };
    learningEligibility = { eligible: true, reason: 'Authoritative terminal recovery confirmed.' };
    operatorAttention = { severity: 'NONE', title: 'Recovery Finalized', reason: 'Opportunity successfully recovered.' };
    metricsImpact = {
      recoveredRevenueImpact: recoveredAmount || 0,
      failedCaseImpact: 0,
      activeCaseImpact: -1,
      pendingOutcomeImpact: 0
    };
  }
  // Rule D: PENDING or EXECUTING State
  else if (reconciledOutcome === OUTCOME_PENDING || reconciliationStatus === RECONCILIATION_PENDING) {
    const isExec = rec.executionAssessment?.executionStarted || recoveryEvent?.status === 'EXECUTING';
    lifecycleClassification = isExec ? LIFECYCLE_NON_TERMINAL_EXECUTING : LIFECYCLE_NON_TERMINAL_PENDING;
    closureStatus = CLOSURE_STATUS_OPEN;
    terminal = false;
    active = true;
    activeCaseStatus = ACTIVE_CASE_STATUS_ACTIVE;
    recoveryOutcome = OUTCOME_PENDING;
    closureReason = 'Lifecycle remains open while payment outcome is pending.';
    nextStep = isExec ? 'Wait for current execution outcome' : 'Wait for authoritative payment outcome';
    feedbackEligibility = { eligible: false, reason: 'Lifecycle outcome is pending.' };
    learningEligibility = { eligible: false, reason: 'Lifecycle outcome is pending.' };
    operatorAttention = { severity: 'WARNING', title: 'Outcome Pending', reason: 'Awaiting payment provider lifecycle webhook/confirmation.' };
    metricsImpact = { recoveredRevenueImpact: 0, failedCaseImpact: 0, activeCaseImpact: 0, pendingOutcomeImpact: 1 };
  }
  // Rule E: FAILED Outcome Evaluation
  else if (reconciledOutcome === OUTCOME_FAILED || reconciliationStatus === RECONCILIATION_FAILED) {
    recoveryOutcome = OUTCOME_FAILED;
    if (retryCount >= maxRetryLimit) {
      lifecycleClassification = LIFECYCLE_TERMINAL_BLOCKED;
      closureStatus = CLOSURE_STATUS_BLOCKED;
      terminal = true;
      active = false;
      activeCaseStatus = ACTIVE_CASE_STATUS_INACTIVE;
      closureReason = 'Lifecycle blocked because retry limit is exhausted.';
      nextStep = 'No retry — lifecycle blocked';
      feedbackEligibility = { eligible: true, reason: 'Authoritative terminal failed outcome confirmed.' };
      learningEligibility = { eligible: true, reason: 'Authoritative terminal failed outcome confirmed.' };
      operatorAttention = { severity: 'WARNING', title: 'Retry Limit Exhausted', reason: `Case reached maximum retry attempts (${retryCount}/${maxRetryLimit}).` };
      metricsImpact = { recoveredRevenueImpact: 0, failedCaseImpact: 1, activeCaseImpact: -1, pendingOutcomeImpact: 0 };
    } else {
      lifecycleClassification = LIFECYCLE_NON_TERMINAL_ACTIVE;
      closureStatus = CLOSURE_STATUS_OPEN;
      terminal = false;
      active = true;
      activeCaseStatus = ACTIVE_CASE_STATUS_ACTIVE;
      closureReason = 'Recovery remains active because retry limit is not exhausted.';
      nextStep = 'Continue recovery decision process';
      feedbackEligibility = { eligible: false, reason: 'Lifecycle is non-terminal active.' };
      learningEligibility = { eligible: false, reason: 'Lifecycle is non-terminal active.' };
      operatorAttention = { severity: 'NONE', title: 'Active Opportunity', reason: 'Opportunity available for recovery orchestration.' };
      metricsImpact = { recoveredRevenueImpact: 0, failedCaseImpact: 0, activeCaseImpact: 0, pendingOutcomeImpact: 0 };
    }
  }
  // Rule F: NOT_EXECUTED Fallback
  else {
    recoveryOutcome = OUTCOME_NOT_EXECUTED;
    if (retryCount >= maxRetryLimit) {
      lifecycleClassification = LIFECYCLE_TERMINAL_BLOCKED;
      closureStatus = CLOSURE_STATUS_BLOCKED;
      terminal = true;
      active = false;
      activeCaseStatus = ACTIVE_CASE_STATUS_INACTIVE;
      closureReason = 'Lifecycle blocked prior to execution due to policy/retry limits.';
      nextStep = 'No retry — lifecycle blocked';
      feedbackEligibility = { eligible: false, reason: 'Case not executed and blocked.' };
      learningEligibility = { eligible: false, reason: 'Case not executed and blocked.' };
      operatorAttention = { severity: 'WARNING', title: 'Policy Blocked', reason: 'Case blocked prior to execution.' };
      metricsImpact = { recoveredRevenueImpact: 0, failedCaseImpact: 0, activeCaseImpact: -1, pendingOutcomeImpact: 0 };
    } else {
      lifecycleClassification = LIFECYCLE_NON_TERMINAL_ACTIVE;
      closureStatus = CLOSURE_STATUS_OPEN;
      terminal = false;
      active = true;
      activeCaseStatus = ACTIVE_CASE_STATUS_ACTIVE;
      closureReason = 'Lifecycle active awaiting action selection and dispatch.';
      nextStep = 'Await explicit recovery execution';
      feedbackEligibility = { eligible: false, reason: 'Case not yet executed.' };
      learningEligibility = { eligible: false, reason: 'Case not yet executed.' };
      operatorAttention = { severity: 'NONE', title: 'Awaiting Action', reason: 'Case ready for decision orchestration.' };
      metricsImpact = { recoveredRevenueImpact: 0, failedCaseImpact: 0, activeCaseImpact: 0, pendingOutcomeImpact: 0 };
    }
  }

  const canonicalLifecycleState = getCanonicalLifecycleState(lifecycleClassification, recoveryOutcome);
  const transitionGovernance = evaluateRecoveryLifecycleTransition(
    canonicalLifecycleState,
    canonicalLifecycleState,
    {
      merchantId: caseIdentity.merchantId,
      currentMerchantId,
      caseId: caseIdentity.caseId,
      activityId: caseIdentity.activityId,
      paymentAttemptId: caseIdentity.paymentAttemptId,
      customerId: caseIdentity.customerId,
      productId: caseIdentity.productId,
      terminal,
      authoritativeStatus: recoveryOutcome,
      closureStatus
    }
  );

  return {
    caseIdentity,
    lifecycleState: closureStatus,
    lifecycleClassification,
    canonicalLifecycleState,
    closureStatus,
    terminal,
    active,
    recoveryOutcome,
    recoveryConfirmed,
    recoveredAmount,
    finalRetryCount: retryCount,
    finalPaymentAttemptId: paymentAttemptId,
    finalPaymentResultId: paymentResultId,
    activeCaseStatus,
    metricsImpact,
    feedbackEligibility,
    learningEligibility,
    operatorAttention,
    closureReason,
    nextStep,
    inconsistencies,
    transitionGovernance,
    timestamp
  };
}

/**
 * Milestone 10.4 — Recommended Decision Taxonomy Constants
 */
export const ORCHESTRATED_DECISION_RETRY_NOW = 'RETRY_NOW';
export const ORCHESTRATED_DECISION_RETRY_SHORT_TERM = 'RETRY_SHORT_TERM';
export const ORCHESTRATED_DECISION_MONITOR = 'MONITOR';
export const ORCHESTRATED_DECISION_OPERATOR_REVIEW = 'OPERATOR_REVIEW';
export const ORCHESTRATED_DECISION_DEFER = 'DEFER';
export const ORCHESTRATED_DECISION_BLOCKED = 'BLOCKED';
export const ORCHESTRATED_DECISION_NO_ACTION = 'NO_ACTION';
export const ORCHESTRATED_DECISION_WAIT_FOR_OUTCOME = 'WAIT_FOR_OUTCOME';

/**
 * Milestone 10.4 — Pure Recovery Decision Orchestration Engine.
 * Combines outputs from M9.4-M10.3 into one deterministic orchestration recommendation.
 * 
 * STRICT BOUNDARIES:
 * - Pure, deterministic, side-effect free function.
 * - 0 API calls, 0 DB writes, 0 storage writes, 0 side effects.
 * - Does NOT execute retries, enable autonomy, modify policy, or alter recovery lifecycles.
 * - Strictly merchant-scoped.
 * 
 * @param {Object} prioritizedCase - Output from evaluateEvidenceAwarePriority()
 * @param {Object|null} schedulingResult - Output for case from scheduleRecoveryDecisions()
 * @param {Object|null} baselineStrategy - M9.4 baseline strategy
 * @param {Object|null} adaptiveStrategy - M9.6 adaptive strategy
 * @param {Object|null} learningResult - M9.7 learning result
 * @param {Object|null} feedbackResult - M9.9 feedback result
 * @param {Object|null} policyDecision - Policy assessment
 * @param {Object|null} autonomyAssessment - Autonomy eligibility assessment
 * @param {Object|null} executionState - Current candidate execution state
 * @param {Object|null} lifecycleOutcome - Backend lifecycle status
 * @param {string|null} currentMerchantId - Active merchant ID
 * @param {string|null} currentTime - ISO timestamp
 * @returns {Object} Structured decision orchestration contract
 */
export function orchestrateRecoveryDecision(
  prioritizedCase,
  schedulingResult = null,
  baselineStrategy = null,
  adaptiveStrategy = null,
  learningResult = null,
  feedbackResult = null,
  policyDecision = null,
  autonomyAssessment = null,
  executionState = null,
  lifecycleOutcome = null,
  currentMerchantId = null,
  currentTime = new Date().toISOString()
) {
  const timestamp = new Date().toISOString();

  if (!prioritizedCase || !prioritizedCase.caseId) {
    return {
      caseIdentity: { caseId: 'UNKNOWN', customerId: 'Unknown', productName: 'Unknown', merchantId: currentMerchantId, amount: 0, currency: 'INR' },
      currentState: { status: 'UNKNOWN' },
      priorityAssessment: { queueScore: 0, priorityTier: 'LOW', queueCategory: 'LOW_PRIORITY', rank: 0 },
      schedulingAssessment: { decisionWindow: 'NORMAL', recommendedDecisionTime: 'No decision', schedulingCategory: 'NORMAL' },
      strategyAssessment: { baseline: 'RETRY_PAYMENT', adaptive: 'RETRY_PAYMENT', final: 'RETRY_PAYMENT' },
      evidenceAssessment: { quality: 'LIMITED', sampleSize: 0 },
      learningAssessment: { confidence: 'LOW', effectiveness: 'UNKNOWN' },
      feedbackAssessment: { alignment: 'UNKNOWN', calibration: 'INSUFFICIENT_DATA' },
      policyAssessment: { status: 'ALLOWED', reason: 'Default policy allowed' },
      autonomyAssessment: { eligible: false, reason: 'Autonomy disabled', executionMode: 'NOT_EXECUTABLE' },
      executionAssessment: { readiness: 'NOT_READY', status: 'IDLE' },
      recommendedDecision: ORCHESTRATED_DECISION_NO_ACTION,
      recommendedAction: 'NONE',
      decisionWindow: 'NORMAL',
      operatorAttention: { required: false, severity: 'NONE', reasons: [] },
      confidence: 'LOW',
      blockingReasons: ['No active case data available'],
      reasoning: {
        summary: 'No active candidate case provided for decision orchestration.',
        positiveFactors: [],
        riskFactors: [],
        decisionBasis: 'None',
        policyBasis: 'None',
        schedulingBasis: 'None',
        evidenceBasis: 'None'
      },
      nextStep: 'No action — invalid candidate identity',
      orchestrationStatus: 'INSUFFICIENT_DATA',
      timestamp
    };
  }

  const caseId = prioritizedCase.caseId;
  const customerId = prioritizedCase.customerId || 'Customer';
  const productId = prioritizedCase.productId || prioritizedCase.originalCase?.productId || null;
  const productName = prioritizedCase.productName || 'Product';
  const amount = prioritizedCase.amountAtRisk || 0;
  const currency = prioritizedCase.currency || 'INR';

  const rawState = lifecycleOutcome?.status || prioritizedCase.originalCase?.status || 'FAILED';
  const isRecovered = rawState === 'RECOVERED' || rawState === 'SUCCESS' || lifecycleOutcome?.isRecovered;
  const isExecuting = executionState?.status === 'EXECUTING' || rawState === 'EXECUTING';

  const retryCount = Number(prioritizedCase.retryCount) || 0;
  const maxRetryLimit = Number(prioritizedCase.maxRetryLimit) || 3;
  const policyStatus = policyDecision?.status || prioritizedCase.policyStatus || 'ALLOWED';

  const baseStrat = baselineStrategy?.strategy || 'RETRY_PAYMENT';
  const optStrat = adaptiveStrategy?.optimizedStrategy || prioritizedCase.recommendedStrategy || baseStrat;
  const finalStrat = optStrat;

  const evidenceQuality = prioritizedCase.evidenceQuality || 'LIMITED';
  const sampleSize = prioritizedCase.sampleSize || 0;
  const confLevel = prioritizedCase.decisionConfidence || 'MEDIUM';

  const decisionWindow = schedulingResult?.recommendedDecisionWindow || prioritizedCase.recommendedDecisionWindow || 'NORMAL';
  const recommendedDecisionTime = schedulingResult?.recommendedDecisionTime || prioritizedCase.recommendedDecisionTime || 'Within 1-2 hours';

  const autonomyEligible = autonomyAssessment?.eligible || (autonomyAssessment?.executionMode === 'AUTONOMOUS');
  const executionMode = autonomyAssessment?.executionMode || (autonomyEligible ? 'AUTONOMOUS' : (policyStatus === 'ALLOWED' ? 'MANUAL' : 'NOT_EXECUTED'));

  const operatorAttentionReasons = [];
  let operatorSeverity = 'NONE';
  let operatorRequired = false;

  // 1. Decision Hierarchy Evaluation
  let recommendedDecision = ORCHESTRATED_DECISION_NO_ACTION;
  let recommendedAction = 'NONE';
  let executionReadiness = 'NOT_READY';
  let nextStep = '';
  const blockingReasons = [];

  // Hierarchy Level 1: Backend Lifecycle State (RECOVERED / SUCCESS)
  if (isRecovered) {
    recommendedDecision = ORCHESTRATED_DECISION_NO_ACTION;
    recommendedAction = 'NONE';
    executionReadiness = 'READY';
    nextStep = 'No action — recovery already confirmed';
  }
  // Hierarchy Level 2: Backend Executing State
  else if (isExecuting) {
    recommendedDecision = ORCHESTRATED_DECISION_WAIT_FOR_OUTCOME;
    recommendedAction = 'NONE';
    executionReadiness = 'WAITING';
    nextStep = 'Wait for payment outcome';
  }
  // Hierarchy Level 3: Policy BLOCKED or Retry Limit Reached
  else if (policyStatus === 'BLOCKED' || retryCount >= maxRetryLimit) {
    recommendedDecision = ORCHESTRATED_DECISION_BLOCKED;
    recommendedAction = 'NONE';
    executionReadiness = 'BLOCKED';
    if (policyStatus === 'BLOCKED') blockingReasons.push(`Merchant policy status is BLOCKED (${policyDecision?.reason || 'Rule violation'}).`);
    if (retryCount >= maxRetryLimit) blockingReasons.push(`Max retry limit reached (${retryCount}/${maxRetryLimit}).`);
    nextStep = 'Case blocked by policy or max retry limit';
    operatorRequired = true;
    operatorSeverity = 'HIGH';
    operatorAttentionReasons.push(...blockingReasons);
  }
  // Hierarchy Level 4: Policy REVIEW_REQUIRED or Operator Review Strategy
  else if (policyStatus === 'REVIEW_REQUIRED' || optStrat === 'OPERATOR_REVIEW' || prioritizedCase.operatorReviewRequired) {
    recommendedDecision = ORCHESTRATED_DECISION_OPERATOR_REVIEW;
    recommendedAction = 'NONE';
    executionReadiness = 'NOT_READY';
    nextStep = 'Operator manual evaluation required';
    operatorRequired = true;
    operatorSeverity = 'WARNING';
    if (policyStatus === 'REVIEW_REQUIRED') operatorAttentionReasons.push('Merchant policy requires human operator review.');
    if (retryCount >= maxRetryLimit - 1) operatorAttentionReasons.push(`Approaching max retry limit (${retryCount}/${maxRetryLimit}).`);
  }
  // Hierarchy Level 5: LIMITED Evidence / LOW Confidence (Non-Critical)
  else if ((evidenceQuality === 'LIMITED' || confLevel === 'LOW') && prioritizedCase.priorityTier !== 'CRITICAL') {
    recommendedDecision = ORCHESTRATED_DECISION_DEFER;
    recommendedAction = 'NONE';
    executionReadiness = 'NOT_READY';
    nextStep = 'Defer decision until stronger evidence is available';
    if (evidenceQuality === 'LIMITED') operatorAttentionReasons.push(`Limited historical observations (${sampleSize}/${MIN_SAMPLE_THRESHOLD}).`);
  }
  // Hierarchy Level 6: Strategy MONITOR
  else if (optStrat === 'MONITOR') {
    recommendedDecision = ORCHESTRATED_DECISION_MONITOR;
    recommendedAction = 'NONE';
    executionReadiness = 'NOT_READY';
    nextStep = 'Monitor payment lifecycle';
  }
  // Hierarchy Level 7: Actionable Candidate (IMMEDIATE)
  else if (decisionWindow === 'IMMEDIATE' && policyStatus === 'ALLOWED' && optStrat === 'RETRY_PAYMENT') {
    recommendedDecision = ORCHESTRATED_DECISION_RETRY_NOW;
    recommendedAction = 'RETRY_PAYMENT';
    executionReadiness = 'READY';
    nextStep = autonomyEligible ? 'Autonomous retry execution ready' : 'Retry payment now (Operator manual trigger)';
  }
  // Hierarchy Level 8: Actionable Candidate (SHORT_TERM)
  else if (decisionWindow === 'SHORT_TERM' && policyStatus === 'ALLOWED') {
    recommendedDecision = ORCHESTRATED_DECISION_RETRY_SHORT_TERM;
    recommendedAction = 'RETRY_PAYMENT';
    executionReadiness = 'READY';
    nextStep = 'Schedule short-term retry decision';
  }
  // Hierarchy Level 9: All Other Candidates
  else {
    recommendedDecision = ORCHESTRATED_DECISION_DEFER;
    recommendedAction = 'NONE';
    executionReadiness = 'NOT_READY';
    nextStep = 'Defer decision for further evidence collection';
  }

  // Milestone 10.8 — Lifecycle State Machine Transition Governance Evaluation
  const currentCanonicalState = isRecovered ? STATE_RECOVERED : (isExecuting ? STATE_EXECUTING : (rawState === 'FAILED' ? STATE_FAILED : STATE_OPEN));
  const proposedNextState = (recommendedDecision === ORCHESTRATED_DECISION_RETRY_NOW || recommendedDecision === ORCHESTRATED_DECISION_RETRY_SHORT_TERM) ? STATE_EXECUTING : currentCanonicalState;

  const transitionGovernance = evaluateRecoveryLifecycleTransition(
    currentCanonicalState,
    proposedNextState,
    {
      merchantId: currentMerchantId,
      caseId,
      customerId,
      productId,
      terminal: isRecovered || retryCount >= maxRetryLimit || policyStatus === 'BLOCKED',
      authoritativeStatus: rawState
    }
  );

  if ((recommendedDecision === ORCHESTRATED_DECISION_RETRY_NOW || recommendedDecision === ORCHESTRATED_DECISION_RETRY_SHORT_TERM) && !transitionGovernance.allowed) {
    recommendedDecision = ORCHESTRATED_DECISION_BLOCKED;
    recommendedAction = 'NONE';
    executionReadiness = 'BLOCKED';
    blockingReasons.push(`Lifecycle transition blocked: ${transitionGovernance.reason}`);
    nextStep = `Transition blocked — ${transitionGovernance.reason}`;
  }

  // 2. Structured Rationale Assembly
  const positiveFactors = prioritizedCase.positiveFactors || [];
  const riskFactors = prioritizedCase.negativeFactors || [];

  const summary = isRecovered
    ? `Recovery confirmed for ${customerId} (${productName}). No further action required.`
    : `Orchestrated decision: ${recommendedDecision} for ${customerId} (${productName}). Next Step: ${nextStep}.`;

  const reasoning = {
    summary,
    positiveFactors,
    riskFactors,
    decisionBasis: `Strategy ${finalStrat} (Baseline: ${baseStrat}) mapped to decision window ${decisionWindow}.`,
    policyBasis: `Policy status is ${policyStatus}. Retry count: ${retryCount}/${maxRetryLimit}.`,
    schedulingBasis: `Decision window is ${decisionWindow}. Recommended decision time: ${recommendedDecisionTime}.`,
    evidenceBasis: `Evidence quality is ${evidenceQuality} (${sampleSize} cases) with ${confLevel} confidence.`
  };

  return {
    caseIdentity: { caseId, customerId, productId, productName, merchantId: currentMerchantId, amount, currency },
    currentState: { status: rawState },
    canonicalLifecycleState: currentCanonicalState,
    priorityAssessment: { queueScore: prioritizedCase.queueScore || 0, priorityTier: prioritizedCase.priorityTier || 'MEDIUM', queueCategory: prioritizedCase.queueCategory || 'LOW_PRIORITY', rank: prioritizedCase.rank || 0 },
    schedulingAssessment: { decisionWindow, recommendedDecisionTime, schedulingCategory: decisionWindow },
    strategyAssessment: { baseline: baseStrat, adaptive: optStrat, final: finalStrat },
    evidenceAssessment: { quality: evidenceQuality, sampleSize },
    learningAssessment: { confidence: confLevel, effectiveness: learningResult?.strategyEffectiveness || 'UNKNOWN' },
    feedbackAssessment: { alignment: feedbackResult?.outcomeAlignment || 'UNKNOWN', calibration: feedbackResult?.calibrationStatus || 'INSUFFICIENT_DATA' },
    policyAssessment: { status: policyStatus, reason: policyDecision?.reason || 'Policy evaluation completed' },
    autonomyAssessment: { eligible: autonomyEligible, reason: autonomyAssessment?.reason || 'Autonomy check completed', executionMode },
    executionAssessment: { readiness: executionReadiness, status: executionState?.status || 'IDLE' },
    recommendedDecision,
    recommendedAction,
    decisionWindow,
    operatorAttention: { required: operatorRequired, severity: operatorSeverity, reasons: operatorAttentionReasons },
    confidence: confLevel,
    blockingReasons,
    reasoning,
    nextStep,
    transitionGovernance,
    orchestrationStatus: 'SUCCESS',
    timestamp
  };
}

/**
 * Milestone 10.3 — Decision Window Constants
 */
export const DECISION_WINDOW_IMMEDIATE = 'IMMEDIATE';
export const DECISION_WINDOW_SHORT_TERM = 'SHORT_TERM';
export const DECISION_WINDOW_NORMAL = 'NORMAL';
export const DECISION_WINDOW_DEFERRED = 'DEFERRED';
export const DECISION_WINDOW_OPERATOR_REVIEW = 'OPERATOR_REVIEW';
export const DECISION_WINDOW_BLOCKED = 'BLOCKED';

/**
 * Milestone 10.3 — Pure Decision Scheduling Engine.
 * Consumes output from prioritizeRecoveryCases() (M10.2) and assigns decision windows & recommended decision times.
 * 
 * STRICT BOUNDARIES:
 * - Pure, deterministic, side-effect free function.
 * - 0 API calls, 0 DB writes, 0 storage writes, 0 side effects.
 * - Does NOT execute retries, enable autonomy, modify policy, or create cron/timers.
 * - Strictly merchant-scoped.
 * 
 * @param {Object} prioritizedResult - Output from prioritizeRecoveryCases()
 * @param {Object|null} historicalPerformance - Strategy performance data
 * @param {Object|null} learningContext - Learning/confidence data
 * @param {Object|null} policyContext - Merchant policy context
 * @param {boolean} autonomyEnabled - Merchant autonomy configuration state
 * @param {string|null} currentTime - ISO timestamp for evaluation
 * @returns {Object} Structured decision scheduling model
 */
export function scheduleRecoveryDecisions(
  prioritizedResult,
  historicalPerformance = null,
  learningContext = null,
  policyContext = null,
  autonomyEnabled = false,
  currentTime = new Date().toISOString()
) {
  const timestamp = new Date().toISOString();

  const emptySummary = {
    totalCases: 0,
    immediateCount: 0,
    shortTermCount: 0,
    normalCount: 0,
    deferredCount: 0,
    operatorReviewCount: 0,
    blockedCount: 0,
    staleCount: 0,
    limitedEvidenceCount: 0,
    uncertainCount: 0
  };

  if (!prioritizedResult || !Array.isArray(prioritizedResult.queue) || prioritizedResult.queue.length === 0) {
    return {
      scheduledCases: [],
      immediateCases: [],
      shortTermCases: [],
      normalCases: [],
      deferredCases: [],
      operatorReviewCases: [],
      blockedCases: [],
      schedulingSummary: emptySummary,
      schedulingStatus: 'INSUFFICIENT_DATA',
      timestamp
    };
  }

  const queue = prioritizedResult.queue;

  const scheduledCases = queue.map((item) => {
    const queueScore = item.queueScore || 0;
    const evidenceQuality = item.evidenceQuality || 'LIMITED';
    const confLevel = item.confidenceScore >= 80 ? 'HIGH' : (item.confidenceScore >= 50 ? 'MEDIUM' : 'LOW');
    const policyStatus = item.policyStatus || 'ALLOWED';
    const retryCount = item.retryCount || 0;
    const maxRetryLimit = item.maxRetryLimit || 3;
    const stalenessCategory = item.stalenessCategory || 'FRESH';
    const strategyDriftCategory = item.strategyDriftCategory || 'STABLE';
    const operatorReviewRequired = item.operatorReviewRequired || item.queueCategory === 'OPERATOR_REVIEW';

    let recommendedDecisionWindow = DECISION_WINDOW_NORMAL;
    let recommendedDecisionTime = 'Within 1-2 hours';
    let deferReason = null;
    let urgencyReason = null;

    // Rule 1: Policy BLOCKED or Retry Limit Reached -> BLOCKED Window
    if (policyStatus === 'BLOCKED' || retryCount >= maxRetryLimit) {
      recommendedDecisionWindow = DECISION_WINDOW_BLOCKED;
      recommendedDecisionTime = 'No decision';
      deferReason = `Execution blocked by policy (${policyStatus}) or max retry limit (${retryCount}/${maxRetryLimit}).`;
    }
    // Rule 2: Operator Review Required / Retry Limit Approaching / Strategy Degrading -> OPERATOR_REVIEW Window
    else if (operatorReviewRequired || item.queueCategory === 'OPERATOR_REVIEW' || retryCount >= maxRetryLimit - 1 || strategyDriftCategory === 'DEGRADING') {
      recommendedDecisionWindow = DECISION_WINDOW_OPERATOR_REVIEW;
      recommendedDecisionTime = 'Operator action required';
      if (retryCount >= maxRetryLimit - 1) {
        urgencyReason = `Approaching max retry limit (${retryCount}/${maxRetryLimit}). Operator review required before further retries.`;
      } else if (strategyDriftCategory === 'DEGRADING') {
        urgencyReason = 'Historical strategy degradation detected. Operator evaluation required.';
      } else {
        urgencyReason = 'Operator manual evaluation required.';
      }
    }
    // Rule 3: LIMITED Evidence or LOW Confidence (non-urgent) -> DEFERRED Window
    else if ((evidenceQuality === 'LIMITED' || confLevel === 'LOW' || item.uncertaintyScore >= 50) && item.priorityTier !== 'CRITICAL') {
      recommendedDecisionWindow = DECISION_WINDOW_DEFERRED;
      recommendedDecisionTime = 'Within 2-4 hours';
      deferReason = `Decision deferred due to ${evidenceQuality} evidence (${item.sampleSize || 0} cases) and ${confLevel} confidence level.`;
    }
    // Rule 4: High Score + ALLOWED Policy + Non-LIMITED Evidence -> IMMEDIATE Window
    else if (queueScore >= 60 && item.executionReadiness >= 80 && evidenceQuality !== 'LIMITED') {
      recommendedDecisionWindow = DECISION_WINDOW_IMMEDIATE;
      recommendedDecisionTime = 'Now';
      urgencyReason = `High priority queue score (${queueScore}/100) supported by ${evidenceQuality} evidence and ALLOWED policy.`;
    }
    // Rule 5: Actionable Moderate Score -> SHORT_TERM Window
    else if (queueScore >= 40 && item.executionReadiness >= 80) {
      recommendedDecisionWindow = DECISION_WINDOW_SHORT_TERM;
      recommendedDecisionTime = 'Within 15-30 mins';
      urgencyReason = `Actionable candidate (Score: ${queueScore}/100). Scheduled for short-term evaluation.`;
    }
    // Rule 6: All other valid candidates -> NORMAL Window
    else {
      recommendedDecisionWindow = DECISION_WINDOW_NORMAL;
      recommendedDecisionTime = 'Within 1-2 hours';
    }

    // Anti-Starvation Fairness adjustment: Aging cases (>30m) receive urgency escalation if not blocked
    if (stalenessCategory === 'STALE' && recommendedDecisionWindow === DECISION_WINDOW_NORMAL) {
      recommendedDecisionWindow = DECISION_WINDOW_SHORT_TERM;
      recommendedDecisionTime = 'Within 15-30 mins (Aging Escalation)';
      urgencyReason = 'Case age is STALE (>30 mins). Escalated to short-term window to prevent queue starvation.';
    }

    return {
      ...item,
      schedulingPriority: recommendedDecisionWindow === DECISION_WINDOW_IMMEDIATE ? 1 : 2,
      schedulingCategory: recommendedDecisionWindow,
      recommendedDecisionWindow,
      recommendedDecisionTime,
      deferReason,
      urgencyReason,
      reasoning: item.reasoning || item.deterministicReasoning
    };
  });

  // Group scheduled cases into separate window lists
  const immediateCases = scheduledCases.filter(c => c.recommendedDecisionWindow === DECISION_WINDOW_IMMEDIATE);
  const shortTermCases = scheduledCases.filter(c => c.recommendedDecisionWindow === DECISION_WINDOW_SHORT_TERM);
  const normalCases = scheduledCases.filter(c => c.recommendedDecisionWindow === DECISION_WINDOW_NORMAL);
  const deferredCases = scheduledCases.filter(c => c.recommendedDecisionWindow === DECISION_WINDOW_DEFERRED);
  const operatorReviewCases = scheduledCases.filter(c => c.recommendedDecisionWindow === DECISION_WINDOW_OPERATOR_REVIEW);
  const blockedCases = scheduledCases.filter(c => c.recommendedDecisionWindow === DECISION_WINDOW_BLOCKED);

  const staleCount = scheduledCases.filter(c => c.stalenessCategory === 'STALE').length;
  const limitedEvidenceCount = scheduledCases.filter(c => c.evidenceQuality === 'LIMITED').length;
  const uncertainCount = scheduledCases.filter(c => c.uncertaintyScore >= 50).length;

  let schedulingStatus = 'HEALTHY';
  if (operatorReviewCases.length > 0 || blockedCases.length > 0 || staleCount > 0) {
    schedulingStatus = 'ATTENTION_REQUIRED';
  } else if (limitedEvidenceCount === scheduledCases.length) {
    schedulingStatus = 'INSUFFICIENT_DATA';
  }

  return {
    scheduledCases,
    immediateCases,
    shortTermCases,
    normalCases,
    deferredCases,
    operatorReviewCases,
    blockedCases,
    schedulingSummary: {
      totalCases: scheduledCases.length,
      immediateCount: immediateCases.length,
      shortTermCount: shortTermCases.length,
      normalCount: normalCases.length,
      deferredCount: deferredCases.length,
      operatorReviewCount: operatorReviewCases.length,
      blockedCount: blockedCases.length,
      staleCount,
      limitedEvidenceCount,
      uncertainCount
    },
    schedulingStatus,
    timestamp
  };
}

/**
 * Milestone 10.2 — Evidence-Aware Prioritization Weights.
 * Sum = 1.00. Used for evidence-aware queue ranking ONLY.
 */
export const M102_FINANCIAL_WEIGHT = 0.20;
export const M102_PRIORITY_WEIGHT = 0.15;
export const M102_RECOVERABILITY_WEIGHT = 0.15;
export const M102_EVIDENCE_WEIGHT = 0.15;
export const M102_CONFIDENCE_WEIGHT = 0.10;
export const M102_EXECUTION_READINESS_WEIGHT = 0.10;
export const M102_URGENCY_WEIGHT = 0.05;
export const M102_REPEATED_FAILURE_WEIGHT = 0.05;
export const M102_STALENESS_WEIGHT = 0.05;

/**
 * Milestone 10.2 — Pure Evidence-Aware Priority Evaluator.
 * Evaluates a single active recovery case against 10 evidence-aware criteria.
 * 
 * STRICT BOUNDARIES:
 * - Pure, deterministic, side-effect free function.
 * - 0 API calls, 0 DB writes, 0 storage writes, 0 side effects.
 * - Does NOT execute retries, enable autonomy, modify policy, or alter stored priority.
 * - Strictly merchant-scoped.
 * 
 * @param {Object} activeCase - Candidate recovery case
 * @param {Object|null} historicalPerformance - Output of evaluateStrategyPerformance()
 * @param {Object|null} learningResult - Output of evaluateRecoveryLearning()
 * @param {Object|null} feedbackResult - Output of evaluateRecoveryOutcomeFeedback()
 * @param {Object|null} policyContext - Policy decision context
 * @param {boolean} autonomyEnabled - Merchant autonomy configuration state
 * @param {number} maxAmountAtRisk - Max transaction amount in merchant queue for normalization
 * @param {string|null} currentTime - ISO timestamp for staleness evaluation
 * @returns {Object} Structured evidence-aware priority evaluation
 */
export function evaluateEvidenceAwarePriority(
  activeCase,
  historicalPerformance = null,
  learningResult = null,
  feedbackResult = null,
  policyContext = null,
  autonomyEnabled = false,
  maxAmountAtRisk = 1,
  currentTime = new Date().toISOString()
) {
  if (!activeCase) {
    return {
      caseId: 'UNKNOWN',
      evidenceQuality: 'LIMITED',
      sampleSize: 0,
      uncertaintyScore: 100,
      confidenceScore: 0,
      repeatedFailureScore: 0,
      stalenessScore: 0,
      stalenessCategory: 'FRESH',
      strategyDriftScore: 0,
      strategyDriftCategory: 'UNCERTAIN',
      financialScore: 0,
      priorityScore: 0,
      priorityCategory: 'LOW_PRIORITY',
      operatorReviewRequired: false,
      rankingFactors: [],
      positiveFactors: [],
      negativeFactors: [],
      nextBestAction: 'None',
      reasoning: 'No active case data available.',
      warnings: []
    };
  }

  const amount = Number(activeCase.amount) || 0;
  const retryCount = Number(activeCase.retryCount) || 0;
  const maxRetryLimit = Number(activeCase.maxRetryLimit) || 3;
  const failureCode = activeCase.failureCode || 'SERVER_ERROR';

  // 1. Evidence Quality & Sample Size (M9.7 convention)
  const sampleSize = historicalPerformance?.overview?.totalCases || 0;
  let evidenceQuality = 'LIMITED';
  let evidenceFactor = 0.3; // Reduces evidence contribution when LIMITED
  if (sampleSize >= 10) {
    evidenceQuality = 'STRONG';
    evidenceFactor = 1.0;
  } else if (sampleSize >= 5) {
    evidenceQuality = 'MODERATE';
    evidenceFactor = 0.7;
  } else {
    evidenceQuality = 'LIMITED';
    evidenceFactor = 0.3;
  }

  // 2. Staleness Evaluation (Backend Timestamp)
  const createdAtTime = new Date(activeCase.createdAt || activeCase.timestamp || currentTime).getTime();
  const nowTime = new Date(currentTime).getTime();
  const ageMinutes = Math.max(0, Math.floor((nowTime - createdAtTime) / (1000 * 60)));
  
  let stalenessCategory = 'FRESH';
  let stalenessScore = 0;
  if (ageMinutes > 30) {
    stalenessCategory = 'STALE';
    stalenessScore = 100;
  } else if (ageMinutes >= 5) {
    stalenessCategory = 'AGING';
    stalenessScore = 50;
  } else {
    stalenessCategory = 'FRESH';
    stalenessScore = 0;
  }

  // 3. Strategy Drift & Performance Signals
  const baseStrat = evaluateRecoveryStrategy(activeCase);
  const adaptiveStrat = optimizeRecoveryStrategy(activeCase, baseStrat, historicalPerformance);
  const learningRes = learningResult || evaluateRecoveryLearning(historicalPerformance, adaptiveStrat, [], activeCase);

  let strategyDriftCategory = 'STABLE';
  let strategyDriftScore = 0;
  if (learningRes.regressionDetected) {
    strategyDriftCategory = 'DEGRADING';
    strategyDriftScore = 100;
  } else if (adaptiveStrat.strategySource === 'HISTORICAL_ADAPTATION') {
    strategyDriftCategory = 'IMPROVING';
    strategyDriftScore = 20;
  } else if (sampleSize < MIN_SAMPLE_THRESHOLD) {
    strategyDriftCategory = 'UNCERTAIN';
    strategyDriftScore = 50;
  }

  // 4. Repeated Failure Penalty
  let repeatedFailureScore = 0;
  if (retryCount === 1) repeatedFailureScore = 30;
  else if (retryCount === 2) repeatedFailureScore = 60;
  else if (retryCount >= 3) repeatedFailureScore = 100;

  // 5. Hardened Financial Score (Dampened by evidence and confidence factors)
  const rawFinancialScore = maxAmountAtRisk <= 1 ? 100 : Math.round((amount / maxAmountAtRisk) * 100);

  // 6. Case Priority Score (0-100)
  const priorityTier = (activeCase.priority || 'MEDIUM').toUpperCase();
  let priorityScore = 60;
  if (priorityTier === 'CRITICAL') priorityScore = 100;
  else if (priorityTier === 'HIGH') priorityScore = 80;
  else if (priorityTier === 'MEDIUM') priorityScore = 60;
  else if (priorityTier === 'LOW') priorityScore = 30;

  // 7. Recoverability & Confidence Scores
  const recRate = historicalPerformance?.overview?.caseRecoveryRate || 0;
  const recoverabilityScore = sampleSize < MIN_SAMPLE_THRESHOLD ? 50 : Math.round(recRate);

  const confLevel = learningRes.confidenceLevel || 'MEDIUM';
  let confidenceScore = 60;
  let confidenceFactor = 0.7;
  if (confLevel === 'HIGH') {
    confidenceScore = 100;
    confidenceFactor = 1.0;
  } else if (confLevel === 'MEDIUM') {
    confidenceScore = 60;
    confidenceFactor = 0.7;
  } else {
    confidenceScore = 30;
    confidenceFactor = 0.4;
  }

  // Uncertainty Score (0-100)
  const uncertaintyScore = Math.round(100 - (confidenceScore * evidenceFactor));

  // 8. Execution Readiness Score (0-100) & Policy Overrides
  const policyStatus = policyContext?.status || (retryCount >= maxRetryLimit ? 'REVIEW_REQUIRED' : 'ALLOWED');
  let executionReadinessScore = 80;
  let operatorReviewRequired = false;

  if (policyStatus === 'BLOCKED') {
    executionReadinessScore = 0;
    operatorReviewRequired = true;
  } else if (retryCount >= maxRetryLimit) {
    executionReadinessScore = 0;
    operatorReviewRequired = true;
  } else if (policyStatus === 'REVIEW_REQUIRED' || adaptiveStrat.optimizedStrategy === 'OPERATOR_REVIEW') {
    executionReadinessScore = 40;
    operatorReviewRequired = true;
  } else if (policyStatus === 'ALLOWED' && autonomyEnabled) {
    executionReadinessScore = 100;
  }

  // 9. Urgency Score (0-100)
  let urgencyScore = priorityScore;
  if (retryCount >= maxRetryLimit - 1) urgencyScore += 15;
  if (stalenessCategory === 'STALE') urgencyScore += 10;
  urgencyScore = Math.min(100, urgencyScore);

  // 10. Composite Evidence-Aware Queue Score Formula
  const hardenedFinancialScore = Math.round(rawFinancialScore * (0.5 + 0.5 * evidenceFactor));

  const rawQueueScore =
    (hardenedFinancialScore * M102_FINANCIAL_WEIGHT) +
    (priorityScore * M102_PRIORITY_WEIGHT) +
    (recoverabilityScore * M102_RECOVERABILITY_WEIGHT) +
    (evidenceFactor * 100 * M102_EVIDENCE_WEIGHT) +
    (confidenceScore * M102_CONFIDENCE_WEIGHT) +
    (executionReadinessScore * M102_EXECUTION_READINESS_WEIGHT) +
    (urgencyScore * M102_URGENCY_WEIGHT) -
    (repeatedFailureScore * M102_REPEATED_FAILURE_WEIGHT) -
    (stalenessScore * M102_STALENESS_WEIGHT);

  const queueScore = Math.max(0, Math.min(100, Math.round(rawQueueScore)));

  // 11. Priority Category Assignment
  let priorityCategory = 'LOW_PRIORITY';
  if (policyStatus === 'BLOCKED' || retryCount >= maxRetryLimit) {
    priorityCategory = 'BLOCKED';
  } else if (operatorReviewRequired || adaptiveStrat.optimizedStrategy === 'OPERATOR_REVIEW' || strategyDriftCategory === 'DEGRADING') {
    priorityCategory = 'OPERATOR_REVIEW';
  } else if (adaptiveStrat.optimizedStrategy === 'MONITOR') {
    priorityCategory = 'MONITOR';
  } else if (queueScore >= 60 && executionReadinessScore >= 80 && evidenceQuality !== 'LIMITED') {
    priorityCategory = 'IMMEDIATE_ACTION';
  } else {
    priorityCategory = 'LOW_PRIORITY';
  }

  // 12. Explainable Ranking Factors (Why #1 vs #2)
  const positiveFactors = [];
  const negativeFactors = [];
  const warnings = [];

  if (evidenceQuality === 'STRONG') positiveFactors.push('STRONG historical evidence');
  else if (evidenceQuality === 'LIMITED') negativeFactors.push('LIMITED historical evidence');

  if (confLevel === 'HIGH') positiveFactors.push('HIGH decision confidence');
  else if (confLevel === 'LOW') negativeFactors.push('LOW decision confidence');

  if (executionReadinessScore >= 80) positiveFactors.push('Policy ALLOWED & execution ready');
  else if (policyStatus === 'BLOCKED') negativeFactors.push('Policy BLOCKED');

  if (retryCount >= 1) {
    negativeFactors.push(`${retryCount} prior failed retry attempt(s)`);
  }

  if (stalenessCategory === 'STALE') {
    negativeFactors.push(`Case is STALE (${ageMinutes}m old)`);
    warnings.push(`Opportunity age is ${ageMinutes} minutes. Verify lifecycle state.`);
  }

  if (strategyDriftCategory === 'DEGRADING') {
    negativeFactors.push('Historical strategy regression detected');
    warnings.push('Strategy recovery performance has degraded below historical baseline.');
  }

  let nextBestAction = 'Trigger retry payment';
  if (priorityCategory === 'BLOCKED') nextBestAction = 'Operator policy review required';
  else if (priorityCategory === 'OPERATOR_REVIEW') nextBestAction = 'Operator manual evaluation required';
  else if (priorityCategory === 'MONITOR') nextBestAction = 'Monitor payment lifecycle';

  // Deterministic Reasoning
  let reasoning = '';
  if (priorityCategory === 'BLOCKED') {
    reasoning = `Execution blocked by policy or max retry limit (${retryCount}/${maxRetryLimit}). Operator attention required.`;
  } else if (evidenceQuality === 'LIMITED') {
    reasoning = `Queue priority score is ${queueScore}/100. Evidence is LIMITED (${sampleSize}/${MIN_SAMPLE_THRESHOLD} cases). Financial impact dampened until more evidence is collected.`;
  } else if (priorityCategory === 'IMMEDIATE_ACTION') {
    reasoning = `High priority queue score (${queueScore}/100) supported by ${evidenceQuality} evidence, ${confLevel} confidence, and ALLOWED policy.`;
  } else {
    reasoning = `Queue priority score is ${queueScore}/100. Category: ${priorityCategory}.`;
  }

  const rankingFactors = [
    { factor: 'Financial Impact', score: hardenedFinancialScore, contribution: Math.round(hardenedFinancialScore * M102_FINANCIAL_WEIGHT), explanation: `₹${amount.toLocaleString()} amount at risk` },
    { factor: 'Evidence Quality', score: Math.round(evidenceFactor * 100), contribution: Math.round(evidenceFactor * 100 * M102_EVIDENCE_WEIGHT), explanation: `${evidenceQuality} evidence (${sampleSize} cases)` },
    { factor: 'Decision Confidence', score: confidenceScore, contribution: Math.round(confidenceScore * M102_CONFIDENCE_WEIGHT), explanation: `${confLevel} confidence level` },
    { factor: 'Execution Readiness', score: executionReadinessScore, contribution: Math.round(executionReadinessScore * M102_EXECUTION_READINESS_WEIGHT), explanation: `Policy ${policyStatus}` }
  ];

  return {
    caseId: activeCase.caseId,
    customerId: activeCase.customerId || 'Customer',
    productName: activeCase.productName || 'Product',
    amountAtRisk: amount,
    currency: activeCase.currency || 'INR',
    failureCode,
    priorityTier,
    evidenceQuality,
    sampleSize,
    uncertaintyScore,
    confidenceScore,
    repeatedFailureScore,
    stalenessScore,
    stalenessCategory,
    strategyDriftScore,
    strategyDriftCategory,
    financialScore: hardenedFinancialScore,
    priorityScore,
    queueScore,
    queueCategory: priorityCategory,
    recommendedStrategy: adaptiveStrat.optimizedStrategy,
    policyStatus,
    autonomyEligibility: autonomyEnabled ? 'ELIGIBLE' : 'NOT_ELIGIBLE',
    retryCount,
    maxRetryLimit,
    operatorReviewRequired,
    rankingFactors,
    positiveFactors,
    negativeFactors,
    nextBestAction,
    reasoning,
    warnings,
    originalCase: activeCase
  };
}

/**
 * Milestone 10.1 — Prioritization Weights.
 * Sum = 1.00. Used for operational queue ranking ONLY.
 */
export const FINANCIAL_WEIGHT = 0.25;
export const PRIORITY_WEIGHT = 0.20;
export const RECOVERABILITY_WEIGHT = 0.15;
export const STRATEGY_EFFECTIVENESS_WEIGHT = 0.15;
export const CONFIDENCE_WEIGHT = 0.10;
export const EXECUTION_READINESS_WEIGHT = 0.10;
export const URGENCY_WEIGHT = 0.05;

/**
 * Milestone 10.1 — Intelligent Recovery Case Prioritization Engine.
 * Evaluates active merchant recovery cases and ranks them by queue score (0-100).
 * 
 * STRICT BOUNDARIES:
 * - Pure, deterministic, side-effect free function.
 * - 0 API calls, 0 DB writes, 0 storage writes, 0 side effects.
 * - Does NOT execute retries, enable autonomy, modify policy, or alter stored priority.
 * - Strictly merchant-scoped.
 * 
 * @param {Array|null} activeCases - List of unrecovered active cases for current merchant
 * @param {Object|null} historicalPerformance - Output of evaluateStrategyPerformance()
 * @param {string|null} currentMerchantId - Active merchant ID
 * @param {Object|null} policyContext - Policy decision context
 * @param {boolean} autonomyEnabled - Merchant autonomy state
 * @returns {Object} Structured prioritized queue contract { queue, summary, prioritizationStatus }
 */
export function prioritizeRecoveryCases(
  activeCases = [],
  historicalPerformance = null,
  currentMerchantId = null,
  policyContext = null,
  autonomyEnabled = false
) {
  const timestamp = new Date().toISOString();

  if (!Array.isArray(activeCases) || activeCases.length === 0) {
    return {
      queue: [],
      summary: {
        totalCases: 0,
        immediateActionCount: 0,
        operatorReviewCount: 0,
        monitorCount: 0,
        blockedCount: 0,
        lowPriorityCount: 0,
        totalAmountAtRisk: 0,
        highestPriorityCaseId: null,
        averageQueueScore: 0
      },
      prioritizationStatus: 'INSUFFICIENT_DATA',
      timestamp
    };
  }

  // 1. Merchant Filtering Safety & Terminal Case Exclusion (M10.7)
  const merchantCases = activeCases.filter(c => {
    const fin = finalizeRecoveryLifecycle(null, c, currentMerchantId);
    return (!currentMerchantId || c.merchantId === currentMerchantId) && fin.active === true && fin.terminal === false;
  });

  if (merchantCases.length === 0) {
    return {
      queue: [],
      summary: {
        totalCases: 0,
        immediateActionCount: 0,
        operatorReviewCount: 0,
        monitorCount: 0,
        blockedCount: 0,
        lowPriorityCount: 0,
        totalAmountAtRisk: 0,
        highestPriorityCaseId: null,
        averageQueueScore: 0
      },
      prioritizationStatus: 'INSUFFICIENT_DATA',
      timestamp
    };
  }

  // Find max amount at risk for financial normalization
  const maxAmountAtRisk = Math.max(...merchantCases.map(c => Number(c.amount) || 0), 1);

  // 2. Evaluate candidate evidence-aware sub-scores & queueScores using M10.2 pure evaluator
  const scoredItems = merchantCases.map(c => {
    return evaluateEvidenceAwarePriority(
      c,
      historicalPerformance,
      null,
      null,
      policyContext,
      autonomyEnabled,
      maxAmountAtRisk
    );
  });

  // 3. Deterministic Sorting Hierarchy
  // Rule 1: Executable cases before BLOCKED cases
  // Rule 2: queueScore descending
  // Rule 3: priorityScore descending
  // Rule 4: amountAtRisk descending
  // Rule 5: caseId string ascending (Tie-breaker)
  scoredItems.sort((a, b) => {
    const aBlocked = a.queueCategory === 'BLOCKED' ? 1 : 0;
    const bBlocked = b.queueCategory === 'BLOCKED' ? 1 : 0;
    if (aBlocked !== bBlocked) return aBlocked - bBlocked;

    if (b.queueScore !== a.queueScore) return b.queueScore - a.queueScore;
    if (b.amountAtRisk !== a.amountAtRisk) return b.amountAtRisk - a.amountAtRisk;
    return String(a.caseId).localeCompare(String(b.caseId));
  });

  // Assign sequential rank (#1, #2, #3...)
  const queue = scoredItems.map((item, idx) => ({
    ...item,
    rank: idx + 1
  }));

  // 4. M10.2 Enhanced Queue Summary Computation
  const immediateActionCount = queue.filter(q => q.queueCategory === 'IMMEDIATE_ACTION').length;
  const operatorReviewCount = queue.filter(q => q.queueCategory === 'OPERATOR_REVIEW').length;
  const monitorCount = queue.filter(q => q.queueCategory === 'MONITOR').length;
  const blockedCount = queue.filter(q => q.queueCategory === 'BLOCKED').length;
  const lowPriorityCount = queue.filter(q => q.queueCategory === 'LOW_PRIORITY').length;
  const limitedEvidenceCount = queue.filter(q => q.evidenceQuality === 'LIMITED').length;
  const staleCasesCount = queue.filter(q => q.stalenessCategory === 'STALE').length;
  const repeatedFailureCasesCount = queue.filter(q => q.retryCount >= 1).length;
  const highConfidenceCasesCount = queue.filter(q => q.confidenceScore >= 80).length;
  const uncertainCasesCount = queue.filter(q => q.uncertaintyScore >= 50).length;

  const totalAmountAtRisk = queue.reduce((sum, q) => sum + q.amountAtRisk, 0);
  const avgScore = Math.round(queue.reduce((sum, q) => sum + q.queueScore, 0) / queue.length);

  let prioritizationStatus = 'HEALTHY';
  if (operatorReviewCount > 0 || blockedCount > 0 || staleCasesCount > 0) {
    prioritizationStatus = 'ATTENTION_REQUIRED';
  } else if (limitedEvidenceCount === queue.length) {
    prioritizationStatus = 'INSUFFICIENT_DATA';
  }

  return {
    queue,
    summary: {
      totalCases: queue.length,
      immediateActionCount,
      operatorReviewCount,
      monitorCount,
      blockedCount,
      lowPriorityCount,
      limitedEvidenceCount,
      staleCasesCount,
      repeatedFailureCasesCount,
      highConfidenceCasesCount,
      uncertainCasesCount,
      totalAmountAtRisk,
      highestPriorityCaseId: queue[0]?.caseId || null,
      averageQueueScore: avgScore
    },
    prioritizationStatus,
    timestamp
  };
}

/**
 * Milestone 10.0 — Autonomous Recovery Intelligence Control Center Aggregator.
 * Orchestrates M7–M9.9 recovery intelligence into a consolidated control center model.
 * 
 * STRICT BOUNDARIES:
 * - Pure, deterministic, side-effect free function.
 * - 0 API calls, 0 DB writes, 0 storage writes, 0 side effects.
 * - Does NOT execute retries, enable autonomy, modify policy, or alter recovery lifecycles.
 * - Strictly merchant-scoped.
 * 
 * @param {Array|null} recoveryEvents - Raw backend recovery events
 * @param {string|null} currentMerchantId - Active merchant ID
 * @param {Object|null} runtimeState - Active recovery context runtime state
 * @param {boolean} autonomyEnabled - Merchant autonomy configuration state
 * @returns {Object} Structured control center intelligence model
 */
export function buildRecoveryIntelligenceControlCenter(
  recoveryEvents = [],
  currentMerchantId = null,
  runtimeState = null,
  autonomyEnabled = false
) {
  const timestamp = new Date().toISOString();

  // 1. Base Agent Console State (M8/M9.1)
  const consoleState = getAgentConsoleState(runtimeState, recoveryEvents, recoveryEvents, currentMerchantId, autonomyEnabled);
  
  // 2. Strategy Performance Analytics (M9.5)
  const strategyPerf = evaluateStrategyPerformance(recoveryEvents, [], currentMerchantId);

  // 3. Evaluate Active Opportunities & Primary Candidate
  const allCasesList = consoleState?.allCases || consoleState?.activeCases || [];
  const activeCases = consoleState?.activeCases || allCasesList.filter(c => {
    const fin = finalizeRecoveryLifecycle(null, c, currentMerchantId);
    return fin.active === true && fin.terminal === false;
  });
  const primaryCase = activeCases.length > 0 ? activeCases[0] : null;

  // 4. Primary Decision Pipeline Evaluation (M9.4 - M9.9)
  let decisionTrace = null;
  let outcomeFeedback = null;
  if (primaryCase) {
    const baseStrat = evaluateRecoveryStrategy(primaryCase);
    const adaptiveStrat = optimizeRecoveryStrategy(primaryCase, baseStrat, strategyPerf);
    const learningRes = evaluateRecoveryLearning(strategyPerf, adaptiveStrat, recoveryEvents, primaryCase);
    
    decisionTrace = buildRecoveryDecisionTrace(
      primaryCase,
      baseStrat,
      adaptiveStrat,
      learningRes,
      { status: consoleState.agentDecision?.policyStatus || 'ALLOWED', reason: consoleState.agentDecision?.policyReason },
      { mode: autonomyEnabled ? 'AUTONOMOUS' : 'MANUAL', status: 'IDLE', actor: autonomyEnabled ? 'Autonomous AI Agent' : 'Merchant Operator' },
      { status: primaryCase.status }
    );

    outcomeFeedback = evaluateRecoveryOutcomeFeedback(
      decisionTrace,
      { status: primaryCase.status },
      strategyPerf,
      currentMerchantId
    );
  }

  // 5. Reconciliation Analytics & Operator Attention Assembly (M10.6)
  const reconciliationMetrics = {
    confirmedRecoveries: 0,
    failedExecutions: 0,
    pendingOutcomes: 0,
    inconsistentOutcomes: 0,
    insufficientDataOutcomes: 0
  };

  const operatorAttentionQueue = [];

  (recoveryEvents || []).forEach(e => {
    const rec = reconcileRecoveryExecutionOutcome(null, null, e, e, currentMerchantId, timestamp);
    if (rec.reconciliationStatus === RECONCILIATION_CONFIRMED) reconciliationMetrics.confirmedRecoveries++;
    else if (rec.reconciliationStatus === RECONCILIATION_FAILED) reconciliationMetrics.failedExecutions++;
    else if (rec.reconciliationStatus === RECONCILIATION_PENDING) reconciliationMetrics.pendingOutcomes++;
    else if (rec.reconciliationStatus === RECONCILIATION_INCONSISTENT) reconciliationMetrics.inconsistentOutcomes++;
    else if (rec.reconciliationStatus === RECONCILIATION_INSUFFICIENT_DATA) reconciliationMetrics.insufficientDataOutcomes++;

    if (rec.inconsistencies?.length > 0) {
      rec.inconsistencies.forEach(inc => {
        operatorAttentionQueue.push({
          id: `att_inc_${e.id || e.activityId || 'rec'}_${inc.type}`,
          severity: inc.severity || 'HIGH',
          title: `Outcome Reconciliation: ${inc.type}`,
          caseId: e.activityId || e.id || 'UNKNOWN',
          reason: inc.description,
          recommendation: 'Perform manual operator review to verify backend lifecycle state.'
        });
      });
    }
  });

  // Check 1: Sample Size Insufficiency
  if (strategyPerf.overview.totalCases < MIN_SAMPLE_THRESHOLD) {
    operatorAttentionQueue.push({
      id: 'att_sample_size',
      severity: 'INFO',
      title: 'Limited Historical Observations',
      caseId: primaryCase?.caseId || 'ALL',
      reason: `Merchant historical recovery sample size (${strategyPerf.overview.totalCases}/${MIN_SAMPLE_THRESHOLD}) is below threshold for strong adaptive optimization.`,
      recommendation: 'Observe system activity as new payment recovery lifecycles complete.'
    });
  }

  const transitionMetrics = {
    validTransitions: 0,
    blockedTransitions: 0,
    invalidTransitions: 0,
    terminalProtectionBlocks: 0,
    merchantMismatchBlocks: 0,
    unresolvedCorrelationTransitions: 0,
    operatorReviewTransitions: 0
  };

  // Check 2: Policy Blocked Candidates & Terminal Blocked Lifecycles (M10.7 & M10.8)
  allCasesList.forEach(c => {
    const fin = finalizeRecoveryLifecycle(null, c, currentMerchantId);
    const canonicalState = getCanonicalLifecycleState(fin.lifecycleClassification, fin.recoveryOutcome);
    const transitionRes = evaluateRecoveryLifecycleTransition(canonicalState, canonicalState, {
      merchantId: currentMerchantId,
      caseId: c.caseId,
      activityId: c.activityId,
      paymentAttemptId: c.paymentAttemptId,
      customerId: c.customerId,
      productId: c.productId,
      terminal: fin.terminal,
      authoritativeStatus: fin.recoveryOutcome
    });

    if (transitionRes.transitionType === TRANSITION_TYPE_VALID) transitionMetrics.validTransitions++;
    else if (transitionRes.transitionType === TRANSITION_TYPE_TERMINAL_BLOCKED) {
      transitionMetrics.terminalProtectionBlocks++;
      transitionMetrics.blockedTransitions++;
    } else if (transitionRes.transitionType === TRANSITION_TYPE_MERCHANT_MISMATCH) {
      transitionMetrics.merchantMismatchBlocks++;
      transitionMetrics.blockedTransitions++;
    } else if (transitionRes.transitionType === TRANSITION_TYPE_CORRELATION_UNRESOLVED) {
      transitionMetrics.unresolvedCorrelationTransitions++;
      transitionMetrics.blockedTransitions++;
    } else if (transitionRes.transitionType === TRANSITION_TYPE_INVALID) {
      transitionMetrics.invalidTransitions++;
    } else if (transitionRes.transitionType === TRANSITION_TYPE_OPERATOR_REVIEW) {
      transitionMetrics.operatorReviewTransitions++;
    }

    if (fin.terminal && fin.lifecycleClassification === 'TERMINAL_BLOCKED') {
      operatorAttentionQueue.push({
        id: `att_term_block_${c.caseId}`,
        severity: fin.operatorAttention?.severity || 'WARNING',
        title: fin.operatorAttention?.title || 'Operator Review Required',
        caseId: c.caseId,
        reason: `Case ${c.customerId} (${c.productName}) reached retry limit or requires human operator evaluation.`,
        recommendation: 'Review lifecycle history in Agent Console. Case is terminal blocked.'
      });
    } else if (fin.active && !fin.terminal) {
      const strat = evaluateRecoveryStrategy(c);
      if (strat.strategy === 'OPERATOR_REVIEW' || c.retryCount >= 1) {
        operatorAttentionQueue.push({
          id: `att_pol_block_${c.caseId}`,
          severity: 'WARNING',
          title: 'Operator Review Required',
          caseId: c.caseId,
          reason: `Case ${c.customerId} (${c.productName}) reached retry limit or requires human operator evaluation.`,
          recommendation: 'Review opportunity in Agent Console and trigger manual retry if appropriate.'
        });
      }
    }
  });

  // Check 3: Overconfident Prediction Misalignment (M9.9)
  if (outcomeFeedback && outcomeFeedback.confidenceCalibration === 'OVERCONFIDENT') {
    operatorAttentionQueue.push({
      id: 'att_overconfident',
      severity: 'HIGH',
      title: 'Confidence Calibration Misalignment',
      caseId: primaryCase?.caseId || 'PRIMARY',
      reason: `Previous high-confidence recommendation failed retry attempt. Strategy calibration status set to NEEDS_REVIEW.`,
      recommendation: 'Inspect error logs and consider adjusting policy thresholds.'
    });
  }

  // Check 4: Historical Strategy Regression (M9.7)
  if (strategyPerf.overview.caseRecoveryRate < 40 && strategyPerf.overview.totalCases >= MIN_SAMPLE_THRESHOLD) {
    operatorAttentionQueue.push({
      id: 'att_regression',
      severity: 'HIGH',
      title: 'Strategy Recovery Degradation',
      caseId: 'MERCHANT_BASELINE',
      reason: `Merchant case recovery rate (${strategyPerf.overview.caseRecoveryRate}%) is below historical target threshold (40%).`,
      recommendation: 'Evaluate payment gateway connectivity and rule thresholds.'
    });
  }

  // 6. Control Center Status Classification
  let controlCenterStatus = 'HEALTHY';
  const hasCritical = operatorAttentionQueue.some(item => item.severity === 'CRITICAL');
  const hasHigh = operatorAttentionQueue.some(item => item.severity === 'HIGH');
  const hasWarning = operatorAttentionQueue.some(item => item.severity === 'WARNING');

  if (hasCritical || hasHigh) {
    controlCenterStatus = 'ATTENTION_REQUIRED';
  } else if (hasWarning) {
    controlCenterStatus = 'ATTENTION_REQUIRED';
  } else if (strategyPerf.overview.totalCases < MIN_SAMPLE_THRESHOLD) {
    controlCenterStatus = 'INSUFFICIENT_DATA';
  } else {
    controlCenterStatus = 'HEALTHY';
  }

  const lifecycleHistory = buildRecoveryLifecycleHistory(recoveryEvents, [], currentMerchantId);
  const lifecycleAuditHealth = {
    totalAuditedLifecycles: lifecycleHistory.lifecycles.length,
    activeLifecycles: lifecycleHistory.activeLifecycleCount,
    recoveredLifecycles: lifecycleHistory.recoveredLifecycleCount,
    blockedLifecycles: lifecycleHistory.blockedLifecycleCount,
    unresolvedLifecycles: lifecycleHistory.unresolvedLifecycleCount,
    transitionEvents: lifecycleHistory.transitionCount,
    blockedTransitionEvents: transitionMetrics.blockedTransitions,
    operatorReviewEvents: operatorAttentionQueue.length
  };

  let totalAnomalousLifecycles = 0;
  let criticalAnomalies = 0;
  let highSeverityAnomalies = 0;
  let warningAnomalies = 0;
  let operatorReviewRequiredCount = 0;

  (lifecycleHistory?.lifecycles || []).forEach(lc => {
    const diagnostic = buildRecoveryLifecycleAnomalyDiagnostic(lc, lc.transitions?.length ? lc.transitions.length - 1 : 0, currentMerchantId);
    if (diagnostic.hasAnomaly) {
      totalAnomalousLifecycles++;
      if (diagnostic.anomalySeverity === 'CRITICAL') criticalAnomalies++;
      else if (diagnostic.anomalySeverity === 'HIGH') highSeverityAnomalies++;
      else if (diagnostic.anomalySeverity === 'WARNING') warningAnomalies++;
    }
    if (lc.operatorReviewRequired || diagnostic.primaryAnomalyCategory === 'OPERATOR_REVIEW_REQUIRED' || diagnostic.hasAnomaly) {
      operatorReviewRequiredCount++;
    }
  });

  const anomalySummary = {
    totalAnomalousLifecycles,
    criticalAnomalies,
    highSeverityAnomalies,
    warningAnomalies,
    operatorReviewRequired: operatorReviewRequiredCount
  };

  // 7. Structure Control Center Model
  return {
    overview: {
      activeCasesCount: activeCases.length,
      pendingActionsCount: activeCases.length,
      recoveredRevenueAmount: consoleState.recoveredRevenueAmount || 0,
      recoveryEfficiencyPct: consoleState.recoveryEfficiencyPct || 0,
      autonomousRecoveriesCount: strategyPerf.executionModes?.AUTONOMOUS?.successful || 0,
      manualRecoveriesCount: strategyPerf.executionModes?.MANUAL?.successful || 0,
      strategyEffectiveness: decisionTrace?.learningAssessment?.strategyEffectiveness || 'UNKNOWN',
      calibrationStatus: outcomeFeedback?.calibrationStatus || 'INSUFFICIENT_DATA',
      reconciliationMetrics,
      transitionMetrics,
      lifecycleAuditHealth,
      anomalySummary
    },
    operations: {
      activeCases,
      primaryCase
    },
    recoveryPerformance: strategyPerf,
    strategyHealth: {
      strategies: strategyPerf.strategies
    },
    autonomyHealth: {
      enabled: autonomyEnabled,
      attempts: strategyPerf.executionModes?.AUTONOMOUS?.attempts || 0,
      successes: strategyPerf.executionModes?.AUTONOMOUS?.successful || 0,
      failures: strategyPerf.executionModes?.AUTONOMOUS?.failed || 0,
      recoveryRate: strategyPerf.executionModes?.AUTONOMOUS?.recoveryRate || 0,
      status: autonomyEnabled ? 'ACTIVE' : 'DISABLED'
    },
    manualHealth: {
      attempts: strategyPerf.executionModes?.MANUAL?.attempts || 0,
      successes: strategyPerf.executionModes?.MANUAL?.successful || 0,
      failures: strategyPerf.executionModes?.MANUAL?.failed || 0,
      recoveryRate: strategyPerf.executionModes?.MANUAL?.recoveryRate || 0,
      revenueSaved: strategyPerf.executionModes?.MANUAL?.revenueRecovered || 0
    },
    learningHealth: decisionTrace?.learningAssessment || { learningStatus: 'INSUFFICIENT_DATA', confidenceLevel: 'LOW', evidenceQuality: 'LIMITED', improvementStatus: 'INSUFFICIENT_EVIDENCE' },
    calibrationHealth: outcomeFeedback || { calibrationStatus: 'INSUFFICIENT_DATA', confidenceCalibration: 'UNDETERMINED', strategyCalibration: 'INSUFFICIENT_EVIDENCE' },
    operatorAttentionQueue,
    controlCenterStatus,
    selectedCaseSummary: {
      trace: decisionTrace,
      feedback: outcomeFeedback
    },
    timestamp
  };
}

const PRIORITY_RANKS = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4
};

/**
 * Evaluates current agent policy against agent console state to derive updated recommendations.
 * 
 * @param {Object} agentState - Base agent console state
 * @param {Object} policy - Policy configuration { autoOutreachEnabled, minPriorityThreshold, maxRetryLimit }
 * @returns {Object} Policy-evaluated recommendation result
 */
export function evaluateAgentPolicy(agentState, policy) {
  const baseState = agentState || getAgentConsoleState();
  const currentPolicy = policy || getAgentPolicyDefaults();

  const actionStage = baseState.pipeline.find(s => s.stageCode === 'ACTION_PLANNING');
  const baseAction = actionStage?.details?.recommendedAction || 'RETRY_PAYMENT';

  if (baseAction === 'RECOVERED' || baseAction === 'NO_ACTION' || baseAction === 'NO_ACTIVE_RECOVERY' || baseState.executionStreamStatus === 'COMPLETED') {
    return {
      baseAction: baseAction === 'RETRY_PAYMENT' ? 'RECOVERED' : baseAction,
      evaluatedAction: baseAction === 'RETRY_PAYMENT' ? 'RECOVERED' : baseAction,
      policyReason: baseAction === 'RECOVERED' || baseState.executionStreamStatus === 'COMPLETED'
        ? 'Opportunity successfully recovered — No further outreach required.'
        : 'No active recovery action required.',
      policyApplied: {
        autoOutreachEnabled: currentPolicy.autoOutreachEnabled,
        minPriorityThreshold: currentPolicy.minPriorityThreshold,
        maxRetryLimit: currentPolicy.maxRetryLimit
      }
    };
  }

  const priorityStage = baseState.pipeline.find(s => s.stageCode === 'PRIORITY_SCORING');
  const currentPriority = priorityStage ? priorityStage.details.priority : 'CRITICAL';
  
  const currentRank = PRIORITY_RANKS[currentPriority] || 4;
  const thresholdRank = PRIORITY_RANKS[currentPolicy.minPriorityThreshold] || 3;

  let evaluatedAction = 'RETRY_PAYMENT';
  let policyReason = 'Policy criteria satisfied — Automated retry active.';

  if (!currentPolicy.autoOutreachEnabled) {
    evaluatedAction = 'MANUAL_REVIEW';
    policyReason = 'Auto-Outreach is DISABLED — Escalated for manual operator review.';
  } else if (currentRank < thresholdRank) {
    evaluatedAction = 'MONITOR';
    policyReason = `Priority (${currentPriority}) is below policy threshold (${currentPolicy.minPriorityThreshold}) — Action set to MONITOR.`;
  }

  return {
    baseAction: 'RETRY_PAYMENT',
    evaluatedAction: evaluatedAction,
    policyReason: policyReason,
    policyApplied: {
      autoOutreachEnabled: currentPolicy.autoOutreachEnabled,
      minPriorityThreshold: currentPolicy.minPriorityThreshold,
      maxRetryLimit: currentPolicy.maxRetryLimit
    }
  };
}

/**
 * Creates an override result object when operator overrides recommendation.
 * 
 * @param {Object} evalResult - Evaluated policy result object
 * @param {string} overrideAction - Action selected by operator
 * @returns {Object} Override simulation result
 */
export function createAgentOverride(evalResult, overrideAction) {
  const originalAction = evalResult ? evalResult.evaluatedAction : 'RETRY_PAYMENT';
  const effectiveAction = overrideAction === 'KEEP_RECOMMENDATION' ? originalAction : overrideAction;

  return {
    originalRecommendation: originalAction,
    overrideAction: effectiveAction,
    overrideStatus: 'SIMULATED_OVERRIDE',
    operatorIntervention: overrideAction === 'KEEP_RECOMMENDATION' ? 'NONE' : 'MANUAL_OVERRIDE',
    timestamp: new Date().toISOString()
  };
}

/**
 * Creates an audit log entry for policy changes or operator overrides.
 * 
 * @param {any} previousValue - Previous value
 * @param {any} newValue - New value
 * @param {string} type - Change event type
 * @returns {Object} Structured audit log entry
 */
export function createPolicyAuditEntry(previousValue, newValue, type) {
  return {
    auditId: `audit_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    type: type,
    previousValue: String(previousValue),
    newValue: String(newValue),
    source: 'OPERATOR_SIMULATION',
    timestamp: new Date().toISOString()
  };
}

/**
 * Derives a deterministic candidate identity key for lifecycle tracking and execution locking.
 * Prefer activityId -> paymentAttemptId -> merchantId + customerId + productId.
 * NEVER uses productId alone.
 * 
 * @param {Object|null} activeCase 
 * @returns {string|null} Candidate identity key
 */
export function getCandidateIdentity(activeCase) {
  if (!activeCase || typeof activeCase !== 'object') return null;
  if (activeCase.activityId) return String(activeCase.activityId);
  if (activeCase.paymentAttemptId) return String(activeCase.paymentAttemptId);
  if (activeCase.caseId) return String(activeCase.caseId);
  const mId = activeCase.merchantId || 'merchant';
  const cId = activeCase.customerId || 'customer';
  const pId = activeCase.productId || 'product';
  return `cand_${mId}_${cId}_${pId}`;
}

/**
 * In-memory Candidate Execution Lock Registry.
 * Maps candidateKey -> { candidateKey, state, mode, startedAt, completedAt, result }
 */
const candidateExecutionLockMap = new Map();

/**
 * Acquires an execution lock for a candidate identity key.
 * 
 * @param {string} candidateKey 
 * @param {string} mode - 'MANUAL' | 'AUTONOMOUS'
 * @returns {boolean} True if lock acquired, false if already locked/in-flight/completed
 */
export function acquireCandidateExecutionLock(candidateKey, mode = 'AUTONOMOUS') {
  if (!candidateKey) return false;
  const existing = candidateExecutionLockMap.get(candidateKey);
  if (existing && (existing.state === 'EXECUTING' || existing.state === 'SUCCEEDED')) {
    return false; // Lock already held or already completed
  }

  candidateExecutionLockMap.set(candidateKey, {
    candidateKey,
    state: 'EXECUTING',
    mode,
    startedAt: new Date().toISOString(),
    completedAt: null,
    result: null
  });
  return true;
}

/**
 * Releases/updates execution lock for a candidate identity key.
 * 
 * @param {string} candidateKey 
 * @param {string} status - 'SUCCEEDED' | 'FAILED' | 'BLOCKED'
 * @param {Object|null} result 
 */
export function releaseCandidateExecutionLock(candidateKey, status, result = null) {
  if (!candidateKey) return;
  const existing = candidateExecutionLockMap.get(candidateKey);
  if (existing) {
    existing.state = status;
    existing.completedAt = new Date().toISOString();
    existing.result = result;
  } else {
    candidateExecutionLockMap.set(candidateKey, {
      candidateKey,
      state: status,
      mode: 'UNKNOWN',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      result
    });
  }
}

/**
 * Retrieves execution lock status for a candidate key.
 * 
 * @param {string} candidateKey 
 * @returns {Object|null} Lock entry object
 */
export function getCandidateLockStatus(candidateKey) {
  if (!candidateKey) return null;
  return candidateExecutionLockMap.get(candidateKey) || null;
}

/**
 * Evaluates whether an active recovery case is eligible for controlled autonomous execution.
 * Enforces all Milestone 9.2 safety gates.
 * 
 * @param {Object|null} activeCase - Active recovery case object
 * @param {Object|null} agentDecision - Evaluated agent decision object
 * @param {boolean} autonomyEnabled - Global or session autonomy toggle state (default false)
 * @param {string|null} currentMerchantId - Active authenticated merchant ID
 * @param {Object|null} policyConfig - Policy configuration overrides
 * @returns {Object} Structured eligibility evaluation result
 */
export function evaluateAutonomyEligibility(activeCase, agentDecision, autonomyEnabled = false, currentMerchantId = null, policyConfig = null) {
  if (!autonomyEnabled) {
    return {
      eligible: false,
      reason: 'Autonomy is currently DISABLED (Operator execution required).',
      gateFailures: ['AUTONOMY_DISABLED']
    };
  }

  if (!activeCase || typeof activeCase !== 'object') {
    return {
      eligible: false,
      reason: 'Invalid or missing recovery case.',
      gateFailures: ['INVALID_CASE']
    };
  }

  const gateFailures = [];

  // Gate 1: Lifecycle status must be FAILED
  if (activeCase.status === 'RECOVERED') {
    gateFailures.push('ALREADY_RECOVERED');
  } else if (activeCase.status !== 'FAILED') {
    gateFailures.push(`INVALID_STATUS_${activeCase.status}`);
  }

  // Gate 2: Merchant ownership validation
  const targetMerchantId = activeCase.merchantId || currentMerchantId;
  if (!targetMerchantId || (currentMerchantId && targetMerchantId !== currentMerchantId)) {
    gateFailures.push('MERCHANT_MISMATCH');
  }

  // Gate 3 & 4 & 5: Decision evaluation, Action taxonomy guard, and Policy status
  if (!agentDecision || typeof agentDecision !== 'object') {
    gateFailures.push('NO_DECISION');
  } else {
    const recAction = agentDecision.recommendedAction || agentDecision.action;
    if (recAction !== 'RETRY_PAYMENT') {
      gateFailures.push(`UNSUPPORTED_ACTION_${recAction}`);
    }

    if (agentDecision.policyStatus !== 'ALLOWED') {
      gateFailures.push(`POLICY_${agentDecision.policyStatus}`);
    }
  }

  // Gate 6: Retry count limit check
  const maxRetryLimit = policyConfig?.maxRetryLimit ?? 1;
  const currentRetryCount = activeCase.retryCount || 0;
  if (currentRetryCount >= maxRetryLimit) {
    gateFailures.push('RETRY_LIMIT_EXCEEDED');
  }

  // Gate 7: Candidate lock registry check
  const candidateKey = getCandidateIdentity(activeCase);
  const existingLock = candidateKey ? candidateExecutionLockMap.get(candidateKey) : null;
  if (existingLock && (existingLock.state === 'EXECUTING' || existingLock.state === 'SUCCEEDED')) {
    gateFailures.push(`CANDIDATE_LOCK_${existingLock.state}`);
  }

  if (gateFailures.length > 0) {
    return {
      eligible: false,
      reason: `Safety gate check failed: ${gateFailures.join(', ')}`,
      gateFailures,
      candidateKey
    };
  }

  return {
    eligible: true,
    reason: 'All safety gates passed. Candidate is qualified for controlled autonomous execution.',
    gateFailures: [],
    candidateKey
  };
}

/**
 * Executes an eligible recovery action for an active case.
 * Supports MANUAL vs AUTONOMOUS execution modes with M9.2 safety checks and backend reconciliation.
 * 
 * @param {Object} activeCase - Active unrecovered recovery case
 * @param {Object} agentDecision - Decision object from evaluateAgentDecision
 * @param {string} currentMerchantId - Active authenticated merchant ID
 * @param {Object} [options] - Execution options { executionMode: 'MANUAL'|'AUTONOMOUS', autonomyEnabled: boolean, policyConfig: Object }
 * @returns {Promise<Object>} Execution result object
 */
export async function executeAgentAction(activeCase, agentDecision, currentMerchantId, options = {}) {
  const executionMode = options.executionMode || 'MANUAL';
  
  if (!activeCase || typeof activeCase !== 'object') {
    return {
      status: 'BLOCKED',
      reason: 'No active recovery case provided for execution.',
      executionMode,
      timestamp: new Date().toISOString()
    };
  }

  const candidateKey = getCandidateIdentity(activeCase);

  // Gate check: Status must be FAILED
  if (activeCase.status === 'RECOVERED') {
    releaseCandidateExecutionLock(candidateKey, 'BLOCKED', { reason: 'Already recovered' });
    return {
      status: 'BLOCKED',
      reason: 'Recovery lifecycle is already RECOVERED. Duplicate execution prevented.',
      executionMode,
      timestamp: new Date().toISOString()
    };
  }

  // Gate check: Decision & Policy status
  if (!agentDecision || agentDecision.policyStatus !== 'ALLOWED') {
    releaseCandidateExecutionLock(candidateKey, 'BLOCKED', { reason: 'Policy blocked' });
    return {
      status: 'BLOCKED',
      reason: `Execution blocked by policy: ${agentDecision?.policyReason || 'Policy status not ALLOWED.'}`,
      executionMode,
      timestamp: new Date().toISOString()
    };
  }

  // Action Taxonomy Guard: M9.2 supports ONLY RETRY_PAYMENT for execution
  const recAction = agentDecision.recommendedAction || agentDecision.action;
  if (recAction !== 'RETRY_PAYMENT') {
    releaseCandidateExecutionLock(candidateKey, 'BLOCKED', { reason: 'Unsupported action' });
    return {
      status: 'BLOCKED',
      reason: `Execution unsupported for action type '${recAction}'. Only RETRY_PAYMENT is supported for execution.`,
      executionMode,
      timestamp: new Date().toISOString()
    };
  }

  // Gate check: Merchant ownership
  const targetMerchantId = activeCase.merchantId || currentMerchantId;
  if (!targetMerchantId || (currentMerchantId && targetMerchantId !== currentMerchantId)) {
    releaseCandidateExecutionLock(candidateKey, 'BLOCKED', { reason: 'Merchant mismatch' });
    return {
      status: 'BLOCKED',
      reason: 'Merchant isolation check failed. Case does not belong to active merchant.',
      executionMode,
      timestamp: new Date().toISOString()
    };
  }

  // If AUTONOMOUS mode, enforce full autonomy eligibility evaluation immediately before execution
  if (executionMode === 'AUTONOMOUS') {
    const autonomyCheck = evaluateAutonomyEligibility(
      activeCase,
      agentDecision,
      options.autonomyEnabled !== false,
      currentMerchantId,
      options.policyConfig
    );
    if (!autonomyCheck.eligible) {
      releaseCandidateExecutionLock(candidateKey, 'BLOCKED', { reason: autonomyCheck.reason });
      return {
        status: 'BLOCKED',
        reason: autonomyCheck.reason,
        executionMode,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Acquire execution lock (or verify lock)
  const lockAcquired = acquireCandidateExecutionLock(candidateKey, executionMode);
  if (!lockAcquired) {
    const existingLock = getCandidateLockStatus(candidateKey);
    if (existingLock?.state === 'EXECUTING') {
      return {
        status: 'BLOCKED',
        reason: 'Execution already in progress for this recovery lifecycle.',
        executionMode,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Construct canonical recovery update payload preserving correlation keys (FAILED -> RECOVERED)
  const retryPayload = {
    activityId: activeCase.activityId || activeCase.caseId,
    paymentAttemptId: activeCase.paymentAttemptId || activeCase.caseId,
    paymentResultId: activeCase.paymentResultId || `result_retried_${Date.now()}`,
    merchantId: targetMerchantId,
    customerId: activeCase.customerId || 'customer_demo',
    productId: activeCase.productId || 'prod_demo',
    productName: activeCase.productName || 'Selected Product',
    amount: Number(activeCase.amount || 0),
    recoveredAmount: Number(activeCase.amount || 0),
    currency: activeCase.currency || 'INR',
    failureCode: activeCase.failureCode || 'SERVER_ERROR',
    priority: activeCase.priority || 'CRITICAL',
    status: 'RECOVERED',
    recommendedAction: 'RECOVERED',
    retryCount: (activeCase.retryCount || 0) + 1
  };

  try {
    const apiResult = await createBackendRecoveryEvent(retryPayload);

    // STEP 21: Backend Confirmation Reconciliation
    // Must verify backend returned success AND backend lifecycle is actually RECOVERED
    if (apiResult && apiResult.success && apiResult.data && apiResult.data.status === 'RECOVERED') {
      releaseCandidateExecutionLock(candidateKey, 'SUCCEEDED', apiResult.data);
      return {
        status: 'SUCCEEDED',
        caseId: activeCase.caseId,
        candidateKey,
        action: 'RETRY_PAYMENT',
        executionMode,
        recoveredAmount: Number(activeCase.amount || 0),
        currency: activeCase.currency || 'INR',
        message: `${executionMode === 'AUTONOMOUS' ? 'Autonomous recovery' : 'Recovery'} retry executed successfully for customer ${activeCase.customerId}. ${activeCase.currency} ${activeCase.amount.toLocaleString('en-IN')} net revenue saved.`,
        data: apiResult.data,
        timestamp: new Date().toISOString()
      };
    } else {
      releaseCandidateExecutionLock(candidateKey, 'FAILED', { reason: apiResult?.error || 'Backend reconciliation failed' });
      return {
        status: 'FAILED',
        caseId: activeCase.caseId,
        candidateKey,
        action: 'RETRY_PAYMENT',
        executionMode,
        reason: apiResult?.error || 'Failed to reconcile recovery lifecycle in database (status remains FAILED).',
        timestamp: new Date().toISOString()
      };
    }
  } catch (err) {
    console.error('[agentConsoleStream] Action execution error:', err);
    releaseCandidateExecutionLock(candidateKey, 'FAILED', { reason: err.message });
    return {
      status: 'FAILED',
      caseId: activeCase.caseId,
      candidateKey,
      action: 'RETRY_PAYMENT',
      executionMode,
      reason: err.message || 'Execution failed due to network error.',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Milestone 9.5 — Recovery Outcome Learning & Strategy Performance Engine.
 * Evaluates historical recovery outcomes from authoritative backend database events (dbEvents).
 * 
 * STRICT BOUNDARIES:
 * - Pure, deterministic function.
 * - 0 API calls, 0 DB writes, 0 storage writes, 0 side effects.
 * - Does NOT automatically modify policy, retry limits, or autonomy state.
 * - Strictly merchant-scoped.
 * 
 * @param {Array|null} dbEvents - Authoritative backend recovery event rows from database
 * @param {Array|null} [runtimeEvents] - Optional React runtime recovery events
 * @param {string|null} [currentMerchantId] - Authenticated merchant ID
 * @returns {Object} Structured strategy performance analytics
 */
export function evaluateStrategyPerformance(dbEvents = null, runtimeEvents = null, currentMerchantId = null) {
  const rawEvents = [];
  const seenIds = new Set();

  if (Array.isArray(dbEvents)) {
    dbEvents.forEach(evt => {
      if (!evt) return;
      const mId = evt.merchantId;
      if (currentMerchantId && mId && mId !== currentMerchantId) return;
      const id = evt.id || evt.activityId;
      if (id && !seenIds.has(id)) {
        seenIds.add(id);
        rawEvents.push(evt);
      }
    });
  }

  if (Array.isArray(runtimeEvents)) {
    runtimeEvents.forEach(evt => {
      if (!evt) return;
      const mId = evt.merchantId;
      if (currentMerchantId && mId && mId !== currentMerchantId) return;
      const id = evt.id || evt.activityId;
      if (id && !seenIds.has(id)) {
        seenIds.add(id);
        rawEvents.push(evt);
      }
    });
  }

  // Canonical Lifecycle Correlation Map
  const lifecyclesMap = new Map();

  rawEvents.forEach(evt => {
    const key = evt.activityId || evt.paymentAttemptId || evt.id || `cand_${evt.merchantId}_${evt.customerId}_${evt.productId}`;
    if (!lifecyclesMap.has(key)) {
      lifecyclesMap.set(key, {
        lifecycleId: key,
        merchantId: evt.merchantId,
        customerId: evt.customerId,
        productId: evt.productId,
        productName: evt.productName || 'Digital Product',
        amount: Number(evt.amount || 0),
        currency: evt.currency || 'INR',
        failureCode: (evt.failureCode || 'SERVER_ERROR').toUpperCase(),
        priority: (evt.priority || 'CRITICAL').toUpperCase(),
        recommendedAction: evt.recommendedAction || 'RETRY_PAYMENT',
        strategy: evt.strategy || (evt.recommendedAction === 'MONITOR' ? 'MONITOR' : evt.recommendedAction === 'NO_ACTION' ? 'NO_ACTION' : evt.recommendedAction === 'OPERATOR_REVIEW' ? 'OPERATOR_REVIEW' : 'RETRY_PAYMENT'),
        status: (evt.status || 'FAILED').toUpperCase(),
        executionMode: evt.executionMode || (evt.actor === 'Autonomous AI Agent' ? 'AUTONOMOUS' : 'MANUAL'),
        retryCount: Number(evt.retryCount || 1),
        recoveredAmount: Number(evt.recoveredAmount || 0),
        timestamp: evt.timestamp || evt.created_at || new Date().toISOString()
      });
    } else {
      const existing = lifecyclesMap.get(key);
      if (evt.status === 'RECOVERED' || evt.recoveredAmount > 0) {
        existing.status = 'RECOVERED';
        existing.recoveredAmount = Number(evt.recoveredAmount || existing.amount);
      }
      if (evt.executionMode) existing.executionMode = evt.executionMode;
      if (evt.retryCount && evt.retryCount > existing.retryCount) existing.retryCount = evt.retryCount;
    }
  });

  const totalLifecycles = Array.from(lifecyclesMap.values());
  const hasHistory = totalLifecycles.length > 0;

  let totalCases = 0;
  let recoveredCases = 0;
  let failedCases = 0;
  let totalRevenueAtRisk = 0;
  let totalRevenueRecovered = 0;

  const strategiesBreakdown = {
    RETRY_PAYMENT: { recommended: 0, executed: 0, successful: 0, failed: 0, revenueAtRisk: 0, revenueRecovered: 0 },
    MONITOR: { recommended: 0, executed: 0, successful: 0, failed: 0, revenueAtRisk: 0, revenueRecovered: 0 },
    OPERATOR_REVIEW: { recommended: 0, executed: 0, successful: 0, failed: 0, revenueAtRisk: 0, revenueRecovered: 0 },
    NO_ACTION: { recommended: 0, executed: 0, successful: 0, failed: 0, revenueAtRisk: 0, revenueRecovered: 0 }
  };

  const executionModesBreakdown = {
    MANUAL: { attempts: 0, successful: 0, failed: 0, revenueRecovered: 0 },
    AUTONOMOUS: { attempts: 0, successful: 0, failed: 0, revenueRecovered: 0 }
  };

  totalLifecycles.forEach(lc => {
    totalCases += 1;
    totalRevenueAtRisk += lc.amount;

    const isRecovered = lc.status === 'RECOVERED';
    if (isRecovered) {
      recoveredCases += 1;
      totalRevenueRecovered += (lc.recoveredAmount || lc.amount);
    } else {
      failedCases += 1;
    }

    const stratKey = strategiesBreakdown[lc.strategy] ? lc.strategy : 'RETRY_PAYMENT';
    const stratObj = strategiesBreakdown[stratKey];
    stratObj.recommended += 1;
    stratObj.revenueAtRisk += lc.amount;

    if (stratKey === 'RETRY_PAYMENT' || isRecovered || lc.retryCount > 0) {
      stratObj.executed += 1;
      if (isRecovered) {
        stratObj.successful += 1;
        stratObj.revenueRecovered += (lc.recoveredAmount || lc.amount);
      } else {
        stratObj.failed += 1;
      }
    }

    const modeKey = (lc.executionMode === 'AUTONOMOUS') ? 'AUTONOMOUS' : 'MANUAL';
    const modeObj = executionModesBreakdown[modeKey];
    modeObj.attempts += 1;
    if (isRecovered) {
      modeObj.successful += 1;
      modeObj.revenueRecovered += (lc.recoveredAmount || lc.amount);
    } else {
      modeObj.failed += 1;
    }
  });

  const caseRecoveryRate = totalCases > 0 ? Math.round((recoveredCases / totalCases) * 100) : 0;
  const financialRecoveryRate = totalRevenueAtRisk > 0 ? Math.round((totalRevenueRecovered / totalRevenueAtRisk) * 100) : 0;

  Object.keys(strategiesBreakdown).forEach(k => {
    const s = strategiesBreakdown[k];
    s.caseRecoveryRate = s.executed > 0 ? Math.round((s.successful / s.executed) * 100) : 0;
    s.financialRecoveryRate = s.revenueAtRisk > 0 ? Math.round((s.revenueRecovered / s.revenueAtRisk) * 100) : 0;
  });

  Object.keys(executionModesBreakdown).forEach(k => {
    const m = executionModesBreakdown[k];
    m.recoveryRate = m.attempts > 0 ? Math.round((m.successful / m.attempts) * 100) : 0;
  });

  const performanceData = {
    hasHistory,
    overview: {
      totalCases,
      recoveredCases,
      failedCases,
      totalRevenueAtRisk,
      totalRevenueRecovered,
      caseRecoveryRate,
      financialRecoveryRate
    },
    strategies: strategiesBreakdown,
    executionModes: executionModesBreakdown
  };

  performanceData.insights = deriveRecoveryInsights(performanceData);

  return performanceData;
}

/**
 * Generates deterministic, human-readable recovery performance insights.
 * Enforces 5-observation sample threshold safety.
 * 
 * @param {Object} performanceData 
 * @returns {Array<string>} List of insight statements
 */
export function deriveRecoveryInsights(performanceData) {
  if (!performanceData || !performanceData.hasHistory || !performanceData.overview || performanceData.overview.totalCases === 0) {
    return [
      "NO RECOVERY HISTORY — Insufficient data available to evaluate strategy performance.",
      "Execute recovery retries or process payment events to generate strategy analytics."
    ];
  }

  const { overview, strategies, executionModes } = performanceData;
  const insights = [];

  const sampleSize = overview?.totalCases || 0;
  const MIN_SAMPLE_THRESHOLD = 5;

  if (sampleSize < MIN_SAMPLE_THRESHOLD) {
    insights.push(`Limited historical data (${sampleSize}/${MIN_SAMPLE_THRESHOLD} completed observations recorded for strategy evaluation).`);
  }

  // Insight 1: Overall Recovery Performance
  const totalRevVal = Number(overview?.totalRevenueRecovered || 0);
  insights.push(`Historical case recovery rate is ${overview?.caseRecoveryRate || 0}% (${overview?.recoveredCases || 0} of ${overview?.totalCases || 0} cases recovered, ₹${totalRevVal.toLocaleString('en-IN')} revenue saved).`);

  // Insight 2: RETRY_PAYMENT Strategy Effectiveness
  const retryStrat = strategies?.RETRY_PAYMENT || { executed: 0, caseRecoveryRate: 0 };
  if (retryStrat.executed > 0) {
    insights.push(`RETRY_PAYMENT strategy achieved a ${retryStrat.caseRecoveryRate || 0}% recovery rate across ${retryStrat.executed} executed attempts.`);
  }

  // Insight 3: Autonomous vs Manual Execution Comparison
  const autoMode = executionModes?.AUTONOMOUS || { attempts: 0, revenueRecovered: 0, recoveryRate: 0 };
  const manualMode = executionModes?.MANUAL || { attempts: 0, revenueRecovered: 0, recoveryRate: 0 };
  if (autoMode.attempts > 0) {
    const autoRevVal = Number(autoMode.revenueRecovered || 0);
    insights.push(`Autonomous AI execution recovered ₹${autoRevVal.toLocaleString('en-IN')} (${autoMode.recoveryRate || 0}% success rate across ${autoMode.attempts} attempts).`);
  }
  if (manualMode.attempts > 0 && autoMode.attempts > 0) {
    if ((autoMode.recoveryRate || 0) >= (manualMode.recoveryRate || 0)) {
      insights.push(`Autonomous recovery efficiency (${autoMode.recoveryRate || 0}%) matches or exceeds manual operator recovery (${manualMode.recoveryRate || 0}%).`);
    } else {
      insights.push(`Manual operator recovery rate currently stands at ${manualMode.recoveryRate || 0}% across ${manualMode.attempts} attempts.`);
    }
  }

  return insights;
}
