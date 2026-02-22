/* =============================================================================
   UNIFIED KNOWLEDGE SYSTEM — Types
   
   Single source of truth for vocabulary state across ALL modules.
   These types implement the WordKnowledgeRecord and related contracts
   from the unified knowledge specification.
   
   Scores use 0–1 scale internally. The DB stores production_score and
   pronunciation_score as 0–100 integers (legacy); the process-review layer
   normalizes when reading/writing.
============================================================================= */

// ---------------------------------------------------------------------------
// Module & Input Mode Enums
// ---------------------------------------------------------------------------

export const MODULE_SOURCES = [
  "story",
  "anki",
  "cloze",
  "conjugation",
  "pronunciation",
  "grammar",
] as const;

export type ModuleSource = (typeof MODULE_SOURCES)[number];

export const INPUT_MODES = [
  "multipleChoice",
  "typing",
  "speaking",
  "reading",
] as const;

export type InputMode = (typeof INPUT_MODES)[number];

// ---------------------------------------------------------------------------
// WordKnowledgeRecord — The unified word state
// ---------------------------------------------------------------------------

export interface WordKnowledgeRecord {
  wordId: string;
  userId: string;
  targetWord: string;
  nativeTranslation: string;

  // FSRS / SM-2 scheduling fields
  interval: number;
  easeFactor: number;
  dueDate: Date;
  repetitions: number;

  // Multi-dimensional scoring (all 0–1)
  recognitionScore: number; // passive, multiple choice performance
  productionScore: number; // active, typing performance
  pronunciationScore: number; // STT accuracy
  contextualUsageScore: number; // correct usage in story/sentence context

  // History
  exposureCount: number;
  moduleHistory: ModuleReviewEvent[];

  // Grammar
  tags: string[];

  // Status
  status: string;
  lastReviewed: Date | null;
}

// ---------------------------------------------------------------------------
// ModuleReviewEvent — a single review logged across modules
// ---------------------------------------------------------------------------

export interface ModuleReviewEvent {
  id: string;
  moduleSource: ModuleSource;
  timestamp: Date;
  correct: boolean;
  responseTimeMs: number | null;
  inputMode: InputMode | null;
  sessionId: string | null;
  eventId: string | null;
}

// ---------------------------------------------------------------------------
// GrammarConceptMastery — concept-level mastery across words
// ---------------------------------------------------------------------------

export interface GrammarConceptMastery {
  userId: string;
  conceptTag: string;
  masteryScore: number; // 0–1 aggregate across all words with this tag
  exposureCount: number;
  lastUpdated: Date;
}

// ---------------------------------------------------------------------------
// processReview input params
// ---------------------------------------------------------------------------

export interface ProcessReviewParams {
  userId: string;
  wordId: string;
  moduleSource: ModuleSource;
  inputMode: InputMode;
  correct: boolean;
  responseTimeMs: number;
  sessionId: string;
  /** Optional unique event ID for idempotency. Auto-generated if omitted. */
  eventId?: string;
  /** Optional Anki interval weight override (e.g. 0.5 for Hard, 1.2 for Easy) */
  intervalWeightOverride?: number;
}

// ---------------------------------------------------------------------------
// WordPresentationContext — returned by getWordStateForModule
// ---------------------------------------------------------------------------

export interface WordPresentationContext {
  isNew: boolean; // never seen anywhere
  recognitionEstablished: boolean; // recognitionScore > 0.6
  productionEstablished: boolean; // productionScore > 0.6
  lastReviewedModule: ModuleSource | null;
  lastReviewedAt: Date | null;
  reviewedTodayInOtherModule: boolean; // reviewed in a different module today
  suggestedDifficulty: "scaffold" | "standard" | "challenge";
  shouldSkip: boolean; // reviewed < 2 hours ago in any module
}

// ---------------------------------------------------------------------------
// Event bus
// ---------------------------------------------------------------------------

export interface WordReviewedEvent {
  userId: string;
  wordId: string;
  moduleSource: ModuleSource;
  inputMode: InputMode;
  correct: boolean;
  responseTimeMs: number;
  sessionId: string;
  updatedRecord: WordKnowledgeRecord;
  grammarConceptsUpdated: string[];
  timestamp: Date;
}

export type EventHandler<T> = (event: T) => void | Promise<void>;

// ---------------------------------------------------------------------------
// Interval Credit Weights — how much scheduling credit each inputMode gets
// ---------------------------------------------------------------------------

/**
 * When a user answers correctly, the FSRS interval is multiplied by this
 * weight before being applied. This reflects how strong a signal each
 * interaction mode provides:
 *
 * - multipleChoice (0.6): Recognition only — weaker evidence of retention.
 *   Getting a multiple-choice right doesn't prove productive ability.
 * - typing (1.0): Full credit — demonstrates active recall and production.
 * - speaking (1.0): Full credit — active production via mouth, strong signal.
 * - reading (0.3): Passive exposure only — seeing a word in a story context
 *   proves very little about retention. Minimal scheduling credit.
 */
export const INTERVAL_CREDIT_WEIGHTS: Record<InputMode, number> = {
  multipleChoice: 0.6,
  typing: 1.0,
  speaking: 1.0,
  reading: 0.3,
};

