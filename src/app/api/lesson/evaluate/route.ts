import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import {
  ComprehensionEvaluation,
  EvaluationRequest,
  EvaluationResponse,
  Lesson,
  LessonWord,
} from "@/types/lesson";
import {
  evaluateComprehension,
  generateConversationResponse,
} from "@/lib/lesson/comprehension-evaluator";
import { generateText } from "@/lib/ai-client";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";

/** Max audio upload size: 1 MB */
const MAX_AUDIO_BYTES = 1_048_576;

/**
 * Transcribe audio using Gemini's native audio understanding
 */
async function transcribeAudio(
  audioBlob: Blob,
  language: string = "fr",
): Promise<string> {
  const audioBuffer = await audioBlob.arrayBuffer();
  const base64Audio = Buffer.from(audioBuffer).toString("base64");
  const mimeType = audioBlob.type || "audio/webm";

  return generateText({
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64Audio,
            },
          },
          {
            text: `Transcribe this audio recording. The speaker is speaking ${language === "fr" ? "French" : language}. Return ONLY the transcribed text, nothing else, no explanations.`,
          },
        ],
      },
    ],
    maxOutputTokens: 500,
  });
}

/**
 * Create a minimal Lesson object for evaluation
 */
function createLessonForEvaluation(
  targetText: string,
  lessonData?: Record<string, unknown>,
): Lesson {
  // Parse words from text or use stored words
  const wordsData = lessonData?.words;
  const words: LessonWord[] = Array.isArray(wordsData)
    ? (wordsData as LessonWord[])
    : targetText.split(/\s+/).map((word, i) => ({
        word,
        lemma: word.toLowerCase(),
        isNew: false,
        isDueForReview: false,
        position: i,
      }));

  return {
    id: (lessonData?.id as string) || "temp",
    userId: (lessonData?.user_id as string) || "temp",
    targetText,
    translation: (lessonData?.translation as string) || "",
    audioUrl: lessonData?.audio_url as string,
    language: (lessonData?.language as string) || "fr",
    level: ((lessonData?.level as string) || "A1") as
      | "A0"
      | "A1"
      | "A2"
      | "B1"
      | "B2"
      | "C1"
      | "C2",
    title: (lessonData?.title as string) || "Lesson",
    words,
    totalWords: words.length,
    newWordCount: words.filter((w) => w.isNew).length,
    reviewWordCount: words.filter((w) => w.isDueForReview).length,
    knownWordCount: words.filter((w) => !w.isNew && !w.isDueForReview).length,
    comprehensionPercentage: 0,
    currentPhase: "audio-comprehension",
    listenCount: 0,
    completed: false,
    createdAt: new Date().toISOString(),
    generationParams: {
      targetWordCount: 100,
      newWordPercentage: 5,
      reviewWordPriority: true,
    },
  };
}

