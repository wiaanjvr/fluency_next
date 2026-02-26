"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Gift } from "lucide-react";
import { cn } from "@/lib/utils";
import { GoalRow } from "./GoalRow";
import { WeeklyRewardBadge } from "./WeeklyRewardBadge";
import { CircularProgress } from "./CircularProgress";
import { OceanEmptyState } from "./OceanEmptyState";
import type { WeeklyGoalSummary, UserRewardChart } from "@/types/chart";

/* =============================================================================
   WeeklyGoalsPanel — Section 2: Current week goals with progress bars
============================================================================= */

interface WeeklyGoalsPanelProps {
  week: WeeklyGoalSummary | null;
  totalWeeks: number;
  reward: UserRewardChart | null;
  onClaimReward: (rewardId: string) => Promise<boolean>;
  loading: boolean;
}

const shimmerSweepVariants = {
  initial: { x: "-100%" },
  sweep: {
    x: "200%",
    transition: { duration: 1.2, ease: "easeInOut" as const },
  },
} as const;

function PanelSkeleton() {
  return (
    <div className="rounded-2xl border border-white/[0.04] bg-[var(--bg-surface,#031820)] p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-white/[0.04] animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-28 rounded bg-white/[0.04] animate-pulse" />
          <div className="h-3 w-16 rounded bg-white/[0.04] animate-pulse" />
        </div>
        <div className="w-14 h-14 rounded-full bg-white/[0.04] animate-pulse" />
      </div>
      <div className="space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/[0.04] animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-full rounded bg-white/[0.04] animate-pulse" />
              <div className="h-1.5 w-full rounded bg-white/[0.04] animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function WeeklyGoalsPanel({
  week,
  totalWeeks,
  reward,
  onClaimReward,
  loading,
}: WeeklyGoalsPanelProps) {
  const [hasSwept, setHasSwept] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  if (loading) return <PanelSkeleton />;

  if (!week) {
    return (
      <div className="rounded-2xl border border-white/[0.04] bg-[var(--bg-surface,#031820)] backdrop-blur-sm">
        <OceanEmptyState message="Your weekly goals appear every Monday. Stay consistent!" />
      </div>
    );
  }

  const progressPercent =
    week.totalCount > 0 ? (week.completedCount / week.totalCount) * 100 : 0;

  return (
    <div className="space-y-4">
      <motion.div
        ref={cardRef}
        className={cn(
          "relative rounded-2xl border backdrop-blur-sm overflow-hidden",
          "border-teal-500/10 shadow-[0_0_20px_rgba(13,148,136,0.08)]",
          "bg-[var(--bg-surface,#031820)]",
        )}
        onAnimationComplete={() => {
          if (week.allComplete && !hasSwept) setHasSwept(true);
        }}
      >
        {/* Shimmer sweep when all complete */}
        {week.allComplete && !hasSwept && (
          <motion.div
            className="absolute inset-0 pointer-events-none z-10"
            variants={shimmerSweepVariants}
            initial="initial"
            animate="sweep"
            onAnimationComplete={() => setHasSwept(true)}
          >
            <div className="w-24 h-full bg-gradient-to-r from-transparent via-teal-400/10 to-transparent" />
          </motion.div>
        )}

        <div className="relative p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-teal-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-[var(--text-primary,#edf6f4)]">
                  Week {week.weekNumber} of {totalWeeks}
                </h3>
                <p className="text-xs text-[var(--text-secondary,#6b9e96)]">
                  {week.completedCount}/{week.totalCount} goals complete
                </p>
              </div>
            </div>

            <CircularProgress
              value={progressPercent}
              size={52}
              strokeWidth={4}
              glowOnComplete
            >
              <span className="text-xs font-bold text-[var(--text-primary,#edf6f4)]">
                {Math.round(progressPercent)}%
              </span>
            </CircularProgress>
          </div>

          {/* Goal rows */}
          <div className="space-y-1">
            {week.goals.map((goal, i) => (
              <GoalRow key={goal.id} goal={goal} index={i} />
            ))}
          </div>
        </div>
      </motion.div>

      {/* Weekly Reward Badge */}
      <AnimatePresence>
        {week.allComplete && reward && (
          <WeeklyRewardBadge reward={reward} onClaim={onClaimReward} />
        )}
      </AnimatePresence>
    </div>
  );
}
