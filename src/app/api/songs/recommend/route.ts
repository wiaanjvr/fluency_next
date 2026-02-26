// ============================================================================
// GET /api/songs/recommend
//
// Auth-protected. Returns ranked song recommendations for the current user.
// Query params: language_code (required), target_known_ratio (optional, default 0.95)
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/verify-auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth();
    if (auth instanceof NextResponse) return auth;

    const { user, supabase } = auth;

    const { searchParams } = new URL(request.url);
    const languageCode = searchParams.get("language_code") || "de";
    const targetKnownRatio = parseFloat(
      searchParams.get("target_known_ratio") || "0.95",
    );

    // Call the score-songs edge function
    const { data, error } = await supabase.functions.invoke("score-songs", {
      body: {
        user_id: user.id,
        language_code: languageCode,
        target_known_ratio: targetKnownRatio,
      },
    });

    if (error) {
      console.error("score-songs invocation error:", error);
      return NextResponse.json(
        { error: "Failed to fetch recommendations" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      recommendations: data?.recommendations ?? [],
    });
  } catch (error) {
    console.error("GET /api/songs/recommend error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
