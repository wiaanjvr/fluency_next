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
import type {
  LeechAction,
  NewGatherOrder,
  NewSortOrder,
  ReviewSortOrder,
  InterleaveMode,
} from "@/types/flashcards";

// FSRS-4.5 core constants
const DECAY = -0.5;
const FACTOR = 0.9 ** (1 / DECAY) - 1;

/** Desired retention — 90% probability of recall at next review */
const DESIRED_RETENTION = 0.9;

/** Learning steps in minutes for new cards: 1min → 10min → graduate */
const LEARNING_STEPS_MINUTES = [1, 10];

/** Relearning steps in minutes: 10min → graduate back to review */
const RELEARNING_STEPS_MINUTES = [10];

// ---------------------------------------------------------------------------
// Per-deck scheduling options (mirrors the `decks` table columns)
// ---------------------------------------------------------------------------
export interface DeckOptions {
  // ── New Cards ──
  /** Learning steps in minutes, e.g. [1, 10]. Defaults to LEARNING_STEPS_MINUTES. */
  learning_steps?: number[];
  /** Minimum days assigned when a card first graduates via Good. Default 1. */
  graduating_interval?: number;
  /** Minimum days assigned when a card graduates via Easy. Default 4. */
  easy_interval?: number;
  /** Whether new cards are introduced sequentially or shuffled. Default 'random'. */
  insertion_order?: "sequential" | "random";

  // ── Reviews ──
  /** Absolute cap on scheduled interval in days. Default 36500. */
  max_interval?: number;
  /** Global multiplier applied to every review interval. Default 1.0 (100%). */
  interval_modifier?: number;
  /** Fraction of the previous interval assigned on Hard for review cards. Default 1.2. */
  hard_interval_mult?: number;
  /** Extra multiplier for Easy on review cards. Default 1.3. */
  easy_bonus?: number;

  // ── Lapses / Relearning ──
  /** Relearning steps in minutes, e.g. [10]. Defaults to RELEARNING_STEPS_MINUTES. */
  relearning_steps?: number[];
  /** Minimum interval (days) when re-graduating from relearning. Default 1. */
  min_interval_after_lapse?: number;
  /** Multiply old interval by this after a lapse (0 = reset to min). Default 0. */
  new_interval_multiplier?: number;

  // ── Leeches ──
  /** Number of lapses before a card is flagged as a leech. Default 8. */
  leech_threshold?: number;
  /** What happens when a card becomes a leech. Default 'tag'. */
  leech_action?: LeechAction;

  // ── Display Order ──
  /** How new cards are gathered from the deck. Default 'deck_order'. */
  new_gather_order?: NewGatherOrder;
  /** How gathered new cards are sorted within a session. Default 'order_gathered'. */
  new_sort_order?: NewSortOrder;
  /** How review cards are ordered. Default 'due_date'. */
  review_sort_order?: ReviewSortOrder;
  /** Whether to interleave new and review cards or separate them. Default 'mix'. */
  interleave_mode?: InterleaveMode;

  // ── Burying ──
  /** Bury new siblings during review sessions. Default false. */
  bury_new_siblings?: boolean;
  /** Bury review siblings during review sessions. Default false. */
  bury_review_siblings?: boolean;

  // ── Timer ──
  /** Show an answer timer on cards. Default false. */
  show_answer_timer?: boolean;
  /** Stop/cap the timer at N seconds (0 = no cap). Default 60. */
  answer_timer_limit?: number;

