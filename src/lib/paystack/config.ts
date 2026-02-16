/* =============================================================================
   PAYSTACK CONFIGURATION
   
   Constants and configuration for Paystack integration
============================================================================= */

// Paystack API endpoints
export const PAYSTACK_API_URL = "https://api.paystack.co";

// Subscription plans
// Note: These plan codes should match your Paystack dashboard plans
export const PAYSTACK_PLANS = {
  PREMIUM_MONTHLY: {
    code: process.env.NEXT_PUBLIC_PAYSTACK_PLAN_MONTHLY || "",
    name: "Premium Monthly",
    amount: 1200, // $12.00 in cents
    interval: "monthly" as const,
    currency: "USD",
  },
  PREMIUM_YEARLY: {
    code: process.env.NEXT_PUBLIC_PAYSTACK_PLAN_YEARLY || "",
    name: "Premium Yearly",
    amount: 9600, // $96.00 in cents
    interval: "yearly" as const,
    currency: "USD",
  },
} as const;

// Get plan by code
export function getPlanByCode(code: string) {
  const plan = Object.values(PAYSTACK_PLANS).find((p) => p.code === code);
  return plan || null;
}

// Get plan amount in dollars
export function getPlanAmountInDollars(planCode: string): number {
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
} as const;
