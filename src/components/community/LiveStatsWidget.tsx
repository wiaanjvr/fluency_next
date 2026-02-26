"use client";

import { Users, Star, Bookmark } from "lucide-react";
import { useCountUp } from "@/hooks/useCountUp";
import { useCommunityStats } from "@/hooks/useCommunityStats";

export function LiveStatsWidget() {
  const { stats, loading } = useCommunityStats();

  const diversActive = useCountUp(stats.divers_active);
  const reviewsToday = useCountUp(stats.reviews_today);
  const awaitingDive = useCountUp(stats.awaiting_dive);

  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-seafoam/40">
          The Dive Tank — Live
        </h3>
        {stats.online_now > 0 && (
          <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {stats.online_now} online
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-10 rounded-xl bg-white/[0.03] animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2.5">
          <StatRow
            icon={<Users className="h-4 w-4" />}
            label="Divers Active"
            value={diversActive}
            color="text-teal-400"
            bgColor="bg-teal-500/10"
          />
          <StatRow
            icon={<Star className="h-4 w-4" />}
            label="Reviews Today"
            value={reviewsToday}
            color="text-purple-400"
            bgColor="bg-purple-500/10"
          />
          <StatRow
            icon={<Bookmark className="h-4 w-4" />}
            label="Awaiting Dive"
            value={awaitingDive}
            color="text-amber-400"
            bgColor="bg-amber-500/10"
          />
        </div>
      )}
    </div>
  );
}

function StatRow({
  icon,
  label,
  value,
  color,
  bgColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  bgColor: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/[0.02] border border-white/[0.04] p-3">
      <div
        className={`h-8 w-8 rounded-lg ${bgColor} flex items-center justify-center ${color}`}
      >
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-[11px] text-seafoam/40">{label}</p>
        <p className={`text-lg font-semibold tabular-nums ${color}`}>{value}</p>
      </div>
    </div>
  );
}
