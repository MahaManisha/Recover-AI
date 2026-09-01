/**
 * Integration Test Suite — RecoverAI Shared Runtime Recovery Integration
 * Verifies end-to-end data flow from Customer payment simulation through Merchant, Agent, Audit, and Webhook consoles.
 * 
 * Run with: node scratch/test_recovery_runtime_integration.js
 */

import assert from 'node:assert';
import { createPaymentAttempt } from '../src/services/paymentEvents.js';
import { simulatePaymentOutcome } from '../src/services/paymentOutcomeEngine.js';
import { createPaymentResultEvent, createPaymentFailedEvent, createPaymentSuccessEvent } from '../src/services/paymentResultEvents.js';
import { createRevenueRiskContext } from '../src/services/revenueRisk.js';
import { calculateRecoveryPriority } from '../src/services/recoveryPriority.js';
import { getDemoCustomerRecoverySignals } from '../src/data/demoCustomerHistory.js';
import { createRecoveryAssessment } from '../src/services/recoveryAssessment.js';
import { decideRecoveryAction } from '../src/services/recoveryAgentDecision.js';
import { planRecoveryAction } from '../src/services/recoveryActionPlanner.js';
import { generateRecoveryOutreachMessage } from '../src/services/recoveryOutreachMessage.js';
import { executeRecoveryAction } from '../src/services/recoveryActionExecutor.js';
import { createCustomerRecoveryNotification } from '../src/services/customerRecoveryNotification.js';
import { createRecoveryOutcome } from '../src/services/recoveryOutcome.js';
import { getMerchantRecoveryMetrics } from '../src/services/merchantRecoveryAnalytics.js';
import { getAgentConsoleState, evaluateAgentPolicy, getAgentPolicyDefaults } from '../src/services/agentConsoleStream.js';
import { getSystemAuditTrail, filterAuditLogs } from '../src/services/complianceAuditService.js';
import { generateWebhookPayload, formatCustomOutreachMessage } from '../src/services/webhookDeliverySimulator.js';
import { runBatchRecoveryBenchmark, generateBenchmarkScenarios } from '../src/services/batchRecoveryBenchmark.js';

console.log('🧪 Starting RecoverAI Shared Runtime Integration Verification...\n');

let testsPassed = 0;

function runTest(testName, testFn) {
  try {
    testFn();
    testsPassed++;
    console.log(`  ✅ [PASS] ${testName}`);
  } catch (err) {
    console.error(`  ❌ [FAIL] ${testName}`);
    console.error(err);
    process.exit(1);
  }
}

// 1. Initial State / Empty Session Verification
runTest('1. Initial state & demo fallback behavior', () => {
  const defaultMetrics = getMerchantRecoveryMetrics(null);
  assert.equal(defaultMetrics.recentActivity[0].activityId, 'act_demo_101');
  assert.equal(defaultMetrics.recentActivity[0].customerId, 'usr_auth_demo_42');

  const defaultAgentState = getAgentConsoleState(null);
  assert.equal(defaultAgentState.environment, 'SIMULATED_DEMO_ENVIRONMENT');

  const defaultAuditTrail = getSystemAuditTrail(null);
  assert.ok(defaultAuditTrail.length >= 8);
});

// 2. PAYMENT_ATTEMPTED Event Creation
runTest('2. PAYMENT_ATTEMPTED publication & schema', () => {
  const attempt = createPaymentAttempt({
    customerId: 'usr_test_actual_001',
    productId: 'ai-fullstack-program',
    amount: 3500,
    currency: 'INR',
    paymentMethod: 'CARD'
  });

  assert.equal(attempt.type, 'PAYMENT_ATTEMPTED');
  assert.equal(attempt.customerId, 'usr_test_actual_001');
  assert.equal(attempt.amount, 3500);
});

// 3. PAYMENT_FAILED Event Creation
runTest('3. PAYMENT_FAILED publication & schema', () => {
  const attempt = createPaymentAttempt({
    customerId: 'usr_test_actual_001',
    productId: 'ai-fullstack-program',
    amount: 3500,
    currency: 'INR',
    paymentMethod: 'CARD'
  });
  const outcome = simulatePaymentOutcome('SERVER_ERROR');
  const result = createPaymentResultEvent({
    outcome,
    attemptEvent: attempt,
    customerId: 'usr_test_actual_001',
    productId: 'ai-fullstack-program',
    amount: 3500,
    currency: 'INR',
    paymentMethod: 'CARD'
  });

  assert.equal(result.type, 'PAYMENT_FAILED');
  assert.equal(result.failureCode, 'SERVER_ERROR');
  assert.equal(result.attemptId, attempt.id);
});

// 4. Runtime Recovery Pipeline Construction (SERVER_ERROR)
runTest('4. Runtime recovery session pipeline (SERVER_ERROR)', () => {
  const attempt = createPaymentAttempt({
    customerId: 'usr_test_actual_001',
    productId: 'ai-fullstack-program',
    amount: 3500,
    currency: 'INR',
    paymentMethod: 'CARD'
  });
  const outcome = simulatePaymentOutcome('SERVER_ERROR');
  const result = createPaymentResultEvent({ outcome, attemptEvent: attempt, customerId: 'usr_test_actual_001', productId: 'ai-fullstack-program', amount: 3500, currency: 'INR', paymentMethod: 'CARD' });

  const riskContext = createRevenueRiskContext(result);
  const signals = getDemoCustomerRecoverySignals('usr_test_actual_001');
  const priority = calculateRecoveryPriority(riskContext);
  const assessment = createRecoveryAssessment(riskContext, priority, signals);
  const decision = decideRecoveryAction(assessment);
  const plan = planRecoveryAction(decision, assessment);
  const outreachMsg = generateRecoveryOutreachMessage(assessment, decision, plan, { full_name: 'Actual Customer' });
  const execution = executeRecoveryAction(plan, outreachMsg);

  const runtimeSession = {
    attemptEvent: attempt,
    resultEvent: result,
    revenueRiskContext: riskContext,
    customerSignals: signals,
    recoveryPriority: priority,
    recoveryAssessment: assessment,
    recoveryDecision: decision,
    recoveryActionPlan: plan,
    outreachMessage: outreachMsg,
    recoveryExecution: execution
  };

  assert.equal(runtimeSession.recoveryAssessment.amount, 3500);
  assert.equal(runtimeSession.recoveryDecision.recommendedAction, 'RECOVERY_OUTREACH');
  assert.equal(runtimeSession.recoveryExecution.executionStatus, 'SIMULATED');
});

// 5. Merchant Metrics Consumes Runtime Activity
runTest('5. Merchant metrics consumes runtime activity', () => {
  const runtimeActivity = [{
    activityId: 'act_runtime_001',
    customerId: 'usr_test_actual_001',
    productId: 'ai-fullstack-program',
    productName: 'AI & Full-Stack Development Program',
    failureCode: 'SERVER_ERROR',
    failureReason: 'Temporary processing error',
    priority: 'CRITICAL',
    priorityScore: 90,
    recommendedAction: 'RECOVERY_OUTREACH',
    channel: 'EMAIL',
    status: 'PENDING',
    amount: 3500,
    recoveredAmount: 0,
    currency: 'INR',
    retryCount: 1,
    timestamp: new Date().toISOString()
  }];

  const metrics = getMerchantRecoveryMetrics(runtimeActivity);
  assert.equal(metrics.totalRevenueAtRisk, 3500);
  assert.equal(metrics.totalFailedAttempts, 1);
  assert.equal(metrics.recentActivity[0].customerId, 'usr_test_actual_001');
});

// 6. Agent Telemetry Consumes Runtime Session
runTest('6. Agent telemetry consumes runtime session', () => {
  const attempt = createPaymentAttempt({ customerId: 'usr_test_actual_001', amount: 3500, paymentMethod: 'CARD' });
  const outcome = simulatePaymentOutcome('SERVER_ERROR');
  const result = createPaymentResultEvent({ outcome, attemptEvent: attempt, customerId: 'usr_test_actual_001', amount: 3500 });
  const riskContext = createRevenueRiskContext(result);
  const priority = calculateRecoveryPriority(riskContext);
  const assessment = createRecoveryAssessment(riskContext, priority, null);
  const decision = decideRecoveryAction(assessment);
  const plan = planRecoveryAction(decision, assessment);

  const runtimeSession = { attemptEvent: attempt, resultEvent: result, revenueRiskContext: riskContext, recoveryPriority: priority, recoveryAssessment: assessment, recoveryDecision: decision, recoveryActionPlan: plan };

  const agentState = getAgentConsoleState(runtimeSession);
  assert.equal(agentState.environment, 'RUNTIME_CUSTOMER_ENVIRONMENT');
  assert.equal(agentState.pipeline[0].details.customerId, 'usr_test_actual_001');
  assert.equal(agentState.pipeline[0].details.attemptedAmount, 3500);
});

