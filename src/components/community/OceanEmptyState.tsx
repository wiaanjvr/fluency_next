"use client";

import { motion } from "framer-motion";

interface OceanEmptyStateProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function OceanEmptyState({
  message,
  actionLabel,
  onAction,
  className = "",
}: OceanEmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`}
    >
      {/* Lanternfish SVG */}
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="mb-6"
      >
        <svg
          width="80"
          height="80"
          viewBox="0 0 80 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Body */}
          <ellipse
            cx="40"
            cy="44"
            rx="20"
            ry="14"
            fill="#1a3a4a"
            opacity="0.6"
          />
          <ellipse
            cx="40"
            cy="44"
            rx="16"
            ry="10"
            fill="#1e6b72"
            opacity="0.4"
          />
          {/* Lantern / lure */}
          <line
            x1="36"
            y1="30"
            x2="32"
            y2="16"
            stroke="#3dd6b5"
            strokeWidth="1.5"
            opacity="0.6"
          />
          <motion.circle
            cx="32"
            cy="14"
            r="4"
            fill="#3dd6b5"
            opacity="0.8"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <motion.circle
            cx="32"
            cy="14"
            r="8"
            fill="#3dd6b5"
            opacity="0.1"
            animate={{ r: [8, 12, 8], opacity: [0.1, 0.05, 0.1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          {/* Eye */}
          <circle cx="48" cy="40" r="3" fill="white" opacity="0.8" />
          <circle cx="49" cy="40" r="1.5" fill="#0a0f1e" />
          {/* Tail fin */}
          <path d="M20 44 L10 36 L10 52Z" fill="#1e6b72" opacity="0.3" />
          {/* Top fin */}
          <path d="M35 34 Q40 24 45 34" fill="#1e6b72" opacity="0.3" />
          {/* Small bubbles */}
          <motion.circle
            cx="56"
            cy="38"
            r="1.5"
            fill="#3dd6b5"
            opacity="0.3"
            animate={{ cy: [38, 30, 22], opacity: [0.3, 0.15, 0] }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: 0.5,
            }}
          />
          <motion.circle
            cx="54"
            cy="42"
            r="1"
            fill="#3dd6b5"
            opacity="0.2"
            animate={{ cy: [42, 34, 26], opacity: [0.2, 0.1, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: 1 }}
          />
        </svg>
      </motion.div>

      <p className="text-sm text-seafoam/40 max-w-xs leading-relaxed mb-4">
        {message}
      </p>

      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="rounded-2xl bg-[var(--turquoise)] text-[var(--midnight)] px-6 py-2.5 text-sm font-semibold hover:brightness-110 transition-all shadow-[0_0_16px_rgba(61,214,181,0.2)]"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
