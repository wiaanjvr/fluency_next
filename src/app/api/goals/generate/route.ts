import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { GenerateGoalsResponse } from "@/types/goals";

/* =============================================================================
   GENERATE USER GOALS API ROUTE

   POST /api/goals/generate

   Called on: new user signup, start of each month, start of each week (cron).
   Generates user_goals from active goal_templates for the current period(s).
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

    const serviceSupabase = getServiceSupabase();

    // Generate both monthly and weekly goals via the DB function
    const { data: monthlyCreated, error: monthlyError } =
      await serviceSupabase.rpc("generate_goals_for_user", {
        p_user_id: user.id,
        p_period_type: "monthly",
      });

    if (monthlyError) {
      console.error("Error generating monthly goals:", monthlyError);
    }

    const { data: weeklyCreated, error: weeklyError } =
      await serviceSupabase.rpc("generate_goals_for_user", {
        p_user_id: user.id,
        p_period_type: "weekly",
      });

    if (weeklyError) {
      console.error("Error generating weekly goals:", weeklyError);
    }

    const monthlyCount = monthlyCreated ?? 0;
    const weeklyCount = weeklyCreated ?? 0;

    return NextResponse.json<GenerateGoalsResponse>({
      monthlyGoals: monthlyCount,
      weeklyGoals: weeklyCount,
      created: monthlyCount + weeklyCount,
    });
  } catch (error) {
    console.error("Generate goals error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
