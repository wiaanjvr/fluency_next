/**
 * Foundation Vocabulary SRS Integration
 * Manages spaced repetition for foundation vocabulary words
 * Storage: Supabase database (foundation_progress table)
 */

import {
  FoundationWord,
  ExerciseResult,
  FoundationProgress,
  SessionResults,
} from "@/types/foundation-vocabulary";
import { calculateNextReview, isWordDue } from "@/lib/srs/algorithm";
import { UserWord, WordRating, WordStatus } from "@/types";
import { createClient } from "@/lib/supabase/client";

// Local storage key for word-level SRS data (temporary until moved to DB)
const FOUNDATION_WORDS_KEY = "foundationWords";

// ============================================================================
// Progress Management (Supabase-based)
// ============================================================================

/**
 * Get foundation progress from Supabase
 */
export async function getFoundationProgress(
  language: string = "fr",
): Promise<FoundationProgress | null> {
  const supabase = createClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("foundation_progress")
      .select("*")
      .eq("user_id", user.id)
      .eq("language", language)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows returned - user hasn't started foundation yet
        return null;
      }
      console.error("Error fetching foundation progress:", error);
      return null;
    }

    if (!data) return null;

    return {
      userId: user.id,
      currentSessionIndex: data.total_sessions_completed || 0,
      completedSessions: data.completed_sessions || [],
      wordsLearned: data.words_learned || [],
      totalWordsLearned: data.total_words_learned || 0,
      lastSessionDate: data.last_session_date,
    };
  } catch (error) {
    console.error("Error in getFoundationProgress:", error);
    return null;
  }
}

/**
 * Save foundation progress to Supabase
 */
export async function saveFoundationProgress(
  progress: FoundationProgress,
  language: string = "fr",
): Promise<void> {
  const supabase = createClient();

  console.log("saveFoundationProgress called:", {
    userId: progress.userId,
    language,
    totalWordsLearned: progress.totalWordsLearned,
    completedSessions: progress.completedSessions.length,
  });

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      console.error("User not authenticated in saveFoundationProgress");
      throw new Error("User not authenticated");
    }

    const { data, error } = await supabase
      .from("foundation_progress")
      .upsert(
        {
          user_id: user.id,
          language: language,
          completed_sessions: progress.completedSessions,
          words_learned: progress.wordsLearned,
          total_sessions_completed: progress.completedSessions.length,
          total_words_learned: progress.totalWordsLearned,
          last_session_date: progress.lastSessionDate,
        },
        {
          onConflict: "user_id,language",
        },
      )
      .select();

    if (error) {
      console.error("Error saving foundation progress:", error);
      throw error;
    }

    console.log("Foundation progress saved successfully:", data);
  } catch (error) {
    console.error("Error in saveFoundationProgress:", error);
    throw error; // Re-throw to be caught by caller
  }
}

/**
 * Initialize progress for a new user
 */
export async function initializeFoundationProgress(
  userId: string,
  language: string = "fr",
): Promise<FoundationProgress> {
  const progress: FoundationProgress = {
    userId,
    currentSessionIndex: 0,
    completedSessions: [],
    wordsLearned: [],
    totalWordsLearned: 0,
  };

  await saveFoundationProgress(progress, language);
  return progress;
}

/**
 * Mark a session as completed and update progress
 * Note: sessionIndex is maintained for backward compatibility but not used in SRS-based system
 * @param skipWordSave - Set to true when using saveSessionWordsWithPerformance separately
 */
