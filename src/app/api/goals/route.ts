import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type {
  GetUserGoalsResponse,
  UserGoal,
  GoalPeriodInfo,
  WeeklyGoalPeriodInfo,
  UserStreak,
} from "@/types/goals";

/* =============================================================================
   GET USER GOALS API ROUTE

   GET /api/goals

   Returns current period goals for the authenticated user, including:
   - Monthly goals with completion status
   - Current week goals with week number and weeks-completed count
   - Streak data
   - Reward eligibility flag
============================================================================= */

const getServiceSupabase = () =>
  createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

/** Get the Monday of the week containing the given date */
function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sun, 1 = Mon, ...
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Get the Sunday of the week containing the given date */
function getSunday(date: Date): Date {
  const monday = getMonday(date);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return sunday;
}

/** Format date as YYYY-MM-DD */
function toDateStr(date: Date): string {
  return date.toISOString().split("T")[0];
}

/** Calculate which week number (1-based) this week is within the month */
function getWeekNumberInMonth(date: Date): number {
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
  const firstMonday = getMonday(monthStart);

  // If first of month is after Monday, the first Monday is in the previous week
  // Adjust: count from the Monday of the week containing the 1st
  const currentMonday = getMonday(date);
  const diffMs = currentMonday.getTime() - firstMonday.getTime();
  const diffWeeks = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));
  return Math.max(1, diffWeeks + 1);
}

export async function GET(request: NextRequest) {
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
    const now = new Date();
    const today = toDateStr(now);

    // ── Period boundaries ──────────────────────────────────────────────
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const weekStart = getMonday(now);
    const weekEnd = getSunday(now);

    const monthStartStr = toDateStr(monthStart);
    const monthEndStr = toDateStr(monthEnd);
    const weekStartStr = toDateStr(weekStart);
    const weekEndStr = toDateStr(weekEnd);

    // ── Fetch monthly goals ────────────────────────────────────────────
    const { data: monthlyGoals, error: monthlyError } = await serviceSupabase
      .from("user_goals")
      .select(
        `
        *,
        template:goal_templates(*)
      `,
      )
      .eq("user_id", user.id)
      .eq("period_type", "monthly")
      .eq("period_start", monthStartStr)
      .order("created_at");

    if (monthlyError) {
      console.error("Error fetching monthly goals:", monthlyError);
    }

    // ── Fetch current week goals ───────────────────────────────────────
    const { data: weeklyGoals, error: weeklyError } = await serviceSupabase
      .from("user_goals")
      .select(
        `
        *,
        template:goal_templates(*)
      `,
      )
      .eq("user_id", user.id)
      .eq("period_type", "weekly")
      .eq("period_start", weekStartStr)
      .order("created_at");

    if (weeklyError) {
      console.error("Error fetching weekly goals:", weeklyError);
    }

    // ── Count completed weekly sets this month ─────────────────────────
    // Each week with ALL goals complete counts as one completed set
    const { data: allWeeklyThisMonth } = await serviceSupabase
      .from("user_goals")
      .select("period_start, is_complete")
      .eq("user_id", user.id)
      .eq("period_type", "weekly")
      .gte("period_start", monthStartStr)
      .lte("period_start", monthEndStr);

    let weeksCompleted = 0;
    if (allWeeklyThisMonth && allWeeklyThisMonth.length > 0) {
      // Group by period_start
      const weekGroups = new Map<string, boolean[]>();
      for (const goal of allWeeklyThisMonth) {
        const key = goal.period_start;
        if (!weekGroups.has(key)) weekGroups.set(key, []);
        weekGroups.get(key)!.push(goal.is_complete);
      }
      for (const [, completions] of weekGroups) {
        if (completions.length > 0 && completions.every(Boolean)) {
          weeksCompleted++;
        }
      }
    }

    // ── Fetch streak ───────────────────────────────────────────────────
    const { data: streakData } = await serviceSupabase
      .from("user_streaks")
      .select("*")
      .eq("user_id", user.id)
      .single();

    // ── Check reward eligibility ───────────────────────────────────────
    const { data: rewardEligible } = await serviceSupabase.rpc(
      "check_reward_eligibility",
      { p_user_id: user.id },
    );

    // ── Build response ─────────────────────────────────────────────────
    const monthly: GoalPeriodInfo = {
      goals: (monthlyGoals as UserGoal[]) ?? [],
      allComplete:
        (monthlyGoals ?? []).length > 0 &&
        (monthlyGoals ?? []).every(
          (g: { is_complete: boolean }) => g.is_complete,
        ),
      periodStart: monthStartStr,
      periodEnd: monthEndStr,
    };

    const weekly: WeeklyGoalPeriodInfo = {
      goals: (weeklyGoals as UserGoal[]) ?? [],
      allComplete:
        (weeklyGoals ?? []).length > 0 &&
        (weeklyGoals ?? []).every(
          (g: { is_complete: boolean }) => g.is_complete,
        ),
      weekNumber: getWeekNumberInMonth(now),
      periodStart: weekStartStr,
      periodEnd: weekEndStr,
      weeksCompleted,
    };

    return NextResponse.json<GetUserGoalsResponse>({
      monthly,
      weekly,
      streak: (streakData as UserStreak) ?? null,
      rewardEligible: rewardEligible ?? false,
    });
  } catch (error) {
    console.error("Get user goals error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