// ---------------------------------------------------------------------------
// Score Delta Tables — how each inputMode changes knowledge dimensions
// ---------------------------------------------------------------------------

/**
 * Score deltas applied on a CORRECT answer, keyed by inputMode.
 *
 * Design rationale:
 * - multipleChoice only proves recognition (passive) — no production credit.
 * - typing proves both recognition + production (you must recall the word).
 * - speaking proves recognition + production + pronunciation.
 * - reading (story context) proves recognition + contextual understanding,
 *   but is fully passive — zero production credit.
 */
export const CORRECT_SCORE_DELTAS: Record<
  InputMode,
  {
    recognitionScore: number;
    productionScore: number;
    pronunciationScore: number;
    contextualUsageScore: number;
  }
> = {
  multipleChoice: {
    recognitionScore: 0.08,
    productionScore: 0.0,
    pronunciationScore: 0.0,
    contextualUsageScore: 0.0,
  },
  typing: {
    recognitionScore: 0.06,
    productionScore: 0.08,
    pronunciationScore: 0.0,
    contextualUsageScore: 0.0,
  },
  speaking: {
    recognitionScore: 0.04,
    productionScore: 0.04,
    pronunciationScore: 0.1,
    contextualUsageScore: 0.0,
  },
  reading: {
    recognitionScore: 0.03,
    productionScore: 0.0,
    pronunciationScore: 0.0,
    contextualUsageScore: 0.06,
  },
};

/**
 * Score deltas applied on any INCORRECT answer (regardless of inputMode).
 *
 * Design rationale:
 * - Getting a word wrong anywhere should lower confidence scores.
 * - We never penalize pronunciationScore on non-speaking tasks — the user
 *   didn't attempt pronunciation, so silence is not evidence of inability.
 * - Penalties are moderate (0.05) to avoid one bad day destroying weeks
 *   of progress.
 */
export const INCORRECT_SCORE_DELTAS = {
  recognitionScore: -0.05,
  productionScore: -0.05,
  pronunciationScore: 0.0, // never penalize on non-speaking tasks
  contextualUsageScore: 0.0,
};

// ---------------------------------------------------------------------------
// Grammar concept mastery input-mode weights
// ---------------------------------------------------------------------------

/**
 * Weight of a review toward grammar concept mastery, by inputMode.
 * Higher = stronger signal of grammatical understanding.
 * Uses the same scale as interval credit weights (production-weighted).
 */
export const GRAMMAR_MASTERY_WEIGHTS: Record<InputMode, number> = {
  multipleChoice: 0.6,
  typing: 1.0,
  speaking: 1.0,
  reading: 0.3,
};

// ---------------------------------------------------------------------------
// DB ↔ Application layer mapping helpers
// ---------------------------------------------------------------------------

/**
 * Maps a DB row from user_words to a WordKnowledgeRecord.
 * Handles the 0–100 → 0–1 normalization for production_score and
 * pronunciation_score (legacy columns).
 */
export function dbRowToWordRecord(
  row: Record<string, unknown>,
  moduleHistory: ModuleReviewEvent[] = [],
): WordKnowledgeRecord {
  return {
    wordId: row.id as string,
    userId: row.user_id as string,
    targetWord: (row.word as string) ?? "",
    nativeTranslation: (row.native_translation as string) ?? "",

    interval: (row.interval as number) ?? 0,
    easeFactor: (row.ease_factor as number) ?? 2.5,
    dueDate: new Date((row.next_review as string) ?? new Date().toISOString()),
    repetitions: (row.repetitions as number) ?? 0,

    // recognition_score and contextual_usage_score stored as 0–1 REAL
    recognitionScore: (row.recognition_score as number) ?? 0,
    contextualUsageScore: (row.contextual_usage_score as number) ?? 0,

    // production_score and pronunciation_score stored as 0–100 INTEGER (legacy)
    // Normalize to 0–1 for the application layer
    productionScore: ((row.production_score as number) ?? 0) / 100,
    pronunciationScore: ((row.pronunciation_score as number) ?? 0) / 100,

    exposureCount: (row.exposure_count as number) ?? 0,
    moduleHistory,
    tags: (row.tags as string[]) ?? [],
    status: (row.status as string) ?? "new",
    lastReviewed: row.last_reviewed
      ? new Date(row.last_reviewed as string)
      : null,
  };
}

/**
 * Converts application-layer 0–1 scores back to DB format.
 * production_score and pronunciation_score → 0–100 INTEGER
 * recognition_score and contextual_usage_score → 0–1 REAL (stored directly)
 */
export function wordRecordToDbUpdate(
  record: WordKnowledgeRecord,
): Record<string, unknown> {
  return {
    ease_factor: record.easeFactor,
    repetitions: record.repetitions,
    interval: record.interval,
    next_review: record.dueDate.toISOString(),
    status: record.status,
    last_reviewed: new Date().toISOString(),
    updated_at: new Date().toISOString(),

    recognition_score: record.recognitionScore,
    contextual_usage_score: record.contextualUsageScore,
    // Scale 0–1 back to 0–100 for legacy columns
    production_score: Math.round(record.productionScore * 100),
    pronunciation_score: Math.round(record.pronunciationScore * 100),

    exposure_count: record.exposureCount,
    tags: record.tags,
  };
}
