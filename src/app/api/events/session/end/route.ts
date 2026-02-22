/**
 * POST /api/events/session/end
 *
 * End an active session. Computes the session summary from all logged
 * interaction events, updates the session_summaries row, and refreshes
 * the user's response-time baseline.
 *
 * Request body: { session_id: string, completed: boolean }
 *
 * Returns: { summary: SessionSummaryRow }
 */

import { verifyAuth } from "@/lib/auth/verify-auth";
import { endSession } from "@/lib/ml-events";
import { endCognitiveLoadSession } from "@/lib/ml-services/cognitive-load-client";
import { NextRequest, NextResponse } from "next/server";
import type { EndSessionRequest } from "@/types/ml-events";

export async function POST(request: NextRequest) {
  try {
    // ── Auth ────────────────────────────────────────────────────────────
    const auth = await verifyAuth();
    if (auth instanceof NextResponse) return auth;
    const { user, supabase } = auth;

    // ── Validate body ───────────────────────────────────────────────────
    const body: unknown = await request.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    const { session_id, completed } = body as EndSessionRequest;

    if (!session_id || typeof session_id !== "string") {
      return NextResponse.json(
        { error: "session_id is required" },
        { status: 400 },
      );
    }

    if (typeof completed !== "boolean") {
      return NextResponse.json(
        { error: "completed must be a boolean" },
        { status: 400 },
      );
    }

    // ── End session ─────────────────────────────────────────────────────
    const summary = await endSession(supabase, user.id, session_id, completed);

    if (!summary) {
      return NextResponse.json(
        { error: "Failed to end session" },
        { status: 500 },
      );
    }

    // ── Finalise cognitive load tracking (fire-and-forget) ──────────────
    endCognitiveLoadSession({ sessionId: session_id }).catch((err) =>
      console.warn("[cognitive-load] Failed to end session:", err),
    );

    return NextResponse.json({ summary });
  } catch (err) {
    console.error("[POST /api/events/session/end]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