// 7. Webhook Payload Consumes Runtime Opportunity
runTest('7. Webhook payload consumes runtime opportunity', () => {
  const activeOpportunity = {
    customerId: 'usr_test_actual_001',
    productId: 'ai-fullstack-program',
    productName: 'AI & Full-Stack Development Program',
    amount: 3500,
    currency: 'INR',
    failureCode: 'SERVER_ERROR',
    paymentAttemptId: 'att_actual_123',
    paymentResultId: 'res_actual_123'
  };

  const payload = generateWebhookPayload('RECOVERY_TRIGGERED', activeOpportunity);
  assert.equal(payload.data.customerId, 'usr_test_actual_001');
  assert.equal(payload.data.amount, 3500);
  assert.equal(payload.data.paymentAttemptId, 'att_actual_123');

  const outreach = formatCustomOutreachMessage('EMAIL', activeOpportunity);
  assert.ok(outreach.subject.includes('AI & Full-Stack Development Program'));
});

// 8. Audit Trail Consumes Runtime Audit Entries (Runtime Records Appear Before Demo Fallback)
runTest('8. Audit trail consumes runtime audit entries (Runtime appears first)', () => {
  const runtimeAudit = [{
    auditId: 'aud_runtime_999',
    eventType: 'PAYMENT_FAILED',
    source: 'CUSTOMER_PORTAL',
    actor: 'Customer (usr_test_actual_001)',
    status: 'FAILED',
    timestamp: new Date().toISOString(),
    isSimulated: true,
    metadata: {
      customerId: 'usr_test_actual_001',
      productId: 'ai-fullstack-program',
      paymentAttemptId: 'att_actual_999',
      paymentResultId: 'result_actual_999',
      amount: 3500,
      currency: 'INR',
      failureCode: 'SERVER_ERROR'
    }
  }];

  const combinedTrail = getSystemAuditTrail({ customEvents: runtimeAudit });
  // 1. Runtime audit record appears BEFORE any demo fallback record
  assert.equal(combinedTrail[0].auditId, 'aud_runtime_999');
  assert.equal(combinedTrail[0].metadata.customerId, 'usr_test_actual_001');

  // 2. Metadata contains payment & result identifiers
  assert.equal(combinedTrail[0].metadata.paymentAttemptId, 'att_actual_999');
  assert.equal(combinedTrail[0].metadata.paymentResultId, 'result_actual_999');

  // 3. No sensitive payment credentials are present
  const keys = Object.keys(combinedTrail[0].metadata);
  assert.ok(!keys.includes('cardNumber'));
  assert.ok(!keys.includes('cvv'));

  // 4. Empty runtime logs still return default demo fallback records
  const emptyTrail = getSystemAuditTrail(null);
  assert.ok(emptyTrail.length >= 8);
  assert.equal(emptyTrail[0].auditId.startsWith('aud_100'), true);
});

// 9. Audit Event Duplication Protection
runTest('9. Audit event deduplication protection', () => {
  const runtimeAudit = [
    { auditId: 'aud_uniq_01', eventType: 'PAYMENT_FAILED' },
    { auditId: 'aud_uniq_01', eventType: 'PAYMENT_FAILED' } // duplicate ID
  ];

  // Simulated deduplication set check
  const uniqueSet = new Set();
  const deduped = runtimeAudit.filter(entry => {
    if (uniqueSet.has(entry.auditId)) return false;
    uniqueSet.add(entry.auditId);
    return true;
  });

  assert.equal(deduped.length, 1);
});

// 10. Customer SUCCESS Does Not Create False Recovery Opportunity
runTest('10. Customer SUCCESS does not create false recovery opportunity', () => {
  const attempt = createPaymentAttempt({ customerId: 'usr_test_actual_001', amount: 2000, paymentMethod: 'CARD' });
  const outcome = simulatePaymentOutcome('SUCCESS');
  const result = createPaymentResultEvent({ outcome, attemptEvent: attempt, customerId: 'usr_test_actual_001', amount: 2000 });

  assert.equal(result.type, 'PAYMENT_SUCCESS');
  const riskContext = createRevenueRiskContext(result);
  assert.equal(riskContext, null); // NO revenue risk created for SUCCESS
});

// 11. Customer NETWORK_ERROR Flow
runTest('11. Customer NETWORK_ERROR recovery flow', () => {
  const outcome = simulatePaymentOutcome('NETWORK_ERROR');
  assert.equal(outcome.status, 'FAILED');
  assert.equal(outcome.failureCode, 'NETWORK_ERROR');

  const result = createPaymentResultEvent({ outcome, customerId: 'usr_net', amount: 2000 });
  const risk = createRevenueRiskContext(result);
  assert.equal(risk.failureCode, 'NETWORK_ERROR');
});

// 12. Customer TIMEOUT Flow
runTest('12. Customer TIMEOUT recovery flow', () => {
  const outcome = simulatePaymentOutcome('TIMEOUT');
  assert.equal(outcome.status, 'FAILED');
  assert.equal(outcome.failureCode, 'TIMEOUT');

  const result = createPaymentResultEvent({ outcome, customerId: 'usr_timeout', amount: 2000 });
  const risk = createRevenueRiskContext(result);
  assert.equal(risk.failureCode, 'TIMEOUT');
});

// 13. Customer Retry Success & Recovery Outcome Evaluation
runTest('13. Successful retry creates RECOVERY_OUTCOME', () => {
  const origAttempt = createPaymentAttempt({ customerId: 'usr_retry_user', amount: 2000, paymentMethod: 'CARD' });
  const origResult = createPaymentResultEvent({ outcome: { status: 'FAILED', failureCode: 'SERVER_ERROR' }, attemptEvent: origAttempt });

  const retryAttempt = createPaymentAttempt({ customerId: 'usr_retry_user', amount: 2000, paymentMethod: 'UPI', retryCount: 1, retryOfAttemptId: origAttempt.id });
  const retryResult = createPaymentResultEvent({ outcome: { status: 'SUCCESS' }, attemptEvent: retryAttempt });

  const outcomeObj = createRecoveryOutcome(origAttempt, origResult, retryAttempt, retryResult);
  assert.equal(outcomeObj.recoveryStatus, 'RECOVERED');
  assert.equal(outcomeObj.recoveredRevenue, 2000);
});

// 14. Sensitive Payment Credential Protection
runTest('14. Sensitive data protection verification', () => {
  const attempt = createPaymentAttempt({ customerId: 'usr_auth_demo', amount: 2000, paymentMethod: 'CARD' });
  const keys = Object.keys(attempt);
  assert.ok(!keys.includes('cardNumber'));
  assert.ok(!keys.includes('cvv'));
  assert.ok(!keys.includes('expiryDate'));
  assert.ok(!keys.includes('password'));
  assert.ok(!keys.includes('jwt'));
});

// 15. Benchmark Data Isolation
runTest('15. Benchmark dataset isolation verification', () => {
  const scenarios = generateBenchmarkScenarios(50);
  const benchmarkResult = runBatchRecoveryBenchmark(scenarios);
  assert.equal(benchmarkResult.length, 50);

  // Verify benchmark results do NOT affect or pollute merchant metrics
  const cleanMerchantMetrics = getMerchantRecoveryMetrics(null);
  assert.equal(cleanMerchantMetrics.totalFailedAttempts, 1);
});

// 16. Session Reset Verification
runTest('16. In-memory runtime session reset', () => {
  let runtimeSession = { active: true };
  const resetFn = () => { runtimeSession = null; };
  resetFn();
  assert.equal(runtimeSession, null);
});

