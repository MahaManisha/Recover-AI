/**
 * Demo Customer History Model — RecoverAI M4 Page 1 Part 3
 * Centralized deterministic customer payment behavior history for demo decision context.
 * 
 * IMPORTANT DATA HONESTY NOTICE:
 * - These values are EXPLICITLY SIMULATED DEMO VALUES.
 * - They do NOT represent real historical transactions.
 * - They do NOT come from Supabase or any persistent backend database.
 * - Do NOT persist these values to Supabase or local storage.
 */

/**
 * Returns deterministic demo recovery signals for an authenticated customer.
 * 
 * @param {string|null|undefined} customerId - Authenticated customer identifier (User ID or email)
 * @returns {Object|null} Demo recovery signals object or null if customer is not authenticated
 */
export function getDemoCustomerRecoverySignals(customerId) {
  if (!customerId || typeof customerId !== 'string' || !customerId.trim()) {
    return null;
  }

  const previousSuccessfulPayments = 5;
  const previousFailedPayments = 0;
  const totalPreviousAttempts = previousSuccessfulPayments + previousFailedPayments;

  // Derived value: successfulPaymentRate = (previousSuccessfulPayments / totalPreviousAttempts) * 100
  // Safely handles zero total attempts edge case to prevent NaN / Division-by-Zero errors
  const successfulPaymentRate = totalPreviousAttempts > 0 
    ? Math.round((previousSuccessfulPayments / totalPreviousAttempts) * 100)
    : 0;

  return {
    customerId: customerId.trim(),
    previousSuccessfulPayments,
    previousFailedPayments,
    totalPreviousAttempts,
    successfulPaymentRate,
    recentFailureCount: 0,
    currentRetryCount: 0,
    source: "DEMO_SIMULATION"
  };
}
