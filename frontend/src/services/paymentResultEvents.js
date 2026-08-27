/**
 * Payment Result Events Service — RecoverAI M3 Page 1 Part 3
 * Handles in-memory creation of structured PAYMENT_SUCCESS and PAYMENT_FAILED result events.
 * Strictly excludes any sensitive payment credentials and references the original attempt via attemptId.
 */

/**
 * Creates a PAYMENT_SUCCESS result event.
 */
export function createPaymentSuccessEvent({ attemptEvent, customerId, productId, amount, currency, paymentMethod }) {
  const attemptId = typeof attemptEvent === 'string' ? attemptEvent : (attemptEvent?.id || 'att_unknown');
  
  return {
    id: `result_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    type: "PAYMENT_SUCCESS",
    attemptId: attemptId,
    customerId: customerId || attemptEvent?.customerId || "customer_demo",
    productId: productId || attemptEvent?.productId || "ai-fullstack-program",
    amount: Number(amount) || attemptEvent?.amount || 2000,
    currency: currency || attemptEvent?.currency || "INR",
    paymentMethod: paymentMethod || attemptEvent?.paymentMethod || "CARD",
    timestamp: new Date().toISOString()
  };
}

/**
 * Creates a PAYMENT_FAILED result event with failureCode.
 */
export function createPaymentFailedEvent({ attemptEvent, customerId, productId, amount, currency, paymentMethod, failureCode }) {
  const attemptId = typeof attemptEvent === 'string' ? attemptEvent : (attemptEvent?.id || 'att_unknown');
  const validFailureCode = failureCode || "SERVER_ERROR";

  return {
    id: `result_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    type: "PAYMENT_FAILED",
    attemptId: attemptId,
    customerId: customerId || attemptEvent?.customerId || "customer_demo",
    productId: productId || attemptEvent?.productId || "ai-fullstack-program",
    amount: Number(amount) || attemptEvent?.amount || 2000,
    currency: currency || attemptEvent?.currency || "INR",
    paymentMethod: paymentMethod || attemptEvent?.paymentMethod || "CARD",
    failureCode: validFailureCode,
    timestamp: new Date().toISOString()
  };
}

/**
 * Factory function to create a result event based on the payment outcome.
 */
export function createPaymentResultEvent({ outcome, attemptEvent, customerId, productId, amount, currency, paymentMethod }) {
  if (outcome?.status === "SUCCESS") {
    return createPaymentSuccessEvent({ attemptEvent, customerId, productId, amount, currency, paymentMethod });
  }

  return createPaymentFailedEvent({
    attemptEvent,
    customerId,
    productId,
    amount,
    currency,
    paymentMethod,
    failureCode: outcome?.failureCode || "SERVER_ERROR"
  });
}
