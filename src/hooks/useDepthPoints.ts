"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DepthPoints, LeaderboardEntry } from "@/types/dive-tank";

const DEFAULT_POINTS: DepthPoints = {
  id: "",
  user_id: "",
  points_total: 0,
  points_this_week: 0,
  reviews_written: 0,
  reviews_received: 0,
  rank_name: "The Shallows",
  next_rank_threshold: 50,
  updated_at: new Date().toISOString(),
};

export function useDepthPoints(userId?: string) {
  const [points, setPoints] = useState<DepthPoints>(DEFAULT_POINTS);
  const [loading, setLoading] = useState(true);

  const fetchPoints = useCallback(async () => {
    if (!userId) return;
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("depth_points")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (data) setPoints(data as DepthPoints);
    } catch {
      // use defaults
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchPoints();
  }, [fetchPoints]);

  return { points, loading };
}

export function useLeaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("depth_points")
        .select(
          `*, profiles:user_id (id, full_name, avatar_url, target_language, native_language)`,
        )
        .order("points_this_week", { ascending: false })
        .limit(5);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const mapped: LeaderboardEntry[] = (data ?? []).map(
        (item: any, idx: number) => ({
          rank: idx + 1,
          user: {
            ...item.profiles,
            depth_rank: item.rank_name ?? "The Shallows",
            is_online: false,
            last_active_at: null,
          },
          points_this_week: item.points_this_week ?? 0,
          trend: "same" as const,
          is_current_user: item.user_id === user?.id,
        }),
      );

      setEntries(mapped);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return { entries, loading };
}
