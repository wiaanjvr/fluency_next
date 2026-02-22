/* =============================================================================
   CONJUGATION MODULE ADAPTER
   
   Maps conjugation drill events to the unified processReview interface.
   
   Conjugation drills are always typed (the user types the conjugated form),
   so they always map to inputMode: "typing".
   
   The adapter also ensures the grammar concept tag is present on the word's
   tags[] array before calling processReview, so the grammar concept mastery
   updater receives the correct tag context.
============================================================================= */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { WordKnowledgeRecord } from "../types";
import { processReview } from "../process-review";

/**
 * Adapter: Conjugation drill → processReview
 */
export const ConjugationAdapter = {
  /**
   * Called when a conjugation answer is submitted.
   *
   * @param grammarConceptTag - e.g. "konjunktiv2", "imparfait", "passé-composé"
   * @param correct - Whether the conjugation was correct
   * @param responseTimeMs - Time to respond in milliseconds
   * @param sessionId - Active drill session ID
   */
  async onConjugationSubmitted(
    supabase: SupabaseClient,
    userId: string,
    wordId: string,
    grammarConceptTag: string,
    correct: boolean,
    responseTimeMs: number,
    sessionId: string,
  ): Promise<WordKnowledgeRecord | null> {
    // Ensure the grammar concept tag is on the word's tags[] array
    // before calling processReview (so grammar mastery gets updated)
    await ensureTagOnWord(supabase, userId, wordId, grammarConceptTag);

    // Conjugation is always typed — demonstrates active gramme production
    return processReview(supabase, {
      userId,
      wordId,
      moduleSource: "conjugation",
      inputMode: "typing",
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
 * Add a grammar tag to a word's tags[] if not already present.
 * This is idempotent — calling multiple times with the same tag is safe.
 */
async function ensureTagOnWord(
  supabase: SupabaseClient,
  userId: string,
  wordId: string,
  tag: string,
): Promise<void> {
  const normalizedTag = tag.toLowerCase().trim();
  if (!normalizedTag) return;

  // Fetch current tags
  const { data } = await supabase
    .from("user_words")
    .select("tags")
    .eq("id", wordId)
    .eq("user_id", userId)
    .single();

  if (!data) return;

  const currentTags: string[] = data.tags ?? [];

  // Already tagged — nothing to do
  if (currentTags.includes(normalizedTag)) return;

  // Add the tag
  const newTags = [...currentTags, normalizedTag];
  await supabase
    .from("user_words")
    .update({
      tags: newTags,
      updated_at: new Date().toISOString(),
    })
    .eq("id", wordId)
    .eq("user_id", userId);
}
