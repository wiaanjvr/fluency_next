"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";

interface OnboardingStepTransitionProps {
  /** Key that uniquely identifies the current step — changing it triggers exit + enter */
  stepKey: string | number;
  children: ReactNode;
  className?: string;
}

/**
 * Wraps an onboarding step card with sequential enter / exit animations.
 *
 * Enter  — opacity 0 → 1, translateY +24px → 0   — 400ms ease-out
 * Exit   — opacity 1 → 0, translateY  0  → -16px — 250ms ease-in
 *
 * Uses framer-motion AnimatePresence mode="wait" so the old card fully exits
 * before the new card starts entering.
 */
export function OnboardingStepTransition({
  stepKey,
  children,
  className,
}: OnboardingStepTransitionProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={stepKey}
        className={className}
        initial={{ opacity: 0, y: 24 }}
        animate={{
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.4,
            ease: [0, 0, 0.2, 1], // CSS ease-out equivalent
          },
        }}
        exit={{
          opacity: 0,
          y: -16,
          transition: {
            duration: 0.25,
            ease: [0.4, 0, 1, 1], // CSS ease-in equivalent
          },
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
