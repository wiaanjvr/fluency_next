"use client";

import { motion } from "framer-motion";
import { Mic } from "lucide-react";

interface WeeklyPromptCardProps {
  prompt?: string;
  onRecord?: () => void;
}

export function WeeklyPromptCard({
  prompt = "Describe your ideal weekend in German. Use at least 3 time expressions (am Morgen, am Nachmittag, am Abend).",
  onRecord,
}: WeeklyPromptCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-2xl bg-gradient-to-br from-teal-900/30 to-[var(--midnight)] border border-teal-500/20 p-6 overflow-hidden mb-6"
    >
      {/* Animated wave border effect */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-teal-400/40 to-transparent" />
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-teal-400/20 to-transparent" />

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] text-teal-400 uppercase tracking-wider font-semibold bg-teal-500/10 border border-teal-500/20 rounded-full px-2.5 py-0.5">
            This Week&apos;s Prompt
          </span>
        </div>

        <p className="text-[15px] text-white/85 leading-relaxed mb-5">
          {prompt}
        </p>

        <button
          onClick={onRecord}
          className="flex items-center gap-2 rounded-2xl bg-[var(--turquoise)] text-[var(--midnight)] px-5 py-2.5 text-sm font-semibold hover:brightness-110 transition-all shadow-[0_0_16px_rgba(61,214,181,0.2)]"
        >
          <Mic className="h-4 w-4" />
          Record & Submit
        </button>
      </div>

      {/* Subtle wave decoration */}
      <svg
        className="absolute bottom-0 left-0 right-0 opacity-[0.04]"
        viewBox="0 0 400 40"
        fill="none"
        preserveAspectRatio="none"
      >
        <path
          d="M0 20 Q50 0 100 20 T200 20 T300 20 T400 20 V40 H0Z"
          fill="#3dd6b5"
        >
          <animate
            attributeName="d"
            dur="8s"
            repeatCount="indefinite"
            values="M0 20 Q50 0 100 20 T200 20 T300 20 T400 20 V40 H0Z;M0 20 Q50 40 100 20 T200 20 T300 20 T400 20 V40 H0Z;M0 20 Q50 0 100 20 T200 20 T300 20 T400 20 V40 H0Z"
          />
        </path>
      </svg>
    </motion.div>
  );
}
