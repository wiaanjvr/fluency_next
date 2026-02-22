// ============================================================================
// FSRS-4.5 — Spaced Repetition Scheduling Algorithm
// Pure TypeScript implementation. No external dependencies.
//
// Enhancements over vanilla FSRS:
//  - Learning steps (1min → 10min) for new/relearning cards
//  - Configurable desired retention (default 0.9)
//  - Backlog spread helper (overdue cards spread over N days)
// ============================================================================

import type { Rating, CardState, ScheduledCard } from "@/types/flashcards";

// FSRS-4.5 core constants
const DECAY = -0.5;
const FACTOR = 0.9 ** (1 / DECAY) - 1;

/** Desired retention — 90% probability of recall at next review */
const DESIRED_RETENTION = 0.9;

/** Learning steps in minutes for new cards: 1min → 10min → graduate */
const LEARNING_STEPS_MINUTES = [1, 10];

/** Relearning steps in minutes: 10min → graduate back to review */
const RELEARNING_STEPS_MINUTES = [10];

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
  /** Current learning step index (0-based). Only used for learning/relearning */
  learning_step?: number;
}

export interface SchedulingResult {
  card: FSRSCard;
  scheduled_days: number;
  due: Date;
  /** Whether the card should re-appear within the current session */
  showAgainInSession: boolean;
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
  return Math.max(
    (0.2996 * d ** -0.2946 * s ** -0.1344 * Math.exp((1 - r) * 2.2698) -
      1 +
      1) **
      0.8,
    0.01,
  );
}

