"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { CalendarDayData } from "@/types/chart";

/* =============================================================================
   CalendarDay — Individual day cell for the streak calendar
============================================================================= */

interface CalendarDayProps {
  day: CalendarDayData;
  index: number;
}

const dayVariants = {
  hidden: { scale: 0.6, opacity: 0 },
  visible: (i: number) => ({
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring" as const,
      stiffness: 200,
      damping: 20,
      delay: i * 0.02,
    },
  }),
} as const;

export function CalendarDay({ day, index }: CalendarDayProps) {
  // Padding day (empty)
  if (!day.date || !day.isCurrentMonth) {
    return <div className="aspect-square rounded-lg bg-transparent" />;
  }

  return (
    <motion.div
      custom={index}
      variants={dayVariants}
      initial="hidden"
      animate="visible"
      className={cn(
        "relative aspect-square rounded-lg flex items-center justify-center text-xs font-medium transition-all duration-300",
        // Base: very dark
        !day.isCompleted &&
          !day.isToday &&
          "bg-white/[0.02] text-[var(--text-muted,#2e5c54)]",
        // Completed: teal gradient glow
        day.isCompleted &&
          !day.isToday &&
          "bg-gradient-to-br from-teal-600/40 to-cyan-600/30 text-teal-300 shadow-[0_0_8px_rgba(13,148,136,0.25)]",
        // Today: breathing pulse border
        day.isToday &&
          !day.isCompleted &&
          "border border-teal-500/50 text-teal-400 bg-teal-500/[0.06]",
        // Today + completed
        day.isToday &&
          day.isCompleted &&
          "bg-gradient-to-br from-teal-500/50 to-cyan-500/40 text-teal-200 border border-teal-400/60 shadow-[0_0_12px_rgba(13,148,136,0.35)]",
      )}
    >
      {day.dayNumber}

      {/* Today breathing pulse */}
      {day.isToday && (
        <motion.div
          className="absolute inset-0 rounded-lg border border-teal-400/30"
          animate={{
            opacity: [0.3, 0.7, 0.3],
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}

      {/* Streak connector line (bottom) — shows beneath consecutive streak days */}
      {day.isInStreak && day.isCompleted && (
        <div className="absolute -bottom-[3px] left-1/2 -translate-x-1/2 w-3/5 h-[2px] rounded-full bg-gradient-to-r from-teal-500/0 via-teal-500/50 to-teal-500/0" />
      )}
    </motion.div>
  );
}
