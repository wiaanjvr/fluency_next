import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { Exercise } from "@/types/lesson";
import { claimSession } from "@/lib/usage-limits";
import { generateJSONStream, getAI } from "@/lib/ai-client";
import { consumeDailyBudget } from "@/lib/daily-budget";

/**
 * POST /api/lesson/exercises - Generate exercises for a lesson using Gemini
 */
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

    // Atomic claim: prevents free users from bypassing daily limits.
    const usageStatus = await claimSession(user.id, "main");
    if (!usageStatus.allowed) {
      return NextResponse.json(
        {
          error: "Daily limit reached",
          message:
            "You've reached your daily exercise limit. Upgrade to Premium for unlimited access.",
          limitReached: true,
          limit: usageStatus.limit,
          currentCount: usageStatus.currentCount,
        },
        { status: 429 },
      );
    }

    // Absolute daily generation budget (applies to ALL tiers, including premium)
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

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Google API key not configured" },
        { status: 500 },
      );
    }

    const {
      lessonId,
      targetText,
      translation,
      level,
      count = 6,
    } = await request.json();

    if (!targetText) {
      return NextResponse.json(
        { error: "Target text is required" },
        { status: 400 },
      );
    }

    const prompt = `Generate ${count} multiple-choice exercises for a ${level || "A1"} French learner based on this text:

French text: "${targetText}"
English translation: "${translation || "Not provided"}"

Generate questions that test:
1. Reading comprehension (2-3 questions about the content/meaning)
2. Vocabulary (2-3 questions about word meanings)
3. Grammar (1-2 questions about verb forms, articles, etc.)

Return a JSON array with exactly ${count} exercises. Each exercise must have:
- id: unique string (use format "ex-{number}")
- type: "multiple-choice"
- question: the question in English
- options: array of exactly 4 answer choices (mix French and English as appropriate)
- correctAnswer: index (0-3) of the correct answer
- explanation: brief explanation of why this answer is correct
- focusArea: "comprehension" | "vocabulary" | "grammar"
- difficulty: "easy" | "medium" | "hard"

IMPORTANT: Return ONLY valid JSON array, no markdown formatting or extra text.`;

    // Use streaming to avoid 504 timeouts on exercise generation
    let exercises: Exercise[];
    try {
      exercises = await generateJSONStream<Exercise[]>({
        contents: prompt,
        systemInstruction:
          "You are a French language teacher creating exercises. Return only valid JSON arrays.",
        maxOutputTokens: 2000,
        temperature: 0.7,
      });
    } catch (parseError) {
      console.error("Failed to parse exercises:", parseError);
      return NextResponse.json(
        { error: "Failed to parse exercise response" },
        { status: 500 },
      );
    }

    // Validate and add lessonId to each exercise
    exercises = exercises.map((ex, index) => ({
      ...ex,
      id: ex.id || `ex-${lessonId}-${index}`,
      lessonId: lessonId || "temp",
    }));

    return NextResponse.json({ exercises });
  } catch (error) {
    console.error("Error generating exercises:", error);
    return NextResponse.json(
      { error: "Failed to generate exercises" },
      { status: 500 },
    );
  }
}
