import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/verify-auth";

// GET /api/pronunciation/progress?language=de
export async function GET(request: NextRequest) {
  const auth = await verifyAuth();
  if (auth instanceof NextResponse) return auth;

  const { user, supabase } = auth;
  const { searchParams } = new URL(request.url);
  const language = searchParams.get("language") || "de";

  const { data: progress, error } = await supabase
    .from("user_pronunciation_progress")
    .select("*, phoneme:phonemes(*)")
    .eq("user_id", user.id)
    .eq("language", language)
    .order("familiarity_score", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch progress", details: error.message },
      { status: 500 },
    );
  }

  // Compute overall pronunciation score
  const items = progress || [];
  const overallScore =
    items.length > 0
      ? Math.round(
          (items.reduce((sum, p) => sum + (p.familiarity_score || 0), 0) /
            items.length) *
            100,
        )
      : 0;

  return NextResponse.json({
    progress: items,
    overall_score: overallScore,
    phonemes_practiced: items.length,
    weakest_phoneme: items[0]?.phoneme || null,
  });
}

// POST /api/pronunciation/progress — upsert after session
export async function POST(request: NextRequest) {
  const auth = await verifyAuth();
  if (auth instanceof NextResponse) return auth;

  const { user, supabase } = auth;

  let body: {
    language: string;
    module_type: string;
    duration_seconds: number;
    items_practiced: number;
    accuracy: number | null;
    session_data?: Record<string, unknown>;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    language,
    module_type,
    duration_seconds,
    items_practiced,
    accuracy,
    session_data,
  } = body;

  const { data: session, error } = await supabase
    .from("user_pronunciation_sessions")
    .insert({
      user_id: user.id,
      language,
      module_type,
      duration_seconds,
      items_practiced,
      accuracy,
      session_data: session_data || {},
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Failed to save session", details: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ session });
}
