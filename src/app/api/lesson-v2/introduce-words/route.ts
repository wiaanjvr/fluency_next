/**
 * POST /api/lesson-v2/introduce-words
 *
 * Returns the next batch of words for Phase 1 introduction.
 * Marks words as "introduced" in the DB after the learner completes the intro flow.
 *
 * GET  → returns next words to introduce
 * POST → marks words as introduced
 */

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { LearnerWord } from "@/types/lesson-v2";
import {
  selectWordsForIntroduction,
  WORDS_PER_INTRODUCTION_SESSION,
} from "@/lib/lesson-v2";

// GET: return next batch of words to introduce
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get profile for target language
    const { data: profile } = await supabase
      .from("profiles")
      .select("target_language")
      .eq("id", user.id)
      .single();

    const language = profile?.target_language || "fr";

    // Get existing known words
    const { data: dbWords } = await supabase
      .from("learner_words_v2")
      .select("*")
      .eq("user_id", user.id);

    const knownWords: LearnerWord[] = (dbWords || []).map((w: any) => ({
      word: w.word,
      lemma: w.lemma,
      translation: w.translation,
      partOfSpeech: w.part_of_speech,
      frequencyRank: w.frequency_rank,
      status: w.status,
      introducedAt: w.introduced_at,
      lastReviewedAt: w.last_reviewed_at,
      correctStreak: w.correct_streak,
      totalReviews: w.total_reviews,
      totalCorrect: w.total_correct,
    }));

    const words = selectWordsForIntroduction(
      language,
      knownWords,
      WORDS_PER_INTRODUCTION_SESSION,
    );

    return NextResponse.json({ words, language });
  } catch (err) {
    console.error("Introduce words GET error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST: mark words as introduced after learner completes Phase 1
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { words, guesses } = body as {
      words: Array<{
        word: string;
        lemma: string;
        translation: string;
        partOfSpeech: string;
        frequencyRank: number;
      }>;
      guesses: Record<string, string>;
    };

    if (!words || !Array.isArray(words) || words.length === 0) {
      return NextResponse.json({ error: "No words provided" }, { status: 400 });
    }

    const now = new Date().toISOString();

    // Upsert each word as "introduced"
    const rows = words.map((w) => ({
      user_id: user.id,
      word: w.word,
      lemma: w.lemma,
      translation: w.translation,
      part_of_speech: w.partOfSpeech,
      frequency_rank: w.frequencyRank,
      status: "introduced" as const,
      introduced_at: now,
      correct_streak: 0,
      total_reviews: 0,
      total_correct: 0,
    }));

    const { error: upsertError } = await supabase
      .from("learner_words_v2")
      .upsert(rows, {
        onConflict: "user_id,lemma",
        ignoreDuplicates: false,
      });

    if (upsertError) {
      console.error("Error upserting words:", upsertError);
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    // Log the introduction session
    await supabase.from("lesson_sessions_v2").insert({
      user_id: user.id,
      phase: "word-introduction",
      words_introduced: words.map((w) => w.lemma),
      guesses: guesses || {},
      started_at: now,
      completed_at: now,
    });

    return NextResponse.json({
      success: true,
      wordsIntroduced: words.length,
    });
  } catch (err) {
    console.error("Introduce words POST error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
