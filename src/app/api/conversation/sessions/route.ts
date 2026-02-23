// ==========================================================================
// POST /api/conversation/sessions — Persist a completed conversation session
// ==========================================================================

import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/verify-auth";
import { recordReviewBatch } from "@/lib/knowledge-graph/record-review";
import type { ReviewEvent, ModuleSource } from "@/types/knowledge-graph";

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth();
    if (auth instanceof NextResponse) return auth;
    const { user, supabase } = auth;

    const body = await request.json();
    const {
      language,
      duration_seconds,
      exchanges,
      transcript,
      vocabulary_used,
    } = body;

    if (!language || duration_seconds === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // 1. Insert session record into conversation_sessions
    const { data: session, error: sessionError } = await supabase
      .from("conversation_sessions")
      .insert({
        user_id: user.id,
        language,
        duration_seconds,
        exchanges: exchanges ?? 0,
        transcript: transcript ?? [],
        vocabulary_used: vocabulary_used ?? [],
      })
      .select("id")
      .single();

    if (sessionError) {
      // If table doesn't exist yet, still try the KG sync
      console.warn(
        "[conversation/sessions] Session insert failed:",
        sessionError.message,
      );
    }

    // 2. Sync vocabulary to the knowledge graph
    // Match vocabulary words against existing user_words entries
    const words: string[] = (vocabulary_used ?? []).map((w: string) =>
      w.toLowerCase(),
    );

    if (words.length > 0) {
      // Find existing user_words for these vocabulary items
      const { data: existingWords } = await supabase
        .from("user_words")
        .select("id, word, lemma")
        .eq("user_id", user.id)
        .eq("language", language)
        .or(
          words
            .slice(0, 50) // Limit to avoid overly large query
            .map((w) => `word.eq.${w},lemma.eq.${w}`)
            .join(","),
        );

      if (existingWords && existingWords.length > 0) {
        const events: ReviewEvent[] = existingWords.map((w) => ({
          wordId: w.id,
          moduleSource: "conversation" as ModuleSource,
          correct: true, // Using a word in conversation = successful recall
          responseTimeMs: undefined,
        }));

        try {
          await recordReviewBatch(supabase, user.id, events);
        } catch (err) {
          console.warn("[conversation/sessions] KG sync failed:", err);
        }
      }
    }

    return NextResponse.json({
      sessionId: session?.id ?? null,
      wordsTracked: words.length,
    });
  } catch (err) {
    console.error("[conversation/sessions] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
