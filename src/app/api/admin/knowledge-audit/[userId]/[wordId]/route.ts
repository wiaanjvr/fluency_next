/* =============================================================================
   ADMIN KNOWLEDGE AUDIT ENDPOINT
   
   GET /api/admin/knowledge-audit/[userId]/[wordId]
   
   Returns the complete knowledge state for a user+word combination, including:
   - Full WordKnowledgeRecord
   - Grammar concept mastery scores for all word tags
   - Last 20 ModuleReviewEvents
   - WordPresentationContext for every module
   - Deduplication status
   
   This is the primary debugging tool for verifying the unified knowledge
   base behaves correctly. Admin-only — not exposed to regular users.
============================================================================= */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWordStateForModule } from "@/lib/knowledge/word-state";
import { getConceptMastery } from "@/lib/knowledge/grammar-mastery";
import { deduplicationGuard } from "@/lib/knowledge/deduplication-guard";
import { MODULE_SOURCES, dbRowToWordRecord } from "@/lib/knowledge/types";
import type {
  ModuleReviewEvent,
  InputMode,
  ModuleSource,
} from "@/lib/knowledge/types";

// ---------------------------------------------------------------------------
// Admin guard
// ---------------------------------------------------------------------------

async function isAdmin(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<boolean> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return false;

  const adminEmail = process.env.ADMIN_EMAIL;
  return !!adminEmail && user.email === adminEmail;
}

// ---------------------------------------------------------------------------
// GET /api/admin/knowledge-audit/[userId]/[wordId]
// ---------------------------------------------------------------------------

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string; wordId: string }> },
) {
  const supabase = await createClient();

  // Admin check
  if (!(await isAdmin(await supabase))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { userId, wordId } = await params;

  if (!userId || !wordId) {
    return NextResponse.json(
      { error: "Missing userId or wordId" },
      { status: 400 },
    );
  }

  try {
    // ── 1. Fetch word record ──────────────────────────────────────────────
    const { data: wordRow, error: wordErr } = await supabase
      .from("user_words")
      .select("*")
      .eq("id", wordId)
      .eq("user_id", userId)
      .single();

    if (wordErr || !wordRow) {
      return NextResponse.json(
        { error: "Word not found", details: wordErr?.message },
        { status: 404 },
      );
    }

    // ── 2. Fetch module history (last 20) ─────────────────────────────────
    const { data: historyRows } = await supabase
      .from("module_review_history")
      .select("*")
      .eq("word_id", wordId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    const moduleHistory: ModuleReviewEvent[] = (historyRows ?? []).map(
      (r: Record<string, unknown>) => ({
        id: r.id as string,
        moduleSource: r.module_source as ModuleReviewEvent["moduleSource"],
        timestamp: new Date(r.created_at as string),
        correct: r.correct as boolean,
        responseTimeMs: r.response_time_ms as number | null,
        inputMode: r.input_mode as InputMode | null,
        sessionId: r.session_id as string | null,
        eventId: r.event_id as string | null,
      }),
    );

    const wordRecord = dbRowToWordRecord(wordRow, moduleHistory);

    // ── 3. Fetch grammar concept scores for word tags ─────────────────────
    const grammarConceptScores: Record<string, number> = {};
    for (const tag of wordRecord.tags) {
      const mastery = await getConceptMastery(supabase, userId, tag);
      grammarConceptScores[tag] = mastery?.masteryScore ?? 0;
    }

    // ── 4. Get presentation context for every module ──────────────────────
    const presentationContextPerModule: Record<string, unknown> = {};
    for (const mod of MODULE_SOURCES) {
      presentationContextPerModule[mod] = await getWordStateForModule(
        supabase,
        userId,
        wordId,
        mod,
      );
    }

    // ── 5. Deduplication status ───────────────────────────────────────────
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const reviewedTodayInModules: ModuleSource[] = moduleHistory
      .filter((e) => e.timestamp >= todayStart)
      .map((e) => e.moduleSource)
      .filter((v, i, arr) => arr.indexOf(v) === i); // unique

    const shouldSkipNextReview = deduplicationGuard.wasReviewedRecently(
      userId,
      wordId,
      2,
    );

    const lastReview = deduplicationGuard.getLastReview(userId, wordId);
    const nextReviewEligibleAt = lastReview
      ? new Date(
          lastReview.timestamp.getTime() + 2 * 60 * 60 * 1000,
        ).toISOString()
      : null;

    // ── 6. Assemble response ──────────────────────────────────────────────
    return NextResponse.json({
      wordRecord: {
        ...wordRecord,
        dueDate: wordRecord.dueDate.toISOString(),
        lastReviewed: wordRecord.lastReviewed?.toISOString() ?? null,
        moduleHistory: wordRecord.moduleHistory.map((e) => ({
          ...e,
          timestamp: e.timestamp.toISOString(),
        })),
      },
      grammarConceptScores,
      moduleHistory: moduleHistory.map((e) => ({
        ...e,
        timestamp: e.timestamp.toISOString(),
      })),
      presentationContextPerModule,
      deduplicationStatus: {
        reviewedTodayInModules,
        shouldSkipNextReview,
        nextReviewEligibleAt,
      },
    });
  } catch (err) {
    console.error("[knowledge-audit] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
