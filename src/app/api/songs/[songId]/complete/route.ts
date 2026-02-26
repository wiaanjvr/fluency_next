// ============================================================================
// POST /api/songs/[songId]/complete
//
// Auth-protected. Records song completion and upserts new words encountered.
// Body: { completion_percentage: number, new_words: string[] }
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/verify-auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ songId: string }> },
) {
  try {
    const auth = await verifyAuth();
    if (auth instanceof NextResponse) return auth;

    const { user, supabase } = auth;
    const { songId } = await params;

    if (!songId) {
      return NextResponse.json(
        { error: "songId is required" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const completionPercentage: number = body.completion_percentage ?? 0;
    const newWords: string[] = body.new_words ?? [];

    // Verify the song exists
    const { data: song, error: songError } = await supabase
      .from("songs")
      .select("id, language_code")
      .eq("id", songId)
      .single();

    if (songError || !song) {
      return NextResponse.json({ error: "Song not found" }, { status: 404 });
    }

    // Insert into user_song_history
    const { error: historyError } = await supabase
      .from("user_song_history")
      .insert({
        user_id: user.id,
        song_id: songId,
        completion_percentage: completionPercentage,
        new_words_encountered: newWords.length,
      });

    if (historyError) {
      console.error("History insert error:", historyError);
      return NextResponse.json(
        { error: "Failed to save play history" },
        { status: 500 },
      );
    }

    // Upsert new words into learner_words_v2 with status 'new'
    // (encountered but not yet learned)
    if (newWords.length > 0) {
      const wordsToUpsert = newWords.map((word) => ({
        user_id: user.id,
        word: word.toLowerCase().trim(),
        lemma: word.toLowerCase().trim(),
        language: song.language_code,
        status: "new",
      }));

      const { error: upsertError } = await supabase
        .from("learner_words_v2")
        .upsert(wordsToUpsert, {
          onConflict: "user_id,language,lemma",
          ignoreDuplicates: true, // don't overwrite if already exists
        });

      if (upsertError) {
        console.error("Word upsert error:", upsertError);
        // Non-fatal — still return success for the history insert
      }
    }

    return NextResponse.json({
      success: true,
      history_recorded: true,
      new_words_added: newWords.length,
    });
  } catch (error) {
    console.error("POST /api/songs/[songId]/complete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
