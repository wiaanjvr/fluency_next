"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/* =============================================================================
   OceanEmptyState — Reusable empty state with lanternfish SVG illustration
============================================================================= */

interface OceanEmptyStateProps {
  message: string;
  className?: string;
}

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 80, damping: 20 },
  },
} as const;

export function OceanEmptyState({ message, className }: OceanEmptyStateProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn(
        "flex flex-col items-center justify-center py-16 px-6 text-center",
        className,
      )}
    >
      {/* Inline lanternfish SVG — bioluminescent deep-sea fish */}
      <motion.svg
        width="120"
        height="120"
        viewBox="0 0 120 120"
        fill="none"
        className="mb-6"
        animate={{
          y: [0, -6, 0],
          filter: [
            "drop-shadow(0 0 8px rgba(13,148,136,0.4))",
            "drop-shadow(0 0 16px rgba(13,148,136,0.7))",
            "drop-shadow(0 0 8px rgba(13,148,136,0.4))",
          ],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Body */}
        <ellipse cx="60" cy="62" rx="28" ry="18" fill="#0d3d56" />
        <ellipse
          cx="60"
          cy="62"
          rx="28"
          ry="18"
          fill="url(#fishGlow)"
          opacity="0.6"
        />

        {/* Tail */}
        <path
          d="M88 62 C 95 52, 105 50, 108 55 C 105 60, 105 64, 108 69 C 105 74, 95 72, 88 62Z"
          fill="#0d3d56"
        />
        <path
          d="M88 62 C 95 52, 105 50, 108 55 C 105 60, 105 64, 108 69 C 105 74, 95 72, 88 62Z"
          fill="url(#fishGlow)"
          opacity="0.3"
        />

        {/* Dorsal fin */}
        <path d="M50 44 C 55 30, 65 28, 68 44" fill="#0a4f6d" opacity="0.8" />

        {/* Eye */}
        <circle cx="42" cy="58" r="5" fill="#0a1628" />
        <circle cx="42" cy="58" r="3" fill="#22d3ee" />
        <circle cx="41" cy="57" r="1.2" fill="#fff" />

        {/* Bioluminescent lure (angler light) */}
        <line
          x1="36"
          y1="44"
          x2="30"
          y2="28"
          stroke="#14b8a6"
          strokeWidth="1"
          opacity="0.6"
        />
        <motion.circle
          cx="30"
          cy="26"
          r="4"
          fill="#5eead4"
          animate={{
            r: [4, 5.5, 4],
            opacity: [0.8, 1, 0.8],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.circle
          cx="30"
          cy="26"
          r="8"
          fill="none"
          stroke="#5eead4"
          strokeWidth="0.5"
          animate={{
            r: [8, 14, 8],
            opacity: [0.3, 0, 0.3],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Belly glow spots */}
        {[0, 1, 2, 3].map((i) => (
          <motion.circle
            key={i}
            cx={44 + i * 10}
            cy={70}
            r="1.5"
            fill="#5eead4"
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: i * 0.3,
              ease: "easeInOut",
            }}
          />
        ))}

        {/* Ambient bubbles */}
        {[0, 1, 2].map((i) => (
          <motion.circle
            key={`bubble-${i}`}
            cx={35 + i * 15}
            cy={90}
            r={2 + i}
            fill="none"
            stroke="rgba(13,148,136,0.3)"
            strokeWidth="0.5"
            animate={{
              cy: [90, 20],
              opacity: [0.4, 0],
            }}
            transition={{
              duration: 3 + i,
              repeat: Infinity,
              delay: i * 1.2,
              ease: "easeOut",
            }}
          />
        ))}

        <defs>
          <radialGradient id="fishGlow" cx="40%" cy="40%">
            <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#0d3d56" stopOpacity="0" />
          </radialGradient>
        </defs>
      </motion.svg>

      <p className="text-sm text-[var(--text-secondary,#6b9e96)] max-w-[280px] leading-relaxed">
        {message}
      </p>
    </motion.div>
  );
}
