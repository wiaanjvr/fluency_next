"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// Depth Chart - Vertical Ocean Depth Gauge
// Zones stack top-to-bottom: Shallows → Sunlit → Twilight → Deep → Abyss.
// Diver descends as wordCount increases. Depth increases downward.
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
    name: "Shallows",
    range: [0, 50] as [number, number],
    description: "First words",
    depthLabel: "0 – 50 words",
    segmentGradient: "linear-gradient(180deg, #1a6b6b, #105050)",
  },
  {
    id: 1,
    name: "Sunlit Zone",
    range: [50, 500] as [number, number],
    description: "Core vocabulary forming",
    depthLabel: "50 – 500 words",
    segmentGradient: "linear-gradient(180deg, #105050, #0a3a4a)",
  },
  {
    id: 2,
    name: "Twilight Zone",
    range: [500, 2000] as [number, number],
    description: "Patterns emerging",
    depthLabel: "500 – 2 000 words",
    segmentGradient: "linear-gradient(180deg, #0a3a4a, #06253a)",
  },
  {
    id: 3,
    name: "The Deep",
    range: [2000, 5000] as [number, number],
    description: "Fluent expression",
    depthLabel: "2 000 – 5 000 words",
    segmentGradient: "linear-gradient(180deg, #06253a, #031525)",
  },
  {
    id: 4,
    name: "The Abyss",
    range: [5000, Infinity] as [number, number],
    description: "True immersion",
    depthLabel: "5 000+ words",
    segmentGradient: "linear-gradient(180deg, #031525, #010810)",
  },
] as const;

const TOTAL_ZONES = ZONES.length;

