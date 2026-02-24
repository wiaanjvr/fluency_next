/* =============================================================================
   useSessionTracker — Client-side session lifecycle hook
   
   Manages an active learning session: start, log events, and end.
   Keeps local state for in-session stats (streak, word set, fatigue)
   and flushes events to the backend via API routes.
   
   Usage:
     const session = useSessionTracker();
     await session.start("flashcards");
     await session.logEvent({ word_id: "...", module_source: "flashcards", correct: true, input_mode: "typing" });
     const summary = await session.end(true);
============================================================================= */

"use client";

import { useState, useCallback, useRef } from "react";
import type { ModuleSource } from "@/types/knowledge-graph";
import type {
  InteractionEventInput,
  SessionSummaryRow,
  ActiveSession,
} from "@/types/ml-events";

interface SessionTrackerState {
  loading: boolean;
  error: string | null;
  sessionId: string | null;
  isActive: boolean;
  /** Real-time stats updated after each event */
  stats: {
    totalEvents: number;
    correctCount: number;
    currentStreak: number;
    uniqueWordCount: number;
  };
}

export function useSessionTracker() {
  const [state, setState] = useState<SessionTrackerState>({
    loading: false,
    error: null,
    sessionId: null,
    isActive: false,
    stats: {
      totalEvents: 0,
      correctCount: 0,
      currentStreak: 0,
      uniqueWordCount: 0,
    },
  });

  // Mutable session ref — avoids stale closures in event handlers
  const sessionRef = useRef<ActiveSession | null>(null);

  // ---------------------------------------------------------------------------
  // Start a session
  // ---------------------------------------------------------------------------
  const start = useCallback(async (moduleSource: ModuleSource) => {
    setState((s) => ({ ...s, loading: true, error: null }));

    try {
      const res = await fetch("/api/events/session/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module_source: moduleSource }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body.error || `Failed to start session (${res.status})`,
        );
      }

      const { session_id, started_at } = await res.json();

      const active: ActiveSession = {
        session_id,
        user_id: "", // managed server-side
        module_source: moduleSource,
        started_at: new Date(started_at).getTime(),
        events: [],
        response_times: [],
        correct_streak: 0,
        word_ids: new Set(),
        correct_count: 0,
        total_count: 0,
        fatigue_proxies: [],
      };

      sessionRef.current = active;

      setState({
        loading: false,
        error: null,
        sessionId: session_id,
        isActive: true,
        stats: {
          totalEvents: 0,
          correctCount: 0,
          currentStreak: 0,
          uniqueWordCount: 0,
        },
      });

      return session_id as string;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setState((s) => ({ ...s, loading: false, error: msg }));
      return null;
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Log a single event
  // ---------------------------------------------------------------------------
  const logEvent = useCallback(async (event: InteractionEventInput) => {
    const session = sessionRef.current;
    if (!session) {
      console.warn("[useSessionTracker] No active session");
      return null;
    }

    // Update local tracking
    session.events.push(event);
    session.total_count++;
    if (event.correct) {
      session.correct_count++;
      session.correct_streak++;
    } else {
      session.correct_streak = 0;
    }
    if (event.response_time_ms != null) {
      session.response_times.push(event.response_time_ms);
    }
    if (event.word_id) {
      session.word_ids.add(event.word_id);
    }

    // Update UI stats immediately (optimistic)
    setState((s) => ({
      ...s,
      stats: {
        totalEvents: session.total_count,
        correctCount: session.correct_count,
        currentStreak: session.correct_streak,
        uniqueWordCount: session.word_ids.size,
      },
    }));

    // Fire-and-forget to API (don't block the UI)
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: session.session_id,
          event,
        }),
      });

      if (!res.ok) {
        console.warn("[useSessionTracker] Event log failed:", res.status);
      }

      return await res.json();
    } catch (err) {
      console.warn("[useSessionTracker] Event log error:", err);
      return null;
    }
  }, []);

  // ---------------------------------------------------------------------------
  // End a session
  // ---------------------------------------------------------------------------
  const end = useCallback(
    async (completed: boolean): Promise<SessionSummaryRow | null> => {
      const session = sessionRef.current;
      if (!session) {
        console.warn("[useSessionTracker] No active session to end");
        return null;
      }

      setState((s) => ({ ...s, loading: true }));

      try {
        const res = await fetch("/api/events/session/end", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: session.session_id,
            completed,
          }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(
            body.error || `Failed to end session (${res.status})`,
          );
        }

        const { summary } = await res.json();

        // --- Goal tracking: daily activity (server deduplicates per day) ---
        fetch("/api/goals/log-event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventType: "daily_activity", value: 1 }),
        }).catch(() => {});

        // Reset
        sessionRef.current = null;
        setState({
          loading: false,
          error: null,
          sessionId: null,
          isActive: false,
          stats: {
            totalEvents: 0,
            correctCount: 0,
            currentStreak: 0,
            uniqueWordCount: 0,
          },
        });

        return summary as SessionSummaryRow;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        setState((s) => ({ ...s, loading: false, error: msg }));
        return null;
      }
    },
    [],
  );

  // ---------------------------------------------------------------------------
  // Abandon (end without completing — e.g. user navigates away)
  // ---------------------------------------------------------------------------
  const abandon = useCallback(async () => {
    return end(false);
  }, [end]);

  return {
    ...state,
    start,
    logEvent,
    end,
    abandon,
  };
}
