import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/verify-auth";
import { generateText } from "@/lib/ai-client";

// ─── POST /api/reading/define ───────────────────────────────────────────────
// Look up a word definition using Gemini

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

  try {
    const prompt = `Define the ${language} word "${word}"${context ? ` as used in this sentence: "${context}"` : ""}.

Return a JSON object with these fields:
- "definition": a brief English translation/definition (max 10 words)
- "gender": the grammatical gender if applicable (e.g. "der", "die", "das" for German, "le", "la" for French), or null
- "part_of_speech": noun, verb, adjective, adverb, etc.

Return ONLY valid JSON, no markdown or explanation.`;

    const raw = await generateText({
      contents: prompt,
      systemInstruction:
        "You are a concise bilingual dictionary. Return only valid JSON.",
      temperature: 0.2,
      responseMimeType: "application/json",
      timeoutMs: 10000,
    });

    const parsed = JSON.parse(raw);
    return NextResponse.json(parsed);
  } catch (err) {
    console.error("Definition lookup error:", err);
    return NextResponse.json(
      { error: "Failed to look up definition" },
      { status: 500 },
    );
  }
}
