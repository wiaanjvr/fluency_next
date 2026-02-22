/**
 * POST /api/ml/story/select-words
 *
 * Proxy to the Python Story Word Selector service.
 * Authenticates the user and forwards the request.
 *
 * Request body:
 * {
 *   targetWordCount: number,
 *   storyComplexityLevel?: number,
 *   language?: string
 * }
 *
 * Response:
 * {
 *   dueWords: string[],
 *   knownFillWords: string[],
 *   thematicBias: string[],
 *   debug?: { ... }
 * }
 */

import { verifyAuth } from "@/lib/auth/verify-auth";
import { selectStoryWordsML } from "@/lib/ml-services/story-selector-client";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // ── Auth ─────────────────────────────────────────────────────────────
    const auth = await verifyAuth();
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const {
      targetWordCount = 60,
      storyComplexityLevel = 1,
      language = "fr",
    } = body as {
      targetWordCount?: number;
      storyComplexityLevel?: number;
      language?: string;
    };

    if (targetWordCount < 5 || targetWordCount > 500) {
      return NextResponse.json(
        { error: "targetWordCount must be between 5 and 500" },
        { status: 400 },
      );
    }

    // ── Forward to ML service ────────────────────────────────────────────
    const result = await selectStoryWordsML({
      userId: auth.user.id,
      targetWordCount,
      storyComplexityLevel,
      language,
    });

    if (!result) {
      // ML service unavailable — return a signal to use the TS fallback
      return NextResponse.json(
        {
          dueWords: [],
          knownFillWords: [],
          thematicBias: [],
          fallback: true,
          message:
            "Story selector ML service unavailable — use client-side fallback",
        },
        { status: 200 },
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[api/ml/story/select-words] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
