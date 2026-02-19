/**
 * Progression Logic — Mastery stages, mixing ratios, exercise selection
 *
 * Mastery Count → Stage → Mixing Ratio + Exercise Type
 *
 *   0-29   → stage-1 → 80:20 EN:TL → comprehension only
 *   30-49  → stage-2 → 60:40       → guided recall
 *   50-74  → stage-3 → 40:60       → guided recall
 *   75-149 → stage-4 → 20:80       → constrained production
 *   150+   → stage-5 → 0:100       → full production
 */

import {
  MasteryStage,
  MasteryStageConfig,
  MASTERY_STAGES,
  ExerciseType,
  LearnerWord,
  StoryTone,
} from "@/types/lesson-v2";

// ═══════════════════════════════════════════════════════════════════
// STAGE RESOLUTION
// ═══════════════════════════════════════════════════════════════════

/**
 * Determine the learner's current mastery stage.
 */
export function getMasteryStage(masteryCount: number): MasteryStageConfig {
  // Walk stages from highest to lowest; first match wins
  for (let i = MASTERY_STAGES.length - 1; i >= 0; i--) {
    if (masteryCount >= MASTERY_STAGES[i].minMastery) {
      return MASTERY_STAGES[i];
    }
  }
  return MASTERY_STAGES[0];
}

/**
 * Get the exercise type for a given mastery count.
 */
export function getExerciseType(masteryCount: number): ExerciseType {
  return getMasteryStage(masteryCount).exerciseType;
}

/**
 * Get the English-to-target-language mixing ratio.
 * Returns { english, target } both as percentages (0-100).
 */
export function getMixingRatio(masteryCount: number): {
  english: number;
  target: number;
} {
  const stage = getMasteryStage(masteryCount);
  return { english: stage.englishRatio, target: stage.targetRatio };
}

// ═══════════════════════════════════════════════════════════════════
// NEW WORD DENSITY
// ═══════════════════════════════════════════════════════════════════

/**
 * Maximum number of unseen target-language words allowed in a 25-word story.
 * Rule: known:new ratio ≥ 95:5 → max 1-2 new words per story.
 */
export const MAX_NEW_WORDS_PER_STORY = 2;

/**
 * Validate that a story respects the 95:5 new-word density rule.
 * Returns true if the density is acceptable.
 */
export function validateNewWordDensity(
  totalWords: number,
  newWordCount: number,
): boolean {
  if (totalWords === 0) return true;
  const newRatio = newWordCount / totalWords;
  return newRatio <= 0.05;
}

// ═══════════════════════════════════════════════════════════════════
// MASTERY PROMOTION
// ═══════════════════════════════════════════════════════════════════

/** Consecutive correct recalls needed to promote a word to "mastered" */
export const MASTERY_CORRECT_STREAK = 3;

/**
 * Check if a word qualifies as "mastered" (demonstrated reliable recall).
 */
export function isWordMastered(word: LearnerWord): boolean {
  return (
    word.status === "mastered" ||
    (word.correctStreak >= MASTERY_CORRECT_STREAK && word.totalReviews >= 3)
  );
}

/**
 * Compute updated mastery status after a review.
 */
export function computeWordStatus(
  word: LearnerWord,
  correct: boolean,
): LearnerWord["status"] {
  if (correct) {
    const newStreak = word.correctStreak + 1;
    if (newStreak >= MASTERY_CORRECT_STREAK && word.totalReviews + 1 >= 3) {
      return "mastered";
    }
    return "learning";
  }
  // Incorrect — reset to learning
  return "learning";
}

/**
 * Compute the mastery count from a word list.
 */
export function computeMasteryCount(words: LearnerWord[]): number {
  return words.filter((w) => w.status === "mastered").length;
}

// ═══════════════════════════════════════════════════════════════════
// TONE ROTATION
// ═══════════════════════════════════════════════════════════════════

const TONES: StoryTone[] = ["curiosity", "humor", "mild-tension", "warmth"];

/**
 * Select the next story tone, ensuring no two consecutive sessions
 * use the same tone.
 */
export function getNextTone(previousTone?: StoryTone): StoryTone {
  if (!previousTone) {
    return TONES[Math.floor(Math.random() * TONES.length)];
  }
  const available = TONES.filter((t) => t !== previousTone);
  return available[Math.floor(Math.random() * available.length)];
}

// ═══════════════════════════════════════════════════════════════════
// INTEREST ROTATION
// ═══════════════════════════════════════════════════════════════════

/**
 * Select the next interest theme, cycling through all 3.
 */
export function getNextInterest(
  interests: [string, string, string],
  previousIndex?: number,
): { theme: string; index: number } {
  if (previousIndex === undefined || previousIndex === null) {
    const idx = Math.floor(Math.random() * 3);
    return { theme: interests[idx], index: idx };
  }
  const nextIdx = (previousIndex + 1) % 3;
  return { theme: interests[nextIdx], index: nextIdx };
}

// ═══════════════════════════════════════════════════════════════════
// WORD COUNTS PER INTRO BATCH
// ═══════════════════════════════════════════════════════════════════

/** Number of words to introduce per Phase 1 session */
export const WORDS_PER_INTRODUCTION_SESSION = 5;

/**
 * Calculate how many target-language words (approx) should appear
 * in a 25-word story at the current mixing ratio.
 */
export function getTargetWordBudget(
  masteryCount: number,
  totalStoryWords: number = 25,
): number {
  const { target } = getMixingRatio(masteryCount);
  return Math.round((target / 100) * totalStoryWords);
}
