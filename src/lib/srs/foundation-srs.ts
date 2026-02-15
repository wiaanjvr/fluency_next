/**
 * Foundation Vocabulary SRS Integration
 * Manages spaced repetition for foundation vocabulary words
 */

import {
  FoundationWord,
  ExerciseResult,
  FoundationProgress,
  SessionResults,
} from "@/types/foundation-vocabulary";
import { calculateNextReview, isWordDue } from "@/lib/srs/algorithm";
import { UserWord, WordRating, WordStatus } from "@/types";

// Local storage keys
const FOUNDATION_PROGRESS_KEY = "foundationProgress";
const FOUNDATION_WORDS_KEY = "foundationWords";

// ============================================================================
// Progress Management
// ============================================================================

/**
 * Get foundation progress from localStorage
 */
export function getFoundationProgress(): FoundationProgress | null {
  if (typeof window === "undefined") return null;

  const stored = localStorage.getItem(FOUNDATION_PROGRESS_KEY);
  if (!stored) return null;

  try {
    return JSON.parse(stored) as FoundationProgress;
  } catch {
    return null;
  }
}

/**
 * Save foundation progress to localStorage
 */
export function saveFoundationProgress(progress: FoundationProgress): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(FOUNDATION_PROGRESS_KEY, JSON.stringify(progress));
}

/**
 * Initialize progress for a new user
 */
export function initializeFoundationProgress(
  userId: string,
): FoundationProgress {
  const progress: FoundationProgress = {
    userId,
    currentSessionIndex: 0,
    completedSessions: [],
    wordsLearned: [],
    totalWordsLearned: 0,
  };

  saveFoundationProgress(progress);
  return progress;
}

/**
 * Mark a session as completed and update progress
 */
export function completeSession(
  sessionIndex: number,
  wordIds: string[],
  results: SessionResults,
): FoundationProgress {
  const existing =
    getFoundationProgress() || initializeFoundationProgress("local");

  // Add session to completed if not already there
  if (!existing.completedSessions.includes(sessionIndex)) {
    existing.completedSessions.push(sessionIndex);
    existing.completedSessions.sort((a, b) => a - b);
  }

  // Add new word IDs
  wordIds.forEach((id) => {
    if (!existing.wordsLearned.includes(id)) {
      existing.wordsLearned.push(id);
    }
  });

  existing.totalWordsLearned = existing.wordsLearned.length;
  existing.currentSessionIndex = Math.max(
    existing.currentSessionIndex,
    sessionIndex + 1,
  );
  existing.lastSessionDate = new Date().toISOString();

  saveFoundationProgress(existing);
  return existing;
}

// ============================================================================
// Word Learning State
// ============================================================================

interface StoredUserWord extends Omit<UserWord, "id" | "user_id" | "language"> {
  foundationWordId: string;
}

/**
 * Get all learned foundation words with SRS state
 */
export function getLearnedWords(): Map<string, StoredUserWord> {
  if (typeof window === "undefined") return new Map();

  const stored = localStorage.getItem(FOUNDATION_WORDS_KEY);
  if (!stored) return new Map();

  try {
    const arr = JSON.parse(stored) as Array<[string, StoredUserWord]>;
    return new Map(arr);
  } catch {
    return new Map();
  }
}

/**
 * Save learned words to localStorage
 */
function saveLearnedWords(words: Map<string, StoredUserWord>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    FOUNDATION_WORDS_KEY,
    JSON.stringify(Array.from(words.entries())),
  );
}

/**
 * Initialize a new word in the SRS system
 */
export function initializeWord(word: FoundationWord): StoredUserWord {
  return {
    foundationWordId: word.id,
    word: word.word,
    lemma: word.lemma,
    ease_factor: 2.5,
    repetitions: 0,
    interval: 0,
    next_review: new Date().toISOString(),
    status: "new",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    part_of_speech: word.pos,
    frequency_rank: word.rank,
  };
}

/**
 * Update word SRS state based on exercise result
 */
