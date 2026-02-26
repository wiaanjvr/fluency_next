"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Check, X, PartyPopper } from "lucide-react";
import { cn } from "@/lib/utils";
import { CircularProgress } from "./CircularProgress";
import { OceanEmptyState } from "./OceanEmptyState";
import type { MonthlyGoalData, WeeklyGoalSummary } from "@/types/chart";

/* =============================================================================
   MonthlyGoalsPanel — Section 1: Monthly goal overview with progress ring
============================================================================= */

interface MonthlyGoalsPanelProps {
  data: MonthlyGoalData | null;
  loading: boolean;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const weekItemVariants = {
  hidden: { opacity: 0, x: -24 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      type: "spring" as const,
      stiffness: 120,
      damping: 18,
      delay: 0.15 + i * 0.1,
    },
  }),
} as const;

const shimmerVariants = {
  idle: { backgroundPosition: "-200% center" },
  shimmer: {
    backgroundPosition: "200% center",
    transition: { duration: 3, repeat: Infinity, ease: "linear" as const },
  },
} as const;

const badgePulseVariants = {
  pulse: {
    scale: [1, 1.05, 1] as number[],
    transition: { duration: 2, repeat: Infinity, ease: "easeInOut" as const },
  },
};

function WeekSummaryRow({
  week,
  index,
}: {
  week: WeeklyGoalSummary;
  index: number;
}) {
  return (
    <motion.div
      custom={index}
      variants={weekItemVariants}
      initial="hidden"
      animate="visible"
      className="flex items-center gap-3 py-2"
    >
      <div
        className={cn(
          "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0",
          week.allComplete
            ? "bg-teal-500/20 text-teal-400"
            : "bg-white/[0.04] text-[var(--text-muted,#2e5c54)]",
        )}
      >
        {week.allComplete ? (
          <Check className="w-3.5 h-3.5" />
        ) : (
          <X className="w-3 h-3" />
        )}
      </div>
      <div className="flex-1">
        <span className="text-sm text-[var(--text-primary,#edf6f4)]">
          Week {week.weekNumber}
        </span>
      </div>
      <span className="text-xs text-[var(--text-secondary,#6b9e96)]">
        {week.completedCount}/{week.totalCount} goals
      </span>
    </motion.div>
  );
}

function PanelSkeleton() {
  return (
    <div className="rounded-2xl border border-white/[0.04] bg-[var(--bg-surface,#031820)] p-6">
      <div className="flex items-start gap-6">
        <div className="w-20 h-20 rounded-full bg-white/[0.04] animate-pulse" />
        <div className="flex-1 space-y-3">
          <div className="h-5 w-32 rounded bg-white/[0.04] animate-pulse" />
          <div className="h-4 w-48 rounded bg-white/[0.04] animate-pulse" />
          <div className="space-y-2 mt-4">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-8 rounded bg-white/[0.04] animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function MonthlyGoalsPanel({ data, loading }: MonthlyGoalsPanelProps) {
  if (loading) return <PanelSkeleton />;

  if (!data || data.weekSummaries.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.04] bg-[var(--bg-surface,#031820)] backdrop-blur-sm">
        <OceanEmptyState message="Your monthly goals surface on the 1st. Keep diving!" />
      </div>
    );
  }

  const progressPercent = (data.weeksComplete / data.totalWeeks) * 100;
  const monthName = MONTH_NAMES[data.month - 1];

  return (
    <motion.div
      className={cn(
        "relative rounded-2xl border backdrop-blur-sm overflow-hidden",
        data.allWeeksComplete
          ? "border-amber-500/30 shadow-[0_0_24px_rgba(245,158,11,0.15)]"
          : "border-teal-500/10 shadow-[0_0_20px_rgba(13,148,136,0.08)]",
      )}
      style={{
        background: data.allWeeksComplete
          ? "linear-gradient(135deg, rgba(245,158,11,0.06) 0%, rgba(13,148,136,0.04) 50%, rgba(245,158,11,0.06) 100%)"
          : "var(--bg-surface, #031820)",
      }}
    >
      {/* Golden shimmer when all complete */}
      {data.allWeeksComplete && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(245,158,11,0.06) 50%, transparent 100%)",
            backgroundSize: "200% 100%",
          }}
          variants={shimmerVariants}
          initial="idle"
          animate="shimmer"
        />
      )}

      <div className="relative p-6">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          {/* Left: Progress Ring */}
          <div className="flex flex-col items-center gap-3">
            <CircularProgress
              value={progressPercent}
              size={88}
              strokeWidth={6}
              glowOnComplete
            >
              <span className="text-lg font-bold text-[var(--text-primary,#edf6f4)]">
                {Math.round(progressPercent)}%
              </span>
            </CircularProgress>
            <div className="text-center">
              <p className="text-base font-semibold text-[var(--text-primary,#edf6f4)]">
                {monthName}
              </p>
              <p className="text-xs text-[var(--text-secondary,#6b9e96)]">
                {data.weeksComplete} / {data.totalWeeks} weeks complete
              </p>
            </div>
          </div>

          {/* Right: Weekly summaries */}
          <div className="flex-1 w-full">
            <div className="space-y-1">
              {data.weekSummaries.map((week, i) => (
                <WeekSummaryRow key={week.weekNumber} week={week} index={i} />
              ))}
            </div>

            {/* Gameboard Unlocked badge */}
            <AnimatePresence>
              {data.allWeeksComplete && (
                <motion.div
                  variants={badgePulseVariants}
                  animate="pulse"
                  className={cn(
                    "mt-4 flex items-center gap-2 px-4 py-2.5 rounded-xl",
                    "bg-gradient-to-r from-amber-500/15 to-yellow-500/15",
                    "border border-amber-500/20",
                  )}
                >
                  <PartyPopper className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-semibold text-amber-300">
                    Gameboard Unlocked 🎉
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
