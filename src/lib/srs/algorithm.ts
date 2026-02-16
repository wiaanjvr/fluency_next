/**
 * Spaced Repetition System (SRS) Utilities
 * Implements the SM-2 algorithm for optimal word review scheduling
 */

import { UserWord, WordRating, WordStatus } from "@/types";

// SM-2 Algorithm Constants
const INITIAL_EASINESS = 2.5;
const MIN_EASINESS = 1.3;
const EASINESS_BONUS = 0.1;
const EASINESS_PENALTY_HARD = 0.15;
const EASINESS_PENALTY_WRONG = 0.2;

// Spaced Repetition Intervals (in days)
// Pattern: 1 min, 10 min, 1 hour, 1 day, 2 days, 4 days, 8 days...
const INTERVALS_IN_DAYS = [
  1 / 1440, // 1 minute
  10 / 1440, // 10 minutes
  1 / 24, // 1 hour
  1, // 1 day
  2, // 2 days
  4, // 4 days
  8, // 8 days
  16, // 16 days
  32, // 32 days
  64, // 64 days
];

// For backward compatibility
const FIRST_INTERVAL = INTERVALS_IN_DAYS[0];
const SECOND_INTERVAL = INTERVALS_IN_DAYS[3]; // 1 day

/**
 * Calculate next review date and update SRS parameters based on user rating
 * Uses the SM-2 algorithm with modifications for language learning
 */
export function calculateNextReview(
  currentWord: Partial<UserWord>,
  rating: WordRating,
): {
  ease_factor: number;
  repetitions: number;
  interval: number;
  next_review: Date;
  status: WordStatus;
} {
  // Initialize defaults if word is new
  const easiness = currentWord.ease_factor ?? INITIAL_EASINESS;
  const reps = currentWord.repetitions ?? 0;
  const status = currentWord.status ?? "new";

  let newEasiness = easiness;
  let newRepetitions = reps;
  let intervalDays = 0;
  let newStatus: WordStatus = status;

  // Update easiness factor based on rating
  if (rating >= 3) {
    // Correct response (Good, Easy, or Perfect)
    newEasiness =
      easiness + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02));

    if (rating === 5) {
      // Perfect recall gets extra bonus
      newEasiness += EASINESS_BONUS;
    }

    newRepetitions = reps + 1;
  } else if (rating === 2) {
    // Hard - correct but with difficulty
    newEasiness = Math.max(MIN_EASINESS, easiness - EASINESS_PENALTY_HARD);
    newRepetitions = reps + 1; // Still counts as successful
  } else {
    // Wrong (0 or 1) - reset repetitions
    newEasiness = Math.max(MIN_EASINESS, easiness - EASINESS_PENALTY_WRONG);
    newRepetitions = 0;
  }

  // Ensure easiness stays in reasonable range
  newEasiness = Math.max(MIN_EASINESS, Math.min(2.5, newEasiness));

  // Calculate interval based on repetition number using predefined intervals
  if (rating < 2) {
    // Failed - review again soon (1 minute)
    intervalDays = INTERVALS_IN_DAYS[0];
    newStatus = "learning";
  } else {
    // Use the predefined interval pattern based on repetition count
    // If repetitions exceed available intervals, double the last interval each time
    if (newRepetitions < INTERVALS_IN_DAYS.length) {
      intervalDays = INTERVALS_IN_DAYS[newRepetitions];
    } else {
      // For reps beyond our defined intervals, keep doubling
      const lastInterval = INTERVALS_IN_DAYS[INTERVALS_IN_DAYS.length - 1];
      const extraReps = newRepetitions - INTERVALS_IN_DAYS.length + 1;
      intervalDays = lastInterval * Math.pow(2, extraReps);
    }

    // Update status based on performance
    if (newRepetitions >= 8 && rating >= 4) {
      newStatus = "mastered";
    } else if (newRepetitions >= 4) {
      newStatus = "known";
    } else {
      newStatus = "learning";
    }

    // If user rates highly on first encounter, mark as known
    if (newRepetitions === 1 && rating >= 4) {
      newStatus = "known"; // User already knows this word well
    }
  }

  // Calculate next review date
  const nextReview = new Date();
  nextReview.setTime(nextReview.getTime() + intervalDays * 24 * 60 * 60 * 1000);

  return {
    ease_factor: Math.round(newEasiness * 100) / 100,
    repetitions: newRepetitions,
    interval: Math.round(intervalDays * 100) / 100,
    next_review: nextReview,
    status: newStatus,
  };
}

