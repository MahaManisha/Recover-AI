/**
 * Autonomous AI Agent Console Telemetry & Policy Control Service — RecoverAI M6 Page 2 Part 2
 * Provides structured telemetry, decision streams, policy evaluation, action override simulation,
 * and operator audit trail entries.
 * 
 * STRICT BOUNDARY:
 * - Pure, deterministic functions.
 * - 0 network calls, 0 DB calls, 0 localStorage/sessionStorage/cookies, 0 side effects.
 * - Zero sensitive payment data.
 * - Explicitly marks execution as SIMULATED.
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
export function getAgentConsoleState(activeRecoverySession = null) {
  const timestamp = new Date().toISOString();

  if (activeRecoverySession && (
    activeRecoverySession.resultEvent || 
    activeRecoverySession.recoveryAssessment || 
    activeRecoverySession.currentStatus === 'RECOVERED' || 
    activeRecoverySession.recoveryOutcome ||
    activeRecoverySession.attemptEvent ||
    activeRecoverySession.customerId
  )) {
    const sess = activeRecoverySession;
    const isRecovered = Boolean(sess.recoveryOutcome) || sess.currentStatus === 'RECOVERED';
    const customerId = sess.customerId || sess.recoveryAssessment?.customerId || sess.resultEvent?.customerId || sess.attemptEvent?.customerId || 'customer_demo';
    const amount = Number(sess.amount || sess.recoveryAssessment?.amount || sess.attemptEvent?.amount || 2000);
    const currency = sess.currency || sess.recoveryAssessment?.currency || sess.attemptEvent?.currency || 'INR';
    const failureCode = sess.failureCode || sess.resultEvent?.failureCode || sess.revenueRiskContext?.failureCode || 'SERVER_ERROR';
    const paymentMethod = sess.paymentMethod || sess.attemptEvent?.paymentMethod || 'CARD';
    const score = Number(sess.recoveryPriority?.score || sess.recoveryAssessment?.priorityScore || 85);
    const priority = sess.recoveryPriority?.priority || sess.recoveryAssessment?.priority || 'CRITICAL';

    const isExecuted = Boolean(sess.recoveryExecution);

    const recommendedAction = isRecovered
      ? 'RECOVERED'
      : (sess.recoveryDecision?.recommendedAction || sess.recoveryActionPlan?.actionType || 'RECOVERY_OUTREACH');

    const channel = isRecovered ? 'NONE' : (sess.recoveryActionPlan?.channel || 'EMAIL');

    const recoveredRevenue = isRecovered 
      ? Number(sess.recoveryOutcome?.recoveredRevenue || amount)
      : 0;

    const executionStreamStatus = isRecovered
      ? 'COMPLETED'
      : (isExecuted ? 'SIMULATED' : 'PENDING');

    return {
      agentStatus: 'AUTONOMOUS_ACTIVE',
      mode: 'MODE: RULE_BASED_ORCHESTRATION',
      environment: 'RUNTIME_CUSTOMER_ENVIRONMENT',
      evaluatedFailedPayments: 1,
      recommendedRecoveryActions: isRecovered || recommendedAction === 'NO_ACTION' ? 0 : 1,
      executionStreamStatus: executionStreamStatus,
      timestamp: timestamp,
      pipeline: [
        {
          stageNumber: 1,
          stage: 'Signal Evaluation',
          stageCode: 'SIGNAL_EVALUATION',
          status: 'COMPLETED',
          event: sess.resultEvent?.type || 'PAYMENT_FAILED_DETECTED',
          summary: `Detected payment result (${failureCode}) for customer ${customerId}`,
          details: {
            customerId,
            failureCode,
            failureReason: sess.recoveryAssessment?.assessment?.failureSummary || `Payment failure (${failureCode})`,
            attemptedAmount: amount,
            currency,
            paymentMethod
          }
        },
        {
          stageNumber: 2,
          stage: 'Priority Scoring',
          stageCode: 'PRIORITY_SCORING',
          status: 'COMPLETED',
          event: 'RECOVERY_PRIORITY_CALCULATED',
          summary: `Calculated priority score (${score}/100) and priority tier (${priority})`,
          details: {
            score,
            priority,
            maxScore: 100,
            businessImpact: priority === 'CRITICAL' ? 'HIGH_VALUE_SUBSCRIPTION' : 'STANDARD_PURCHASE'
          }
        },
        {
          stageNumber: 3,
          stage: 'Recovery Assessment',
          stageCode: 'RECOVERY_ASSESSMENT',
          status: 'COMPLETED',
          event: 'REVENUE_RISK_EVALUATED',
          summary: isRecovered 
            ? `Revenue risk resolved — ${currency} ${recoveredRevenue} net revenue recovered`
            : `Evaluated revenue-at-risk (${currency} ${amount})`,
          details: {
            revenueAtRisk: amount,
            recoveredRevenue,
            currency,
            recoveryOpportunity: isRecovered ? false : Boolean(sess.recoveryAssessment?.assessment?.recoveryOpportunity),
            recoverable: !isRecovered
          }
        },
        {
          stageNumber: 4,
          stage: 'Action Planning',
          stageCode: 'ACTION_PLANNING',
          status: 'COMPLETED',
          event: isRecovered ? 'RECOVERY_COMPLETED' : 'RECOVERY_ACTION_PLANNED',
          summary: isRecovered 
            ? 'Recovery opportunity successfully resolved — Status: RECOVERED'
            : `Recommended recovery action: ${recommendedAction} via ${channel}`,
          details: {
            recommendedAction,
            channel,
            urgency: isRecovered ? 'COMPLETED' : (priority === 'CRITICAL' ? 'IMMEDIATE' : 'STANDARD'),
            templateId: isRecovered ? 'tpl_recovery_resolved' : `tpl_recovery_outreach_${failureCode.toLowerCase()}`
          }
        },
        {
          stageNumber: 5,
          stage: 'Outreach Execution',
          stageCode: 'OUTREACH_EXECUTION',
          status: isRecovered ? 'COMPLETED' : (isExecuted ? 'SIMULATED' : 'PENDING'),
          event: isRecovered 
            ? 'RECOVERY_OUTCOME_RESOLVED' 
            : (isExecuted ? 'SIMULATED_RECOVERY_OUTREACH_EXECUTED' : 'AWAITING_SIMULATED_EXECUTION'),
          summary: isRecovered 
            ? `Payment recovery completed via customer retry. ${currency} ${recoveredRevenue} net revenue recovered.` 
            : (isExecuted 
                ? 'Simulated customer recovery outreach execution completed' 
                : 'Outreach action planned and ready for simulated execution'),
          details: {
            executionId: isRecovered 
              ? (sess.recoveryOutcome?.recoveryId || `recovery_${sess.retryResult?.id || 'demo'}`)
              : (sess.recoveryExecution?.executionId || `exec_pending_${sess.attemptEvent?.id || 'demo'}`),
            executionStatus: isRecovered ? 'RECOVERED' : (isExecuted ? 'SIMULATED' : 'NOT_EXECUTED'),
            outcome: isRecovered ? 'RECOVERED' : (isExecuted ? 'SIMULATED_SUCCESS' : 'PENDING'),
            recoveredRevenue,
            currency
          }
        }
      ]
    };
  }

  return {
    agentStatus: 'AUTONOMOUS_ACTIVE',
    mode: 'MODE: RULE_BASED_ORCHESTRATION',
    environment: 'SIMULATED_DEMO_ENVIRONMENT',
    evaluatedFailedPayments: 1,
    recommendedRecoveryActions: 1,
    executionStreamStatus: 'SIMULATED',
    timestamp: timestamp,
    pipeline: [
      {
        stageNumber: 1,
        stage: 'Signal Evaluation',
        stageCode: 'SIGNAL_EVALUATION',
        status: 'COMPLETED',
        event: 'PAYMENT_FAILED_DETECTED',
        summary: 'Detected failed payment attempt for customer opportunity',
        details: {
          failureCode: 'SERVER_ERROR',
          failureReason: 'Temporary server processing error (500)',
          attemptedAmount: 2000,
          currency: 'INR',
          paymentMethod: 'CARD'
        }
      },
      {
        stageNumber: 2,
        stage: 'Priority Scoring',
        stageCode: 'PRIORITY_SCORING',
        status: 'COMPLETED',
        event: 'RECOVERY_PRIORITY_CALCULATED',
        summary: 'Calculated recovery urgency and business impact score',
        details: {
          score: 85,
          priority: 'CRITICAL',
          maxScore: 100,
          businessImpact: 'HIGH_VALUE_SUBSCRIPTION'
        }
      },
      {
        stageNumber: 3,
        stage: 'Recovery Assessment',
        stageCode: 'RECOVERY_ASSESSMENT',
        status: 'COMPLETED',
        event: 'REVENUE_RISK_EVALUATED',
        summary: 'Evaluated revenue-at-risk and recovery feasibility',
        details: {
          revenueAtRisk: 2000,
          recoveredRevenue: 2000,
          currency: 'INR',
          recoveryOpportunity: true,
          recoverable: true
        }
      },
      {
        stageNumber: 4,
        stage: 'Action Planning',
        stageCode: 'ACTION_PLANNING',
        status: 'COMPLETED',
        event: 'RECOVERY_ACTION_PLANNED',
        summary: 'Determined optimal recovery action strategy and outreach channel',
        details: {
          recommendedAction: 'RECOVERY_OUTREACH',
          channel: 'EMAIL',
          urgency: 'IMMEDIATE',
          templateId: 'tpl_recovery_outreach_server_error'
        }
      },
      {
        stageNumber: 5,
        stage: 'Outreach Execution',
        stageCode: 'OUTREACH_EXECUTION',
        status: 'SIMULATED',
        event: 'SIMULATED_RECOVERY_OUTREACH_EXECUTED',
        summary: 'Simulated customer recovery outreach execution and outcome',
        details: {
          executionId: 'exec_sim_demo_101',
          executionStatus: 'SIMULATED',
          outcome: 'SIMULATED_SUCCESS',
          recoveredRevenue: 2000,
          currency: 'INR'
        }
      }
    ]
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
  const baseAction = actionStage?.details?.recommendedAction || 'RECOVERY_OUTREACH';

  // If the opportunity is already RECOVERED, NO_ACTION, or NO_ACTIVE_RECOVERY, return terminal evaluation
  if (baseAction === 'RECOVERED' || baseAction === 'NO_ACTION' || baseAction === 'NO_ACTIVE_RECOVERY' || baseState.executionStreamStatus === 'COMPLETED') {
    return {
      baseAction: baseAction === 'RECOVERY_OUTREACH' ? 'RECOVERED' : baseAction,
      evaluatedAction: baseAction === 'RECOVERY_OUTREACH' ? 'RECOVERED' : baseAction,
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

  let evaluatedAction = 'RECOVERY_OUTREACH';
  let policyReason = 'Policy criteria satisfied — Automated outreach active.';

  if (!currentPolicy.autoOutreachEnabled) {
    evaluatedAction = 'MANUAL_REVIEW';
    policyReason = 'Auto-Outreach is DISABLED — Escalated for manual operator review.';
  } else if (currentRank < thresholdRank) {
    evaluatedAction = 'MONITOR';
    policyReason = `Priority (${currentPriority}) is below policy threshold (${currentPolicy.minPriorityThreshold}) — Action set to MONITOR.`;
  }

  return {
    baseAction: 'RECOVERY_OUTREACH',
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
  const originalAction = evalResult ? evalResult.evaluatedAction : 'RECOVERY_OUTREACH';
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
