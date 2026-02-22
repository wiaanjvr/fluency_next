/**
 * POST /api/events/session/start
 *
 * Begin a new learning session. Returns a session_id the client uses
 * for all subsequent event logging in this session.
 *
 * Request body: { module_source: ModuleSource }
 *
 * Returns: { session_id: string, started_at: string }
 */

import { verifyAuth } from "@/lib/auth/verify-auth";
import { startSession } from "@/lib/ml-events";
import { initCognitiveLoadSession } from "@/lib/ml-services/cognitive-load-client";
import { NextRequest, NextResponse } from "next/server";
import { MODULE_SOURCES } from "@/types/knowledge-graph";
import type { StartSessionRequest } from "@/types/ml-events";

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

    const { module_source } = body as StartSessionRequest;

    if (!MODULE_SOURCES.includes(module_source as any)) {
      return NextResponse.json(
        {
          error: `Invalid module_source. Must be one of: ${MODULE_SOURCES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // ── Start session ───────────────────────────────────────────────────
    const result = await startSession(supabase, user.id, module_source);

    if (!result) {
      return NextResponse.json(
        { error: "Failed to start session" },
        { status: 500 },
      );
    }

    // ── Initialise cognitive load tracking (fire-and-forget) ────────────
    initCognitiveLoadSession({
      sessionId: result.session_id,
      userId: user.id,
      moduleSource: module_source,
    }).catch((err) =>
      console.warn("[cognitive-load] Failed to init session:", err),
    );

    return NextResponse.json(result);
  } catch (err) {
    console.error("[POST /api/events/session/start]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
