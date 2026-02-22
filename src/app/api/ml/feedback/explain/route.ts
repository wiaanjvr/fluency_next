/**
 * POST /api/ml/feedback/explain
 *
 * Proxy to the Python LLM Feedback Generator service.
 * Authenticates the user and forwards the request.
 *
 * Body: { wordId: string, sessionId: string, force?: boolean }
 *
 * Response:
 * {
 *   explanation: string,
 *   exampleSentence: string,
 *   patternDetected: string,
 *   patternDescription: string,
 *   patternConfidence: number,
 *   triggerReason: string,
 *   triggered: boolean,
 *   cached: boolean,
 *   llmProvider: string,
 *   llmModel: string,
 *   latencyMs: number
 * }
 */

import { verifyAuth } from "@/lib/auth/verify-auth";
import { getWordExplanation } from "@/lib/ml-services/feedback-generator-client";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // ── Auth ─────────────────────────────────────────────────────────────
    const auth = await verifyAuth();
    if (auth instanceof NextResponse) return auth;

    // ── Parse body ───────────────────────────────────────────────────────
    const body = await request.json();
    const { wordId, sessionId, force } = body;

    if (!wordId || !sessionId) {
      return NextResponse.json(
        { error: "wordId and sessionId are required" },
        { status: 400 },
      );
    }

    // ── Forward to ML service ────────────────────────────────────────────
    const result = await getWordExplanation({
      userId: auth.user.id,
      wordId,
      sessionId,
      force: force ?? false,
    });

    if (!result) {
      // ML service unavailable — return empty response
      return NextResponse.json(
        {
          explanation: "",
          exampleSentence: "",
          patternDetected: "none",
          patternDescription: "",
          patternConfidence: 0,
          triggerReason: "service_unavailable",
          triggered: false,
          cached: false,
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
    console.error("[api/ml/feedback/explain] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