export async function completeSession(
  sessionIndex: number,
  wordIds: string[],
  results: SessionResults,
  language: string = "fr",
  sessionWords?: FoundationWord[],
  skipWordSave: boolean = false,
): Promise<FoundationProgress> {
  const supabase = createClient();

  console.log("completeSession called:", {
    sessionIndex,
    wordIds: wordIds.length,
    skipWordSave,
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    console.error("User not authenticated in completeSession");
    throw new Error("User not authenticated");
  }

  // Only save words using old method if not using the new enhanced method
  if (!skipWordSave && sessionWords && sessionWords.length > 0) {
    console.log("Saving words using old method (saveSessionWordsToDatabase)");
    await saveSessionWordsToDatabase(
      sessionWords,
      results.exerciseResults,
      language,
    );
  } else if (skipWordSave) {
    console.log("Skipping saveSessionWordsToDatabase (using enhanced method)");
  }

  const existing =
    (await getFoundationProgress(language)) ||
    (await initializeFoundationProgress(user.id, language));

  // Add session to completed if not already there (for backward compatibility)
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

  await saveFoundationProgress(existing, language);
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
// Dynamic Session Management with SRS
// ============================================================================

/**
 * Get user's words from database for a specific language
 */
export async function getUserWords(language: string): Promise<
  Array<{
    id: string;
    word: string;
    lemma: string;
    ease_factor: number;
    repetitions: number;
    interval: number;
    next_review: string;
    status: WordStatus;
    last_reviewed: string | null;
    part_of_speech: string | null;
    frequency_rank: number | null;
  }>
> {
  const supabase = createClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("user_words")
      .select("*")
      .eq("user_id", user.id)
      .eq("language", language);

    if (error) {
      console.error("Error fetching user words:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error in getUserWords:", error);
    return [];
  }
}

/**
 * Get words that need review based on SRS schedule
 */
export async function getWordsDueForReviewFromDB(
  language: string,
): Promise<string[]> {
  const supabase = createClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("user_words")
      .select("word")
      .eq("user_id", user.id)
      .eq("language", language)
      .lte("next_review", now)
      .order("next_review", { ascending: true });

    if (error) {
      console.error("Error fetching words due for review:", error);
      return [];
    }

    return (data || []).map((w) => w.word);
  } catch (error) {
    console.error("Error in getWordsDueForReviewFromDB:", error);
    return [];
  }
}

/**
 * Get the next session's words dynamically based on SRS
 * Returns up to wordsPerSession words, prioritizing review over new words
 */
export async function getNextSessionWords(
  allFoundationWords: FoundationWord[],
  language: string,
  wordsPerSession: number = 4,
): Promise<{
  words: FoundationWord[];
  reviewCount: number;
  newCount: number;
  totalLearned: number;
  allWordsLearned: boolean;
}> {
  const supabase = createClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      // Not logged in, return first session
      return {
        words: allFoundationWords.slice(0, wordsPerSession),
        reviewCount: 0,
        newCount: wordsPerSession,
        totalLearned: 0,
        allWordsLearned: false,
      };
    }

    // Get words due for review
    const wordsDue = await getWordsDueForReviewFromDB(language);

    // Get all user's foundation words to determine which are new
    const userWords = await getUserWords(language);
    const learnedWordSet = new Set(userWords.map((w) => w.word));

    // Find foundation words that need review (in wordsDue and in foundation list)
    const reviewWords: FoundationWord[] = [];
    for (const dueWord of wordsDue.slice(0, wordsPerSession)) {
      const foundationWord = allFoundationWords.find((w) => w.word === dueWord);
      if (foundationWord) {
        reviewWords.push(foundationWord);
      }
    }

    const reviewCount = reviewWords.length;
    const slotsRemaining = wordsPerSession - reviewCount;

    // Find new words (not yet learned) from foundation vocabulary
    const newWords: FoundationWord[] = [];
    if (slotsRemaining > 0) {
      for (const word of allFoundationWords) {
        if (!learnedWordSet.has(word.word)) {
          newWords.push(word);
          if (newWords.length >= slotsRemaining) break;
        }
      }
    }

    const sessionWords = [...reviewWords, ...newWords];
    const allWordsLearned = newWords.length === 0 && reviewCount === 0;

    return {
      words: sessionWords,
      reviewCount,
      newCount: newWords.length,
      totalLearned: userWords.length,
      allWordsLearned,
    };
  } catch (error) {
    console.error("Error in getNextSessionWords:", error);
    // Fallback to first session
    return {
      words: allFoundationWords.slice(0, wordsPerSession),
      reviewCount: 0,
      newCount: wordsPerSession,
      totalLearned: 0,
      allWordsLearned: false,
    };
  }
}

/**
 * Save or update a word in the database with SRS data
 */
export async function saveWordToDatabase(
  word: FoundationWord,
  language: string,
  rating: WordRating,
): Promise<void> {
  const supabase = createClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Check if word exists
    const { data: existingWord } = await supabase
      .from("user_words")
      .select("*")
      .eq("user_id", user.id)
      .eq("word", word.word)
      .eq("language", language)
      .single();

    const srsData = calculateNextReview(
      existingWord
        ? {
            ease_factor: existingWord.ease_factor,
            repetitions: existingWord.repetitions,
            interval: existingWord.interval,
            status: existingWord.status as WordStatus,
          }
        : {},
      rating,
    );

    const wordData = {
      user_id: user.id,
      word: word.word,
      language,
      lemma: word.lemma,
      ease_factor: srsData.ease_factor,
      repetitions: srsData.repetitions,
      interval: srsData.interval,
      next_review: srsData.next_review.toISOString(),
      status: srsData.status,
      last_reviewed: new Date().toISOString(),
      part_of_speech: word.pos,
      frequency_rank: word.rank,
    };

    if (existingWord) {
      // Update existing
      await supabase
        .from("user_words")
        .update(wordData)
        .eq("id", existingWord.id);
    } else {
      // Insert new
      await supabase.from("user_words").insert(wordData);
    }
  } catch (error) {
    console.error("Error saving word to database:", error);
  }
}

/**
 * Process session results and save all words to database
 */
export async function saveSessionWordsToDatabase(
  words: FoundationWord[],
  results: ExerciseResult[],
  language: string,
): Promise<void> {
  // Group results by word ID
  const resultsByWord = new Map<string, ExerciseResult[]>();

  results.forEach((result) => {
    const existing = resultsByWord.get(result.wordId) || [];
    existing.push(result);
    resultsByWord.set(result.wordId, existing);
  });

  // Process each word
  for (const word of words) {
    const wordResults = resultsByWord.get(word.id);

    // Determine rating based on performance
    let rating: WordRating = 3; // Default to "Good"

    if (wordResults && wordResults.length > 0) {
      const correctCount = wordResults.filter((r) => r.correct).length;
      const accuracy = correctCount / wordResults.length;

      if (accuracy >= 0.9) {
        rating = 4; // Easy
      } else if (accuracy >= 0.7) {
        rating = 3; // Good
      } else if (accuracy >= 0.5) {
        rating = 2; // Hard
      } else {
        rating = 1; // Wrong
      }
    } else {
      // No exercises for this word, mark as seen but not practiced
      rating = 3;
    }

    await saveWordToDatabase(word, language, rating);
  }
}

