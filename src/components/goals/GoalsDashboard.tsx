"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flame,
  Gift,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useGoalTracking } from "@/hooks/useGoalTracking";
import { GoalSection } from "./GoalSection";
import { Button } from "@/components/ui/button";

/* =============================================================================
   GoalsDashboard — Full goals page combining monthly + weekly views

   Layout:
   - Top: monthly goals with overall monthly progress
   - Below: current week goals with week selector (1–4)
   - Streak calendar showing daily activity
   - Reward eligible banner if unlocked
============================================================================= */

interface GoalsDashboardProps {
  userTier?: string;
  onRewardClick?: () => void;
}

/** Streak heatmap calendar for the current month */
function StreakCalendar({
  streak,
}: {
  streak: {
    current_streak: number;
    longest_streak: number;
    last_active_date: string | null;
  } | null;
}) {
  const now = new Date();
  const currentStreak = streak?.current_streak ?? 0;
  const longestStreak = streak?.longest_streak ?? 0;
  const lastActive = streak?.last_active_date;

  // Build active days based on streak (approximate: last N consecutive days)
  const activeDays = new Set<string>();
  if (lastActive && currentStreak > 0) {
    const lastDate = new Date(lastActive + "T00:00:00");
    for (let i = 0; i < currentStreak; i++) {
      const d = new Date(lastDate);
      d.setDate(d.getDate() - i);
      // Only include days in current month
      if (
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      ) {
        activeDays.add(d.toISOString().split("T")[0]);
      }
    }
  }

  // Generate calendar days for current month
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDayOfWeek = firstDay.getDay(); // 0 = Sunday

  const days: (number | null)[] = [];
  // Pad start
  for (let i = 0; i < startDayOfWeek; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  const today = now.getDate();

  return (
    <div className="rounded-2xl border border-ocean-turquoise/20 bg-card/50 backdrop-blur-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-orange-400" />
          <span className="text-sm font-medium text-white">
            {currentStreak}-day streak
          </span>
        </div>
        <span className="text-xs text-white/40">
          Best: {longestStreak} days
        </span>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div
            key={i}
            className="text-[10px] text-center text-white/30 font-medium"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          if (day === null) {
            return <div key={`empty-${i}`} className="w-full aspect-square" />;
          }

          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isActive = activeDays.has(dateStr);
          const isToday = day === today;
          const isFuture = day > today;

          return (
            <div
              key={day}
              className={cn(
                "w-full aspect-square rounded-md flex items-center justify-center text-[10px] font-medium transition-colors",
                isActive
                  ? "bg-orange-500/30 text-orange-300 border border-orange-500/40"
                  : isFuture
                    ? "text-white/15"
                    : "text-white/30 bg-white/[0.02]",
                isToday && "ring-1 ring-ocean-turquoise/50",
              )}
            >
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function GoalsDashboard({
  userTier,
  onRewardClick,
}: GoalsDashboardProps) {
  const { fetchGoals, generateGoals, goals, isLoading, rewardEligible, error } =
    useGoalTracking();

  const [initialized, setInitialized] = useState(false);

  // Initialize: generate goals if needed, then fetch
  useEffect(() => {
    if (initialized) return;
    setInitialized(true);

    (async () => {
      await generateGoals();
      await fetchGoals();
    })();
  }, [initialized, generateGoals, fetchGoals]);

  const handleRefresh = useCallback(async () => {
    await fetchGoals();
  }, [fetchGoals]);

  if (isLoading && !goals) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-white/5 rounded-xl w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 bg-white/5 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error && !goals) {
    return (
      <div className="text-center py-12">
        <p className="text-white/50 text-sm mb-3">Failed to load goals</p>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          Retry
        </Button>
      </div>
    );
  }

  const monthly = goals?.monthly;
  const weekly = goals?.weekly;
  const streak = goals?.streak ?? null;

  return (
    <div className="space-y-8">
      {/* Reward eligible banner */}
      <AnimatePresence>
        {rewardEligible && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className={cn(
              "flex items-center justify-between gap-4 px-5 py-4 rounded-2xl",
              "bg-gradient-to-r from-amber-500/10 via-ocean-turquoise/10 to-purple-500/10",
              "border border-amber-500/30",
            )}
          >
            <div className="flex items-center gap-3">
              <Gift className="w-6 h-6 text-amber-400" />
              <div>
                <p className="text-sm font-semibold text-amber-300">
                  🎁 You've unlocked your monthly reward!
                </p>
                <p className="text-xs text-white/40">
                  All goals complete — claim your reward now.
                </p>
              </div>
            </div>
            {onRewardClick && (
              <Button
                size="sm"
                onClick={onRewardClick}
                className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30"
              >
                Claim
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Monthly Goals Section */}
      {monthly && (
        <GoalSection
          goals={monthly.goals}
          type="monthly"
          periodStart={monthly.periodStart}
          periodEnd={monthly.periodEnd}
          allComplete={monthly.allComplete}
          userTier={userTier}
        />
      )}

      {/* Weekly Goals Section */}
      {weekly && (
        <GoalSection
          goals={weekly.goals}
          type="weekly"
          periodStart={weekly.periodStart}
          periodEnd={weekly.periodEnd}
          weekNumber={weekly.weekNumber}
          weeksCompleted={weekly.weeksCompleted}
          allComplete={weekly.allComplete}
          userTier={userTier}
        />
      )}

      {/* Streak Calendar */}
      <StreakCalendar streak={streak} />

      {/* Refresh button */}
      <div className="flex justify-center">
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className={cn(
            "flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors",
            isLoading && "animate-spin",
          )}
        >
          <RefreshCw className="w-3 h-3" />
          {isLoading ? "Refreshing..." : "Refresh goals"}
        </button>
      </div>
    </div>
  );
}
