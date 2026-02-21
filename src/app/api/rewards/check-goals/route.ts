import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { CheckGoalsResponse } from "@/types/rewards";

/* =============================================================================
   CHECK GOALS COMPLETION API ROUTE

   POST /api/rewards/check-goals

   Called when a goal is marked complete. Checks if ALL goals for the current
   month are now complete. If yes, creates a user_rewards row with status
   'pending' and returns a flag for the frontend to show the reward modal.
============================================================================= */

const getServiceSupabase = () =>
  createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

export async function POST(request: NextRequest) {
  try {
    // Authenticate the user
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

    // Determine the current month (first day of month)
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0];

    // Fetch all goals for this user + month
    const { data: goals, error: goalsError } = await serviceSupabase
      .from("user_monthly_goals")
      .select("id, completed")
      .eq("user_id", userId)
      .eq("goal_month", currentMonth);

    if (goalsError) {
      console.error("Error fetching goals:", goalsError);
      return NextResponse.json(
        { error: "Failed to fetch goals" },
        { status: 500 },
      );
    }

    // If no goals exist for this month, nothing to reward
    if (!goals || goals.length === 0) {
      return NextResponse.json<CheckGoalsResponse>({
        all_goals_complete: false,
        reward_created: false,
        reward_amount: 0,
      });
    }

    // Check if ALL goals are complete
    const allComplete = goals.every((g) => g.completed);

    if (!allComplete) {
      return NextResponse.json<CheckGoalsResponse>({
        all_goals_complete: false,
        reward_created: false,
        reward_amount: 0,
      });
    }

    // Check if a reward already exists for this month (avoid duplicates)
    const { data: existingReward } = await serviceSupabase
      .from("user_rewards")
      .select("id, standard_amount, discount_amount, charity_amount")
      .eq("user_id", userId)
      .eq("reward_month", currentMonth)
      .single();

    if (existingReward) {
      // Reward already created — just return info
      // Credits = charity_amount in cents / 100 = credits in Rand
      const credits = existingReward.charity_amount
        ? Math.max(1, Math.round(existingReward.charity_amount / 100))
        : Math.max(1, Math.round(existingReward.standard_amount / 2 / 100));
      return NextResponse.json<CheckGoalsResponse>({
        all_goals_complete: true,
        reward_created: false,
        reward_amount: existingReward.standard_amount / 2,
        reward_id: existingReward.id,
        credits_awarded: credits,
      });
    }

    // Fetch the user's subscription amount
    const { data: profile, error: profileError } = await serviceSupabase
      .from("profiles")
      .select("subscription_amount, subscription_tier")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      console.error("Error fetching profile:", profileError);
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 },
      );
    }

    if (profile.subscription_tier === "snorkeler" || profile.subscription_tier === "free") {
      return NextResponse.json(
        { error: "Reward system requires an active paid subscription" },
        { status: 400 },
      );
    }

    const standardAmount = profile.subscription_amount;
    if (!standardAmount || standardAmount <= 0) {
      return NextResponse.json(
        { error: "Subscription amount not set on profile" },
        { status: 400 },
      );
    }

    const rewardAmount = Math.floor(standardAmount / 2);

    // Create the pending reward row
    // Default: full discount (user can change via save-reward-choice)
    const { data: reward, error: rewardError } = await serviceSupabase
      .from("user_rewards")
      .insert({
        user_id: userId,
        reward_month: currentMonth,
        standard_amount: standardAmount,
        discount_amount: rewardAmount,
        charity_amount: 0,
      })
      .select("id")
      .single();

    if (rewardError) {
      console.error("Error creating reward:", rewardError);
      return NextResponse.json(
        { error: "Failed to create reward" },
        { status: 500 },
      );
    }

    return NextResponse.json<CheckGoalsResponse>({
      all_goals_complete: true,
      reward_created: true,
      reward_amount: rewardAmount,
      reward_id: reward.id,
      credits_awarded: Math.max(1, Math.round(rewardAmount / 100)),
    });
  } catch (error) {
    console.error("Check goals error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
