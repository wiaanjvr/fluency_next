/* =============================================================================
   GRAMMAR CONCEPT MASTERY — Concept-Level Knowledge Tracking
   
   When a word tagged with grammar concepts (e.g. "konjunktiv2", "dative-case")
   is reviewed, this function updates the aggregate mastery score for each
   grammar concept the word belongs to.
   
   This is called transactionally by processReview — both the word-level and
   concept-level updates succeed or both roll back.
   
   The story engine reads GrammarConceptMastery to decide whether to include
   complex grammar structures in generated stories. For example, if the
   "konjunktiv2" mastery is below 0.3, the engine won't generate stories
   requiring subjunctive mood.
============================================================================= */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { InputMode, GrammarConceptMastery } from "./types";
import { GRAMMAR_MASTERY_WEIGHTS } from "./types";

// ---------------------------------------------------------------------------
// Core: updateGrammarConceptMastery
// ---------------------------------------------------------------------------

/**
 * Update grammar concept mastery for all tags on a reviewed word.
 *
 * Uses a weighted moving average:
 *   masteryScore = (masteryScore * exposureCount + reviewScore * weight)
 *                / (exposureCount + weight)
 *
 * where:
 *   - reviewScore = 1.0 if correct, 0.0 if incorrect
 *   - weight = inputMode weight from GRAMMAR_MASTERY_WEIGHTS
 *
 * This means:
 *   - A typed correct answer (weight=1.0) moves the score more than
 *     a multiple-choice correct answer (weight=0.6)
 *   - Early reviews have outsized effect (low exposureCount denominator)
 *   - The score naturally stabilizes as exposureCount grows
 *
 * @returns Array of concept tags that were updated
 */
export async function updateGrammarConceptMastery(
  supabase: SupabaseClient,
  userId: string,
  tags: string[],
  correct: boolean,
  inputMode: InputMode,
): Promise<string[]> {
  const updatedTags: string[] = [];
  const weight = GRAMMAR_MASTERY_WEIGHTS[inputMode];
  const reviewScore = correct ? 1.0 : 0.0;
  const now = new Date().toISOString();

  for (const tag of tags) {
    const normalizedTag = tag.toLowerCase().trim();
    if (!normalizedTag) continue;

    try {
      // Fetch or create the mastery record
      const { data: existing } = await supabase
        .from("grammar_concept_mastery")
        .select("*")
        .eq("user_id", userId)
        .eq("concept_tag", normalizedTag)
        .maybeSingle();

      if (existing) {
        // Update existing record with weighted moving average
        const currentScore = existing.mastery_score as number;
        const currentExposure = existing.exposure_count as number;

        const newScore =
          (currentScore * currentExposure + reviewScore * weight) /
          (currentExposure + weight);

        const { error } = await supabase
          .from("grammar_concept_mastery")
          .update({
            mastery_score: Math.round(newScore * 1000) / 1000, // 3 decimal places
            exposure_count: currentExposure + 1,
            last_updated: now,
          })
          .eq("user_id", userId)
          .eq("concept_tag", normalizedTag);

        if (error) {
          console.warn(
            `[updateGrammarConceptMastery] Update failed for "${normalizedTag}":`,
            error.message,
          );
          continue;
        }
      } else {
        // Create new record — first exposure
        // Initial mastery is just the weighted review score
        const initialScore = (reviewScore * weight) / weight; // simplifies to reviewScore

        const { error } = await supabase
          .from("grammar_concept_mastery")
          .insert({
            user_id: userId,
            concept_tag: normalizedTag,
            mastery_score: initialScore,
            exposure_count: 1,
            last_updated: now,
          });

        if (error) {
          console.warn(
            `[updateGrammarConceptMastery] Insert failed for "${normalizedTag}":`,
            error.message,
          );
          continue;
        }
      }

      updatedTags.push(normalizedTag);
    } catch (err) {
      console.error(
        `[updateGrammarConceptMastery] Unexpected error for "${normalizedTag}":`,
        err,
      );
    }
  }

  return updatedTags;
}

// ---------------------------------------------------------------------------
// Reader: getGrammarConceptMastery
// ---------------------------------------------------------------------------

/**
 * Fetch all grammar concept mastery records for a user.
 * Used by the story engine to decide which grammar structures to include.
 */
export async function getGrammarConceptMastery(
  supabase: SupabaseClient,
  userId: string,
): Promise<GrammarConceptMastery[]> {
  const { data, error } = await supabase
    .from("grammar_concept_mastery")
    .select("*")
    .eq("user_id", userId)
    .order("last_updated", { ascending: false });

  if (error || !data) return [];

  return data.map((row: Record<string, unknown>) => ({
    userId: row.user_id as string,
    conceptTag: row.concept_tag as string,
    masteryScore: row.mastery_score as number,
    exposureCount: row.exposure_count as number,
    lastUpdated: new Date(row.last_updated as string),
  }));
}

/**
 * Fetch mastery for a specific concept tag.
 */
export async function getConceptMastery(
  supabase: SupabaseClient,
  userId: string,
  conceptTag: string,
): Promise<GrammarConceptMastery | null> {
  const normalized = conceptTag.toLowerCase().trim();

  const { data, error } = await supabase
    .from("grammar_concept_mastery")
    .select("*")
    .eq("user_id", userId)
    .eq("concept_tag", normalized)
    .maybeSingle();

  if (error || !data) return null;

  return {
    userId: data.user_id as string,
    conceptTag: data.concept_tag as string,
    masteryScore: data.mastery_score as number,
    exposureCount: data.exposure_count as number,
    lastUpdated: new Date(data.last_updated as string),
  };
}
