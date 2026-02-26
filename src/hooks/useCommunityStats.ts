"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CommunityStats } from "@/types/dive-tank";

const DEFAULT_STATS: CommunityStats = {
  id: "1",
  divers_active: 0,
  reviews_today: 0,
  awaiting_dive: 0,
  online_now: 0,
  updated_at: new Date().toISOString(),
};

export function useCommunityStats() {
  const [stats, setStats] = useState<CommunityStats>(DEFAULT_STATS);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("community_stats")
        .select("*")
        .single();

      if (data) {
        setStats(data as CommunityStats);
      }
    } catch {
      // Use defaults on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();

    // Subscribe to real-time updates
    const supabase = createClient();
    const channel = supabase
      .channel("community_stats_changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "community_stats",
        },
        (payload) => {
          setStats(payload.new as CommunityStats);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchStats]);

  return { stats, loading };
}
