/* =============================================================================
   PAYSTACK UTILITIES
   
   Helper functions for Paystack integration
============================================================================= */

import crypto from "crypto";
import { PaystackInitializeResponse, PaystackVerifyResponse } from "./types";
import { PAYSTACK_API_URL } from "./config";

/**
 * Generate a unique reference for a transaction
 */
export function generateReference(prefix = "lingua"): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Verify webhook signature from Paystack
 */
export function verifyWebhookSignature(
  signature: string,
  body: string,
  secret: string,
): boolean {
  const hash = crypto.createHmac("sha512", secret).update(body).digest("hex");
  return hash === signature;
}

/**
 * Initialize a Paystack transaction
 */
export async function initializeTransaction(
  email: string,
  amount: number,
  options: {
    reference?: string;
    currency?: string;
    planCode?: string;
    metadata?: Record<string, any>;
    callbackUrl?: string;
  } = {},
): Promise<PaystackInitializeResponse> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;

  if (!secretKey) {
    throw new Error("Paystack secret key not configured");
  }

  const payload: any = {
    email,
    amount,
    reference: options.reference || generateReference(),
    currency: options.currency || "ZAR", // Default to ZAR for South African merchants
    callback_url:
      options.callbackUrl ||
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/paystack/callback`,
  };

  if (options.planCode) {
    payload.plan = options.planCode;
  }

  if (options.metadata) {
    payload.metadata = options.metadata;
  }

  const response = await fetch(`${PAYSTACK_API_URL}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to initialize transaction");
  }

  return response.json();
}

/**
 * Verify a transaction
 */
export async function verifyTransaction(
  reference: string,
): Promise<PaystackVerifyResponse> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;

  if (!secretKey) {
    throw new Error("Paystack secret key not configured");
  }

  const response = await fetch(
    `${PAYSTACK_API_URL}/transaction/verify/${reference}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to verify transaction");
  }

  return response.json();
}

/**
 * Format amount to Paystack format (smallest currency unit)
 * For USD: dollars to cents
 * For NGN: naira to kobo
 */
export function formatAmount(amount: number, currency: string = "USD"): number {
  // Most currencies use 2 decimal places
  return Math.round(amount * 100);
}

/**
 * Format amount from Paystack format to standard decimal
 */
export function parseAmount(amount: number, currency: string = "USD"): number {
  return amount / 100;
}

/**
 * Create a Paystack customer
 */
export async function createCustomer(
  email: string,
  firstName?: string,
  lastName?: string,
): Promise<any> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;

  if (!secretKey) {
    throw new Error("Paystack secret key not configured");
  }

  const payload: any = { email };
  if (firstName) payload.first_name = firstName;
  if (lastName) payload.last_name = lastName;

  const response = await fetch(`${PAYSTACK_API_URL}/customer`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to create customer");
  }

  return response.json();
}

/**
 * Get subscription details
 */
export async function getSubscription(subscriptionCode: string): Promise<any> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;

  if (!secretKey) {
    throw new Error("Paystack secret key not configured");
  }

  const response = await fetch(
    `${PAYSTACK_API_URL}/subscription/${subscriptionCode}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to get subscription");
  }

  return response.json();
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(
  subscriptionCode: string,
  emailToken: string,
): Promise<any> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;

  if (!secretKey) {
    throw new Error("Paystack secret key not configured");
  }

  const response = await fetch(`${PAYSTACK_API_URL}/subscription/disable`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      code: subscriptionCode,
      token: emailToken,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to cancel subscription");
  }

  return response.json();
}
