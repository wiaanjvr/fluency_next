// ==========================================================================
// Supabase Edge Function: score-songs
//
// Scores and ranks songs for a user based on the ratio of known lemmas.
// Returns the top 10 songs closest to a target known‐word ratio (default 0.95).
//
// Deploy with: supabase functions deploy score-songs
// ==========================================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const {
      user_id,
      language_code,
      target_known_ratio = 0.95,
    } = await req.json();

    if (!user_id || !language_code) {
      return new Response(
        JSON.stringify({ error: "user_id and language_code are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ------------------------------------------------------------------
    // 1. Fetch user's known words (lemmas) for the given language
    // ------------------------------------------------------------------
    const { data: knownWordsData, error: wordsError } = await supabase
      .from("learner_words_v2")
      .select("lemma, word")
      .eq("user_id", user_id)
      .eq("language", language_code)
      .in("status", ["known", "mastered"]);

    if (wordsError) {
      return new Response(
        JSON.stringify({
          error: "Failed to fetch user words",
          details: wordsError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const knownLemmas = new Set<string>();
    for (const row of knownWordsData || []) {
      const lemma = (row.lemma || row.word || "").toLowerCase().trim();
      if (lemma) knownLemmas.add(lemma);
    }

    // ------------------------------------------------------------------
    // 2. Fetch songs that have NOT been played in the last 7 days
    // ------------------------------------------------------------------
    const sevenDaysAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const { data: recentPlays } = await supabase
      .from("user_song_history")
      .select("song_id")
      .eq("user_id", user_id)
      .gte("played_at", sevenDaysAgo);

    const recentSongIds = new Set(
      (recentPlays || []).map((r: { song_id: string }) => r.song_id),
    );

    // ------------------------------------------------------------------
    // 3. Fetch all songs in the target language
    // ------------------------------------------------------------------
    const { data: songs, error: songsError } = await supabase
      .from("songs")
      .select(
        "id, title, artist, language_code, youtube_video_id, duration_seconds, difficulty_band, created_at",
      )
      .eq("language_code", language_code);

    if (songsError) {
      return new Response(
        JSON.stringify({
          error: "Failed to fetch songs",
          details: songsError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Filter out recently played songs
    const candidateSongs = (songs || []).filter(
      (s: { id: string }) => !recentSongIds.has(s.id),
    );

    if (candidateSongs.length === 0) {
      return new Response(JSON.stringify({ recommendations: [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ------------------------------------------------------------------
    // 4. Fetch all song_words for candidate songs (batch query)
    // ------------------------------------------------------------------
    const candidateIds = candidateSongs.map((s: { id: string }) => s.id);

    const { data: allSongWords, error: wordsQueryError } = await supabase
      .from("song_words")
      .select("song_id, lemma")
      .in("song_id", candidateIds);

    if (wordsQueryError) {
      return new Response(
        JSON.stringify({
          error: "Failed to fetch song words",
          details: wordsQueryError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Build per-song lemma sets
    const songLemmaMap = new Map<string, Set<string>>();
    for (const sw of allSongWords || []) {
      const lemma = (sw.lemma || "").toLowerCase().trim();
      if (!lemma) continue;
      if (!songLemmaMap.has(sw.song_id)) {
        songLemmaMap.set(sw.song_id, new Set());
      }
      songLemmaMap.get(sw.song_id)!.add(lemma);
    }

    // ------------------------------------------------------------------
    // 5. Score each song
    // ------------------------------------------------------------------
    interface ScoredSong {
      id: string;
      title: string;
      artist: string;
      language_code: string;
      youtube_video_id: string;
      duration_seconds: number | null;
      difficulty_band: string;
      created_at: string;
      total_unique_lemmas: number;
      known_lemma_count: number;
      known_ratio: number;
      distance_from_target: number;
    }

    const scoredSongs: ScoredSong[] = [];

    for (const song of candidateSongs) {
      const lemmaSet = songLemmaMap.get(song.id);
      if (!lemmaSet || lemmaSet.size === 0) continue; // skip songs with no words

      const totalUniqueLemmas = lemmaSet.size;
      let knownCount = 0;
      for (const lemma of lemmaSet) {
        if (knownLemmas.has(lemma)) knownCount++;
      }

      const knownRatio = knownCount / totalUniqueLemmas;
      const distance = Math.abs(knownRatio - target_known_ratio);

      scoredSongs.push({
        ...song,
        total_unique_lemmas: totalUniqueLemmas,
        known_lemma_count: knownCount,
        known_ratio: Math.round(knownRatio * 1000) / 1000,
        distance_from_target: Math.round(distance * 1000) / 1000,
      });
    }

    // Sort by distance ascending (closest to target first)
    scoredSongs.sort((a, b) => a.distance_from_target - b.distance_from_target);

    // Return top 10
    const recommendations = scoredSongs.slice(0, 10);

    return new Response(JSON.stringify({ recommendations }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("score-songs error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
