/**
 * Cache layer for learner_words_v2
 *
 * The learner words table is the single largest repeated unbounded DB read
 * in the hot path: every story generation, mastery check, and profile fetch
 * does a full `SELECT * FROM learner_words_v2 WHERE user_id = ?`.
 *
 * This module caches the result in Redis with a 2-minute TTL and provides
 * an explicit invalidation function called from update-mastery and
 * introduce-words.
 */

import { redis } from "@/lib/redis";
import { LearnerWord } from "@/types/lesson-v2";

const CACHE_TTL = 120; // 2 minutes
const CACHE_PREFIX = "learner_words";

function cacheKey(userId: string): string {
  return `${CACHE_PREFIX}:${userId}`;
}

/**
 * Map DB rows → LearnerWord objects.
 * Centralised here so every consumer uses the same mapping.
 */
export function mapDbRowsToLearnerWords(dbRows: any[]): LearnerWord[] {
  return (dbRows || []).map((w: any) => ({
    word: w.word,
    lemma: w.lemma,
    translation: w.translation,
    partOfSpeech: w.part_of_speech ?? w.partOfSpeech,
    frequencyRank: w.frequency_rank ?? w.frequencyRank,
    status: w.status,
    introducedAt: w.introduced_at ?? w.introducedAt,
    lastReviewedAt: w.last_reviewed_at ?? w.lastReviewedAt,
    correctStreak: w.correct_streak ?? w.correctStreak,
    totalReviews: w.total_reviews ?? w.totalReviews,
    totalCorrect: w.total_correct ?? w.totalCorrect,
  }));
}

/**
 * Get learner words, preferring cache.
 *
 * @param supabase  Supabase client (cookie-based or admin)
 * @param userId    Authenticated user ID
 * @returns         Array of LearnerWord, ordered by frequency_rank ASC
 */
export async function getLearnerWords(
  supabase: any,
  userId: string,
): Promise<LearnerWord[]> {
  // 1. Try cache
  try {
    const cached = await redis.get<LearnerWord[]>(cacheKey(userId));
    if (cached) return cached;
  } catch {
    // Redis miss or error — fall through to DB
  }

  // 2. Fetch from DB
  const { data: dbWords } = await supabase
    .from("learner_words_v2")
    .select("*")
    .eq("user_id", userId)
    .order("frequency_rank", { ascending: true });

  const words = mapDbRowsToLearnerWords(dbWords);

  // 3. Cache for next request
  try {
    await redis.set(cacheKey(userId), words, { ex: CACHE_TTL });
  } catch {
    // Non-fatal
  }

  return words;
}

/**
 * Invalidate the learner words cache for a user.
 * Call this after any write to learner_words_v2:
 *   - update-mastery (status, streak changes)
 *   - introduce-words (new rows inserted)
 */
export async function invalidateLearnerWordsCache(
  userId: string,
): Promise<void> {
  try {
    await redis.del(cacheKey(userId));
  } catch {
    // Non-fatal
  }
}
