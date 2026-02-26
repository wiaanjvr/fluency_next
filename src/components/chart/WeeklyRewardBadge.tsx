"use client";

import { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, Snowflake, Zap, Award, Trophy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useParticleBurst } from "@/hooks/useParticleBurst";
import { ParticleBurst } from "./ParticleBurst";
import type { UserRewardChart, RewardType } from "@/types/chart";

/* =============================================================================
   WeeklyRewardBadge — Floating reward card shown on weekly goal completion
============================================================================= */

interface WeeklyRewardBadgeProps {
  reward: UserRewardChart;
  onClaim: (rewardId: string) => Promise<boolean>;
}

const REWARD_ICONS: Record<
  RewardType,
  React.ComponentType<{ className?: string }>
> = {
  streak_freeze: Snowflake,
  xp_multiplier: Zap,
  bonus_session: Gift,
  badge: Award,
};

const REWARD_LABELS: Record<RewardType, string> = {
  streak_freeze: "Streak Freeze",
  xp_multiplier: "1.5x XP Boost",
  bonus_session: "Bonus Session",
  badge: "Achievement Badge",
};

const REWARD_COLORS: Record<RewardType, string> = {
  streak_freeze: "from-blue-500/20 to-indigo-600/20 border-blue-500/30",
  xp_multiplier: "from-purple-500/20 to-violet-600/20 border-purple-500/30",
  bonus_session: "from-teal-500/20 to-cyan-600/20 border-teal-500/30",
  badge: "from-amber-500/20 to-yellow-600/20 border-amber-500/30",
};

const badgeVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.9 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 150, damping: 18 },
  },
  exit: {
    opacity: 0,
    y: 20,
    scale: 0.95,
    transition: { duration: 0.2 },
  },
} as const;

export function WeeklyRewardBadge({ reward, onClaim }: WeeklyRewardBadgeProps) {
  const badgeRef = useRef<HTMLDivElement>(null);
  const { particles, isActive, triggerBurst } = useParticleBurst();

  const Icon = REWARD_ICONS[reward.reward_type] ?? Gift;
  const label = REWARD_LABELS[reward.reward_type] ?? "Reward";
  const colorClass = REWARD_COLORS[reward.reward_type] ?? REWARD_COLORS.badge;

  const handleClaim = async () => {
    if (reward.is_claimed) return;

    // Trigger particle burst at badge center
    if (badgeRef.current) {
      const rect = badgeRef.current.getBoundingClientRect();
      triggerBurst(rect.left + rect.width / 2, rect.top + rect.height / 2);
    }

    await onClaim(reward.id);
  };

  return (
    <>
      <ParticleBurst particles={particles} isActive={isActive} />

      <AnimatePresence>
        <motion.div
          ref={badgeRef}
          variants={badgeVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className={cn(
            "rounded-2xl border bg-gradient-to-br p-4 backdrop-blur-md",
            colorClass,
          )}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center flex-shrink-0">
              <Icon className="w-5 h-5 text-teal-300" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--text-primary,#edf6f4)]">
                {label}
              </p>
              <p className="text-xs text-[var(--text-secondary,#6b9e96)]">
                Weekly goal reward
              </p>
            </div>

            {reward.is_claimed ? (
              <div className="flex items-center gap-1.5 text-teal-400">
                <Check className="w-4 h-4" />
                <span className="text-xs font-medium">Claimed!</span>
              </div>
            ) : (
              <motion.button
                onClick={handleClaim}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-semibold",
                  "bg-gradient-to-r from-teal-500 to-cyan-500 text-white",
                  "shadow-[0_0_16px_rgba(13,148,136,0.3)]",
                  "hover:shadow-[0_0_24px_rgba(13,148,136,0.5)]",
                  "transition-shadow",
                )}
              >
                Claim Reward
              </motion.button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
}
