/**
 * Payment Outcome Engine — RecoverAI M3 Page 1 Part 2
 * Deterministic frontend-only payment outcome simulator.
 * Maps selected demo scenario to simulated payment result without random behavior.
 */

import { DEFAULT_SCENARIO } from '../data/paymentScenarios.js';

/**
 * Simulates a payment outcome based deterministically on the provided scenario.
 * 
 * @param {string} scenario - Selected demo scenario ("SUCCESS" | "SERVER_ERROR" | "NETWORK_ERROR" | "TIMEOUT")
 * @returns {{ status: "SUCCESS" | "FAILED", failureCode?: string }} Simulated outcome object
 */
export function simulatePaymentOutcome(scenario = DEFAULT_SCENARIO) {
  const normalizedScenario = scenario ? String(scenario).toUpperCase() : DEFAULT_SCENARIO;

  switch (normalizedScenario) {
    case "SUCCESS":
      return {
        status: "SUCCESS"
      };

    case "SERVER_ERROR":
      return {
        status: "FAILED",
        failureCode: "SERVER_ERROR"
      };

    case "NETWORK_ERROR":
      return {
        status: "FAILED",
        failureCode: "NETWORK_ERROR"
      };

    case "TIMEOUT":
      return {
        status: "FAILED",
        failureCode: "TIMEOUT"
      };

    default:
      return {
        status: "FAILED",
        failureCode: "SERVER_ERROR"
      };
  }
}
