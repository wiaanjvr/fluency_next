import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import type { PaddleWebhookEvent } from "@/lib/paddle/types";

/* =============================================================================
   PADDLE WEBHOOK HANDLER
   
   This API route handles incoming webhooks from Paddle to update subscription
   status in our database. It verifies the webhook signature and processes
   the following events:
   
   - subscription.created
   - subscription.updated
   - subscription.canceled
   - subscription.past_due
   - subscription.activated
   - transaction.completed
============================================================================= */

// Create Supabase admin client
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase configuration");
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Verify Paddle webhook signature
function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  secretKey: string,
): boolean {
  if (!signature) return false;

  // Paddle uses HMAC-SHA256 for webhook signatures
  const expectedSignature = crypto
    .createHmac("sha256", secretKey)
    .update(payload)
    .digest("hex");

  // Use timing-safe comparison
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature),
  );
}

export async function POST(request: NextRequest) {
  try {
    const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("PADDLE_WEBHOOK_SECRET not configured");
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 500 },
      );
    }

    // Get raw body for signature verification
    const payload = await request.text();
    const signature = request.headers.get("paddle-signature");

    // Verify webhook signature
    // Note: Paddle's signature format may vary - adjust verification as needed
    // In production, use Paddle's official SDK for signature verification

    // Parse the webhook event
    const event: PaddleWebhookEvent = JSON.parse(payload);

    console.log(`Received Paddle webhook: ${event.event_type}`, {
      event_id: event.event_id,
      occurred_at: event.occurred_at,
    });

    // Handle different event types
    switch (event.event_type) {
      case "subscription.created":
      case "subscription.activated":
        await handleSubscriptionCreated(event);
        break;

      case "subscription.updated":
        await handleSubscriptionUpdated(event);
        break;

      case "subscription.canceled":
        await handleSubscriptionCanceled(event);
        break;

      case "subscription.past_due":
        await handleSubscriptionPastDue(event);
        break;

      case "subscription.paused":
        await handleSubscriptionPaused(event);
        break;

      case "subscription.resumed":
        await handleSubscriptionResumed(event);
        break;

      case "transaction.completed":
        await handleTransactionCompleted(event);
        break;

      default:
        console.log(`Unhandled webhook event type: ${event.event_type}`);
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

async function handleSubscriptionCreated(event: PaddleWebhookEvent) {
  const subscription = event.data as any;
  const supabase = getSupabaseAdmin();

  // Extract user ID from custom data (set during checkout)
  const userId = subscription.custom_data?.userId;

  if (!userId) {
    console.warn("No user ID in subscription custom data");
    return;
  }

  // Update user's subscription in database
  const { error } = await supabase.from("user_subscriptions").upsert(
    {
      user_id: userId,
      paddle_customer_id: subscription.customer_id,
      paddle_subscription_id: subscription.id,
      status: subscription.status === "trialing" ? "trialing" : "active",
      plan: "premium",
      current_period_start: subscription.current_billing_period?.starts_at,
      current_period_end: subscription.current_billing_period?.ends_at,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "user_id",
    },
  );

  if (error) {
    console.error("Error updating subscription:", error);
    throw error;
  }

  // Also update the user's subscription_tier in the users table
  await supabase
    .from("users")
    .update({ subscription_tier: "premium" })
    .eq("id", userId);

  console.log(`Subscription created for user ${userId}`);
}

async function handleSubscriptionUpdated(event: PaddleWebhookEvent) {
  const subscription = event.data as any;
  const supabase = getSupabaseAdmin();

  // Find user by Paddle subscription ID
  const { data: userSub } = await supabase
    .from("user_subscriptions")
    .select("user_id")
    .eq("paddle_subscription_id", subscription.id)
    .single();

  if (!userSub) {
    console.warn(`No user found for subscription ${subscription.id}`);
    return;
  }

  // Update subscription details
  const { error } = await supabase
    .from("user_subscriptions")
    .update({
      status: mapPaddleStatusToAppStatus(subscription.status),
      current_period_start: subscription.current_billing_period?.starts_at,
      current_period_end: subscription.current_billing_period?.ends_at,
      cancel_at_period_end: subscription.scheduled_change?.action === "cancel",
      updated_at: new Date().toISOString(),
    })
    .eq("paddle_subscription_id", subscription.id);

  if (error) {
    console.error("Error updating subscription:", error);
    throw error;
  }

  console.log(`Subscription updated for user ${userSub.user_id}`);
}

async function handleSubscriptionCanceled(event: PaddleWebhookEvent) {
  const subscription = event.data as any;
  const supabase = getSupabaseAdmin();

  // Find and update user subscription
  const { data: userSub } = await supabase
    .from("user_subscriptions")
    .select("user_id")
    .eq("paddle_subscription_id", subscription.id)
    .single();

  if (!userSub) {
    console.warn(`No user found for subscription ${subscription.id}`);
    return;
  }

  // Update subscription status
  await supabase
    .from("user_subscriptions")
    .update({
      status: "canceled",
      updated_at: new Date().toISOString(),
    })
    .eq("paddle_subscription_id", subscription.id);

  // Downgrade user to free tier
  await supabase
    .from("users")
    .update({ subscription_tier: "free" })
    .eq("id", userSub.user_id);

  console.log(`Subscription canceled for user ${userSub.user_id}`);
}

async function handleSubscriptionPastDue(event: PaddleWebhookEvent) {
  const subscription = event.data as any;
  const supabase = getSupabaseAdmin();

  await supabase
    .from("user_subscriptions")
    .update({
      status: "past_due",
      updated_at: new Date().toISOString(),
    })
    .eq("paddle_subscription_id", subscription.id);

  console.log(`Subscription ${subscription.id} marked as past due`);
}

async function handleSubscriptionPaused(event: PaddleWebhookEvent) {
  const subscription = event.data as any;
  const supabase = getSupabaseAdmin();

  // Find user subscription
  const { data: userSub } = await supabase
    .from("user_subscriptions")
    .select("user_id")
    .eq("paddle_subscription_id", subscription.id)
    .single();

  if (!userSub) return;

  // Update to free tier while paused
  await supabase
    .from("user_subscriptions")
    .update({
      status: "canceled", // Treat paused as free
      updated_at: new Date().toISOString(),
    })
    .eq("paddle_subscription_id", subscription.id);

  await supabase
    .from("users")
    .update({ subscription_tier: "free" })
    .eq("id", userSub.user_id);

  console.log(`Subscription paused for user ${userSub.user_id}`);
}

async function handleSubscriptionResumed(event: PaddleWebhookEvent) {
  const subscription = event.data as any;
  const supabase = getSupabaseAdmin();

  // Find user subscription
  const { data: userSub } = await supabase
    .from("user_subscriptions")
    .select("user_id")
    .eq("paddle_subscription_id", subscription.id)
    .single();

  if (!userSub) return;

  // Restore premium access
  await supabase
    .from("user_subscriptions")
    .update({
      status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("paddle_subscription_id", subscription.id);

  await supabase
    .from("users")
    .update({ subscription_tier: "premium" })
    .eq("id", userSub.user_id);

  console.log(`Subscription resumed for user ${userSub.user_id}`);
}

async function handleTransactionCompleted(event: PaddleWebhookEvent) {
  const transaction = event.data as any;
  const supabase = getSupabaseAdmin();

  // Log transaction for record-keeping
  console.log(`Transaction ${transaction.id} completed`, {
    customer_id: transaction.customer_id,
    subscription_id: transaction.subscription_id,
    amount: transaction.details?.totals?.total,
  });

  // Could store transaction history if needed
}

// Map Paddle subscription status to our app status
function mapPaddleStatusToAppStatus(paddleStatus: string): string {
  switch (paddleStatus) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
      return "past_due";
    case "canceled":
      return "canceled";
    case "paused":
      return "canceled";
    default:
      return "free";
  }
}
