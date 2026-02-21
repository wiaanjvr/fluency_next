/**
 * POST /api/lesson-v2/generate-story
 *
 * Generates a micro-story based on the learner's mastery state.
 * Uses Gemini to produce the story + exercise in the exact spec format.
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
import { generateJSONStream, getAI } from "@/lib/ai-client";
import { claimSession } from "@/lib/usage-limits";
import { getLearnerWords } from "@/lib/learner-words-cache";
import { getCachedProfile } from "@/lib/profile-cache";
import { generationQueue } from "@/lib/queue";
import { consumeDailyBudget } from "@/lib/daily-budget";

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

    // Atomic claim: checks limit AND increments counter in one DB call.
    const usageStatus = await claimSession(user.id, "microstory");
    if (!usageStatus.allowed) {
      return NextResponse.json(
        {
          error: "Daily limit reached",
          message:
            "You've reached your daily microstory limit. Upgrade to Diver for unlimited access.",
          limitReached: true,
          limit: usageStatus.limit,
          currentCount: usageStatus.currentCount,
        },
        { status: 429 },
      );
    }

    // Absolute daily generation budget (applies to ALL tiers, including paid)
    const budgetResult = await consumeDailyBudget(user.id);
    if (!budgetResult.allowed) {
      return NextResponse.json(
        {
          error: "Daily generation budget exceeded",
          message: `You've reached the maximum of ${budgetResult.budget} generations per day. Please try again tomorrow.`,
          budgetExceeded: true,
          budget: budgetResult.budget,
          count: budgetResult.count,
        },
        { status: 429 },
      );
    }

    // Validate API key early (getAI() throws if missing)
    try {
      getAI();
    } catch {
      return NextResponse.json(
        { error: "Google API key required for story generation." },
        { status: 503 },
      );
    }

    // Parse optional body params
    const body = await request.json().catch(() => ({}));
    const { previousTone, previousInterestIndex } = body as {
      previousTone?: StoryTone;
      previousInterestIndex?: number;
    };

    // Get profile (Redis-cached, 5 min TTL)
    const profile = await getCachedProfile(
      supabase,
      user.id,
      "target_language, native_language, interests",
    );

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

    // Get learner words (Redis-cached, invalidated on mastery update)
    const knownWords = await getLearnerWords(supabase, user.id);

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

    // Generate story via Gemini (streaming to avoid 504 timeouts)
    let story: GeneratedStory;
    let retries = 0;
    const maxRetries = 2;

    while (true) {
      story = await generateJSONStream<GeneratedStory>({
        contents: promptResult.userPrompt,
        systemInstruction: promptResult.systemPrompt,
        temperature: 0.8,
        maxOutputTokens: 512,
      });

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

    // Generate exercise (streaming)
    const exercisePromptResult = buildExercisePrompt(
      promptResult.stage,
      story,
      targetLanguage,
    );

    const exercise = await generateJSONStream({
      contents: exercisePromptResult.userPrompt,
      systemInstruction: exercisePromptResult.systemPrompt,
      temperature: 0.6,
      maxOutputTokens: 256,
    });

    // Log the session (offloaded to BullMQ — analytics writes should never
    // block the user-facing response)
    const now = new Date().toISOString();
    const sessionLogData = {
      user_id: user.id,
      phase: "story-lesson",
      story_data: story,
      exercise_data: exercise,
      interest_theme: promptResult.selectedTheme,
      tone: promptResult.selectedTone,
      mastery_count: masteryCount,
      stage: promptResult.stage.stage,
      started_at: now,
    };

    try {
      await generationQueue.add(
        "log-session",
        {
          userId: user.id,
          lessonId: `session-${Date.now()}`,
          type: "log-session" as const,
          targetLanguage,
          sessionLogData,
        },
        { attempts: 3, backoff: { type: "exponential", delay: 1000 } },
      );
    } catch (queueError) {
      // If queue fails, fall back to inline write so data isn't lost
      console.warn(
        "Failed to enqueue session log, writing inline:",
        queueError,
      );
      await supabase.from("lesson_sessions_v2").insert(sessionLogData);
    }

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
