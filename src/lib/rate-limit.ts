/**
 * Per-user sliding-window rate limiter backed by Upstash Redis.
 *
 * Uses an atomic Lua script (INCR + EXPIRE + TTL in a single round-trip)
 * so the key can never exist without a TTL, avoiding the race condition
 * where a crash between INCR and EXPIRE permanently locks a user out.
 *
 * Fails CLOSED on Redis errors for LLM-backed routes: if Redis is down,
 * requests are denied rather than allowing unbounded LLM calls.
 *
 * Key format: `rl:{action}:{userId}`
 */

import { redis } from "@/lib/redis";

export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** How many requests remain in the current window */
  remaining: number;
  /** The configured limit for this action */
  limit: number;
  /** Seconds until the window resets (useful for Retry-After header) */
  retryAfterSeconds: number;
}

export interface RateLimitConfig {
  /** Max requests allowed in the window */
  limit: number;
  /** Window size in seconds (default: 3600 = 1 hour) */
  windowSeconds?: number;
}

/**
 * Pre-defined rate limits per action.
 * Add new actions here as the system grows.
 */
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  transcribe: { limit: 30, windowSeconds: 3600 }, // 30 per hour
  evaluate: { limit: 50, windowSeconds: 3600 }, // 50 per hour
  feedback: { limit: 30, windowSeconds: 3600 }, // 30 per hour
  "stories-generate": { limit: 10, windowSeconds: 3600 }, // 10 per hour
  translate: { limit: 60, windowSeconds: 3600 }, // 60 per hour
};

/**
 * Atomic Lua script that performs INCR + conditional EXPIRE + TTL
 * in a single Redis round-trip. Returns [count, ttl].
 *
 * KEYS[1] = rate-limit key
 * ARGV[1] = window seconds
 */
const RATE_LIMIT_LUA = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('EXPIRE', KEYS[1], tonumber(ARGV[1]))
end
local ttl = redis.call('TTL', KEYS[1])
if ttl < 0 then
  redis.call('EXPIRE', KEYS[1], tonumber(ARGV[1]))
  ttl = tonumber(ARGV[1])
end
return {count, ttl}
`;

/**
 * Check and consume one request from the user's rate-limit budget.
 *
 * Uses a Lua script so INCR + EXPIRE + TTL are atomic (single round-trip).
 * Fails CLOSED on Redis errors — denies requests rather than allowing
 * unbounded LLM calls during an Upstash outage.
 *
 * @param userId  Authenticated user ID
 * @param action  Action key matching a RATE_LIMITS entry
 * @returns       RateLimitResult
 */
export async function checkRateLimit(
  userId: string,
  action: string,
): Promise<RateLimitResult> {
  const config = RATE_LIMITS[action];
  if (!config) {
    // Unknown action → allow (fail open for undefined actions)
    return {
      allowed: true,
      remaining: Infinity,
      limit: Infinity,
      retryAfterSeconds: 0,
    };
  }

  const { limit, windowSeconds = 3600 } = config;
  const key = `rl:${action}:${userId}`;

  try {
    // Atomic: INCR + EXPIRE (if new) + TTL in one round-trip
    const result = (await redis.eval(
      RATE_LIMIT_LUA,
      [key],
      [windowSeconds],
    )) as [number, number];

    const count = Number(result[0]);
    const ttl = Number(result[1]);
    const retryAfterSeconds = ttl > 0 ? ttl : windowSeconds;

    if (count > limit) {
      return {
        allowed: false,
        remaining: 0,
        limit,
        retryAfterSeconds,
      };
    }

    return {
      allowed: true,
      remaining: Math.max(0, limit - count),
      limit,
      retryAfterSeconds: 0,
    };
  } catch (error) {
    // FAIL CLOSED: deny the request when Redis is down to prevent
    // unbounded LLM calls during an Upstash outage.
    console.error(
      `[rate-limit] Redis failure for ${action}:${userId} — DENYING request:`,
      error,
    );
    return {
      allowed: false,
      remaining: 0,
      limit,
      retryAfterSeconds: 60, // suggest retry in 60s
    };
  }
}

/**
 * Build standard rate-limit response headers.
 */
export function rateLimitHeaders(
  result: RateLimitResult,
): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
  };
  if (!result.allowed) {
    headers["Retry-After"] = String(result.retryAfterSeconds);
  }
  return headers;
}
