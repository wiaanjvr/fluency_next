"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// Depth Chart - Continuous Ocean Depth Visualization
// No locks. No modes. Just how deep the tide has risen.
// The user is a diver descending — depth is the only metric.
// ============================================================================

interface DepthChartProps {
  wordCount: number;
  totalMinutes?: number;
  shadowingSessions?: number;
  className?: string;
}

// Internal depth levels (user never sees these labels as "modes")
const depthLevels = [
  {
    id: 1,
    name: "Shallows",
    wordThreshold: 0,
    description: "First sounds and words",
    color: "rgba(30, 107, 114, 0.5)",
  },
  {
    id: 2,
    name: "Sunlit Zone",
    wordThreshold: 50,
    description: "Phrases take shape",
    color: "rgba(26, 58, 74, 0.6)",
  },
  {
    id: 3,
    name: "Twilight Zone",
    wordThreshold: 200,
    description: "Stories come alive",
    color: "rgba(13, 27, 42, 0.7)",
  },
  {
    id: 4,
    name: "The Deep",
    wordThreshold: 500,
    description: "Full immersion",
    color: "rgba(5, 8, 16, 0.8)",
  },
];

function getCurrentDepth(wordCount: number) {
  for (let i = depthLevels.length - 1; i >= 0; i--) {
    if (wordCount >= depthLevels[i].wordThreshold) return depthLevels[i];
  }
  return depthLevels[0];
}

function getDepthPercentage(wordCount: number): number {
  // Maps word count to a 0–100 depth percentage
  // Exponentially slowing — first 100 words feel fast, 500+ feels deep
  if (wordCount <= 0) return 0;
  if (wordCount >= 1000) return 100;
  return Math.min(100, Math.sqrt(wordCount / 1000) * 100);
}

