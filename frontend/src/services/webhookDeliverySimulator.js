/**
 * Webhook Delivery Simulator Service — RecoverAI M7 Page 1 Part 2
 * Generates safe, structured webhook event payloads, simulated dispatch results,
 * and custom channel outreach previews.
 * 
 * STRICT BOUNDARY:
 * - 0 real HTTP requests, 0 real email/SMS/WhatsApp dispatches, 0 DB/storage writes.
 * - Pure deterministic functions operating strictly in React memory state.
 * - Strictly excludes sensitive payment credentials.
 */

/**
 * Generates a structured webhook payload for a given event type and recovery context.
 * 
 * @param {string} eventType - "RECOVERY_TRIGGERED" | "PAYMENT_RECOVERED" | "RECOVERY_EXPIRED"
 * @param {Object|null} recoveryContext - Context object containing payment/recovery details
 * @returns {Object} Structured webhook payload object
 */
export function generateWebhookPayload(eventType, recoveryContext) {
  const validEventTypes = ['RECOVERY_TRIGGERED', 'PAYMENT_RECOVERED', 'RECOVERY_EXPIRED'];
  const validEvent = eventType && validEventTypes.includes(String(eventType).toUpperCase())
    ? String(eventType).toUpperCase()
    : 'RECOVERY_TRIGGERED';

  const ctx = recoveryContext && typeof recoveryContext === 'object' ? recoveryContext : {};

  const customerId = ctx.customerId || 'usr_demo_42';
  const productId = ctx.productId || 'ai-fullstack-program';
  const productName = ctx.productName || (productId === 'ai-fullstack-program' ? 'AI & Full-Stack Development Program' : 'Demo Course');
  const amount = Number(ctx.amount || ctx.revenueAtRisk || 2000);
  const currency = ctx.currency || 'INR';
  const failureCode = ctx.failureCode || 'SERVER_ERROR';
  const eventId = `evt_${validEvent.toLowerCase()}_${Date.now()}`;

  let recoveryStatus = 'PENDING';
  if (validEvent === 'PAYMENT_RECOVERED') recoveryStatus = 'RECOVERED';
  else if (validEvent === 'RECOVERY_EXPIRED') recoveryStatus = 'EXPIRED';
  else if (validEvent === 'RECOVERY_TRIGGERED') recoveryStatus = 'OUTREACH_SIMULATED';

  return {
    eventId,
    eventType: validEvent,
    timestamp: new Date().toISOString(),
    environment: 'demo-simulation',
    data: {
      customerId,
      productId,
      productName,
      paymentAttemptId: ctx.paymentAttemptId || ctx.originalPaymentAttemptId || `att_demo_${Date.now()}`,
      paymentResultId: ctx.paymentResultId || ctx.originalPaymentResultId || `result_demo_${Date.now()}`,
      amount,
      currency,
      failureCode,
      recoveryStatus,
      retryCount: ctx.retryCount || 1,
      source: 'RECOVER_AI_AGENT_SIMULATOR'
    }
  };
}

/**
 * Simulates the dispatch of a webhook payload to a merchant endpoint.
 * STRICTLY SIMULATED — DOES NOT MAKE ANY REAL HTTP/NETWORK REQUEST.
 * 
 * @param {Object|null} payload - Webhook payload object
 * @param {Object|null} configuration - Custom simulation configuration
 * @returns {Object} Simulated webhook dispatch result
 */
export function simulateWebhookDispatch(payload, configuration) {
  const validPayload = payload && typeof payload === 'object' 
    ? payload 
    : generateWebhookPayload('RECOVERY_TRIGGERED', null);

  const eventType = validPayload.eventType || 'RECOVERY_TRIGGERED';
  const endpoint = configuration?.endpoint || 'https://merchant.example.com/webhooks/recoverai';

  const headers = {
    'Content-Type': 'application/json',
    'X-RecoverAI-Event': eventType,
    'X-RecoverAI-Environment': 'demo-simulation',
    'User-Agent': 'RecoverAI-WebhookSimulator/1.0'
  };

  return {
    dispatchId: `disp_${Date.now()}`,
    deliveryStatus: 'SIMULATED',
    responseCode: 200,
    simulatedEndpoint: endpoint,
    eventType,
    headers,
    payload: validPayload,
    isSimulated: true,
    notice: 'Simulation only — no external HTTP POST request was performed.',
    timestamp: new Date().toISOString()
  };
}

/**
 * Generates custom channel-specific outreach message previews.
 * STRICTLY PREVIEW / SIMULATION ONLY — DOES NOT SEND REAL MESSAGES.
 * 
 * @param {string} channel - "EMAIL" | "SMS" | "WHATSAPP"
 * @param {Object|null} recoveryContext - Context details
 * @returns {Object} Formatted outreach preview object
 */
export function formatCustomOutreachMessage(channel, recoveryContext) {
  const validChannels = ['EMAIL', 'SMS', 'WHATSAPP'];
  const validChan = channel && validChannels.includes(String(channel).toUpperCase())
    ? String(channel).toUpperCase()
    : 'EMAIL';

  const ctx = recoveryContext && typeof recoveryContext === 'object' ? recoveryContext : {};
  const productName = ctx.productName || 'AI & Full-Stack Development Program';
  const amount = Number(ctx.amount || ctx.revenueAtRisk || 2000);
  const currency = ctx.currency || 'INR';
  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  }).format(amount);

  if (validChan === 'SMS') {
    return {
      channel: 'SMS',
      sender: 'RECOVERAI-SMS',
      recipient: '+91 98765 43210 (Simulated)',
      messageText: `RecoverAI Alert: Your payment of ${formattedAmount} for ${productName} failed. Complete your order now: https://demo.recoverai.io/retry`,
      characterCount: 135,
      isSimulated: true,
      timestamp: new Date().toISOString()
    };
  }

  if (validChan === 'WHATSAPP') {
    return {
      channel: 'WHATSAPP',
      sender: 'RecoverAI Business Assistant',
      recipient: '+91 98765 43210 (Simulated)',
      messageText: `👋 Hi there!\n\nWe noticed your payment of *${formattedAmount}* for *${productName}* didn't go through due to a temporary issue.\n\nYour cart is saved! Tap below to safely complete your purchase:\n\n👉 https://demo.recoverai.io/retry`,
      characterCount: 220,
      isSimulated: true,
      timestamp: new Date().toISOString()
    };
  }

  // Default EMAIL
  return {
    channel: 'EMAIL',
    sender: 'RecoverAI Support <support@recoverai.io>',
    recipient: 'customer@example.com (Simulated)',
    subject: `Complete your purchase for ${productName}`,
    messageText: `Hi Valued Customer,\n\nWe noticed your payment of ${formattedAmount} for ${productName} was interrupted.\n\nYour enrollment details have been saved, and you can resume payment anytime.\n\nThank you,\nRecoverAI Customer Support Team`,
    characterCount: 260,
    isSimulated: true,
    timestamp: new Date().toISOString()
  };
}
