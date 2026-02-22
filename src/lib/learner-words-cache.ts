/**
 * Cache layer for learner_words_v2
 *
 * The learner words table is the single largest repeated unbounded DB read
 * in the hot path: every story generation, mastery check, and profile fetch
 * does a full `SELECT * FROM learner_words_v2 WHERE user_id = ? AND language = ?`.
 *
 * This module caches the result in Redis with a 2-minute TTL keyed by
 * (userId, language) and provides an explicit invalidation function called
 * from update-mastery and introduce-words.
 */

import { redis } from "@/lib/redis";
import { LearnerWord } from "@/types/lesson-v2";

const CACHE_TTL = 120; // 2 minutes
const CACHE_PREFIX = "learner_words";

/** Cache key is scoped to both user and language so multi-language learners
 *  never see another language's words in their cache. */
function cacheKey(userId: string, language: string): string {
  return `${CACHE_PREFIX}:${userId}:${language}`;
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
 * Get learner words for a specific language, preferring cache.
 *
 * @param supabase  Supabase client (cookie-based or admin)
 * @param userId    Authenticated user ID
 * @param language  Target language code (e.g. 'fr', 'de')
 * @returns         Array of LearnerWord, ordered by frequency_rank ASC
 */
export async function getLearnerWords(
  supabase: any,
  userId: string,
  language: string,
): Promise<LearnerWord[]> {
  // 1. Try cache
  try {
    const cached = await redis.get<LearnerWord[]>(cacheKey(userId, language));
    if (cached) return cached;
  } catch {
    // Redis miss or error — fall through to DB
  }

  // 2. Fetch from DB, scoped to the requested language
  const { data: dbWords } = await supabase
    .from("learner_words_v2")
    .select("*")
    .eq("user_id", userId)
    .eq("language", language)
    .order("frequency_rank", { ascending: true });

  const words = mapDbRowsToLearnerWords(dbWords);

  // 3. Cache for next request
  try {
    await redis.set(cacheKey(userId, language), words, { ex: CACHE_TTL });
  } catch {
    // Non-fatal
  }

  return words;
}

/**
 * Invalidate the learner words cache for a user + language combination.
 * Call this after any write to learner_words_v2:
 *   - update-mastery (status, streak changes)
 *   - introduce-words (new rows inserted)
 *
 * @param userId    Authenticated user ID
 * @param language  Language code whose cache to invalidate.
 *                  Pass "*" (or omit) to clear ALL language caches for the user.
 */
export async function invalidateLearnerWordsCache(
  userId: string,
  language?: string,
): Promise<void> {
  try {
    if (language && language !== "*") {
      await redis.del(cacheKey(userId, language));
    } else {
      // Scan and delete all language-variant keys for this user.
      // Pattern: learner_words:{userId}:*
      const pattern = `${CACHE_PREFIX}:${userId}:*`;
      let cursor = 0;
      do {
        const [nextCursor, keys] = await redis.scan(cursor, {
          match: pattern,
          count: 100,
        });
        cursor = Number(nextCursor);
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      } while (cursor !== 0);
    }
  } catch {
    // Non-fatal
  }
}
