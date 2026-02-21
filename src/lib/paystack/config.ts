/* =============================================================================
   PAYSTACK CONFIGURATION
   
   Constants and configuration for Paystack integration.
   Tier-specific plan codes and pricing live in lib/tiers.ts — this file
   only contains Paystack infrastructure constants.
============================================================================= */

import { TIERS, getPlanCode, getTierByPlanCode, type TierSlug } from "@/lib/tiers";

// Paystack API endpoints
export const PAYSTACK_API_URL = "https://api.paystack.co";

// Re-export tier helpers so existing imports from "@/lib/paystack" keep working
export { getPlanCode, getTierByPlanCode };

// Subscription plans — derived from the central TIERS config
// Kept for backward-compat with code that imports PAYSTACK_PLANS
export const PAYSTACK_PLANS = {
  DIVER_MONTHLY: {
    code: getPlanCode("diver"),
    name: TIERS.diver.displayName,
    amount: TIERS.diver.priceKobo,
    interval: "monthly" as const,
    currency: "ZAR",
    tier: "diver" as TierSlug,
  },
  SUBMARINER_MONTHLY: {
    code: getPlanCode("submariner"),
    name: TIERS.submariner.displayName,
    amount: TIERS.submariner.priceKobo,
    interval: "monthly" as const,
    currency: "ZAR",
    tier: "submariner" as TierSlug,
  },
} as const;

// Get plan by code
export function getPlanByCode(code: string) {
  const plan = Object.values(PAYSTACK_PLANS).find((p) => p.code === code);
  return plan || null;
}

// Get plan amount in rands
export function getPlanAmountInRands(planCode: string): number {
  const plan = getPlanByCode(planCode);
  return plan ? plan.amount / 100 : 0;
}

// Webhook events we care about
export const PAYSTACK_WEBHOOK_EVENTS = {
  CHARGE_SUCCESS: "charge.success",
  SUBSCRIPTION_CREATE: "subscription.create",
  SUBSCRIPTION_DISABLE: "subscription.disable",
  SUBSCRIPTION_NOT_RENEW: "subscription.not_renew",
  INVOICE_CREATE: "invoice.create",
  INVOICE_UPDATE: "invoice.update",
  INVOICE_PAYMENT_FAILED: "invoice.payment_failed",
  CUSTOMER_IDENTIFICATION_SUCCESS: "customeridentification.success",
} as const;
