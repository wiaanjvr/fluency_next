/* =============================================================================
   CLOZE MODULE ADAPTER
   
   Maps cloze exercise events to the unified processReview interface.
   
   Cloze exercises support two answer modes:
   - multipleChoice: user selects from options (recognition)
   - typed: user types the answer (production — stronger signal)
   
   The adapter does NOT contain any scoring logic — it maps cloze-specific
   events to the processReview params and lets the core engine handle scoring.
============================================================================= */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { WordKnowledgeRecord, InputMode } from "../types";
import { processReview } from "../process-review";

/** Cloze answer type */
export type ClozeAnswerType = "multipleChoice" | "typed";

/**
 * Adapter: Cloze exercise → processReview
 */
export const ClozeAdapter = {
  /**
   * Called when a cloze answer is submitted.
   *
   * @param answerType - "multipleChoice" or "typed"
   * @param correct - Whether the answer was correct
   * @param responseTimeMs - Time to respond in milliseconds
   * @param sessionId - Active exercise session ID
   */
  async onAnswerSubmitted(
    supabase: SupabaseClient,
    userId: string,
    wordId: string,
    answerType: ClozeAnswerType,
    correct: boolean,
    responseTimeMs: number,
    sessionId: string,
  ): Promise<WordKnowledgeRecord | null> {
    // Map cloze answer type to inputMode
    const inputMode: InputMode =
      answerType === "typed" ? "typing" : "multipleChoice";

    return processReview(supabase, {
      userId,
      wordId,
      moduleSource: "cloze",
      inputMode,
      correct,
      responseTimeMs,
      sessionId,
    });
  },
};
