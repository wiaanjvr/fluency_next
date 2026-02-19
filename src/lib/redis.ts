/**
 * Upstash Redis REST client for direct reads/writes.
 * Used for quick lookups outside of BullMQ (e.g., cache checks).
 *
 * BullMQ itself uses ioredis — see lib/queue.ts.
 */

import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});
