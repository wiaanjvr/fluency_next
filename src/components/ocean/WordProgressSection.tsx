"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// Word Progress Cards - NEW / KNOWN / MASTERED with depth gauges
// ============================================================================

interface WordProgressCardProps {
  label: string;
  count: number;
  maxCount?: number;
  variant: "new" | "known" | "mastered";
  delay?: number;
  className?: string;
}

export function WordProgressCard({
  label,
  count,
  maxCount = 100,
  variant,
  delay = 0,
  className,
}: WordProgressCardProps) {
  const [displayCount, setDisplayCount] = useState(0);
  const [gaugeHeight, setGaugeHeight] = useState(0);

  // Animated count up
  useEffect(() => {
    const timer = setTimeout(() => {
      const duration = 1000;
      const steps = 30;
      const step = count / steps;
      let current = 0;

      const interval = setInterval(() => {
        current++;
        setDisplayCount(Math.min(Math.round(step * current), count));
        if (current >= steps) clearInterval(interval);
      }, duration / steps);

      // Animate gauge
      setTimeout(() => {
        setGaugeHeight(Math.min((count / maxCount) * 100, 100));
      }, 200);

      return () => clearInterval(interval);
    }, delay);

    return () => clearTimeout(timer);
  }, [count, maxCount, delay]);

  const variantStyles = {
    new: {
      textColor: "var(--sand)",
      gaugeColor:
        "linear-gradient(to top, var(--ocean-mid), var(--surface-teal))",
    },
    known: {
      textColor: "var(--seafoam)",
      gaugeColor:
        "linear-gradient(to top, var(--surface-teal), var(--turquoise))",
    },
    mastered: {
      textColor: "#ffffff",
      gaugeColor: "linear-gradient(to top, var(--turquoise), #5ee8c5)",
    },
  };

  const styles = variantStyles[variant];

  return (
    <div
      className={cn(
        "ocean-card ocean-card-animate relative overflow-hidden p-6",
        className,
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Depth Gauge - Left edge */}
      <div
        className="depth-gauge absolute left-0 top-0 bottom-0"
        style={{ width: "4px" }}
      >
        <div
          className="depth-gauge-fill absolute bottom-0 left-0 right-0 transition-all duration-1000"
          style={{
            height: `${gaugeHeight}%`,
            background: styles.gaugeColor,
            transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
          }}
        />
      </div>

      {/* Content */}
      <div className="pl-2">
        {/* Large Number */}
        <div
          className="font-display text-6xl md:text-7xl font-semibold mb-2 tabular-nums"
          style={{ color: styles.textColor }}
        >
          {displayCount}
        </div>

        {/* Label */}
        <div
          className="font-body text-sm uppercase tracking-wider"
          style={{ color: "var(--seafoam)", opacity: 0.7 }}
        >
          {label}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Word Progress Section - Container for all three cards
// ============================================================================

interface WordProgressSectionProps {
  newWords: number;
  knownWords: number;
  masteredWords: number;
  className?: string;
}

export function WordProgressSection({
  newWords,
  knownWords,
  masteredWords,
  className,
}: WordProgressSectionProps) {
  const total = newWords + knownWords + masteredWords || 100;

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-3 gap-4", className)}>
      <WordProgressCard
        label="New"
        count={newWords}
        maxCount={total}
        variant="new"
        delay={200}
      />
      <WordProgressCard
        label="Known"
        count={knownWords}
        maxCount={total}
        variant="known"
        delay={300}
      />
      <WordProgressCard
        label="Mastered"
        count={masteredWords}
        maxCount={total}
        variant="mastered"
        delay={400}
      />
    </div>
  );
}

export default WordProgressSection;
