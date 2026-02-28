import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/verify-auth";

// ─── POST /api/reading/flush-session ────────────────────────────────────────
// Beacon-compatible endpoint for flushing session vocabulary on page unload.
// Receives the session state as JSON and performs the same upserts that
// the client-side flushSession() does, but from the server side.
// This ensures vocabulary is never lost even if beforeunload fires too late.

export async function POST(request: NextRequest) {
  const auth = await verifyAuth();
  if (auth instanceof NextResponse) return auth;
  const { user, supabase } = auth;

  let body: {
    userId?: string;
    language?: string;
    lookedUp?: string[];
    markedKnown?: string[];
    textWords?: string[];
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { language, lookedUp, markedKnown, textWords } = body;
  if (!language) {
    return NextResponse.json(
      { error: "language is required" },
      { status: 400 },
    );
  }

  try {
    const markedKnownSet = new Set(markedKnown ?? []);

    // 1. Upsert looked-up words as 'learning' (don't downgrade known → learning)
    const wordsToLearn = (lookedUp ?? []).filter((w) => !markedKnownSet.has(w));
    if (wordsToLearn.length > 0) {
      await supabase.from("user_words").upsert(
        wordsToLearn.map((w) => ({
          user_id: user.id,
          word: w,
          lemma: w,
          language,
          status: "learning",
          rating: 0,
          ease_factor: 2.5,
          interval: 0,
          repetitions: 0,
          last_seen: new Date().toISOString(),
        })),
        { onConflict: "user_id,word,language", ignoreDuplicates: true },
      );
    }

    // 2. Upsert marked-known words
    if (markedKnown && markedKnown.length > 0) {
      await supabase.from("user_words").upsert(
        markedKnown.map((w) => ({
          user_id: user.id,
          word: w,
          lemma: w,
          language,
          status: "known",
          rating: 4,
          ease_factor: 2.5,
          interval: 30,
          repetitions: 3,
          last_seen: new Date().toISOString(),
        })),
        { onConflict: "user_id,word,language", ignoreDuplicates: false },
      );
    }

    // 3. Update last_seen for all text words that already exist
    if (textWords && textWords.length > 0) {
      await supabase
        .from("user_words")
        .update({ last_seen: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("language", language)
        .in("word", textWords);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Flush session error:", err);
    return NextResponse.json(
      { error: "Failed to flush session" },
      { status: 500 },
    );
  }
}
