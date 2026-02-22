/* =============================================================================
   GRAMMAR LESSON ADAPTER
   
   Maps grammar lesson events to the unified processReview interface.
   
   Two event types:
   1. onLessonCompleted — user finishes a grammar lesson
      → For each word involved: inputMode: reading, correct: true (exposure only)
      → Minimal scheduling credit but establishes awareness
   2. onQuizAnswered — user answers a grammar quiz question about a specific word
      → inputMode: typing (grammar quizzes require typed answers)
      → Full production credit
   
   Grammar lessons bridge conceptual understanding to word-level knowledge.
   Completing a lesson about "dative case" updates both the individual word
   records AND the "dative-case" GrammarConceptMastery record.
============================================================================= */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { WordKnowledgeRecord } from "../types";
import { processReview } from "../process-review";

/**
 * Adapter: Grammar Lessons/Quizzes → processReview
 */
export const GrammarAdapter = {
  /**
   * Called when a grammar lesson is completed (user read/studied the material).
   *
   * For each word involved in the lesson, this creates a passive exposure event.
   * This is the weakest form of review but establishes that the user has been
   * introduced to the word in a grammatical context.
   *
   * @param conceptTag - Grammar concept covered (e.g. "konjunktiv2")
   * @param wordsInvolved - Word IDs that appeared in the lesson
   * @param sessionId - Lesson session ID
   */
  async onLessonCompleted(
    supabase: SupabaseClient,
    userId: string,
    conceptTag: string,
    wordsInvolved: string[],
    sessionId: string,
  ): Promise<WordKnowledgeRecord[]> {
    const results: WordKnowledgeRecord[] = [];

    // Ensure all words are tagged with this grammar concept
    await tagAllWords(supabase, userId, wordsInvolved, conceptTag);

    // Process each word as a passive reading exposure
    for (const wordId of wordsInvolved) {
      const result = await processReview(supabase, {
        userId,
        wordId,
        moduleSource: "grammar",
        inputMode: "reading", // Exposure only — reading lesson material
        correct: true, // Completing a lesson counts as correct exposure
        responseTimeMs: 0,
        sessionId,
      });

      if (result) {
        results.push(result);
      }
    }

    return results;
  },

  /**
   * Called when a grammar quiz question is answered.
   *
   * Grammar quizzes require typed answers (e.g. "conjugate 'gehen' in
   * Konjunktiv II"), so they map to inputMode: typing with full production
   * credit.
   *
   * @param conceptTag - Grammar concept being tested
   * @param correct - Whether the answer was correct
   * @param responseTimeMs - Time to respond
   * @param sessionId - Quiz session ID
   */
  async onQuizAnswered(
    supabase: SupabaseClient,
    userId: string,
    wordId: string,
    conceptTag: string,
    correct: boolean,
    responseTimeMs: number,
    sessionId: string,
  ): Promise<WordKnowledgeRecord | null> {
    // Ensure the word is tagged with this grammar concept
    await tagWord(supabase, userId, wordId, conceptTag);

    return processReview(supabase, {
      userId,
      wordId,
      moduleSource: "grammar",
      inputMode: "typing", // Grammar quizzes are typed
      correct,
      responseTimeMs,
      sessionId,
    });
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function tagWord(
  supabase: SupabaseClient,
  userId: string,
  wordId: string,
  tag: string,
): Promise<void> {
  const normalizedTag = tag.toLowerCase().trim();
  if (!normalizedTag) return;

  const { data } = await supabase
    .from("user_words")
    .select("tags")
    .eq("id", wordId)
    .eq("user_id", userId)
    .single();

  if (!data) return;

  const currentTags: string[] = data.tags ?? [];
  if (currentTags.includes(normalizedTag)) return;

  await supabase
    .from("user_words")
    .update({
      tags: [...currentTags, normalizedTag],
      updated_at: new Date().toISOString(),
    })
    .eq("id", wordId)
    .eq("user_id", userId);
}

async function tagAllWords(
  supabase: SupabaseClient,
  userId: string,
  wordIds: string[],
  tag: string,
): Promise<void> {
  for (const wordId of wordIds) {
    await tagWord(supabase, userId, wordId, tag);
  }
}
