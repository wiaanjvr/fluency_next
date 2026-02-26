"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useFloatingPoints } from "@/hooks/useCountUp";

export { useFloatingPoints };

interface DepthPointsFloatProps {
  floats: { id: string; points: number; x: number; y: number }[];
}

export function DepthPointsFloat({ floats }: DepthPointsFloatProps) {
  return (
    <AnimatePresence>
      {floats.map((f) => (
        <motion.div
          key={f.id}
          initial={{ opacity: 1, y: 0 }}
          animate={{ opacity: 0, y: -40 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="pointer-events-none fixed z-[100] text-sm font-bold text-teal-300"
          style={{ left: f.x, top: f.y }}
        >
          +{f.points} DP
        </motion.div>
      ))}
    </AnimatePresence>
  );
}
