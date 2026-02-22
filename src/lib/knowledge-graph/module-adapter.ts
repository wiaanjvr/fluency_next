/* =============================================================================
   PROPEL MODULE ADAPTER — Sync hooks for each Propel module
   
   Each Propel module calls its adapter's onSessionComplete() when a practice
   session ends. The adapter converts module-specific results into universal
   ReviewEvents and feeds them into the recordReview system.
   
   Modules stay decoupled from the core engine — they only interact through
   this adapter interface.
============================================================================= */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { WordRating } from "@/types";
import type {
  ModuleSource,
  ReviewEvent,
  ReviewResult,
  PropelModuleAdapter,
  PropelSessionResult,
} from "@/types/knowledge-graph";
import { recordReviewBatch } from "./record-review";

// ---------------------------------------------------------------------------
// Base adapter factory
// ---------------------------------------------------------------------------

/**
 * Create an adapter for any Propel module. The adapter converts session
 * results into universal ReviewEvents and processes them through the
 * knowledge-graph recordReview pipeline.
 */
export function createModuleAdapter(
  supabase: SupabaseClient,
  userId: string,
  moduleSource: ModuleSource,
): PropelModuleAdapter {
  return {
    moduleSource,

    async onSessionComplete(
      results: PropelSessionResult[],
    ): Promise<ReviewResult[]> {
      const events: ReviewEvent[] = results.map((r) => ({
        wordId: r.wordId,
        moduleSource,
        correct: r.correct,
        responseTimeMs: r.responseTimeMs,
        rating: r.rating,
      }));

      return recordReviewBatch(supabase, userId, events);
    },
  };
}

// ---------------------------------------------------------------------------
// Pre-built adapters for each module
// ---------------------------------------------------------------------------

/**
 * Flashcard adapter.
 * Flashcards use FSRS internally (rating 1-4), but the universal system
 * uses SM-2 (rating 0-5). This adapter maps between them.
 */
export function createFlashcardAdapter(
  supabase: SupabaseClient,
  userId: string,
): PropelModuleAdapter {
  return {
    moduleSource: "flashcards",

    async onSessionComplete(
      results: PropelSessionResult[],
    ): Promise<ReviewResult[]> {
      const events: ReviewEvent[] = results.map((r) => ({
        wordId: r.wordId,
        moduleSource: "flashcards" as ModuleSource,
        correct: r.correct,
        responseTimeMs: r.responseTimeMs,
        // Map FSRS 1-4 → SM-2 0-5 if an explicit rating was provided
        rating: r.rating ? mapFsrsToSm2(r.rating) : undefined,
      }));

      return recordReviewBatch(supabase, userId, events);
    },
  };
}

/**
 * Cloze exercise adapter.
 * Cloze exercises require typed production, so they get a higher production
 * weight automatically through the PRODUCTION_WEIGHTS table.
 */
export function createClozeAdapter(
  supabase: SupabaseClient,
  userId: string,
): PropelModuleAdapter {
  return createModuleAdapter(supabase, userId, "cloze");
}

/**
 * Conjugation drill adapter.
 * Highest production weight — requires typing the correct conjugated form.
 */
export function createConjugationAdapter(
  supabase: SupabaseClient,
  userId: string,
): PropelModuleAdapter {
  return createModuleAdapter(supabase, userId, "conjugation");
}

/**
 * Pronunciation / Mimic Method adapter.
 * Updates pronunciation_score in addition to standard SRS fields.
 */
export function createPronunciationAdapter(
  supabase: SupabaseClient,
  userId: string,
): PropelModuleAdapter {
  return createModuleAdapter(supabase, userId, "pronunciation");
}

/**
 * Grammar exercise adapter.
 * Lower production weight (conceptual knowledge) but still contributes.
 */
export function createGrammarAdapter(
  supabase: SupabaseClient,
  userId: string,
): PropelModuleAdapter {
  return createModuleAdapter(supabase, userId, "grammar");
}

/**
 * Free reading adapter.
 * Lowest production weight — pure passive exposure. Words "seen" during
 * reading still count as exposure and refresh their SRS interval if due.
 */
export function createFreeReadingAdapter(
  supabase: SupabaseClient,
  userId: string,
): PropelModuleAdapter {
  return createModuleAdapter(supabase, userId, "free_reading");
}

/**
 * Foundation (A0 learning) adapter.
 */
export function createFoundationAdapter(
  supabase: SupabaseClient,
  userId: string,
): PropelModuleAdapter {
  return createModuleAdapter(supabase, userId, "foundation");
}

/**
 * Story engine adapter — used by the main comprehensible input engine
 * when the user rates words during story interaction.
 */
export function createStoryEngineAdapter(
  supabase: SupabaseClient,
  userId: string,
): PropelModuleAdapter {
  return createModuleAdapter(supabase, userId, "story_engine");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Map FSRS rating (1-4) to SM-2 rating (0-5).
 * FSRS: 1=Again, 2=Hard, 3=Good, 4=Easy
 * SM-2:  0=Blackout, 1=Wrong, 2=Hard, 3=Good, 4=Easy, 5=Perfect
 */
function mapFsrsToSm2(fsrsRating: WordRating): WordRating {
  const mapping: Record<number, WordRating> = {
    1: 1, // Again → Wrong
    2: 2, // Hard → Hard
    3: 3, // Good → Good
    4: 5, // Easy → Perfect
  };
  return mapping[fsrsRating] ?? 3;
}
