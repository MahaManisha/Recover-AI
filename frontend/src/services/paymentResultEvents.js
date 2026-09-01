/**
 * Payment Result Events Service — RecoverAI M3 Page 1 Part 3
 * Handles in-memory creation of structured PAYMENT_SUCCESS and PAYMENT_FAILED result events.
 * Strictly excludes any sensitive payment credentials and references the original attempt via attemptId.
 */

/**
 * Creates a PAYMENT_SUCCESS result event.
 */
export function createPaymentSuccessEvent({ attemptEvent, customerId, merchantId, productId, productName, amount, currency, paymentMethod }) {
  const attemptId = typeof attemptEvent === 'string' ? attemptEvent : (attemptEvent?.id || 'att_unknown');
  
  return {
    id: `result_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    type: "PAYMENT_SUCCESS",
    attemptId: attemptId,
    customerId: customerId || attemptEvent?.customerId || "customer_demo",
    merchantId: merchantId || attemptEvent?.merchantId || "merchant_001",
    productId: productId || attemptEvent?.productId || "prod_ai_fullstack_001",
    productName: productName || attemptEvent?.productName || "AI & Full-Stack Development Program",
    amount: Number(amount) || attemptEvent?.amount || 2000,
    currency: currency || attemptEvent?.currency || "INR",
    paymentMethod: paymentMethod || attemptEvent?.paymentMethod || "CARD",
    timestamp: new Date().toISOString()
  };
}

/**
 * Creates a PAYMENT_FAILED result event with failureCode.
 */
export function createPaymentFailedEvent({ attemptEvent, customerId, merchantId, productId, productName, amount, currency, paymentMethod, failureCode }) {
  const attemptId = typeof attemptEvent === 'string' ? attemptEvent : (attemptEvent?.id || 'att_unknown');
  const validFailureCode = failureCode || "SERVER_ERROR";

  return {
    id: `result_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    type: "PAYMENT_FAILED",
    attemptId: attemptId,
    customerId: customerId || attemptEvent?.customerId || "customer_demo",
    merchantId: merchantId || attemptEvent?.merchantId || "merchant_001",
    productId: productId || attemptEvent?.productId || "prod_ai_fullstack_001",
    productName: productName || attemptEvent?.productName || "AI & Full-Stack Development Program",
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
export function createPaymentResultEvent({ outcome, attemptEvent, customerId, merchantId, productId, productName, amount, currency, paymentMethod }) {
  if (outcome?.status === "SUCCESS") {
    return createPaymentSuccessEvent({ attemptEvent, customerId, merchantId, productId, productName, amount, currency, paymentMethod });
  }

  return createPaymentFailedEvent({
    attemptEvent,
    customerId,
    merchantId,
    productId,
    productName,
    amount,
    currency,
    paymentMethod,
    failureCode: outcome?.failureCode || "SERVER_ERROR"
  });
}
