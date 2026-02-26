"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { UserRewardChart, RewardType } from "@/types/chart";

/* =============================================================================
   useRewards — Fetches and claims user rewards for the Chart page
============================================================================= */

interface UseRewardsReturn {
  rewards: UserRewardChart[];
  pendingRewards: UserRewardChart[];
  claimReward: (rewardId: string) => Promise<boolean>;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useRewards(): UseRewardsReturn {
  const { user } = useAuth();
  const [rewards, setRewards] = useState<UserRewardChart[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRewards = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const { data, error: fetchError } = await supabase
        .from("user_rewards")
        .select("*")
        .eq("user_id", user.id)
        .gte("earned_at", startOfMonth.toISOString())
        .order("earned_at", { ascending: false });

      if (fetchError) throw fetchError;

      setRewards((data as UserRewardChart[]) ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch rewards");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchRewards();
  }, [fetchRewards]);

  const pendingRewards = rewards.filter((r) => !r.is_claimed);

  const claimReward = useCallback(
    async (rewardId: string): Promise<boolean> => {
      if (!user?.id) return false;

      // Optimistic update
      setRewards((prev) =>
        prev.map((r) => (r.id === rewardId ? { ...r, is_claimed: true } : r)),
      );

      try {
        const supabase = createClient();
        const { error: updateError } = await supabase
          .from("user_rewards")
          .update({ is_claimed: true })
          .eq("id", rewardId)
          .eq("user_id", user.id);

        if (updateError) throw updateError;

        return true;
      } catch (err) {
        // Revert optimistic update
        setRewards((prev) =>
          prev.map((r) =>
            r.id === rewardId ? { ...r, is_claimed: false } : r,
          ),
        );
        setError(err instanceof Error ? err.message : "Failed to claim reward");
        return false;
      }
    },
    [user?.id],
  );

  return {
    rewards,
    pendingRewards,
    claimReward,
    loading,
    error,
    refetch: fetchRewards,
  };
}
