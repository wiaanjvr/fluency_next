import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { GameboardStatusResponse } from "@/types/gameboard";

/* =============================================================================
   GET GAMEBOARD REWARD STATUS

   GET /api/rewards/gameboard/status

   Returns the current month's reward status for the authenticated user.
   Only returns: { status, chosenIndex, discountPercent, expiresAt }
   NEVER returns tile_order.
============================================================================= */

const getServiceSupabase = () =>
  createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

export async function GET(_request: NextRequest) {
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

    const serviceSupabase = getServiceSupabase();

    // Check last month's reward (the one currently actionable)
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const rewardMonth = lastMonth.toISOString().split("T")[0];

    const { data: reward, error: fetchError } = await serviceSupabase
      .from("monthly_rewards")
      .select("status, chosen_index, discount_percent, expires_at")
      .eq("user_id", user.id)
      .eq("month", rewardMonth)
      .single();

    if (fetchError || !reward) {
      return NextResponse.json<GameboardStatusResponse>({
        status: "no_reward",
        chosenIndex: null,
        discountPercent: null,
        expiresAt: null,
      });
    }

    return NextResponse.json<GameboardStatusResponse>({
      status: reward.status,
      chosenIndex: reward.chosen_index,
      discountPercent: reward.discount_percent,
      expiresAt: reward.expires_at,
    });
  } catch (error) {
    console.error("Gameboard status error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
