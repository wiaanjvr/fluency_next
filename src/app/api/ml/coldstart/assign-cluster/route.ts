/**
 * POST /api/ml/coldstart/assign-cluster
 *
 * Proxy to the Python Cold Start Collaborative Filtering service.
 * Authenticates the user and forwards the request.
 *
 * Response:
 * {
 *   clusterId: number,
 *   recommendedPath: string[],
 *   defaultComplexityLevel: number,
 *   estimatedVocabStart: string,
 *   confidence: number,
 *   recommendedModuleWeights: Record<string, number>,
 *   assignmentId: string | null,
 *   usingModel: boolean
 * }
 */

import { verifyAuth } from "@/lib/auth/verify-auth";
import { assignCluster } from "@/lib/ml-services/cold-start-client";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // ── Auth ─────────────────────────────────────────────────────────────
    const auth = await verifyAuth();
    if (auth instanceof NextResponse) return auth;

    // ── Parse body ───────────────────────────────────────────────────────
    const body = await request.json();
    const { nativeLanguage, targetLanguage, cefrLevel, goals } = body;

    if (!nativeLanguage || !targetLanguage || !cefrLevel || !goals) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: nativeLanguage, targetLanguage, cefrLevel, goals",
        },
        { status: 400 },
      );
    }

    // ── Forward to ML service ────────────────────────────────────────────
    const result = await assignCluster({
      nativeLanguage,
      targetLanguage,
      cefrLevel,
      goals,
      userId: auth.user.id,
    });

    if (!result) {
      // ML service unavailable — return heuristic defaults
      return NextResponse.json(
        {
          clusterId: -1,
          recommendedPath: ["flashcard", "story", "conversation", "listening"],
          defaultComplexityLevel: 1,
          estimatedVocabStart: "top_500",
          confidence: 0,
          recommendedModuleWeights: {},
          assignmentId: null,
          usingModel: false,
          _fallback: true,
        },
        { status: 200 },
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[api/ml/coldstart/assign-cluster] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
