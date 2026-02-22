/**
 * POST /api/ml/feedback/grammar-examples
 *
 * Proxy to the Python LLM Feedback Generator service.
 * Authenticates the user and forwards the request.
 *
 * Body: { grammarConceptTag: string, knownWordIds?: string[] }
 *
 * Response:
 * {
 *   sentences: string[],
 *   grammarConcept: string,
 *   llmProvider: string,
 *   llmModel: string,
 *   latencyMs: number
 * }
 */

import { verifyAuth } from "@/lib/auth/verify-auth";
import { getGrammarExamples } from "@/lib/ml-services/feedback-generator-client";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // ── Auth ─────────────────────────────────────────────────────────────
    const auth = await verifyAuth();
    if (auth instanceof NextResponse) return auth;

    // ── Parse body ───────────────────────────────────────────────────────
    const body = await request.json();
    const { grammarConceptTag, knownWordIds } = body;

    if (!grammarConceptTag) {
      return NextResponse.json(
        { error: "grammarConceptTag is required" },
        { status: 400 },
      );
    }

    // ── Forward to ML service ────────────────────────────────────────────
    const result = await getGrammarExamples({
      userId: auth.user.id,
      grammarConceptTag,
      knownWordIds: knownWordIds || [],
    });

    if (!result) {
      // ML service unavailable — return empty response
      return NextResponse.json(
        {
          sentences: [],
          grammarConcept: grammarConceptTag,
          llmProvider: "",
          llmModel: "",
          latencyMs: 0,
          _fallback: true,
        },
        { status: 200 },
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[api/ml/feedback/grammar-examples] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
