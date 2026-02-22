/* =============================================================================
   PRONUNCIATION MODULE ADAPTER
   
   Maps speech-to-text scoring events to the unified processReview interface.
   
   Special behavior: In addition to the standard processReview score updates,
   this adapter applies a more granular pronunciationScore update using the
   raw STT score (0-100) as an exponential moving average. This gives finer
   resolution than the boolean correct/incorrect delta from the standard
   score update rules.
   
   Threshold: sttScore >= 70 → correct, < 70 → incorrect
   EMA: pronunciationScore = (current * 0.7) + (sttScore/100 * 0.3)
============================================================================= */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { WordKnowledgeRecord } from "../types";
import { processReview } from "../process-review";

/**
 * Adapter: Pronunciation/Mimic Method → processReview
 */
export const PronunciationAdapter = {
  /**
   * Called when a pronunciation attempt is scored by the STT system.
   *
   * @param sttScore - Speech-to-text accuracy score (0-100)
   * @param responseTimeMs - Time to respond in milliseconds
   * @param sessionId - Active pronunciation session ID
   */
  async onPronunciationScored(
    supabase: SupabaseClient,
    userId: string,
    wordId: string,
    sttScore: number,
    responseTimeMs: number,
    sessionId: string,
  ): Promise<WordKnowledgeRecord | null> {
    // Map sttScore to correct/incorrect threshold
    const correct = sttScore >= 70;

    // ── 1. Apply the raw STT score as EMA to pronunciationScore ──────────
    // This gives finer granularity than the boolean delta in processReview.
    // We update the DB directly BEFORE processReview, so processReview's
    // standard delta stacks on top of the EMA-adjusted score.
    await applyPronunciationEMA(supabase, userId, wordId, sttScore);

    // ── 2. Call processReview for all other score/scheduling updates ──────
    return processReview(supabase, {
      userId,
      wordId,
      moduleSource: "pronunciation",
      inputMode: "speaking",
      correct,
      responseTimeMs,
      sessionId,
    });
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Apply an exponential moving average to pronunciationScore using the
 * raw STT score for more granular tracking than boolean correct/incorrect.
 *
 * Formula: pronunciationScore = (current * 0.7) + (sttScore/100 * 0.3)
 *
 * This means:
 * - 70% of the score comes from historical performance (momentum)
 * - 30% comes from this latest pronunciation attempt
 * - A consistently good speaker will trend toward 0.8-0.9
 * - A poor speaker will trend toward 0.3-0.4
 * - Recovery is gradual, not instant
 */
async function applyPronunciationEMA(
  supabase: SupabaseClient,
  userId: string,
  wordId: string,
  sttScore: number,
): Promise<void> {
  const { data } = await supabase
    .from("user_words")
    .select("pronunciation_score")
    .eq("id", wordId)
    .eq("user_id", userId)
    .single();

  if (!data) return;

  // Current score is 0-100 in DB, normalize to 0-1
  const currentScore = ((data.pronunciation_score as number) ?? 0) / 100;
  const normalizedStt = sttScore / 100;

  // EMA: 70% history, 30% current attempt
  const newScore = currentScore * 0.7 + normalizedStt * 0.3;

  // Write back as 0-100 integer (legacy format)
  await supabase
    .from("user_words")
    .update({
      pronunciation_score: Math.round(newScore * 100),
      updated_at: new Date().toISOString(),
    })
    .eq("id", wordId)
    .eq("user_id", userId);
}
