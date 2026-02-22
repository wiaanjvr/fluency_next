/**
 * GET /api/ml/cognitive-load/session/[sessionId]
 *
 * Proxy to the Python Cognitive Load Estimator service.
 * Returns the current cognitive load snapshot for an active session.
 *
 * Response:
 * {
 *   currentLoad: number,       // 0.0 – 1.0
 *   trend: "increasing" | "stable" | "decreasing",
 *   recommendedAction: "continue" | "simplify" | "end-session",
 *   eventCount: number,
 *   consecutiveHighLoad: number,
 *   avgLoad: number,
 *   recentLoads: number[]
 * }
 */

import { verifyAuth } from "@/lib/auth/verify-auth";
import { getSessionCognitiveLoad } from "@/lib/ml-services/cognitive-load-client";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    // ── Auth ────────────────────────────────────────────────────────────
    const auth = await verifyAuth();
    if (auth instanceof NextResponse) return auth;

    const { sessionId } = await params;

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 },
      );
    }

    // ── Forward to ML service ───────────────────────────────────────────
    const snapshot = await getSessionCognitiveLoad(sessionId);

    if (!snapshot) {
      // ML service unavailable — return a safe default
      return NextResponse.json(
        {
          currentLoad: 0,
          trend: "stable",
          recommendedAction: "continue",
          eventCount: 0,
          consecutiveHighLoad: 0,
          avgLoad: 0,
          recentLoads: [],
          _fallback: true,
        },
        { status: 200 },
      );
    }

    return NextResponse.json(snapshot);
  } catch (err) {
    console.error("[GET /api/ml/cognitive-load/session]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
