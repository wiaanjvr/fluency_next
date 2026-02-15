/**
 * Seed script to populate user's initial French vocabulary based on placement test
 *
 * PLACEMENT TEST → VOCABULARY SEEDING → LESSON ROUTING FLOW:
 * ============================================================
 *
 * 1. User completes placement test (audio + reading comprehension)
 * 2. Test determines proficiency level (A0, A1, A2, B1, B2, C1, C2)
 * 3. System seeds known vocabulary based on level:
 *    - A0: 0 words    → Start at Foundation Phase
 *    - A1: 100 words  → Continue Foundation Phase
 *    - A2: 200 words  → Near completion of Foundation
 *    - B1: 500 words  → Ready for Micro-Stories
 *    - B2+: 1000 words → Ready for Acquisition Mode (main lessons)
 *
 * 4. Dashboard automatically routes to appropriate lesson type:
 *    - 0-99 words: /learn/foundation (Foundation Phase)
 *    - 100-299 words: /learn/sentences (unlocked but foundation still recommended)
 *    - 300-499 words: /learn/stories (Micro-Stories Phase)
 *    - 500+ words: /lesson (Acquisition Mode - comprehensible input)
 *
 * This ensures users start at the right difficulty level and are never
 * overwhelmed or under-challenged. The system respects their existing
 * knowledge while providing a clear progression path.
 *
 * Run automatically after placement test completion in onboarding flow.
 */

import { createClient } from "@/lib/supabase/client";
import commonFrenchWords from "@/data/common-french-words.json";
import { ProficiencyLevel } from "@/types";

/**
 * Level to word count allocation
 * Based on placement test results, users get this many known words
 *
 * This determines:
 * - Initial vocabulary size after placement test
 * - What lesson type/phase they start with:
 *   - A0 (0 words): Foundation Phase (learn first 300 words)
 *   - A1 (100 words): Foundation Phase (continue to 300)
 *   - A2 (200 words): Foundation Phase (nearly complete) OR Sentences if near 300
 *   - B1 (500 words): Micro-Stories Phase (300-500 words)
 *   - B2+ (1000 words): Ready for Acquisition Mode (main lessons)
 *
 * Note: Limited by common-french-words.json which contains 1000 words
 */
export const LEVEL_WORD_ALLOCATION: Record<ProficiencyLevel, number> = {
  A0: 0, // Complete beginners: Start with Foundation Phase (0 → 300 words)
  A1: 100, // Elementary: Foundation Phase still (100 → 300 words)
  A2: 200, // Pre-intermediate: Foundation Phase (200 → 300 words)
  B1: 500, // Intermediate: Micro-Stories Phase (ready for 3-5 sentence stories)
  B2: 1000, // Upper-intermediate: Acquisition Mode (comprehensible input stories)
  C1: 1000, // Advanced: Limited by available common words (1000 max)
  C2: 1000, // Proficient: Limited by available common words (1000 max)
};

/**
 * Get words for a specific level from the common words list
 */
export function getWordsForLevel(
  level: ProficiencyLevel,
): typeof commonFrenchWords.words {
  const wordCount = LEVEL_WORD_ALLOCATION[level] || 0;
  return commonFrenchWords.words.slice(0, wordCount);
}

/**
 * Get all 1000 common French words
 */
export function getAllCommonWords(): typeof commonFrenchWords.words {
  return commonFrenchWords.words;
}

/**
 * Get just the word strings for a level (useful for story generation)
 */
export function getWordStringsForLevel(level: ProficiencyLevel): string[] {
  return getWordsForLevel(level).map((w) => w.word);
}

// Legacy exports for backwards compatibility
export const COMMON_FRENCH_WORDS_A0_A1 = commonFrenchWords.words
  .slice(0, 200)
  .map((w) => w.word);
export const COMMON_FRENCH_WORDS_A2_B1 = commonFrenchWords.words
  .slice(200, 350)
  .map((w) => w.word);

/**
 * Seed user vocabulary with known words based on placement level
 * Words are marked as "known" status with proper SRS data
 */
