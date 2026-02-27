"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  getDepthLevel,
  getProgressToNextLevel,
  type DepthLevel,
  type DepthProgress,
} from "@/lib/progression/depthLevels";

// ============================================================================
// DepthIndicator — Replaces the simple "X words" chip in OceanNavigation
// Circular progress ring + word count. Hover reveals popover with details.
// ============================================================================

interface DepthIndicatorProps {
  wordCount: number;
  className?: string;
}

/** SVG circular progress ring */
function ProgressRing({
  percentage,
  color,
  size = 32,
  strokeWidth = 2.5,
}: {
  percentage: number;
  color: string;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="transform -rotate-90"
      aria-hidden="true"
    >
      {/* Background track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={strokeWidth}
      />
      {/* Progress arc */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{
          transition: "stroke-dashoffset 0.8s ease-out",
        }}
      />
    </svg>
  );
}

export function DepthIndicator({ wordCount, className }: DepthIndicatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [animatedCount, setAnimatedCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const progress = getProgressToNextLevel(wordCount);
  const { current, next, percentage, wordsRemaining } = progress;

  // Animate word count on mount
  useEffect(() => {
    const duration = 1000;
    const steps = 30;
    const step = wordCount / steps;
    let frame = 0;

    const interval = setInterval(() => {
      frame++;
      setAnimatedCount(Math.min(Math.round(step * frame), wordCount));
      if (frame >= steps) clearInterval(interval);
    }, duration / steps);

    return () => clearInterval(interval);
  }, [wordCount]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  const handleMouseEnter = () => {
    clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setIsOpen(false), 200);
  };

  return (
    <div
      ref={containerRef}
      className={cn("relative", className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Trigger chip */}
      <button
        className="flex items-center gap-2 px-2.5 py-1 rounded-full transition-all duration-200 group"
        style={{
          background: isOpen
            ? "rgba(255, 255, 255, 0.06)"
            : "rgba(255, 255, 255, 0.03)",
          border: `1px solid ${isOpen ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.07)"}`,
        }}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={`${current.name}: ${wordCount} words learned. ${percentage}% progress to next level.`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <ProgressRing
          percentage={percentage}
          color={current.colorPrimaryHex}
          size={24}
          strokeWidth={2}
        />
        <div className="flex flex-col items-start leading-none">
          <span
            className="text-[10px] font-medium"
            style={{
              fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)",
              color: current.colorPrimaryHex,
              letterSpacing: "0.06em",
            }}
          >
            {current.name}
          </span>
          <span
            className="text-xs tabular-nums"
            style={{
              fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)",
              color: "var(--text-secondary, #7BA8A0)",
            }}
          >
            {animatedCount} words
          </span>
        </div>
      </button>

      {/* Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -4 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="absolute right-0 top-full mt-3 z-50"
            style={{
              transformOrigin: "top right",
              width: 300,
            }}
          >
            <div
              className="rounded-xl border overflow-hidden"
              style={{
                background: "var(--bg-elevated, #052030)",
                borderColor: "rgba(255,255,255,0.08)",
                boxShadow:
                  "0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
                backdropFilter: "blur(24px)",
              }}
              role="dialog"
              aria-label={`Depth progress: ${current.name}`}
            >
              {/* Current level header */}
              <div
                className="px-5 pt-5 pb-4"
                style={{
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{
                      background: current.colorPrimaryHex,
                      boxShadow: `0 0 8px ${current.colorPrimaryHex}60`,
                    }}
                  />
                  <span
                    className="text-sm font-semibold"
                    style={{
                      fontFamily:
                        "var(--font-display, 'Playfair Display', serif)",
                      color: "var(--text-primary, #F0FDFA)",
                    }}
                  >
                    {current.name}
                  </span>
                </div>
                <p
                  className="text-xs leading-relaxed"
                  style={{
                    fontFamily: "var(--font-inter, 'Inter', sans-serif)",
                    color: "var(--text-secondary, #7BA8A0)",
                  }}
                >
                  {current.description}
                </p>
              </div>

              {/* Progress section */}
              <div className="px-5 py-4">
                {next ? (
                  <>
                    {/* Progress bar */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span
                          className="text-[10px] uppercase tracking-wider"
                          style={{
                            fontFamily:
                              "var(--font-inter, 'Inter', system-ui, sans-serif)",
                            color: "var(--text-ghost, #2D5A52)",
                          }}
                        >
                          Progress
                        </span>
                        <span
                          className="text-[10px] tabular-nums"
                          style={{
                            fontFamily:
                              "var(--font-inter, 'Inter', system-ui, sans-serif)",
                            color: "var(--text-secondary, #7BA8A0)",
                          }}
                        >
                          {percentage}%
                        </span>
                      </div>
                      <div
                        className="w-full h-1.5 rounded-full overflow-hidden"
                        style={{
                          background: "rgba(255,255,255,0.04)",
                        }}
                      >
                        <motion.div
                          className="h-full rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{
                            duration: 1,
                            ease: [0.23, 1, 0.32, 1],
                          }}
                          style={{
                            background: `linear-gradient(90deg, ${current.colorPrimaryHex}, ${current.colorSecondaryHex})`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Word count to next */}
                    <p
                      className="text-xs mb-3"
                      style={{
                        fontFamily:
                          "var(--font-inter, 'Inter', system-ui, sans-serif)",
                        color: "var(--text-secondary, #7BA8A0)",
                      }}
                    >
                      <span className="tabular-nums">{wordCount}</span>
                      <span style={{ color: "var(--text-ghost, #2D5A52)" }}>
                        {" "}
                        /{" "}
                      </span>
                      <span className="tabular-nums">{next.unlocksAt}</span>
                      <span style={{ color: "var(--text-ghost, #2D5A52)" }}>
                        {" "}
                        words to{" "}
                      </span>
                      <span style={{ color: next.colorPrimaryHex }}>
                        {next.name}
                      </span>
                    </p>

                    {/* Next level teaser */}
                    <div
                      className="rounded-lg px-3 py-2.5"
                      style={{
                        background: "rgba(255,255,255,0.02)",
                        border: "1px solid rgba(255,255,255,0.04)",
                      }}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <div
                          className="w-1.5 h-1.5 rounded-full"
                          style={{
                            background: next.colorPrimaryHex,
                            opacity: 0.5,
                          }}
                        />
                        <span
                          className="text-[10px] uppercase tracking-wider"
                          style={{
                            fontFamily:
                              "var(--font-inter, 'Inter', system-ui, sans-serif)",
                            color: "var(--text-ghost, #2D5A52)",
                          }}
                        >
                          Next Depth
                        </span>
                      </div>
                      <p
                        className="text-xs italic"
                        style={{
                          fontFamily: "var(--font-inter, 'Inter', sans-serif)",
                          color: "var(--text-secondary, #6B9E96)",
                        }}
                      >
                        {next.environmentDescription.split(".")[0]}.
                      </p>
                    </div>
                  </>
                ) : (
                  <p
                    className="text-xs italic"
                    style={{
                      fontFamily: "var(--font-inter, 'Inter', sans-serif)",
                      color: "var(--text-secondary, #7BA8A0)",
                    }}
                  >
                    You&apos;ve reached the deepest depth. The language is part
                    of you now.
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default DepthIndicator;
