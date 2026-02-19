/**
 * POST /api/lesson-v2/generate-story
 *
 * Generates a micro-story based on the learner's mastery state.
 * Uses OpenAI to produce the story + exercise in the exact spec format.
 *
 * Returns: { story: GeneratedStory, exercise: LessonExercise, tone, stage }
 */

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import {
  LearnerWord,
  GeneratedStory,
  StoryTone,
  MasteryStageConfig,
} from "@/types/lesson-v2";
import {
  getMasteryStage,
  computeMasteryCount,
  buildStoryPrompt,
  buildExercisePrompt,
  validateGeneratedStory,
} from "@/lib/lesson-v2";
import OpenAI from "openai";

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

    // Require OpenAI
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey || openaiApiKey === "your_openai_api_key") {
      return NextResponse.json(
        { error: "OpenAI API key required for story generation." },
        { status: 503 },
      );
    }

    const openai = new OpenAI({ apiKey: openaiApiKey });

    // Parse optional body params
    const body = await request.json().catch(() => ({}));
    const { previousTone, previousInterestIndex } = body as {
      previousTone?: StoryTone;
      previousInterestIndex?: number;
    };

    // Get profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("target_language, native_language, interests")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const targetLanguage = profile.target_language || "fr";
    const interests = (profile.interests || []).slice(0, 3) as [
      string,
      string,
      string,
    ];

    if (interests.length < 3) {
      return NextResponse.json(
        { error: "Learner must have 3 interests configured." },
        { status: 400 },
      );
    }

    // Get learner words
    const { data: dbWords } = await supabase
      .from("learner_words_v2")
      .select("*")
      .eq("user_id", user.id)
      .order("frequency_rank", { ascending: true });

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

    // Check that learner has introduced at least some words
    if (knownWords.length === 0) {
      return NextResponse.json(
        {
          error: "No words introduced yet. Complete Phase 1 first.",
          needsIntroduction: true,
        },
        { status: 400 },
      );
    }

    // Build prompt
    const promptResult = buildStoryPrompt({
      targetLanguage,
      interests,
      knownWords,
      masteryCount,
      previousTone,
      previousInterestIndex,
    });

    // Generate story via OpenAI
    let story: GeneratedStory;
    let retries = 0;
    const maxRetries = 2;

    while (true) {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: promptResult.systemPrompt },
          { role: "user", content: promptResult.userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.8,
        max_tokens: 800,
      });

      const raw = completion.choices[0]?.message?.content || "{}";
      story = JSON.parse(raw) as GeneratedStory;

      // Validate
      const knownLemmas = new Set(knownWords.map((w) => w.lemma.toLowerCase()));
      const violations = validateGeneratedStory(story, knownLemmas);

      if (violations.length === 0) break;

      retries++;
      if (retries > maxRetries) {
        console.warn("Story validation failed after retries:", violations);
        break; // Use the story anyway but log warnings
      }
    }

    // Generate exercise
    const exercisePromptResult = buildExercisePrompt(
      promptResult.stage,
      story,
      targetLanguage,
    );

    const exerciseCompletion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: exercisePromptResult.systemPrompt },
        { role: "user", content: exercisePromptResult.userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.6,
      max_tokens: 400,
    });

    const exercise = JSON.parse(
      exerciseCompletion.choices[0]?.message?.content || "{}",
    );

    // Log the session
    const now = new Date().toISOString();
    await supabase.from("lesson_sessions_v2").insert({
      user_id: user.id,
      phase: "story-lesson",
      story_data: story,
      exercise_data: exercise,
      interest_theme: promptResult.selectedTheme,
      tone: promptResult.selectedTone,
      mastery_count: masteryCount,
      stage: promptResult.stage.stage,
      started_at: now,
    });

    return NextResponse.json({
      story,
      exercise,
      tone: promptResult.selectedTone,
      stage: promptResult.stage,
      interestTheme: promptResult.selectedTheme,
      interestIndex: promptResult.selectedThemeIndex,
      masteryCount,
    });
  } catch (err) {
    console.error("Generate story error:", err);
    return NextResponse.json(
      { error: "Failed to generate story" },
      { status: 500 },
    );
  }
}