export async function seedUserVocabulary(
  userId: string,
  level: ProficiencyLevel,
  language: string = "fr",
) {
  const supabase = createClient();
  const wordsToSeed = getWordsForLevel(level);

  if (wordsToSeed.length === 0) {
    console.log(`Level ${level} has no words to seed`);
    return 0;
  }

  // Prepare insert data - these are KNOWN words from placement
  const now = new Date().toISOString();
  // Set next review far in the future since these are already known
  const futureReview = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const wordsData = wordsToSeed.map((wordData) => ({
    user_id: userId,
    word: wordData.word,
    lemma: wordData.lemma,
    language: language,
    part_of_speech: wordData.pos,
    frequency_rank: wordData.rank,
    // Mark as known with solid SRS data
    status: "known",
    ease_factor: 2.5, // renamed from easiness_factor
    repetitions: 5, // Already known means they've effectively reviewed it
    interval: 30, // renamed from interval_days
    next_review: futureReview,
    created_at: now, // renamed from first_seen
    updated_at: now, // renamed from last_seen
    last_reviewed: now,
    last_rated_at: now,
  }));

  // Insert in batches to avoid timeout
  const batchSize = 100;
  let totalInserted = 0;

  for (let i = 0; i < wordsData.length; i += batchSize) {
    const batch = wordsData.slice(i, i + batchSize);

    const { error, data } = await supabase.from("user_words").upsert(batch, {
      onConflict: "user_id,word,language",
      ignoreDuplicates: true,
    });

    if (error) {
      console.error(`Error seeding batch ${i / batchSize + 1}:`, error);
      throw error;
    }

    totalInserted += batch.length;
  }

  console.log(
    `Successfully seeded ${totalInserted} known words for user ${userId} at level ${level}`,
  );
  return totalInserted;
}

/**
 * Mark specific words as known (for manual updates)
 */
export async function markWordsAsKnown(
  userId: string,
  words: string[],
  language: string = "fr",
) {
  const supabase = createClient();
  const futureReview = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { error } = await supabase
    .from("user_words")
    .update({
      status: "known",
      repetitions: 5,
      ease_factor: 2.5, // renamed from easiness_factor
      interval: 30, // renamed from interval_days
      next_review: futureReview,
      last_rated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("language", language)
    .in("word", words);

  if (error) {
    console.error("Error marking words as known:", error);
    throw error;
  }

  console.log(`Marked ${words.length} words as known`);
  return words.length;
}

/**
 * Get user's known words count
 */
export async function getKnownWordCount(
  userId: string,
  language: string = "fr",
): Promise<number> {
  const supabase = createClient();

  const { count, error } = await supabase
    .from("user_words")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("language", language)
    .in("status", ["known", "mastered"]);

  if (error) {
    console.error("Error getting known word count:", error);
    return 0;
  }

  return count || 0;
}

/**
 * Determine the appropriate lesson path based on word count
 *
 * Learning Journey:
 * - 0-299 words: Foundation Phase (/learn/foundation)
 * - 100-299 words: Can also access Sentence Phase (/learn/sentences)
 * - 300-499 words: Micro-Stories Phase (/learn/stories)
 * - 500+ words: Acquisition Mode (/lesson - main comprehensible input)
 */
export function getLessonPathForWordCount(wordCount: number): string {
  if (wordCount >= 500) {
    return "/lesson"; // Main acquisition mode
  } else if (wordCount >= 300) {
    return "/learn/stories"; // Micro-stories
  } else if (wordCount >= 100) {
    return "/learn/sentences"; // Sentence patterns (but foundation still available)
  } else {
    return "/learn/foundation"; // Foundation vocabulary
  }
}

/**
 * Get user's known word strings (for story generation)
 */
export async function getUserKnownWords(
  userId: string,
  language: string = "fr",
): Promise<string[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("user_words")
    .select("word")
    .eq("user_id", userId)
    .eq("language", language)
    .in("status", ["known", "mastered", "learning"]);

  if (error) {
    console.error("Error getting known words:", error);
    return [];
  }

  return data?.map((w) => w.word) || [];
}
