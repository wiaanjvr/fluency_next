"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Lock, Waves, Fish, Shell, Anchor } from "lucide-react";

// ============================================================================
// Depth Chart - Learning Roadmap as Ocean Cross-Section
// Shows progression from Surface (Foundation) to Abyss (Mastery)
// ============================================================================

interface DepthChartProps {
  wordCount: number;
  className?: string;
}

// Diver SVG component
function DiverIcon({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={style}
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="5" r="3" fill="currentColor" />
      <path
        d="M12 8 L12 16 M8 12 L16 12 M12 16 L9 22 M12 16 L15 22"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const depthZones = [
  {
    id: "foundation",
    label: "Foundation",
    wordThreshold: 0,
    targetWords: 100,
    icon: Waves,
    depth: "Surface",
    color: "--surface-teal",
    bgOpacity: 0.15,
  },
  {
    id: "sentences",
    label: "Sentences",
    wordThreshold: 100,
    targetWords: 300,
    icon: Fish,
    depth: "Mid-water",
    color: "--ocean-mid",
    bgOpacity: 0.25,
  },
  {
    id: "stories",
    label: "Stories",
    wordThreshold: 300,
    targetWords: 500,
    icon: Shell,
    depth: "Deep",
    color: "--deep-navy",
    bgOpacity: 0.35,
  },
  {
    id: "mastery",
    label: "Mastery",
    wordThreshold: 500,
    targetWords: 1000,
    icon: Anchor,
    depth: "Abyss",
    color: "--midnight",
    bgOpacity: 0.5,
  },
];

export function DepthChart({ wordCount, className }: DepthChartProps) {
  // Find current zone
  const currentZoneIndex = depthZones.findIndex((zone, index) => {
    const nextZone = depthZones[index + 1];
    return !nextZone || wordCount < nextZone.wordThreshold;
  });

  // Calculate diver position (percentage along the chart)
  const calculateDiverPosition = () => {
    if (wordCount === 0) return 0;
    if (wordCount >= 1000) return 100;

    // Find which zone the user is in and calculate position within that zone
    for (let i = 0; i < depthZones.length; i++) {
      const zone = depthZones[i];
      const nextZone = depthZones[i + 1];

      if (!nextZone || wordCount < nextZone.wordThreshold) {
        const zoneStart = zone.wordThreshold;
        const zoneEnd = nextZone?.wordThreshold || 1000;
        const zoneProgress = (wordCount - zoneStart) / (zoneEnd - zoneStart);
        const basePosition = (i / depthZones.length) * 100;
        const zoneWidth = 100 / depthZones.length;
        return basePosition + zoneProgress * zoneWidth;
      }
    }
    return 0;
  };

  const diverPosition = calculateDiverPosition();

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
        <span className="font-body text-sm" style={{ color: "var(--seafoam)" }}>
          {wordCount} words explored
        </span>
      </div>

      {/* Depth Chart Container */}
      <div className="ocean-card overflow-hidden p-0">
        {/* SVG Ocean Cross-Section */}
        <div className="relative h-40">
          {/* Gradient Background */}
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 1000 160"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient
                id="depthGradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor="#1e6b72" stopOpacity="0.3" />
                <stop offset="25%" stopColor="#1a3a4a" stopOpacity="0.4" />
                <stop offset="50%" stopColor="#0d1b2a" stopOpacity="0.5" />
                <stop offset="75%" stopColor="#0a0f1e" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#050810" stopOpacity="0.7" />
              </linearGradient>
              {/* Glow filter for diver */}
              <filter id="diverGlow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Ocean floor */}
            <path
              d="M0,160 L0,120 Q250,100 500,130 Q750,150 1000,110 L1000,160 Z"
              fill="url(#depthGradient)"
            />

            {/* Water surface line */}
            <path
              d="M0,20 Q100,10 200,20 Q300,30 400,20 Q500,10 600,20 Q700,30 800,20 Q900,10 1000,20"
              fill="none"
              stroke="rgba(61, 214, 181, 0.3)"
              strokeWidth="2"
            />
          </svg>

          {/* Depth Zone Markers */}
          <div className="absolute inset-0 flex">
            {depthZones.map((zone, index) => {
              const isUnlocked = wordCount >= zone.wordThreshold;
              const isCurrent = index === currentZoneIndex;
              const Icon = zone.icon;

              return (
                <div
                  key={zone.id}
                  className="flex-1 relative flex flex-col items-center justify-center"
                  style={{
                    background: `rgba(0, 0, 0, ${zone.bgOpacity})`,
                  }}
                >
                  {/* Zone Icon */}
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all duration-300",
                      isUnlocked ? "bg-white/10" : "bg-white/5",
                    )}
                  >
                    {isUnlocked ? (
                      <Icon
                        className="w-5 h-5"
                        style={{
                          color: isCurrent
                            ? "var(--turquoise)"
                            : "var(--seafoam)",
                        }}
                      />
                    ) : (
                      <Lock
                        className="w-4 h-4 animate-pulse"
                        style={{ color: "var(--seafoam)", opacity: 0.5 }}
                      />
                    )}
                  </div>

                  {/* Zone Label */}
                  <span
                    className={cn(
                      "font-body text-sm font-medium",
                      isUnlocked ? "opacity-100" : "opacity-50",
                    )}
                    style={{
                      color: isCurrent ? "var(--turquoise)" : "var(--sand)",
                    }}
                  >
                    {zone.label}
                  </span>

                  {/* Depth Label */}
                  <span
                    className="font-body text-xs mt-1"
                    style={{ color: "var(--seafoam)", opacity: 0.6 }}
                  >
                    {zone.depth}
                  </span>

                  {/* Zone divider line */}
                  {index < depthZones.length - 1 && (
                    <div
                      className="absolute right-0 top-4 bottom-4 w-px"
                      style={{ background: "rgba(255, 255, 255, 0.05)" }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Diver Position Indicator */}
          <div
            className="absolute top-1/2 -translate-y-1/2 transition-all duration-1000"
            style={{
              left: `calc(${diverPosition}% - 16px)`,
              transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
            }}
          >
            <div className="relative">
              {/* Glow effect */}
              <div
                className="absolute inset-0 rounded-full animate-pulse"
                style={{
                  background: "var(--turquoise)",
                  filter: "blur(8px)",
                  opacity: 0.5,
                }}
              />
              {/* Diver icon */}
              <DiverIcon
                className="w-8 h-8 relative z-10"
                style={{ color: "var(--turquoise)" }}
              />
            </div>
          </div>
        </div>

        {/* Progress Bar at Bottom */}
        <div
          className="h-1 w-full"
          style={{ background: "rgba(255, 255, 255, 0.05)" }}
        >
          <div
            className="h-full transition-all duration-1000"
            style={{
              width: `${Math.min((wordCount / 1000) * 100, 100)}%`,
              background:
                "linear-gradient(90deg, var(--surface-teal), var(--turquoise))",
              transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default DepthChart;
