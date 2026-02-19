/**
 * POST /api/lesson-v2/update-mastery
 *
 * Update a word's mastery status after a review or exercise.
 * Handles promotion from "introduced" → "learning" → "mastered".
 *
 * Body: { lemma: string, correct: boolean }
 * Returns updated word + new mastery count.
 */

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { computeWordStatus, MASTERY_CORRECT_STREAK } from "@/lib/lesson-v2";
import { LearnerWord } from "@/types/lesson-v2";
import { invalidateLearnerWordsCache } from "@/lib/learner-words-cache";

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
    const { lemma, correct } = body as { lemma: string; correct: boolean };

    if (!lemma || typeof correct !== "boolean") {
      return NextResponse.json(
        { error: "lemma (string) and correct (boolean) are required" },
        { status: 400 },
      );
    }

    // Get current word
    const { data: wordRow, error: wordError } = await supabase
      .from("learner_words_v2")
      .select("*")
      .eq("user_id", user.id)
      .eq("lemma", lemma)
      .single();

    if (wordError || !wordRow) {
      return NextResponse.json(
        { error: "Word not found in learner vocabulary" },
        { status: 404 },
      );
    }

    // Map DB row to LearnerWord
    const word: LearnerWord = {
      word: wordRow.word,
      lemma: wordRow.lemma,
      translation: wordRow.translation,
      partOfSpeech: wordRow.part_of_speech,
      frequencyRank: wordRow.frequency_rank,
      status: wordRow.status,
      introducedAt: wordRow.introduced_at,
      lastReviewedAt: wordRow.last_reviewed_at,
      correctStreak: wordRow.correct_streak,
      totalReviews: wordRow.total_reviews,
      totalCorrect: wordRow.total_correct,
    };

    // Compute new status
    const newStatus = computeWordStatus(word, correct);
    const newStreak = correct ? word.correctStreak + 1 : 0;
    const newTotalReviews = word.totalReviews + 1;
    const newTotalCorrect = word.totalCorrect + (correct ? 1 : 0);
    const now = new Date().toISOString();

    // Update DB
    const { error: updateError } = await supabase
      .from("learner_words_v2")
      .update({
        status: newStatus,
        correct_streak: newStreak,
        total_reviews: newTotalReviews,
        total_correct: newTotalCorrect,
        last_reviewed_at: now,
      })
      .eq("user_id", user.id)
      .eq("lemma", lemma);

    if (updateError) {
      console.error("Error updating word mastery:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Invalidate cached learner words so next story gen picks up new mastery
    await invalidateLearnerWordsCache(user.id);

    // Compute new mastery count via DB aggregate (index-only scan)
    // instead of fetching all words and counting client-side
    const { data: countResult } = await supabase.rpc("get_mastery_count", {
      p_user_id: user.id,
    });

    const masteryCount = countResult ?? 0;

    return NextResponse.json({
      success: true,
      word: lemma,
      previousStatus: word.status,
      newStatus,
      correctStreak: newStreak,
      masteryCount,
    });
  } catch (err) {
    console.error("Update mastery error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
