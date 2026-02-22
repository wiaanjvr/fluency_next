/* =============================================================================
   SESSION DEDUPLICATION GUARD — Prevents redundant reviews
   
   Prevents the same word from being reviewed redundantly within a single
   cross-module session or within a short time window.
   
   Architecture:
   - In-memory Map for immediate access (primary, always available)
   - Falls back gracefully — no Redis dependency required for correctness
   - TTL-based expiry using periodic cleanup
   
   The guard is a RECOMMENDATION, not a hard block. Modules may override
   it for specific pedagogical reasons (e.g. user explicitly taps to review)
   but must log the override reason.
   
   Production note: In a multi-instance deployment, replace the in-memory
   store with Redis using keys like:
     fluensea:reviewed:{userId}:{wordId} → { moduleSource, timestamp }
   with TTL of 24 hours.
============================================================================= */

import type { ModuleSource } from "./types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReviewMark {
  moduleSource: ModuleSource;
  timestamp: Date;
  correct: boolean;
}

// ---------------------------------------------------------------------------
// SessionDeduplicationGuard
// ---------------------------------------------------------------------------

class SessionDeduplicationGuard {
  /**
   * In-memory store: Map<compositeKey, ReviewMark>
   * Key format: `{userId}:{wordId}`
   *
   * In production, this would be backed by Redis with TTL.
   * The in-memory implementation uses a periodic cleanup to evict
   * entries older than 24 hours.
   */
  private store: Map<string, ReviewMark> = new Map();

  /** Track all words reviewed per user today for getReviewedWordsToday */
  private dailyStore: Map<string, Map<string, ReviewMark>> = new Map();

  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Clean up expired entries every 5 minutes
    if (typeof setInterval !== "undefined") {
      this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
    }
  }

  // ── Key helpers ──────────────────────────────────────────────────────────

  private reviewKey(userId: string, wordId: string): string {
    return `${userId}:${wordId}`;
  }

  // ── Public API ───────────────────────────────────────────────────────────

  /**
   * Record that a word was reviewed. Called by processReview after
   * successfully processing a review event.
   */
  markReviewed(
    userId: string,
    wordId: string,
    moduleSource: ModuleSource,
    timestamp: Date,
    correct: boolean = true,
  ): void {
    const key = this.reviewKey(userId, wordId);
    this.store.set(key, { moduleSource, timestamp, correct });

    // Also update daily store
    if (!this.dailyStore.has(userId)) {
      this.dailyStore.set(userId, new Map());
    }
    this.dailyStore
      .get(userId)!
      .set(wordId, { moduleSource, timestamp, correct });
  }

  /**
   * Check if a word was reviewed correctly within the specified time window.
   *
   * @param windowHours - Number of hours to look back (default: 2)
   * @returns true if the word was reviewed correctly within the window
   */
  wasReviewedRecently(
    userId: string,
    wordId: string,
    windowHours: number = 2,
  ): boolean {
    const key = this.reviewKey(userId, wordId);
    const mark = this.store.get(key);

    if (!mark) return false;

    const cutoff = new Date(Date.now() - windowHours * 60 * 60 * 1000);
    return mark.correct && mark.timestamp >= cutoff;
  }

  /**
   * Get all word IDs reviewed today for a user.
   */
  getReviewedWordsToday(userId: string): string[] {
    const userStore = this.dailyStore.get(userId);
    if (!userStore) return [];

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const result: string[] = [];
    for (const [wordId, mark] of userStore) {
      if (mark.timestamp >= todayStart) {
        result.push(wordId);
      }
    }
    return result;
  }

  /**
   * Get all word IDs reviewed in the last N hours for a user.
   */
  getWordsReviewedInLastNHours(userId: string, hours: number): string[] {
    const userStore = this.dailyStore.get(userId);
    if (!userStore) return [];

    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

    const result: string[] = [];
    for (const [wordId, mark] of userStore) {
      if (mark.timestamp >= cutoff) {
        result.push(wordId);
      }
    }
    return result;
  }

  /**
   * Get the module and timestamp of the most recent review for a word.
   * Returns null if no review found in the guard.
   */
  getLastReview(
    userId: string,
    wordId: string,
  ): { moduleSource: ModuleSource; timestamp: Date } | null {
    const key = this.reviewKey(userId, wordId);
    const mark = this.store.get(key);
    if (!mark) return null;
    return { moduleSource: mark.moduleSource, timestamp: mark.timestamp };
  }

  /**
   * Get which modules reviewed a word today.
   */
  getModulesReviewedToday(userId: string, wordId: string): ModuleSource[] {
    const userStore = this.dailyStore.get(userId);
    if (!userStore) return [];

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const mark = userStore.get(wordId);
    if (!mark || mark.timestamp < todayStart) return [];

    return [mark.moduleSource];
  }

  // ── Cleanup ──────────────────────────────────────────────────────────────

  /**
   * Remove entries older than 24 hours.
   */
  private cleanup(): void {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    for (const [key, mark] of this.store) {
      if (mark.timestamp < cutoff) {
        this.store.delete(key);
      }
    }

    // Clean daily store
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    for (const [userId, userStore] of this.dailyStore) {
      for (const [wordId, mark] of userStore) {
        if (mark.timestamp < todayStart) {
          userStore.delete(wordId);
        }
      }
      if (userStore.size === 0) {
        this.dailyStore.delete(userId);
      }
    }
  }

  /**
   * Clear all entries (useful for testing).
   */
  clear(): void {
    this.store.clear();
    this.dailyStore.clear();
  }

  /**
   * Destroy the guard and stop cleanup interval.
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}

/** Singleton instance */
export const deduplicationGuard = new SessionDeduplicationGuard();
