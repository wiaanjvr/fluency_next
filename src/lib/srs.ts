/**
 * SM-2 Spaced Repetition Algorithm — pure functions, fully typed.
 *
 * Rating scale (simplified):
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

/** Allowed user recall ratings. */
export type ReviewRating = 0 | 1 | 2;

/** Possible word statuses in the learning pipeline. */
export type VocabStatus = "unseen" | "learning" | "known";

/** The SRS fields that are stored per user-word pair. */
export interface SrsState {
  status: VocabStatus;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  next_review_at: Date;
}

/** The result of applying a review — same shape, ready to persist. */
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
 * Apply a single SM-2 review to the current SRS state.
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

/** Build a fresh SRS state for a word being studied for the first time. */
export function initialSrsState(): SrsState {
  return {
    status: "unseen",
    ease_factor: DEFAULT_EASE_FACTOR,
    interval_days: DEFAULT_INTERVAL_DAYS,
    repetitions: 0,
    next_review_at: new Date(),
  };
}

/** Determine the learner stage based on how many words they know. */
export function getLearnerStage(knownWordCount: number): 1 | 2 | 3 {
  if (knownWordCount < 50) return 1;
  if (knownWordCount < 500) return 2;
  return 3;
}

/** Map a numeric stage to the content-generation stage label. */
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
