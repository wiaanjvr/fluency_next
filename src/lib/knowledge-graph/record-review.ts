/* =============================================================================
   RECORD REVIEW — Universal Review Event System
   
   Updates FSRS/SM-2 interval and ease factor regardless of which module
   triggered the review. Increments exposure_count, appends to module history,
   updates production_score with module-specific weights, and re-evaluates
   the word's readiness for the main story engine.
   
   This is the SINGLE function that all modules call after a review event.
============================================================================= */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { WordRating, WordStatus } from "@/types";
import type {
  ReviewEvent,
  ReviewResult,
  ModuleSource,
  UnifiedWord,
} from "@/types/knowledge-graph";
import { PRODUCTION_WEIGHTS } from "@/types/knowledge-graph";
import { calculateNextReview } from "@/lib/srs/algorithm";
import { logInteractionEvent } from "@/lib/ml-events";
import { syncToLearnerWords } from "./sync-learner-words";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Derive an SM-2 rating (0-5) from a boolean correct + optional response time */
function deriveRating(correct: boolean, responseTimeMs?: number): WordRating {
  if (!correct) return 1; // Wrong

  if (responseTimeMs === undefined) return 3; // Good (default correct)

  // Fast correct = Easy/Perfect, slow correct = Hard/Good
  if (responseTimeMs < 2000) return 5; // Perfect — instant recall
  if (responseTimeMs < 4000) return 4; // Easy — confident
  if (responseTimeMs < 8000) return 3; // Good — some hesitation
  return 2; // Hard — correct but struggled
}

/**
 * Compute the new production score after a review.
 * Production score is an exponential moving average weighted by
 * the module's production weight.
 */
function computeProductionScore(
  currentScore: number,
  correct: boolean,
  moduleSource: ModuleSource,
): number {
  const weight = PRODUCTION_WEIGHTS[moduleSource];
  const maxWeight = 10; // normalization cap
  const alpha = weight / maxWeight; // learning rate: higher weight = faster movement

  // Target: 100 if correct, 0 if wrong (with some floor so one mistake
  // doesn't destroy the score)
  const target = correct ? 100 : Math.max(0, currentScore - weight * 3);
  const newScore = currentScore + alpha * (target - currentScore);

  return Math.round(Math.max(0, Math.min(100, newScore)));
}

/**
 * Update pronunciation score specifically for pronunciation module events.
 */
function computePronunciationScore(
  currentScore: number,
  correct: boolean,
  moduleSource: ModuleSource,
): number {
  if (moduleSource !== "pronunciation") return currentScore;

  const alpha = 0.3; // learning rate for pronunciation
  const target = correct ? 100 : Math.max(0, currentScore - 15);
  const newScore = currentScore + alpha * (target - currentScore);
  return Math.round(Math.max(0, Math.min(100, newScore)));
}

// ---------------------------------------------------------------------------
// Core: recordReview
// ---------------------------------------------------------------------------

/**
 * Process a single review event from any module.
 *
 * 1. Fetches the current word state from `user_words`
 * 2. Runs SM-2 to compute new SRS fields
 * 3. Updates knowledge-graph metrics (exposure, production, pronunciation)
 * 4. Writes everything back to `user_words`
 * 5. Appends a row to `module_review_history`
 * 6. Appends a row to `word_interactions` (backward-compat)
 *
 * @returns The computed ReviewResult (never throws — returns null on failure)
 */
