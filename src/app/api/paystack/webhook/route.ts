import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/paystack/utils";
import { activatePremiumSubscription } from "@/lib/paystack/subscription";
import { createClient } from "@supabase/supabase-js";
import { PAYSTACK_WEBHOOK_EVENTS } from "@/lib/paystack/config";

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

  // If this is a subscription payment, activate premium subscription immediately
  if (data.plan) {
    const expiresAt = new Date();

    // Add subscription period
    if (data.plan.interval === "monthly") {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    } else if (data.plan.interval === "yearly") {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    }

    // Use the new activatePremiumSubscription function
    const result = await activatePremiumSubscription(
      userId,
      expiresAt,
      data.customer?.customer_code,
      data.plan?.subscription_code,
    );

    if (result.error) {
      console.error("Error activating subscription:", result.error);
    } else {
      console.log(`Premium subscription activated for user ${userId}`);
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

  // Use the new activatePremiumSubscription function
  const result = await activatePremiumSubscription(
    targetUserId,
    expiresAt,
    data.customer?.customer_code,
    data.subscription?.subscription_code,
  );

  if (result.error) {
    console.error("Error creating subscription:", result.error);
  } else {
    console.log(`Subscription created for user ${targetUserId}`);
  }
}

async function handleSubscriptionDisable(data: any) {
  console.log("Processing subscription disable:", data.subscription_code);

  const subscriptionCode = data.subscription?.subscription_code;

  if (!subscriptionCode) {
    console.error("No subscription code in webhook data");
    return;
  }

  // Update user profile to free tier
  const { error } = await supabase
    .from("profiles")
    .update({
      subscription_tier: "free",
      subscription_expires_at: null,
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

  // You might want to send an email notification to the user
  // or log this for manual follow-up

  const userId = data.metadata?.userId;
  if (userId) {
    console.warn(`Payment failed for user ${userId}`);
    // TODO: Send notification email
  }
}
