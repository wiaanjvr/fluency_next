import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

/**
 * POST /api/transcribe/match - Transcribe audio and check if it matches an expected word
 *
 * This endpoint is specifically for pronunciation validation in foundation vocabulary learning.
 * It uses OpenAI Whisper to transcribe the audio, then checks if the transcription matches
 * the expected word (with some fuzzy matching for minor variations).
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

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 },
      );
    }

    const formData = await request.formData();
    const audioFile = formData.get("audio") as Blob | null;
    const language = (formData.get("language") as string) || "fr";
    const expectedWord = formData.get("expectedWord") as string | null;

    if (!audioFile) {
      return NextResponse.json(
        { error: "Audio file is required" },
        { status: 400 },
      );
    }

    if (!expectedWord) {
      return NextResponse.json(
        { error: "Expected word is required" },
        { status: 400 },
      );
    }

    const openai = new OpenAI({ apiKey });

    // Convert blob to File object for OpenAI SDK
    const file = new File([audioFile], "recording.webm", {
      type: audioFile.type || "audio/webm",
    });

    // Transcribe the audio
    const transcription = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
      language,
      response_format: "text",
    });

    const transcribedText = transcription.trim();

    // Check if the transcription matches the expected word
    const matches = checkWordMatch(transcribedText, expectedWord, language);

    return NextResponse.json({
      transcribed: transcribedText,
      expected: expectedWord,
      matches,
      language,
    });
  } catch (error) {
    console.error("Transcription matching error:", error);
    return NextResponse.json(
      { error: "Failed to process audio" },
      { status: 500 },
    );
  }
}

/**
 * Check if the transcribed text matches the expected word
 *
 * This function does fuzzy matching to account for:
 * - Case differences
 * - Minor punctuation
 * - Articles (le, la, les, un, une, des, etc.)
 * - Extra whitespace
 */
function checkWordMatch(
  transcribed: string,
  expected: string,
  language: string,
): boolean {
  // Normalize both strings
  const normalizeText = (text: string): string => {
    return (
      text
        .toLowerCase()
        .trim()
        // Remove punctuation
        .replace(/[.,!?;:'"]/g, "")
        // Normalize whitespace
        .replace(/\s+/g, " ")
    );
  };

  const normalizedTranscribed = normalizeText(transcribed);
  const normalizedExpected = normalizeText(expected);

  // Direct match
  if (normalizedTranscribed === normalizedExpected) {
    return true;
  }

  // Language-specific article removal for checking
  let articles: string[] = [];

  switch (language) {
    case "fr":
      articles = ["le", "la", "les", "l", "un", "une", "des", "du", "de", "d"];
      break;
    case "de":
      articles = [
        "der",
        "die",
        "das",
        "den",
        "dem",
        "des",
        "ein",
        "eine",
        "einen",
        "einem",
        "eines",
      ];
      break;
    case "it":
      articles = ["il", "lo", "la", "i", "gli", "le", "un", "uno", "una", "l"];
      break;
    case "es":
      articles = ["el", "la", "los", "las", "un", "una", "unos", "unas"];
      break;
    default:
      articles = [];
  }

  // Remove articles and check again
  const removeArticles = (text: string, articleList: string[]): string => {
    const words = text.split(" ");
    const filtered = words.filter((word) => !articleList.includes(word));
    return filtered.join(" ");
  };

  const transcribedWithoutArticles = removeArticles(
    normalizedTranscribed,
    articles,
  );
  const expectedWithoutArticles = removeArticles(normalizedExpected, articles);

  if (transcribedWithoutArticles === expectedWithoutArticles) {
    return true;
  }

  // Check if the expected word is contained in the transcription  // (e.g., user said "le chat" when expected was "chat")
  if (normalizedTranscribed.includes(normalizedExpected)) {
    return true;
  }

  // Calculate simple similarity for very close matches
  // (e.g., "chat" vs "chats", "maison" vs "maizon")
  const similarity = calculateSimilarity(
    transcribedWithoutArticles,
    expectedWithoutArticles,
  );

  // Accept if similarity is very high (> 85%)
  return similarity > 0.85;
}

/**
 * Calculate similarity between two strings using Levenshtein distance
 */
function calculateSimilarity(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;

  if (len1 === 0) return len2 === 0 ? 1 : 0;
  if (len2 === 0) return 0;

  // Create a matrix
  const matrix: number[][] = [];

  // Initialize the first row and column
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost, // substitution
      );
    }
  }

  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);

  return 1 - distance / maxLen;
}
