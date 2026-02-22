/**
 * useColdStart — React hook for cold start cluster assignment and graduation.
 *
 * On mount (or when triggered), assigns the user to a learner cluster if
 * they are a cold-start user (< 50 events). Provides the recommended
 * module path, complexity level, and vocabulary starting band.
 *
 * Usage:
 *   const { assignment, isLoading, assignCluster, checkGraduation } = useColdStart();
 */

"use client";

import { useCallback, useState } from "react";

import type {
  ClusterAssignment,
  GraduationStatus,
  LearningGoal,
} from "@/types/cold-start";

interface UseColdStartReturn {
  /** Current cluster assignment (null if not yet assigned or graduated) */
  assignment: ClusterAssignment | null;
  /** Graduation status (null if not yet checked) */
  graduationStatus: GraduationStatus | null;
  /** Whether a request is in progress */
  isLoading: boolean;
  /** Error message, if any */
  error: string | null;
  /** Request cluster assignment for a new user */
  assignCluster: (params: {
    nativeLanguage: string;
    targetLanguage: string;
    cefrLevel: string;
    goals: LearningGoal[];
  }) => Promise<ClusterAssignment | null>;
  /** Check if the user should graduate from cold start */
  checkGraduation: () => Promise<GraduationStatus | null>;
}

export function useColdStart(): UseColdStartReturn {
  const [assignment, setAssignment] = useState<ClusterAssignment | null>(null);
  const [graduationStatus, setGraduationStatus] =
    useState<GraduationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const assignCluster = useCallback(
    async (params: {
      nativeLanguage: string;
      targetLanguage: string;
      cefrLevel: string;
      goals: LearningGoal[];
    }): Promise<ClusterAssignment | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const resp = await fetch("/api/ml/coldstart/assign-cluster", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        });

        if (!resp.ok) {
          const data = await resp.json().catch(() => ({}));
          throw new Error(data.error || `HTTP ${resp.status}`);
        }

        const data: ClusterAssignment = await resp.json();
        setAssignment(data);
        return data;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to assign cluster";
        setError(msg);
        console.warn("[useColdStart] assignCluster failed:", msg);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const checkGraduation =
    useCallback(async (): Promise<GraduationStatus | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const resp = await fetch("/api/ml/coldstart/check-graduation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        if (!resp.ok) {
          const data = await resp.json().catch(() => ({}));
          throw new Error(data.error || `HTTP ${resp.status}`);
        }

        const data: GraduationStatus = await resp.json();
        setGraduationStatus(data);

        // Clear assignment if graduated
        if (data.graduated) {
          setAssignment(null);
        }

        return data;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to check graduation";
        setError(msg);
        console.warn("[useColdStart] checkGraduation failed:", msg);
        return null;
      } finally {
        setIsLoading(false);
      }
    }, []);

  return {
    assignment,
    graduationStatus,
    isLoading,
    error,
    assignCluster,
    checkGraduation,
  };
}
