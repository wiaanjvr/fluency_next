/**
 * GET /api/lesson-v2/learner-profile
 *
 * Returns the learner's full profile including:
 * - target_language, interests, known_words, mastery_count
 * - current mastery stage and mixing ratio
 */

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { LearnerProfile, LearnerWord } from "@/types/lesson-v2";
import {
  getMasteryStage,
  getMixingRatio,
  computeMasteryCount,
} from "@/lib/lesson-v2";

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

    // Get profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("target_language, native_language, interests")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Get learner words from DB
    const { data: dbWords, error: wordsError } = await supabase
      .from("learner_words_v2")
      .select("*")
      .eq("user_id", user.id)
      .order("frequency_rank", { ascending: true });

    if (wordsError) {
      console.error("Error fetching learner words:", wordsError);
    }

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

    const masteryCount = computeMasteryCount(knownWords);
    const stage = getMasteryStage(masteryCount);
    const mixing = getMixingRatio(masteryCount);

    const interests = (profile.interests || []).slice(0, 3) as [
      string,
      string,
      string,
    ];

    const learnerProfile: LearnerProfile = {
      userId: user.id,
      targetLanguage: profile.target_language || "fr",
      nativeLanguage: profile.native_language || "en",
      interests,
      knownWords,
      masteryCount,
    };

    return NextResponse.json({
      profile: learnerProfile,
      stage,
      mixing,
    });
  } catch (err) {
    console.error("Learner profile error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
