import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

/* =============================================================================
   GOALS CRON API ROUTE

   POST /api/goals/cron

   Called by an external cron scheduler (e.g. Vercel Cron, GitHub Actions).
   Requires a CRON_SECRET header for authentication.

   Actions:
   1. Weekly (Mondays): generate weekly goals for all active users
   2. Monthly (1st): generate monthly goals for all active users
   3. Daily: expire completed/missed goals past their period_end

   Query params:
   - ?action=weekly  → generate weekly goals for all users
   - ?action=monthly → generate monthly goals for all users
   - ?action=expire  → expire past-due incomplete goals
   - ?action=auto    → auto-detect based on current date (default)
============================================================================= */

const CRON_SECRET = process.env.CRON_SECRET;

const getServiceSupabase = () =>
  createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  let action = searchParams.get("action") || "auto";

  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0 = Sunday, 1 = Monday
  const dayOfMonth = now.getUTCDate();

  // Auto-detect action based on current date
  if (action === "auto") {
    const actions: string[] = ["expire"];
    if (dayOfWeek === 1) actions.push("weekly"); // Monday
    if (dayOfMonth === 1) actions.push("monthly"); // 1st of month
    action = actions.join(",");
  }

  const serviceSupabase = getServiceSupabase();
  const results: Record<string, unknown> = {};

  try {
    // Get all active user IDs
    const { data: activeUsers } = await serviceSupabase
      .from("user_goals")
      .select("user_id")
      .gte("period_end", now.toISOString().split("T")[0]);

    const userIds = [
      ...new Set((activeUsers ?? []).map((u) => u.user_id)),
    ] as string[];

    // Also include users who signed up recently but may not have goals yet
    const { data: recentUsers } = await serviceSupabase
      .from("profiles")
      .select("id")
      .gte(
        "created_at",
        new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      );

    const recentIds = (recentUsers ?? []).map((u) => u.id);
    const allUserIds = [...new Set([...userIds, ...recentIds])];

    const actions = action.split(",");

    if (actions.includes("monthly")) {
      let totalCreated = 0;
      for (const userId of allUserIds) {
        const { data } = await serviceSupabase.rpc("generate_goals_for_user", {
          p_user_id: userId,
          p_period_type: "monthly",
        });
        totalCreated += data ?? 0;
      }
      results.monthly = {
        users: allUserIds.length,
        goalsCreated: totalCreated,
      };
    }

    if (actions.includes("weekly")) {
      let totalCreated = 0;
      for (const userId of allUserIds) {
        const { data } = await serviceSupabase.rpc("generate_goals_for_user", {
          p_user_id: userId,
          p_period_type: "weekly",
        });
        totalCreated += data ?? 0;
      }
      results.weekly = { users: allUserIds.length, goalsCreated: totalCreated };
    }

    if (actions.includes("expire")) {
      // Mark expired goals (period_end has passed and still incomplete)
      // Note: we don't delete them, just leave is_complete = false
      // They naturally become historical records
      const today = now.toISOString().split("T")[0];
      const { count } = await serviceSupabase
        .from("user_goals")
        .select("id", { count: "exact", head: true })
        .lt("period_end", today)
        .eq("is_complete", false);

      results.expire = { expiredGoals: count ?? 0 };
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      actions: actions,
      results,
    });
  } catch (error) {
    console.error("Goals cron error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