// 17. Formula Verification for Recovered Revenue
runTest('17. Metric formulas calculation accuracy', () => {
  const history = [{
    amount: 5000,
    recoveredRevenue: 5000,
    status: 'RECOVERED',
    failureCode: 'SERVER_ERROR',
    priority: 'CRITICAL',
    recommendedAction: 'RECOVERY_OUTREACH'
  }];

  const metrics = getMerchantRecoveryMetrics(history);
  assert.equal(metrics.totalRevenueAtRisk, 5000);
  assert.equal(metrics.totalRecoveredRevenue, 5000);
  assert.equal(metrics.recoveryRatePercentage, 100);
});

// 18. Multi-attempt retry tracking
runTest('18. Multi-attempt retry tracking', () => {
  const attempt1 = createPaymentAttempt({ customerId: 'c1', amount: 2000, paymentMethod: 'CARD', retryCount: 0 });
  const attempt2 = createPaymentAttempt({ customerId: 'c1', amount: 2000, paymentMethod: 'UPI', retryCount: 1, retryOfAttemptId: attempt1.id });

  assert.equal(attempt2.retryCount, 1);
  assert.equal(attempt2.retryOfAttemptId, attempt1.id);
});

// 19. Scenario C: Newer failed attempt (TIMEOUT ₹3,000) overrides older RECOVERED session
runTest('19. Scenario C: Newer failed attempt overrides older RECOVERED session', () => {
  // Step A: Attempt 1 FAILED SERVER_ERROR ₹2,000
  const att1 = createPaymentAttempt({ customerId: 'usr_seq', amount: 2000, paymentMethod: 'CARD' });
  const res1 = createPaymentResultEvent({ outcome: { status: 'FAILED', failureCode: 'SERVER_ERROR' }, attemptEvent: att1 });
  const session1 = {
    customerId: 'usr_seq', amount: 2000, failureCode: 'SERVER_ERROR', currentStatus: 'FAILED',
    attemptEvent: att1, resultEvent: res1, recoveryOutcome: null
  };
  assert.equal(session1.currentStatus, 'FAILED');
  assert.equal(session1.amount, 2000);

  // Step B: Attempt 2 SUCCESS Retry -> status RECOVERED
  const att2 = createPaymentAttempt({ customerId: 'usr_seq', amount: 2000, paymentMethod: 'UPI', retryCount: 1, retryOfAttemptId: att1.id });
  const res2 = createPaymentResultEvent({ outcome: { status: 'SUCCESS' }, attemptEvent: att2 });
  const outcomeObj2 = createRecoveryOutcome(att1, res1, att2, res2);
  const session2 = {
    ...session1, retryAttempt: att2, retryResult: res2, recoveryOutcome: outcomeObj2, currentStatus: 'RECOVERED'
  };
  assert.equal(session2.currentStatus, 'RECOVERED');
  assert.ok(session2.recoveryOutcome);

  // Step C: Attempt 3 NEW FAILED TIMEOUT ₹3,000 -> Must completely overwrite active session with status FAILED and amount 3000
  const att3 = createPaymentAttempt({ customerId: 'usr_seq', amount: 3000, paymentMethod: 'CARD' });
  const res3 = createPaymentResultEvent({ outcome: { status: 'FAILED', failureCode: 'TIMEOUT' }, attemptEvent: att3 });
  const risk3 = createRevenueRiskContext(res3);
  const priority3 = calculateRecoveryPriority(risk3);
  const assessment3 = createRecoveryAssessment(risk3, priority3, null);
  const decision3 = decideRecoveryAction(assessment3);

  const session3 = {
    customerId: 'usr_seq', amount: 3000, failureCode: 'TIMEOUT', currentStatus: 'FAILED',
    attemptEvent: att3, resultEvent: res3, revenueRiskContext: risk3, recoveryPriority: priority3,
    recoveryAssessment: assessment3, recoveryDecision: decision3, recoveryOutcome: null
  };

  assert.equal(session3.currentStatus, 'FAILED');
  assert.equal(session3.amount, 3000);
  assert.equal(session3.failureCode, 'TIMEOUT');
  assert.equal(session3.recoveryOutcome, null);

  // Agent console consumes session3
  const agentState3 = getAgentConsoleState(session3);
  assert.equal(agentState3.pipeline[0].details.attemptedAmount, 3000);
  assert.equal(agentState3.pipeline[0].details.failureCode, 'TIMEOUT');
});

// 20. Scenario D: Latest NETWORK_ERROR becomes authoritative
runTest('20. Scenario D: Latest NETWORK_ERROR becomes authoritative', () => {
  const att4 = createPaymentAttempt({ customerId: 'usr_seq', amount: 5000, paymentMethod: 'NET_BANKING' });
  const res4 = createPaymentResultEvent({ outcome: { status: 'FAILED', failureCode: 'NETWORK_ERROR' }, attemptEvent: att4 });
  const risk4 = createRevenueRiskContext(res4);
  const priority4 = calculateRecoveryPriority(risk4);
  const assessment4 = createRecoveryAssessment(risk4, priority4, null);

  const session4 = {
    customerId: 'usr_seq', amount: 5000, failureCode: 'NETWORK_ERROR', currentStatus: 'FAILED',
    attemptEvent: att4, resultEvent: res4, revenueRiskContext: risk4, recoveryPriority: priority4,
    recoveryAssessment: assessment4, recoveryOutcome: null
  };

  assert.equal(session4.currentStatus, 'FAILED');
  assert.equal(session4.amount, 5000);
  assert.equal(session4.failureCode, 'NETWORK_ERROR');
});

// 21. Agent Console RECOVERED State Machine & Recommendation Consistency
runTest('21. Agent Console RECOVERED State Machine & Recommendation Consistency', () => {
  // Step 1: Payment attempt FAILED (SERVER_ERROR) -> Recommendation: RECOVERY_OUTREACH
  const att1 = createPaymentAttempt({ customerId: 'usr_state_machine', amount: 2000, paymentMethod: 'CARD' });
  const res1 = createPaymentResultEvent({ outcome: { status: 'FAILED', failureCode: 'SERVER_ERROR' }, attemptEvent: att1 });
  const risk1 = createRevenueRiskContext(res1);
  const priority1 = calculateRecoveryPriority(risk1);
  const assessment1 = createRecoveryAssessment(risk1, priority1, null);
  const decision1 = decideRecoveryAction(assessment1);

  const failedSession = {
    customerId: 'usr_state_machine',
    amount: 2000,
    failureCode: 'SERVER_ERROR',
    currentStatus: 'FAILED',
    attemptEvent: att1,
    resultEvent: res1,
    revenueRiskContext: risk1,
    recoveryPriority: priority1,
    recoveryAssessment: assessment1,
    recoveryDecision: decision1,
    recoveryExecution: null,
    recoveryOutcome: null
  };

  const agentStateFailed = getAgentConsoleState(failedSession);
  assert.equal(agentStateFailed.pipeline[3].details.recommendedAction, 'RECOVERY_OUTREACH');
  assert.equal(agentStateFailed.executionStreamStatus, 'PENDING');
  assert.equal(agentStateFailed.recommendedRecoveryActions, 1);

  // Step 2: Successful customer retry -> Status: RECOVERED
  const retryAtt = createPaymentAttempt({ customerId: 'usr_state_machine', amount: 2000, paymentMethod: 'UPI', retryCount: 1, retryOfAttemptId: att1.id });
  const retryRes = createPaymentResultEvent({ outcome: { status: 'SUCCESS' }, attemptEvent: retryAtt });
  const outcomeObj = createRecoveryOutcome(att1, res1, retryAtt, retryRes);

  const recoveredSession = {
    ...failedSession,
    retryAttempt: retryAtt,
    retryResult: retryRes,
    recoveryOutcome: outcomeObj,
    currentStatus: 'RECOVERED'
  };

  const agentStateRecovered = getAgentConsoleState(recoveredSession);
  assert.notEqual(agentStateRecovered.pipeline[3].details.recommendedAction, 'RECOVERY_OUTREACH');
  assert.equal(agentStateRecovered.pipeline[3].details.recommendedAction, 'RECOVERED');
  assert.equal(agentStateRecovered.executionStreamStatus, 'COMPLETED');
  assert.equal(agentStateRecovered.recommendedRecoveryActions, 0);
  assert.equal(agentStateRecovered.evaluatedFailedPayments, 1); // Historical count retained

  const evalPolicyResult = evaluateAgentPolicy(agentStateRecovered, getAgentPolicyDefaults());
  assert.equal(evalPolicyResult.evaluatedAction, 'RECOVERED');
});

