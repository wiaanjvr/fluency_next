import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import {
  getTilesForTier,
  shuffleTiles,
  computeExpiresAt,
} from "@/lib/gameboard/tile-config";
import type { GameboardCheckResponse, GameboardTier } from "@/types/gameboard";
import { hasAccess, type TierSlug } from "@/lib/tiers";

/* =============================================================================
   CHECK AND CREATE GAMEBOARD REWARD

   POST /api/rewards/gameboard/check

   Called on login or month rollover. Checks if the user completed all weekly +
   monthly goals for the previous month. If eligible and no reward row exists,
   creates one with a server-shuffled tile_order.

   Returns: { eligible, status, expiresAt }
============================================================================= */

const getServiceSupabase = () =>
  createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

export async function POST(_request: NextRequest) {
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
    const serviceSupabase = getServiceSupabase();

    // ── Determine the "last month" (the month we're checking goals for) ────
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const rewardMonth = lastMonth.toISOString().split("T")[0]; // e.g. "2026-02-01"

    // ── Fetch user profile for tier ─────────────────────────────────────────
    const { data: profile, error: profileError } = await serviceSupabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const tier = profile.subscription_tier as TierSlug;

    // Free / snorkeler users get no gameboard
    if (!hasAccess(tier, "diver")) {
      return NextResponse.json<GameboardCheckResponse>({
        eligible: false,
        status: "not_eligible",
        expiresAt: null,
      });
    }

    // ── Check if reward already exists for this month ──────────────────────
    const { data: existingReward } = await serviceSupabase
      .from("monthly_rewards")
      .select("id, status, expires_at, chosen_index, discount_percent")
      .eq("user_id", userId)
      .eq("month", rewardMonth)
      .single();

    if (existingReward) {
      return NextResponse.json<GameboardCheckResponse>({
        eligible: true,
        status: existingReward.status,
        expiresAt: existingReward.expires_at,
        ...(existingReward.status === "claimed" && {
          discountPercent: existingReward.discount_percent,
          chosenIndex: existingReward.chosen_index,
        }),
      });
    }

    // ── Check weekly goal completion (all weeks in the month) ──────────────
    const { data: weeklyGoals, error: weeklyError } = await serviceSupabase
      .from("user_weekly_goals")
      .select("id, completed")
      .eq("user_id", userId)
      .eq("goal_month", rewardMonth);

    if (weeklyError) {
      console.error("Error fetching weekly goals:", weeklyError);
      return NextResponse.json(
        { error: "Failed to fetch weekly goals" },
        { status: 500 },
      );
    }

    // Need at least 4 weekly goal sets, all completed
    const allWeeklyComplete =
      weeklyGoals &&
      weeklyGoals.length >= 4 &&
      weeklyGoals.every((g) => g.completed);

    // ── Check monthly goal completion ──────────────────────────────────────
    const { data: monthlyGoals, error: monthlyError } = await serviceSupabase
      .from("user_monthly_goals")
      .select("id, completed")
      .eq("user_id", userId)
      .eq("goal_month", rewardMonth);

    if (monthlyError) {
      console.error("Error fetching monthly goals:", monthlyError);
      return NextResponse.json(
        { error: "Failed to fetch monthly goals" },
        { status: 500 },
      );
    }

    const allMonthlyComplete =
      monthlyGoals &&
      monthlyGoals.length > 0 &&
      monthlyGoals.every((g) => g.completed);

    if (!allWeeklyComplete || !allMonthlyComplete) {
      return NextResponse.json<GameboardCheckResponse>({
        eligible: false,
        status: "not_eligible",
        expiresAt: null,
      });
    }

    // ── User is eligible — create the reward ───────────────────────────────
    const gameboardTier: GameboardTier =
      tier === "submariner" ? "submariner" : "diver";
    const tiles = getTilesForTier(gameboardTier);
    const shuffled = shuffleTiles(tiles);
    const expiresAt = computeExpiresAt(lastMonth);

    const { data: reward, error: insertError } = await serviceSupabase
      .from("monthly_rewards")
      .insert({
        user_id: userId,
        month: rewardMonth,
        tier: gameboardTier,
        tile_order: shuffled,
        status: "pending",
        expires_at: expiresAt,
      })
      .select("id, status, expires_at")
      .single();

    if (insertError) {
      // Unique constraint violation — reward was created by a concurrent request
      if (insertError.code === "23505") {
        const { data: existing } = await serviceSupabase
          .from("monthly_rewards")
          .select("id, status, expires_at, chosen_index, discount_percent")
          .eq("user_id", userId)
          .eq("month", rewardMonth)
          .single();

        if (existing) {
          return NextResponse.json<GameboardCheckResponse>({
            eligible: true,
            status: existing.status,
            expiresAt: existing.expires_at,
          });
        }
      }
      console.error("Error creating reward:", insertError);
      return NextResponse.json(
        { error: "Failed to create reward" },
        { status: 500 },
      );
    }

    return NextResponse.json<GameboardCheckResponse>({
      eligible: true,
      status: reward.status,
      expiresAt: reward.expires_at,
    });
  } catch (error) {
    console.error("Gameboard check error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
