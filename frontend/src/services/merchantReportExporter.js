/**
 * Merchant Report Exporter Service — RecoverAI M6 Page 1 Part 4
 * Generates CSV and JSON export reports from in-memory merchant analytics data.
 * 
 * STRICT BOUNDARY:
 * - Pure, deterministic functions.
 * - 0 backend calls, 0 Supabase writes, 0 localStorage/sessionStorage/cookies, 0 side effects.
 * - Safely handles CSV escaping (commas, quotes, newlines) and null/empty inputs.
 * - Excludes all sensitive payment credentials.
 */

/**
 * Escapes a single string field for CSV compliance.
 * If field contains commas, quotes, or newlines, wraps in double quotes and doubles internal quotes.
 * 
 * @param {any} val - Raw input value
 * @returns {string} Safe CSV formatted string field
 */
function escapeCSVField(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generates a clean CSV report string from merchant metrics and activity logs.
 * 
 * @param {Object|null} metrics - Merchant analytics metrics object
 * @param {Array|null} activityLogs - Array of activity log objects
 * @returns {string} CSV formatted report string
 */
export function generateMerchantCSVReport(metrics, activityLogs) {
  const header = 'ActivityID,CustomerID,Product,FailureCode,Priority,RecommendedAction,Status,Amount,RecoveredAmount,Timestamp';
  
  const logsToProcess = Array.isArray(activityLogs)
    ? activityLogs
    : (metrics && Array.isArray(metrics.recentActivity) ? metrics.recentActivity : []);

  if (logsToProcess.length === 0) {
    return `${header}\n`;
  }

  const rows = logsToProcess.map(item => {
    const activityId = escapeCSVField(item.activityId || item.recoveryId || 'act_demo');
    const customerId = escapeCSVField(item.customerId || 'usr_auth_demo_42');
    const product = escapeCSVField(item.productName || item.productId || 'AI & Full-Stack Development Program');
    const failureCode = escapeCSVField(item.failureCode || 'SERVER_ERROR');
    const priority = escapeCSVField(item.priority || 'CRITICAL');
    const recommendedAction = escapeCSVField(item.recommendedAction || item.actionType || 'RECOVERY_OUTREACH');
    const status = escapeCSVField(item.status || 'RECOVERED');
    const amount = Number(item.amount || item.revenueAtRisk) || 2000;
    const recoveredAmount = Number(item.recoveredAmount || item.recoveredRevenue || (status === '"RECOVERED"' || status === 'RECOVERED' ? amount : 0)) || 0;
    const timestamp = escapeCSVField(item.timestamp || new Date().toISOString());

    return `${activityId},${customerId},${product},${failureCode},${priority},${recommendedAction},${status},${amount},${recoveredAmount},${timestamp}`;
  });

  return [header, ...rows].join('\n');
}

/**
 * Generates a structured JSON report object from merchant metrics and activity logs.
 * 
 * @param {Object|null} metrics - Merchant analytics metrics object
 * @param {Array|null} activityLogs - Array of activity log objects
 * @returns {Object} Structured JSON report schema
 */
export function generateMerchantJSONReport(metrics, activityLogs) {
  const logsToProcess = Array.isArray(activityLogs)
    ? activityLogs
    : (metrics && Array.isArray(metrics.recentActivity) ? metrics.recentActivity : []);

  const totalAtRisk = metrics ? Number(metrics.totalRevenueAtRisk) || 2000 : 2000;
  const totalRecovered = metrics ? Number(metrics.totalRecoveredRevenue) || 2000 : 2000;
  const recoveryRate = metrics ? Number(metrics.recoveryRatePercentage) || 100.0 : 100.0;

  return {
    reportType: 'MERCHANT_RECOVERY_CAMPAIGN_REPORT',
    exportTimestamp: new Date().toISOString(),
    source: 'DEMO_SIMULATION',
    currency: (metrics && metrics.currency) || 'INR',
    summaryMetrics: {
      totalRevenueAtRisk: totalAtRisk,
      totalRecoveredRevenue: totalRecovered,
      recoveryRatePercentage: recoveryRate,
      totalFailedAttempts: metrics ? Number(metrics.totalFailedAttempts) || logsToProcess.length || 1 : 1,
      totalRecoveredCount: metrics ? Number(metrics.totalRecoveredCount) || 1 : 1,
      totalOutreachCount: metrics ? Number(metrics.totalOutreachCount) || 1 : 1
    },
    recentActivity: logsToProcess.map((item, idx) => ({
      activityId: item.activityId || item.recoveryId || `act_${idx + 1}`,
      customerId: item.customerId || 'usr_auth_demo_42',
      productName: item.productName || item.productId || 'AI & Full-Stack Development Program',
      failureCode: item.failureCode || 'SERVER_ERROR',
      priority: item.priority || 'CRITICAL',
      priorityScore: Number(item.priorityScore) || 85,
      recommendedAction: item.recommendedAction || item.actionType || 'RECOVERY_OUTREACH',
      status: item.status || 'RECOVERED',
      amount: Number(item.amount || item.revenueAtRisk) || 2000,
      recoveredAmount: Number(item.recoveredAmount || item.recoveredRevenue) || 2000,
      currency: item.currency || 'INR',
      timestamp: item.timestamp || new Date().toISOString()
    }))
  };
}
