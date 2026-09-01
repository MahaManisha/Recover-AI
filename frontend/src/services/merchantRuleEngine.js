/**
 * Merchant Rule Engine Service — RecoverAI M7 Page 1 Part 1
 * Provides pure, deterministic merchant recovery policy configuration and custom rule evaluation.
 * 
 * STRICT BOUNDARY:
 * - Pure deterministic functions operating strictly in React memory state.
 * - Does NOT make backend API calls, Supabase database writes, or storage writes.
 * - Strictly excludes sensitive payment credentials.
 */

/**
 * Returns the default merchant recovery rule configuration.
 * Fully compatible with M1-M6 demo scenario defaults.
 * 
 * @returns {Object} Default merchant rule configuration
 */
export function getMerchantRuleConfig() {
  return {
    minRevenueThreshold: 1000,         // Minimum INR amount at risk to qualify for recovery outreach (₹1,000)
    minPriorityThreshold: 'HIGH',      // Minimum priority level required ("LOW" | "MEDIUM" | "HIGH" | "CRITICAL")
    revenueWeight: 40,                 // Score weight points for revenue value tier (10 - 50)
    failureWeight: 40,                 // Score weight points for failure severity (10 - 50)
    paymentMethodWeight: 20,            // Score weight points for payment context (0 - 30)
    preferredChannel: 'EMAIL',         // Preferred outreach channel ("EMAIL" | "SMS" | "WHATSAPP")
    autoOutreachEnabled: true,         // Automated recovery outreach engine toggle
    timestamp: new Date().toISOString()
  };
}

/**
 * Updates an existing merchant rule configuration with sanitized inputs.
 * 
 * @param {Object|null} currentConfig - Current merchant rule configuration
 * @param {Object|null} updates - Partial configuration updates
 * @returns {Object} Updated merchant rule configuration
 */
export function updateMerchantRuleConfig(currentConfig, updates) {
  const base = currentConfig && typeof currentConfig === 'object' ? currentConfig : getMerchantRuleConfig();
  if (!updates || typeof updates !== 'object') {
    return { ...base };
  }

  const validPriorityLevels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  const validChannels = ['EMAIL', 'SMS', 'WHATSAPP'];

  const minRevenueThreshold = typeof updates.minRevenueThreshold === 'number' && !isNaN(updates.minRevenueThreshold) && updates.minRevenueThreshold >= 0
    ? updates.minRevenueThreshold
    : base.minRevenueThreshold;

  const minPriorityThreshold = updates.minPriorityThreshold && validPriorityLevels.includes(String(updates.minPriorityThreshold).toUpperCase())
    ? String(updates.minPriorityThreshold).toUpperCase()
    : base.minPriorityThreshold;

  const revenueWeight = typeof updates.revenueWeight === 'number' && !isNaN(updates.revenueWeight) && updates.revenueWeight >= 0 && updates.revenueWeight <= 100
    ? updates.revenueWeight
    : base.revenueWeight;

  const failureWeight = typeof updates.failureWeight === 'number' && !isNaN(updates.failureWeight) && updates.failureWeight >= 0 && updates.failureWeight <= 100
    ? updates.failureWeight
    : base.failureWeight;

  const paymentMethodWeight = typeof updates.paymentMethodWeight === 'number' && !isNaN(updates.paymentMethodWeight) && updates.paymentMethodWeight >= 0 && updates.paymentMethodWeight <= 100
    ? updates.paymentMethodWeight
    : base.paymentMethodWeight;

  const preferredChannel = updates.preferredChannel && validChannels.includes(String(updates.preferredChannel).toUpperCase())
    ? String(updates.preferredChannel).toUpperCase()
    : base.preferredChannel;

  const autoOutreachEnabled = typeof updates.autoOutreachEnabled === 'boolean'
    ? updates.autoOutreachEnabled
    : base.autoOutreachEnabled;

  return {
    minRevenueThreshold,
    minPriorityThreshold,
    revenueWeight,
    failureWeight,
    paymentMethodWeight,
    preferredChannel,
    autoOutreachEnabled,
    timestamp: new Date().toISOString()
  };
}

/**
 * Evaluates a recovery context against the merchant's active rule configuration.
 * 
 * @param {Object|null} recoveryContext - Failure context object (amount, failureCode, paymentMethod, etc.)
 * @param {Object|null} ruleConfig - Merchant rule configuration object
 * @returns {Object} Structured rule evaluation result
 */
