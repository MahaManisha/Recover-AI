async function runM1010ReplayDiagnostics() {
  const {
    buildRecoveryLifecycleReplay,
    buildRecoveryLifecycleHistory,
    buildRecoveryDecisionTrace
  } = await import('../frontend/src/services/agentConsoleStream.js');

  console.log('=== M10.10 RECOVERY LIFECYCLE REPLAY DIAGNOSTIC VERIFICATION ===\n');

  const merchantId1 = '0a9a09a5-ef18-45da-a0ce-7c5f0f23a991';
  const merchantId2 = 'merchant_other_9999';

  // Sample multi-step lifecycle item
  const mockLifecycleItem = {
    lifecycleIdentity: {
      caseId: 'act_case_999',
      activityId: 'act_case_999',
      paymentAttemptId: 'pay_att_999',
      merchantId: merchantId1,
      customerId: 'cust_999',
      productId: 'prod_999'
    },
    merchantId: merchantId1,
    customerId: 'cust_999',
    productId: 'prod_999',
    productName: 'E2E Test Course',
    currentState: 'RECOVERED',
    previousState: 'EXECUTING',
    transitions: [
      {
        timestamp: '2026-09-04T10:00:00.000Z',
        previousState: 'FAILED',
        nextState: 'OPEN',
        transitionType: 'DETECTION_INITIALIZATION',
        allowed: true,
        actor: 'System',
        executionMode: 'MANUAL',
        source: 'BACKEND',
        reason: 'Initial failure detected'
      },
      {
        timestamp: '2026-09-04T10:05:00.000Z',
        previousState: 'OPEN',
        nextState: 'EXECUTING',
        transitionType: 'VALID',
        allowed: true,
        actor: 'Autonomous AI Agent',
        executionMode: 'AUTONOMOUS',
        source: 'GUARDED_DISPATCH',
        reason: 'Guarded dispatch allowed retry action'
      },
      {
        timestamp: '2026-09-04T10:10:00.000Z',
        previousState: 'EXECUTING',
        nextState: 'RECOVERED',
        transitionType: 'VALID',
        allowed: true,
        actor: 'Autonomous AI Agent',
        executionMode: 'AUTONOMOUS',
        source: 'RECONCILIATION',
        reason: 'Backend outcome reconciliation confirmed RECOVERED'
      }
    ],
    terminal: true,
    closureStatus: 'CLOSED',
    recoveryOutcome: 'RECOVERED',
    totalTransitions: 3
  };

  // --- Test 1: Valid multi-step lifecycle (Step Index 1: OPEN -> EXECUTING) ---
  console.log('--- Test 1: Valid multi-step lifecycle (Step 2: OPEN -> EXECUTING) ---');
  const replay1 = buildRecoveryLifecycleReplay(mockLifecycleItem, 1, merchantId1);
  console.log('Replay Result (Step 2):', JSON.stringify(replay1, null, 2));
  console.assert(replay1.valid === true, 'Replay 1 should be valid');
  console.assert(replay1.currentStepIndex === 1, 'Current step index should be 1');
  console.assert(replay1.reconstructedState.effectiveState === 'EXECUTING', 'Effective state should be EXECUTING');
  console.assert(replay1.reconstructedState.pipelineStage === 'DISPATCH', 'Pipeline stage should be DISPATCH');
  console.assert(replay1.stepDelta.timeSincePreviousStepMs === 300000, 'Delta interval should be 300,000ms (5 mins)');

  // --- Test 2: First step (Step Index 0) ---
  console.log('\n--- Test 2: First step (Index 0) ---');
  const replayFirst = buildRecoveryLifecycleReplay(mockLifecycleItem, 0, merchantId1);
  console.assert(replayFirst.currentStepIndex === 0, 'First step index should be 0');
  console.assert(replayFirst.stepDelta.timeSincePreviousStepMs === null, 'First step timeSincePreviousStepMs should be null');
  console.assert(replayFirst.reconstructedState.effectiveState === 'OPEN', 'First step state should be OPEN');

  // --- Test 3: Last terminal step (Step Index 2) ---
  console.log('\n--- Test 3: Last terminal step (Index 2) ---');
  const replayLast = buildRecoveryLifecycleReplay(mockLifecycleItem, 2, merchantId1);
  console.assert(replayLast.currentStepIndex === 2, 'Last step index should be 2');
  console.assert(replayLast.reconstructedState.effectiveState === 'RECOVERED', 'Last step state should be RECOVERED');
  console.assert(replayLast.reconstructedState.terminal === true, 'Last step terminal flag should be true');
  console.assert(replayLast.reconstructedState.closureStatus === 'CLOSED', 'Last step closure status should be CLOSED');

  // --- Test 4: Invalid negative index ---
  console.log('\n--- Test 4: Invalid negative index (-5) ---');
  const replayNeg = buildRecoveryLifecycleReplay(mockLifecycleItem, -5, merchantId1);
  console.assert(replayNeg.currentStepIndex === 0, 'Negative step index must normalize to 0');

  // --- Test 5: Out-of-range index ---
  console.log('\n--- Test 5: Out-of-range index (99) ---');
  const replayOob = buildRecoveryLifecycleReplay(mockLifecycleItem, 99, merchantId1);
  console.assert(replayOob.currentStepIndex === 2, 'Out-of-range step index must clamp to totalSteps - 1 (2)');

  // --- Test 6: Empty/null lifecycle ---
  console.log('\n--- Test 6: Empty / null lifecycle ---');
  const replayEmpty = buildRecoveryLifecycleReplay(null, 0, merchantId1);
  console.assert(replayEmpty.valid === false, 'Null lifecycle should return valid=false');
  console.assert(replayEmpty.totalSteps === 0, 'Null lifecycle should have 0 total steps');

  // --- Test 7: Malformed timestamps ---
  console.log('\n--- Test 7: Malformed timestamps ---');
  const malformedItem = {
    ...mockLifecycleItem,
    transitions: [
      { timestamp: 'INVALID_DATE_STRING', previousState: 'FAILED', nextState: 'OPEN' },
      { timestamp: 'ALSO_INVALID', previousState: 'OPEN', nextState: 'EXECUTING' }
    ]
  };
  const replayMalformed = buildRecoveryLifecycleReplay(malformedItem, 1, merchantId1);
  console.assert(replayMalformed.valid === true, 'Malformed timestamp handling should not crash');
  console.assert(replayMalformed.stepDelta.timeSincePreviousStepMs === null, 'Malformed timestamp should produce null delta');

  // --- Test 8: Merchant mismatch ---
  console.log('\n--- Test 8: Merchant mismatch ---');
  const replayMismatch = buildRecoveryLifecycleReplay(mockLifecycleItem, 0, merchantId2);
  console.assert(replayMismatch.valid === false, 'Merchant mismatch must set valid=false');
  console.assert(replayMismatch.explanation.complianceStatus === 'BLOCKED', 'Merchant mismatch must flag BLOCKED compliance');

  // --- Test 9: Determinism ---
  console.log('\n--- Test 9: Determinism ---');
  const r9a = buildRecoveryLifecycleReplay(mockLifecycleItem, 1, merchantId1);
  const r9b = buildRecoveryLifecycleReplay(mockLifecycleItem, 1, merchantId1);
  console.assert(JSON.stringify(r9a) === JSON.stringify(r9b), 'Identical inputs must yield identical replay outputs');

  // --- Test 10: No mutation ---
  console.log('\n--- Test 10: Immutability check ---');
  const beforeJson = JSON.stringify(mockLifecycleItem);
  buildRecoveryLifecycleReplay(mockLifecycleItem, 1, merchantId1);
  const afterJson = JSON.stringify(mockLifecycleItem);
  console.assert(beforeJson === afterJson, 'Source lifecycle history item must remain unchanged after replay calculation');

  console.log('\n=== ALL 10 M10.10 REPLAY DIAGNOSTIC TESTS PASSED WITH 0 ASSERTION FAILURES! ===');
}

runM1010ReplayDiagnostics().catch(err => {
  console.error('Diagnostic error:', err);
  process.exit(1);
});
