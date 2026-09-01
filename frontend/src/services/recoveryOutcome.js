/**
 * Recovery Outcome Service — RecoverAI M5 Page 2 Part 3
 * Evaluates whether a payment retry represents a successfully recovered commercial opportunity
 * and constructs a structured RECOVERY_OUTCOME context.
 * 
 * STRICT BOUNDARY:
 * - Pure, deterministic function in React memory state.
 * - Does NOT make backend/Supabase database writes or external payment provider calls.
 * - Strictly excludes sensitive payment credentials.
 */

/**
 * Evaluates original failure context and retry result to produce a RECOVERY_OUTCOME object.
 * 
 * @param {Object|null} originalFailedAttempt - Original failed PAYMENT_ATTEMPTED event
 * @param {Object|null} originalFailedResult - Original PAYMENT_FAILED event
 * @param {Object|null} retryAttempt - Retry PAYMENT_ATTEMPTED event
 * @param {Object|null} retryResult - Retry PAYMENT_SUCCESS event
 * @returns {Object|null} Structured RECOVERY_OUTCOME object or null if conditions are not met
 */
export function createRecoveryOutcome(
  originalFailedAttempt,
  originalFailedResult,
  retryAttempt,
  retryResult
) {
  // Validate inputs
  if (!originalFailedAttempt || typeof originalFailedAttempt !== 'object') return null;
  if (!originalFailedResult || typeof originalFailedResult !== 'object') return null;
  if (!retryAttempt || typeof retryAttempt !== 'object') return null;
  if (!retryResult || typeof retryResult !== 'object') return null;

  // 1. Original result MUST be PAYMENT_FAILED
  if (originalFailedResult.type !== 'PAYMENT_FAILED') {
    return null;
  }

  // 2. Retry result MUST be PAYMENT_SUCCESS
  if (retryResult.type !== 'PAYMENT_SUCCESS') {
    return null;
  }

  // 3. Retry attempt MUST correlate to original attempt
  if (retryAttempt.retryOfAttemptId !== originalFailedAttempt.id) {
    return null;
  }

  const revenueAtRisk = Number(originalFailedAttempt.amount || originalFailedResult.amount) || 2000;
  const recoveredRevenue = Number(retryAttempt.amount || retryResult.amount) || 2000;
  const currency = retryAttempt.currency || originalFailedAttempt.currency || 'INR';

  return {
    recoveryId: `recovery_${retryResult.id || Date.now()}`,
    type: 'RECOVERY_OUTCOME',

    originalPaymentAttemptId: originalFailedAttempt.id,
    originalPaymentResultId: originalFailedResult.id,
    retryPaymentAttemptId: retryAttempt.id,
    retryPaymentResultId: retryResult.id,

    customerId: retryAttempt.customerId || originalFailedAttempt.customerId || 'customer_demo',
    merchantId: retryAttempt.merchantId || originalFailedAttempt.merchantId || 'merchant_001',
    productId: retryAttempt.productId || originalFailedAttempt.productId || 'prod_ai_fullstack_001',
    productName: retryAttempt.productName || originalFailedAttempt.productName || 'AI & Full-Stack Development Program',

    revenueAtRisk: revenueAtRisk,
    recoveredRevenue: recoveredRevenue,
    currency: currency,

    recoveryStatus: 'RECOVERED',
    retryCount: retryAttempt.retryCount || 1,

    source: 'DEMO_SIMULATION',
    timestamp: new Date().toISOString()
  };
}