export function evaluateCustomRules(recoveryContext, ruleConfig) {
  const config = ruleConfig && typeof ruleConfig === 'object' ? ruleConfig : getMerchantRuleConfig();

  if (!recoveryContext || typeof recoveryContext !== 'object') {
    return {
      isEligible: false,
      evaluatedPriority: 'LOW',
      evaluatedScore: 0,
      recommendedAction: 'NO_ACTION',
      preferredChannel: config.preferredChannel || 'EMAIL',
      decisionReason: 'Invalid or missing recovery context for rule evaluation.',
      appliedRules: ['RULE_INVALID_INPUT']
    };
  }

  const amount = Number(recoveryContext.amount || recoveryContext.revenueAtRisk) || 0;
  const currency = recoveryContext.currency || 'INR';
  const failureCode = recoveryContext.failureCode ? String(recoveryContext.failureCode).toUpperCase() : 'SERVER_ERROR';
  const paymentMethod = recoveryContext.paymentMethod ? String(recoveryContext.paymentMethod).toUpperCase() : 'CARD';

  const appliedRules = [];

  // 1. Check Revenue Risk Threshold
  const meetsRevenueThreshold = amount >= config.minRevenueThreshold;
  if (meetsRevenueThreshold) {
    appliedRules.push(`REVENUE_QUALIFIED (₹${amount} >= ₹${config.minRevenueThreshold})`);
  } else {
    appliedRules.push(`REVENUE_BELOW_THRESHOLD (₹${amount} < ₹${config.minRevenueThreshold})`);
  }

  // 2. Score Calculation using Weight Config
  let revPoints = 0;
  if (amount >= 5000) revPoints = Math.round(config.revenueWeight * 1.25);
  else if (amount >= 2000) revPoints = config.revenueWeight;
  else if (amount >= 1000) revPoints = Math.round(config.revenueWeight * 0.75);
  else revPoints = Math.round(config.revenueWeight * 0.5);

  let failPoints = 0;
  if (failureCode === 'SERVER_ERROR') failPoints = config.failureWeight;
  else if (failureCode === 'NETWORK_ERROR') failPoints = Math.round(config.failureWeight * 0.85);
  else failPoints = Math.round(config.failureWeight * 0.7);

  let methodPoints = 0;
  if (paymentMethod === 'CARD') methodPoints = config.paymentMethodWeight;
  else if (paymentMethod === 'UPI') methodPoints = Math.round(config.paymentMethodWeight * 0.8);
  else methodPoints = Math.round(config.paymentMethodWeight * 0.6);

  const evaluatedScore = Math.min(100, Math.max(0, revPoints + failPoints + methodPoints));

  // 3. Determine Evaluated Priority Level
  let evaluatedPriority = 'LOW';
  if (evaluatedScore >= 70) evaluatedPriority = 'CRITICAL';
  else if (evaluatedScore >= 50) evaluatedPriority = 'HIGH';
  else if (evaluatedScore >= 30) evaluatedPriority = 'MEDIUM';
  else evaluatedPriority = 'LOW';

  // Priority Rank Comparison helper
  const priorityRank = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
  const itemRank = priorityRank[evaluatedPriority] || 1;
  const configRank = priorityRank[config.minPriorityThreshold] || 3;

  const meetsPriorityThreshold = itemRank >= configRank;
  if (meetsPriorityThreshold) {
    appliedRules.push(`PRIORITY_QUALIFIED (${evaluatedPriority} >= ${config.minPriorityThreshold})`);
  } else {
    appliedRules.push(`PRIORITY_BELOW_THRESHOLD (${evaluatedPriority} < ${config.minPriorityThreshold})`);
  }

  // 4. Action Recommendation Determination
  let isEligible = false;
  let recommendedAction = 'NO_ACTION';
  let decisionReason = '';

  if (!config.autoOutreachEnabled) {
    isEligible = false;
    recommendedAction = 'MANUAL_REVIEW';
    decisionReason = 'Auto-outreach is disabled in merchant policy rules. Opportunity flagged for manual operator review.';
    appliedRules.push('AUTO_OUTREACH_DISABLED');
  } else if (!meetsRevenueThreshold) {
    isEligible = false;
    recommendedAction = 'MONITOR';
    decisionReason = `Revenue at risk (₹${amount}) is below merchant minimum policy threshold (₹${config.minRevenueThreshold}). Opportunity set to automated monitoring.`;
  } else if (!meetsPriorityThreshold) {
    isEligible = false;
    recommendedAction = 'MONITOR';
    decisionReason = `Evaluated priority (${evaluatedPriority}) is below merchant minimum policy threshold (${config.minPriorityThreshold}). Automated monitoring recommended.`;
  } else {
    isEligible = true;
    recommendedAction = 'RECOVERY_OUTREACH';
    decisionReason = `Failed payment qualifies under merchant policy rules (₹${amount} ${currency}, ${evaluatedPriority} priority, ${evaluatedScore}/100 score). ${config.preferredChannel} outreach recommended.`;
  }

  return {
    isEligible,
    evaluatedPriority,
    evaluatedScore,
    recommendedAction,
    preferredChannel: config.preferredChannel || 'EMAIL',
    decisionReason,
    appliedRules
  };
}