// ---------------------------------------------------------------------------
// Calculate interval in days from stability and desired retention
// ---------------------------------------------------------------------------
function stabilityToInterval(stability: number): number {
  // interval = S * ((1/R)^(1/DECAY) - 1) / FACTOR
  // With R = 0.9, DECAY = -0.5: (1/0.9)^(-2) - 1 / FACTOR = 1 / FACTOR * FACTOR = 1
  // So interval ≈ stability for 0.9 retention. For other retentions:
  const interval =
    (stability / FACTOR) * (Math.pow(1 / DESIRED_RETENTION, 1 / DECAY) - 1);
  return Math.max(1, Math.round(interval));
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
// Format interval as human-readable string (supports sub-day intervals)
// ---------------------------------------------------------------------------
export function formatInterval(days: number): string {
  if (days <= 0) return "now";
  if (days < 1 / 24) {
    const mins = Math.round(days * 24 * 60);
    return mins <= 1 ? "1m" : `${mins}m`;
  }
  if (days < 1) {
    const hours = Math.round(days * 24);
    return `${hours}h`;
  }
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
  const learningStep = card.learning_step ?? 0;
  const elapsed = card.last_review
    ? Math.max(
        Math.round((now.getTime() - card.last_review.getTime()) / 86400000),
        0,
      )
    : 0;

  let showAgainInSession = false;

  // === NEW card ===
  if (state === "new") {
    stability = initStability(rating);
    difficulty = initDifficulty(rating);

    if (rating === 1) {
      // Again on new card → enter learning
      state = "learning";
      const stepMinutes = LEARNING_STEPS_MINUTES[0] ?? 1;
      const due = new Date(now.getTime() + stepMinutes * 60_000);
      showAgainInSession = true;
      return {
        card: {
          ...card,
          stability,
          difficulty,
          elapsed_days: 0,
          scheduled_days: 0,
          reps: 0,
          lapses: 0,
          state,
          due,
          last_review: now,
          learning_step: 0,
        },
        scheduled_days: 0,
        due,
        showAgainInSession,
      };
    }

    if (rating === 2) {
      // Hard on new → learning, but advance to step 1
      state = "learning";
      const stepMinutes = LEARNING_STEPS_MINUTES[1] ?? 10;
      const due = new Date(now.getTime() + stepMinutes * 60_000);
      showAgainInSession = true;
      return {
        card: {
          ...card,
          stability,
          difficulty,
          elapsed_days: 0,
          scheduled_days: 0,
          reps: 1,
          lapses: 0,
          state,
          due,
          last_review: now,
          learning_step: 1,
        },
        scheduled_days: 0,
        due,
        showAgainInSession,
      };
    }

    // Good or Easy → graduate immediately
    state = "review";
    reps = 1;
    const interval =
      rating === 4
        ? stabilityToInterval(stability) * 1.3
        : stabilityToInterval(stability);
    const roundedInterval = Math.max(1, Math.round(interval));
    const due = new Date(now);
    due.setDate(due.getDate() + roundedInterval);

    return {
      card: {
        ...card,
        stability,
        difficulty,
        elapsed_days: 0,
        scheduled_days: roundedInterval,
        reps,
        lapses: 0,
        state,
        due,
        last_review: now,
        learning_step: undefined,
      },
      scheduled_days: roundedInterval,
      due,
      showAgainInSession: false,
    };
  }

  // === LEARNING / RELEARNING card ===
  if (state === "learning" || state === "relearning") {
    const steps =
      state === "learning" ? LEARNING_STEPS_MINUTES : RELEARNING_STEPS_MINUTES;

    if (rating === 1) {
      // Again → reset to first step
      const stepMinutes = steps[0] ?? 1;
      const due = new Date(now.getTime() + stepMinutes * 60_000);
      showAgainInSession = true;
      return {
        card: {
          ...card,
          stability: card.stability,
          difficulty: card.difficulty,
          elapsed_days: elapsed,
          scheduled_days: 0,
          reps: 0,
          lapses: state === "relearning" ? lapses : lapses,
          state,
          due,
          last_review: now,
          learning_step: 0,
        },
        scheduled_days: 0,
        due,
        showAgainInSession,
      };
    }

    if (rating === 4) {
      // Easy → graduate immediately to review
      const r = retrievability(elapsed, stability || 1);
      difficulty = nextDifficulty(difficulty || 5, rating);
      stability =
        stability > 0
          ? nextStabilityRecall(difficulty, stability, r, rating)
          : initStability(rating);
      state = "review";
      reps += 1;
      const interval = Math.max(
        1,
        Math.round(stabilityToInterval(stability) * 1.3),
      );
      const due = new Date(now);
      due.setDate(due.getDate() + interval);
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
          learning_step: undefined,
        },
        scheduled_days: interval,
        due,
        showAgainInSession: false,
      };
    }

    // Good or Hard → advance to next learning step (or graduate)
    const nextStep = learningStep + 1;
    if (nextStep >= steps.length) {
      // Graduate to review
      const r = retrievability(elapsed, stability || 1);
      difficulty = nextDifficulty(difficulty || 5, rating);
      stability =
        stability > 0
          ? nextStabilityRecall(difficulty, stability, r, rating)
          : initStability(rating);
      state = "review";
      reps += 1;
      const interval = stabilityToInterval(stability);
      const due = new Date(now);
      due.setDate(due.getDate() + interval);
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
          learning_step: undefined,
        },
        scheduled_days: interval,
        due,
        showAgainInSession: false,
      };
    }

    // Still in learning — next step
    const stepMinutes = steps[nextStep] ?? 10;
    const due = new Date(now.getTime() + stepMinutes * 60_000);
    showAgainInSession = true;
    return {
      card: {
        ...card,
        stability: card.stability,
        difficulty: card.difficulty,
        elapsed_days: elapsed,
        scheduled_days: 0,
        reps,
        lapses,
        state,
        due,
        last_review: now,
        learning_step: nextStep,
      },
      scheduled_days: 0,
      due,
      showAgainInSession,
    };
  }

  // === REVIEW card ===
  const r = retrievability(elapsed, stability);
  difficulty = nextDifficulty(difficulty, rating);

  if (rating === 1) {
    // Forgot → relearning
    stability = nextStabilityForgetting(difficulty, stability, r);
    lapses += 1;
    state = "relearning";
    const stepMinutes = RELEARNING_STEPS_MINUTES[0] ?? 10;
    const due = new Date(now.getTime() + stepMinutes * 60_000);
    showAgainInSession = true;
    return {
      card: {
        ...card,
        stability,
        difficulty,
        elapsed_days: elapsed,
        scheduled_days: 0,
        reps: 0,
        lapses,
        state,
        due,
        last_review: now,
        learning_step: 0,
      },
      scheduled_days: 0,
      due,
      showAgainInSession,
    };
  }

  // Recalled → stay in review
  stability = nextStabilityRecall(difficulty, stability, r, rating);
  state = "review";
  reps += 1;

  const interval = stabilityToInterval(stability);
  const due = new Date(now);
  due.setDate(due.getDate() + interval);

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
      learning_step: undefined,
    },
    scheduled_days: interval,
    due,
    showAgainInSession: false,
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

