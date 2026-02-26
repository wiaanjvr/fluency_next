"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { ComponentType } from "react";

// =============================================================================
// useTrackActivity — records sessions in user_activity_sessions
// =============================================================================

interface UseTrackActivityReturn {
  startSession: () => Promise<void>;
  endSession: () => Promise<void>;
  sessionDurationSeconds: number;
}

export function useTrackActivity(
  activityId: string,
  languageCode?: string
): UseTrackActivityReturn {
  const { user } = useAuth();
  const supabase = createClient();
  const sessionIdRef = useRef<string | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [sessionDurationSeconds, setSessionDurationSeconds] = useState(0);

  const startSession = useCallback(async () => {
    if (!user || sessionIdRef.current) return;

    const now = new Date().toISOString();
    startTimeRef.current = Date.now();
    setSessionDurationSeconds(0);

    const { data, error } = await supabase
      .from("user_activity_sessions")
      .insert({
        user_id: user.id,
        activity_id: activityId,
        language_code: languageCode ?? "fr",
        started_at: now,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[useTrackActivity] Failed to start session:", error.message);
      return;
    }

    sessionIdRef.current = data.id;

    // Start counting every second
    intervalRef.current = setInterval(() => {
      if (startTimeRef.current) {
        setSessionDurationSeconds(
          Math.floor((Date.now() - startTimeRef.current) / 1000)
        );
      }
    }, 1000);
  }, [user, activityId, languageCode, supabase]);

  const endSession = useCallback(async () => {
    // Stop the timer
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!sessionIdRef.current || !startTimeRef.current) return;

    const durationSeconds = Math.floor(
      (Date.now() - startTimeRef.current) / 1000
    );
    const now = new Date().toISOString();

    const { error } = await supabase
      .from("user_activity_sessions")
      .update({
        completed_at: now,
        duration_seconds: durationSeconds,
      })
      .eq("id", sessionIdRef.current);

    if (error) {
      console.error("[useTrackActivity] Failed to end session:", error.message);
    }

    sessionIdRef.current = null;
    startTimeRef.current = null;
  }, [supabase]);

  // Auto start on mount, auto end on unmount
  useEffect(() => {
    startSession();

    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      endSession();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { startSession, endSession, sessionDurationSeconds };
}

// =============================================================================
// withActivityTracking HOC — wraps a page component with session tracking
// =============================================================================

interface WithActivityTrackingProps {
  languageCode?: string;
}

export function withActivityTracking<P extends object>(
  activityId: string,
  WrappedComponent: ComponentType<P>
) {
  function TrackedComponent(props: P & WithActivityTrackingProps) {
    const { languageCode, ...rest } = props as P & WithActivityTrackingProps;
    useTrackActivity(activityId, languageCode);
    return <WrappedComponent {...(rest as P)} />;
  }

  TrackedComponent.displayName = `withActivityTracking(${
    WrappedComponent.displayName || WrappedComponent.name || "Component"
  })`;

  return TrackedComponent;
}
