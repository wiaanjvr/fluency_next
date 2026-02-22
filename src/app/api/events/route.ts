/**
 * POST /api/events
 *
 * Log a single interaction event for the current user's active session.
 *
 * Request body: {
 *   session_id: string,
 *   event: InteractionEventInput
 * }
 *
 * Returns the stored InteractionEventRow.
 */

import { verifyAuth } from "@/lib/auth/verify-auth";
import { logInteractionEvent } from "@/lib/ml-events";
import { recordCognitiveLoadEvent } from "@/lib/ml-services/cognitive-load-client";
import { NextRequest, NextResponse } from "next/server";
import type { LogEventRequest } from "@/types/ml-events";
import { MODULE_SOURCES } from "@/types/knowledge-graph";
import { INPUT_MODE_VALUES } from "@/types/ml-events";

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

    const { session_id, event } = body as LogEventRequest;

    if (!session_id || typeof session_id !== "string") {
      return NextResponse.json(
        { error: "session_id is required" },
        { status: 400 },
      );
    }

    if (!event || typeof event !== "object") {
      return NextResponse.json(
        { error: "event object is required" },
        { status: 400 },
      );
    }

    // Validate event fields
    if (!MODULE_SOURCES.includes(event.module_source as any)) {
      return NextResponse.json(
        {
          error: `Invalid module_source. Must be one of: ${MODULE_SOURCES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    if (typeof event.correct !== "boolean") {
      return NextResponse.json(
        { error: "event.correct must be a boolean" },
        { status: 400 },
      );
    }

    if (!INPUT_MODE_VALUES.includes(event.input_mode as any)) {
      return NextResponse.json(
        {
          error: `Invalid input_mode. Must be one of: ${INPUT_MODE_VALUES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // ── Log event ───────────────────────────────────────────────────────
    const result = await logInteractionEvent(
      supabase,
      user.id,
      session_id,
      event,
    );

    if (!result) {
      return NextResponse.json(
        { error: "Failed to log interaction event" },
        { status: 500 },
      );
    }

    // ── Forward to cognitive load tracker (fire-and-forget) ─────────────
    recordCognitiveLoadEvent({
      sessionId: session_id,
      wordId: event.word_id ?? undefined,
      responseTimeMs: event.response_time_ms ?? undefined,
      sequence: result.session_sequence_number,
    }).catch((err) =>
      console.warn("[cognitive-load] Failed to record event:", err),
    );

    return NextResponse.json(result);
  } catch (err) {
    console.error("[POST /api/events]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