// ---------------------------------------------------------------------------
// Backlog spread — evenly distribute overdue cards over `spreadDays` days
// ---------------------------------------------------------------------------
/**
 * When a user has a backlog of overdue cards, reviewing all of them in one
 * session is overwhelming. This function selects a proportional subset to
 * review today, with the rest spread evenly over `spreadDays` (default 3).
 *
 * Returns the cards to study today, sorted so the most overdue come first.
 */
export function spreadBacklog(
  allDueCards: ScheduledCard[],
  dailyLimit: number,
  spreadDays: number = 3,
): ScheduledCard[] {
  const now = Date.now();

  // Separate truly overdue (past due date) from due-today/future
  const overdue = allDueCards.filter(
    (c) => new Date(c.due).getTime() < now - 86400000,
  );
  const dueToday = allDueCards.filter(
    (c) => new Date(c.due).getTime() >= now - 86400000,
  );

  if (overdue.length === 0) {
    return dueToday.slice(0, dailyLimit);
  }

  // Sort overdue by how overdue they are (most overdue first → highest priority)
  overdue.sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime());

  // How many overdue cards to catch up per day
  const overduePerDay = Math.ceil(overdue.length / spreadDays);
  const todayOverdue = overdue.slice(0, overduePerDay);

  // Combine: overdue catch-up + today's new due, respect daily limit
  const combined = [...todayOverdue, ...dueToday];
  return combined.slice(0, dailyLimit);
}

// ---------------------------------------------------------------------------
// Build study queue respecting deck daily limits
// ---------------------------------------------------------------------------
/**
 * Build the study queue for a deck, respecting:
 *  - new_per_day: max new cards introduced today
 *  - review_per_day: max review cards today
 *  - Backlog spread over 3 days
 *
 * Learning/relearning cards always show (they're in-progress steps).
 */
export function buildStudyQueue(
  allSchedules: ScheduledCard[],
  newPerDay: number,
  reviewPerDay: number,
  newCardsStudiedToday: number = 0,
): ScheduledCard[] {
  const now = new Date();

  // 1. Separate by state
  const learningCards: ScheduledCard[] = [];
  const newCards: ScheduledCard[] = [];
  const reviewCards: ScheduledCard[] = [];

  for (const card of allSchedules) {
    const isDue = new Date(card.due) <= now;
    const state = card.state as CardState;

    if (state === "learning" || state === "relearning") {
      if (isDue) learningCards.push(card);
    } else if (state === "new") {
      newCards.push(card);
    } else if (state === "review" && isDue) {
      reviewCards.push(card);
    }
  }

  // 2. Learning cards always come first (they're in-progress)
  // 3. New cards: respect daily limit
  const remainingNewAllowance = Math.max(0, newPerDay - newCardsStudiedToday);
  const newToStudy = newCards.slice(0, remainingNewAllowance);

  // 4. Review cards: spread backlog, respect daily limit
  const reviewToStudy = spreadBacklog(reviewCards, reviewPerDay);

  // 5. Interleave: learning → reviews (shuffled with new cards)
  const mainQueue = [...newToStudy, ...reviewToStudy].sort(
    () => Math.random() - 0.5,
  );
  return [...learningCards, ...mainQueue];
}