  // ── Auto Advance ──
  /** Automatically reveal the answer after N seconds (0 = disabled). Default 0. */
  auto_advance_answer_seconds?: number;
  /** Automatically rate the card after N seconds (0 = disabled). Default 0. */
  auto_advance_rate_seconds?: number;
}

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
  /** Whether this card just became a leech (lapses hit threshold) */
  justBecameLeech: boolean;
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
  hardMult?: number,
  easyMult?: number,
): number {
  const hardPenalty =
    rating === 2 ? (hardMult != null ? 1 / hardMult : 0.8) : 1;
  const easyBonus = rating === 4 ? (easyMult ?? 1.3) : 1;
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
  options?: DeckOptions,
): number {
  const result = scheduleCard(card, rating, now, options);
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
// Helper: clamp an interval to the deck's max_interval and apply modifier
// ---------------------------------------------------------------------------
function applyIntervalModifiers(
  interval: number,
  options?: DeckOptions,
): number {
  const modifier = options?.interval_modifier ?? 1.0;
  const maxInterval = options?.max_interval ?? 36500;
  return Math.min(Math.max(1, Math.round(interval * modifier)), maxInterval);
}

// ---------------------------------------------------------------------------
// Main scheduling function
// ---------------------------------------------------------------------------
export function scheduleCard(
  card: FSRSCard,
  rating: Rating,
  now: Date,
  options?: DeckOptions,
): SchedulingResult {
  let { stability, difficulty, reps, lapses, state } = card;
  const learningStep = card.learning_step ?? 0;
  const elapsed = card.last_review
    ? Math.max(
        Math.round((now.getTime() - card.last_review.getTime()) / 86400000),
        0,
      )
    : 0;

  // Resolve per-deck overrides with fallbacks
  const learningStepsMinutes =
    options?.learning_steps && options.learning_steps.length > 0
      ? options.learning_steps
      : LEARNING_STEPS_MINUTES;
  const graduatingIntervalDays = options?.graduating_interval ?? 1;
  const easyIntervalDays = options?.easy_interval ?? 4;
  const relearningStepsMinutes =
    options?.relearning_steps && options.relearning_steps.length > 0
      ? options.relearning_steps
      : RELEARNING_STEPS_MINUTES;
  const minIntervalAfterLapse = options?.min_interval_after_lapse ?? 1;
  const newIntervalMultiplier = options?.new_interval_multiplier ?? 0;
  const leechThreshold = options?.leech_threshold ?? 8;
  const hardIntervalMult = options?.hard_interval_mult ?? 1.2;
  const easyBonusMult = options?.easy_bonus ?? 1.3;

  let showAgainInSession = false;
  let justBecameLeech = false;

  // === NEW card ===
  if (state === "new") {
    stability = initStability(rating);
    difficulty = initDifficulty(rating);

    if (rating === 1) {
      // Again on new card → enter learning
      state = "learning";
      const stepMinutes = learningStepsMinutes[0] ?? 1;
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
        justBecameLeech: false,
      };
    }

    if (rating === 2) {
      // Hard on new → learning, but advance to step 1
      state = "learning";
      const stepMinutes =
        learningStepsMinutes[1] ?? learningStepsMinutes[0] ?? 10;
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
        justBecameLeech: false,
      };
    }

    // Good or Easy → graduate immediately
    state = "review";
    reps = 1;
    const fsrsInterval = stabilityToInterval(stability);
    const rawInterval =
      rating === 4
        ? Math.max(easyIntervalDays, Math.round(fsrsInterval * easyBonusMult))
        : Math.max(graduatingIntervalDays, fsrsInterval);
    const roundedInterval = applyIntervalModifiers(rawInterval, options);
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
      justBecameLeech: false,
    };
  }

  // === LEARNING / RELEARNING card ===
  if (state === "learning" || state === "relearning") {
    const steps =
      state === "learning" ? learningStepsMinutes : relearningStepsMinutes;

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
          lapses,
          state,
          due,
          last_review: now,
          learning_step: 0,
        },
        scheduled_days: 0,
        due,
        showAgainInSession,
        justBecameLeech: false,
      };
    }

    if (rating === 4) {
      // Easy → graduate immediately to review
      const r = retrievability(elapsed, stability || 1);
      difficulty = nextDifficulty(difficulty || 5, rating);
      stability =
        stability > 0
          ? nextStabilityRecall(
              difficulty,
              stability,
              r,
              rating,
              hardIntervalMult,
              easyBonusMult,
            )
          : initStability(rating);
      state = "review";
      reps += 1;

      let rawInterval: number;
      if (card.state === "relearning") {
        // Re-graduating from relearning: apply new_interval_multiplier
        const oldInterval = card.scheduled_days || 1;
        const lapseInterval = Math.max(
          minIntervalAfterLapse,
          Math.round(oldInterval * newIntervalMultiplier),
        );
        rawInterval = Math.max(
          easyIntervalDays,
          Math.round(
            Math.max(lapseInterval, stabilityToInterval(stability)) *
              easyBonusMult,
          ),
        );
      } else {
        rawInterval = Math.max(
          easyIntervalDays,
          Math.round(stabilityToInterval(stability) * easyBonusMult),
        );
      }

      const interval = applyIntervalModifiers(rawInterval, options);
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
        justBecameLeech: false,
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
          ? nextStabilityRecall(
              difficulty,
              stability,
              r,
              rating,
              hardIntervalMult,
              easyBonusMult,
            )
          : initStability(rating);
      state = "review";
      reps += 1;

      let rawInterval: number;
      if (card.state === "relearning") {
        // Re-graduating from relearning: apply new_interval_multiplier
        const oldInterval = card.scheduled_days || 1;
        const lapseInterval = Math.max(
          minIntervalAfterLapse,
          Math.round(oldInterval * newIntervalMultiplier),
        );
        rawInterval = Math.max(
          graduatingIntervalDays,
          Math.max(lapseInterval, stabilityToInterval(stability)),
        );
      } else {
        rawInterval = Math.max(
          graduatingIntervalDays,
          stabilityToInterval(stability),
        );
      }

      const interval = applyIntervalModifiers(rawInterval, options);
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
        justBecameLeech: false,
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
      justBecameLeech: false,
    };
  }

  // === REVIEW card ===
  const r = retrievability(elapsed, stability);
  difficulty = nextDifficulty(difficulty, rating);

  if (rating === 1) {
    // Forgot → relearning
    stability = nextStabilityForgetting(difficulty, stability, r);
    lapses += 1;
    justBecameLeech =
      leechThreshold > 0 &&
      lapses >= leechThreshold &&
      (lapses === leechThreshold || lapses % leechThreshold === 0);
    state = "relearning";
    const stepMinutes = relearningStepsMinutes[0] ?? 10;
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
      justBecameLeech,
    };
  }

  // Recalled → stay in review
  stability = nextStabilityRecall(
    difficulty,
    stability,
    r,
    rating,
    hardIntervalMult,
    easyBonusMult,
  );
  state = "review";
  reps += 1;

  let rawInterval: number;
  if (rating === 2) {
    // Hard: use hard_interval_mult × previous interval (or FSRS interval, whichever is greater)
    rawInterval = Math.max(
      1,
      Math.round(
        Math.max(
          card.scheduled_days * hardIntervalMult,
          stabilityToInterval(stability),
        ),
      ),
    );
  } else if (rating === 4) {
    // Easy: apply easy bonus
    rawInterval = Math.round(stabilityToInterval(stability) * easyBonusMult);
  } else {
    // Good: standard FSRS interval
    rawInterval = stabilityToInterval(stability);
  }

  const interval = applyIntervalModifiers(rawInterval, options);
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
    justBecameLeech: false,
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
 *  - Display order (gather, sort, interleave)
 *
 * Learning/relearning cards always show (they're in-progress steps).
 */
export function buildStudyQueue(
  allSchedules: ScheduledCard[],
  newPerDay: number,
  reviewPerDay: number,
  newCardsStudiedToday: number = 0,
  insertionOrder: "sequential" | "random" = "random",
  options?: DeckOptions,
): ScheduledCard[] {
  const now = new Date();

  // 0. Filter out suspended and buried cards
  const activeSchedules = allSchedules.filter((c) => {
    const cs = c as ScheduledCard & {
      is_suspended?: boolean;
      is_buried?: boolean;
      buried_until?: string | null;
    };
    if (cs.is_suspended) return false;
    // Auto-unbury cards whose buried_until has passed
    if (cs.is_buried) {
      if (cs.buried_until && new Date(cs.buried_until) <= now) {
        // Allow through (caller should persist unbury)
        return true;
      }
      return false;
    }
    return true;
  });

  // 1. Separate by state
  const learningCards: ScheduledCard[] = [];
  const newCards: ScheduledCard[] = [];
  const reviewCards: ScheduledCard[] = [];

  for (const card of activeSchedules) {
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

  // 3. Gather new cards according to new_gather_order
  const gatherOrder = options?.new_gather_order ?? "deck_order";
  let gatheredNew: ScheduledCard[];
  switch (gatherOrder) {
    case "ascending_position":
      gatheredNew = [...newCards].sort(
        (a, b) =>
          new Date(a.flashcards.created_at).getTime() -
          new Date(b.flashcards.created_at).getTime(),
      );
      break;
    case "descending_position":
      gatheredNew = [...newCards].sort(
        (a, b) =>
          new Date(b.flashcards.created_at).getTime() -
          new Date(a.flashcards.created_at).getTime(),
      );
      break;
    case "random":
      gatheredNew = [...newCards].sort(() => Math.random() - 0.5);
      break;
    default: // 'deck_order': preserve insertion order (by created_at)
      gatheredNew = [...newCards].sort(
        (a, b) =>
          new Date(a.flashcards.created_at).getTime() -
          new Date(b.flashcards.created_at).getTime(),
      );
      break;
  }

  // Respect daily limit
  const remainingNewAllowance = Math.max(0, newPerDay - newCardsStudiedToday);
  gatheredNew = gatheredNew.slice(0, remainingNewAllowance);

  // 4. Sort gathered new cards according to new_sort_order
  const sortOrder = options?.new_sort_order ?? "order_gathered";
  switch (sortOrder) {
    case "card_type":
      gatheredNew.sort((a, b) =>
        (a.flashcards.source || "").localeCompare(b.flashcards.source || ""),
      );
      break;
    case "card_type_then_random": {
      // Group by source then shuffle within groups
      const groups = new Map<string, ScheduledCard[]>();
      for (const c of gatheredNew) {
        const key = c.flashcards.source || "manual";
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(c);
      }
      gatheredNew = [];
      for (const [, group] of groups) {
        group.sort(() => Math.random() - 0.5);
        gatheredNew.push(...group);
      }
      break;
    }
    case "random":
      gatheredNew.sort(() => Math.random() - 0.5);
      break;
    // 'order_gathered': keep current order
  }

  // Also respect legacy insertionOrder for backward compatibility
  if (
    !options?.new_gather_order &&
    insertionOrder === "random" &&
    sortOrder === "order_gathered"
  ) {
    gatheredNew.sort(() => Math.random() - 0.5);
  }

  // 5. Sort review cards according to review_sort_order
  const reviewSort = options?.review_sort_order ?? "due_date";
  let sortedReviews = spreadBacklog(reviewCards, reviewPerDay);
  switch (reviewSort) {
    case "random":
      sortedReviews.sort(() => Math.random() - 0.5);
      break;
    case "intervals_ascending":
      sortedReviews.sort((a, b) => a.scheduled_days - b.scheduled_days);
      break;
    case "intervals_descending":
      sortedReviews.sort((a, b) => b.scheduled_days - a.scheduled_days);
      break;
    case "relative_overdueness": {
      const nowMs = now.getTime();
      sortedReviews.sort((a, b) => {
        const overdueA =
          a.scheduled_days > 0
            ? (nowMs - new Date(a.due).getTime()) /
              (a.scheduled_days * 86400000)
            : 0;
        const overdueB =
          b.scheduled_days > 0
            ? (nowMs - new Date(b.due).getTime()) /
              (b.scheduled_days * 86400000)
            : 0;
        return overdueB - overdueA; // most overdue first
      });
      break;
    }
    // 'due_date': already sorted by spreadBacklog (earliest due first)
  }

  // 6. Combine based on interleave mode
  const interleave = options?.interleave_mode ?? "mix";
  let mainQueue: ScheduledCard[];
  switch (interleave) {
    case "new_first":
      mainQueue = [...gatheredNew, ...sortedReviews];
      break;
    case "reviews_first":
      mainQueue = [...sortedReviews, ...gatheredNew];
      break;
    default: // 'mix': interleave by shuffling
      mainQueue = [...gatheredNew, ...sortedReviews].sort(
        () => Math.random() - 0.5,
      );
      break;
  }

  return [...learningCards, ...mainQueue];
}

// ---------------------------------------------------------------------------
// Leech detection helpers
// ---------------------------------------------------------------------------

/**
 * Determine whether a card is (or just became) a leech based on its lapse
 * count and the deck's leech threshold.
 */
export function isLeech(lapses: number, threshold: number): boolean {
  return threshold > 0 && lapses >= threshold;
}

/**
 * Process leech action after scheduling.  Returns the DB field updates that
 * should be persisted to `card_schedules` (and optionally `flashcards.tags`).
 *
 * - `suspend` → sets `is_suspended = true`, `is_leech = true`
 * - `tag`     → sets `is_leech = true` (caller should also add "leech" to
 *                the flashcard's tags array)
 */
export function leechAction(action: "suspend" | "tag"): {
  is_leech: boolean;
  is_suspended: boolean;
} {
  return {
    is_leech: true,
    is_suspended: action === "suspend",
  };
}

// ---------------------------------------------------------------------------
// Sibling burying helpers
// ---------------------------------------------------------------------------

/**
 * Find sibling card IDs that should be buried after reviewing a card.
 * Siblings share the same `sibling_group` (or the same `front` text as
 * fallback). Returns card_schedule IDs to bury.
 */
export function findSiblingsToBury(
  reviewedCard: ScheduledCard,
  allSchedules: ScheduledCard[],
  options?: DeckOptions,
): { newSiblingIds: string[]; reviewSiblingIds: string[] } {
  const buryNew = options?.bury_new_siblings ?? false;
  const buryReview = options?.bury_review_siblings ?? false;

  if (!buryNew && !buryReview)
    return { newSiblingIds: [], reviewSiblingIds: [] };

  // Determine sibling group
  const siblingGroup =
    (reviewedCard.flashcards as { sibling_group?: string | null })
      .sibling_group || reviewedCard.flashcards.front;

  const newSiblingIds: string[] = [];
  const reviewSiblingIds: string[] = [];

  for (const card of allSchedules) {
    if (card.id === reviewedCard.id) continue;
    const cardGroup =
      (card.flashcards as { sibling_group?: string | null }).sibling_group ||
      card.flashcards.front;
    if (cardGroup !== siblingGroup) continue;

    const state = card.state as string;
    if (buryNew && state === "new") {
      newSiblingIds.push(card.id);
    }
    if (buryReview && state === "review") {
      reviewSiblingIds.push(card.id);
    }
  }

  return { newSiblingIds, reviewSiblingIds };
}

/**
 * Compute the buried_until timestamp — start of the next day.
 */
export function getBuriedUntil(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow.toISOString();
}
