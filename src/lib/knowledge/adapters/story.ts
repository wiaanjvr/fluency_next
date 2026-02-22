/* =============================================================================
   STORY ENGINE ADAPTER
   
   Maps story reading events to the unified processReview interface.
   
   Two event types:
   1. onWordEncountered — passive reading (word seen in story context)
      → inputMode: reading, correct: true (seeing in context always counts)
   2. onWordInteraction — active interaction (tapped for definition, fill-in, etc.)
      → inputMode based on interactionType
   
   Story reading is the weakest signal but the most frequent — users see
   many words passively while reading. These contribute mainly to
   contextualUsageScore and slightly to recognitionScore, with minimal
   interval credit (0.3×).
============================================================================= */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { WordKnowledgeRecord, InputMode } from "../types";
import { processReview } from "../process-review";

/** Types of interaction within a story */
export type StoryInteractionType =
  | "tappedDefinition" // Tapped word for translation/definition
  | "fillInBlank" // Fill-in-the-blank exercise within story
  | "multipleChoice" // Multiple choice quiz within story
  | "speaking" // Read-aloud interaction within story
  | "highlight"; // Highlighted/saved word (passive)

/**
 * Adapter: Story Engine → processReview
 */
export const StoryAdapter = {
  /**
   * Called when a word is encountered (seen) during story reading.
   * This is passive exposure — the user saw the word in context.
   *
   * Maps to: inputMode: reading, correct: true
   *
   * Seeing a word in a comprehensible input story is a valid exposure event.
   * It provides contextual understanding but minimal evidence of active recall.
   */
  async onWordEncountered(
    supabase: SupabaseClient,
    userId: string,
    wordId: string,
    sessionId: string,
  ): Promise<WordKnowledgeRecord | null> {
    return processReview(supabase, {
      userId,
      wordId,
      moduleSource: "story",
      inputMode: "reading",
      correct: true, // Seeing in context always counts as correct exposure
      responseTimeMs: 0, // No response time for passive reading
      sessionId,
    });
  },

  /**
   * Called when a user actively interacts with a word within a story
   * (tapped for definition, fill-in-the-blank, etc.)
   *
   * The inputMode is determined by the interactionType:
   * - tappedDefinition → reading (passive, but deliberate)
   * - fillInBlank → typing (production)
   * - multipleChoice → multipleChoice (recognition)
   * - speaking → speaking (pronunciation)
   * - highlight → reading (passive)
   */
  async onWordInteraction(
    supabase: SupabaseClient,
    userId: string,
    wordId: string,
    interactionType: StoryInteractionType,
    correct: boolean,
    responseTimeMs: number,
    sessionId: string,
  ): Promise<WordKnowledgeRecord | null> {
    const inputMode = mapInteractionType(interactionType);

    return processReview(supabase, {
      userId,
      wordId,
      moduleSource: "story",
      inputMode,
      correct,
      responseTimeMs,
      sessionId,
    });
  },
};

// ---------------------------------------------------------------------------
// Mapping logic
// ---------------------------------------------------------------------------

function mapInteractionType(type: StoryInteractionType): InputMode {
  switch (type) {
    case "fillInBlank":
      return "typing";
    case "multipleChoice":
      return "multipleChoice";
    case "speaking":
      return "speaking";
    case "tappedDefinition":
    case "highlight":
    default:
      return "reading";
  }
}
