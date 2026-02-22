/**
 * POST /api/ml/session/plan
 *
 * Proxy to the Python Complexity Level Predictor service.
 * Authenticates the user and forwards the request.
 *
 * Response:
 * {
 *   complexityLevel: number,        // 1-5
 *   recommendedWordCount: number,
 *   recommendedDurationMinutes: number,
 *   confidence: number,             // 0-1
 *   usingModel: boolean,
 *   planId: string | null
 * }
 */

import { verifyAuth } from "@/lib/auth/verify-auth";
import { getSessionPlan } from "@/lib/ml-services/complexity-predictor-client";
import { NextRequest, NextResponse } from "next/server";

export async function POST(_request: NextRequest) {
  try {
    // ── Auth ─────────────────────────────────────────────────────────────
    const auth = await verifyAuth();
    if (auth instanceof NextResponse) return auth;

    // ── Forward to ML service ────────────────────────────────────────────
    const result = await getSessionPlan({ userId: auth.user.id });

    if (!result) {
      // ML service unavailable — return safe defaults
      return NextResponse.json(
        {
          complexityLevel: 1,
          recommendedWordCount: 40,
          recommendedDurationMinutes: 8,
          confidence: 0,
          usingModel: false,
          planId: null,
          _fallback: true,
        },
        { status: 200 },
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[api/ml/session/plan] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
