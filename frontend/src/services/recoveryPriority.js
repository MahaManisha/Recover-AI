/**
 * Revenue Recovery Priority Scoring Engine — RecoverAI M4 Page 1 Part 2
 * Evaluates a failed payment opportunity and assigns a deterministic recovery priority score (0-100).
 * Strictly explainable and rule-based without AI or unverified customer history.
 */

/**
 * Calculates the revenue score factor based on potential revenue at risk amount.
 * 
 * @param {number} amount - Revenue at risk amount
 * @returns {{ points: number, reason: string }} Revenue factor score and reason
 */
function getRevenueValueFactor(amount) {
  const numAmount = Number(amount) || 0;
  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(numAmount);

  if (numAmount >= 5000) {
    return {
      points: 50,
      reason: `${formattedAmount} potential revenue is at risk (High value tier ₹5,000+).`
    };
  } else if (numAmount >= 2000) {
    return {
      points: 40,
      reason: `${formattedAmount} potential revenue is at risk.`
    };
  } else if (numAmount >= 1000) {
    return {
      points: 30,
      reason: `${formattedAmount} potential revenue is at risk.`
    };
  } else if (numAmount >= 500) {
    return {
      points: 20,
      reason: `${formattedAmount} potential revenue is at risk.`
    };
  } else {
    return {
      points: 10,
      reason: `${formattedAmount} potential revenue is at risk.`
    };
  }
}

/**
 * Calculates the failure severity factor based on failureCode.
 * 
 * @param {string} failureCode - Failure classification ("SERVER_ERROR" | "NETWORK_ERROR" | "TIMEOUT")
 * @returns {{ points: number, reason: string }} Failure factor score and reason
 */
function getFailureSeverityFactor(failureCode) {
  const code = failureCode ? String(failureCode).toUpperCase() : 'UNKNOWN';

  switch (code) {
    case 'SERVER_ERROR':
      return {
        points: 30,
        reason: 'Server-side failure (SERVER_ERROR) may be recoverable with a later retry.'
      };
    case 'NETWORK_ERROR':
      return {
        points: 20,
        reason: 'Network connectivity failure (NETWORK_ERROR) detected.'
      };
    case 'TIMEOUT':
      return {
        points: 20,
        reason: 'Payment gateway timeout (TIMEOUT) detected.'
      };
    default:
      return {
        points: 10,
        reason: `Unclassified failure code (${code}) detected.`
      };
  }
}

/**
 * Calculates the payment context factor based on paymentMethod.
 * 
 * @param {string} paymentMethod - Payment method ("UPI" | "CARD" | "NET_BANKING")
 * @returns {{ points: number, reason: string }} Payment context factor score and reason
 */
function getPaymentContextFactor(paymentMethod) {
  const method = paymentMethod ? String(paymentMethod).toUpperCase() : 'UNKNOWN';

  switch (method) {
    case 'UPI':
      return {
        points: 10,
        reason: 'A payment attempt was made using UPI.'
      };
    case 'CARD':
      return {
        points: 10,
        reason: 'A payment attempt was made using CARD.'
      };
    case 'NET_BANKING':
      return {
        points: 10,
        reason: 'A payment attempt was made using NET_BANKING.'
      };
    default:
      return {
        points: 5,
        reason: `A payment attempt was made using ${method}.`
      };
  }
}

/**
 * Maps total score (0-100) to priority level ("LOW" | "MEDIUM" | "HIGH" | "CRITICAL").
 * 
 * @param {number} score - Total calculated score
 * @returns {"LOW" | "MEDIUM" | "HIGH" | "CRITICAL"} Priority level string
 */
function getPriorityLevel(score) {
  if (score >= 70) return 'CRITICAL';
  if (score >= 50) return 'HIGH';
  if (score >= 30) return 'MEDIUM';
  return 'LOW';
}

/**
 * Calculates the recovery priority for a failed payment opportunity.
 * 
 * @param {Object} revenueRiskContext - Revenue risk context object
 * @returns {Object|null} Priority evaluation result or null if context is invalid
 */
export function calculateRecoveryPriority(revenueRiskContext) {
  if (!revenueRiskContext || typeof revenueRiskContext !== 'object') {
    return null;
  }

  // Must have valid risk context data
  if (!revenueRiskContext.revenueAtRisk && !revenueRiskContext.amount) {
    return null;
  }

  const revenueFactor = getRevenueValueFactor(revenueRiskContext.revenueAtRisk || revenueRiskContext.amount);
  const failureFactor = getFailureSeverityFactor(revenueRiskContext.failureCode);
  const methodFactor = getPaymentContextFactor(revenueRiskContext.paymentMethod);

  const totalScore = revenueFactor.points + failureFactor.points + methodFactor.points;
  const priority = getPriorityLevel(totalScore);

  return {
    score: totalScore,
    priority: priority,
    revenueAtRisk: Number(revenueRiskContext.revenueAtRisk || revenueRiskContext.amount) || 2000,
    currency: revenueRiskContext.currency || 'INR',
    factors: [
      {
        name: 'Revenue Value',
        points: revenueFactor.points,
        reason: revenueFactor.reason
      },
      {
        name: 'Failure Severity',
        points: failureFactor.points,
        reason: failureFactor.reason
      },
      {
        name: 'Payment Context',
        points: methodFactor.points,
        reason: methodFactor.reason
      }
    ]
  };
}
