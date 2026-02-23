"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { ActivityRecommendation } from "@/lib/recommendation/nextActivityEngine";

export function useNextActivity(): {
  recommendation: ActivityRecommendation | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
} {
  const [recommendation, setRecommendation] =
    useState<ActivityRecommendation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchRecommendation = useCallback(async () => {
    // Abort any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/recommendation/next", {
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data: ActivityRecommendation = await res.json();
      setRecommendation(data);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchRecommendation();
    return () => {
      abortRef.current?.abort();
    };
  }, [fetchRecommendation]);

  // Listen for session-complete events from any Propel activity
  useEffect(() => {
    const handler = () => {
      fetchRecommendation();
    };

    window.addEventListener("fluensea:session-complete", handler);
    return () => {
      window.removeEventListener("fluensea:session-complete", handler);
    };
  }, [fetchRecommendation]);

  return {
    recommendation,
    isLoading,
    error,
    refresh: fetchRecommendation,
  };
}
