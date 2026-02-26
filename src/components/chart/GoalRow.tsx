"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  Anchor,
  Waves,
  Compass,
  Fish,
  Headphones,
  PenTool,
  Mic,
  BookOpen,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChartGoal, GoalKey } from "@/types/chart";
import { GOAL_META } from "@/types/chart";

/* =============================================================================
   GoalRow — Individual goal row with animated progress bar and icon
============================================================================= */

interface GoalRowProps {
  goal: ChartGoal;
  index: number;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Anchor,
  Waves,
  Compass,
  Fish,
  Headphones,
  PenTool,
  Mic,
  BookOpen,
};

const rowVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 18,
      delay: i * 0.08,
    },
  }),
} as const;

const checkVariants = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring" as const,
      stiffness: 500,
      damping: 15,
      delay: 0.3,
    },
  },
} as const;

export function GoalRow({ goal, index }: GoalRowProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });

  const meta = GOAL_META[goal.goal_key] ?? {
    icon: "Anchor",
    label: goal.goal_key,
    unit: "",
  };
  const IconComponent = ICON_MAP[meta.icon] ?? Anchor;
  const progress = Math.min(
    (goal.current_value / goal.target_value) * 100,
    100,
  );
  const isNearComplete = progress >= 80;

  return (
    <motion.div
      ref={ref}
      custom={index}
      variants={rowVariants}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      className="flex items-center gap-3 py-3 px-2 rounded-xl hover:bg-white/[0.02] transition-colors"
    >
      {/* Icon */}
      <div
        className={cn(
          "flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center",
          goal.is_complete
            ? "bg-teal-500/20 text-teal-400"
            : "bg-white/[0.04] text-[var(--text-secondary,#6b9e96)]",
        )}
      >
        <IconComponent className="w-4.5 h-4.5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-medium text-[var(--text-primary,#edf6f4)] truncate">
            {meta.label}
          </span>
          <span className="text-xs text-[var(--text-secondary,#6b9e96)] ml-2 flex-shrink-0">
            {goal.current_value}/{goal.target_value} {meta.unit}
          </span>
        </div>

        {/* Progress bar */}
        <div className="relative h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
          <motion.div
            className={cn(
              "absolute inset-y-0 left-0 rounded-full",
              goal.is_complete
                ? "bg-gradient-to-r from-teal-500 to-cyan-400"
                : isNearComplete
                  ? "bg-gradient-to-r from-teal-500 to-cyan-400 shadow-[0_0_12px_rgba(13,148,136,0.5)]"
                  : "bg-gradient-to-r from-teal-600 to-teal-500",
            )}
            initial={{ width: 0 }}
            animate={isInView ? { width: `${progress}%` } : { width: 0 }}
            transition={{
              type: "spring",
              stiffness: 60,
              damping: 20,
              delay: index * 0.08 + 0.2,
            }}
          />
        </div>
      </div>

      {/* Checkmark */}
      {goal.is_complete && (
        <motion.div
          variants={checkVariants}
          initial="hidden"
          animate="visible"
          className="flex-shrink-0 w-6 h-6 rounded-full bg-teal-500/20 flex items-center justify-center"
        >
          <Check className="w-3.5 h-3.5 text-teal-400" />
        </motion.div>
      )}
    </motion.div>
  );
}
