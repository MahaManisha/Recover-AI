/**
 * Payment Retry Service — RecoverAI M5 Page 2 Part 2
 * Provides helper utilities for tracking customer recovery retry attempts
 * and correlating retry attempts with original failed payment attempts.
 * 
 * STRICT BOUNDARY:
 * - Includes ONLY safe metadata (retryCount, retryOfAttemptId, amount, product, customer ID).
 * - NEVER includes card numbers, CVVs, expiry dates, UPI IDs, passwords, or tokens.
 * - Pure, deterministic, and free of side effects.
 */

/**
 * Creates structured retry metadata for correlating a retry attempt with an original attempt.
 * 
 * @param {string} originalAttemptId - The ID of the original failed PAYMENT_ATTEMPTED event
 * @param {number} currentRetryCount - The 1-indexed retry count (e.g. 1, 2)
 * @returns {Object} Safe retry attempt metadata object
 */
export function createRetryAttemptMetadata(originalAttemptId, currentRetryCount) {
  return {
    retryOfAttemptId: originalAttemptId || null,
    retryCount: typeof currentRetryCount === 'number' ? currentRetryCount : 1,
    timestamp: new Date().toISOString()
  };
}

/**
 * Constructs a full retry context object linking original attempt/result with retry tracking.
 * 
 * @param {Object|null} originalAttemptEvent - Original PAYMENT_ATTEMPTED event object
 * @param {Object|null} originalResultEvent - Original PAYMENT_FAILED event object
 * @param {number} retryCount - Current retry attempt count
 * @returns {Object|null} Structured retry context or null if missing inputs
 */
export function createRetryContext(originalAttemptEvent, originalResultEvent, retryCount = 1) {
  if (!originalAttemptEvent || !originalResultEvent) {
    return null;
  }

  return {
    retryOfAttemptId: originalAttemptEvent.id,
    originalResultId: originalResultEvent.id,
    retryCount: retryCount,
    customerId: originalAttemptEvent.customerId || 'customer_demo',
    productId: originalAttemptEvent.productId || 'ai-fullstack-program',
    amount: Number(originalAttemptEvent.amount) || 2000,
    currency: originalAttemptEvent.currency || 'INR',
    originalFailureCode: originalResultEvent.failureCode || 'SERVER_ERROR',
    timestamp: new Date().toISOString()
  };
}