export function DepthChart({
  wordCount,
  totalMinutes = 0,
  shadowingSessions = 0,
  className,
}: DepthChartProps) {
  const [animatedDepth, setAnimatedDepth] = useState(0);
  const currentDepth = getCurrentDepth(wordCount);
  const depthPercent = getDepthPercentage(wordCount);

  // Animate depth on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedDepth(depthPercent);
    }, 300);
    return () => clearTimeout(timer);
  }, [depthPercent]);

  return (
    <div className={cn("w-full", className)}>
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <h3
          className="font-display text-2xl font-semibold"
          style={{ color: "var(--sand)" }}
        >
          Your Depth
        </h3>
        <span
          className="font-body text-sm italic"
          style={{ color: "var(--seafoam)", opacity: 0.7 }}
        >
          {currentDepth.name}
        </span>
      </div>

      {/* Tide Visualization */}
      <div className="ocean-card overflow-hidden p-0">
        <div className="relative h-56">
          {/* Ocean gradient — deeper as you go down */}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(180deg, 
                rgba(30, 107, 114, 0.15) 0%, 
                rgba(13, 27, 42, 0.4) 40%, 
                rgba(5, 8, 16, 0.7) 100%)`,
            }}
          />

          {/* Tide level — rises from bottom */}
          <div
            className="absolute inset-x-0 bottom-0 transition-all duration-[2000ms]"
            style={{
              height: `${animatedDepth}%`,
              background: `linear-gradient(180deg, 
                rgba(61, 214, 181, 0.12) 0%, 
                rgba(30, 107, 114, 0.2) 40%, 
                rgba(13, 27, 42, 0.35) 100%)`,
              transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
            }}
          >
            {/* Surface shimmer at tide line */}
            <div
              className="absolute inset-x-0 top-0 h-px"
              style={{
                background: `linear-gradient(90deg, transparent 0%, rgba(61, 214, 181, 0.4) 30%, rgba(61, 214, 181, 0.6) 50%, rgba(61, 214, 181, 0.4) 70%, transparent 100%)`,
                boxShadow: "0 0 12px rgba(61, 214, 181, 0.3)",
              }}
            />
            {/* Gentle wave on surface */}
            <svg
              className="absolute -top-3 w-full"
              viewBox="0 0 1200 24"
              preserveAspectRatio="none"
              style={{ height: "24px" }}
            >
              <path
                d="M0,12 Q150,4 300,12 T600,12 T900,12 T1200,12 L1200,24 L0,24 Z"
                fill="rgba(61, 214, 181, 0.08)"
              >
                <animate
                  attributeName="d"
                  dur="6s"
                  repeatCount="indefinite"
                  values="M0,12 Q150,4 300,12 T600,12 T900,12 T1200,12 L1200,24 L0,24 Z;
                          M0,12 Q150,20 300,12 T600,12 T900,12 T1200,12 L1200,24 L0,24 Z;
                          M0,12 Q150,4 300,12 T600,12 T900,12 T1200,12 L1200,24 L0,24 Z"
                />
              </path>
            </svg>
          </div>

          {/* Depth markers — subtle horizontal lines */}
          {depthLevels.map((level, i) => {
            const yPos = 100 - getDepthPercentage(level.wordThreshold);
            if (i === 0) return null;
            return (
              <div
                key={level.id}
                className="absolute left-0 right-0 flex items-center gap-3 px-6"
                style={{
                  top: `${yPos}%`,
                  transform: "translateY(-50%)",
                  opacity: wordCount >= level.wordThreshold ? 0.6 : 0.2,
                  transition: "opacity 1s ease",
                }}
              >
                <div
                  className="flex-1 h-px"
                  style={{ background: "rgba(255, 255, 255, 0.08)" }}
                />
                <span
                  className="font-body text-xs whitespace-nowrap"
                  style={{ color: "var(--seafoam)" }}
                >
                  {level.name}
                </span>
              </div>
            );
          })}

          {/* Diver indicator at current depth */}
          <div
            className="absolute left-1/2 -translate-x-1/2 transition-all duration-[2000ms]"
            style={{
              bottom: `calc(${animatedDepth}% - 12px)`,
              transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
            }}
          >
            <div className="relative">
              {/* Glow */}
              <div
                className="absolute inset-0 w-6 h-6 rounded-full"
                style={{
                  background: "var(--turquoise)",
                  filter: "blur(10px)",
                  opacity: 0.4,
                }}
              />
              {/* Diver dot */}
              <div
                className="w-3 h-3 rounded-full relative z-10"
                style={{
                  background: "var(--turquoise)",
                  boxShadow: "0 0 8px rgba(61, 214, 181, 0.6)",
                }}
              />
            </div>
          </div>
        </div>

        {/* Bottom stats bar */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ background: "rgba(0, 0, 0, 0.3)" }}
        >
          <div className="flex items-center gap-6">
            <div>
              <div
                className="font-display text-2xl font-semibold tabular-nums"
                style={{ color: "var(--sand)" }}
              >
                {wordCount}
              </div>
              <div
                className="font-body text-xs uppercase tracking-wider"
                style={{ color: "var(--seafoam)", opacity: 0.6 }}
              >
                Words absorbed
              </div>
            </div>
            {totalMinutes > 0 && (
              <div>
                <div
                  className="font-display text-2xl font-semibold tabular-nums"
                  style={{ color: "var(--sand)" }}
                >
                  {totalMinutes >= 60
                    ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`
                    : `${totalMinutes}m`}
                </div>
                <div
                  className="font-body text-xs uppercase tracking-wider"
                  style={{ color: "var(--seafoam)", opacity: 0.6 }}
                >
                  Immersed
                </div>
              </div>
            )}
            {shadowingSessions > 0 && (
              <div>
                <div
                  className="font-display text-2xl font-semibold tabular-nums"
                  style={{ color: "var(--sand)" }}
                >
                  {shadowingSessions}
                </div>
                <div
                  className="font-body text-xs uppercase tracking-wider"
                  style={{ color: "var(--seafoam)", opacity: 0.6 }}
                >
                  Shadowed
                </div>
              </div>
            )}
          </div>
          <div
            className="font-body text-sm italic"
            style={{ color: "var(--seafoam)", opacity: 0.5 }}
          >
            {currentDepth.description}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DepthChart;
