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
 * Check if a user can start a new session (without incrementing the counter)
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
      // On error, allow the session (fail open)
      return { allowed: true };
    }

    return data as UsageStatus;
  } catch (error) {
    console.error("Exception checking session limit:", error);
    // On error, allow the session (fail open)
    return { allowed: true };
  }
}

/**
 * Increment session count after successful completion
 * Returns whether the increment was successful and usage info
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
      // Return success even on error to not block user
      return { allowed: true };
    }

    return data as UsageStatus;
  } catch (error) {
    console.error("Exception incrementing session count:", error);
    return { allowed: true };
  }
}

/**
 * Get today's usage stats for a user
 */
export async function getTodayUsage(
  userId: string,
): Promise<DailyUsage | null> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase.rpc("get_today_usage", {
      p_user_id: userId,
    });

    if (error) {
      console.error("Error getting today's usage:", error);
      return null;
    }

    // The function returns a single row, extract it
    if (Array.isArray(data) && data.length > 0) {
      return data[0] as DailyUsage;
    }

    return {
      foundation_sessions: 0,
      sentence_sessions: 0,
      microstory_sessions: 0,
      main_lessons: 0,
    };
  } catch (error) {
    console.error("Exception getting today's usage:", error);
    return null;
  }
}

/**
 * Get user's subscription tier
 */
export async function getUserSubscriptionTier(
  userId: string,
): Promise<"free" | "premium" | null> {
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

    return (data?.subscription_tier as "free" | "premium") || "free";
  } catch (error) {
    console.error("Exception getting user subscription tier:", error);
    return null;
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
