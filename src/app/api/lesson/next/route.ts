/**
 * GET /api/lesson/next
 *
 * Returns the next lesson content for the user. Follows a two-layer approach:
 *
 * Layer 1 (primary): Fetch pre-generated content from the pre_generated_content
 *   table. Mark it as "used" and return immediately.
 *
 * Layer 2 (fallback): If no pre-generated content exists, fall back to live
 *   Gemini generation. Returns the content with a `fallback: true` flag so
 *   the frontend can display a loading state for future requests.
 *
 * Query params:
 *   ?type=story|word (default: "story")
 *
 * Response:
 *   { content: object, fallback: boolean, preGeneratedId?: string }
 */

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { LearnerWord, GeneratedStory, StoryTone } from "@/types/lesson-v2";
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

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const type =
      (request.nextUrl.searchParams.get("type") as "story" | "word") || "story";

    // ── Layer 1: Try pre-generated content ──────────────────────────────────

    const { data: preGenerated, error: fetchError } = await supabase
      .from("pre_generated_content")
      .select("*")
      .eq("user_id", user.id)
      .eq("type", type)
      .eq("status", "ready")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!fetchError && preGenerated) {
      // Mark as used
      await supabase
        .from("pre_generated_content")
        .update({ status: "used" })
        .eq("id", preGenerated.id);

      return NextResponse.json({
        content: preGenerated.content,
        fallback: false,
        preGeneratedId: preGenerated.id,
        lessonId: preGenerated.lesson_id,
      });
    }

    // ── Layer 2: Fallback to live generation ────────────────────────────────
    console.log(
      `[lesson/next] No pre-generated ${type} content for user ${user.id}, falling back to live generation`,
    );

    // Claim a session before doing expensive live generation.
    // Pre-generated content (layer 1) doesn't cost a session — the worker
    // already claimed when it generated the content.
    const sessionType =
      type === "story" ? ("microstory" as const) : ("microstory" as const);
    const usageStatus = await claimSession(user.id, sessionType);
    if (!usageStatus.allowed) {
      return NextResponse.json(
        {
          error: "Daily limit reached",
          message:
            "You've reached your daily limit. Upgrade to Premium for unlimited access.",
          limitReached: true,
          limit: usageStatus.limit,
          currentCount: usageStatus.currentCount,
        },
        { status: 429 },
      );
    }

    if (type === "story") {
      const content = await generateStoryLive(supabase, user.id);
      return NextResponse.json({ content, fallback: true });
    }

    if (type === "word") {
      const content = await generateWordLive(supabase, user.id);
      return NextResponse.json({ content, fallback: true });
    }

    return NextResponse.json(
      { error: `Unknown content type: ${type}` },
      { status: 400 },
    );
  } catch (error) {
    console.error("Error in GET /api/lesson/next:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ─── Live story generation (same as generate-story/route.ts) ─────────────────

async function generateStoryLive(
  supabase: any,
  userId: string,
): Promise<object> {
  // Validate API key early
  getAI();

  // Get profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("target_language, native_language, interests")
    .eq("id", userId)
    .single();

  if (!profile) throw new Error("Profile not found");

  const targetLanguage = profile.target_language || "fr";
  const interests = (profile.interests || []).slice(0, 3) as [
    string,
    string,
    string,
  ];

  if (interests.length < 3) {
    throw new Error("Learner must have 3 interests configured");
  }

  // Get learner words (Redis-cached)
  const knownWords = await getLearnerWords(supabase, userId);

  if (knownWords.length === 0) {
    throw new Error("No words introduced yet");
  }

  const masteryCount = computeMasteryCount(knownWords);

  // Build prompt using existing helpers
  const promptResult = buildStoryPrompt({
    targetLanguage,
    interests,
    knownWords,
    masteryCount,
  });

  // Generate story via Gemini with retry (streaming to avoid 504 timeouts)
  let story: GeneratedStory;
  let retries = 0;
  const maxRetries = 2;

  while (true) {
    story = await generateJSONStream<GeneratedStory>({
      contents: promptResult.userPrompt,
      systemInstruction: promptResult.systemPrompt,
      temperature: 0.8,
    });

    const knownLemmas = new Set(knownWords.map((w) => w.lemma.toLowerCase()));
    const violations = validateGeneratedStory(story, knownLemmas);

    if (violations.length === 0) break;
    retries++;
    if (retries > maxRetries) {
      console.warn(
        "[lesson/next] Story validation failed after retries:",
        violations,
      );
      break;
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
  });

  return {
    story,
    exercise,
    tone: promptResult.selectedTone,
    stage: promptResult.stage,
    interestTheme: promptResult.selectedTheme,
    interestIndex: promptResult.selectedThemeIndex,
    masteryCount,
  };
}

// ─── Live word generation ────────────────────────────────────────────────────

async function generateWordLive(
  supabase: any,
  userId: string,
): Promise<object> {
  // Validate API key early
  getAI();

  const { data: profile } = await supabase
    .from("profiles")
    .select("target_language")
    .eq("id", userId)
    .single();

  const lang = profile?.target_language || "fr";
  const LANG_NAMES: Record<string, string> = {
    fr: "French",
    de: "German",
    it: "Italian",
    es: "Spanish",
    pt: "Portuguese",
  };
  const langName = LANG_NAMES[lang] || lang;

  const { data: existingWords } = await supabase
    .from("learner_words_v2")
    .select("lemma")
    .eq("user_id", userId);

  const knownLemmas = (existingWords || []).map((w: any) => w.lemma).join(", ");

  const systemPrompt = `You are a language teaching assistant. Suggest the next 5 most useful ${langName} words to learn. Output JSON: { "words": [{ "word": "...", "lemma": "...", "translation": "...", "partOfSpeech": "noun|verb|adjective|adverb|other", "frequencyRank": 123, "exampleSentence": "...", "exampleTranslation": "..." }] }`;

  const userPrompt = `The learner already knows these ${langName} words: ${knownLemmas || "(none)"}. Suggest the next 5 most useful ${langName} words to learn. They should be high-frequency, practical words NOT in the known list.`;

  return generateJSONStream({
    contents: userPrompt,
    systemInstruction: systemPrompt,
    temperature: 0.5,
  });
}