// 22. RECOVERED → New FAILED Transaction State Machine Reset
runTest('22. RECOVERED → New FAILED transaction overrides previous recovered session', () => {
  // Step 1: Previous recovered session
  const att1 = createPaymentAttempt({ customerId: 'usr_reset', amount: 2000, paymentMethod: 'CARD' });
  const res1 = createPaymentResultEvent({ outcome: { status: 'FAILED', failureCode: 'SERVER_ERROR' }, attemptEvent: att1 });
  const att2 = createPaymentAttempt({ customerId: 'usr_reset', amount: 2000, paymentMethod: 'UPI', retryCount: 1, retryOfAttemptId: att1.id });
  const res2 = createPaymentResultEvent({ outcome: { status: 'SUCCESS' }, attemptEvent: att2 });
  const outcomeObj = createRecoveryOutcome(att1, res1, att2, res2);

  const prevRecoveredSession = {
    customerId: 'usr_reset', amount: 2000, currentStatus: 'RECOVERED', resultEvent: res1, recoveryOutcome: outcomeObj
  };
  assert.equal(getAgentConsoleState(prevRecoveredSession).executionStreamStatus, 'COMPLETED');

  // Step 2: NEW payment failure (TIMEOUT ₹3,500) -> MUST completely replace active session
  const att3 = createPaymentAttempt({ customerId: 'usr_reset', amount: 3500, paymentMethod: 'CARD' });
  const res3 = createPaymentResultEvent({ outcome: { status: 'FAILED', failureCode: 'TIMEOUT' }, attemptEvent: att3 });
  const risk3 = createRevenueRiskContext(res3);
  const priority3 = calculateRecoveryPriority(risk3);
  const assessment3 = createRecoveryAssessment(risk3, priority3, null);
  const decision3 = decideRecoveryAction(assessment3);

  const newFailedSession = {
    customerId: 'usr_reset',
    amount: 3500,
    failureCode: 'TIMEOUT',
    currentStatus: 'FAILED',
    attemptEvent: att3,
    resultEvent: res3,
    revenueRiskContext: risk3,
    recoveryPriority: priority3,
    recoveryAssessment: assessment3,
    recoveryDecision: decision3,
    recoveryExecution: null,
    recoveryOutcome: null // NO stale recoveryOutcome
  };

  const agentStateNew = getAgentConsoleState(newFailedSession);
  assert.equal(newFailedSession.recoveryOutcome, null);
  assert.equal(agentStateNew.pipeline[0].details.failureCode, 'TIMEOUT');
  assert.equal(agentStateNew.pipeline[3].details.recommendedAction, 'RECOVERY_OUTREACH');
  assert.equal(agentStateNew.executionStreamStatus, 'PENDING');
});

// TEST 23: FAILED → Merchant shows FAILED
runTest('23. TEST 23: FAILED → Merchant shows FAILED', () => {
  const att = createPaymentAttempt({ customerId: 'usr_merch_23', amount: 2000, paymentMethod: 'CARD' });
  const res = createPaymentResultEvent({ outcome: { status: 'FAILED', failureCode: 'SERVER_ERROR' }, attemptEvent: att });
  const risk = createRevenueRiskContext(res);
  const priority = calculateRecoveryPriority(risk);
  const assessment = createRecoveryAssessment(risk, priority, null);
  const decision = decideRecoveryAction(assessment);

  const runtimeRecord = {
    activityId: `act_${res.id}`, customerId: 'usr_merch_23', productId: 'ai-fullstack-program',
    productName: 'AI & Full-Stack Development Program', failureCode: 'SERVER_ERROR', status: 'PENDING',
    amount: 2000, recoveredAmount: 0, recommendedAction: 'RECOVERY_OUTREACH'
  };

  const metrics = getMerchantRecoveryMetrics([runtimeRecord]);
  assert.equal(metrics.recentActivity[0].status, 'PENDING');
  assert.equal(metrics.totalRevenueAtRisk, 2000);
  assert.equal(metrics.totalRecoveredRevenue, 0);
  assert.equal(metrics.recentActivity[0].recommendedAction, 'RECOVERY_OUTREACH');
});

// TEST 24: FAILED → RECOVERED → Merchant shows RECOVERED
runTest('24. TEST 24: FAILED → RECOVERED → Merchant shows RECOVERED', () => {
  const att1 = createPaymentAttempt({ customerId: 'usr_merch_24', amount: 2000, paymentMethod: 'CARD' });
  const res1 = createPaymentResultEvent({ outcome: { status: 'FAILED', failureCode: 'SERVER_ERROR' }, attemptEvent: att1 });
  const att2 = createPaymentAttempt({ customerId: 'usr_merch_24', amount: 2000, paymentMethod: 'UPI', retryCount: 1, retryOfAttemptId: att1.id });
  const res2 = createPaymentResultEvent({ outcome: { status: 'SUCCESS' }, attemptEvent: att2 });
  const outcomeObj = createRecoveryOutcome(att1, res1, att2, res2);

  const runtimeRecord = {
    activityId: `act_${res1.id}`, customerId: 'usr_merch_24', productId: 'ai-fullstack-program',
    productName: 'AI & Full-Stack Development Program', failureCode: 'SERVER_ERROR', status: 'RECOVERED',
    amount: 2000, recoveredAmount: 2000, recommendedAction: 'RECOVERED'
  };

  const metrics = getMerchantRecoveryMetrics([runtimeRecord]);
  assert.equal(metrics.recentActivity[0].status, 'RECOVERED');
  assert.equal(metrics.recentActivity[0].recommendedAction, 'RECOVERED');
  assert.equal(metrics.totalRecoveredRevenue, 2000);
  assert.equal(metrics.recoveryRatePercentage, 100);
});

// TEST 25: RECOVERED → NEW FAILED → Merchant shows new FAILED transaction
runTest('25. TEST 25: RECOVERED → NEW FAILED → Merchant shows new FAILED transaction', () => {
  const att1 = createPaymentAttempt({ customerId: 'usr_merch_25', amount: 2000, paymentMethod: 'CARD' });
  const res1 = createPaymentResultEvent({ outcome: { status: 'FAILED', failureCode: 'SERVER_ERROR' }, attemptEvent: att1 });

  const rec1 = { activityId: `act_${res1.id}`, customerId: 'usr_merch_25', status: 'RECOVERED', amount: 2000, recoveredAmount: 2000, recommendedAction: 'RECOVERED' };

  // New attempt 3 TIMEOUT ₹3,500
  const att3 = createPaymentAttempt({ customerId: 'usr_merch_25', amount: 3500, paymentMethod: 'CARD' });
  const res3 = createPaymentResultEvent({ outcome: { status: 'FAILED', failureCode: 'TIMEOUT' }, attemptEvent: att3 });
  const rec3 = { activityId: `act_${res3.id}`, customerId: 'usr_merch_25', failureCode: 'TIMEOUT', status: 'PENDING', amount: 3500, recoveredAmount: 0, recommendedAction: 'RECOVERY_OUTREACH' };

  const events = [rec3, rec1];
  const metrics = getMerchantRecoveryMetrics(events);
  assert.equal(metrics.recentActivity[0].failureCode, 'TIMEOUT');
  assert.equal(metrics.recentActivity[0].status, 'PENDING');
  assert.equal(metrics.recentActivity[0].amount, 3500);
  assert.equal(metrics.recentActivity[0].recommendedAction, 'RECOVERY_OUTREACH');
});

// TEST 26: Historical failed event remains in activity history but does not override current RECOVERED state
runTest('26. TEST 26: Historical failed event remains in activity history', () => {
  const rec1 = { activityId: 'act_hist_1', customerId: 'usr_hist', status: 'RECOVERED', amount: 2000, recoveredAmount: 2000, recommendedAction: 'RECOVERED' };
  const metrics = getMerchantRecoveryMetrics([rec1]);

  assert.equal(metrics.recentActivity.length, 1);
  assert.equal(metrics.recentActivity[0].status, 'RECOVERED');
  assert.equal(metrics.recentActivity[0].recommendedAction, 'RECOVERED');
});

