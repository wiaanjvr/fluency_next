/**
 * Cache layer for user profiles (hot-path reads).
 *
 * Every lesson/generate, generate-story, and stories/generate call does
 * `SELECT ... FROM profiles WHERE id = ?`. This module caches the result
 * in Redis with a 5-minute TTL and provides explicit invalidation.
 *
 * Pattern identical to learner-words-cache.ts.
 */

import { redis } from "@/lib/redis";

const CACHE_TTL = 300; // 5 minutes
const CACHE_PREFIX = "profile";

function cacheKey(userId: string): string {
  return `${CACHE_PREFIX}:${userId}`;
}

export interface CachedProfile {
  proficiency_level?: string;
  target_language?: string;
  native_language?: string;
  interests?: string[];
  subscription_tier?: string;
}

/**
 * Get a user profile, preferring cache.
 *
 * @param supabase  Supabase client (cookie-based or admin)
 * @param userId    Authenticated user ID
 * @param fields    Columns to select (defaults to the hot-path set)
 */
export async function getCachedProfile(
  supabase: any,
  userId: string,
  fields: string = "proficiency_level, target_language, native_language, interests, subscription_tier",
): Promise<CachedProfile | null> {
  // 1. Try cache
  try {
    const cached = await redis.get<CachedProfile>(cacheKey(userId));
    if (cached) return cached;
  } catch {
    // Redis miss or error — fall through to DB
  }

  // 2. Fetch from DB
  const { data, error } = await supabase
    .from("profiles")
    .select(fields)
    .eq("id", userId)
    .single();

  if (error || !data) return null;

  // 3. Cache for next request
  try {
    await redis.set(cacheKey(userId), data, { ex: CACHE_TTL });
  } catch {
    // Non-fatal
  }

  return data as CachedProfile;
}

/**
 * Invalidate the profile cache for a user.
 * Call after profile updates (settings, subscription changes, etc.).
 */
export async function invalidateProfileCache(userId: string): Promise<void> {
  try {
    await redis.del(cacheKey(userId));
  } catch {
    // Non-fatal
  }
}
