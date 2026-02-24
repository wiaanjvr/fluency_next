import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type {
  LogGoalEventRequest,
  LogGoalEventResponse,
  UserGoal,
} from "@/types/goals";

/* =============================================================================
   LOG GOAL EVENT API ROUTE

   POST /api/goals/log-event

   Core progress engine. Call this from anywhere in the app when a user
   completes a trackable action.

   Body: { eventType: string, value?: number, metadata?: object }

   Logic:
   - Delegates to the process_goal_event() DB function which:
     - Deduplicates daily_activity events (server-side, NOT client-side)
     - Inserts a goal_events row
     - Updates matching active user_goals
     - Manages streak tracking for daily_activity
     - Checks reward eligibility
   - Returns updated and newly completed goals
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

    const body: LogGoalEventRequest = await request.json();
    const { eventType, value = 1, metadata } = body;

    if (!eventType) {
      return NextResponse.json(
        { error: "eventType is required" },
        { status: 400 },
      );
    }

    const serviceSupabase = getServiceSupabase();

    // Call the server-side function that handles everything:
    // - daily_activity deduplication
    // - event insertion
    // - goal progress updates
    // - streak tracking
    // - reward eligibility check
    const { data: result, error: rpcError } = await serviceSupabase.rpc(
      "process_goal_event",
      {
        p_user_id: user.id,
        p_event_type: eventType,
        p_value: value,
        p_metadata: metadata ?? null,
      },
    );

    if (rpcError) {
      console.error("Error processing goal event:", rpcError);
      return NextResponse.json(
        { error: "Failed to process goal event" },
        { status: 500 },
      );
    }

    // Fetch the updated goals to return full objects
    const updatedIds: string[] = result?.updated ?? [];
    const completedIds: string[] = result?.completed ?? [];
    const rewardEligible: boolean = result?.reward_eligible ?? false;

    let updatedGoals: UserGoal[] = [];
    let completedGoals: UserGoal[] = [];

    if (updatedIds.length > 0) {
      const { data: goals } = await serviceSupabase
        .from("user_goals")
        .select(
          `
          *,
          template:goal_templates(*)
        `,
        )
        .in("id", updatedIds);

      updatedGoals = (goals as UserGoal[]) ?? [];
      completedGoals = updatedGoals.filter((g) => completedIds.includes(g.id));
    }

    // If reward is now eligible, trigger gameboard creation
    // TODO: Integrate with existing check-goals / gameboard system
    if (rewardEligible) {
      try {
        const baseUrl =
          process.env.NEXT_PUBLIC_SITE_URL ||
          process.env.NEXT_PUBLIC_VERCEL_URL ||
          "http://localhost:3000";
        await fetch(`${baseUrl}/api/rewards/check-goals`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: request.headers.get("cookie") || "",
          },
        });
      } catch (rewardError) {
        // Non-critical — log but don't fail the event
        console.error("Error triggering reward check:", rewardError);
      }
    }

    return NextResponse.json<LogGoalEventResponse>({
      inserted: result?.inserted ?? true,
      updated: updatedGoals,
      newlyCompleted: completedGoals,
      rewardUnlocked: rewardEligible,
    });
  } catch (error) {
    console.error("Log goal event error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
