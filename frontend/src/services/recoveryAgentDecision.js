/**
 * Recovery Agent Decision Engine — RecoverAI M5 Page 1 Part 1
 * Analyzes the M4 Recovery Assessment and outputs a structured RECOVERY DECISION.
 * 
 * STRICT BOUNDARY:
 * - This function ONLY decides what recovery action would be appropriate.
 * - It MUST NOT execute any recovery action (no email, SMS, WhatsApp, payment retry, or DB writes).
 * - Must be pure, deterministic, and free of side effects.
 */

/**
 * Generates a human-readable reason for the recommended recovery action.
 * 
 * @param {string} action - Recommended action ("RECOVERY_OUTREACH" | "MONITOR" | "NO_ACTION")
 * @param {string} priority - Priority level ("CRITICAL" | "HIGH" | "MEDIUM" | "LOW")
 * @param {Object} recoveryAssessment - Source assessment object
 * @returns {string} Human-readable decision reason
 */
function generateDecisionReason(action, priority, recoveryAssessment) {
  if (action === 'RECOVERY_OUTREACH') {
    if (priority === 'CRITICAL') {
      return 'High-value failed payment with strong customer recovery signals. Recovery outreach is recommended.';
    }
    return 'High-priority failed payment opportunity detected. Recovery outreach is recommended.';
  }

  if (action === 'MONITOR') {
    return 'Medium-priority failed payment detected. Automated monitoring is recommended.';
  }

  return 'Low priority or non-actionable payment failure. No recovery action required at this time.';
}

/**
 * Evaluates a Recovery Assessment and generates a structured RECOVERY DECISION.
 * 
 * @param {Object|null} recoveryAssessment - The M4 Recovery Assessment object
 * @returns {Object|null} Structured decision object or null if assessment is invalid
 */
export function decideRecoveryAction(recoveryAssessment) {
  if (!recoveryAssessment || typeof recoveryAssessment !== 'object') {
    return null;
  }

  // Must have basic valid assessment fields
  if (!recoveryAssessment.paymentAttemptId && !recoveryAssessment.paymentResultId) {
    return null;
  }

  const isOpportunity = Boolean(recoveryAssessment.assessment?.recoveryOpportunity);
  const priority = recoveryAssessment.priority ? String(recoveryAssessment.priority).toUpperCase() : 'LOW';

  let recommendedAction = 'NO_ACTION';

  if (isOpportunity) {
    switch (priority) {
      case 'CRITICAL':
      case 'HIGH':
        recommendedAction = 'RECOVERY_OUTREACH';
        break;
      case 'MEDIUM':
        recommendedAction = 'MONITOR';
        break;
      case 'LOW':
      default:
        recommendedAction = 'NO_ACTION';
        break;
    }
  } else {
    recommendedAction = 'NO_ACTION';
  }

  const reason = generateDecisionReason(recommendedAction, priority, recoveryAssessment);

  const baseResultId = recoveryAssessment.paymentResultId || recoveryAssessment.paymentAttemptId || 'demo';
  const decisionId = `dec_${baseResultId}`;

  return {
    decisionId,
    type: 'RECOVERY_DECISION',

    paymentAttemptId: recoveryAssessment.paymentAttemptId || 'att_unknown',
    paymentResultId: recoveryAssessment.paymentResultId || 'result_unknown',
    customerId: recoveryAssessment.customerId || 'customer_demo',
    productId: recoveryAssessment.productId || 'ai-fullstack-program',

    revenueAtRisk: Number(recoveryAssessment.revenueAtRisk || recoveryAssessment.amount) || 2000,
    currency: recoveryAssessment.currency || 'INR',

    priorityScore: Number(recoveryAssessment.priorityScore) || 0,
    priority: priority,

    recommendedAction: recommendedAction,
    reason: reason,

    source: 'RULE_BASED_AGENT',
    timestamp: recoveryAssessment.timestamp || new Date().toISOString()
  };
}
