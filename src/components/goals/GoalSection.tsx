"use client";

import { motion } from "framer-motion";
import { Trophy, Calendar, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { GoalCard } from "./GoalCard";
import type { UserGoal } from "@/types/goals";

/* =============================================================================
   GoalSection — Container for a set of goals (monthly or weekly)

   Shows:
   - Section header with period label
   - Completion summary: "X / Y goals complete"
   - Progress arc showing overall completion percentage
   - Grid of GoalCard components
   - Celebration banner when all goals are complete
============================================================================= */

interface GoalSectionProps {
  goals: UserGoal[];
  type: "monthly" | "weekly";
  periodStart: string;
  periodEnd: string;
  weekNumber?: number;
  weeksCompleted?: number;
  allComplete: boolean;
  userTier?: string;
}

function getMonthName(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/** SVG progress ring component */
function ProgressRing({
  progress,
  size = 48,
  strokeWidth = 4,
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      {/* Background ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-white/10"
      />
      {/* Progress ring */}
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="url(#goalGradient)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1, ease: "easeOut" }}
      />
      <defs>
        <linearGradient id="goalGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#2aa9a0" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function GoalSection({
  goals,
  type,
  periodStart,
  periodEnd,
  weekNumber,
  weeksCompleted,
  allComplete,
  userTier,
}: GoalSectionProps) {
  const completedCount = goals.filter((g) => g.is_complete).length;
  const totalCount = goals.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const headerLabel =
    type === "monthly"
      ? `${getMonthName(periodStart)} Goals`
      : `Week ${weekNumber ?? 1} of 4`;

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {type === "monthly" ? (
            <Trophy className="w-5 h-5 text-ocean-turquoise" />
          ) : (
            <Calendar className="w-5 h-5 text-ocean-turquoise" />
          )}
          <div>
            <h3 className="text-lg font-semibold text-white">{headerLabel}</h3>
            <p className="text-xs text-white/40">
              {completedCount} / {totalCount} goals complete
              {type === "weekly" &&
                weeksCompleted !== undefined &&
                ` · ${weeksCompleted}/4 weeks done`}
            </p>
          </div>
        </div>

        {/* Progress ring */}
        <div className="relative">
          <ProgressRing progress={progress} />
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white/80">
            {Math.round(progress)}%
          </span>
        </div>
      </div>

      {/* All complete banner */}
      {allComplete && totalCount > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl",
            "bg-gradient-to-r from-emerald-500/10 to-ocean-turquoise/10",
            "border border-emerald-500/20",
          )}
        >
          <Sparkles className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-emerald-400">
              All {type} goals complete! 🎉
            </p>
            <p className="text-xs text-white/40">
              {type === "monthly"
                ? "Amazing dedication this month!"
                : `Week ${weekNumber} crushed! Keep the momentum going.`}
            </p>
          </div>
        </motion.div>
      )}

      {/* Goals grid */}
      {goals.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              template={goal.template}
              userTier={userTier}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-white/30 text-sm">
          No {type} goals yet. They'll be generated at the start of the{" "}
          {type === "monthly" ? "month" : "week"}.
        </div>
      )}
    </div>
  );
}
