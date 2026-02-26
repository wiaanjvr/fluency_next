// ============================================================================
// GET /api/songs/[songId]/lyrics
//
// Returns all lyric lines for a song with timestamps, ordered by line_index.
// Public read (no auth required — lyrics are public content).
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ songId: string }> },
) {
  try {
    const { songId } = await params;

    if (!songId) {
      return NextResponse.json(
        { error: "songId is required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // Fetch song metadata
    const { data: song, error: songError } = await supabase
      .from("songs")
      .select(
        "id, title, artist, language_code, youtube_video_id, duration_seconds, difficulty_band",
      )
      .eq("id", songId)
      .single();

    if (songError || !song) {
      return NextResponse.json({ error: "Song not found" }, { status: 404 });
    }

    // Fetch lyrics ordered by line_index
    const { data: lyrics, error: lyricsError } = await supabase
      .from("song_lyrics_lines")
      .select("id, song_id, line_index, text, start_time_ms, end_time_ms")
      .eq("song_id", songId)
      .order("line_index", { ascending: true });

    if (lyricsError) {
      console.error("Lyrics fetch error:", lyricsError);
      return NextResponse.json(
        { error: "Failed to fetch lyrics" },
        { status: 500 },
      );
    }

    // Fetch pre-processed words for this song
    const { data: songWords, error: wordsError } = await supabase
      .from("song_words")
      .select("lemma, raw_word, line_index, word_index_in_line")
      .eq("song_id", songId)
      .order("line_index", { ascending: true })
      .order("word_index_in_line", { ascending: true });

    if (wordsError) {
      console.error("Song words fetch error:", wordsError);
    }

    return NextResponse.json({
      song,
      lyrics: lyrics ?? [],
      words: songWords ?? [],
    });
  } catch (error) {
    console.error("GET /api/songs/[songId]/lyrics error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
