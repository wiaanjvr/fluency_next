// ============================================================================
// FSRS-4.5 — Spaced Repetition Scheduling Algorithm
// Pure TypeScript implementation. No external dependencies.
// ============================================================================

import type { Rating, CardState } from "@/types/flashcards";

// FSRS-4.5 constants
const DECAY = -0.5;
const FACTOR = 0.9 ** (1 / DECAY) - 1;

export interface FSRSCard {
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: CardState;
  due: Date;
  last_review: Date | null;
}

export interface SchedulingResult {
  card: FSRSCard;
  scheduled_days: number;
  due: Date;
}

// ---------------------------------------------------------------------------
// Retrievability: probability of recall given elapsed days and stability
// ---------------------------------------------------------------------------
export function retrievability(
  elapsed_days: number,
  stability: number,
): number {
  if (stability <= 0) return 0;
  return (1 + FACTOR * (elapsed_days / stability)) ** DECAY;
}

// ---------------------------------------------------------------------------
// Initial difficulty based on first rating
// ---------------------------------------------------------------------------
function initDifficulty(rating: Rating): number {
  const base = [0, 7.2224, 6.3804, 4.9685, 2.9898][rating];
  const offset = [0, 0.8051, 0.2428, 0, -0.2901][rating];
  return Math.min(Math.max(base + offset, 1), 10);
}

// ---------------------------------------------------------------------------
// Initial stability based on first rating
// ---------------------------------------------------------------------------
function initStability(rating: Rating): number {
  return [0, 2.1013, 1.3934, 3.1262, 16.4182][rating];
}

// ---------------------------------------------------------------------------
// Difficulty after review
// ---------------------------------------------------------------------------
function nextDifficulty(d: number, rating: Rating): number {
  const delta = [0, 0.2, 0.15, 0, -0.15][rating];
  return Math.min(Math.max(d + delta * (10 - d), 1), 10);
}

// ---------------------------------------------------------------------------
// Stability after successful recall
// ---------------------------------------------------------------------------
function nextStabilityRecall(
  d: number,
  s: number,
  r: number,
  rating: Rating,
): number {
  const hardPenalty = rating === 2 ? 0.8 : 1;
  const easyBonus = rating === 4 ? 1.3 : 1;
  return (
    s *
    (Math.exp(0.7) *
      (11 - d) *
      s ** -0.228 *
      (Math.exp((1 - r) * 2.3) - 1) *
      hardPenalty *
      easyBonus +
      1)
  );
}

// ---------------------------------------------------------------------------
// Stability after forgetting
// ---------------------------------------------------------------------------
function nextStabilityForgetting(d: number, s: number, r: number): number {
  return (
    (0.2996 * d ** -0.2946 * s ** -0.1344 * Math.exp((1 - r) * 2.2698) -
      1 +
      1) **
    0.8
  );
}

// ---------------------------------------------------------------------------
// Compute the next interval preview for a given rating (for button labels)
// ---------------------------------------------------------------------------
export function previewInterval(
  card: FSRSCard,
  rating: Rating,
  now: Date,
): number {
  const result = scheduleCard(card, rating, now);
  return result.scheduled_days;
}

// ---------------------------------------------------------------------------
// Format interval as human-readable string
// ---------------------------------------------------------------------------
export function formatInterval(days: number): string {
  if (days <= 0) return "now";
  if (days === 1) return "1d";
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${(days / 365).toFixed(1)}y`;
}

// ---------------------------------------------------------------------------
// Main scheduling function
// ---------------------------------------------------------------------------
export function scheduleCard(
  card: FSRSCard,
  rating: Rating,
  now: Date,
): SchedulingResult {
  let { stability, difficulty, reps, lapses, state } = card;
  const elapsed = card.last_review
    ? Math.max(
        Math.round((now.getTime() - card.last_review.getTime()) / 86400000),
        0,
      )
    : 0;

  if (state === "new") {
    stability = initStability(rating);
    difficulty = initDifficulty(rating);
    state = rating === 1 ? "learning" : "review";
    reps = 1;
  } else {
    const r = retrievability(elapsed, stability);
    difficulty = nextDifficulty(difficulty, rating);
    if (rating === 1) {
      stability = nextStabilityForgetting(difficulty, stability, r);
      lapses += 1;
      state = "relearning";
      reps = 0;
    } else {
      stability = nextStabilityRecall(difficulty, stability, r, rating);
      state = "review";
      reps += 1;
    }
  }

  // Calculate next interval in days
  const interval =
    rating === 1
      ? 0 // show again today
      : Math.round((stability * Math.log(0.9)) / Math.log(0.9));

  const due = new Date(now);
  due.setDate(due.getDate() + Math.max(interval, 1));

  return {
    card: {
      ...card,
      stability,
      difficulty,
      elapsed_days: elapsed,
      scheduled_days: interval,
      reps,
      lapses,
      state,
      due,
      last_review: now,
    },
    scheduled_days: interval,
    due,
  };
}

// ---------------------------------------------------------------------------
// Convert DB row to FSRSCard for scheduling
// ---------------------------------------------------------------------------
export function dbRowToFSRSCard(row: {
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: string;
  due: string;
  last_review: string | null;
}): FSRSCard {
  return {
    stability: row.stability,
    difficulty: row.difficulty,
    elapsed_days: row.elapsed_days,
    scheduled_days: row.scheduled_days,
    reps: row.reps,
    lapses: row.lapses,
    state: row.state as CardState,
    due: new Date(row.due),
    last_review: row.last_review ? new Date(row.last_review) : null,
  };
}

// ---------------------------------------------------------------------------
// Convert FSRSCard back to DB-compatible fields
// ---------------------------------------------------------------------------
export function fsrsCardToDbFields(card: FSRSCard) {
  return {
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    due: card.due.toISOString(),
    last_review: card.last_review ? card.last_review.toISOString() : null,
  };
}
