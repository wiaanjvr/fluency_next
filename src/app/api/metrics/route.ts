import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";

/**
 * GET /api/metrics - Returns global metrics for About page
 *
 * Results are cached in Redis for 1 hour to avoid repeated full-table scans.
 *
 * Returns: {
 *   activeLearners: number,
 *   lessonsCompleted: number,
 *   languagesAvailable: number
 * }
 */
export async function GET(request: NextRequest) {
  // Check Redis cache first (1 hour TTL)
  const cacheKey = "metrics:global";
  try {
    const cached = await redis.get<{
      activeLearners: number;
      lessonsCompleted: number;
      languagesAvailable: number;
    }>(cacheKey);
    if (cached) return NextResponse.json(cached);
  } catch {
    // Cache miss — fall through to DB
  }

  const supabase = await createClient();

  // Count active learners from profiles table
  const { count: activeLearners } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true });

  // Count lessons completed from lessons table
  const { count: lessonsCompleted } = await supabase
    .from("lessons")
    .select("id", { count: "exact", head: true });

  // Get distinct languages using head:true count per table — much cheaper.
  // We only need to know WHICH languages exist, not all rows.
  const [{ data: vocabData }, { data: contentData }] = await Promise.all([
    supabase.from("vocabulary").select("language").limit(100),
    supabase.from("content_segments").select("language").limit(100),
  ]);

  const allLangs = [
    ...(vocabData || []).map((r: any) => r.language),
    ...(contentData || []).map((r: any) => r.language),
  ];

  const languagesAvailable = Array.from(
    new Set(allLangs.filter(Boolean)),
  ).length;

  const result = {
    activeLearners: activeLearners || 0,
    lessonsCompleted: lessonsCompleted || 0,
    languagesAvailable,
  };

  // Cache for 1 hour
  try {
    await redis.set(cacheKey, result, { ex: 3600 });
  } catch {
    // Non-fatal
  }

  return NextResponse.json(result);
}
