// supabase/functions/lemonsqueezy-webhook/index.ts
//
// Supabase Edge Function — handles Lemon Squeezy webhook events.
//
// Deploy: supabase functions deploy lemonsqueezy-webhook
// Set secret: supabase secrets set LEMON_SQUEEZY_WEBHOOK_SECRET=your_secret
//
// Lemon Squeezy webhook docs:
// https://docs.lemonsqueezy.com/guides/developer-guide/webhooks

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

/* ---------- Crypto helpers for HMAC-SHA256 signature verification --------- */

async function verifySignature(
  payload: string,
  signatureHeader: string,
  secret: string,
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signatureBytes = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload),
  );

  const expectedHex = Array.from(new Uint8Array(signatureBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return expectedHex === signatureHeader;
}

/* ---------- Main handler ------------------------------------------------- */

serve(async (req: Request) => {
  // Only accept POST
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const webhookSecret = Deno.env.get("LEMON_SQUEEZY_WEBHOOK_SECRET");
  if (!webhookSecret) {
    console.error("LEMON_SQUEEZY_WEBHOOK_SECRET not set");
    return new Response("Server configuration error", { status: 500 });
  }

  // Read raw body for signature verification
  const rawBody = await req.text();

  // Verify signature (X-Signature header)
  const signature = req.headers.get("x-signature") || "";
  const isValid = await verifySignature(rawBody, signature, webhookSecret);

  if (!isValid) {
    console.error("Invalid Lemon Squeezy webhook signature");
    return new Response("Invalid signature", { status: 401 });
  }

  // Parse the event
  const event = JSON.parse(rawBody);
  const eventName: string = event.meta?.event_name || "";
  const customData = event.meta?.custom_data || {};

  console.log(`[LS Webhook] Event: ${eventName}`);

  // Extract customer email from the payload
  // Lemon Squeezy puts customer info in data.attributes
  const attrs = event.data?.attributes || {};
  const customerEmail: string =
    attrs.user_email || attrs.customer_email || customData.email || "";

  if (!customerEmail) {
    console.error("[LS Webhook] No customer email in payload");
    return new Response(JSON.stringify({ error: "No customer email" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Supabase admin client
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Derive the tier from custom_data or variant name
  const tier: string = customData.tier || deriveTierFromVariant(attrs);

  // Lemon Squeezy subscription ID for reference
  const lsSubscriptionId: string = String(event.data?.id || "");

  // Route based on event type
  switch (eventName) {
    case "subscription_created": {
      console.log(`[LS Webhook] Activating subscription for ${customerEmail}`);
      const { error } = await supabase
        .from("profiles")
        .update({
          subscription_status: "active",
          subscription_tier: tier || "diver",
          payment_provider: "lemonsqueezy",
          lemonsqueezy_subscription_id: lsSubscriptionId,
          subscription_started_at: new Date().toISOString(),
        })
        .eq("email", customerEmail);

      if (error) {
        console.error("[LS Webhook] Failed to activate:", error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
      break;
    }

    case "subscription_updated": {
      // Lemon Squeezy sends this on plan changes, pauses, and resumes
      const status = attrs.status; // active, paused, past_due, cancelled, expired
      const mappedStatus = mapLSStatus(status);

      console.log(
        `[LS Webhook] Updating subscription for ${customerEmail} → ${mappedStatus}`,
      );
      const { error } = await supabase
        .from("profiles")
        .update({
          subscription_status: mappedStatus,
          lemonsqueezy_subscription_id: lsSubscriptionId,
        })
        .eq("email", customerEmail);

      if (error) console.error("[LS Webhook] Update failed:", error);
      break;
    }

    case "subscription_cancelled": {
      console.log(`[LS Webhook] Cancelling subscription for ${customerEmail}`);
      const { error } = await supabase
        .from("profiles")
        .update({
          subscription_status: "cancelled",
        })
        .eq("email", customerEmail);

      if (error) console.error("[LS Webhook] Cancel failed:", error);
      break;
    }

    case "subscription_expired": {
      console.log(`[LS Webhook] Expiring subscription for ${customerEmail}`);
      const { error } = await supabase
        .from("profiles")
        .update({
          subscription_status: "expired",
          subscription_tier: "snorkeler",
        })
        .eq("email", customerEmail);

      if (error) console.error("[LS Webhook] Expire failed:", error);
      break;
    }

    case "subscription_payment_success": {
      console.log(`[LS Webhook] Payment success for ${customerEmail}`);
      // Ensure active status on successful renewal
      const { error } = await supabase
        .from("profiles")
        .update({
          subscription_status: "active",
          next_payment_date: attrs.renews_at || null,
        })
        .eq("email", customerEmail);

      if (error)
        console.error("[LS Webhook] Payment success update failed:", error);
      break;
    }

    case "subscription_payment_failed": {
      console.log(`[LS Webhook] Payment failed for ${customerEmail}`);
      const { error } = await supabase
        .from("profiles")
        .update({
          subscription_status: "past_due",
        })
        .eq("email", customerEmail);

      if (error)
        console.error("[LS Webhook] Payment failed update failed:", error);
      break;
    }

    default:
      console.log(`[LS Webhook] Unhandled event: ${eventName}`);
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});

/* ---------- Helpers ------------------------------------------------------ */

/** Map Lemon Squeezy subscription status to our internal status. */
function mapLSStatus(
  lsStatus: string,
): "active" | "past_due" | "cancelled" | "expired" | "none" {
  switch (lsStatus) {
    case "active":
    case "on_trial":
      return "active";
    case "past_due":
      return "past_due";
    case "cancelled":
      return "cancelled";
    case "expired":
    case "unpaid":
      return "expired";
    case "paused":
      return "cancelled"; // treat paused as cancelled for feature access
    default:
      return "none";
  }
}

/**
 * Try to derive the tier from the Lemon Squeezy variant/product name.
 * Fallback heuristic when custom_data.tier is not set.
 */
function deriveTierFromVariant(attrs: Record<string, any>): string {
  const name = (attrs.variant_name || attrs.product_name || "").toLowerCase();
  if (name.includes("submariner") || name.includes("premium")) {
    return "submariner";
  }
  if (name.includes("diver") || name.includes("standard")) {
    return "diver";
  }
  return "diver"; // safe default for paid tier
}
