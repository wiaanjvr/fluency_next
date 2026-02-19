/**
 * Per-account daily generation budget.
 *
 * Even premium users need a hard ceiling to prevent a compromised account
 * from running up unbounded LLM costs. This module provides a Redis-backed
 * atomic daily counter that is checked before every LLM-backed route.
 *
 * Free users are already limited by claimSession() — this module adds an
 * absolute ceiling for premium accounts.
 *
 * Key format: `budget:{userId}:{YYYY-MM-DD}`
 * TTL: 90000 s (25 hours — covers timezone edge cases)
 */

import { redis } from "@/lib/redis";

/** Maximum generations per day, per account. Generous but bounded. */
export const DAILY_GENERATION_BUDGET = 200;

/** TTL for the budget key — 25 hours covers timezone edge cases */
const BUDGET_TTL = 90_000;

/**
 * Lua script: atomic INCR + conditional EXPIRE + TTL (same pattern as rate-limit).
 * Returns [count, ttl].
 */
const BUDGET_LUA = `
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

export interface BudgetResult {
  allowed: boolean;
  /** Current generation count for today */
  count: number;
  /** Daily budget ceiling */
  budget: number;
  /** Remaining generations */
  remaining: number;
}

function todayKey(userId: string): string {
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return `budget:${userId}:${date}`;
}

/**
 * Consume one generation from the user's daily budget.
 *
 * Call this BEFORE firing any LLM call. If `allowed` is false the
 * account has hit its daily ceiling and the route should return 429.
 *
 * Fails CLOSED on Redis errors (denies the request).
 */
export async function consumeDailyBudget(
  userId: string,
): Promise<BudgetResult> {
  const key = todayKey(userId);

  try {
    const result = (await redis.eval(BUDGET_LUA, [key], [BUDGET_TTL])) as [
      number,
      number,
    ];

    const count = Number(result[0]);

    if (count > DAILY_GENERATION_BUDGET) {
      return {
        allowed: false,
        count,
        budget: DAILY_GENERATION_BUDGET,
        remaining: 0,
      };
    }

    return {
      allowed: true,
      count,
      budget: DAILY_GENERATION_BUDGET,
      remaining: DAILY_GENERATION_BUDGET - count,
    };
  } catch (error) {
    // FAIL CLOSED: deny the request when Redis is down
    console.error(
      `[daily-budget] Redis failure for ${userId} — DENYING request:`,
      error,
    );
    return {
      allowed: false,
      count: 0,
      budget: DAILY_GENERATION_BUDGET,
      remaining: 0,
    };
  }
}

/**
 * Peek at today's budget without consuming a generation.
 * Useful for UI display.
 */
export async function peekDailyBudget(userId: string): Promise<BudgetResult> {
  const key = todayKey(userId);

  try {
    const count = (await redis.get<number>(key)) ?? 0;
    return {
      allowed: count < DAILY_GENERATION_BUDGET,
      count,
      budget: DAILY_GENERATION_BUDGET,
      remaining: Math.max(0, DAILY_GENERATION_BUDGET - count),
    };
  } catch {
    // On error, return conservative estimate
    return {
      allowed: true,
      count: 0,
      budget: DAILY_GENERATION_BUDGET,
      remaining: DAILY_GENERATION_BUDGET,
    };
  }
}
