/**
 * Batch Recovery Benchmark Engine Service — RecoverAI M7 Page 2 Part 2
 * Pure deterministic benchmarking engine running multi-scenario simulated failure & recovery tests.
 * 
 * STRICT BOUNDARY:
 * - 0 Math.random() usage, 0 API calls, 0 network activity, 0 DB writes, 0 storage writes.
 * - Operates strictly in React memory state.
 * - Strictly excludes sensitive payment credentials.
 */

const FAILURE_CODES = ['SERVER_ERROR', 'NETWORK_ERROR', 'TIMEOUT'];
const PAYMENT_METHODS = ['CARD', 'UPI', 'NET_BANKING'];
const DEMO_AMOUNTS = [200, 500, 1000, 2000, 5000];
const PRODUCT_CATALOG = [
  { id: 'ai-fullstack-program', name: 'AI & Full-Stack Development Program' },
  { id: 'python-data-science', name: 'Data Science & Machine Learning Bootcamp' },
  { id: 'cloud-devops-mastery', name: 'Cloud & DevOps Architecture Program' },
  { id: 'cyber-security-pro', name: 'Enterprise Cyber Security Certification' }
];
const CHANNELS = ['EMAIL', 'SMS', 'WHATSAPP'];

/**
 * Generates N deterministic scenarios using modular indexing.
 * @param {number} count - 50 | 100 | 250 (default 50)
 * @returns {Array<Object>} Deterministic scenarios array
 */
export function generateBenchmarkScenarios(count = 50) {
  const safeCount = Math.max(1, Math.min(250, Number(count) || 50));
  const scenarios = [];

  for (let i = 0; i < safeCount; i++) {
    const failureCode = FAILURE_CODES[i % FAILURE_CODES.length];
    const paymentMethod = PAYMENT_METHODS[i % PAYMENT_METHODS.length];
    const amount = DEMO_AMOUNTS[i % DEMO_AMOUNTS.length];
    const product = PRODUCT_CATALOG[i % PRODUCT_CATALOG.length];
    const customerId = `usr_bench_${100 + i}`;

    scenarios.push({
      scenarioId: `scen_${1000 + i}`,
      index: i,
      customerId,
      productId: product.id,
      productName: product.name,
      amount,
      currency: 'INR',
      failureCode,
      paymentMethod,
      retryCount: (i % 3) + 1
    });
  }

  return scenarios;
}

/**
 * Runs a single benchmark scenario deterministically.
 * @param {Object} scenario - Scenario input object
 * @returns {Object} Scenario result object
 */
export function runBenchmarkScenario(scenario) {
  if (!scenario || typeof scenario !== 'object') {
    return {
      scenarioId: 'scen_invalid',
      failureCode: 'UNKNOWN',
      paymentMethod: 'UNKNOWN',
      amount: 0,
      priority: 'LOW',
      priorityScore: 0,
      recommendedAction: 'NO_ACTION',
      channel: 'NONE',
      recoveryStatus: 'UNRECOVERED',
      recoveredAmount: 0,
      durationSeconds: 0,
      formattedDuration: '0m',
      isSimulated: true
    };
  }

  const { scenarioId, index = 0, amount = 0, failureCode = 'SERVER_ERROR', paymentMethod = 'CARD' } = scenario;

  // RecoverAI Priority Scoring
  let revScore = 10;
  if (amount >= 5000) revScore = 40;
  else if (amount >= 2000) revScore = 30;
  else if (amount >= 1000) revScore = 20;

  let failScore = 20;
  if (failureCode === 'SERVER_ERROR') failScore = 40;
  else if (failureCode === 'NETWORK_ERROR') failScore = 30;

  let methodScore = 10;
  if (paymentMethod === 'CARD') methodScore = 20;
  else if (paymentMethod === 'UPI') methodScore = 15;

  const priorityScore = revScore + failScore + methodScore;
  let priority = 'LOW';
  if (priorityScore >= 80) priority = 'CRITICAL';
  else if (priorityScore >= 60) priority = 'HIGH';
  else if (priorityScore >= 40) priority = 'MEDIUM';

  // Recommendation logic
  let recommendedAction = 'NO_ACTION';
  let channel = 'NONE';

  if (amount >= 1000 && (priority === 'CRITICAL' || priority === 'HIGH')) {
    recommendedAction = 'RECOVERY_OUTREACH';
    channel = CHANNELS[index % CHANNELS.length];
  } else if (priority === 'MEDIUM') {
    recommendedAction = 'MONITOR';
    channel = 'NONE';
  }

  // Deterministic outcome calculation (70% success for RECOVERY_OUTREACH)
  let recoveryStatus = 'UNRECOVERED';
  let recoveredAmount = 0;
  let durationSeconds = 0;

  if (recommendedAction === 'RECOVERY_OUTREACH') {
    const isSuccess = ((index * 7 + amount) % 10) < 7;
    if (isSuccess) {
      recoveryStatus = 'RECOVERED';
      recoveredAmount = amount;
      const durationOptions = [900, 2700, 7200];
      durationSeconds = durationOptions[index % durationOptions.length];
    }
  }

  const formattedDuration = durationSeconds > 0 ? `${Math.round(durationSeconds / 60)}m` : 'N/A';

  return {
    ...scenario,
    scenarioId: scenarioId || `scen_${1000 + index}`,
    priority,
    priorityScore,
    recommendedAction,
    channel,
    recoveryStatus,
    recoveredAmount,
    durationSeconds,
    formattedDuration,
    isSimulated: true
  };
}

/**
 * Runs a batch benchmark over an array of scenarios.
 * @param {Array<Object>} scenarios - Array of scenario objects
 * @returns {Array<Object>} Array of scenario result objects
 */
