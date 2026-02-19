/**
 * BullMQ queue definition for background content generation.
 *
 * Uses ioredis (required by BullMQ) connected to Upstash Redis
 * via the UPSTASH_REDIS_REDIS_URL connection string.
 */

import { Queue } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis(process.env.UPSTASH_REDIS_REDIS_URL!, {
  maxRetriesPerRequest: null, // Required by BullMQ for blocking commands
  lazyConnect: true, // Don't open a TCP connection on import (critical for serverless)
  enableOfflineQueue: true, // Buffer commands until connection is ready
  retryStrategy(times: number) {
    // Exponential backoff capped at 10s; give up after 10 attempts
    if (times > 10) return null;
    return Math.min(times * 500, 10000);
  },
}) as any; // ioredis version mismatch with BullMQ's bundled ioredis types

export const generationQueue = new Queue("content-generation", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
});

/**
 * Job data shape for content generation jobs.
 */
export interface GenerationJobData {
  userId: string;
  lessonId: string;
  type: "story" | "word" | "tts" | "log-session";
  /** Target language code (e.g. "fr", "es") */
  targetLanguage: string;
  /** Optional: previous tone for story variety */
  previousTone?: string;
  /** Optional: previous interest index for rotation */
  previousInterestIndex?: number;
  /** TTS-specific: the text to synthesize */
  ttsText?: string;
  /** TTS-specific: template ID to update with the audio URL */
  templateId?: string;
  /** log-session: the row to insert into lesson_sessions_v2 */
  sessionLogData?: Record<string, unknown>;
}
