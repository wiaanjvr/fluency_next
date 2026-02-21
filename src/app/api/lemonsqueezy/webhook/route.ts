import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { type TierSlug, TIER_SLUGS } from "@/lib/tiers";

/* =============================================================================
   LEMON SQUEEZY WEBHOOK API ROUTE

   POST /api/lemonsqueezy/webhook

   Verifies the X-Signature header using HMAC-SHA256 with
   LEMON_SQUEEZY_WEBHOOK_SECRET, then on `order_created` activates the user's
   subscription tier in Supabase.

   Configure in Lemon Squeezy dashboard:
     Webhook URL: https://<your-domain>/api/lemonsqueezy/webhook
     Events:      order_created, subscription_created, subscription_expired
============================================================================= */

// Service-role client — bypasses RLS for subscription writes
const getAdminClient = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

/**
 * Verify the Lemon Squeezy webhook signature.
 * LS sends an X-Signature header: HMAC-SHA256(rawBody, secret) as hex.
 */
function verifyLSSignature(
  signature: string,
  rawBody: string,
  secret: string,
): boolean {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  // Use timingSafeEqual to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(signature, "hex"),
    );
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  // 1. Read raw body before any JSON parsing (required for HMAC verification)
  const rawBody = await request.text();

  // 2. Verify signature
  const signature = request.headers.get("x-signature");
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;

  if (!secret) {
    console.error("[LS Webhook] LEMON_SQUEEZY_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Configuration error" }, { status: 500 });
  }

  if (!signature) {
    console.error("[LS Webhook] Missing X-Signature header");
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  if (!verifyLSSignature(signature, rawBody, secret)) {
    console.error("[LS Webhook] Invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // 3. Parse event
  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const eventName: string = event?.meta?.event_name ?? "";
  console.log("[LS Webhook] Received event:", eventName);

  // 4. Route events
  try {
    switch (eventName) {
      case "order_created":
        await handleOrderCreated(event);
        break;

      case "subscription_created":
        await handleSubscriptionCreated(event);
        break;

      case "subscription_expired":
      case "subscription_cancelled":
        await handleSubscriptionExpired(event);
        break;

      default:
        console.log("[LS Webhook] Unhandled event:", eventName);
    }
  } catch (err) {
    console.error("[LS Webhook] Handler error:", err);
    // Return 200 to prevent LS from retrying for handler-level errors
  }

  return NextResponse.json({ received: true });
}

/* ---------------------------------------------------------------------------
   Event handlers
--------------------------------------------------------------------------- */

async function handleOrderCreated(event: any) {
  const order = event?.data?.attributes;
  const meta = event?.meta?.custom_data ?? {};

  const email: string = order?.user_email ?? "";
  const status: string = order?.status ?? "";
  const tierSlug: TierSlug = resolveTierSlug(
    meta?.tier ?? event?.data?.attributes?.first_order_item?.variant_name,
  );

  console.log("[LS Webhook] order_created", { email, status, tierSlug });

  if (status !== "paid") {
    console.log("[LS Webhook] Order not paid, skipping activation:", status);
    return;
  }

  if (!email) {
    console.error("[LS Webhook] No email in order_created payload");
    return;
  }

  const supabase = getAdminClient();

  // Find user by email
  const { data: profile, error: lookupError } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .single();

  if (lookupError || !profile) {
    console.error("[LS Webhook] User not found for email:", email, lookupError);
    return;
  }

  // Activate subscription — LS orders are one-time but grant monthly access
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 1);

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      subscription_tier: tierSlug,
      subscription_status: "active",
      subscription_expires_at: expiresAt.toISOString(),
      subscription_started_at: new Date().toISOString(),
      next_payment_date: expiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", profile.id);

  if (updateError) {
    console.error("[LS Webhook] Failed to activate subscription:", updateError);
  } else {
    console.log(
      `✅ [LS Webhook] Activated ${tierSlug} for ${email} (expires ${expiresAt.toISOString()})`,
    );
  }
}

async function handleSubscriptionCreated(event: any) {
  const sub = event?.data?.attributes;
  const meta = event?.meta?.custom_data ?? {};

  const email: string = sub?.user_email ?? "";
  const status: string = sub?.status ?? "";
  const tierSlug: TierSlug = resolveTierSlug(meta?.tier ?? sub?.variant_name);

  console.log("[LS Webhook] subscription_created", { email, status, tierSlug });

  if (!["active", "on_trial"].includes(status)) {
    console.log("[LS Webhook] Subscription not active, skipping:", status);
    return;
  }

  if (!email) {
    console.error("[LS Webhook] No email in subscription_created");
    return;
  }

  const supabase = getAdminClient();

  const { data: profile, error: lookupError } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .single();

  if (lookupError || !profile) {
    console.error("[LS Webhook] User not found:", email);
    return;
  }

  const renewsAt = sub?.renews_at ? new Date(sub.renews_at) : new Date();
  if (!sub?.renews_at) renewsAt.setMonth(renewsAt.getMonth() + 1);

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      subscription_tier: tierSlug,
      subscription_status: "active",
      subscription_expires_at: renewsAt.toISOString(),
      subscription_started_at: new Date().toISOString(),
      next_payment_date: renewsAt.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", profile.id);

  if (updateError) {
    console.error("[LS Webhook] Failed to activate subscription:", updateError);
  } else {
    console.log(`✅ [LS Webhook] Subscription activated for ${email}`);
  }
}

async function handleSubscriptionExpired(event: any) {
  const sub = event?.data?.attributes;
  const email: string = sub?.user_email ?? "";

  console.log("[LS Webhook] subscription_expired/cancelled", { email });

  if (!email) {
    console.error("[LS Webhook] No email in subscription_expired");
    return;
  }

  const supabase = getAdminClient();

  const { error } = await supabase
    .from("profiles")
    .update({
      subscription_tier: "snorkeler",
      subscription_status: "cancelled",
      subscription_expires_at: null,
      next_payment_date: null,
      updated_at: new Date().toISOString(),
    })
    .eq("email", email);

  if (error) {
    console.error("[LS Webhook] Failed to expire subscription:", error);
  } else {
    console.log(`✅ [LS Webhook] Subscription cancelled for ${email}`);
  }
}

/* ---------------------------------------------------------------------------
   Helpers
--------------------------------------------------------------------------- */

/** Map a raw tier string (from LS metadata or variant name) to a TierSlug. */
function resolveTierSlug(raw: string | undefined): TierSlug {
  if (!raw) return "diver"; // sensible default
  const lower = raw.toLowerCase();
  for (const slug of TIER_SLUGS) {
    if (lower.includes(slug)) return slug;
  }
  // Legacy / alternative names
  if (lower.includes("pro") || lower.includes("premium")) return "diver";
  if (lower.includes("ultimate") || lower.includes("deep")) return "submariner";
  return "diver";
}
