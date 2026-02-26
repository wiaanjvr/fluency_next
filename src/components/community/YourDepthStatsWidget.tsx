"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useDepthPoints } from "@/hooks/useDepthPoints";
import { DepthBadge } from "./DepthBadge";

export function YourDepthStatsWidget() {
  const { user } = useAuth();
  const { points, loading } = useDepthPoints(user?.id);

  if (loading) {
    return (
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5">
        <div className="h-4 w-32 bg-white/[0.03] animate-pulse rounded mb-4" />
        <div className="h-20 bg-white/[0.03] animate-pulse rounded-xl" />
      </div>
    );
  }

  const progressPct =
    points.next_rank_threshold > 0
      ? Math.min(
          100,
          (points.points_this_week / points.next_rank_threshold) * 100,
        )
      : 0;

  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-seafoam/40 mb-4">
        Your Depth Stats
      </h3>

      {/* Current rank */}
      <div className="flex items-center gap-3 mb-4">
        <DepthBadge rank={points.rank_name} size="md" />
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-[11px] mb-1.5">
          <span className="text-seafoam/40">This week</span>
          <span className="text-teal-400 font-medium">
            {points.points_this_week} / {points.next_rank_threshold} DP
          </span>
        </div>
        <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-teal-500 to-teal-400 transition-all duration-1000 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-3 text-center">
          <p className="text-lg font-semibold text-teal-400 tabular-nums">
            {points.reviews_written}
          </p>
          <p className="text-[10px] text-seafoam/35 mt-0.5">Reviews Written</p>
        </div>
        <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-3 text-center">
          <p className="text-lg font-semibold text-purple-400 tabular-nums">
            {points.reviews_received}
          </p>
          <p className="text-[10px] text-seafoam/35 mt-0.5">Reviews Received</p>
        </div>
      </div>
    </div>
  );
}
