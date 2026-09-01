/**
 * Revenue-at-Risk Data Model — RecoverAI M4 Page 1 Part 1
 * Normalizes PAYMENT_FAILED result events into a structured Revenue-at-Risk context.
 * Strictly excludes sensitive payment credentials.
 */

/**
 * Creates a normalized Revenue-at-Risk context object from a PAYMENT_FAILED event.
 * 
 * @param {Object} paymentFailedEvent - The PAYMENT_FAILED result event object
 * @returns {Object|null} Normalized revenue risk context or null if not a PAYMENT_FAILED event
 */
export function createRevenueRiskContext(paymentFailedEvent) {
  if (!paymentFailedEvent || typeof paymentFailedEvent !== 'object') {
    return null;
  }

  // Validate that the source event is strictly a PAYMENT_FAILED event
  if (paymentFailedEvent.type !== 'PAYMENT_FAILED') {
    return null;
  }

  const amount = Number(paymentFailedEvent.amount) || 2000;

  return {
    paymentAttemptId: paymentFailedEvent.attemptId || 'att_unknown',
    paymentResultId: paymentFailedEvent.id || 'result_unknown',
    customerId: paymentFailedEvent.customerId || 'customer_demo',
    merchantId: paymentFailedEvent.merchantId || 'merchant_001',
    productId: paymentFailedEvent.productId || 'prod_ai_fullstack_001',
    productName: paymentFailedEvent.productName || 'AI & Full-Stack Development Program',
    amount: amount,
    currency: paymentFailedEvent.currency || 'INR',
    revenueAtRisk: amount, // Potential purchase value at risk if customer abandons
    paymentMethod: paymentFailedEvent.paymentMethod || 'CARD',
    failureCode: paymentFailedEvent.failureCode || 'SERVER_ERROR',
    timestamp: paymentFailedEvent.timestamp || new Date().toISOString()
  };
}
