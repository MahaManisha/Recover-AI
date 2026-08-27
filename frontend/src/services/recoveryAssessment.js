/**
 * Recovery Assessment Service — RecoverAI M4 Page 1 Part 4
 * Combines Revenue Risk Context, Priority Scoring Engine results, and Customer Recovery Signals
 * into a single normalized decision context for future agent consumption.
 * 
 * STRICT BOUNDARY:
 * - This service ONLY organizes and normalizes evaluation context.
 * - It does NOT perform autonomous decisions, AI/LLM inference, or recovery actions.
 */

/**
 * Returns a human-readable failure summary based on the failure code.
 * 
 * @param {string} failureCode 
 * @returns {string} Human-readable failure description
 */
function getFailureSummary(failureCode) {
  const code = failureCode ? String(failureCode).toUpperCase() : 'UNKNOWN';

  switch (code) {
    case 'SERVER_ERROR':
      return 'Payment failed because of a server-side error.';
    case 'NETWORK_ERROR':
      return 'Payment failed because of a network connectivity issue.';
    case 'TIMEOUT':
      return 'Payment failed because the payment request timed out.';
    default:
      return `Payment failed due to an unclassified issue (${code}).`;
  }
}

/**
 * Returns a human-readable summary of customer history signals.
 * Based ONLY on simulated demo customer signals.
 * 
 * @param {Object|null} customerSignals 
 * @returns {string} Human-readable customer history summary
 */
function getCustomerHistorySummary(customerSignals) {
  if (!customerSignals || typeof customerSignals !== 'object') {
    return 'No customer payment history available.';
  }

  const rate = Number(customerSignals.successfulPaymentRate) || 0;
  if (rate >= 80) {
    return 'Customer has a strong simulated payment history.';
  }
  return 'Customer payment history requires attention.';
}

/**
 * Normalizes revenue risk, recovery priority, and customer signals into a complete Recovery Assessment.
 * 
 * @param {Object} revenueRiskContext - Revenue risk context object
 * @param {Object} recoveryPriority - Recovery priority scoring object
 * @param {Object|null} customerRecoverySignals - Customer recovery signals object
 * @returns {Object|null} Normalized recovery assessment object or null if context is invalid
 */
export function createRecoveryAssessment(revenueRiskContext, recoveryPriority, customerRecoverySignals) {
  if (!revenueRiskContext || typeof revenueRiskContext !== 'object') {
    return null;
  }

  if (!recoveryPriority || typeof recoveryPriority !== 'object') {
    return null;
  }

  const amount = Number(revenueRiskContext.amount || revenueRiskContext.revenueAtRisk) || 2000;
  const currency = revenueRiskContext.currency || 'INR';

  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: 0
  }).format(amount);

  const failureSummary = getFailureSummary(revenueRiskContext.failureCode);
  const customerHistorySummary = getCustomerHistorySummary(customerRecoverySignals);
  const revenueSummary = `${formattedAmount} potential revenue is at risk.`;

  const priorityLevelStr = recoveryPriority.priority ? String(recoveryPriority.priority).toLowerCase() : 'medium';
  
  const assessmentSummary = `${formattedAmount} potential revenue is at risk from a ${priorityLevelStr}-priority failed payment. The customer has a strong simulated payment history, making this a meaningful recovery opportunity.`;

  // Calculate recoveryOpportunity boolean
  const recoveryOpportunity = Boolean(
    revenueRiskContext &&
    amount > 0 &&
    recoveryPriority &&
    recoveryPriority.score > 0
  );

  return {
    paymentAttemptId: revenueRiskContext.paymentAttemptId || 'att_unknown',
    paymentResultId: revenueRiskContext.paymentResultId || 'result_unknown',
    customerId: revenueRiskContext.customerId || customerRecoverySignals?.customerId || 'customer_demo',
    productId: revenueRiskContext.productId || 'ai-fullstack-program',

    amount: amount,
    currency: currency,
    revenueAtRisk: amount,

    paymentMethod: revenueRiskContext.paymentMethod || 'CARD',
    failureCode: revenueRiskContext.failureCode || 'SERVER_ERROR',

    priorityScore: recoveryPriority.score || 0,
    priority: recoveryPriority.priority || 'LOW',
    priorityFactors: recoveryPriority.factors || [],

    customerSignals: customerRecoverySignals ? {
      previousSuccessfulPayments: customerRecoverySignals.previousSuccessfulPayments,
      previousFailedPayments: customerRecoverySignals.previousFailedPayments,
      totalPreviousAttempts: customerRecoverySignals.totalPreviousAttempts,
      successfulPaymentRate: customerRecoverySignals.successfulPaymentRate,
      recentFailureCount: customerRecoverySignals.recentFailureCount,
      currentRetryCount: customerRecoverySignals.currentRetryCount,
      source: customerRecoverySignals.source || 'DEMO_SIMULATION'
    } : null,

    assessment: {
      recoveryOpportunity,
      failureSummary,
      customerHistorySummary,
      revenueSummary,
      assessmentSummary
    },

    timestamp: revenueRiskContext.timestamp || new Date().toISOString()
  };
}
