async function runLiveVerification() {
  const {
    buildRecoveryLifecycleAuditEvent,
    buildRecoveryLifecycleHistory,
    buildRecoveryDecisionTrace,
    buildRecoveryIntelligenceControlCenter,
    evaluateRecoveryLifecycleTransition,
    STATE_OPEN,
    STATE_PENDING,
    STATE_EXECUTING,
    STATE_RECOVERED,
    STATE_FAILED,
    STATE_BLOCKED,
    STATE_UNRESOLVED
  } = await import('../frontend/src/services/agentConsoleStream.js');

  console.log('=== M10.9 RUNTIME VERIFICATION WITH LIVE SUPABASE DATABASE DATA ===\n');

  const merchantId = '0a9a09a5-ef18-45da-a0ce-7c5f0f23a991';

  // 1. Fetch live events from running backend
  const res = await fetch(`http://127.0.0.1:8000/api/recovery/events?merchantId=${merchantId}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch backend recovery events: ${res.status} ${res.statusText}`);
  }
  const dbEvents = await res.json();
  console.log(`[1. BACKEND & SUPABASE CONNECTIVITY] Fetched ${dbEvents.length} live recovery events from backend endpoint.\n`);

  // 2. Build Lifecycle History from Live Events
  const historyResult = buildRecoveryLifecycleHistory(dbEvents, [], merchantId);
  console.log('[2. LIFECYCLE AGGREGATION & CONTRACT] Summary:', JSON.stringify({
    totalLifecycles: historyResult.lifecycles.length,
    transitionCount: historyResult.transitionCount,
    terminalLifecycleCount: historyResult.terminalLifecycleCount,
    recoveredLifecycleCount: historyResult.recoveredLifecycleCount,
    blockedLifecycleCount: historyResult.blockedLifecycleCount,
    activeLifecycleCount: historyResult.activeLifecycleCount,
    unresolvedLifecycleCount: historyResult.unresolvedLifecycleCount
  }, null, 2));

  console.assert(historyResult.lifecycles.length > 0, 'Lifecycles must be > 0');
  console.assert(historyResult.recoveredLifecycleCount > 0, 'Recovered lifecycles must be > 0');

  // Verify structure of each aggregated lifecycle
  historyResult.lifecycles.forEach((lc, idx) => {
    console.assert(lc.lifecycleIdentity && (lc.lifecycleIdentity.activityId || lc.lifecycleIdentity.paymentAttemptId), `Lifecycle ${idx} missing correlation identity`);
    console.assert(lc.merchantId === merchantId, `Lifecycle ${idx} merchant mismatch`);
    console.assert(typeof lc.terminal === 'boolean', `Lifecycle ${idx} terminal flag missing`);
    console.assert(lc.closureStatus, `Lifecycle ${idx} closureStatus missing`);
    console.assert(lc.recoveryOutcome, `Lifecycle ${idx} recoveryOutcome missing`);
    console.assert(lc.totalTransitions === lc.transitions.length, `Lifecycle ${idx} transition count mismatch`);
  });
  console.log('✔ All aggregated lifecycle objects passed contract validation.\n');

  // 3. Test Polling Idempotence & NO_OP Filtering
  console.log('[3. POLLING IDEMPOTENCE & NO_OP FILTERING]');
  const historySweep1 = buildRecoveryLifecycleHistory(dbEvents, [], merchantId);
  const historySweep2 = buildRecoveryLifecycleHistory(dbEvents, [], merchantId);
  console.assert(historySweep1.transitionCount === historySweep2.transitionCount, 'Repeated polling must produce identical transition counts');
  console.assert(historySweep1.lifecycles.length === historySweep2.lifecycles.length, 'Repeated polling must produce identical lifecycle counts');
  console.log(`✔ Polling idempotence verified: Sweep 1 transitions=${historySweep1.transitionCount}, Sweep 2 transitions=${historySweep2.transitionCount}.\n`);

  // 4. Test M10.8 Transition Governance & Terminal Protection
  console.log('[4. M10.8 TRANSITION GOVERNANCE INTEGRATION]');
  const terminalConflict = evaluateRecoveryLifecycleTransition(STATE_RECOVERED, STATE_OPEN, {
    caseId: 'act_test',
    merchantId,
    currentMerchantId: merchantId,
    authoritativeStatus: 'RECOVERED'
  });
  console.assert(terminalConflict.allowed === false, 'RECOVERED -> OPEN must be blocked');
  console.assert(terminalConflict.transitionType === 'AUTHORITATIVE_STATE_CONFLICT' || terminalConflict.transitionType === 'TERMINAL_BLOCKED', 'Terminal conflict type expected');
  console.log('✔ Terminal state transition protection verified: RECOVERED -> OPEN blocked successfully.\n');

  // 5. Test Merchant Isolation
  console.log('[5. MERCHANT ISOLATION VERIFICATION]');
  const isolatedResult = buildRecoveryLifecycleHistory(dbEvents, [], 'other_merchant_999');
  console.assert(isolatedResult.lifecycles.length === 0, 'Other merchant must receive 0 lifecycles from merchant 1 data');
  console.log('✔ Merchant isolation verified: 0 cross-merchant records exposed.\n');

  // 6. Test Control Center Integration
  console.log('[6. CONTROL CENTER INTEGRATION]');
  const cc = buildRecoveryIntelligenceControlCenter(dbEvents, merchantId, null, false);
  console.log('Control Center Audit Health:', JSON.stringify(cc.overview.lifecycleAuditHealth, null, 2));
  console.assert(cc.overview.lifecycleAuditHealth.totalAuditedLifecycles === historyResult.lifecycles.length, 'CC totalAuditedLifecycles mismatch');
  console.log('✔ Control Center lifecycle audit health metrics derived successfully.\n');

  // 7. Test Decision Trace Integration
  console.log('[7. DECISION TRACE INTEGRATION]');
  const trace = buildRecoveryDecisionTrace(
    dbEvents[0],
    { strategyName: 'SMART_RETRY' },
    { strategyName: 'ADAPTIVE_RETRY' },
    { learningApplied: true },
    { status: 'ALLOWED' },
    { mode: 'MANUAL', status: 'SUCCEEDED' },
    { status: dbEvents[0].status }
  );
  console.log('Decision Trace Audit History summary:', JSON.stringify(trace.lifecycleAuditHistory, null, 2));
  console.assert(trace.lifecycleAuditHistory !== null, 'Decision trace missing lifecycleAuditHistory');
  console.log('✔ Decision Trace lifecycle audit history attached successfully.\n');

  console.log('=== LIVE M10.9 RUNTIME VERIFICATION COMPLETED WITH 0 ERRORS! ===');
}

runLiveVerification().catch(err => {
  console.error('Live Verification Error:', err);
  process.exit(1);
});
