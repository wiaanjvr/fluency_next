import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { generateText, generateJSON } from "@/lib/ai-client";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";

/** Max audio upload size: 1 MB */
const MAX_AUDIO_BYTES = 1_048_576;

interface TranscriptionFeedback {
  isValid: boolean;
  isSilence: boolean;
  isRelevant: boolean;
  englishWords: Array<{ english: string; translation: string }>;
  message?: string;
}

/**
 * POST /api/transcribe - Transcribe audio using Gemini
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

    // ── Rate-limit: 30 requests / hour per user ─────────────────────────
    const rl = await checkRateLimit(user.id, "transcribe");
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429, headers: rateLimitHeaders(rl) },
      );
    }

    const formData = await request.formData();
    const audioFile = formData.get("audio") as Blob | null;
    const language = (formData.get("language") as string) || "fr";
    const questionContext = formData.get("questionContext") as string | null;

    if (!audioFile) {
      return NextResponse.json(
        { error: "Audio file is required" },
        { status: 400 },
      );
    }

    // ── Enforce audio size cap ──────────────────────────────────────────
    if (audioFile.size > MAX_AUDIO_BYTES) {
      return NextResponse.json(
        { error: "Audio file too large. Maximum size is 1 MB." },
        { status: 413 },
      );
    }

    // Convert blob to base64 for Gemini audio input
    const audioBuffer = await audioFile.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString("base64");
    const mimeType = audioFile.type || "audio/webm";

    const transcriptText = await generateText({
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

    // Analyze the transcription for feedback
    const feedback = await analyzeTranscription(
      transcriptText,
      language,
      questionContext,
    );

    return NextResponse.json(
      { text: transcriptText, language, feedback },
      { headers: rateLimitHeaders(rl) },
    );
  } catch (error) {
    console.error("Transcription error:", error);
    return NextResponse.json(
      { error: "Failed to transcribe audio" },
      { status: 500 },
    );
  }
}

/**
 * Analyze transcription for silence, relevance, and English word usage
 */
async function analyzeTranscription(
  transcript: string,
  targetLanguage: string,
  questionContext: string | null,
): Promise<TranscriptionFeedback> {
  // Check for silence or very short responses
  if (!transcript || transcript.length < 5) {
    return {
      isValid: false,
      isSilence: true,
      isRelevant: false,
      englishWords: [],
      message:
        "No speech detected. Please try recording again and speak clearly.",
    };
  }

  // Use GPT to analyze the response
  const languageName =
    targetLanguage === "fr" ? "French" : "the target language";
  const prompt = `You are analyzing a language learner's spoken response. The student is learning ${languageName}.

Transcript: "${transcript}"
${questionContext ? `Question they were asked: "${questionContext}"` : ""}

Analyze this response and provide a JSON response with:
1. "isRelevant": true if the response attempts to answer the question or describe audio content, false if it's completely nonsensical or unrelated gibberish
2. "englishWords": array of up to 3 English words used in the response (if any). For each, provide {"english": "word", "translation": "${languageName} translation"}
3. "message": A brief encouraging message if needed

Rules:
- If the response is complete gibberish or random sounds, mark isRelevant as false
- Only detect clear English words, not ${languageName} words
- Limit to maximum 3 English words
- Be lenient - accept mixed language responses as relevant if they try to answer

Respond ONLY with valid JSON.`;

  try {
    const result = await generateJSON<{
      isRelevant?: boolean;
      englishWords?: Array<{ english: string; translation: string }>;
      message?: string;
    }>({
      contents: prompt,
      temperature: 0.3,
      maxOutputTokens: 400,
    });

    const feedback: TranscriptionFeedback = {
      isValid: result.isRelevant !== false,
      isSilence: false,
      isRelevant: result.isRelevant !== false,
      englishWords: (result.englishWords || []).slice(0, 3),
      message: result.message,
    };

    // Generate appropriate message
    if (!feedback.isRelevant) {
      feedback.message =
        "Your response doesn't seem to relate to the question. Please try again and describe what you heard in the audio.";
    } else if (feedback.englishWords.length > 0) {
      feedback.message = `Great effort! Here are some ${languageName} words to help you:`;
    }

    return feedback;
  } catch (error) {
    console.error("Analysis error:", error);
    // If analysis fails, assume response is valid
    return {
      isValid: true,
      isSilence: false,
      isRelevant: true,
      englishWords: [],
    };
  }
}
