/**
 * Customer Recovery Notification Service — RecoverAI M5 Page 2 Part 1
 * Generates an in-app simulated customer recovery notification representing the customer-facing message.
 * 
 * STRICT BOUNDARY:
 * - This is an IN-APP SIMULATION ONLY.
 * - Must NOT send real email, SMS, WhatsApp, or external communications.
 * - Pure, deterministic, and free of side effects.
 */

/**
 * Creates a structured in-app customer recovery notification object.
 * 
 * @param {Object|null} recoveryAssessment - The M4 RECOVERY_ASSESSMENT object
 * @param {Object|null} recoveryDecision - The M5 RECOVERY_DECISION object
 * @param {Object|null} recoveryActionPlan - The M5 RECOVERY_ACTION_PLAN object
 * @param {Object|null} recoveryOutreachMessage - Optional outreach message object
 * @returns {Object|null} Customer notification object or null if conditions are not met
 */
export function createCustomerRecoveryNotification(
  recoveryAssessment,
  recoveryDecision,
  recoveryActionPlan,
  recoveryOutreachMessage
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

  // Generate notification ONLY when decision specifies RECOVERY_OUTREACH
  if (recoveryDecision.recommendedAction !== 'RECOVERY_OUTREACH') {
    return null;
  }

  const failureCode = recoveryAssessment.failureCode || recoveryDecision.failureCode || 'SERVER_ERROR';
  const productName = recoveryAssessment.productName || (recoveryAssessment.productId === 'ai-fullstack-program'
    ? 'AI & Full-Stack Development Program'
    : (recoveryAssessment.productId || 'Selected Product'));

  let title = 'Payment needs attention';
  let reason = 'Temporary payment processing issue';
  let messageText = `Your payment for ${productName} was not completed. Your purchase is still available. Please try again when you're ready.`;

  if (failureCode === 'SERVER_ERROR') {
    title = 'Payment needs attention';
    reason = 'Temporary payment processing issue';
    messageText = `Your payment for ${productName} was not completed due to a temporary server issue. Your purchase is still available. Please try again when you're ready.`;
  } else if (failureCode === 'NETWORK_ERROR') {
    title = 'Network connection issue';
    reason = 'Temporary network connectivity error';
    messageText = `Your payment for ${productName} was interrupted by a network connection error. Please check your connection and try again.`;
  } else if (failureCode === 'TIMEOUT') {
    title = 'Payment request timed out';
    reason = 'Payment request timed out';
    messageText = `The payment request for ${productName} timed out before completing. Please try your payment again.`;
  }

  const notificationId = `notif_${recoveryDecision.decisionId || 'demo'}`;
  const amount = Number(recoveryAssessment.amount || recoveryAssessment.revenueAtRisk) || 2000;
  const currency = recoveryAssessment.currency || 'INR';

  return {
    notificationId: notificationId,
    type: 'CUSTOMER_RECOVERY_NOTIFICATION',

    customerId: recoveryDecision.customerId || recoveryAssessment.customerId || 'customer_demo',
    productId: recoveryDecision.productId || recoveryAssessment.productId || 'ai-fullstack-program',
    productName: productName,

    paymentAttemptId: recoveryAssessment.paymentAttemptId || 'attempt_demo',
    paymentResultId: recoveryAssessment.paymentResultId || 'result_demo',

    channel: 'IN_APP',

    title: title,
    reason: reason,
    message: messageText,

    amount: amount,
    currency: currency,

    recommendedAction: 'RETRY_PAYMENT',

    status: 'READY',
    source: 'RULE_BASED_AGENT',

    timestamp: recoveryDecision.timestamp || new Date().toISOString()
  };
}
