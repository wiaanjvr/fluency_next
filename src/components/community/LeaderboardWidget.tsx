"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useLeaderboard } from "@/hooks/useDepthPoints";
import { OceanAvatar } from "./OceanAvatar";
import { OceanEmptyState } from "./OceanEmptyState";

const RANK_COLORS = ["text-amber-400", "text-gray-300", "text-amber-600"];
const RANK_BG = ["bg-amber-500/10", "bg-gray-500/10", "bg-amber-800/10"];

export function LeaderboardWidget() {
  const { entries, loading } = useLeaderboard();

  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-seafoam/40 mb-4">
        Top Dive Buddies · This Week
      </h3>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-white/[0.03] animate-pulse" />
              <div className="flex-1">
                <div className="h-3 w-20 bg-white/[0.03] animate-pulse rounded" />
                <div className="h-2 w-12 bg-white/[0.03] animate-pulse rounded mt-1.5" />
              </div>
            </div>
          ))}
        </div>
      ) : entries.length === 0 ? (
        <OceanEmptyState
          message="Be the first to review — claim the top spot!"
          className="py-8"
        />
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div
              key={entry.user.id}
              className={`flex items-center gap-3 rounded-xl p-2.5 transition-all ${
                entry.is_current_user
                  ? "bg-teal-500/10 border border-teal-500/20"
                  : "hover:bg-white/[0.02]"
              } ${entry.rank === 1 ? "relative overflow-hidden" : ""}`}
            >
              {/* Gold shimmer for #1 */}
              {entry.rank === 1 && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/[0.03] to-transparent animate-shimmer" />
              )}

              {/* Rank number */}
              <span
                className={`shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold ${
                  entry.rank <= 3
                    ? `${RANK_COLORS[entry.rank - 1]} ${RANK_BG[entry.rank - 1]}`
                    : "text-seafoam/30 bg-white/[0.02]"
                }`}
              >
                {entry.rank}
              </span>

              <OceanAvatar userId={entry.user.id} size={32} />

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white/80 truncate">
                  {entry.user.full_name ?? "Anonymous Diver"}
                </p>
                <span className="inline-flex items-center gap-1 text-[10px] text-teal-400 font-medium">
                  {entry.points_this_week} DP
                </span>
              </div>

              {/* Trend arrow */}
              <div className="shrink-0">
                {entry.trend === "up" && (
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                )}
                {entry.trend === "down" && (
                  <TrendingDown className="h-3.5 w-3.5 text-red-400" />
                )}
                {entry.trend === "same" && (
                  <Minus className="h-3.5 w-3.5 text-seafoam/20" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          animation: shimmer 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
