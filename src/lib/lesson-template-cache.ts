/**
 * Cache layer for lesson_templates lookups.
 *
 * The lesson/generate route queries lesson_templates by (language, level, topic)
 * on every request. Since templates change rarely, a 5-minute Redis cache
 * drastically reduces Supabase read load.
 *
 * Pattern identical to learner-words-cache.ts / profile-cache.ts.
 */

import { redis } from "@/lib/redis";

const CACHE_TTL = 300; // 5 minutes
const CACHE_PREFIX = "lesson_tpl";

function cacheKey(language: string, level: string, topic: string): string {
  return `${CACHE_PREFIX}:${language}:${level}:${topic}`;
}

/**
 * Get a lesson template by (language, level, topic), preferring cache.
 *
 * @returns The template row or null if none exists.
 */
export async function getCachedLessonTemplate(
  supabase: any,
  language: string,
  level: string,
  topic: string,
): Promise<any | null> {
  const key = cacheKey(language, level, topic);

  // 1. Try cache
  try {
    const cached = await redis.get<any>(key);
    // Distinguish "cached null" (no template) from "cache miss"
    if (cached !== null && cached !== undefined) return cached;
    // We also cache explicit misses as the string "__null__"
    const raw = await redis.get<string>(key);
    if (raw === "__null__") return null;
  } catch {
    // Redis miss or error — fall through to DB
  }

  // 2. Fetch from DB
  const { data, error } = await supabase
    .from("lesson_templates")
    .select("*")
    .eq("language", language)
    .eq("level", level)
    .eq("topic", topic)
    .maybeSingle();

  if (error) {
    console.warn("lesson_templates lookup error:", error.message);
    return null;
  }

  // 3. Cache result (even if null to prevent repeated DB misses)
  try {
    if (data) {
      await redis.set(key, data, { ex: CACHE_TTL });
    } else {
      await redis.set(key, "__null__", { ex: CACHE_TTL });
    }
  } catch {
    // Non-fatal
  }

  return data;
}

/**
 * Invalidate a specific lesson template cache entry.
 * Call after inserting/updating a template.
 */
export async function invalidateLessonTemplateCache(
  language: string,
  level: string,
  topic: string,
): Promise<void> {
  try {
    await redis.del(cacheKey(language, level, topic));
  } catch {
    // Non-fatal
  }
}
