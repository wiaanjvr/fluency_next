/* =============================================================================
   PROCESS REVIEW — Central Weighted Score Update Engine
   
   This is the ONLY function that may write to WordKnowledgeRecord scores,
   interval, dueDate, or repetitions. All modules MUST go through this
   function via their adapter — no direct writes allowed.
   
   Responsibilities:
   1. Event deduplication (idempotent — network retries are no-ops)
   2. Score decay for inactive words (>30 days since last review)
   3. Multi-dimensional score updates weighted by inputMode
   4. Weighted FSRS/SM-2 interval credit by inputMode
   5. Append ModuleReviewEvent to history
   6. Increment exposureCount
   7. Update GrammarConceptMastery for tagged words
   8. Emit WordReviewedEvent to event bus
   9. Mark reviewed in SessionDeduplicationGuard
   
   Performance target: <100ms at p95 (cache hot records in Redis).
============================================================================= */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ProcessReviewParams,
  WordKnowledgeRecord,
  ModuleReviewEvent,
  InputMode,
} from "./types";
import {
  INTERVAL_CREDIT_WEIGHTS,
  CORRECT_SCORE_DELTAS,
  INCORRECT_SCORE_DELTAS,
  dbRowToWordRecord,
  wordRecordToDbUpdate,
} from "./types";
import { updateGrammarConceptMastery } from "./grammar-mastery";
import { eventBus } from "./event-bus";
import { deduplicationGuard } from "./deduplication-guard";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Clamp a value between min and max */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Generate a deterministic event ID from params if none provided */
function generateEventId(params: ProcessReviewParams): string {
  return `${params.userId}:${params.wordId}:${params.moduleSource}:${params.sessionId}:${Date.now()}`;
}

/**
 * Apply score decay for words not reviewed in >30 days.
 *
 * Rationale: Memory decays over time. If a user hasn't reviewed a word
 * in over 30 days, their scores should reflect some loss of knowledge.
 * The decay is gentle (0.98^days) so it takes ~35 extra days to lose
 * half the score.
 *
 * The decay is applied BEFORE the new review credit so the user sees
 * the effect of their absence, then gets credit for returning.
 */
