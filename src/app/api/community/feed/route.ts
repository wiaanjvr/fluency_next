import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/verify-auth";

/**
 * GET /api/community/feed
 *
 * Returns paginated community submissions with author profiles.
 * Query params: language, exercise_type, status, page, limit
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth();
    if (auth instanceof NextResponse) return auth;
    const { user, supabase } = auth;

    const { searchParams } = new URL(request.url);
    const language = searchParams.get("language") || undefined;
    const exercise_type = searchParams.get("exercise_type") || undefined;
    const status = searchParams.get("status") || "open";
    const page = parseInt(searchParams.get("page") || "0", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "12", 10), 50);

    // Default: show submissions in the user's target language
    let effectiveLanguage = language;
    if (!effectiveLanguage) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("target_language")
        .eq("id", user.id)
        .single();
      effectiveLanguage = profile?.target_language;
    }

    let query = supabase
      .from("community_submissions")
      .select(
        `*, profiles:user_id (id, full_name, avatar_url, target_language, native_language)`,
        { count: "exact" },
      )
      .eq("status", status)
      .neq("user_id", user.id) // Don't show own submissions in "Review Others" feed
      .order("created_at", { ascending: false })
      .range(page * limit, (page + 1) * limit - 1);

    if (effectiveLanguage) {
      query = query.eq("language", effectiveLanguage);
    }
    if (exercise_type) {
      query = query.eq("exercise_type", exercise_type);
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      submissions: data ?? [],
      total: count ?? 0,
      page,
      hasMore: (data?.length ?? 0) === limit,
    });
  } catch (err: unknown) {
    console.error("[community/feed] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