export function updateWordFromExercise(
  word: FoundationWord,
  result: ExerciseResult,
): StoredUserWord {
  const words = getLearnedWords();
  let storedWord = words.get(word.id);

  if (!storedWord) {
    storedWord = initializeWord(word);
  }

  // Convert exercise result to SRS rating
  // Correct = 4 (Easy), Incorrect = 1 (Wrong)
  const rating: WordRating = result.correct ? 4 : 1;

  // Calculate next review using SM-2 algorithm
  const srsResult = calculateNextReview(
    {
      ease_factor: storedWord.ease_factor,
      repetitions: storedWord.repetitions,
      interval: storedWord.interval,
      status: storedWord.status,
    },
    rating,
  );

  // Update stored word
  storedWord = {
    ...storedWord,
    ease_factor: srsResult.ease_factor,
    repetitions: srsResult.repetitions,
    interval: srsResult.interval,
    next_review: srsResult.next_review.toISOString(),
    status: srsResult.status,
    updated_at: new Date().toISOString(),
  };

  // Save back
  words.set(word.id, storedWord);
  saveLearnedWords(words);

  return storedWord;
}

/**
 * Process all exercise results for a session
 */
export function processSessionResults(
  words: FoundationWord[],
  results: ExerciseResult[],
): void {
  // Group results by word ID
  const resultsByWord = new Map<string, ExerciseResult[]>();

  results.forEach((result) => {
    const existing = resultsByWord.get(result.wordId) || [];
    existing.push(result);
    resultsByWord.set(result.wordId, existing);
  });

  // Process each word
  words.forEach((word) => {
    const wordResults = resultsByWord.get(word.id);
    if (!wordResults || wordResults.length === 0) return;

    // Use the most recent result for SRS update
    // But consider overall performance
    const correctCount = wordResults.filter((r) => r.correct).length;
    const accuracy = correctCount / wordResults.length;

    // Create a summarized result
    const summaryResult: ExerciseResult = {
      wordId: word.id,
      exerciseType: "word-to-image", // Doesn't matter for SRS
      correct: accuracy >= 0.5, // Consider learned if got at least half right
      responseTimeMs:
        wordResults.reduce((sum, r) => sum + r.responseTimeMs, 0) /
        wordResults.length,
      timestamp: new Date().toISOString(),
    };

    updateWordFromExercise(word, summaryResult);
  });
}

/**
 * Get words that are due for review
 */
export function getWordsDueForReview(): StoredUserWord[] {
  const words = getLearnedWords();
  const now = new Date();

  return Array.from(words.values()).filter((word) => {
    const nextReview = new Date(word.next_review);
    return nextReview <= now;
  });
}

/**
 * Get words by status
 */
export function getWordsByStatus(status: WordStatus): StoredUserWord[] {
  const words = getLearnedWords();
  return Array.from(words.values()).filter((word) => word.status === status);
}

/**
 * Get learning statistics
 */
export function getLearningStats(): {
  totalWords: number;
  newWords: number;
  learningWords: number;
  knownWords: number;
  masteredWords: number;
  dueForReview: number;
} {
  const words = getLearnedWords();
  const wordsArray = Array.from(words.values());
  const now = new Date();

  return {
    totalWords: wordsArray.length,
    newWords: wordsArray.filter((w) => w.status === "new").length,
    learningWords: wordsArray.filter((w) => w.status === "learning").length,
    knownWords: wordsArray.filter((w) => w.status === "known").length,
    masteredWords: wordsArray.filter((w) => w.status === "mastered").length,
    dueForReview: wordsArray.filter((w) => new Date(w.next_review) <= now)
      .length,
  };
}

// ============================================================================
// Supabase Sync (placeholder for future implementation)
// ============================================================================

/**
 * Sync local progress to Supabase
 * This is a placeholder - implement when user authentication is ready
 */
export async function syncProgressToSupabase(_userId: string): Promise<void> {
  // TODO: Implement Supabase sync
  // 1. Get local progress
  // 2. Get local learned words
  // 3. Upsert to Supabase tables
  console.log("Supabase sync not yet implemented");
}

/**
 * Load progress from Supabase
 * This is a placeholder - implement when user authentication is ready
 */
export async function loadProgressFromSupabase(_userId: string): Promise<void> {
  // TODO: Implement Supabase load
  // 1. Fetch progress from Supabase
  // 2. Fetch learned words from Supabase
  // 3. Merge with local (prefer newer)
  // 4. Save to local
  console.log("Supabase load not yet implemented");
}
