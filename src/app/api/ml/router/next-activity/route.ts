/**
 * POST /api/ml/router/next-activity
 *
 * Proxy to the Python RL Module Router service.
 * Authenticates the user and forwards the request.
 *
 * Request body:
 * {
 *   lastCompletedModule?: string,
 *   availableMinutes?: number
 * }
 *
 * Response:
 * {
 *   recommendedModule: string,
 *   targetWords: string[],
 *   targetConcept: string | null,
 *   reason: string,
 *   confidence: number,
 *   algorithm: string,
 *   decisionId: string | null
 * }
 */

import { verifyAuth } from "@/lib/auth/verify-auth";
import { getNextActivity } from "@/lib/ml-services/rl-router-client";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // ── Auth ─────────────────────────────────────────────────────────────
    const auth = await verifyAuth();
    if (auth instanceof NextResponse) return auth;

    // ── Parse body ───────────────────────────────────────────────────────
    const body = await request.json();
    const { lastCompletedModule, availableMinutes } = body;

    // ── Forward to ML service ────────────────────────────────────────────
    const result = await getNextActivity({
      userId: auth.user.id,
      lastCompletedModule: lastCompletedModule || null,
      availableMinutes:
        typeof availableMinutes === "number" ? availableMinutes : null,
    });

    // ── Graceful fallback if ML service is unreachable ───────────────────
    if (!result) {
      return NextResponse.json(
        {
          recommendedModule: "story_engine",
          targetWords: [],
          targetConcept: null,
          reason: "ML router unavailable — defaulting to story engine.",
          confidence: 0.0,
          algorithm: "fallback",
          decisionId: null,
          _fallback: true,
        },
        { status: 200 },
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[ml/router/next-activity] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
