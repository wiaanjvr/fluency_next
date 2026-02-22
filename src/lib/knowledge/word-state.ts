/* =============================================================================
   WORD STATE FOR MODULE — Cross-Module Knowledge Reader
   
   Every module calls getWordStateForModule() before presenting a word.
   This function reads the unified knowledge state and returns a
   WordPresentationContext that tells the module how to present the word
   based on the user's current knowledge across ALL modules.
   
   This is a READ-ONLY function. It never writes to the DB.
============================================================================= */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ModuleSource,
  WordPresentationContext,
  WordKnowledgeRecord,
  ModuleReviewEvent,
  InputMode,
} from "./types";
import { dbRowToWordRecord } from "./types";
import { deduplicationGuard } from "./deduplication-guard";

// ---------------------------------------------------------------------------
// Core: getWordStateForModule
// ---------------------------------------------------------------------------

/**
 * Get the presentation context for a word relative to a specific module.
 *
 * This tells the module:
 * - Whether the word is new (never reviewed anywhere)
 * - Whether recognition/production are established
 * - Whether it was reviewed today in another module
 * - Suggested difficulty level
 * - Whether to skip (reviewed recently in another module)
 *
 * Each module MUST call this before presenting any word and adapt its
 * presentation accordingly.
 */
export async function getWordStateForModule(
  supabase: SupabaseClient,
  userId: string,
  wordId: string,
  moduleSource: ModuleSource,
): Promise<WordPresentationContext> {
  // ── 1. Fetch current word state ────────────────────────────────────────
  const { data: wordRow, error } = await supabase
    .from("user_words")
    .select("*")
    .eq("id", wordId)
    .eq("user_id", userId)
    .single();

  if (error || !wordRow) {
    // Word not found — treat as brand new
    return {
      isNew: true,
      recognitionEstablished: false,
      productionEstablished: false,
      lastReviewedModule: null,
      lastReviewedAt: null,
      reviewedTodayInOtherModule: false,
      suggestedDifficulty: "scaffold",
      shouldSkip: false,
    };
  }

  // ── 2. Fetch recent module history ─────────────────────────────────────
  const { data: historyRows } = await supabase
    .from("module_review_history")
    .select("*")
    .eq("word_id", wordId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

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

  const record = dbRowToWordRecord(wordRow, moduleHistory);

  return buildPresentationContext(record, moduleSource);
}

/**
 * Build presentation context from an already-loaded WordKnowledgeRecord.
 * Useful when processReview already has the record and wants to return context.
 */
export function buildPresentationContext(
  record: WordKnowledgeRecord,
  moduleSource: ModuleSource,
): WordPresentationContext {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

  // ── Determine isNew ────────────────────────────────────────────────────
  const isNew = record.exposureCount === 0;

  // ── Recognition & Production established ───────────────────────────────
  const recognitionEstablished = record.recognitionScore > 0.6;
  const productionEstablished = record.productionScore > 0.6;

  // ── Last reviewed module & timestamp ───────────────────────────────────
  const lastEvent =
    record.moduleHistory.length > 0
      ? record.moduleHistory[0] // Already sorted desc by timestamp
      : null;

  const lastReviewedModule = lastEvent?.moduleSource ?? null;
  const lastReviewedAt = lastEvent?.timestamp ?? null;

  // ── Reviewed today in another module ───────────────────────────────────
  const reviewedTodayInOtherModule = record.moduleHistory.some(
    (event) =>
      event.moduleSource !== moduleSource && event.timestamp >= todayStart,
  );

  // ── shouldSkip logic ───────────────────────────────────────────────────
  // If reviewed correctly in ANY module within the last 2 hours → skip
  const recentCorrectReview = record.moduleHistory.find(
    (event) => event.correct && event.timestamp >= twoHoursAgo,
  );
  const shouldSkip = !!recentCorrectReview;

  // Also check the in-memory deduplication guard for very recent reviews
  // that may not have propagated to the DB yet
  const guardSkip = deduplicationGuard.wasReviewedRecently(
    record.userId,
    record.wordId,
    2, // 2 hours window
  );

  // ── suggestedDifficulty ────────────────────────────────────────────────
  let suggestedDifficulty: "scaffold" | "standard" | "challenge";

  if (record.recognitionScore < 0.3) {
    // Low recognition → scaffold: show hints, slower pacing
    suggestedDifficulty = "scaffold";
  } else if (record.recognitionScore >= 0.6 && record.productionScore >= 0.6) {
    // Both recognition and production established → challenge
    suggestedDifficulty = "challenge";
  } else {
    // Middle ground: some recognition but production not yet established
    suggestedDifficulty = "standard";
  }

  return {
    isNew,
    recognitionEstablished,
    productionEstablished,
    lastReviewedModule,
    lastReviewedAt,
    reviewedTodayInOtherModule,
    suggestedDifficulty,
    shouldSkip: shouldSkip || guardSkip,
  };
}