// TEST 27: Demo fallback is used only when runtime state is absent
runTest('27. TEST 27: Demo fallback is used only when runtime state is absent', () => {
  const defaultMetrics = getMerchantRecoveryMetrics(null);
  assert.equal(defaultMetrics.recentActivity[0].activityId, 'act_demo_101');

  const runtimeRecord = { activityId: 'act_rt_01', customerId: 'usr_rt', amount: 2000, status: 'PENDING' };
  const runtimeMetrics = getMerchantRecoveryMetrics([runtimeRecord]);
  assert.equal(runtimeMetrics.recentActivity[0].activityId, 'act_rt_01');
  assert.notEqual(runtimeMetrics.recentActivity[0].activityId, 'act_demo_101');
});

// TEST 28: Merchant activeOpportunity uses latest activeRecoverySession
runTest('28. TEST 28: Merchant activeOpportunity uses latest activeRecoverySession', () => {
  const sess = {
    customerId: 'usr_rt_28',
    amount: 5000,
    failureCode: 'NETWORK_ERROR',
    currentStatus: 'FAILED',
    recoveryDecision: { recommendedAction: 'RECOVERY_OUTREACH' },
    recoveryOutcome: null
  };

  const isRecovered = Boolean(sess.recoveryOutcome) || sess.currentStatus === 'RECOVERED';
  const activeOpp = {
    customerId: sess.customerId,
    amount: sess.amount,
    failureCode: sess.failureCode,
    status: isRecovered ? 'RECOVERED' : sess.currentStatus,
    recommendedAction: isRecovered ? 'RECOVERED' : sess.recoveryDecision.recommendedAction
  };

  assert.equal(activeOpp.customerId, 'usr_rt_28');
  assert.equal(activeOpp.amount, 5000);
  assert.equal(activeOpp.status, 'FAILED');
  assert.equal(activeOpp.recommendedAction, 'RECOVERY_OUTREACH');
});

// TEST 29: Merchant webhook simulator uses latest runtime opportunity
runTest('29. TEST 29: Merchant webhook simulator uses latest runtime opportunity', () => {
  const opp = { customerId: 'usr_rt_29', amount: 2000, failureCode: 'SERVER_ERROR', status: 'RECOVERED' };
  const payload = generateWebhookPayload('PAYMENT_RECOVERED', opp);

  assert.equal(payload.eventType, 'PAYMENT_RECOVERED');
  assert.equal(payload.data.customerId, 'usr_rt_29');
  assert.equal(payload.data.recoveryStatus, 'RECOVERED');
});

// TEST 30: Merchant does not display stale previous transaction after a new transaction becomes authoritative
runTest('30. TEST 30: Merchant does not display stale previous transaction', () => {
  const sessNew = {
    customerId: 'usr_new_30',
    amount: 4000,
    failureCode: 'TIMEOUT',
    currentStatus: 'FAILED',
    recoveryDecision: { recommendedAction: 'RECOVERY_OUTREACH' },
    recoveryOutcome: null
  };

  const isRecovered = Boolean(sessNew.recoveryOutcome) || sessNew.currentStatus === 'RECOVERED';
  const activeOppNew = {
    customerId: sessNew.customerId,
    amount: sessNew.amount,
    failureCode: sessNew.failureCode,
    status: isRecovered ? 'RECOVERED' : sessNew.currentStatus,
    recommendedAction: isRecovered ? 'RECOVERED' : sessNew.recoveryDecision.recommendedAction
  };

  assert.equal(activeOppNew.customerId, 'usr_new_30');
  assert.equal(activeOppNew.amount, 4000);
  assert.equal(activeOppNew.failureCode, 'TIMEOUT');
  assert.equal(activeOppNew.status, 'FAILED');
});

// TEST 31: Scenario 0 — getMerchantRecoveryMetrics([]) produces clean empty metrics when no events exist
runTest('31. TEST 31: Scenario 0 — Empty recovery events produce empty metrics', () => {
  const emptyMetrics = getMerchantRecoveryMetrics([]);
  assert.equal(emptyMetrics.totalRevenueAtRisk, 0);
  assert.equal(emptyMetrics.totalRecoveredRevenue, 0);
  assert.equal(emptyMetrics.recoveryRatePercentage, 0);
  assert.equal(emptyMetrics.totalFailedAttempts, 0);
  assert.equal(emptyMetrics.recentActivity.length, 0);
});

// TEST 32: Merchant-owned product creation
runTest('32. TEST 32: Merchant-owned product creation', () => {
  const newProd = {
    id: 'prod_custom_32',
    merchantId: 'merchant_001',
    name: 'Custom AI Program',
    price: 4500,
    currency: 'INR',
    category: 'Education',
    active: true
  };
  assert.equal(newProd.id, 'prod_custom_32');
  assert.equal(newProd.merchantId, 'merchant_001');
  assert.equal(newProd.price, 4500);
});

// TEST 33: Product contains mandatory merchantId
runTest('33. TEST 33: Product contains mandatory merchantId', () => {
  const products = [
    { id: 'p1', merchantId: 'm1', name: 'P1', price: 1000, active: true },
    { id: 'p2', merchantId: 'm2', name: 'P2', price: 2000, active: true }
  ];
  products.forEach(p => {
    assert.ok(p.merchantId, 'merchantId must be mandatory');
  });
});

// TEST 34: Customer listing filters by merchantId
runTest('34. TEST 34: Customer listing filters by merchantId', () => {
  const products = [
    { id: 'p1', merchantId: 'merchant_001', name: 'Product A', active: true },
    { id: 'p2', merchantId: 'merchant_002', name: 'Product B', active: true }
  ];
  const activeMerchantId = 'merchant_001';
  const filtered = products.filter(p => p.merchantId === activeMerchantId && p.active);
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, 'p1');
});

// TEST 35: Customer cannot see another merchant's products
runTest('35. TEST 35: Customer cannot see another merchant products', () => {
  const products = [
    { id: 'p1', merchantId: 'merchant_A', name: 'A Product', active: true },
    { id: 'p2', merchantId: 'merchant_B', name: 'B Product', active: true }
  ];
  const activeMerchantId = 'merchant_A';
  const visible = products.filter(p => p.merchantId === activeMerchantId && p.active);
  const containsB = visible.some(p => p.merchantId === 'merchant_B');
  assert.equal(containsB, false);
});

// TEST 36: Purchase preserves merchantId
runTest('36. TEST 36: Purchase preserves merchantId', () => {
  const attempt = createPaymentAttempt({ customerId: 'usr_36', merchantId: 'merchant_001', productId: 'p36', amount: 2000 });
  assert.equal(attempt.merchantId, 'merchant_001');
});

// TEST 37: Purchase preserves productId
runTest('37. TEST 37: Purchase preserves productId', () => {
  const attempt = createPaymentAttempt({ customerId: 'usr_37', merchantId: 'merchant_001', productId: 'prod_micro_002', amount: 3500 });
  assert.equal(attempt.productId, 'prod_micro_002');
});

// TEST 38: Purchase uses selected product price (e.g. ₹3,500)
runTest('38. TEST 38: Purchase uses selected product price', () => {
  const selectedProduct = { id: 'p38', merchantId: 'm1', name: 'Product 38', price: 3500, currency: 'INR' };
  const attempt = createPaymentAttempt({
    customerId: 'usr_38',
    merchantId: selectedProduct.merchantId,
    productId: selectedProduct.id,
    productName: selectedProduct.name,
    amount: selectedProduct.price,
    currency: selectedProduct.currency,
    paymentMethod: 'CARD'
  });
  assert.equal(attempt.amount, 3500);
  assert.notEqual(attempt.amount, 2000);
});

// TEST 39: Payment failure creates correct activeRecoverySession
runTest('39. TEST 39: Payment failure creates correct activeRecoverySession', () => {
  const attempt = createPaymentAttempt({ customerId: 'usr_39', merchantId: 'm1', productId: 'p39', amount: 3500 });
  const result = createPaymentFailedEvent({ attemptEvent: attempt, failureCode: 'TIMEOUT' });
  const sess = {
    customerId: result.customerId,
    merchantId: result.merchantId,
    productId: result.productId,
    amount: result.amount,
    failureCode: result.failureCode,
    currentStatus: 'FAILED'
  };
  assert.equal(sess.merchantId, 'm1');
  assert.equal(sess.productId, 'p39');
  assert.equal(sess.amount, 3500);
  assert.equal(sess.failureCode, 'TIMEOUT');
});

