/* =============================================================================
   SYNC LEARNER WORDS — Bridge between user_words and learner_words_v2

   The dashboard reads vocabulary from `learner_words_v2`, but Propel modules
   write to `user_words`. This module ensures every review event is mirrored
   into `learner_words_v2` so the dashboard always reflects the latest state.

   Called automatically by recordReview() after updating user_words.
============================================================================= */

import type { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Status mapping: user_words → learner_words_v2
// ---------------------------------------------------------------------------

/**
 * Map user_words status values to learner_words_v2 status values.
 *
 * user_words:       'new' | 'learning' | 'known' | 'mastered'
 * learner_words_v2: 'introduced' | 'learning' | 'mastered'
 *
 * 'known' doesn't exist in learner_words_v2, so we map it to 'mastered'
 * (the closest equivalent — the user has demonstrated recall).
 */
function mapStatus(
  userWordsStatus: string,
): "introduced" | "learning" | "mastered" {
  switch (userWordsStatus) {
    case "new":
      return "introduced";
    case "learning":
      return "learning";
    case "known":
    case "mastered":
      return "mastered";
    default:
      return "introduced";
  }
}

// ---------------------------------------------------------------------------
// Core sync function
// ---------------------------------------------------------------------------

interface SyncParams {
  userId: string;
  /** The word text (surface form) from user_words */
  word: string;
  /** The lemma from user_words (nullable) */
  lemma: string | null;
  /** The language code (e.g. 'fr') */
  language: string;
  /** user_words status: 'new' | 'learning' | 'known' | 'mastered' */
  status: string;
  /** Whether this review was correct */
  correct: boolean;
  /** Current repetitions count from user_words (acts as total_reviews) */
  repetitions: number;
  /** Current exposure_count from user_words */
  exposureCount: number;
  /** Native translation if available */
  nativeTranslation?: string | null;
}

/**
 * Upsert a word into learner_words_v2 after a Propel review event.
 *
 * If the word already exists (matched by user_id + lemma), updates its
 * status, review stats, and last_reviewed_at.
 *
 * If the word doesn't exist yet, inserts it with the current state.
 *
 * This is fire-and-forget — errors are logged but never block the review.
 */
export async function syncToLearnerWords(
  supabase: SupabaseClient,
  params: SyncParams,
): Promise<void> {
  const {
    userId,
    word,
    lemma,
    language,
    status,
    correct,
    repetitions,
    exposureCount,
    nativeTranslation,
  } = params;

  const effectiveLemma = lemma || word;
  const mappedStatus = mapStatus(status);
  const now = new Date().toISOString();

  try {
    // Check if the word already exists in learner_words_v2 for this language
    const { data: existing, error: fetchErr } = await supabase
      .from("learner_words_v2")
      .select("id, total_reviews, total_correct, correct_streak")
      .eq("user_id", userId)
      .eq("language", language)
      .eq("lemma", effectiveLemma)
      .maybeSingle();

    if (fetchErr) {
      console.warn(
        "[syncToLearnerWords] Failed to check existing word:",
        fetchErr.message,
      );
      return;
    }

    if (existing) {
      // --- UPDATE existing record ---
      const newTotalReviews = (existing.total_reviews ?? 0) + 1;
      const newTotalCorrect = (existing.total_correct ?? 0) + (correct ? 1 : 0);
      const newCorrectStreak = correct ? (existing.correct_streak ?? 0) + 1 : 0;

      const { error: updateErr } = await supabase
        .from("learner_words_v2")
        .update({
          status: mappedStatus,
          last_reviewed_at: now,
          total_reviews: newTotalReviews,
          total_correct: newTotalCorrect,
          correct_streak: newCorrectStreak,
        })
        .eq("id", existing.id);

      if (updateErr) {
        console.warn(
          "[syncToLearnerWords] Failed to update:",
          updateErr.message,
        );
      }
    } else {
      // --- INSERT new record ---
      const { error: insertErr } = await supabase
        .from("learner_words_v2")
        .insert({
          user_id: userId,
          language,
          word,
          lemma: effectiveLemma,
          translation: nativeTranslation || "",
          status: mappedStatus,
          last_reviewed_at: now,
          total_reviews: 1,
          total_correct: correct ? 1 : 0,
          correct_streak: correct ? 1 : 0,
        });

      if (insertErr) {
        // If there's a unique constraint violation (race condition), that's OK
        if (insertErr.code === "23505") {
          // Duplicate — another concurrent review already created it. Update instead.
          const { error: retryErr } = await supabase
            .from("learner_words_v2")
            .update({
              status: mappedStatus,
              last_reviewed_at: now,
              total_reviews: 1,
              total_correct: correct ? 1 : 0,
              correct_streak: correct ? 1 : 0,
            })
            .eq("user_id", userId)
            .eq("language", language)
            .eq("lemma", effectiveLemma);

          if (retryErr) {
            console.warn(
              "[syncToLearnerWords] Retry update failed:",
              retryErr.message,
            );
          }
        } else {
          console.warn(
            "[syncToLearnerWords] Failed to insert:",
            insertErr.message,
          );
        }
      }
    }
  } catch (err) {
    // Fire-and-forget — never block the review pipeline
    console.warn("[syncToLearnerWords] Unexpected error:", err);
  }
}
