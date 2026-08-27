/**
 * RecoverAI — Payment Outcome Scenario Definitions
 * Centralized data model for demo payment simulation outcomes.
 */

export const PAYMENT_SCENARIOS = [
  {
    id: "SUCCESS",
    label: "Payment Successful",
    description: "Simulate a successful payment."
  },
  {
    id: "SERVER_ERROR",
    label: "Server Error",
    description: "Simulate a payment failure caused by a server-side error."
  },
  {
    id: "NETWORK_ERROR",
    label: "Network Error",
    description: "Simulate a payment failure caused by a network problem."
  },
  {
    id: "TIMEOUT",
    label: "Payment Timeout",
    description: "Simulate a payment failure caused by a payment timeout."
  }
];

export const DEFAULT_SCENARIO = "SERVER_ERROR";