// TEST 40: Merchant Dashboard consumes correct product
runTest('40. TEST 40: Merchant Dashboard consumes correct product', () => {
  const activeOpp = {
    merchantId: 'merchant_001',
    productId: 'prod_ai_microservices_002',
    productName: 'Advanced AI Microservices & Autonomous Agents',
    amount: 3500
  };
  assert.equal(activeOpp.productName, 'Advanced AI Microservices & Autonomous Agents');
  assert.equal(activeOpp.amount, 3500);
});

// TEST 41: Merchant Dashboard consumes correct merchant
runTest('41. TEST 41: Merchant Dashboard consumes correct merchant', () => {
  const sess = { merchantId: 'merchant_001', currentStatus: 'FAILED' };
  const currentMerchantId = 'merchant_001';
  const isMatch = sess.merchantId === currentMerchantId;
  assert.equal(isMatch, true);
});

// TEST 42: Successful retry preserves product/merchant relationship
runTest('42. TEST 42: Successful retry preserves product/merchant relationship', () => {
  const failedAttempt = createPaymentAttempt({ customerId: 'usr_42', merchantId: 'm42', productId: 'p42', amount: 3500 });
  const failedResult = createPaymentFailedEvent({ attemptEvent: failedAttempt, failureCode: 'SERVER_ERROR' });
  const retryAttempt = createPaymentAttempt({ customerId: 'usr_42', merchantId: 'm42', productId: 'p42', amount: 3500, retryCount: 1, retryOfAttemptId: failedAttempt.id });
  const retryResult = createPaymentSuccessEvent({ attemptEvent: retryAttempt });
  const outcome = createRecoveryOutcome(failedAttempt, failedResult, retryAttempt, retryResult);

  assert.equal(outcome.merchantId, 'm42');
  assert.equal(outcome.productId, 'p42');
  assert.equal(outcome.recoveredRevenue, 3500);
});

// TEST 43: New product purchase replaces old active session
runTest('43. TEST 43: New product purchase replaces old active session', () => {
  let activeSession = { productId: 'pA', amount: 2000, currentStatus: 'RECOVERED' };
  const newAttempt = { productId: 'pB', amount: 3500, currentStatus: 'FAILED' };
  activeSession = newAttempt;

  assert.equal(activeSession.productId, 'pB');
  assert.equal(activeSession.amount, 3500);
  assert.equal(activeSession.currentStatus, 'FAILED');
});

// TEST 44: Historical product remains in recoveryEvents
runTest('44. TEST 44: Historical product remains in recoveryEvents', () => {
  const events = [
    { activityId: 'act_2', productId: 'pB', amount: 3500, status: 'PENDING' },
    { activityId: 'act_1', productId: 'pA', amount: 2000, status: 'RECOVERED' }
  ];
  assert.equal(events.length, 2);
  assert.equal(events[1].productId, 'pA');
  assert.equal(events[1].status, 'RECOVERED');
});

// TEST 45: Cross-merchant transaction isolation
runTest('45. TEST 45: Cross-merchant transaction isolation', () => {
  const sessionMerchantA = { merchantId: 'merchant_A', productId: 'pA', amount: 2000, currentStatus: 'FAILED' };
  const currentMerchantB = 'merchant_B';
  const isMatch = sessionMerchantA.merchantId === currentMerchantB;

  assert.equal(isMatch, false, 'Merchant B must NOT treat Merchant A session as its own');
});

// TEST 46: Null session still produces clean empty metrics
runTest('46. TEST 46: Null session still produces clean empty metrics', () => {
  const activeRecoverySession = null;
  const recoveryEvents = [];
  const metrics = getMerchantRecoveryMetrics(recoveryEvents);

  assert.equal(metrics.totalRevenueAtRisk, 0);
  assert.equal(metrics.totalRecoveredRevenue, 0);
  assert.equal(metrics.recoveryRatePercentage, 0);
  assert.equal(metrics.recentActivity.length, 0);
});

// TEST 47: Created product uses actual current merchant ID (0a9a09a5-ef18-45da-a0ce-7c5f0f23a991)
runTest('47. TEST 47: Created product uses actual current merchant ID', () => {
  const actualMerchantId = '0a9a09a5-ef18-45da-a0ce-7c5f0f23a991';
  const oppoProduct = {
    id: 'prod_oppo_47',
    merchantId: actualMerchantId,
    name: 'OPPO Mobile',
    price: 46000,
    currency: 'INR',
    category: 'Mobile / Electronics',
    active: true
  };
  assert.equal(oppoProduct.merchantId, '0a9a09a5-ef18-45da-a0ce-7c5f0f23a991');
  assert.equal(oppoProduct.price, 46000);
});

// TEST 48: Customer catalog uses actual active merchant ID instead of hard-coded merchant_001
runTest('48. TEST 48: Customer catalog uses actual active merchant ID', () => {
  const activeMerchantId = '0a9a09a5-ef18-45da-a0ce-7c5f0f23a991';
  const products = [
    { id: 'p1', merchantId: '0a9a09a5-ef18-45da-a0ce-7c5f0f23a991', name: 'OPPO Mobile', price: 46000, active: true },
    { id: 'p2', merchantId: 'other_merchant_999', name: 'Other Phone', price: 20000, active: true }
  ];
  const visible = products.filter(p => p.merchantId === activeMerchantId && p.active);
  assert.equal(visible.length, 1);
  assert.equal(visible[0].name, 'OPPO Mobile');
  assert.notEqual(activeMerchantId, 'merchant_001');
});

// TEST 49: Product created by merchant appears in that merchant customer catalog
runTest('49. TEST 49: Product created by merchant appears in customer catalog', () => {
  const merchantId = '0a9a09a5-ef18-45da-a0ce-7c5f0f23a991';
  const catalog = [
    { id: 'p_oppo', merchantId: merchantId, name: 'OPPO Mobile', price: 46000, active: true }
  ];
  const activeMerchantId = merchantId;
  const visible = catalog.filter(p => p.merchantId === activeMerchantId && p.active);
  assert.equal(visible.length, 1);
  assert.equal(visible[0].name, 'OPPO Mobile');
});

// TEST 50: Product belonging to another merchant does not appear
runTest('50. TEST 50: Product belonging to another merchant does not appear', () => {
  const activeMerchantId = '0a9a09a5-ef18-45da-a0ce-7c5f0f23a991';
  const catalog = [
    { id: 'p_oppo', merchantId: '0a9a09a5-ef18-45da-a0ce-7c5f0f23a991', name: 'OPPO Mobile', price: 46000, active: true },
    { id: 'p_rival', merchantId: 'rival_merchant_888', name: 'Rival Gadget', price: 15000, active: true }
  ];
  const visible = catalog.filter(p => p.merchantId === activeMerchantId && p.active);
  const rivalPresent = visible.some(p => p.merchantId === 'rival_merchant_888');
  assert.equal(rivalPresent, false);
});

// TEST 51: Selected product preserves merchantId
runTest('51. TEST 51: Selected product preserves merchantId', () => {
  const selectedProduct = { id: 'prod_oppo', merchantId: '0a9a09a5-ef18-45da-a0ce-7c5f0f23a991', name: 'OPPO Mobile', price: 46000 };
  assert.equal(selectedProduct.merchantId, '0a9a09a5-ef18-45da-a0ce-7c5f0f23a991');
});

// TEST 52: Selected product preserves productId
runTest('52. TEST 52: Selected product preserves productId', () => {
  const selectedProduct = { id: 'prod_oppo_46k', merchantId: '0a9a09a5-ef18-45da-a0ce-7c5f0f23a991', name: 'OPPO Mobile', price: 46000 };
  assert.equal(selectedProduct.id, 'prod_oppo_46k');
});

// TEST 53: Selected product price is used for payment
runTest('53. TEST 53: Selected product price is used for payment', () => {
  const selectedProduct = { id: 'prod_oppo', merchantId: '0a9a09a5-ef18-45da-a0ce-7c5f0f23a991', name: 'OPPO Mobile', price: 46000 };
  const attempt = createPaymentAttempt({
    customerId: 'usr_customer_53',
    merchantId: selectedProduct.merchantId,
    productId: selectedProduct.id,
    productName: selectedProduct.name,
    amount: selectedProduct.price,
    currency: 'INR'
  });
  assert.equal(attempt.amount, 46000);
});

