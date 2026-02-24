"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Hook to subscribe to duel turn notifications via Supabase Realtime.
 * Returns the count of duels where it's currently the user's turn.
 */
export function useDuelNotifications(userId: string | null) {
  const [turnCount, setTurnCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const fetchCounts = useCallback(async () => {
    if (!userId) return;

    // Count duels where it's user's turn
    const { count: turns } = await supabase
      .from("duels")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .eq("current_turn", userId);

    setTurnCount(turns || 0);

    // Count pending invites
    const { count: pending } = await supabase
      .from("duels")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .eq("opponent_id", userId);

    setPendingCount(pending || 0);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    // Initial fetch
    fetchCounts();

    // Subscribe to duel changes
    const channel = supabase
      .channel("duel-notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "duels",
          filter: `opponent_id=eq.${userId}`,
        },
        () => fetchCounts(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "duels",
          filter: `challenger_id=eq.${userId}`,
        },
        () => fetchCounts(),
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "duels",
          filter: `current_turn=eq.${userId}`,
        },
        (payload) => {
          fetchCounts();

          // Browser notification if permission granted
          if (
            typeof Notification !== "undefined" &&
            Notification.permission === "granted"
          ) {
            const duel = payload.new as Record<string, unknown>;
            new Notification("Fluensea Duel", {
              body: "It's your turn! Play your round now.",
              icon: "/audio/favicon.ico",
              tag: `duel-${duel.id}`,
            });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchCounts]);

  // Request notification permission on first render
  useEffect(() => {
    if (
      typeof Notification !== "undefined" &&
      Notification.permission === "default"
    ) {
      Notification.requestPermission();
    }
  }, []);

  return {
    turnCount,
    pendingCount,
    totalBadge: turnCount + pendingCount,
  };
}
