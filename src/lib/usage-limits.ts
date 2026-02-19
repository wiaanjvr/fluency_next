/* =============================================================================
   USAGE LIMITS
   
   Utilities for enforcing daily usage limits on free tier users:
   - 5 foundation vocabulary sessions per day
   - 3 sentence sessions per day
   - 1 microstory session per day
   - 1 main/acquisition mode lesson per day
   
   Premium users have unlimited access to all session types.
============================================================================= */

import { createClient } from "@/lib/supabase/server";
import { redis } from "@/lib/redis";

export type SessionType = "foundation" | "sentence" | "microstory" | "main";

export interface UsageLimits {
  foundation: number;
  sentence: number;
  microstory: number;
  main: number;
}

export interface UsageStatus {
  allowed: boolean;
  isPremium?: boolean;
  limitReached?: boolean;
  currentCount?: number;
  limit?: number;
  remaining?: number;
  sessionType?: SessionType;
}

export interface DailyUsage {
  foundation_sessions: number;
  sentence_sessions: number;
  microstory_sessions: number;
  main_lessons: number;
}

// Daily limits for free tier users
export const FREE_TIER_LIMITS: UsageLimits = {
  foundation: 5,
  sentence: 3,
  microstory: 1,
  main: 1,
};

/**
 * Atomic claim: check limit AND increment in a single Postgres call.
 * This replaces the old canStartSession + incrementSessionCount two-step
 * flow that had a TOCTOU race condition.
 *
 * Call this BEFORE doing expensive work (LLM calls). If allowed=true,
 * the counter has already been incremented — no separate increment needed.
 */
export async function claimSession(
  userId: string,
  sessionType: SessionType,
): Promise<UsageStatus> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase.rpc("claim_session", {
      p_user_id: userId,
      p_session_type: sessionType,
    });

    if (error) {
      console.error("Error claiming session:", error);
      // FAIL CLOSED: deny the session on DB error to prevent runaway LLM costs
      return { allowed: false, limitReached: true };
    }

    // Invalidate usage cache after successful claim
    if (data?.allowed) {
      await invalidateUsageCache(userId);
    }

    return data as UsageStatus;
  } catch (error) {
    console.error("Exception claiming session:", error);
    // FAIL CLOSED: deny the session on exception
    return { allowed: false, limitReached: true };
  }
}

/**
 * Check if a user can start a new session (without incrementing the counter).
 * Use claimSession() instead for the actual generation flow.
 * This is only for displaying UI state (e.g. greying out buttons).
 */
export async function canStartSession(
  userId: string,
  sessionType: SessionType,
): Promise<UsageStatus> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase.rpc("can_start_session", {
      p_user_id: userId,
      p_session_type: sessionType,
    });

    if (error) {
      console.error("Error checking session limit:", error);
      // FAIL CLOSED — UI will show "limit reached" rather than allowing free LLM calls
      return { allowed: false, limitReached: true };
    }

    return data as UsageStatus;
  } catch (error) {
    console.error("Exception checking session limit:", error);
    // FAIL CLOSED
    return { allowed: false, limitReached: true };
  }
}

/**
 * Increment session count after successful completion.
 * @deprecated Use claimSession() instead — it atomically checks + increments.
 */
export async function incrementSessionCount(
  userId: string,
  sessionType: SessionType,
): Promise<UsageStatus> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase.rpc("increment_session_count", {
      p_user_id: userId,
      p_session_type: sessionType,
    });

    if (error) {
      console.error("Error incrementing session count:", error);
      // FAIL CLOSED
      return { allowed: false, limitReached: true };
    }

    return data as UsageStatus;
  } catch (error) {
    console.error("Exception incrementing session count:", error);
    // FAIL CLOSED
    return { allowed: false, limitReached: true };
  }
}

/**
 * Get today's usage stats for a user.
 * Results are cached in Redis for 30 seconds to reduce DB load.
 */
