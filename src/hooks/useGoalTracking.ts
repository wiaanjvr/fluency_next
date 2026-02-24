"use client";

import { useState, useCallback, useRef } from "react";
import type {
  GoalEventType,
  LogGoalEventResponse,
  GetUserGoalsResponse,
  UserGoal,
} from "@/types/goals";

/* =============================================================================
   useGoalTracking() — Custom React Hook

   Wraps the goal event API for clean one-liner integration:
     const { trackEvent } = useGoalTracking();
     trackEvent('cloze_completed');

   Features:
   - Fires goal events and returns completion info
   - Debounces rapid duplicate calls
   - Exposes loading state
   - Provides fetchGoals() to load current period goals
   - Returns newly completed goals for toast display
============================================================================= */

interface GoalTrackingState {
  /** Track a goal event. Returns response with updated/completed goals. */
  trackEvent: (
    eventType: GoalEventType,
    value?: number,
    metadata?: Record<string, unknown>,
  ) => Promise<LogGoalEventResponse | null>;
  /** Fetch current period goals for display. */
  fetchGoals: () => Promise<GetUserGoalsResponse | null>;
  /** Generate goals for current period (call on signup / period start). */
  generateGoals: () => Promise<void>;
  /** Whether a tracking call is in flight. */
  isTracking: boolean;
  /** Whether goals are being fetched. */
  isLoading: boolean;
  /** Current goals data (populated after fetchGoals). */
  goals: GetUserGoalsResponse | null;
  /** Most recently completed goals (cleared on next trackEvent call). */
  newlyCompleted: UserGoal[];
  /** Whether the user is eligible for the monthly reward. */
  rewardEligible: boolean;
  /** Last error message, if any. */
  error: string | null;
}

export function useGoalTracking(): GoalTrackingState {
  const [isTracking, setIsTracking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [goals, setGoals] = useState<GetUserGoalsResponse | null>(null);
  const [newlyCompleted, setNewlyCompleted] = useState<UserGoal[]>([]);
  const [rewardEligible, setRewardEligible] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce: skip duplicate calls within 500ms for same event type
  const lastCallRef = useRef<{ eventType: string; time: number } | null>(null);

  const trackEvent = useCallback(
    async (
      eventType: GoalEventType,
      value: number = 1,
      metadata?: Record<string, unknown>,
    ): Promise<LogGoalEventResponse | null> => {
      // Debounce duplicate rapid calls
      const now = Date.now();
      if (
        lastCallRef.current &&
        lastCallRef.current.eventType === eventType &&
        now - lastCallRef.current.time < 500
      ) {
        return null;
      }
      lastCallRef.current = { eventType, time: now };

      setIsTracking(true);
      setError(null);
      setNewlyCompleted([]);

      try {
        const res = await fetch("/api/goals/log-event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventType, value, metadata }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `HTTP ${res.status}`);
        }

        const data: LogGoalEventResponse = await res.json();

        if (data.newlyCompleted.length > 0) {
          setNewlyCompleted(data.newlyCompleted);
        }

        if (data.rewardUnlocked) {
          setRewardEligible(true);
        }

        return data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to track event";
        setError(message);
        console.error("Goal tracking error:", message);
        return null;
      } finally {
        setIsTracking(false);
      }
    },
    [],
  );

  const fetchGoals =
    useCallback(async (): Promise<GetUserGoalsResponse | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/goals");

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `HTTP ${res.status}`);
        }

        const data: GetUserGoalsResponse = await res.json();
        setGoals(data);
        setRewardEligible(data.rewardEligible);
        return data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch goals";
        setError(message);
        console.error("Fetch goals error:", message);
        return null;
      } finally {
        setIsLoading(false);
      }
    }, []);

  const generateGoals = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch("/api/goals/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error("Generate goals error:", data.error);
      }
    } catch (err) {
      console.error(
        "Generate goals error:",
        err instanceof Error ? err.message : err,
      );
    }
  }, []);

  return {
    trackEvent,
    fetchGoals,
    generateGoals,
    isTracking,
    isLoading,
    goals,
    newlyCompleted,
    rewardEligible,
    error,
  };
}