/**
 * POST /api/lesson/evaluate - Evaluate user comprehension
 *
 * Handles both initial comprehension checks and conversation follow-ups
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

    // ── Rate-limit: 50 requests / hour per user ─────────────────────────
    const rl = await checkRateLimit(user.id, "evaluate");
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429, headers: rateLimitHeaders(rl) },
      );
    }

    // Handle multipart form data (audio) or JSON
    const contentType = request.headers.get("content-type") || "";
    let body: EvaluationRequest;
    let transcription: string | undefined;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const audioFile = formData.get("audio") as Blob | null;
      const jsonData = formData.get("data") as string;

      body = JSON.parse(jsonData);

      // Transcribe audio if provided
      if (audioFile && audioFile.size <= MAX_AUDIO_BYTES) {
        try {
          transcription = await transcribeAudio(
            audioFile,
            body.language || "fr",
          );
        } catch (transcribeError) {
          console.error("Transcription error:", transcribeError);
          // Fall back to provided text or empty
          transcription = body.userResponse;
        }
      } else if (audioFile && audioFile.size > MAX_AUDIO_BYTES) {
        // Audio too large — skip transcription, use provided text
        console.warn(
          `Audio file too large (${audioFile.size} bytes), skipping transcription`,
        );
        transcription = body.userResponse;
      } else {
        transcription = body.userResponse;
      }
    } else {
      body = await request.json();
      transcription = body.userResponse;
    }

    const { lessonId, phase, targetText, vocabularyRatings, exerciseResults } =
      body;

    // Get lesson from database if exists
    const { data: lessonData } = await supabase
      .from("lessons")
      .select("*")
      .eq("id", lessonId)
      .eq("user_id", user.id)
      .single();

    // Create lesson object for evaluation
    const lesson = createLessonForEvaluation(
      targetText || lessonData?.target_text || "",
      lessonData as Record<string, unknown> | undefined,
    );

    // Determine what kind of evaluation to do based on phase
    let evaluation: ComprehensionEvaluation;
    let conversationTurn: EvaluationResponse["conversationTurn"];

    switch (phase) {
      case "verbal-check":
        // Initial comprehension evaluation
        evaluation = evaluateComprehension(
          transcription || "",
          lesson,
          "verbal-check",
        );
        break;

      case "conversation-feedback":
        // Generate conversation response
        const convResponse = generateConversationResponse(
          transcription || "",
          lesson,
        );

        conversationTurn = {
          message: convResponse.message,
          vocabularyHint: convResponse.vocabularyHint || undefined,
          questionType: convResponse.questionType,
        };

        // Create basic evaluation for conversation phase
        evaluation = {
          comprehensionScore: 50,
          detailScore: 50,
          languageUseScore: 0,
          understoodConcepts: [],
          missedConcepts: [],
          vocabularyUsed: [],
          suggestedVocabulary: [],
          followUpQuestions: [],
          vocabularyHints: convResponse.vocabularyHint
            ? [convResponse.vocabularyHint]
            : [],
          feedbackMessage: convResponse.message,
          encouragement: "",
        };
        break;

      case "final-assessment":
        // Final comprehension evaluation
        evaluation = evaluateComprehension(
          transcription || "",
          lesson,
          "final-assessment",
        );

        // Mark lesson as completed
        if (lessonData) {
          await supabase
            .from("lessons")
            .update({
              completed: true,
              completed_at: new Date().toISOString(),
              final_comprehension_score: evaluation.comprehensionScore,
            })
            .eq("id", lessonId);
        }
        break;

      default:
        evaluation = {
          comprehensionScore: 0,
          detailScore: 0,
          languageUseScore: 0,
          understoodConcepts: [],
          missedConcepts: [],
          vocabularyUsed: [],
          suggestedVocabulary: [],
          followUpQuestions: [],
          vocabularyHints: [],
          feedbackMessage: "Unable to evaluate this phase.",
          encouragement: "",
        };
    }

    // Update vocabulary ratings if provided (from text-reveal phase)
    if (vocabularyRatings && vocabularyRatings.length > 0) {
      const upsertRows = vocabularyRatings.map((rating: any) => ({
        user_id: user.id,
        word: rating.word.toLowerCase(),
        language: body.language || "fr",
        rating: rating.rating,
        last_rated_at: new Date().toISOString(),
        // Update SRS fields based on rating
        ...(rating.rating >= 4
          ? {
              next_review: new Date(
                Date.now() + rating.rating * 24 * 60 * 60 * 1000,
              ).toISOString(),
              interval: rating.rating,
              ease_factor: Math.max(1.3, 2.5 + (rating.rating - 3) * 0.1),
            }
          : {
              next_review: new Date().toISOString(),
              interval: 0,
              ease_factor: Math.max(1.3, 2.5 - (3 - rating.rating) * 0.2),
            }),
      }));

      const { error: upsertError } = await supabase
        .from("user_words")
        .upsert(upsertRows, { onConflict: "user_id,word,language" });

      if (upsertError) {
        console.error("Error batch-upserting vocabulary ratings:", upsertError);
      }
    }

    // Store exercise results if provided
    if (exerciseResults && exerciseResults.length > 0 && lessonId) {
      await supabase
        .from("lessons")
        .update({
          exercise_results: exerciseResults,
        })
        .eq("id", lessonId);
    }

    // Update lesson phase
    if (lessonData && phase) {
      await supabase
        .from("lessons")
        .update({ current_phase: phase })
        .eq("id", lessonId);
    }

    const response: EvaluationResponse = {
      transcription: transcription || "",
      evaluation,
      conversationTurn,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in POST /api/lesson/evaluate:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