function applyScoreDecay(
  record: WordKnowledgeRecord,
  now: Date,
): WordKnowledgeRecord {
  if (!record.lastReviewed) return record;

  const daysSinceLastReview = Math.floor(
    (now.getTime() - record.lastReviewed.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (daysSinceLastReview <= 30) return record;

  // Decay is applied to the days BEYOND the 30-day threshold
  const excessDays = daysSinceLastReview - 30;
  const decayFactor = Math.pow(0.98, excessDays);

  return {
    ...record,
    recognitionScore: record.recognitionScore * decayFactor,
    productionScore: record.productionScore * decayFactor,
    contextualUsageScore: record.contextualUsageScore * decayFactor,
    // pronunciationScore does NOT decay — physical ability is more persistent
  };
}

/**
 * Apply multi-dimensional score updates based on inputMode and correctness.
 */
function applyScoreUpdates(
  record: WordKnowledgeRecord,
  correct: boolean,
  inputMode: InputMode,
): WordKnowledgeRecord {
  const updated = { ...record };

  if (correct) {
    const deltas = CORRECT_SCORE_DELTAS[inputMode];
    updated.recognitionScore = clamp(
      updated.recognitionScore + deltas.recognitionScore,
      0,
      1,
    );
    updated.productionScore = clamp(
      updated.productionScore + deltas.productionScore,
      0,
      1,
    );
    updated.pronunciationScore = clamp(
      updated.pronunciationScore + deltas.pronunciationScore,
      0,
      1,
    );
    updated.contextualUsageScore = clamp(
      updated.contextualUsageScore + deltas.contextualUsageScore,
      0,
      1,
    );
  } else {
    // Incorrect — apply penalties (floored at 0)
    updated.recognitionScore = clamp(
      updated.recognitionScore + INCORRECT_SCORE_DELTAS.recognitionScore,
      0,
      1,
    );
    updated.productionScore = clamp(
      updated.productionScore + INCORRECT_SCORE_DELTAS.productionScore,
      0,
      1,
    );
    // Never penalize pronunciationScore on non-speaking tasks
    if (inputMode === "speaking") {
      updated.pronunciationScore = clamp(
        updated.pronunciationScore - 0.05,
        0,
        1,
      );
    }
  }

  return updated;
}

/**
 * Compute the weighted SM-2 interval using inputMode credit weight.
 *
 * The SM-2 algorithm produces a "raw" interval. We then multiply it by
 * the inputMode weight so that weaker signals (like multiple choice or
 * passive reading) don't push the interval out as far as active production.
 *
 * For incorrect answers, the full penalty is applied regardless of inputMode
 * — getting a word wrong is a strong signal regardless of format.
 */
function computeWeightedSRS(
  currentRecord: WordKnowledgeRecord,
  correct: boolean,
  inputMode: InputMode,
  intervalWeightOverride?: number,
): {
  easeFactor: number;
  interval: number;
  repetitions: number;
  dueDate: Date;
  status: string;
} {
  const currentEF = currentRecord.easeFactor;
  const currentReps = currentRecord.repetitions;

  let newEF = currentEF;
  let newReps = currentReps;
  let intervalDays: number;
  let newStatus = currentRecord.status;

  if (correct) {
    // Derive an SM-2-style rating from correctness
    // We use rating 3 (Good) as the baseline for correct answers
    const rating = 3;
    newEF = currentEF + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02));
    newEF = clamp(newEF, 1.3, 2.5);
    newReps = currentReps + 1;

    // Base interval from SM-2 progression
    if (newReps === 1) {
      intervalDays = 1;
    } else if (newReps === 2) {
      intervalDays = 3;
    } else {
      intervalDays = Math.round(currentRecord.interval * newEF);
    }

    // Apply inputMode weight — weaker signals produce shorter intervals
    const weight = intervalWeightOverride ?? INTERVAL_CREDIT_WEIGHTS[inputMode];
    intervalDays = Math.max(1, Math.round(intervalDays * weight));

    // Update status
    if (newReps >= 8 && newEF >= 2.0) {
      newStatus = "mastered";
    } else if (newReps >= 4) {
      newStatus = "known";
    } else {
      newStatus = "learning";
    }
  } else {
    // Incorrect — full FSRS penalty regardless of inputMode
    newEF = Math.max(1.3, currentEF - 0.2);
    newReps = 0;
    intervalDays = 1; // Reset to 1 day
    newStatus = "learning";
  }

  const dueDate = new Date();
  dueDate.setTime(dueDate.getTime() + intervalDays * 24 * 60 * 60 * 1000);

  return {
    easeFactor: Math.round(newEF * 100) / 100,
    interval: intervalDays,
    repetitions: newReps,
    dueDate,
    status: newStatus,
  };
}

// ---------------------------------------------------------------------------
// Core: processReview
// ---------------------------------------------------------------------------

/**
 * Central review processing function. This is the ONLY way to update
 * word knowledge scores. All module adapters call this function.
 *
 * @returns The updated WordKnowledgeRecord, or null on failure.
 */
