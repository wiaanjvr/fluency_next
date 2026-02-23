import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/verify-auth";
import { recordReview } from "@/lib/knowledge-graph";
import type { ModuleSource } from "@/types/knowledge-graph";

// ─── POST /api/reading/mark-known ──────────────────────────────────────────
// Mark a word as known via the unified Knowledge Graph pipeline.
// Creates a user_words entry if needed, then runs recordReview so SM-2,
// learner_words_v2, and module_review_history are all updated in one pass.

export async function POST(request: NextRequest) {
  const auth = await verifyAuth();
  if (auth instanceof NextResponse) return auth;
  const { user, supabase } = auth;

  let body: { word?: string; language?: string; textId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { word, language, textId } = body;
  if (!word || !language) {
    return NextResponse.json(
      { error: "word and language are required" },
      { status: 400 },
    );
  }

  const lowerWord = word.toLowerCase();
  const moduleSource: ModuleSource = "free_reading";

  try {
    // 1. Ensure a user_words row exists (upsert with ignoreDuplicates so
    //    we don't overwrite an existing row that already has SRS state).
    const { data: existing } = await supabase
      .from("user_words")
      .select("id")
      .eq("user_id", user.id)
      .eq("word", lowerWord)
      .eq("language", language)
      .maybeSingle();

    let wordId: string;

    if (existing) {
      wordId = existing.id;
    } else {
      const { data: inserted, error: insertErr } = await supabase
        .from("user_words")
        .insert({
          user_id: user.id,
          word: lowerWord,
          lemma: lowerWord,
          language,
          status: "known",
          rating: 4,
          ease_factor: 2.5,
          interval: 30,
          repetitions: 3,
          last_reviewed: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (insertErr || !inserted) {
        console.error(
          "Mark known: failed to create user_words row:",
          insertErr,
        );
        return NextResponse.json(
          { error: "Failed to create word entry" },
          { status: 500 },
        );
      }
      wordId = inserted.id;
    }

    // 2. Run through the unified KG pipeline (SM-2, learner_words_v2 sync,
    //    module_review_history, word_interactions).
    await recordReview(supabase, user.id, {
      wordId,
      moduleSource,
      correct: true,
      rating: 4, // "known" = easy
    });

    // 3. Log the reading-specific interaction
    if (textId) {
      await supabase.from("reading_word_interactions").insert({
        user_id: user.id,
        text_id: textId,
        word: lowerWord,
        language,
        action: "marked_known",
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Mark known error:", err);
    return NextResponse.json(
      { error: "Failed to mark word as known" },
      { status: 500 },
    );
  }
}
