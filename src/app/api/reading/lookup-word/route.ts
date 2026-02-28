import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/verify-auth";
import { generateText } from "@/lib/ai-client";

// ─── Language display names ─────────────────────────────────────────────────

const LANGUAGE_NAMES: Record<string, string> = {
  fr: "French",
  de: "German",
  it: "Italian",
  es: "Spanish",
};

// ─── POST /api/reading/lookup-word ──────────────────────────────────────────
// Rich word lookup returning definition, part of speech, phonetic, example,
// base form, and gender using Gemini.

export async function POST(request: NextRequest) {
  const auth = await verifyAuth();
  if (auth instanceof NextResponse) return auth;

  let body: { word?: string; language?: string; context?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { word, language, context } = body;
  if (!word || !language) {
    return NextResponse.json(
      { error: "word and language are required" },
      { status: 400 },
    );
  }

  const langName = LANGUAGE_NAMES[language] || language;

  try {
    const prompt = `Look up the ${langName} word "${word}"${context ? ` as used in: "${context}"` : ""}.

Return a JSON object with these fields:
- "definition": a brief English definition (max 15 words)
- "partOfSpeech": the grammatical category (noun, verb, adjective, adverb, preposition, conjunction, pronoun, etc.)
- "phonetic": IPA pronunciation if you know it, or null
- "exampleSentence": a short natural example sentence in ${langName} using this word
- "baseForm": the dictionary/lemma form if the word is conjugated or inflected, or null if already in base form
- "gender": grammatical gender article if applicable (e.g. "le/la" for French, "der/die/das" for German), or null

Return ONLY valid JSON, no markdown or explanation.`;

    const raw = await generateText({
      contents: prompt,
      systemInstruction:
        "You are a precise bilingual dictionary. Return only valid JSON.",
      temperature: 0.2,
      responseMimeType: "application/json",
      timeoutMs: 10000,
    });

    const parsed = JSON.parse(raw);
    return NextResponse.json(parsed);
  } catch (err) {
    console.error("Word lookup error:", err);
    return NextResponse.json(
      { error: "Failed to look up word" },
      { status: 500 },
    );
  }
}