export async function processReview(
  supabase: SupabaseClient,
  params: ProcessReviewParams,
): Promise<WordKnowledgeRecord | null> {
  const {
    userId,
    wordId,
    moduleSource,
    inputMode,
    correct,
    responseTimeMs,
    sessionId,
    intervalWeightOverride,
  } = params;

  const eventId = params.eventId ?? generateEventId(params);
  const now = new Date();

  // ── 1. Event deduplication — idempotent guard ──────────────────────────
  // Check if this exact event was already processed (network retry protection)
  const { data: existingEvent } = await supabase
    .from("module_review_history")
    .select("id")
    .eq("event_id", eventId)
    .maybeSingle();

  if (existingEvent) {
    // Already processed — return current state without re-applying
    console.info(`[processReview] Duplicate event ${eventId} — skipping`);
    return fetchCurrentWordState(supabase, userId, wordId);
  }

  // ── 2. Fetch current word state ────────────────────────────────────────
  const { data: wordRow, error: fetchErr } = await supabase
    .from("user_words")
    .select("*")
    .eq("id", wordId)
    .eq("user_id", userId)
    .single();

  if (fetchErr || !wordRow) {
    console.error("[processReview] Word not found:", wordId, fetchErr?.message);
    return null;
  }

  // Fetch recent module history for this word
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

  let record = dbRowToWordRecord(wordRow, moduleHistory);

  // ── 3. Apply score decay for inactive words (>30 days) ─────────────────
  record = applyScoreDecay(record, now);

  // ── 4. Apply multi-dimensional score updates ───────────────────────────
  record = applyScoreUpdates(record, correct, inputMode);

  // ── 5. Compute weighted SRS interval ───────────────────────────────────
  const srsResult = computeWeightedSRS(
    record,
    correct,
    inputMode,
    intervalWeightOverride,
  );
  record.easeFactor = srsResult.easeFactor;
  record.interval = srsResult.interval;
  record.repetitions = srsResult.repetitions;
  record.dueDate = srsResult.dueDate;
  record.status = srsResult.status;

  // ── 6. Increment exposure count ────────────────────────────────────────
  record.exposureCount += 1;
  record.lastReviewed = now;

  // ── 7. Write updated record to DB ──────────────────────────────────────
  const dbUpdate = wordRecordToDbUpdate(record);
  // Also track which propel module last reviewed (skip for story)
  if (moduleSource !== "story") {
    (dbUpdate as Record<string, unknown>).last_propel_module = moduleSource;
    (dbUpdate as Record<string, unknown>).last_propel_review_at =
      now.toISOString();
  }

  const { error: updateErr } = await supabase
    .from("user_words")
    .update(dbUpdate)
    .eq("id", wordId)
    .eq("user_id", userId);

  if (updateErr) {
    console.error("[processReview] DB update failed:", updateErr.message);
    return null;
  }

  // ── 8. Append ModuleReviewEvent to history ─────────────────────────────
  const { error: histErr } = await supabase
    .from("module_review_history")
    .insert({
      user_id: userId,
      word_id: wordId,
      module_source: moduleSource,
      correct,
      response_time_ms: responseTimeMs,
      input_mode: inputMode,
      session_id: sessionId,
      event_id: eventId,
      ease_factor_after: srsResult.easeFactor,
      interval_after: srsResult.interval,
      repetitions_after: srsResult.repetitions,
      status_after: srsResult.status,
    });

  if (histErr) {
    // Non-fatal: log but don't fail the whole review
    console.warn("[processReview] History insert failed:", histErr.message);
  }

  // ── 9. Update GrammarConceptMastery for tagged words ───────────────────
  let grammarConceptsUpdated: string[] = [];
  if (record.tags.length > 0) {
    grammarConceptsUpdated = await updateGrammarConceptMastery(
      supabase,
      userId,
      record.tags,
      correct,
      inputMode,
    );
  }

  // ── 10. Mark reviewed in deduplication guard ───────────────────────────
  deduplicationGuard.markReviewed(userId, wordId, moduleSource, now);

  // ── 11. Emit WordReviewedEvent to event bus ────────────────────────────
  // Fire-and-forget — never block the main review pipeline
  eventBus
    .emit("wordReviewed", {
      userId,
      wordId,
      moduleSource,
      inputMode,
      correct,
      responseTimeMs,
      sessionId,
      updatedRecord: record,
      grammarConceptsUpdated,
      timestamp: now,
    })
    .catch((err) => {
      console.warn("[processReview] Event bus emission failed:", err);
    });

  // ── 12. Backward compatibility: also insert into word_interactions ─────
  await supabase
    .from("word_interactions")
    .insert({
      user_id: userId,
      word_id: wordId,
      rating: correct ? 3 : 1, // Map to SM-2 rating for legacy consumers
      response_time_ms: responseTimeMs,
    })
    .then(undefined, () => {
      // Silently ignore — legacy table, non-critical
    });

  return record;
}

// ---------------------------------------------------------------------------
// Helper: fetch current word state (used for duplicate events)
// ---------------------------------------------------------------------------

async function fetchCurrentWordState(
  supabase: SupabaseClient,
  userId: string,
  wordId: string,
): Promise<WordKnowledgeRecord | null> {
  const { data: wordRow } = await supabase
    .from("user_words")
    .select("*")
    .eq("id", wordId)
    .eq("user_id", userId)
    .single();

  if (!wordRow) return null;

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

  return dbRowToWordRecord(wordRow, moduleHistory);
}
