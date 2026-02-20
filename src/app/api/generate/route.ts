/**
 * POST /api/generate
 *
 * Orchestrates: fetch vocab → determine stage → build prompt → call Gemini →
 * store result → return to client.
 *
 * Request body: { language: string }
 *
 * Idempotent: if there are no due words, returns the last generated content
 * instead of calling Gemini again.
 */

import { verifyAuth } from "@/lib/auth/verify-auth";
import { generateContent } from "@/lib/generate";
import { NextRequest, NextResponse } from "next/server";

interface GenerateRequestBody {
  language: string;
}

export async function POST(request: NextRequest) {
  try {
    // ── Auth ────────────────────────────────────────────────────────────
    const auth = await verifyAuth();
    if (auth instanceof NextResponse) return auth;

    const { user, supabase } = auth;

    // ── Validate body ───────────────────────────────────────────────────
    const body: unknown = await request.json();

    if (
      !body ||
      typeof body !== "object" ||
      !("language" in body) ||
      typeof (body as GenerateRequestBody).language !== "string" ||
      (body as GenerateRequestBody).language.trim() === ""
    ) {
      return NextResponse.json(
        { error: "Missing or invalid 'language' field (e.g. 'de', 'fr')" },
        { status: 400 },
      );
    }

    const { language } = body as GenerateRequestBody;

    // ── Generate ────────────────────────────────────────────────────────
    const result = await generateContent(supabase, user.id, language.trim());

    if (result === null) {
      return NextResponse.json(
        {
          stage: "boot_camp",
          message:
            "You are in the boot-camp stage (<50 known words). " +
            "Keep reviewing flashcards — AI-generated content unlocks at 50 known words.",
        },
        { status: 200 },
      );
    }

    return NextResponse.json({
      id: result.generated.id,
      content: result.generated.content,
      stage: result.stage,
      known_word_count: result.knownWordCount,
      due_words_used: result.dueWordsUsed,
      is_existing: result.isExisting,
      created_at: result.generated.created_at,
    });
  } catch (error) {
    console.error("[POST /api/generate]", error);

    const message =
      error instanceof Error ? error.message : "Internal server error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
