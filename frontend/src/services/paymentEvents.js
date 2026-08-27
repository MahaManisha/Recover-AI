/**
 * Payment Events Service — RecoverAI Simulation Engine
 * Handles in-memory creation of simulated payment events.
 * Strictly excludes any sensitive payment credentials.
 */

export function createPaymentAttempt({ customerId, productId, amount, currency, paymentMethod, retryCount, retryOfAttemptId }) {
  const attempt = {
    id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    type: "PAYMENT_ATTEMPTED",
    customerId: customerId || "customer_demo",
    productId: productId || "ai-fullstack-program",
    amount: Number(amount) || 2000,
    currency: currency || "INR",
    paymentMethod: paymentMethod, // "UPI" | "CARD" | "NET_BANKING"
    timestamp: new Date().toISOString()
  };

  if (retryCount !== undefined && retryCount !== null && retryCount > 0) {
    attempt.retryCount = retryCount;
  }
  if (retryOfAttemptId) {
    attempt.retryOfAttemptId = retryOfAttemptId;
  }

  return attempt;
}
