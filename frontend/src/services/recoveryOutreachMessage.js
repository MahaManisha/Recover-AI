/**
 * Recovery Outreach Message Generator — RecoverAI M5 Page 1 Part 3
 * Generates a simulated customer recovery outreach email draft based on agent evaluation.
 * 
 * STRICT BOUNDARY:
 * - This function ONLY generates a message DRAFT.
 * - It MUST NOT send emails or connect to external messaging services.
 * - Must be pure, deterministic, and free of side effects.
 */

/**
 * Generates a simulated customer recovery outreach message draft.
 * 
 * @param {Object|null} recoveryAssessment - The M4 RECOVERY_ASSESSMENT object
 * @param {Object|null} recoveryDecision - The M5 RECOVERY_DECISION object
 * @param {Object|null} recoveryActionPlan - The M5 RECOVERY_ACTION_PLAN object
 * @param {Object|null} userProfile - Optional authenticated user profile object
 * @returns {Object|null} Structured message draft object or null if conditions are not met
 */
export function generateRecoveryOutreachMessage(
  recoveryAssessment,
  recoveryDecision,
  recoveryActionPlan,
  userProfile
) {
  // Validate presence of required inputs
  if (!recoveryAssessment || typeof recoveryAssessment !== 'object') {
    return null;
  }
  if (!recoveryDecision || typeof recoveryDecision !== 'object') {
    return null;
  }
  if (!recoveryActionPlan || typeof recoveryActionPlan !== 'object') {
    return null;
  }

  // Generate message ONLY when decision and plan specify RECOVERY_OUTREACH
  if (recoveryDecision.recommendedAction !== 'RECOVERY_OUTREACH') {
    return null;
  }
  if (recoveryActionPlan.actionType !== 'RECOVERY_OUTREACH') {
    return null;
  }

  const customerName = userProfile?.full_name || userProfile?.name || 'Valued Customer';
  const productName = recoveryAssessment.productName || (recoveryAssessment.productId === 'ai-fullstack-program'
    ? 'AI & Full-Stack Development Program'
    : (recoveryAssessment.productId || 'Selected Product'));

  const amount = Number(recoveryAssessment.amount || recoveryAssessment.revenueAtRisk) || 0;
  const currency = recoveryAssessment.currency || 'INR';

  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: 0
  }).format(amount);

  const subject = `Action Required: Complete your purchase for ${productName}`;

  const messageBody = `Hi ${customerName},

We noticed that your payment of ${formattedAmount} for the ${productName} was not completed.

Your purchase is still available, and you can continue when convenient.

Thank you,
RecoverAI Support Team`;

  const messageId = `msg_${recoveryDecision.decisionId || 'demo'}`;

  return {
    messageId: messageId,
    type: 'RECOVERY_OUTREACH_MESSAGE',

    decisionId: recoveryDecision.decisionId,
    actionPlanId: recoveryActionPlan.actionPlanId,

    customerId: recoveryDecision.customerId || recoveryAssessment.customerId || 'customer_demo',
    productId: recoveryDecision.productId || recoveryAssessment.productId || 'ai-fullstack-program',

    channel: 'EMAIL',

    subject: subject,
    message: messageBody,

    executionStatus: 'NOT_EXECUTED',

    source: 'RULE_BASED_AGENT',

    timestamp: recoveryDecision.timestamp || new Date().toISOString()
  };
}
