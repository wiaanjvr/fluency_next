/* =============================================================================
   useCognitiveLoad — React hook for real-time cognitive load monitoring

   Polls the cognitive load endpoint during an active session and provides:
   - Current load, trend, and recommended action
   - Automatic "take a break?" prompt detection
   - Story complexity adjustment signals

   Usage:
   ```tsx
   const { snapshot, shouldSimplify, shouldBreak } = useCognitiveLoad(sessionId);
   ```
============================================================================= */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  CognitiveLoadSnapshot,
  CognitiveLoadAction,
} from "@/types/cognitive-load";
import { COGNITIVE_LOAD_THRESHOLDS } from "@/types/cognitive-load";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** How often to poll the cognitive load endpoint (ms) */
const DEFAULT_POLL_INTERVAL = 5_000; // 5s

/** Minimum events before we consider the load meaningful */
const MIN_EVENTS_FOR_SIGNAL = 3;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

interface UseCognitiveLoadOptions {
  /** Polling interval in ms (default: 5000) */
  pollInterval?: number;
  /** Disable polling (e.g. when session is paused) */
  enabled?: boolean;
  /** Callback when a break is recommended */
  onBreakRecommended?: () => void;
  /** Callback when simplification is recommended */
  onSimplifyRecommended?: () => void;
}

interface UseCognitiveLoadResult {
  /** Latest cognitive load snapshot (null until first poll) */
  snapshot: CognitiveLoadSnapshot | null;
  /** Whether the system recommends simplifying content */
  shouldSimplify: boolean;
  /** Whether the system recommends the user take a break */
  shouldBreak: boolean;
  /** Current recommended action */
  recommendedAction: CognitiveLoadAction | null;
  /** Whether the snapshot data is meaningful (enough events) */
  isSignificant: boolean;
  /** Whether we're currently fetching */
  isLoading: boolean;
  /** Any error from the last fetch */
  error: string | null;
  /** Force a refresh now */
  refresh: () => Promise<void>;
}

export function useCognitiveLoad(
  sessionId: string | null | undefined,
  options: UseCognitiveLoadOptions = {},
): UseCognitiveLoadResult {
  const {
    pollInterval = DEFAULT_POLL_INTERVAL,
    enabled = true,
    onBreakRecommended,
    onSimplifyRecommended,
  } = options;

  const [snapshot, setSnapshot] = useState<CognitiveLoadSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track whether we've already fired the break/simplify callbacks
  const breakFiredRef = useRef(false);
  const simplifyFiredRef = useRef(false);
  const prevActionRef = useRef<CognitiveLoadAction | null>(null);

  // Reset when session changes
  useEffect(() => {
    setSnapshot(null);
    setError(null);
    breakFiredRef.current = false;
    simplifyFiredRef.current = false;
    prevActionRef.current = null;
  }, [sessionId]);

  const fetchLoad = useCallback(async () => {
    if (!sessionId) return;

    setIsLoading(true);
    setError(null);

    try {
      const resp = await fetch(`/api/ml/cognitive-load/session/${sessionId}`);

      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }

      const data: CognitiveLoadSnapshot = await resp.json();
      setSnapshot(data);

      // Fire callbacks on action transitions
      if (data.eventCount >= MIN_EVENTS_FOR_SIGNAL) {
        if (
          data.recommendedAction === "end-session" &&
          !breakFiredRef.current
        ) {
          breakFiredRef.current = true;
          onBreakRecommended?.();
        }

        if (
          data.recommendedAction === "simplify" &&
          !simplifyFiredRef.current
        ) {
          simplifyFiredRef.current = true;
          onSimplifyRecommended?.();
        }

        // Reset flags if the user recovers
        if (data.recommendedAction === "continue") {
          breakFiredRef.current = false;
          simplifyFiredRef.current = false;
        }
      }

      prevActionRef.current = data.recommendedAction;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, onBreakRecommended, onSimplifyRecommended]);

  // Polling
  useEffect(() => {
    if (!sessionId || !enabled) return;

    // Initial fetch
    fetchLoad();

    const interval = setInterval(fetchLoad, pollInterval);
    return () => clearInterval(interval);
  }, [sessionId, enabled, pollInterval, fetchLoad]);

  // Derived state
  const isSignificant = (snapshot?.eventCount ?? 0) >= MIN_EVENTS_FOR_SIGNAL;

  const shouldSimplify =
    isSignificant &&
    (snapshot?.recommendedAction === "simplify" ||
      snapshot?.recommendedAction === "end-session");

  const shouldBreak =
    isSignificant && snapshot?.recommendedAction === "end-session";

  return {
    snapshot,
    shouldSimplify,
    shouldBreak,
    recommendedAction: snapshot?.recommendedAction ?? null,
    isSignificant,
    isLoading,
    error,
    refresh: fetchLoad,
  };
}
