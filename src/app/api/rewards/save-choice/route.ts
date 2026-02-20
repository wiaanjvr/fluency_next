import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type {
  SaveRewardChoiceRequest,
  SaveRewardChoiceResponse,
} from "@/types/rewards";

/* =============================================================================
   SAVE REWARD CHOICE API ROUTE

   POST /api/rewards/save-choice

   Accepts the user's reward choice and updates the pending user_rewards row.
   GlobalGiving integration has been removed — charity amounts now go to the
   community pooled Ocean Cleanup donation via credit redemption.
============================================================================= */

const getServiceSupabase = () =>
  createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

export async function POST(request: NextRequest) {
  try {
    // Authenticate
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

    const body: SaveRewardChoiceRequest = await request.json();

    if (
      typeof body.discount_amount !== "number" ||
      typeof body.charity_amount !== "number"
    ) {
      return NextResponse.json(
        { error: "discount_amount and charity_amount are required integers" },
        { status: 400 },
      );
    }

    const serviceSupabase = getServiceSupabase();
    const userId = user.id;

    // Get the current month
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0];

    // Fetch the pending reward for this user + month
    const { data: reward, error: fetchError } = await serviceSupabase
      .from("user_rewards")
      .select("*")
      .eq("user_id", userId)
      .eq("reward_month", currentMonth)
      .eq("status", "pending")
      .single();

    if (fetchError || !reward) {
      return NextResponse.json(
        { error: "No pending reward found for this month" },
        { status: 404 },
      );
    }

    // Validate: discount_amount + charity_amount must equal 50% of standard_amount
    const expectedTotal = Math.floor(reward.standard_amount / 2);
    if (body.discount_amount + body.charity_amount !== expectedTotal) {
      return NextResponse.json(
        {
          error: `discount_amount + charity_amount must equal ${expectedTotal} (50% of R${(reward.standard_amount / 100).toFixed(2)})`,
        },
        { status: 400 },
      );
    }

    if (body.discount_amount < 0 || body.charity_amount < 0) {
      return NextResponse.json(
        { error: "Amounts cannot be negative" },
        { status: 400 },
      );
    }

    // Update the reward with the user's choice
    const updateData: Record<string, any> = {
      discount_amount: body.discount_amount,
      charity_amount: body.charity_amount,
    };

    const { data: updatedReward, error: updateError } = await serviceSupabase
      .from("user_rewards")
      .update(updateData)
      .eq("id", reward.id)
      .select("*")
      .single();

    if (updateError) {
      console.error("Error updating reward:", updateError);
      return NextResponse.json(
        { error: "Failed to save reward choice" },
        { status: 500 },
      );
    }

    return NextResponse.json<SaveRewardChoiceResponse>({
      success: true,
      reward: updatedReward,
    });
  } catch (error) {
    console.error("Save reward choice error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
