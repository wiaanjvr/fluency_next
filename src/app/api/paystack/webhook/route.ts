import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/paystack/utils";
import { activatePremiumSubscription } from "@/lib/paystack/subscription";
import { createClient } from "@supabase/supabase-js";
import { PAYSTACK_WEBHOOK_EVENTS } from "@/lib/paystack/config";
import { getTierByPlanCode, type TierSlug } from "@/lib/tiers";

/* =============================================================================
   PAYSTACK WEBHOOK API ROUTE
   
   POST /api/paystack/webhook
   
   Handles Paystack webhook events for subscription management
============================================================================= */

// Initialize Supabase client with service role for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(request: NextRequest) {
  try {
    // Get webhook signature
    const signature = request.headers.get("x-paystack-signature");

    if (!signature) {
      console.error("Missing webhook signature");
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    // Get raw body
    const body = await request.text();

    // Verify webhook signature
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      console.error("Paystack secret key not configured");
      return NextResponse.json(
        { error: "Configuration error" },
        { status: 500 },
      );
    }

    const isValid = verifyWebhookSignature(signature, body, secretKey);

    if (!isValid) {
      console.error("Invalid webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Parse the event data
    const event = JSON.parse(body);
    console.log("Paystack webhook event:", event.event);

    // Handle different webhook events
    switch (event.event) {
      case PAYSTACK_WEBHOOK_EVENTS.CHARGE_SUCCESS:
        await handleChargeSuccess(event.data);
        break;

      case PAYSTACK_WEBHOOK_EVENTS.SUBSCRIPTION_CREATE:
        await handleSubscriptionCreate(event.data);
        break;

      case PAYSTACK_WEBHOOK_EVENTS.SUBSCRIPTION_DISABLE:
      case PAYSTACK_WEBHOOK_EVENTS.SUBSCRIPTION_NOT_RENEW:
        await handleSubscriptionDisable(event.data);
        break;

      case PAYSTACK_WEBHOOK_EVENTS.INVOICE_PAYMENT_FAILED:
        await handlePaymentFailed(event.data);
        break;

      case PAYSTACK_WEBHOOK_EVENTS.CUSTOMER_IDENTIFICATION_SUCCESS:
        await handleCustomerIdentification(event.data);
        break;

      default:
        console.log(`Unhandled webhook event: ${event.event}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}

async function handleChargeSuccess(data: any) {
  console.log("Processing charge success:", data.reference);

  // Extract user ID from metadata
  const userId = data.metadata?.userId;

  if (!userId) {
    console.error("No user ID in webhook data");
    return;
  }

  // If this is a subscription payment, activate the correct tier
  if (data.plan) {
    const expiresAt = new Date();

    // Add subscription period based on interval
    if (data.plan.interval === "monthly") {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    } else if (
      data.plan.interval === "yearly" ||
      data.plan.interval === "annually"
    ) {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    } else if (data.metadata?.billing === "annual") {
      // Fallback: check metadata if Paystack doesn't send an interval
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    } else {
      // Default to monthly
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    }

    // Resolve plan code → tier slug
    const resolvedTier: TierSlug =
      getTierByPlanCode(data.plan.plan_code) ||
      (data.metadata?.tier as TierSlug) ||
      "diver";

    const result = await activatePremiumSubscription(
      userId,
      expiresAt,
      data.customer?.customer_code,
      data.plan?.subscription_code,
      resolvedTier,
    );

    if (result.error) {
      console.error("Error activating subscription:", result.error);
    } else {
      console.log(`${resolvedTier} subscription activated for user ${userId}`);
    }
  }

  // Store authorization_code, email, and amount for future charge_authorization calls
  // (used by the reward system's process-billing cron)
  if (data.authorization?.authorization_code || data.customer?.email) {
    const updateData: Record<string, any> = {};
    if (data.authorization?.authorization_code) {
      updateData.paystack_authorization_code =
        data.authorization.authorization_code;
    }
    if (data.customer?.email) {
      updateData.paystack_email = data.customer.email;
    }
    if (data.amount) {
      updateData.subscription_amount = data.amount;
    }
    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", userId);
      if (updateError) {
        console.error("Error storing Paystack auth info:", updateError);
      }
    }
  }
}

async function handleSubscriptionCreate(data: any) {
  console.log("Processing subscription create:", data.subscription_code);

  const userId = data.metadata?.userId;
  const customerEmail = data.customer?.email;

  if (!userId && !customerEmail) {
    console.error("No user identifier in webhook data");
    return;
  }

  // Calculate expiration date
  const expiresAt = new Date(data.subscription?.next_payment_date);

  // Find user by ID or email
  let targetUserId = userId;
  if (!targetUserId && customerEmail) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", customerEmail)
      .single();
    targetUserId = profile?.id;
  }

  if (!targetUserId) {
    console.error("Could not find user for subscription");
    return;
  }

  // Resolve plan code → tier slug
  const resolvedTier: TierSlug =
    getTierByPlanCode(data.plan?.plan_code) ||
    (data.metadata?.tier as TierSlug) ||
    "diver";

  const result = await activatePremiumSubscription(
    targetUserId,
    expiresAt,
    data.customer?.customer_code,
    data.subscription?.subscription_code,
    resolvedTier,
  );

  if (result.error) {
    console.error("Error creating subscription:", result.error);
  } else {
    console.log(
      `${resolvedTier} subscription created for user ${targetUserId}`,
    );
  }
}

async function handleSubscriptionDisable(data: any) {
  console.log("Processing subscription disable:", data.subscription_code);

  const subscriptionCode = data.subscription?.subscription_code;

  if (!subscriptionCode) {
    console.error("No subscription code in webhook data");
    return;
  }

  // Downgrade user to snorkeler (free) tier
  const { error } = await supabase
    .from("profiles")
    .update({
      subscription_tier: "snorkeler",
      subscription_expires_at: null,
      subscription_status: "cancelled",
      next_payment_date: null,
      updated_at: new Date().toISOString(),
    })
    .eq("paystack_subscription_code", subscriptionCode);

  if (error) {
    console.error("Error disabling subscription:", error);
  } else {
    console.log(`Subscription disabled: ${subscriptionCode}`);
  }
}

async function handlePaymentFailed(data: any) {
  console.log("Processing payment failure:", data.reference);

  const userId = data.metadata?.userId;
  const customerEmail = data.customer?.email;

  // Find the user
  let targetUserId = userId;
  if (!targetUserId && customerEmail) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", customerEmail)
      .single();
    targetUserId = profile?.id;
  }

  if (targetUserId) {
    // Flag subscription as past_due — do NOT immediately downgrade
    const { error } = await supabase
      .from("profiles")
      .update({
        subscription_status: "past_due",
        updated_at: new Date().toISOString(),
      })
      .eq("id", targetUserId);

    if (error) {
      console.error("Error flagging subscription as past_due:", error);
    } else {
      console.warn(
        `Payment failed for user ${targetUserId} — marked as past_due`,
      );
    }

    // TODO: Send notification email to user about failed payment
  }
}

async function handleCustomerIdentification(data: any) {
  console.log("Processing customer identification:", data.customer_code);

  // Optional: store verified customer details
  if (data.customer_code) {
    const { error } = await supabase
      .from("profiles")
      .update({
        paystack_customer_code: data.customer_code,
        updated_at: new Date().toISOString(),
      })
      .eq("paystack_customer_code", data.customer_code);

    if (error) {
      console.error("Error updating customer identification:", error);
    }
  }
}
