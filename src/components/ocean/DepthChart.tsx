"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// Depth Chart — Physical depth gauge visualization
// Vertical cable with depth marker nodes. Active zone glows.
// ============================================================================

interface DepthChartProps {
  wordCount: number;
  totalMinutes?: number;
  shadowingSessions?: number;
  className?: string;
}

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
        {/* Depth cable — vertical line */}
        <div
          className="absolute"
          style={{
            left: 11,
            top: 10,
            bottom: 10,
            width: 1,
            borderRadius: 1,
            background:
              "linear-gradient(to bottom, var(--teal-border, rgba(13,148,136,0.2)) 0%, rgba(13, 148, 136, 0.05) 60%, transparent 100%)",
          }}
        />

        {/* Zone nodes */}
        {ZONES.map((zone, i) => {
          const isActive = i === activeZoneIndex;
          const isLocked = i > activeZoneIndex;
          const isPast = i < activeZoneIndex;

          return (
            <div
              key={zone.id}
              className="relative"
              style={{
                flex: 1,
                minHeight: 48,
                paddingLeft: 36,
                paddingTop: 10,
                paddingBottom: 10,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                opacity: isLocked ? 0.35 : isPast ? 0.6 : 1,
                background: isActive
                  ? "linear-gradient(90deg, rgba(13, 148, 136, 0.06) 0%, transparent 100%)"
                  : "transparent",
                transition: "opacity 0.5s ease, background 0.4s ease",
              }}
            >
              {/* Horizontal tick mark from cable */}
              <div
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  width: 14,
                  height: 1,
                  background: isActive
                    ? "rgba(255, 255, 255, 0.12)"
                    : "rgba(255, 255, 255, 0.06)",
                  transform: "translateY(-50%)",
                }}
              />

              {/* Circle indicator on cable */}
              <div
                style={{
                  position: "absolute",
                  left: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: isActive ? "var(--teal, #0D9488)" : "transparent",
                  border: isActive
                    ? "none"
                    : `1.5px solid ${isPast ? "rgba(255, 255, 255, 0.08)" : "#1A3832"}`,
                  boxShadow: isActive
                    ? "0 0 10px rgba(13, 148, 136, 0.5), 0 0 20px rgba(13, 148, 136, 0.2)"
                    : "none",
                  transition: "all 0.4s ease",
                }}
              />

              {/* Zone name */}
              <div
                style={{
                  fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                  fontSize: 10,
                  fontWeight: 500,
                  letterSpacing: "0.12em",
                  color: isActive
                    ? "var(--text-primary, #EDF6F4)"
                    : isLocked
                      ? "#1E4040"
                      : "var(--text-ghost, #1A3832)",
                  lineHeight: 1.2,
                  transition: "color 0.3s ease",
                }}
              >
                {zone.name}
              </div>

              {/* Word count range */}
              <div
                style={{
                  fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                  fontSize: 9,
                  color: "var(--text-ghost, #2D5A52)",
                  opacity: 0.6,
                  marginTop: 2,
                }}
              >
                {zone.depthLabel}
              </div>

              {/* Zone descriptor */}
              <div
                style={{
                  fontFamily: "var(--font-inter, 'Inter', sans-serif)",
                  fontSize: 9,
                  fontStyle: "italic",
                  color: "var(--text-ghost, #2D5A52)",
                  opacity: isActive ? 0.6 : 0.4,
                  marginTop: 1,
                }}
              >
                {zone.description}
              </div>
            </div>
          );
        })}
      </div>

      {/* Stats at bottom */}
      <div
        style={{
          marginTop: "auto",
          paddingTop: 16,
          borderTop: "1px solid rgba(255, 255, 255, 0.04)",
        }}
      >
        <div style={{ marginBottom: 12 }}>
          <div
            style={{
              fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
              fontSize: 14,
              fontWeight: 500,
              color: "var(--text-secondary, #7BA8A0)",
              letterSpacing: "-0.01em",
            }}
          >
            {wordCount} WORDS
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
              fontSize: 9,
              letterSpacing: "0.12em",
              textTransform: "uppercase" as const,
              color: "var(--text-ghost, #2D5A52)",
              marginTop: 2,
            }}
          >
            Absorbed
          </div>
        </div>
        <div>
          <div
            style={{
              fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
              fontSize: 14,
              fontWeight: 500,
              color: "var(--text-secondary, #7BA8A0)",
              letterSpacing: "-0.01em",
            }}
          >
            {timeLabel}
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
              fontSize: 9,
              letterSpacing: "0.12em",
              textTransform: "uppercase" as const,
              color: "var(--text-ghost, #2D5A52)",
              marginTop: 2,
            }}
          >
            Immersed
          </div>
        </div>
      </div>
    </div>
  );
}

export default DepthChart;