export function runBatchRecoveryBenchmark(scenarios) {
  if (!Array.isArray(scenarios)) return [];
  return scenarios.map(s => runBenchmarkScenario(s));
}

/**
 * Calculates aggregate metrics for benchmark results.
 * Safe against zero division, empty arrays, null inputs.
 * 
 * @param {Array<Object>} results - Array of scenario result objects
 * @returns {Object} Safe aggregate metrics object
 */
export function calculateBenchmarkMetrics(results) {
  const safeResults = Array.isArray(results) ? results : [];
  const totalScenarios = safeResults.length;

  if (totalScenarios === 0) {
    return {
      totalScenarios: 0,
      failedScenarios: 0,
      recoveredScenarios: 0,
      pendingScenarios: 0,
      unrecoveredScenarios: 0,
      totalRevenueAtRisk: 0,
      totalRecoveredRevenue: 0,
      recoveryRatePercentage: 0,
      scenarioConversionPercentage: 0,
      averageRecoveryTime: '0m',
      averageRecoveryTimeMinutes: 0,
      averagePriorityScore: 0,
      totalOutreachRecommendations: 0,
      successfulOutreachCount: 0,
      strategyEfficiency: 0,
      failureDistribution: { SERVER_ERROR: 0, NETWORK_ERROR: 0, TIMEOUT: 0 },
      priorityDistribution: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 },
      actionDistribution: { RECOVERY_OUTREACH: 0, MONITOR: 0, NO_ACTION: 0 },
      channelDistribution: { EMAIL: 0, SMS: 0, WHATSAPP: 0, NONE: 0 }
    };
  }

  let totalRevenueAtRisk = 0;
  let totalRecoveredRevenue = 0;
  let recoveredScenarios = 0;
  let unrecoveredScenarios = 0;
  let totalPriorityScore = 0;
  let totalDurationSeconds = 0;

  let totalOutreachRecommendations = 0;
  let successfulOutreachCount = 0;

  const failureDistribution = { SERVER_ERROR: 0, NETWORK_ERROR: 0, TIMEOUT: 0 };
  const priorityDistribution = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  const actionDistribution = { RECOVERY_OUTREACH: 0, MONITOR: 0, NO_ACTION: 0 };
  const channelDistribution = { EMAIL: 0, SMS: 0, WHATSAPP: 0, NONE: 0 };

  safeResults.forEach(r => {
    const amt = Number(r.amount) || 0;
    const recAmt = Number(r.recoveredAmount) || 0;
    const score = Number(r.priorityScore) || 0;

    totalRevenueAtRisk += amt;
    totalRecoveredRevenue += recAmt;
    totalPriorityScore += score;

    if (r.recoveryStatus === 'RECOVERED') {
      recoveredScenarios++;
      totalDurationSeconds += Number(r.durationSeconds) || 0;
    } else {
      unrecoveredScenarios++;
    }

    if (r.recommendedAction === 'RECOVERY_OUTREACH') {
      totalOutreachRecommendations++;
      if (r.recoveryStatus === 'RECOVERED') {
        successfulOutreachCount++;
      }
    }

    if (failureDistribution.hasOwnProperty(r.failureCode)) {
      failureDistribution[r.failureCode]++;
    }
    if (priorityDistribution.hasOwnProperty(r.priority)) {
      priorityDistribution[r.priority]++;
    }
    if (actionDistribution.hasOwnProperty(r.recommendedAction)) {
      actionDistribution[r.recommendedAction]++;
    }
    if (channelDistribution.hasOwnProperty(r.channel)) {
      channelDistribution[r.channel]++;
    }
  });

  const recoveryRatePercentage = totalRevenueAtRisk > 0 
    ? Number(((totalRecoveredRevenue / totalRevenueAtRisk) * 100).toFixed(1))
    : 0;

  const scenarioConversionPercentage = totalScenarios > 0 
    ? Number(((recoveredScenarios / totalScenarios) * 100).toFixed(1))
    : 0;

  const avgScore = totalScenarios > 0 
    ? Number((totalPriorityScore / totalScenarios).toFixed(1))
    : 0;

  const avgDurationMinutes = recoveredScenarios > 0 
    ? Math.round((totalDurationSeconds / recoveredScenarios) / 60)
    : 0;

  const strategyEfficiency = totalOutreachRecommendations > 0 
    ? Number(((successfulOutreachCount / totalOutreachRecommendations) * 100).toFixed(1))
    : 0;

  return {
    totalScenarios,
    failedScenarios: totalScenarios,
    recoveredScenarios,
    pendingScenarios: 0,
    unrecoveredScenarios,
    totalRevenueAtRisk,
    totalRecoveredRevenue,
    recoveryRatePercentage,
    scenarioConversionPercentage,
    averageRecoveryTime: `${avgDurationMinutes}m`,
    averageRecoveryTimeMinutes: avgDurationMinutes,
    averagePriorityScore: avgScore,
    totalOutreachRecommendations,
    successfulOutreachCount,
    strategyEfficiency,
    failureDistribution,
    priorityDistribution,
    actionDistribution,
    channelDistribution
  };
}

/**
 * Returns complete benchmark summary including generated scenarios, results, and aggregate metrics.
 * @param {number} count - Scenario count (50, 100, 250)
 * @returns {Object} Complete benchmark summary object
 */
export function getBenchmarkSummary(count = 50) {
  const scenarios = generateBenchmarkScenarios(count);
  const results = runBatchRecoveryBenchmark(scenarios);
  const metrics = calculateBenchmarkMetrics(results);

  return {
    summaryHeader: {
      system: 'RecoverAI Enterprise Recovery Benchmark Engine',
      environment: 'SIMULATED_BENCHMARK_ENVIRONMENT',
      scenarioCount: count,
      timestamp: new Date().toISOString()
    },
    metrics,
    results
  };
}
