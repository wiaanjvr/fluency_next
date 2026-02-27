"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// Depth Chart — Submarine observation deck aesthetic
// Vertical gauge with soft teal accents. No neon, no monospace.
// ============================================================================

interface DepthChartProps {
  wordCount: number;
  totalMinutes?: number;
  shadowingSessions?: number;
  className?: string;
}

// Design tokens (mirror navigation/DepthSidebar)
const T = {
  gaugeTop: "#2dd4bf",
  gaugeBottom: "#0891b2",
  gaugeTrack: "rgba(148, 163, 184, 0.15)",
  accentTeal: "#00d4aa",
  activeRowBg: "rgba(0, 212, 170, 0.07)",
  activeRowBdr: "#00d4aa",
  textPrimary: "#e2e8f0",
  textMuted: "#64748b",
  textSub: "#8ba3b8",
  dividerFaint: "rgba(45, 212, 191, 0.08)",
  font: "'Inter', 'DM Sans', system-ui, sans-serif",
} as const;

const ZONES = [
  {
    id: 0,
    name: "SHALLOWS",
    range: [0, 50] as [number, number],
    description: "First words",
    depthLabel: "0 – 50 words",
  },
  {
    id: 1,
    name: "SUNLIT ZONE",
    range: [50, 500] as [number, number],
    description: "Core vocabulary",
    depthLabel: "50 – 500 words",
  },
  {
    id: 2,
    name: "TWILIGHT ZONE",
    range: [500, 2000] as [number, number],
    description: "Patterns emerging",
    depthLabel: "500 – 2,000 words",
  },
  {
    id: 3,
    name: "THE DEEP",
    range: [2000, 5000] as [number, number],
    description: "Fluent expression",
    depthLabel: "2,000 – 5,000 words",
  },
  {
    id: 4,
    name: "THE ABYSS",
    range: [5000, Infinity] as [number, number],
    description: "True immersion",
    depthLabel: "5,000+ words",
  },
] as const;

function getActiveZoneIndex(wordCount: number): number {
  for (let i = ZONES.length - 1; i >= 0; i--) {
    if (wordCount >= ZONES[i].range[0]) return i;
  }
  return 0;
}

export function DepthChart({
  wordCount,
  totalMinutes = 0,
  shadowingSessions = 0,
  className,
}: DepthChartProps) {
  const [mounted, setMounted] = useState(false);
  const activeZoneIndex = getActiveZoneIndex(wordCount);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const timeLabel =
    totalMinutes >= 60
      ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`
      : `${totalMinutes} min`;

  return (
    <div className={cn("w-full flex flex-col h-full", className)}>
      {/* Zone nodes along the depth cable */}
      <div className="relative flex-1 flex flex-col" style={{ minHeight: 0 }}>
        {/* No vertical cable — zone list is the gauge in this variant */}

        {/* Zone nodes */}
        {ZONES.map((zone, i) => {
          const isActive = i === activeZoneIndex;
          const isLocked = i > activeZoneIndex;
          const isPast = i < activeZoneIndex;

          return (
            <div
              key={zone.id}
              style={{
                flex: 1,
                minHeight: 44,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "5px 8px 5px 10px",
                marginBottom: 1,
                borderLeft: isActive
                  ? `3px solid ${T.activeRowBdr}`
                  : "3px solid transparent",
                background: isActive ? T.activeRowBg : "transparent",
                borderRadius: "0 4px 4px 0",
                opacity: isLocked ? 0.4 : 1,
                transition: "background 0.25s, opacity 0.3s",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <span
                  style={{
                    fontFamily: T.font,
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: isActive
                      ? T.textPrimary
                      : isPast
                        ? T.textSub
                        : T.textMuted,
                    lineHeight: 1,
                  }}
                >
                  {zone.name}
                </span>
                <span
                  style={{
                    fontFamily: T.font,
                    fontSize: 9,
                    color: T.textMuted,
                    opacity: 0.7,
                  }}
                >
                  {zone.description}
                </span>
              </div>
              <span
                style={{
                  fontFamily: T.font,
                  fontSize: 9,
                  fontWeight: 400,
                  color: T.textMuted,
                  opacity: isActive ? 0.9 : 0.55,
                  whiteSpace: "nowrap",
                }}
              >
                {zone.depthLabel}
              </span>
            </div>
          );
        })}
      </div>

      {/* Stats at bottom */}
      <div
        style={{
          marginTop: "auto",
          paddingTop: 14,
          borderTop: `1px solid rgba(45, 212, 191, 0.08)`,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: "'Inter', 'DM Sans', system-ui, sans-serif",
            fontSize: 15,
            fontWeight: 600,
            color: "#00d4aa",
            marginBottom: 3,
            letterSpacing: "-0.01em",
          }}
        >
          {wordCount.toLocaleString()} words
        </div>
        <div
          style={{
            fontFamily: "'Inter', 'DM Sans', system-ui, sans-serif",
            fontSize: 11,
            color: "#64748b",
          }}
        >
          {timeLabel} immersed
        </div>
      </div>
    </div>
  );
}

export default DepthChart;
