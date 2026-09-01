/**
 * Compliance & Audit Log Service — RecoverAI M7 Page 2 Part 1
 * Centralized enterprise compliance audit service providing immutable snapshot data,
 * deterministic event filtering, and safe JSON exporting.
 * 
 * STRICT BOUNDARY:
 * - 0 backend API calls, 0 DB writes, 0 storage writes (localStorage/sessionStorage/cookies).
 * - Pure deterministic functions operating strictly in React memory state.
 * - Strictly excludes sensitive payment credentials, tokens, or private secrets.
 */

/**
 * Returns default chronological system audit trail snapshots for demo simulation.
 * 
 * @param {Object|null} sourceData - Optional live state to combine into audit trail
 * @returns {Array<Object>} Chronological array of audit entry objects
 */
export function getSystemAuditTrail(sourceData) {
  const baseTimestamp = new Date('2026-08-27T12:00:00.000Z').getTime();

  const defaultTrail = [
    {
      auditId: 'aud_1001',
      eventType: 'POLICY_CHANGE',
      source: 'RULE_ENGINE',
      actor: 'Merchant Operator',
      status: 'COMPLETED',
      timestamp: new Date(baseTimestamp - 3600000 * 5).toISOString(),
      isSimulated: true,
      metadata: {
        settingName: 'minRevenueThreshold',
        previousValue: '₹1,000 INR',
        newValue: '₹2,000 INR',
        details: 'Merchant modified revenue risk qualification threshold.'
      }
    },
    {
      auditId: 'aud_1002',
      eventType: 'RECOVERY_DECISION',
      source: 'AGENT_CONSOLE',
      actor: 'Autonomous AI Agent',
      status: 'COMPLETED',
      timestamp: new Date(baseTimestamp - 3600000 * 4).toISOString(),
      isSimulated: true,
      metadata: {
        customerId: 'usr_demo_42',
        productId: 'ai-fullstack-program',
        productName: 'AI & Full-Stack Development Program',
        paymentAttemptId: 'att_demo_901',
        amount: 2000,
        currency: 'INR',
        failureCode: 'SERVER_ERROR',
        evaluatedPriority: 'CRITICAL',
        evaluatedScore: 100,
        decisionAction: 'RECOVERY_OUTREACH',
        details: 'AI Agent evaluated failed payment and qualified opportunity for automated outreach.'
      }
    },
    {
      auditId: 'aud_1003',
      eventType: 'MANUAL_ACTION_OVERRIDE',
      source: 'OPERATOR_SIMULATION',
      actor: 'Merchant Operator',
      status: 'OVERRIDDEN',
      timestamp: new Date(baseTimestamp - 3600000 * 3).toISOString(),
      isSimulated: true,
      metadata: {
        targetId: 'opp_101',
        originalAction: 'RECOVERY_OUTREACH',
        revisedAction: 'MANUAL_REVIEW',
        overrideReason: 'Operator requested manual review prior to sending email outreach.',
        details: 'Manual override executed by merchant operator in simulation console.'
      }
    },
    {
      auditId: 'aud_1004',
      eventType: 'RECOVERY_ACTION_PLAN',
      source: 'AGENT_CONSOLE',
      actor: 'Autonomous AI Agent',
      status: 'COMPLETED',
      timestamp: new Date(baseTimestamp - 3600000 * 2).toISOString(),
      isSimulated: true,
      metadata: {
        customerId: 'usr_demo_42',
        productId: 'ai-fullstack-program',
        channel: 'EMAIL',
        actionType: 'SEND_OUTREACH',
        draftMessage: 'Hi Customer, your payment of ₹2,000 for AI Program was interrupted.',
        details: 'Action plan created and outreach message draft generated.'
      }
    },
    {
      auditId: 'aud_1005',
      eventType: 'RECOVERY_EXECUTION_SIMULATED',
      source: 'AGENT_CONSOLE',
      actor: 'Autonomous AI Agent',
      status: 'SIMULATED',
      timestamp: new Date(baseTimestamp - 3600000 * 1.5).toISOString(),
      isSimulated: true,
      metadata: {
        executionId: 'exec_demo_301',
        channel: 'EMAIL',
        dispatchResult: 'SIMULATED_SUCCESS',
        details: 'Outreach execution simulated successfully. Customer notification dispatched.'
      }
    },
    {
      auditId: 'aud_1006',
      eventType: 'WEBHOOK_SIMULATED',
      source: 'WEBHOOK_SIMULATOR',
      actor: 'Webhook Simulator Engine',
      status: 'SIMULATED',
      timestamp: new Date(baseTimestamp - 3600000 * 1).toISOString(),
      isSimulated: true,
      metadata: {
        webhookEventType: 'RECOVERY_TRIGGERED',
        endpoint: 'https://merchant.example.com/webhooks/recoverai',
        responseCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-RecoverAI-Event': 'RECOVERY_TRIGGERED',
          'X-RecoverAI-Environment': 'demo-simulation'
        },
        details: 'Simulated enterprise webhook event generated and dispatched.'
      }
    },
    {
      auditId: 'aud_1007',
      eventType: 'CUSTOMER_RETRY',
      source: 'CUSTOMER_PORTAL',
      actor: 'Customer (usr_demo_42)',
      status: 'COMPLETED',
      timestamp: new Date(baseTimestamp - 1800000).toISOString(),
      isSimulated: true,
      metadata: {
        customerId: 'usr_demo_42',
        productId: 'ai-fullstack-program',
        paymentAttemptId: 'att_retry_902',
        retryStatus: 'PAYMENT_SUCCESS',
        details: 'Customer completed payment retry attempt successfully.'
      }
    },
    {
      auditId: 'aud_1008',
      eventType: 'RECOVERY_OUTCOME',
      source: 'RULE_ENGINE',
      actor: 'RecoverAI System',
      status: 'COMPLETED',
      timestamp: new Date(baseTimestamp).toISOString(),
      isSimulated: true,
      metadata: {
        recoveryOutcome: 'RECOVERED',
        recoveredAmount: 2000,
        currency: 'INR',
        customerId: 'usr_demo_42',
        details: 'Payment recovery completed. ₹2,000 INR net revenue recovered.'
      }
    }
  ];

  const sortedDefault = [...defaultTrail].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // If live sourceData provides runtime customEvents, place them FIRST (newest -> oldest) ahead of default demo trail
  if (sourceData && Array.isArray(sourceData.customEvents) && sourceData.customEvents.length > 0) {
    const sortedCustom = [...sourceData.customEvents].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    const seenIds = new Set();
    const combined = [];

    // Prepend runtime audit entries first
    for (const item of sortedCustom) {
      if (item && item.auditId && !seenIds.has(item.auditId)) {
        seenIds.add(item.auditId);
        combined.push(item);
      }
    }

    // Append default demo fallback entries below runtime entries
    for (const item of sortedDefault) {
      if (item && item.auditId && !seenIds.has(item.auditId)) {
        seenIds.add(item.auditId);
        combined.push(item);
      }
    }

    return combined;
  }

  return sortedDefault;
}

