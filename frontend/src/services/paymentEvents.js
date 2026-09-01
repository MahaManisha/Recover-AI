/**
 * Payment Events Service — RecoverAI Simulation Engine
 * Handles in-memory creation of simulated payment events.
 * Strictly excludes any sensitive payment credentials.
 */

export function createPaymentAttempt({ customerId, merchantId, productId, productName, amount, currency, paymentMethod, retryCount, retryOfAttemptId }) {
  const attempt = {
    id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    type: "PAYMENT_ATTEMPTED",
    customerId: customerId || "customer_demo",
    merchantId: merchantId || "merchant_001",
    productId: productId || "prod_ai_fullstack_001",
    productName: productName || "AI & Full-Stack Development Program",
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
