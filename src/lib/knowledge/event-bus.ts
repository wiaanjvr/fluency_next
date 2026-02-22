/* =============================================================================
   EVENT BUS — Internal pub/sub for WordReviewedEvent
   
   Lightweight in-process event bus that allows downstream systems (story
   engine, UI, ML pipeline) to react to review events without coupling to
   the processReview function.
   
   Usage:
     import { eventBus } from "@/lib/knowledge/event-bus";
     eventBus.on("wordReviewed", handler);
     eventBus.emit("wordReviewed", event);
============================================================================= */

import type { WordReviewedEvent, EventHandler } from "./types";

type EventMap = {
  wordReviewed: WordReviewedEvent;
};

type EventName = keyof EventMap;

class KnowledgeEventBus {
  private handlers: Map<EventName, Set<EventHandler<unknown>>> = new Map();

  /**
   * Subscribe to an event. Returns an unsubscribe function.
   */
  on<K extends EventName>(
    event: K,
    handler: EventHandler<EventMap[K]>,
  ): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    const set = this.handlers.get(event)!;
    set.add(handler as EventHandler<unknown>);

    return () => {
      set.delete(handler as EventHandler<unknown>);
    };
  }

  /**
   * Emit an event to all registered handlers. Handlers are invoked
   * asynchronously (fire-and-forget) — a slow handler won't block
   * processReview from returning.
   */
  async emit<K extends EventName>(
    event: K,
    payload: EventMap[K],
  ): Promise<void> {
    const set = this.handlers.get(event);
    if (!set || set.size === 0) return;

    const promises: Promise<void>[] = [];
    for (const handler of set) {
      try {
        const result = (handler as EventHandler<EventMap[K]>)(payload);
        if (result instanceof Promise) {
          promises.push(
            result.catch((err) => {
              console.warn(`[EventBus] Handler error for "${event}":`, err);
            }),
          );
        }
      } catch (err) {
        console.warn(`[EventBus] Sync handler error for "${event}":`, err);
      }
    }

    // Wait for all async handlers but don't let them block each other
    if (promises.length > 0) {
      await Promise.allSettled(promises);
    }
  }

  /**
   * Remove all handlers (useful for testing).
   */
  clear(): void {
    this.handlers.clear();
  }

  /**
   * Get the number of registered handlers for an event (useful for testing).
   */
  listenerCount(event: EventName): number {
    return this.handlers.get(event)?.size ?? 0;
  }
}

/** Singleton event bus instance */
export const eventBus = new KnowledgeEventBus();