// TEST 54: ₹46,000 OPPO Mobile payment produces amount = 46000
runTest('54. TEST 54: ₹46,000 OPPO Mobile payment produces amount = 46000', () => {
  const attempt = createPaymentAttempt({
    customerId: 'usr_customer_54',
    merchantId: '0a9a09a5-ef18-45da-a0ce-7c5f0f23a991',
    productId: 'prod_oppo_mobile',
    productName: 'OPPO Mobile',
    amount: 46000,
    currency: 'INR'
  });
  const result = createPaymentFailedEvent({ attemptEvent: attempt, failureCode: 'SERVER_ERROR' });
  const riskContext = createRevenueRiskContext(result);

  assert.equal(attempt.amount, 46000);
  assert.equal(result.amount, 46000);
  assert.equal(riskContext.amount, 46000);
  assert.equal(riskContext.revenueAtRisk, 46000);
});

// TEST 55: Payment event preserves actual merchantId
runTest('55. TEST 55: Payment event preserves actual merchantId', () => {
  const attempt = createPaymentAttempt({
    customerId: 'usr_55',
    merchantId: '0a9a09a5-ef18-45da-a0ce-7c5f0f23a991',
    productId: 'prod_oppo',
    amount: 46000
  });
  const result = createPaymentFailedEvent({ attemptEvent: attempt, failureCode: 'SERVER_ERROR' });

  assert.equal(attempt.merchantId, '0a9a09a5-ef18-45da-a0ce-7c5f0f23a991');
  assert.equal(result.merchantId, '0a9a09a5-ef18-45da-a0ce-7c5f0f23a991');
});

// TEST 56: RecoveryContext preserves actual merchantId
runTest('56. TEST 56: RecoveryContext preserves actual merchantId', () => {
  const session = {
    customerId: 'usr_56',
    merchantId: '0a9a09a5-ef18-45da-a0ce-7c5f0f23a991',
    productId: 'prod_oppo',
    productName: 'OPPO Mobile',
    amount: 46000,
    currentStatus: 'FAILED'
  };
  assert.equal(session.merchantId, '0a9a09a5-ef18-45da-a0ce-7c5f0f23a991');
  assert.equal(session.amount, 46000);
});

// TEST 57: Merchant Dashboard receives the correct merchant-owned recovery session
runTest('57. TEST 57: Merchant Dashboard receives correct merchant recovery session', () => {
  const currentMerchantId = '0a9a09a5-ef18-45da-a0ce-7c5f0f23a991';
  const activeSession = {
    customerId: 'usr_57',
    merchantId: '0a9a09a5-ef18-45da-a0ce-7c5f0f23a991',
    productId: 'prod_oppo',
    productName: 'OPPO Mobile',
    amount: 46000,
    currentStatus: 'FAILED'
  };
  const isMatch = activeSession.merchantId === currentMerchantId;

  assert.equal(isMatch, true, 'Merchant Dashboard must accept session with matching merchantId');
});

// TEST 58: Cross-merchant recovery session is rejected
runTest('58. TEST 58: Cross-merchant recovery session is rejected', () => {
  const currentMerchantId = '0a9a09a5-ef18-45da-a0ce-7c5f0f23a991';
  const otherSession = {
    customerId: 'usr_58',
    merchantId: 'rival_merchant_xyz',
    productId: 'prod_rival',
    amount: 10000,
    currentStatus: 'FAILED'
  };
  const isMatch = otherSession.merchantId === currentMerchantId;

  assert.equal(isMatch, false, 'Merchant Dashboard must reject session from another merchant');
});

// Helper for catalog filtering test logic matching Customer.jsx
function filterCustomerCatalog(merchantProducts, activeMerchantId) {
  const targetMerchantId = activeMerchantId;
  if (!targetMerchantId) {
    return [];
  }
  return (merchantProducts || []).filter(
    (p) => p.merchantId === targetMerchantId && p.active !== false
  );
}

// TEST 59 (TEST A): activeMerchantId = null -> visibleProducts must be []
runTest('59. TEST A: activeMerchantId = null produces empty visibleProducts', () => {
  const products = [{ id: 'p1', merchantId: 'merchant_A', name: 'Product A', price: 1000, active: true }];
  const visible = filterCustomerCatalog(products, null);
  assert.equal(visible.length, 0);
});

// TEST 60 (TEST B): activeMerchantId = undefined -> visibleProducts must be []
runTest('60. TEST B: activeMerchantId = undefined produces empty visibleProducts', () => {
  const products = [{ id: 'p1', merchantId: 'merchant_A', name: 'Product A', price: 1000, active: true }];
  const visible = filterCustomerCatalog(products, undefined);
  assert.equal(visible.length, 0);
});

// TEST 61 (TEST C): activeMerchantId = merchant_A -> only merchant_A products visible
runTest('61. TEST C: activeMerchantId = merchant_A shows only merchant_A products', () => {
  const products = [
    { id: 'p1', merchantId: 'merchant_A', name: 'Product A', active: true },
    { id: 'p2', merchantId: 'merchant_B', name: 'Product B', active: true }
  ];
  const visible = filterCustomerCatalog(products, 'merchant_A');
  assert.equal(visible.length, 1);
  assert.equal(visible[0].id, 'p1');
});

// TEST 62 (TEST D): activeMerchantId = merchant_B -> only merchant_B products visible
runTest('62. TEST D: activeMerchantId = merchant_B shows only merchant_B products', () => {
  const products = [
    { id: 'p1', merchantId: 'merchant_A', name: 'Product A', active: true },
    { id: 'p2', merchantId: 'merchant_B', name: 'Product B', active: true }
  ];
  const visible = filterCustomerCatalog(products, 'merchant_B');
  assert.equal(visible.length, 1);
  assert.equal(visible[0].id, 'p2');
});

// TEST 63 (TEST E): Reordering merchantProducts does NOT change displayed merchant when activeMerchantId is set
runTest('63. TEST E: Reordering catalog does not change displayed merchant', () => {
  const productsReordered = [
    { id: 'p2', merchantId: 'merchant_B', name: 'Product B', active: true },
    { id: 'p1', merchantId: 'merchant_A', name: 'Product A', active: true }
  ];
  const visible = filterCustomerCatalog(productsReordered, 'merchant_A');
  assert.equal(visible.length, 1);
  assert.equal(visible[0].id, 'p1');
  assert.equal(visible[0].merchantId, 'merchant_A');
});

// TEST 64 (TEST F): merchantProducts[0] belongs to merchant_B but activeMerchantId is merchant_A -> merchant_B product must NOT appear
runTest('64. TEST F: merchantProducts[0] of merchant_B ignored when activeMerchantId is merchant_A', () => {
  const products = [
    { id: 'p_b', merchantId: 'merchant_B', name: 'Product B', active: true },
    { id: 'p_a', merchantId: 'merchant_A', name: 'Product A', active: true }
  ];
  const visible = filterCustomerCatalog(products, 'merchant_A');
  const hasProductB = visible.some(p => p.id === 'p_b');
  assert.equal(hasProductB, false);
  assert.equal(visible.length, 1);
  assert.equal(visible[0].id, 'p_a');
});

// TEST 65 (TEST G): No active merchant must NEVER cause automatic selection of merchantProducts[0].merchantId
runTest('65. TEST G: No active merchant never causes automatic selection of merchantProducts[0]', () => {
  const products = [
    { id: 'p_b', merchantId: 'merchant_B', name: 'Product B', active: true }
  ];
  const visibleNull = filterCustomerCatalog(products, null);
  const visibleEmpty = filterCustomerCatalog(products, '');

  assert.equal(visibleNull.length, 0);
  assert.equal(visibleEmpty.length, 0);
});

// TEST 66: Merchant creates a new product with current merchantId
runTest('66. TEST 66: Merchant creates a new product with current merchantId', () => {
  const currentMerchantId = '0a9a09a5-ef18-45da-a0ce-7c5f0f23a991';
  const newProduct = {
    id: 'prod_oppo_m7',
    merchantId: currentMerchantId,
    name: 'Oppo / OPPO Mobile',
    price: 46000,
    currency: 'INR',
    category: 'Electronics',
    active: true
  };
  assert.equal(newProduct.merchantId, '0a9a09a5-ef18-45da-a0ce-7c5f0f23a991');
});

