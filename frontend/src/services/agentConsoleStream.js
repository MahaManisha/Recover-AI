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
 * 
 * @returns {Object} Agent console state schema
 */
export function getAgentConsoleState() {
  const timestamp = new Date().toISOString();

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
