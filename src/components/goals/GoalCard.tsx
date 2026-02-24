"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check, Lock, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserGoal, GoalTemplate } from "@/types/goals";
import { useEffect, useRef } from "react";

/* =============================================================================
   GoalCard — Individual goal display component

   Visual states:
   - In progress: animated progress bar with shimmer
   - Complete: green checkmark, strikethrough title, subtle glow
   - Locked (wrong tier): padlock icon, muted colors
============================================================================= */

interface GoalCardProps {
  goal: UserGoal;
  template?: GoalTemplate;
  userTier?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  immersion: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  vocabulary: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  grammar: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  cloze: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  speaking: "bg-pink-500/20 text-pink-300 border-pink-500/30",
  social: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  streak: "bg-red-500/20 text-red-300 border-red-500/30",
  milestone: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
};

const CATEGORY_BAR_COLORS: Record<string, string> = {
  immersion: "from-blue-400 to-blue-600",
  vocabulary: "from-purple-400 to-purple-600",
  grammar: "from-amber-400 to-amber-600",
  cloze: "from-emerald-400 to-emerald-600",
  speaking: "from-pink-400 to-pink-600",
  social: "from-orange-400 to-orange-600",
  streak: "from-red-400 to-red-600",
  milestone: "from-yellow-400 to-yellow-600",
};

export function GoalCard({ goal, template, userTier }: GoalCardProps) {
  const t = template ?? goal.template;
  const confettiTriggered = useRef(false);

  const category = t?.category ?? "milestone";
  const icon = t?.icon ?? "🎯";
  const title = t?.title ?? "Goal";
  const tierRequired = t?.tier_required ?? "tide";

  const progress = Math.min(
    (goal.current_value / goal.target_value) * 100,
    100,
  );
  const isComplete = goal.is_complete;

  // Determine if locked based on tier
  const TIER_RANK: Record<string, number> = {
    tide: -1,
    snorkeler: 0,
    diver: 1,
    submariner: 2,
  };
  const isLocked =
    userTier !== undefined &&
    tierRequired !== "tide" &&
    (TIER_RANK[userTier] ?? 0) < (TIER_RANK[tierRequired] ?? 0);

  // Local confetti burst on completion
  useEffect(() => {
    if (isComplete && !confettiTriggered.current) {
      confettiTriggered.current = true;
      // Dynamic import to avoid SSR issues
      import("canvas-confetti").then((confettiModule) => {
        const confetti = confettiModule.default;
        confetti({
          particleCount: 30,
          spread: 50,
          origin: { y: 0.7 },
          colors: ["#2aa9a0", "#22d3ee", "#818cf8", "#a78bfa"],
          scalar: 0.7,
          gravity: 1.2,
          ticks: 80,
        });
      });
    }
  }, [isComplete]);

  const unitLabel = t?.target_unit ?? "units";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "relative rounded-2xl border p-4 transition-all duration-300",
        isComplete
          ? "border-emerald-500/40 bg-emerald-500/5 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
          : isLocked
            ? "border-gray-600/30 bg-gray-800/30 opacity-60"
            : "border-ocean-turquoise/20 bg-card/50 backdrop-blur-sm hover:border-ocean-turquoise/40",
      )}
    >
      {/* Top row: icon + title + category badge */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <span
            className="text-xl flex-shrink-0"
            role="img"
            aria-label={category}
          >
            {isLocked ? <Lock className="w-5 h-5 text-gray-500" /> : icon}
          </span>
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "text-sm font-medium leading-tight",
                isComplete && "line-through text-emerald-400/80",
                isLocked && "text-gray-500",
              )}
            >
              {title}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Category badge */}
          <span
            className={cn(
              "text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border",
              CATEGORY_COLORS[category] ?? CATEGORY_COLORS.milestone,
            )}
          >
            {category}
          </span>

          {/* Completion check */}
          <AnimatePresence>
            {isComplete && (
              <motion.div
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center"
              >
                <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Progress bar */}
      {!isLocked && (
        <div className="space-y-1.5">
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/5">
            <motion.div
              className={cn(
                "h-full rounded-full bg-gradient-to-r",
                isComplete
                  ? "from-emerald-400 to-emerald-500"
                  : (CATEGORY_BAR_COLORS[category] ??
                      "from-ocean-turquoise to-ocean-teal"),
              )}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />

            {/* Shimmer effect while in progress */}
            {!isComplete && progress > 0 && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                animate={{ x: ["-100%", "200%"] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "linear",
                  repeatDelay: 1,
                }}
              />
            )}
          </div>

          {/* Value label */}
          <div className="flex items-center justify-between">
            <span
              className={cn(
                "text-xs",
                isComplete ? "text-emerald-400" : "text-white/50",
              )}
            >
              {goal.current_value} / {goal.target_value} {unitLabel}
            </span>

            {!isComplete && progress > 0 && (
              <span className="flex items-center gap-1 text-xs text-ocean-turquoise/70">
                <TrendingUp className="w-3 h-3" />
                {Math.round(progress)}%
              </span>
            )}
          </div>
        </div>
      )}

      {/* Locked overlay CTA */}
      {isLocked && (
        <p className="text-xs text-gray-500 mt-2">
          Upgrade to {tierRequired} to unlock
        </p>
      )}
    </motion.div>
  );
}