export async function recordReview(
  supabase: SupabaseClient,
  userId: string,
  event: ReviewEvent,
): Promise<ReviewResult | null> {
  const { wordId, moduleSource, correct, responseTimeMs } = event;

  // 1. Fetch current word state -------------------------------------------
  const { data: word, error: fetchErr } = await supabase
    .from("user_words")
    .select("*")
    .eq("id", wordId)
    .eq("user_id", userId)
    .single();

  if (fetchErr || !word) {
    console.error("[recordReview] Word not found:", wordId, fetchErr?.message);
    return null;
  }

  const unified = word as UnifiedWord;

  // 2. Determine rating ---------------------------------------------------
  const rating: WordRating =
    event.rating ?? deriveRating(correct, responseTimeMs);

  // 3. Run SM-2 algorithm -------------------------------------------------
  const srsResult = calculateNextReview(
    {
      ease_factor: unified.ease_factor,
      repetitions: unified.repetitions,
      status: unified.status as WordStatus,
    },
    rating,
  );

  // 4. Update knowledge-graph metrics ------------------------------------
  const newExposureCount = (unified.exposure_count ?? 0) + 1;

  const newProductionScore = computeProductionScore(
    unified.production_score ?? 0,
    correct,
    moduleSource,
  );

  const newPronunciationScore = computePronunciationScore(
    unified.pronunciation_score ?? 0,
    correct,
    moduleSource,
  );

  // 5. Write back to user_words ------------------------------------------
  const now = new Date().toISOString();

  const updatePayload: Record<string, unknown> = {
    ease_factor: srsResult.ease_factor,
    repetitions: srsResult.repetitions,
    interval: srsResult.interval,
    next_review: srsResult.next_review.toISOString(),
    status: srsResult.status,
    rating,
    last_reviewed: now,
    last_rated_at: now,
    exposure_count: newExposureCount,
    production_score: newProductionScore,
    pronunciation_score: newPronunciationScore,
    updated_at: now,
  };

  // Track propel-module-specific fields (skip for story_engine)
  if (moduleSource !== "story_engine") {
    updatePayload.last_propel_module = moduleSource;
    updatePayload.last_propel_review_at = now;
  }

  const { error: updateErr } = await supabase
    .from("user_words")
    .update(updatePayload)
    .eq("id", wordId)
    .eq("user_id", userId);

  if (updateErr) {
    console.error("[recordReview] Failed to update word:", updateErr.message);
    return null;
  }

  // 6. Sync to learner_words_v2 (dashboard reads from this table) --------
  // Fire-and-forget: the review is already saved in user_words.
  syncToLearnerWords(supabase, {
    userId,
    word: unified.word,
    lemma: unified.lemma,
    language: unified.language ?? "fr",
    status: srsResult.status,
    correct,
    repetitions: srsResult.repetitions,
    exposureCount: newExposureCount,
    nativeTranslation: unified.native_translation ?? null,
  }).catch((err) => {
    console.warn("[recordReview] Learner words sync failed:", err);
  });

  // 7. Append to module_review_history -----------------------------------
  const { error: histErr } = await supabase
    .from("module_review_history")
    .insert({
      user_id: userId,
      word_id: wordId,
      module_source: moduleSource,
      correct,
      response_time_ms: responseTimeMs ?? null,
      rating,
      ease_factor_after: srsResult.ease_factor,
      interval_after: srsResult.interval,
      repetitions_after: srsResult.repetitions,
      status_after: srsResult.status,
    });

  if (histErr) {
    // Non-fatal: log but don't fail the whole review
    console.warn("[recordReview] Failed to insert history:", histErr.message);
  }

  // 8. Backward-compat: also insert into word_interactions ---------------
  await supabase.from("word_interactions").insert({
    user_id: userId,
    word_id: wordId,
    rating,
    response_time_ms: responseTimeMs ?? null,
  });

  // 9. Emit ML interaction event (if session context provided) -----------
  if (event.sessionId && event.inputMode) {
    // Fire-and-forget — ML event logging should never block the review
    logInteractionEvent(supabase, userId, event.sessionId, {
      word_id: wordId,
      grammar_concept_id: event.grammarConceptId ?? null,
      module_source: moduleSource,
      correct,
      response_time_ms: responseTimeMs ?? null,
      input_mode: event.inputMode,
      story_complexity_level: event.storyComplexityLevel ?? null,
    }).catch((err) => {
      console.warn("[recordReview] ML event log failed:", err);
    });
  }

  // 10. Build result ------------------------------------------------------
  return {
    wordId,
    moduleSource,
    correct,
    responseTimeMs,
    newEaseFactor: srsResult.ease_factor,
    newInterval: srsResult.interval,
    newRepetitions: srsResult.repetitions,
    newStatus: srsResult.status,
    newNextReview: srsResult.next_review.toISOString(),
    newExposureCount,
    newProductionScore,
    newPronunciationScore,
  };
}

// ---------------------------------------------------------------------------
// Batch variant — processes multiple review events in sequence
// ---------------------------------------------------------------------------

/**
 * Process a batch of review events (e.g. from a completed Propel session).
 * Each event is processed independently; failures are logged and skipped.
 */
export async function recordReviewBatch(
  supabase: SupabaseClient,
  userId: string,
  events: ReviewEvent[],
): Promise<ReviewResult[]> {
  const results: ReviewResult[] = [];

  for (const event of events) {
    const result = await recordReview(supabase, userId, event);
    if (result) {
      results.push(result);
    }
  }

  return results;
}
