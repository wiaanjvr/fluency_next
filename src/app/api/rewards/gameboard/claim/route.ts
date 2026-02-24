import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type {
  GameboardClaimRequest,
  GameboardClaimResponse,
} from "@/types/gameboard";

/* =============================================================================
   CLAIM GAMEBOARD REWARD

   POST /api/rewards/gameboard/claim

   Body: { chosenIndex: number } (0–15)

   Validates:
   - User has a pending reward for the last month
   - chosenIndex is in range 0–15
   - Reward has not expired

   Looks up tile_order[chosenIndex] to get the discount value.
   Updates the row to 'claimed', sets chosen_index + discount_percent.

   IMPORTANT: Never returns the full tile_order array.
============================================================================= */

const getServiceSupabase = () =>
  createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

export async function POST(request: NextRequest) {
  try {
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

    const userId = user.id;
    const body = (await request.json()) as GameboardClaimRequest;
    const { chosenIndex } = body;

    // ── Validate index ──────────────────────────────────────────────────────
    if (
      chosenIndex === undefined ||
      chosenIndex === null ||
      !Number.isInteger(chosenIndex) ||
      chosenIndex < 0 ||
      chosenIndex > 15
    ) {
      return NextResponse.json(
        { error: "chosenIndex must be an integer between 0 and 15" },
        { status: 400 },
      );
    }

    const serviceSupabase = getServiceSupabase();

    // ── Find the user's pending reward for the previous month ──────────────
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const rewardMonth = lastMonth.toISOString().split("T")[0];

    const { data: reward, error: fetchError } = await serviceSupabase
      .from("monthly_rewards")
      .select(
        "id, tile_order, status, expires_at, chosen_index, discount_percent",
      )
      .eq("user_id", userId)
      .eq("month", rewardMonth)
      .single();

    if (fetchError || !reward) {
      return NextResponse.json(
        { error: "No reward found for this month" },
        { status: 404 },
      );
    }

    // ── Idempotency: if already claimed, return the existing result ────────
    if (reward.status === "claimed") {
      return NextResponse.json<GameboardClaimResponse>({
        discountPercent: reward.discount_percent!,
        message: `You already claimed ${reward.discount_percent}% off next month!`,
      });
    }

    // ── Check expiry ────────────────────────────────────────────────────────
    if (reward.status === "expired" || new Date(reward.expires_at) < now) {
      // Mark as expired if not already
      if (reward.status !== "expired") {
        await serviceSupabase
          .from("monthly_rewards")
          .update({ status: "expired" })
          .eq("id", reward.id);
      }
      return NextResponse.json(
        { error: "This reward has expired" },
        { status: 410 },
      );
    }

    // ── Reveal the tile ─────────────────────────────────────────────────────
    const tileOrder = reward.tile_order as number[];
    const discountPercent = tileOrder[chosenIndex];

    if (discountPercent === undefined) {
      return NextResponse.json(
        { error: "Invalid tile index" },
        { status: 400 },
      );
    }

    // ── Update the reward row (optimistic lock via status check) ───────────
    const { data: updated, error: updateError } = await serviceSupabase
      .from("monthly_rewards")
      .update({
        chosen_index: chosenIndex,
        discount_percent: discountPercent,
        status: "claimed",
        claimed_at: new Date().toISOString(),
      })
      .eq("id", reward.id)
      .eq("status", "pending") // optimistic lock — only update if still pending
      .select("discount_percent")
      .single();

    if (updateError || !updated) {
      // Race condition: another request already claimed it
      const { data: alreadyClaimed } = await serviceSupabase
        .from("monthly_rewards")
        .select("discount_percent")
        .eq("id", reward.id)
        .single();

      if (alreadyClaimed?.discount_percent != null) {
        return NextResponse.json<GameboardClaimResponse>({
          discountPercent: alreadyClaimed.discount_percent,
          message: `You already claimed ${alreadyClaimed.discount_percent}% off next month!`,
        });
      }

      return NextResponse.json(
        { error: "Failed to claim reward" },
        { status: 500 },
      );
    }

    // ── TODO: Apply discount to next billing cycle via payment provider ────
    // This would call Paystack/LemonSqueezy API to create a coupon or
    // adjust the next invoice. For now, the discount_percent is stored
    // and can be read by the billing webhook.
    // Example:
    // await applyDiscountToNextBillingCycle(userId, discountPercent);

    return NextResponse.json<GameboardClaimResponse>({
      discountPercent,
      message: `🎉 You won ${discountPercent}% off next month!`,
    });
  } catch (error) {
    console.error("Gameboard claim error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