/**
 * Determine if a word is due for review
 */
export function isWordDue(word: UserWord): boolean {
  const nextReview = new Date(word.next_review);
  const now = new Date();
  return nextReview <= now;
}

/**
 * Get priority score for word selection in stories
 * Higher score = higher priority to include
 */
export function getWordPriority(word: UserWord): number {
  const now = new Date();
  const nextReview = new Date(word.next_review);
  const daysDifference =
    (now.getTime() - nextReview.getTime()) / (1000 * 60 * 60 * 24);

  let priority = 0;

  // Overdue words get highest priority
  if (daysDifference > 0) {
    priority += daysDifference * 10; // More overdue = higher priority
  }

  // Bonus for words in learning phase
  if (word.status === "learning") {
    priority += 5;
  }

  // Slight penalty for mastered words (but still review them)
  if (word.status === "mastered") {
    priority -= 2;
  }

  // Consider frequency rank (common words are more important)
  if (word.frequency_rank) {
    priority += Math.max(0, 100 - word.frequency_rank / 100);
  }

  return priority;
}

/**
 * Filter and sort words for inclusion in a generated story
 */
export function selectWordsForStory(
  knownWords: UserWord[],
  targetCount: number,
  prioritizeReview: boolean = true,
): UserWord[] {
  if (!prioritizeReview) {
    // Random selection for variety
    return shuffleArray(knownWords).slice(0, targetCount);
  }

  // Sort by priority (overdue words first)
  const sortedWords = [...knownWords].sort((a, b) => {
    const priorityA = getWordPriority(a);
    const priorityB = getWordPriority(b);
    return priorityB - priorityA;
  });

  // Take top priority words, but include some randomness
  const highPriority = sortedWords.slice(0, Math.floor(targetCount * 0.7));
  const remaining = sortedWords.slice(Math.floor(targetCount * 0.7));
  const randomSelection = shuffleArray(remaining).slice(
    0,
    targetCount - highPriority.length,
  );

  return [...highPriority, ...randomSelection];
}

/**
 * Get statistics about user's vocabulary knowledge
 */
export function getVocabularyStats(words: UserWord[]) {
  const total = words.length;
  const newCount = words.filter((w) => w.status === "new").length;
  const learningCount = words.filter((w) => w.status === "learning").length;
  const knownCount = words.filter((w) => w.status === "known").length;
  const masteredCount = words.filter((w) => w.status === "mastered").length;
  const dueCount = words.filter((w) => isWordDue(w)).length;

  return {
    total,
    new: newCount,
    learning: learningCount,
    known: knownCount,
    mastered: masteredCount,
    dueForReview: dueCount,
    percentageKnown:
      total > 0 ? ((knownCount + masteredCount) / total) * 100 : 0,
  };
}

/**
 * Helper: Fisher-Yates shuffle algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Initialize a new word with default SRS parameters
 */
export function initializeNewWord(
  word: string,
  lemma: string,
  language: string,
): Partial<UserWord> {
  return {
    word,
    lemma,
    language,
    ease_factor: INITIAL_EASINESS,
    repetitions: 0,
    interval: 0,
    next_review: new Date().toISOString(),
    status: "new",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Estimate comprehension level based on vocabulary knowledge
 * Returns percentage of text user should understand
 */
export function estimateComprehension(
  storyWords: string[],
  knownWords: Set<string>,
): number {
  const knownCount = storyWords.filter((word) =>
    knownWords.has(word.toLowerCase()),
  ).length;

  return storyWords.length > 0 ? (knownCount / storyWords.length) * 100 : 0;
}
