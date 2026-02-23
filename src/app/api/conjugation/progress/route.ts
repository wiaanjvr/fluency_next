// ==========================================================================
// GET /api/conjugation/progress — Fetch user's conjugation progress
// ==========================================================================

import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/verify-auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth();
    if (auth instanceof NextResponse) return auth;
    const { user, supabase } = auth;

    const { searchParams } = new URL(request.url);
    const language = searchParams.get("language");

    if (!language) {
      return NextResponse.json(
        { error: "language parameter is required" },
        { status: 400 },
      );
    }

    // Get all verb IDs for this language first
    const { data: verbs, error: verbError } = await supabase
      .from("conjugation_verbs")
      .select("id")
      .eq("language", language);

    if (verbError) {
      return NextResponse.json({ error: verbError.message }, { status: 500 });
    }

    const verbIds = (verbs ?? []).map((v) => v.id);

    if (verbIds.length === 0) {
      return NextResponse.json({ progress: [] });
    }

    // Fetch progress for these verbs
    const { data: progress, error: progressError } = await supabase
      .from("conjugation_progress")
      .select("*")
      .eq("user_id", user.id)
      .in("verb_id", verbIds);

    if (progressError) {
      return NextResponse.json(
        { error: progressError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ progress: progress ?? [] });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
