/**
 * @deprecated SM-2 v1 — DEPRECATED. Use the Knowledge Graph pipeline instead:
 *   - Reviews: `recordReview()` / `recordReviewBatch()` from `@/lib/knowledge-graph`
 *   - SRS algorithm: `@/lib/srs/algorithm.ts` (SM-2 v2, 0–5 scale)
 *   - Flashcard scheduling: `@/lib/fsrs.ts` (FSRS-4.5)
 *   - Stage helpers: `getLearnerStage` / `stageToContentType` moved to `@/lib/learner-stage.ts`
 *
 * This module and the `user_vocab` table it targets are superseded by the
 * `user_words` + `learner_words_v2` tables managed by the KG pipeline.
 * Retained temporarily for the legacy `/api/review` route and `generate.ts`.
 *
 * Original SM-2 v1 Rating scale (simplified):
 *   0 — forgot (complete failure)
 *   1 — hard   (correct with difficulty)
 *   2 — easy   (confident recall)
 *
 * Status transitions:
 *   'unseen'   → 'learning'  (on first review)
 *   'learning' → 'known'     (interval ≥ 21 days AND repetitions ≥ 5)
 *   'known'    → 'learning'  (on rating 0, reset)
 */

// ─── Types ───────────────────────────────────────────────────────────────────

/** @deprecated Use SM-2 v2 (0–5 scale) from `@/lib/srs/algorithm.ts` instead. */
export type ReviewRating = 0 | 1 | 2;

/** @deprecated Use `user_words.status` ('new' | 'learning' | 'familiar' | 'learned') instead. */
export type VocabStatus = "unseen" | "learning" | "known";

/** @deprecated Use `user_words` row shape from the KG pipeline instead. */
export interface SrsState {
  status: VocabStatus;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  next_review_at: Date;
}

/** @deprecated Use `recordReview()` from `@/lib/knowledge-graph` which handles persistence. */
export interface SrsUpdate {
  status: VocabStatus;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  next_review_at: Date;
  last_reviewed_at: Date;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MIN_EASE_FACTOR = 1.3;
const DEFAULT_EASE_FACTOR = 2.5;
const DEFAULT_INTERVAL_DAYS = 1;
const KNOWN_INTERVAL_THRESHOLD = 21;
const KNOWN_REP_THRESHOLD = 5;

// ─── Core Algorithm ──────────────────────────────────────────────────────────

/**
 * @deprecated Use `recordReview()` from `@/lib/knowledge-graph` instead.
 * Apply a single SM-2 v1 review to the current SRS state.
 *
 * This is a **pure function** — it never mutates inputs and has no side-effects.
 */
export function applyReview(
  current: SrsState,
  rating: ReviewRating,
): SrsUpdate {
  const now = new Date();

  let easeFactor = current.ease_factor;
  let intervalDays = current.interval_days;
  let repetitions = current.repetitions;
  let status: VocabStatus =
    current.status === "unseen" ? "learning" : current.status;

  switch (rating) {
    case 0: {
      // ── Forgot: reset progress ──────────────────────────────────────────
      intervalDays = 1;
      repetitions = 0;
      status = "learning";
      // ease_factor stays unchanged per spec
      break;
    }

    case 1: {
      // ── Hard: advance, but penalise ease ────────────────────────────────
      intervalDays = Math.round(intervalDays * easeFactor);
      easeFactor = Math.max(MIN_EASE_FACTOR, easeFactor - 0.15);
      repetitions += 1;
      break;
    }

    case 2: {
      // ── Easy: advance with bonus ────────────────────────────────────────
      intervalDays = Math.round(intervalDays * easeFactor);
      easeFactor += 0.1;
      repetitions += 1;
      break;
    }
  }

  // ── Promote to 'known' when thresholds met ──────────────────────────────
  if (
    status === "learning" &&
    intervalDays >= KNOWN_INTERVAL_THRESHOLD &&
    repetitions >= KNOWN_REP_THRESHOLD
  ) {
    status = "known";
  }

  // ── Compute next review timestamp ───────────────────────────────────────
  const next_review_at = new Date(now.getTime() + intervalDays * 86_400_000);

  return {
    status,
    ease_factor: easeFactor,
    interval_days: intervalDays,
    repetitions,
    next_review_at,
    last_reviewed_at: now,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** @deprecated Use KG pipeline — words are auto-initialized in `user_words`. */
export function initialSrsState(): SrsState {
  return {
    status: "unseen",
    ease_factor: DEFAULT_EASE_FACTOR,
    interval_days: DEFAULT_INTERVAL_DAYS,
    repetitions: 0,
    next_review_at: new Date(),
  };
}

/** @deprecated Moved to `@/lib/learner-stage.ts`. This re-export will be removed. */
export function getLearnerStage(knownWordCount: number): 1 | 2 | 3 {
  if (knownWordCount < 50) return 1;
  if (knownWordCount < 500) return 2;
  return 3;
}

/** @deprecated Moved to `@/lib/learner-stage.ts`. This re-export will be removed. */
export function stageToContentType(
  stage: 1 | 2 | 3,
): "3_word" | "paragraph" | null {
  switch (stage) {
    case 1:
      return null; // Boot camp — no AI generation
    case 2:
      return "3_word";
    case 3:
      return "paragraph";
  }
}

/** Validate that a rating value is one of 0 | 1 | 2. */
export function isValidRating(value: unknown): value is ReviewRating {
  return value === 0 || value === 1 || value === 2;
}
