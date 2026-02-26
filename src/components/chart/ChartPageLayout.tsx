"use client";

import { motion } from "framer-motion";

/* =============================================================================
   ChartPageLayout — Overall layout wrapper with section spacing
============================================================================= */

interface ChartPageLayoutProps {
  children: React.ReactNode;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
};

const sectionVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 80, damping: 20 },
  },
} as const;

export function ChartPageLayout({ children }: ChartPageLayoutProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6"
    >
      {children}
    </motion.div>
  );
}

export function ChartSection({ children }: { children: React.ReactNode }) {
  return <motion.section variants={sectionVariants}>{children}</motion.section>;
}
