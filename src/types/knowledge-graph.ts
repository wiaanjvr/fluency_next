/* =============================================================================
   KNOWLEDGE GRAPH TYPES
   
   Unified word knowledge model and cross-module integration types.
   Extends the existing UserWord / WordInteraction types with knowledge-graph
   fields used by the Propel ↔ Engine integration layer.
============================================================================= */

import type { WordStatus, WordRating, UserWord } from "@/types";

// ---------------------------------------------------------------------------
// Module source enum — every place a word can be reviewed
// ---------------------------------------------------------------------------

export const MODULE_SOURCES = [
  "story_engine",
  "flashcards",
  "cloze",
  "conjugation",
  "pronunciation",
  "grammar",
  "free_reading",
  "foundation",
] as const;

export type ModuleSource = (typeof MODULE_SOURCES)[number];

// ---------------------------------------------------------------------------
// Production weight per module — higher = stronger signal of active recall
// ---------------------------------------------------------------------------

/** How much a correct answer in each module contributes to production_score */
export const PRODUCTION_WEIGHTS: Record<ModuleSource, number> = {
  story_engine: 2, // passive comprehension
  flashcards: 5, // active recall (flip mode is lower, type mode higher)
  cloze: 8, // typed production in context
  conjugation: 9, // typed production + grammar awareness
  pronunciation: 7, // spoken production
  grammar: 3, // conceptual, not direct word production
  free_reading: 1, // pure passive exposure
  foundation: 4, // guided practice
};

// ---------------------------------------------------------------------------
// Unified Word Knowledge — extends UserWord with KG fields
// ---------------------------------------------------------------------------

export interface UnifiedWord extends UserWord {
  /** Total times seen across ALL modules */
  exposure_count: number;

  /** Active production ability (0-100) */
  production_score: number;

  /** Pronunciation sub-score (0-100) */
  pronunciation_score: number;

  /** Grammar / semantic tags, e.g. ["subjunctive", "irregular", "dative"] */
  tags: string[];

  /** Controls when the story engine can introduce this word.
   *  Lower = easier to introduce. Grammar-lesson completion lowers this. */
  story_introduction_threshold: number;

  /** Which propel module last reviewed this word (null = only stories) */
  last_propel_module: ModuleSource | null;

  /** When the last propel review happened */
  last_propel_review_at: string | null;
}

// ---------------------------------------------------------------------------
// Review event — input to the universal recordReview function
// ---------------------------------------------------------------------------

export interface ReviewEvent {
  wordId: string;
  moduleSource: ModuleSource;
  correct: boolean;
  responseTimeMs?: number;
  /** Optional explicit SM-2 rating (0-5). If omitted, derived from correct + responseTime */
  rating?: WordRating;

  // ── ML event pipeline fields (optional — backward-compatible) ──────
  /** Active session ID. When provided, an InteractionEvent is emitted automatically. */
  sessionId?: string;
  /** Input mode used for this interaction. Required if sessionId is set. */
  inputMode?: import("./ml-events").InputMode;
  /** Grammar concept ID, if this review is grammar-related */
  grammarConceptId?: string;
  /** Story complexity level (only for story_engine events) */
  storyComplexityLevel?: number;
}

// ---------------------------------------------------------------------------
// Review result — returned after processing a review
// ---------------------------------------------------------------------------

export interface ReviewResult {
  wordId: string;
  moduleSource: ModuleSource;
  correct: boolean;
  responseTimeMs?: number;

  /** Updated SRS state */
  newEaseFactor: number;
  newInterval: number;
  newRepetitions: number;
  newStatus: WordStatus;
  newNextReview: string;

  /** Updated knowledge-graph metrics */
  newExposureCount: number;
  newProductionScore: number;
  newPronunciationScore: number;
}

// ---------------------------------------------------------------------------
// Module review history row — mirrors the DB table
// ---------------------------------------------------------------------------

export interface ModuleReviewHistoryRow {
  id: string;
  user_id: string;
  word_id: string;
  module_source: ModuleSource;
  correct: boolean;
  response_time_ms: number | null;
  rating: number | null;
  ease_factor_after: number | null;
  interval_after: number | null;
  repetitions_after: number | null;
  status_after: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Story word selection
// ---------------------------------------------------------------------------

export interface StoryWordSelection {
  /** Words the user already knows well (95% of total) */
  knownWords: UnifiedWord[];
  /** Words due for SRS review — subset of knownWords prioritized */
  reviewWords: UnifiedWord[];
  /** Brand-new or recently-drilled words to introduce (≤5% of total) */
  newWords: UnifiedWord[];
  /** Combined flat list for the story prompt */
  allWords: UnifiedWord[];
  /** Metadata about the selection */
  meta: {
    totalRequested: number;
    knownPercentage: number;
    recentlyDrilledCount: number;
  };
}

// ---------------------------------------------------------------------------
// Propel recommendation
// ---------------------------------------------------------------------------

export type PropelModule =
  | "flashcards"
  | "cloze"
  | "conjugation"
  | "pronunciation"
  | "grammar"
  | "free_reading";

export interface PropelRecommendation {
  module: PropelModule;
  reason: string;
  targetWords: string[]; // word IDs
  priority: number; // 0-100, higher = more urgent
}

// ---------------------------------------------------------------------------
// Grammar unlock event
// ---------------------------------------------------------------------------

export interface GrammarUnlockEvent {
  id: string;
  user_id: string;
  grammar_tag: string;
  lesson_id: string | null;
  words_unlocked: number;
  previous_threshold: number | null;
  new_threshold: number | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Propel module adapter interface — every module implements this
// ---------------------------------------------------------------------------

export interface PropelSessionResult {
  wordId: string;
  correct: boolean;
  responseTimeMs?: number;
  /** Optional explicit rating override */
  rating?: WordRating;
}

export interface PropelModuleAdapter {
  /** The module source identifier */
  readonly moduleSource: ModuleSource;

  /** Called when a session ends, passing results into the universal review system */
  onSessionComplete(results: PropelSessionResult[]): Promise<ReviewResult[]>;
}

// ---------------------------------------------------------------------------
// Knowledge graph analytics — aggregate stats
// ---------------------------------------------------------------------------

export interface KnowledgeGraphStats {
  totalWords: number;
  dueForReview: number;
  averageProductionScore: number;
  averagePronunciationScore: number;
  weakGrammarTags: Array<{ tag: string; avgScore: number; wordCount: number }>;
  moduleBreakdown: Record<ModuleSource, number>; // review count per module
  readyForStories: number; // words that pass threshold
}