/**
 * Pure deterministic function to filter audit log entries.
 * 
 * @param {Array<Object>} auditLogs - Full audit entries array
 * @param {Object} filters - Filter criteria { searchQuery, eventType, status }
 * @returns {Array<Object>} Filtered audit entries array
 */
export function filterAuditLogs(auditLogs, filters = {}) {
  if (!Array.isArray(auditLogs)) return [];

  const query = (filters.searchQuery || '').trim().toLowerCase();
  const eventType = (filters.eventType || 'ALL').toUpperCase();
  const status = (filters.status || 'ALL').toUpperCase();

  return auditLogs.filter((entry) => {
    // 1. Event Type Filter
    if (eventType !== 'ALL' && (entry.eventType || '').toUpperCase() !== eventType) {
      return false;
    }

    // 2. Status Filter
    if (status !== 'ALL' && (entry.status || '').toUpperCase() !== status) {
      return false;
    }

    // 3. Search Query Filter
    if (query) {
      const auditId = (entry.auditId || '').toLowerCase();
      const type = (entry.eventType || '').toLowerCase();
      const src = (entry.source || '').toLowerCase();
      const act = (entry.actor || '').toLowerCase();
      const details = (entry.metadata?.details || '').toLowerCase();
      const customerId = (entry.metadata?.customerId || '').toLowerCase();

      const matches = 
        auditId.includes(query) ||
        type.includes(query) ||
        src.includes(query) ||
        act.includes(query) ||
        details.includes(query) ||
        customerId.includes(query);

      if (!matches) return false;
    }

    return true;
  });
}

/**
 * Pure deterministic function to generate a safe JSON export string.
 * STRICTLY SIMULATED — DOES NOT DISPATCH DATA ANYWHERE.
 * 
 * @param {Array<Object>} auditLogs - Audit log entries to export
 * @returns {string} Formatted JSON string ready for client download
 */
export function exportAuditLogs(auditLogs) {
  const safeLogs = Array.isArray(auditLogs) ? auditLogs : [];

  const exportPayload = {
    exportHeader: {
      system: 'RecoverAI Enterprise Compliance & Audit System',
      environment: 'DEMO_SIMULATION',
      exportTimestamp: new Date().toISOString(),
      totalRecords: safeLogs.length,
      disclaimer: 'Simulated environment export — generated entirely in client memory.'
    },
    auditTrail: safeLogs
  };

  return JSON.stringify(exportPayload, null, 2);
}
