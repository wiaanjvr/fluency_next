import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type {
  RedeemCreditsRequest,
  RedeemCreditsResponse,
} from "@/types/ocean-impact";

/* =============================================================================
   REDEEM CREDITS API ROUTE

   POST /api/rewards/redeem

   Authenticated route. Deducts credits from the user's reward_credits and
   logs the redemption against the current open donation period.
   
   The donation period defaults to the current calendar month.
============================================================================= */

const getServiceSupabase = () =>
  createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

export async function POST(request: NextRequest) {
  try {
    // ── Authenticate ──────────────────────────────────────────────────────
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    // ── Parse & validate body ─────────────────────────────────────────────
    const body: RedeemCreditsRequest = await request.json();

    if (!body.credits || typeof body.credits !== "number" || body.credits < 1) {
      return NextResponse.json(
        { error: "credits must be a positive integer" },
        { status: 400 },
      );
    }

    const creditsToRedeem = Math.floor(body.credits); // ensure integer
    const serviceSupabase = getServiceSupabase();

    // ── Fetch current credits ─────────────────────────────────────────────
    const { data: profile, error: profileError } = await serviceSupabase
      .from("profiles")
      .select("reward_credits")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 },
      );
    }

    if (profile.reward_credits < creditsToRedeem) {
      return NextResponse.json(
        {
          error: `Insufficient credits. You have ${profile.reward_credits}, tried to redeem ${creditsToRedeem}.`,
        },
        { status: 400 },
      );
    }

    // ── Determine current donation period ─────────────────────────────────
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0];
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .split("T")[0];

    // ── Deduct credits atomically ─────────────────────────────────────────
    const newCredits = profile.reward_credits - creditsToRedeem;

    const { error: updateError } = await serviceSupabase
      .from("profiles")
      .update({ reward_credits: newCredits })
      .eq("id", user.id)
      .eq("reward_credits", profile.reward_credits); // optimistic lock

    if (updateError) {
      console.error("Error deducting credits:", updateError);
      return NextResponse.json(
        { error: "Failed to deduct credits — please try again" },
        { status: 500 },
      );
    }

    // ── Log the redemption ────────────────────────────────────────────────
    const { error: redemptionError } = await serviceSupabase
      .from("credit_redemptions")
      .insert({
        user_id: user.id,
        credits: creditsToRedeem,
        period_start: periodStart,
        period_end: periodEnd,
      });

    if (redemptionError) {
      console.error("Error logging redemption:", redemptionError);
      // Credits already deducted — log error but don't fail the user
      // The allocation step will pick up the profile credit change regardless
    }

    return NextResponse.json<RedeemCreditsResponse>({
      success: true,
      credits_remaining: newCredits,
      message: `Redeemed ${creditsToRedeem} credit${creditsToRedeem > 1 ? "s" : ""} toward ocean cleanup 🌊`,
    });
  } catch (error) {
    console.error("Redeem credits error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