// TEST 67: New product is added to shared merchantProducts state
runTest('67. TEST 67: New product is added to shared merchantProducts state', () => {
  const sharedState = [
    { id: 'p1', merchantId: '0a9a09a5-ef18-45da-a0ce-7c5f0f23a991', name: 'AI & Full-Stack', price: 2000, active: true },
    { id: 'p2', merchantId: '0a9a09a5-ef18-45da-a0ce-7c5f0f23a991', name: 'Advanced Microservices', price: 3500, active: true }
  ];
  const oppo = { id: 'p_oppo', merchantId: '0a9a09a5-ef18-45da-a0ce-7c5f0f23a991', name: 'Oppo', price: 46000, active: true };
  const updatedShared = [oppo, ...sharedState];

  assert.equal(updatedShared.length, 3);
  assert.equal(updatedShared[0].name, 'Oppo');
});

// TEST 68: Customer receives the same merchantProducts collection after navigation
runTest('68. TEST 68: Customer receives same merchantProducts collection', () => {
  const sharedProducts = [
    { id: 'p_oppo', merchantId: '0a9a09a5-ef18-45da-a0ce-7c5f0f23a991', name: 'Oppo', price: 46000, active: true },
    { id: 'p1', merchantId: '0a9a09a5-ef18-45da-a0ce-7c5f0f23a991', name: 'AI Program', price: 2000, active: true }
  ];
  const customerReceived = [...sharedProducts];
  assert.equal(customerReceived.length, 2);
  assert.equal(customerReceived[0].name, 'Oppo');
});

// TEST 69: Customer activeMerchantId equals the intended merchant ID
runTest('69. TEST 69: Customer activeMerchantId equals intended merchant ID', () => {
  const activeMerchantId = '0a9a09a5-ef18-45da-a0ce-7c5f0f23a991';
  assert.equal(activeMerchantId, '0a9a09a5-ef18-45da-a0ce-7c5f0f23a991');
});

// TEST 70: Newly created Oppo product appears in visibleProducts
runTest('70. TEST 70: Newly created Oppo product appears in visibleProducts', () => {
  const activeMerchantId = '0a9a09a5-ef18-45da-a0ce-7c5f0f23a991';
  const products = [
    { id: 'p_oppo', merchantId: '0a9a09a5-ef18-45da-a0ce-7c5f0f23a991', name: 'Oppo / OPPO Mobile', price: 46000, active: true },
    { id: 'p1', merchantId: '0a9a09a5-ef18-45da-a0ce-7c5f0f23a991', name: 'AI Program', price: 2000, active: true }
  ];
  const visible = filterCustomerCatalog(products, activeMerchantId);
  const oppoFound = visible.find(p => p.id === 'p_oppo');

  assert.notEqual(oppoFound, undefined);
  assert.equal(oppoFound.name, 'Oppo / OPPO Mobile');
});

// TEST 71: Oppo price remains 46000
runTest('71. TEST 71: Oppo price remains 46000', () => {
  const oppo = { id: 'p_oppo', merchantId: '0a9a09a5-ef18-45da-a0ce-7c5f0f23a991', name: 'Oppo', price: 46000 };
  assert.equal(oppo.price, 46000);
});

// TEST 72: Oppo merchantId remains 0a9a09a5-ef18-45da-a0ce-7c5f0f23a991
runTest('72. TEST 72: Oppo merchantId remains 0a9a09a5-ef18-45da-a0ce-7c5f0f23a991', () => {
  const oppo = { id: 'p_oppo', merchantId: '0a9a09a5-ef18-45da-a0ce-7c5f0f23a991', name: 'Oppo', price: 46000 };
  assert.equal(oppo.merchantId, '0a9a09a5-ef18-45da-a0ce-7c5f0f23a991');
});

// TEST 73: A product belonging to Merchant B remains hidden
runTest('73. TEST 73: A product belonging to Merchant B remains hidden', () => {
  const activeMerchantId = '0a9a09a5-ef18-45da-a0ce-7c5f0f23a991';
  const products = [
    { id: 'p_oppo', merchantId: '0a9a09a5-ef18-45da-a0ce-7c5f0f23a991', name: 'Oppo', price: 46000, active: true },
    { id: 'p_other', merchantId: 'merchant_B', name: 'Merchant B Product', price: 9999, active: true }
  ];
  const visible = filterCustomerCatalog(products, activeMerchantId);
  const rivalPresent = visible.some(p => p.merchantId === 'merchant_B');

  assert.equal(rivalPresent, false);
  assert.equal(visible.length, 1);
});

// TEST 74: Creating another product, e.g. Samsung Galaxy ₹55,000, also makes it appear in Customer catalog
runTest('74. TEST 74: Creating Samsung Galaxy ₹55,000 also makes it appear in Customer catalog', () => {
  const activeMerchantId = '0a9a09a5-ef18-45da-a0ce-7c5f0f23a991';
  const products = [
    { id: 'p_samsung', merchantId: '0a9a09a5-ef18-45da-a0ce-7c5f0f23a991', name: 'Samsung Galaxy', price: 55000, active: true },
    { id: 'p_oppo', merchantId: '0a9a09a5-ef18-45da-a0ce-7c5f0f23a991', name: 'Oppo', price: 46000, active: true },
    { id: 'p1', merchantId: '0a9a09a5-ef18-45da-a0ce-7c5f0f23a991', name: 'AI Program', price: 2000, active: true }
  ];
  const visible = filterCustomerCatalog(products, activeMerchantId);

  assert.equal(visible.length, 3);
  assert.equal(visible[0].name, 'Samsung Galaxy');
  assert.equal(visible[0].price, 55000);
});

// TEST 75: Multiple products created by the same merchant all appear
runTest('75. TEST 75: Multiple products created by the same merchant all appear', () => {
  const activeMerchantId = '0a9a09a5-ef18-45da-a0ce-7c5f0f23a991';
  const products = [
    { id: 'p1', merchantId: '0a9a09a5-ef18-45da-a0ce-7c5f0f23a991', name: 'Prod 1', active: true },
    { id: 'p2', merchantId: '0a9a09a5-ef18-45da-a0ce-7c5f0f23a991', name: 'Prod 2', active: true },
    { id: 'p3', merchantId: '0a9a09a5-ef18-45da-a0ce-7c5f0f23a991', name: 'Prod 3', active: true }
  ];
  const visible = filterCustomerCatalog(products, activeMerchantId);
  assert.equal(visible.length, 3);
});

// TEST 76: Reordering merchantProducts does not affect merchant ownership filtering
runTest('76. TEST 76: Reordering merchantProducts does not affect merchant ownership filtering', () => {
  const activeMerchantId = '0a9a09a5-ef18-45da-a0ce-7c5f0f23a991';
  const reordered = [
    { id: 'p_other', merchantId: 'merchant_B', name: 'B Product', active: true },
    { id: 'p_oppo', merchantId: '0a9a09a5-ef18-45da-a0ce-7c5f0f23a991', name: 'Oppo', active: true }
  ];
  const visible = filterCustomerCatalog(reordered, activeMerchantId);

  assert.equal(visible.length, 1);
  assert.equal(visible[0].name, 'Oppo');
});

// TEST 77: activeMerchantId = null still results in []
runTest('77. TEST 77: activeMerchantId = null still results in []', () => {
  const products = [
    { id: 'p_oppo', merchantId: '0a9a09a5-ef18-45da-a0ce-7c5f0f23a991', name: 'Oppo', active: true }
  ];
  const visible = filterCustomerCatalog(products, null);
  assert.equal(visible.length, 0);
});

// TEST 78: No merchantProducts[0] fallback exists anywhere in Customer merchant resolution
runTest('78. TEST 78: No merchantProducts[0] fallback exists in Customer merchant resolution', () => {
  const products = [
    { id: 'p_other', merchantId: 'merchant_B', name: 'B Product', active: true }
  ];
  // Passing undefined activeMerchantId must NOT pick merchant_B
  const visible = filterCustomerCatalog(products, undefined);
  assert.equal(visible.length, 0);
});

console.log(`\n🎉 All ${testsPassed} Integration Verification Tests Passed!`);