/**
 * Save session words with enhanced performance tracking
 * Includes pronunciation attempts, exercise results, and word interactions
 */
export async function saveSessionWordsWithPerformance(
  words: FoundationWord[],
  wordPerformances: Array<{
    wordId: string;
    word: string;
    pronunciationAttempts: number;
    pronunciationSuccess: boolean;
    exerciseResults: ExerciseResult[];
    correctCount: number;
    totalExercises: number;
    accuracy: number;
  }>,
  language: string,
): Promise<void> {
  const supabase = createClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      console.error("User not authenticated");
      return;
    }

    console.log(`Saving ${words.length} words with performance data...`);

    for (const word of words) {
      const performance = wordPerformances.find((p) => p.wordId === word.id);
      if (!performance) {
        console.warn(`No performance data found for word: ${word.word}`);
        continue;
      }

      // Calculate overall rating based on pronunciation AND quiz performance
      let rating: WordRating = 3; // Default "Good"

      // Factor in pronunciation success
      const pronunciationWeight = 0.3;
      const quizWeight = 0.7;

      const pronunciationScore = performance.pronunciationSuccess ? 1.0 : 0.5;
      const quizScore = performance.accuracy / 100;

      const overallScore =
        pronunciationScore * pronunciationWeight + quizScore * quizWeight;

      // Convert to SRS rating
      if (overallScore >= 0.9) {
        rating = 5; // Perfect - both pronunciation and quizzes excellent
      } else if (overallScore >= 0.8) {
        rating = 4; // Easy - good pronunciation and quizzes
      } else if (overallScore >= 0.6) {
        rating = 3; // Good - decent performance
      } else if (overallScore >= 0.4) {
        rating = 2; // Hard - struggled with pronunciation or quizzes
      } else {
        rating = 1; // Wrong - failed both
      }

      console.log(
        `Word "${word.word}": pronunciation=${performance.pronunciationSuccess}, quiz=${performance.accuracy}%, overall=${overallScore.toFixed(2)}, rating=${rating}`,
      );

      // Check if word exists
      const { data: existingWord } = await supabase
        .from("user_words")
        .select("*")
        .eq("user_id", user.id)
        .eq("word", word.word)
        .eq("language", language)
        .single();

      const srsData = calculateNextReview(
        existingWord
          ? {
              ease_factor: existingWord.ease_factor,
              repetitions: existingWord.repetitions,
              interval: existingWord.interval,
              status: existingWord.status as WordStatus,
            }
          : {},
        rating,
      );

      const wordData = {
        user_id: user.id,
        word: word.word,
        language,
        lemma: word.lemma,
        ease_factor: srsData.ease_factor,
        repetitions: srsData.repetitions,
        interval: srsData.interval,
        next_review: srsData.next_review.toISOString(),
        status: srsData.status,
        last_reviewed: new Date().toISOString(),
        rating: rating,
        last_rated_at: new Date().toISOString(),
        part_of_speech: word.pos,
        frequency_rank: word.rank,
      };

      let wordId: string;

      if (existingWord) {
        // Update existing
        await supabase
          .from("user_words")
          .update(wordData)
          .eq("id", existingWord.id);
        wordId = existingWord.id;
        console.log(
          `Updated existing word: ${word.word} (status: ${srsData.status})`,
        );
      } else {
        // Insert new
        const { data: newWord, error: insertError } = await supabase
          .from("user_words")
          .insert(wordData)
          .select("id")
          .single();

        if (insertError) {
          console.error(`Error inserting word ${word.word}:`, insertError);
          continue;
        }

        wordId = newWord.id;
        console.log(
          `Inserted new word: ${word.word} (status: ${srsData.status})`,
        );
      }

      // Create word interaction record
      const { error: interactionError } = await supabase
        .from("word_interactions")
        .insert({
          user_id: user.id,
          word_id: wordId,
          rating: rating,
          response_time_ms:
            performance.exerciseResults.length > 0
              ? Math.round(
                  performance.exerciseResults.reduce(
                    (sum, r) => sum + r.responseTimeMs,
                    0,
                  ) / performance.exerciseResults.length,
                )
              : null,
          context_sentence: null, // Could add example sentence from word data
          created_at: new Date().toISOString(),
        });

      if (interactionError) {
        console.error(
          `Error creating word interaction for ${word.word}:`,
          interactionError,
        );
      } else {
        console.log(`Created word interaction for: ${word.word}`);
      }
    }

    console.log("Successfully saved all words with performance data");
  } catch (error) {
    console.error("Error in saveSessionWordsWithPerformance:", error);
  }
}