export async function getTodayUsage(
  userId: string,
): Promise<DailyUsage | null> {
  // Check Redis cache first
  const cacheKey = `usage:${userId}:today`;
  try {
    const cached = await redis.get<DailyUsage>(cacheKey);
    if (cached) return cached;
  } catch {
    // Redis miss or error — fall through to DB
  }

  const supabase = await createClient();

  try {
    const { data, error } = await supabase.rpc("get_today_usage", {
      p_user_id: userId,
    });

    if (error) {
      console.error("Error getting today's usage:", error);
      return null;
    }

    const usage: DailyUsage =
      Array.isArray(data) && data.length > 0
        ? (data[0] as DailyUsage)
        : {
            foundation_sessions: 0,
            sentence_sessions: 0,
            microstory_sessions: 0,
            main_lessons: 0,
          };

    // Cache for 30 seconds
    try {
      await redis.set(cacheKey, usage, { ex: 30 });
    } catch {
      // Non-fatal
    }

    return usage;
  } catch (error) {
    console.error("Exception getting today's usage:", error);
    return null;
  }
}

/**
 * Invalidate the cached daily usage after a session claim.
 */
export async function invalidateUsageCache(userId: string): Promise<void> {
  try {
    await redis.del(`usage:${userId}:today`);
  } catch {
    // Non-fatal
  }
}

/**
 * Get user's subscription tier.
 * Results are cached in Redis for 5 minutes.
 */
export async function getUserSubscriptionTier(
  userId: string,
): Promise<"free" | "premium" | null> {
  // Check Redis cache first
  const cacheKey = `user:${userId}:tier`;
  try {
    const cached = await redis.get<string>(cacheKey);
    if (cached) return cached as "free" | "premium";
  } catch {
    // Redis miss or error — fall through to DB
  }

  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error getting user subscription tier:", error);
      return null;
    }

    const tier = (data?.subscription_tier as "free" | "premium") || "free";

    // Cache for 5 minutes
    try {
      await redis.set(cacheKey, tier, { ex: 300 });
    } catch {
      // Non-fatal
    }

    return tier;
  } catch (error) {
    console.error("Exception getting user subscription tier:", error);
    return null;
  }
}

/**
 * Invalidate the cached subscription tier (call after subscription changes).
 */
export async function invalidateTierCache(userId: string): Promise<void> {
  try {
    await redis.del(`user:${userId}:tier`);
  } catch {
    // Non-fatal
  }
}

/**
 * Get remaining sessions for each type
 */
export async function getRemainingSessionsByType(userId: string): Promise<{
  foundation: number;
  sentence: number;
  microstory: number;
  main: number;
  isPremium: boolean;
}> {
  const tier = await getUserSubscriptionTier(userId);
  const isPremium = tier === "premium";

  if (isPremium) {
    return {
      foundation: -1, // -1 indicates unlimited
      sentence: -1,
      microstory: -1,
      main: -1,
      isPremium: true,
    };
  }

  const usage = await getTodayUsage(userId);

  if (!usage) {
    return {
      foundation: FREE_TIER_LIMITS.foundation,
      sentence: FREE_TIER_LIMITS.sentence,
      microstory: FREE_TIER_LIMITS.microstory,
      main: FREE_TIER_LIMITS.main,
      isPremium: false,
    };
  }

  return {
    foundation: Math.max(
      0,
      FREE_TIER_LIMITS.foundation - usage.foundation_sessions,
    ),
    sentence: Math.max(0, FREE_TIER_LIMITS.sentence - usage.sentence_sessions),
    microstory: Math.max(
      0,
      FREE_TIER_LIMITS.microstory - usage.microstory_sessions,
    ),
    main: Math.max(0, FREE_TIER_LIMITS.main - usage.main_lessons),
    isPremium: false,
  };
}

/**
 * Helper to get session type from a path
 */
export function getSessionTypeFromPath(path: string): SessionType | null {
  if (path.includes("/learn/foundation")) return "foundation";
  if (path.includes("/learn/sentences")) return "sentence";
  if (path.includes("/learn/stories")) return "microstory";
  if (path.includes("/lesson")) return "main";
  return null;
}
