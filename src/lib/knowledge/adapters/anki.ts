/* =============================================================================
   ANKI MODULE ADAPTER
   
   Maps Anki-style flashcard review events (rating 1-4) to the unified
   processReview interface. No scoring logic here — just mapping.
   
   Anki ratings:
   - 1 (Again): Failed recall → incorrect, multipleChoice
   - 2 (Hard):  Correct but struggled → correct, multipleChoice, 0.5× interval
   - 3 (Good):  Standard correct → correct, multipleChoice
   - 4 (Easy):  Effortless recall → correct, multipleChoice, 1.2× interval
   
   All Anki reviews map to multipleChoice inputMode because standard Anki
   is a flip-and-rate paradigm — the user sees the front, mentally recalls
   the back, then self-rates. This is recognition, not production.
============================================================================= */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { WordKnowledgeRecord, InputMode } from "../types";
import { processReview } from "../process-review";

/** Anki rating: 1=Again, 2=Hard, 3=Good, 4=Easy */
export type AnkiRating = 1 | 2 | 3 | 4;

/**
 * Adapter: Anki flashcard review → processReview
 */
export const AnkiAdapter = {
  /**
   * Called when a flashcard is reviewed in the Anki/flashcard module.
   *
   * @param rating - Anki rating (1=Again, 2=Hard, 3=Good, 4=Easy)
   * @param responseTimeMs - Time to respond in milliseconds
   * @param sessionId - Active study session ID
   */
  async onCardReviewed(
    supabase: SupabaseClient,
    userId: string,
    wordId: string,
    rating: AnkiRating,
    responseTimeMs: number,
    sessionId: string,
  ): Promise<WordKnowledgeRecord | null> {
    // Map Anki rating to correct/inputMode and interval weight override
    const mapping = mapAnkiRating(rating);

    return processReview(supabase, {
      userId,
      wordId,
      moduleSource: "anki",
      inputMode: mapping.inputMode,
      correct: mapping.correct,
      responseTimeMs,
      sessionId,
      intervalWeightOverride: mapping.intervalWeightOverride,
    });
  },
};

// ---------------------------------------------------------------------------
// Mapping logic
// ---------------------------------------------------------------------------

function mapAnkiRating(rating: AnkiRating): {
  correct: boolean;
  inputMode: InputMode;
  intervalWeightOverride?: number;
} {
  switch (rating) {
    case 1: // Again — complete failure to recall
      return {
        correct: false,
        inputMode: "multipleChoice",
        // No interval override — incorrect gets full penalty
      };

    case 2: // Hard — correct but with significant difficulty
      return {
        correct: true,
        inputMode: "multipleChoice",
        // 0.5× interval weight: user struggles, so don't push interval out
        // as far as a clean correct would. This is MORE conservative than
        // the default multipleChoice weight of 0.6× — reflecting that the
        // user almost failed.
        intervalWeightOverride: 0.5,
      };

    case 3: // Good — standard correct recall
      return {
        correct: true,
        inputMode: "multipleChoice",
        // No override — uses default multipleChoice weight (0.6×)
      };

    case 4: // Easy — effortless, instant recall
      return {
        correct: true,
        inputMode: "multipleChoice",
        // 1.2× interval weight: user knows this cold, push interval out
        // further than normal. This exceeds 1.0 because Anki "Easy" is
        // a deliberately strong confidence signal from the user.
        intervalWeightOverride: 1.2,
      };
  }
}