/** Returns a 0..1 fraction from the top of the track */
function getDiverTopFraction(wordCount: number): number {
  let activeZone = 0;
  for (let i = ZONES.length - 1; i >= 0; i--) {
    if (wordCount >= ZONES[i].range[0]) {
      activeZone = i;
      break;
    }
  }
  const zone = ZONES[activeZone];
  const zoneMin = zone.range[0];
  const zoneMax = zone.range[1] === Infinity ? zoneMin + 1000 : zone.range[1];
  const localProgress = Math.min(
    (wordCount - zoneMin) / (zoneMax - zoneMin),
    1,
  );
  return activeZone / TOTAL_ZONES + localProgress / TOTAL_ZONES;
}

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
  const [animatedTopFraction, setAnimatedTopFraction] = useState(0);
  const activeZoneIndex = getActiveZoneIndex(wordCount);
  const targetTopFraction = getDiverTopFraction(wordCount);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedTopFraction(targetTopFraction);
    }, 300);
    return () => clearTimeout(timer);
  }, [targetTopFraction]);

  const timeLabel =
    totalMinutes >= 60
      ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`
      : `${totalMinutes} min`;

  return (
    <div className={cn("w-full", className)}>
      {/* Keyframes injected once alongside the component */}
      <style>{`
        @keyframes depth-diver-pulse {
          0%, 100% {
            box-shadow:
              0 0 0 3px rgba(0,229,204,0.2),
              0 0 12px rgba(0,229,204,0.6),
              0 0 24px rgba(0,229,204,0.3);
          }
          50% {
            box-shadow:
              0 0 0 5px rgba(0,229,204,0.15),
              0 0 20px rgba(0,229,204,0.8),
              0 0 40px rgba(0,229,204,0.4);
          }
        }
        @keyframes depth-bubble-rise {
          0%   { opacity: 0.7; transform: translateY(0) translateX(0); }
          100% { opacity: 0;   transform: translateY(-28px) translateX(3px); }
        }
        .depth-diver-dot {
          animation: depth-diver-pulse 2.4s ease-in-out infinite;
        }
        .depth-bubble-1 { animation: depth-bubble-rise 3s ease-in infinite; animation-delay: 0s; }
        .depth-bubble-2 { animation: depth-bubble-rise 3s ease-in infinite; animation-delay: 0.4s; }
        .depth-bubble-3 { animation: depth-bubble-rise 3s ease-in infinite; animation-delay: 0.8s; }
        .depth-bubble-4 { animation: depth-bubble-rise 3s ease-in infinite; animation-delay: 1.2s; }
        @keyframes current-shimmer {
          0%   { transform: translateY(calc(100% + 4rem)); }
          100% { transform: translateY(-4rem); }
        }
        @keyframes bio-particle {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.45; }
          33%       { transform: translate(3px, -6px) scale(1.3); opacity: 0.9; }
          66%       { transform: translate(-2px, -3px) scale(0.8); opacity: 0.7; }
        }
        .bio-particle-a { animation: bio-particle 3.8s ease-in-out infinite; animation-delay: 0s; }
        .bio-particle-b { animation: bio-particle 3.8s ease-in-out infinite; animation-delay: 1.3s; }
        .bio-particle-c { animation: bio-particle 3.8s ease-in-out infinite; animation-delay: 2.6s; }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3
          className="font-display text-3xl font-semibold"
          style={{ color: "var(--sand)" }}
        >
          Your Depth
        </h3>
      </div>

      {/* Gauge */}
      <div>
        <div className="flex gap-3 items-stretch">
          {/* ── Vertical track ─────────────────────────── */}
          <div
            className="relative flex flex-col flex-shrink-0"
            style={{ width: 44 }}
          >
            {/* Zone segments */}
            {ZONES.map((zone) => (
              <div
                key={zone.id}
                className="relative"
                style={{ flex: 1, minHeight: 52 }}
              >
                <div
                  className="absolute inset-[1px] rounded-[6px]"
                  style={{
                    background: zone.segmentGradient,
                    opacity: 0.35,
                  }}
                />
              </div>
            ))}

            {/* Connector line running the length of the track */}
            <div
              className="absolute left-1/2 -translate-x-1/2 w-[2px] rounded-[1px] overflow-hidden"
              style={{
                top: 8,
                bottom: 8,
                background:
                  "linear-gradient(180deg, rgba(0,200,180,0.4) 0%, rgba(0,120,140,0.22) 40%, rgba(0,60,100,0.12) 80%, rgba(0,20,60,0.06) 100%)",
                zIndex: 0,
              }}
            >
              {/* Animated current — bright pulse flowing upward */}
              <div
                className="absolute inset-x-0"
                style={{
                  height: "4rem",
                  background:
                    "linear-gradient(180deg, transparent 0%, rgba(0,229,204,0.75) 50%, transparent 100%)",
                  animation: "current-shimmer 5s linear infinite",
                }}
              />
            </div>

            {/* Diver dot + bubble trail */}
            <div
              className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center transition-all duration-[2000ms]"
              style={{
                top: `calc(${animatedTopFraction * 100}% - 7px)`,
                transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
                zIndex: 10,
              }}
            >
              {/* Glowing teal dot */}
              <div
                className="depth-diver-dot rounded-full"
                style={{
                  width: 18,
                  height: 18,
                  background: "#00e5cc",
                  boxShadow:
                    "0 0 0 4px rgba(0,229,204,0.18), 0 0 16px rgba(0,229,204,0.7), 0 0 36px rgba(0,229,204,0.35)",
                }}
              />
              {/* Bubble trail (4 divs animating upward) */}
              <div className="flex flex-col items-center gap-1 mt-1">
                <div
                  className="depth-bubble-1 rounded-full"
                  style={{
                    width: 7,
                    height: 7,
                    background: "rgba(0,229,204,0.35)",
                  }}
                />
                <div
                  className="depth-bubble-2 rounded-full"
                  style={{
                    width: 5,
                    height: 5,
                    background: "rgba(0,229,204,0.35)",
                  }}
                />
                <div
                  className="depth-bubble-3 rounded-full"
                  style={{
                    width: 6,
                    height: 6,
                    background: "rgba(0,229,204,0.35)",
                  }}
                />
                <div
                  className="depth-bubble-4 rounded-full"
                  style={{
                    width: 4,
                    height: 4,
                    background: "rgba(0,229,204,0.35)",
                  }}
                />
              </div>
            </div>
          </div>

          {/* ── Zone labels ────────────────────────────── */}
          <div className="flex flex-col flex-1">
            {ZONES.map((zone, i) => {
              const isActive = i === activeZoneIndex;
              // Pressure-based opacity: zones below active = increasing deep darkness
              // Zones above active = already surfaced, gently faded
              const distBelow = i > activeZoneIndex ? i - activeZoneIndex : 0;
              const distAbove = i < activeZoneIndex ? activeZoneIndex - i : 0;
              const pressureOpacity = isActive
                ? 1
                : distBelow > 0
                  ? Math.max(0.05, 0.22 - distBelow * 0.06)
                  : Math.max(0.2, 0.42 - distAbove * 0.12);
              return (
                <div
                  key={zone.id}
                  className="relative flex flex-col justify-center"
                  style={{
                    flex: 1,
                    minHeight: 52,
                    paddingTop: 6,
                    paddingBottom: 6,
                    paddingLeft: 12,
                    opacity: pressureOpacity,
                    borderLeft: isActive
                      ? "2px solid rgba(0,229,204,0.55)"
                      : "1px solid rgba(255,255,255,0.04)",
                    background: isActive
                      ? "rgba(0,229,204,0.04)"
                      : "transparent",
                    transition:
                      "opacity 0.5s ease, background 0.4s ease, border-color 0.4s ease",
                  }}
                >
                  {/* Bioluminescent particles — active zone only */}
                  {isActive && (
                    <>
                      <div
                        className="bio-particle-a absolute rounded-full pointer-events-none"
                        style={{
                          right: 8,
                          top: "25%",
                          width: 4,
                          height: 4,
                          background: "rgba(0,229,204,0.85)",
                          boxShadow: "0 0 6px 2px rgba(0,229,204,0.5)",
                        }}
                      />
                      <div
                        className="bio-particle-b absolute rounded-full pointer-events-none"
                        style={{
                          right: 20,
                          top: "52%",
                          width: 5,
                          height: 5,
                          background: "rgba(61,214,181,0.7)",
                          boxShadow: "0 0 8px 2px rgba(61,214,181,0.45)",
                        }}
                      />
                      <div
                        className="bio-particle-c absolute rounded-full pointer-events-none"
                        style={{
                          right: 6,
                          bottom: "22%",
                          width: 3,
                          height: 3,
                          background: "rgba(0,229,204,0.9)",
                          boxShadow: "0 0 5px 2px rgba(0,229,204,0.6)",
                        }}
                      />
                    </>
                  )}
                  <div
                    className="text-[16px] font-semibold uppercase tracking-widest transition-colors duration-300"
                    style={{
                      color: isActive ? "#00e5cc" : "rgba(255,255,255,0.85)",
                    }}
                  >
                    {zone.name}
                  </div>
                  <div
                    className="text-[14px] mt-0.5 transition-colors duration-300"
                    style={{
                      fontFamily: "var(--font-mono, 'DM Mono', monospace)",
                      color: isActive
                        ? "rgba(0,229,204,0.55)"
                        : "rgba(255,255,255,0.5)",
                    }}
                  >
                    {zone.depthLabel}
                  </div>
                  <div
                    className="text-[14px] mt-0.5 italic leading-snug transition-colors duration-300"
                    style={{
                      color: isActive
                        ? "rgba(255,255,255,0.35)"
                        : "rgba(255,255,255,0.4)",
                    }}
                  >
                    {zone.description}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Stats row ──────────────────────────────── */}
        <div
          className="mt-5 pt-4"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
        >
          {wordCount === 0 && totalMinutes === 0 ? (
            /* New diver — reframe instead of showing discouraging zeros */
            <div className="flex flex-col gap-1.5">
              <span
                className="font-display text-base italic"
                style={{ color: "var(--seafoam)", opacity: 0.8 }}
              >
                Your dive begins now
              </span>
              <span
                className="text-[12px] font-body uppercase tracking-widest"
                style={{ color: "rgba(255,255,255,0.22)" }}
              >
                First session awaits ↓
              </span>
            </div>
          ) : (
            /* Returning diver — show real stats */
            <div className="flex">
              <div
                className="flex-1 flex flex-col gap-0.5"
                style={{
                  paddingLeft: 0,
                  paddingRight: 12,
                  borderRight: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <span
                  className="tabular-nums leading-none"
                  style={{
                    fontFamily: "var(--font-mono, 'DM Mono', monospace)",
                    fontSize: 24,
                    color: "#fff",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {wordCount}
                </span>
                <span
                  className="text-[13px] font-semibold uppercase tracking-widest"
                  style={{ color: "rgba(255,255,255,0.25)" }}
                >
                  Words
                </span>
              </div>
              <div
                className="flex-1 flex flex-col gap-0.5"
                style={{
                  paddingLeft: 12,
                  paddingRight: 12,
                }}
              >
                <span
                  className="tabular-nums leading-none"
                  style={{
                    fontFamily: "var(--font-mono, 'DM Mono', monospace)",
                    fontSize: 24,
                    color: "#fff",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {timeLabel}
                </span>
                <span
                  className="text-[13px] font-semibold uppercase tracking-widest"
                  style={{ color: "rgba(255,255,255,0.25)" }}
                >
                  Immersed
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DepthChart;
