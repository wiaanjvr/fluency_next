import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/verify-auth";

/**
 * GET /api/community/my-reviews
 *
 * Returns reviews the authenticated user has given, with submission context.
 * Query params: page, limit
 */
export async function GET(request: Request) {
  try {
    const auth = await verifyAuth();
    if (auth instanceof NextResponse) return auth;
    const { user, supabase } = auth;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "0", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "12", 10), 50);

    const { data, error, count } = await supabase
      .from("community_reviews")
      .select(
        `*, profiles:reviewer_id (id, full_name, avatar_url, target_language, native_language), community_submissions (id, language, exercise_type, prompt, content, status)`,
        { count: "exact" },
      )
      .eq("reviewer_id", user.id)
      .order("created_at", { ascending: false })
      .range(page * limit, (page + 1) * limit - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      reviews: data ?? [],
      total: count ?? 0,
      page,
      hasMore: (data?.length ?? 0) === limit,
    });
  } catch (err: unknown) {
    console.error("[community/my-reviews] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
