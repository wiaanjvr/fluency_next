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

// ─── POST /api/reading/translate-sentence ───────────────────────────────────
// Translate a single sentence to English using Gemini flash

export async function POST(request: NextRequest) {
  const auth = await verifyAuth();
  if (auth instanceof NextResponse) return auth;

  let body: { text?: string; targetLanguage?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { text, targetLanguage } = body;
  if (!text || !targetLanguage) {
    return NextResponse.json(
      { error: "text and targetLanguage are required" },
      { status: 400 },
    );
  }

  const langName = LANGUAGE_NAMES[targetLanguage] || targetLanguage;

  try {
    const translation = await generateText({
      contents: `Translate this ${langName} sentence to English naturally and concisely: "${text}"`,
      systemInstruction:
        "You are a professional translator. Return ONLY the English translation, nothing else. No quotes, no explanation.",
      temperature: 0.2,
      timeoutMs: 10000,
    });

    return NextResponse.json({ translation: translation.trim() });
  } catch (err) {
    console.error("Translation error:", err);
    return NextResponse.json(
      { error: "Failed to translate sentence" },
      { status: 500 },
    );
  }
}
