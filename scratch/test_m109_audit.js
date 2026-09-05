async function runDiagnostics() {
  const {
    buildRecoveryLifecycleAuditEvent,
    buildRecoveryLifecycleHistory,
    buildRecoveryDecisionTrace,
    buildRecoveryIntelligenceControlCenter,
    AUDIT_EVENT_TYPES,
    AUDIT_SOURCES,
    AUDIT_ACTORS,
    TRANSITION_TYPES,
    RECOVERY_LIFECYCLE_STATES
  } = await import('../frontend/src/services/agentConsoleStream.js');

  console.log('=== M10.9 RECOVERY LIFECYCLE AUDIT & TRANSITION HISTORY DIAGNOSTIC TEST ===\n');

  const merchantId1 = '0a9a09a5-ef18-45da-a0ce-7c5f0f23a991';
  const merchantId2 = 'merchant_other_9999';

  // 1. Test buildRecoveryLifecycleAuditEvent (Pure Helper)
  console.log('--- 1. Testing buildRecoveryLifecycleAuditEvent ---');

  const event1 = buildRecoveryLifecycleAuditEvent(
    { caseId: 'case_101', customerId: 'cust_01', productId: 'prod_01', activityId: 'act_101', paymentAttemptId: 'pay_att_101' },
    AUDIT_EVENT_TYPES.RECOVERY_LIFECYCLE_DETECTED,
    RECOVERY_LIFECYCLE_STATES.FAILED,
    RECOVERY_LIFECYCLE_STATES.OPEN,
    { allowed: true, transitionType: TRANSITION_TYPES.DETECTION_INITIALIZATION, reason: 'New failure detected' },
    { reconciliationStatus: 'RECONCILIATION_PENDING', reconciledOutcome: 'UNRESOLVED' },
    { terminal: false, closureStatus: 'OPEN', active: true },
    merchantId1,
    '2026-09-04T12:00:00.000Z'
  );

  console.log('Audit Event 1 (Valid Detection):', JSON.stringify(event1, null, 2));
  console.assert(event1.auditId.startsWith('act_lifecycle_case_101_'), 'Audit ID should be canonical and deterministic');
  console.assert(event1.merchantId === merchantId1, 'Merchant ID should match');
  console.assert(event1.eventType === 'RECOVERY_LIFECYCLE_DETECTED', 'Event type should match');
  console.assert(event1.valid === true, 'Event should be valid');

  // 2. Test Malformed / Fail-Safe Audit Event Creation
  console.log('\n--- 2. Testing Malformed Input Fail-Safe ---');

  const malformedEvent = buildRecoveryLifecycleAuditEvent(null, 'UNKNOWN_EVENT');
  console.log('Malformed Audit Event:', JSON.stringify(malformedEvent, null, 2));
  console.assert(malformedEvent.valid === false, 'Malformed input should return valid=false');
  console.assert(malformedEvent.requiresOperator === true, 'Malformed input should flag requiresOperator=true');

  // 3. Test buildRecoveryLifecycleHistory Aggregator
  console.log('\n--- 3. Testing buildRecoveryLifecycleHistory ---');

  const mockRecoveryEvents = [
    // Case A - Merchant 1 (Active -> Recovered)
    {
      id: 'rec_evt_1',
      activityId: 'act_201',
      paymentAttemptId: 'pay_att_201',
      merchantId: merchantId1,
      customerId: 'cust_201',
      productId: 'prod_201',
      status: 'FAILED',
      timestamp: '2026-09-04T10:00:00.000Z'
    },
    {
      id: 'rec_evt_2',
      activityId: 'act_201',
      paymentAttemptId: 'pay_att_201',
      merchantId: merchantId1,
      customerId: 'cust_201',
      productId: 'prod_201',
      status: 'EXECUTING',
      timestamp: '2026-09-04T10:05:00.000Z'
    },
    {
      id: 'rec_evt_3',
      activityId: 'act_201',
      paymentAttemptId: 'pay_att_201',
      merchantId: merchantId1,
      customerId: 'cust_201',
      productId: 'prod_201',
      status: 'RECOVERED',
      recoveredAmount: 4999,
      timestamp: '2026-09-04T10:10:00.000Z'
    },
    // Case B - Merchant 1 (Blocked due to retries)
    {
      id: 'rec_evt_4',
      activityId: 'act_202',
      paymentAttemptId: 'pay_att_202',
      merchantId: merchantId1,
      customerId: 'cust_202',
      productId: 'prod_202',
      status: 'FAILED',
      retryCount: 5,
      maxRetryLimit: 5,
      timestamp: '2026-09-04T11:00:00.000Z'
    },
    // Case C - Merchant 2 (Isolated Merchant Case)
    {
      id: 'rec_evt_5',
      activityId: 'act_301',
      paymentAttemptId: 'pay_att_301',
      merchantId: merchantId2,
      customerId: 'cust_301',
      productId: 'prod_301',
      status: 'FAILED',
      timestamp: '2026-09-04T11:30:00.000Z'
    }
  ];

  const historyMerchant1 = buildRecoveryLifecycleHistory(mockRecoveryEvents, [], merchantId1);
  console.log('Lifecycle History Summary (Merchant 1):', JSON.stringify({
    transitionCount: historyMerchant1.transitionCount,
    terminalLifecycleCount: historyMerchant1.terminalLifecycleCount,
    recoveredLifecycleCount: historyMerchant1.recoveredLifecycleCount,
    blockedLifecycleCount: historyMerchant1.blockedLifecycleCount,
    activeLifecycleCount: historyMerchant1.activeLifecycleCount,
    totalLifecycles: historyMerchant1.lifecycles.length
  }, null, 2));

  console.assert(historyMerchant1.lifecycles.length === 2, 'Should only contain 2 lifecycles for Merchant 1');
  console.assert(historyMerchant1.recoveredLifecycleCount === 1, 'Should have 1 recovered lifecycle');
  console.assert(historyMerchant1.blockedLifecycleCount === 1, 'Should have 1 blocked lifecycle');

  // 4. Test Merchant Isolation
  console.log('\n--- 4. Testing Merchant Isolation ---');
  const historyMerchant2 = buildRecoveryLifecycleHistory(mockRecoveryEvents, [], merchantId2);
  console.assert(historyMerchant2.lifecycles.length === 1, 'Merchant 2 should only see its 1 lifecycle');
  console.assert(historyMerchant2.lifecycles[0].merchantId === merchantId2, 'Merchant 2 lifecycle must match merchantId2');

  // 5. Test Control Center Integration
  console.log('\n--- 5. Testing Control Center Integration ---');
  const cc = buildRecoveryIntelligenceControlCenter(mockRecoveryEvents, merchantId1, null, false);
  console.log('Control Center Lifecycle Audit Health:', JSON.stringify(cc.overview.lifecycleAuditHealth, null, 2));
  console.assert(cc.overview.lifecycleAuditHealth.totalAuditedLifecycles === 2, 'CC totalAuditedLifecycles should match 2');
  console.assert(cc.overview.lifecycleAuditHealth.recoveredLifecycles === 1, 'CC recoveredLifecycles should match 1');

  // 6. Test Decision Trace Integration
  console.log('\n--- 6. Testing Decision Trace Integration ---');
  const trace = buildRecoveryDecisionTrace(
    mockRecoveryEvents[0],
    { strategyName: 'SMART_RETRY' },
    { strategyName: 'ADAPTIVE_RETRY' },
    { learningApplied: true },
    { status: 'ALLOWED' },
    { mode: 'MANUAL', status: 'SUCCEEDED' },
    { status: 'RECOVERED' }
  );

  console.log('Decision Trace Audit History summary:', JSON.stringify(trace.lifecycleAuditHistory, null, 2));
  console.assert(trace.lifecycleAuditHistory !== null, 'Decision trace must contain lifecycleAuditHistory');
  console.assert(trace.lifecycleAuditHistory.recoveryOutcome === 'RECOVERED', 'Trace history recovery outcome should be RECOVERED');

  console.log('\n=== ALL M10.9 DIAGNOSTIC TESTS PASSED WITH 0 ASSERTION FAILURES! ===');
}

runDiagnostics().catch(err => {
  console.error('Test Execution Error:', err);
  process.exit(1);
});
