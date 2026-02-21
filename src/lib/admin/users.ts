/* =============================================================================
   ADMIN LIB — User Stats Fetcher
   
   Fetches active user counts from Supabase:
   - Total registered users
   - MAU (active last 30 days)  
   - DAU (active today)
   
   Uses session_logs and profiles tables.
============================================================================= */

import type { UserStats } from "@/types/admin-costs";

export async function fetchUserStats(
  supabaseServiceClient: any,
): Promise<UserStats> {
  try {
    // Total registered users
    const { count: totalUsers } = await supabaseServiceClient
      .from("profiles")
      .select("*", { count: "exact", head: true });

    // MAU — distinct users with sessions in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: mauData } = await supabaseServiceClient
      .from("session_logs")
      .select("user_id")
      .gte("started_at", thirtyDaysAgo.toISOString());

    const mau = mauData ? new Set(mauData.map((r: any) => r.user_id)).size : 0;

    // DAU — distinct users with sessions today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const { data: dauData } = await supabaseServiceClient
      .from("session_logs")
      .select("user_id")
      .gte("started_at", startOfDay.toISOString());

    const dau = dauData ? new Set(dauData.map((r: any) => r.user_id)).size : 0;

    return {
      totalUsers: totalUsers || 0,
      mau,
      dau,
    };
  } catch (err) {
    console.error("Failed to fetch user stats:", err);
    return { totalUsers: 0, mau: 0, dau: 0 };
  }
}
