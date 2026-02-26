"use client";

import { motion } from "framer-motion";
import { Flame, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { CalendarDay } from "./CalendarDay";
import type { CalendarDayData, UserStreakChart } from "@/types/chart";

/* =============================================================================
   StreakCalendar — Section 3: Streak display with calendar grid
============================================================================= */

interface StreakCalendarProps {
  streak: UserStreakChart | null;
  calendarDays: CalendarDayData[];
  currentMonth: Date;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  loading: boolean;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const flameFlickerKeyframes = `
@keyframes flameFlicker {
  0%, 100% { transform: scaleY(1) scaleX(1); opacity: 1; }
  25% { transform: scaleY(1.08) scaleX(0.96); opacity: 0.9; }
  50% { transform: scaleY(0.95) scaleX(1.04); opacity: 1; }
  75% { transform: scaleY(1.04) scaleX(0.98); opacity: 0.95; }
}
`;

function CalendarSkeleton() {
  return (
    <div className="rounded-2xl border border-white/[0.04] bg-[var(--bg-surface,#031820)] p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/[0.04] animate-pulse" />
          <div className="h-6 w-32 rounded bg-white/[0.04] animate-pulse" />
        </div>
        <div className="h-4 w-24 rounded bg-white/[0.04] animate-pulse" />
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: 35 }, (_, i) => (
          <div
            key={i}
            className="aspect-square rounded-lg bg-white/[0.02] animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}

export function StreakCalendar({
  streak,
  calendarDays,
  currentMonth,
  onPreviousMonth,
  onNextMonth,
  loading,
}: StreakCalendarProps) {
  if (loading) return <CalendarSkeleton />;

  const currentStreak = streak?.current_streak ?? 0;
  const bestStreak = streak?.best_streak ?? 0;
  const monthLabel = format(currentMonth, "MMMM yyyy");
  const isCurrentMonthNow =
    format(currentMonth, "yyyy-MM") === format(new Date(), "yyyy-MM");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 80, damping: 20, delay: 0.2 }}
      className={cn(
        "rounded-2xl border border-teal-500/10 backdrop-blur-sm overflow-hidden",
        "bg-[var(--bg-surface,#031820)]",
        "shadow-[0_0_20px_rgba(13,148,136,0.08)]",
      )}
    >
      {/* Inject keyframe for flame flicker */}
      <style dangerouslySetInnerHTML={{ __html: flameFlickerKeyframes }} />

      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Flame
                className="w-6 h-6 text-orange-400"
                style={{ animation: "flameFlicker 1.5s ease-in-out infinite" }}
              />
              {/* Flame glow */}
              <div className="absolute inset-0 blur-md bg-orange-400/30 rounded-full" />
            </div>
            <div>
              <span className="text-lg font-bold text-[var(--text-primary,#edf6f4)]">
                {currentStreak}-day streak
              </span>
            </div>
          </div>
          <span className="text-xs text-[var(--text-secondary,#6b9e96)]">
            Best: {bestStreak} days
          </span>
        </div>

        {/* Month navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onPreviousMonth}
            className="p-1.5 rounded-lg hover:bg-white/[0.04] text-[var(--text-secondary,#6b9e96)] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-[var(--text-primary,#edf6f4)]">
            {monthLabel}
          </span>
          <button
            onClick={onNextMonth}
            disabled={isCurrentMonthNow}
            className={cn(
              "p-1.5 rounded-lg transition-colors",
              isCurrentMonthNow
                ? "text-[var(--text-muted,#2e5c54)] cursor-not-allowed"
                : "hover:bg-white/[0.04] text-[var(--text-secondary,#6b9e96)]",
            )}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Day labels */}
        <div className="grid grid-cols-7 gap-1.5 mb-2">
          {DAY_LABELS.map((label) => (
            <div
              key={label}
              className="text-center text-[10px] font-medium text-[var(--text-muted,#2e5c54)] uppercase tracking-wider"
            >
              {label}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1.5">
          {calendarDays.map((day, i) => (
            <CalendarDay key={day.date || `pad-${i}`} day={day} index={i} />
          ))}
        </div>

        {/* Streak current line — animated draw from left to right */}
        {currentStreak > 0 && (
          <motion.div
            className="mt-4 flex items-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <div className="h-px flex-1 relative overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-teal-500/60 via-cyan-400/40 to-transparent"
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 1.5, delay: 1, ease: "easeOut" }}
              />
            </div>
            <span className="text-[10px] text-teal-400/60 flex-shrink-0">
              current flow
            </span>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
