/**
 * POST /api/ml/router/observe-reward
 *
 * Proxy to the Python RL Module Router service.
 * Computes and persists the reward for a previous routing decision.
 *
 * Request body:
 * {
 *   decisionId: string
 * }
 *
 * Response:
 * {
 *   reward: number,
 *   components: Record<string, number>,
 *   observationId: string | null
 * }
 */

import { verifyAuth } from "@/lib/auth/verify-auth";
import { observeReward } from "@/lib/ml-services/rl-router-client";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // ── Auth ─────────────────────────────────────────────────────────────
    const auth = await verifyAuth();
    if (auth instanceof NextResponse) return auth;

    // ── Parse body ───────────────────────────────────────────────────────
    const body = await request.json();
    const { decisionId } = body;

    if (!decisionId) {
      return NextResponse.json(
        { error: "Missing required field: decisionId" },
        { status: 400 },
      );
    }

    // ── Forward to ML service ────────────────────────────────────────────
    const result = await observeReward({
      decisionId,
      userId: auth.user.id,
    });

    // ── Graceful fallback ────────────────────────────────────────────────
    if (!result) {
      return NextResponse.json(
        {
          reward: 0,
          components: {},
          observationId: null,
          _fallback: true,
        },
        { status: 200 },
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[ml/router/observe-reward] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
