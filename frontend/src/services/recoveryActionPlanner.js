/**
 * Recovery Action Planner — RecoverAI M5 Page 1 Part 2
 * Converts the Recovery Agent Decision and Recovery Assessment into a structured RECOVERY ACTION PLAN.
 * 
 * STRICT BOUNDARY:
 * - This function ONLY plans a recovery action.
 * - It MUST NOT execute the action (no emails sent, no SMS, no WhatsApp, no payment retries, no DB writes).
 * - Must be pure, deterministic, and free of side effects.
 */

/**
 * Plans a recovery action based on the agent's decision and assessment context.
 * 
 * @param {Object|null} recoveryDecision - The M5 RECOVERY_DECISION object
 * @param {Object|null} recoveryAssessment - The M4 RECOVERY_ASSESSMENT object
 * @returns {Object|null} Structured action plan object or null if inputs are invalid
 */
export function planRecoveryAction(recoveryDecision, recoveryAssessment) {
  if (!recoveryDecision || typeof recoveryDecision !== 'object') {
    return null;
  }

  if (!recoveryAssessment || typeof recoveryAssessment !== 'object') {
    return null;
  }

  if (!recoveryDecision.decisionId || !recoveryDecision.recommendedAction) {
    return null;
  }

  let actionType = recoveryDecision.recommendedAction;
  const priority = recoveryDecision.priority ? String(recoveryDecision.priority).toUpperCase() : 'LOW';

  let channel = 'NONE';
  let objective = 'No recovery action required.';
  let reason = 'Low priority or non-actionable payment failure.';

  if (actionType === 'RECOVERY_OUTREACH') {
    channel = 'EMAIL';
    objective = 'Encourage the customer to complete the interrupted purchase.';
    reason = 'A high-value failed payment with strong recovery signals warrants customer outreach.';
  } else if (actionType === 'MONITOR') {
    channel = 'NONE';
    objective = 'Monitor customer payment activity for automated recovery indicators.';
    reason = 'Medium priority payment failure requires ongoing monitoring.';
  } else {
    actionType = 'NO_ACTION';
    channel = 'NONE';
    objective = 'No recovery action required.';
    reason = 'Low priority or non-actionable payment failure.';
  }

  const actionPlanId = `plan_${recoveryDecision.decisionId}`;

  return {
    actionPlanId: actionPlanId,
    type: 'RECOVERY_ACTION_PLAN',

    decisionId: recoveryDecision.decisionId,

    customerId: recoveryDecision.customerId || recoveryAssessment.customerId || 'customer_demo',
    productId: recoveryDecision.productId || recoveryAssessment.productId || 'ai-fullstack-program',

    actionType: actionType,

    priority: priority,
    revenueAtRisk: Number(recoveryDecision.revenueAtRisk || recoveryAssessment.revenueAtRisk) || 2000,
    currency: recoveryDecision.currency || recoveryAssessment.currency || 'INR',

    channel: channel,

    objective: objective,
    reason: reason,

    executionStatus: 'NOT_EXECUTED',

    source: 'RULE_BASED_AGENT',

    timestamp: recoveryDecision.timestamp || new Date().toISOString()
  };
}
