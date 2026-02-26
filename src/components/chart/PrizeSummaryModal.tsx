"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Trophy, Star, Award, Snowflake, Zap, Waves } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PrizeConfig } from "@/types/chart";

/* =============================================================================
   PrizeSummaryModal — Bottom sheet modal on gameboard prize reveal
============================================================================= */

interface PrizeSummaryModalProps {
  prize: PrizeConfig | null;
  isOpen: boolean;
  onClose: () => void;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Trophy,
  Star,
  Award,
  Snowflake,
  Zap,
  Waves,
};

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

const sheetVariants = {
  hidden: { y: "100%", opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring" as const, stiffness: 200, damping: 25 },
  },
  exit: {
    y: "100%",
    opacity: 0,
    transition: { duration: 0.2, ease: "easeIn" as const },
  },
} as const;

const prizeTextVariants = {
  hidden: { scale: 0.5, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 20,
      delay: 0.3,
    },
  },
} as const;

export function PrizeSummaryModal({
  prize,
  isOpen,
  onClose,
}: PrizeSummaryModalProps) {
  if (!prize) return null;

  const Icon = ICON_MAP[prize.icon] ?? Star;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            variants={sheetVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={cn(
              "relative w-full max-w-md mx-4 mb-4 rounded-2xl overflow-hidden",
              "border border-white/[0.08] backdrop-blur-md",
              `bg-gradient-to-br ${prize.gradient}`,
            )}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-black/20 text-white/60 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="p-8 text-center">
              {/* Prize icon with scale animation */}
              <motion.div
                variants={prizeTextVariants}
                initial="hidden"
                animate="visible"
                className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/10 mb-5"
              >
                <Icon className="w-10 h-10 text-white" />
              </motion.div>

              {/* Prize text */}
              <motion.div
                variants={prizeTextVariants}
                initial="hidden"
                animate="visible"
              >
                <h3 className="text-2xl font-bold text-white mb-2">
                  {prize.label}
                </h3>
                <p className="text-sm text-white/70 mb-6">
                  {prize.description}
                </p>
              </motion.div>

              {/* Divider */}
              <div className="h-px bg-white/10 mb-5" />

              <p className="text-xs text-white/50">
                Your reward has been saved to your account.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
