import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/metrics - Returns global metrics for About page
 *
 * Returns: {
 *   activeLearners: number,
 *   lessonsCompleted: number,
 *   languagesAvailable: number
 * }
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  // Count active learners from profiles table
  const { count: activeLearners } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true });

  // Count lessons completed from lessons table
  const { count: lessonsCompleted } = await supabase
    .from("lessons")
    .select("id", { count: "exact", head: true });

  // Get distinct languages from vocabulary table
  // Aggregate distinct languages from several tables to be robust
  const [
    { data: vocabData },
    { data: foundationData },
    { data: allocData },
    { data: contentData },
  ] = await Promise.all([
    supabase.from("vocabulary").select("language"),
    supabase.from("foundation_words").select("language"),
    supabase.from("vocabulary_level_allocation").select("language"),
    supabase.from("content_segments").select("language"),
  ]);

  const allLangs = [
    ...(vocabData || []).map((r: any) => r.language),
    ...(foundationData || []).map((r: any) => r.language),
    ...(allocData || []).map((r: any) => r.language),
    ...(contentData || []).map((r: any) => r.language),
  ];

  const languagesAvailable = Array.from(
    new Set(allLangs.filter(Boolean)),
  ).length;

  return NextResponse.json({
    activeLearners: activeLearners || 0,
    lessonsCompleted: lessonsCompleted || 0,
    languagesAvailable,
  });
}
