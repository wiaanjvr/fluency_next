/* =============================================================================
   useModuleRouter — React hook for the RL Module Router

   Provides a simple interface for components to:
   1. Request the next recommended activity after completing a module
   2. Report reward observations for past decisions
   3. Track the current recommendation state
============================================================================= */

"use client";

import { useCallback, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ModuleRecommendation {
  recommendedModule: string;
  targetWords: string[];
  targetConcept: string | null;
  reason: string;
  confidence: number;
  algorithm: string;
  decisionId: string | null;
  _fallback?: boolean;
}

interface UseModuleRouterReturn {
  /** Current recommendation (null until first fetch) */
  recommendation: ModuleRecommendation | null;
  /** Whether a recommendation is being fetched */
  loading: boolean;
  /** Error message if the last fetch failed */
  error: string | null;
  /** Fetch the next recommended activity */
  fetchNextActivity: (opts?: {
    lastCompletedModule?: string;
    availableMinutes?: number;
  }) => Promise<ModuleRecommendation | null>;
  /** Report reward for a past decision (fire-and-forget) */
  observeReward: (decisionId: string) => Promise<void>;
  /** Clear the current recommendation */
  clear: () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useModuleRouter(): UseModuleRouterReturn {
  const [recommendation, setRecommendation] =
    useState<ModuleRecommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNextActivity = useCallback(
    async (opts?: {
      lastCompletedModule?: string;
      availableMinutes?: number;
    }): Promise<ModuleRecommendation | null> => {
      setLoading(true);
      setError(null);

      try {
        const resp = await fetch("/api/ml/router/next-activity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lastCompletedModule: opts?.lastCompletedModule ?? null,
            availableMinutes: opts?.availableMinutes ?? null,
          }),
        });

        if (!resp.ok) {
          const data = await resp.json().catch(() => ({}));
          throw new Error(data.error || `HTTP ${resp.status}`);
        }

        const data: ModuleRecommendation = await resp.json();
        setRecommendation(data);
        return data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to get recommendation";
        setError(message);
        console.warn("[useModuleRouter] fetchNextActivity error:", message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const observeReward = useCallback(async (decisionId: string) => {
    try {
      await fetch("/api/ml/router/observe-reward", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decisionId }),
      });
    } catch (err) {
      // Fire-and-forget — don't break the UX if reward logging fails
      console.warn("[useModuleRouter] observeReward error:", err);
    }
  }, []);

  const clear = useCallback(() => {
    setRecommendation(null);
    setError(null);
  }, []);

  return {
    recommendation,
    loading,
    error,
    fetchNextActivity,
    observeReward,
    clear,
  };
}
