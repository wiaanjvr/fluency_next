"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  BookOpen,
  Layers,
  GitBranch,
  Mic,
  MessageCircle,
  Compass,
  PenLine,
  Clock,
} from "lucide-react";
import { useNextActivity } from "@/hooks/useNextActivity";
import type { ActivityRecommendation } from "@/lib/recommendation/nextActivityEngine";

// ============================================================================
// Hero Dive Card — Full-width ocean depth instrument
// Layered gradient background with caustic shimmer, depth gauge, floating chips
// ============================================================================

interface SessionHeroProps {
  depthName: string;
  wordsAbsorbed: number;
  sessionPath: string;
  onDiveClick?: () => void;
  className?: string;
  divesRemaining?: number;
}

const ACTIVITY_META: Record<
  ActivityRecommendation["activityType"],
  { icon: React.ElementType; label: string }
> = {
  reading: { icon: BookOpen, label: "Free Reading" },
  cloze: { icon: PenLine, label: "Cloze Activities" },
  flashcards: { icon: Layers, label: "Flashcards" },
  conjugation: { icon: GitBranch, label: "Conjugation Drills" },
  pronunciation: { icon: Mic, label: "Pronunciation" },
  grammar: { icon: Compass, label: "Grammar" },
  conversation: { icon: MessageCircle, label: "Live Conversation" },
};

function getDepthMessage(words: number): {
  heading: string;
  headingEmphasis?: string;
  sub: string;
} {
  if (words === 0) {
    return {
      heading: "Let\u2019s find your",
      headingEmphasis: "depth",
      sub: "Listen. Echo. Let the language wash over you.",
    };
  }
  if (words < 50) {
    return {
      heading: "Let\u2019s find your",
      headingEmphasis: "depth",
      sub: "Words are taking shape beneath the surface.",
    };
  }
  if (words < 150) {
    return {
      heading: "Phrases are",
      headingEmphasis: "forming",
      sub: "Sentences begin to connect. Keep listening.",
    };
  }
  if (words < 300) {
    return {
      heading: "Stories",
      headingEmphasis: "await",
      sub: "Your vocabulary is deep enough for narratives.",
    };
  }
  if (words < 500) {
    return {
      heading: "The current",
      headingEmphasis: "carries you",
      sub: "Full stories, natural speed. You belong here.",
    };
  }
  return {
    heading: "Deep",
    headingEmphasis: "immersion",
    sub: "The language moves through you now.",
  };
}

function getDepthMeters(words: number): number {
  if (words >= 5000) return 200;
  if (words >= 2000) return 100 + Math.round(((words - 2000) / 3000) * 100);
  if (words >= 500) return 50 + Math.round(((words - 500) / 1500) * 50);
  if (words >= 50) return 10 + Math.round(((words - 50) / 450) * 40);
  return Math.round((words / 50) * 10);
}

function getZoneProgress(words: number): number {
  if (words >= 5000) return Math.min(100, ((words - 5000) / 5000) * 100);
  if (words >= 2000) return ((words - 2000) / 3000) * 100;
  if (words >= 500) return ((words - 500) / 1500) * 100;
  if (words >= 50) return ((words - 50) / 450) * 100;
  return (words / 50) * 100;
}

export function NextLessonHero({
  depthName,
  wordsAbsorbed,
  sessionPath,
  onDiveClick,
  className,
  divesRemaining = 5,
}: SessionHeroProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isButtonHovered, setIsButtonHovered] = useState(false);
  const [isButtonPressed, setIsButtonPressed] = useState(false);
  const [pillarsVisible, setPillarsVisible] = useState(false);
  const { recommendation, isLoading, error } = useNextActivity();
  const fallbackMessage = getDepthMessage(wordsAbsorbed);

  useEffect(() => {
    const timer = setTimeout(() => setPillarsVisible(true), 400);
    return () => clearTimeout(timer);
  }, []);

  const hasRecommendation = !isLoading && !error && recommendation;
  const ctaHref = hasRecommendation ? recommendation.route : sessionPath;
  const ctaLabel = hasRecommendation ? "Dive in →" : "Dive in →";

  const handleDiveClick = (e: React.MouseEvent) => {
    if (!hasRecommendation && onDiveClick) {
      e.preventDefault();
      onDiveClick();
    }
  };

  const activityInfo = hasRecommendation
    ? ACTIVITY_META[recommendation.activityType]
    : null;
  const ActivityIcon = activityInfo?.icon ?? Layers;

  const depthMeters = getDepthMeters(wordsAbsorbed);
  const zoneProgress = getZoneProgress(wordsAbsorbed);

  return (
    <div
      className={cn(
        "hero-dive-card relative overflow-hidden w-full",
        className,
      )}
      style={{
        minHeight: 220,
        borderRadius: 16,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Caustic shimmer overlay */}
      <div className="caustic-shimmer absolute inset-0 pointer-events-none overflow-hidden" />

      {/* Content */}
      <div className="relative z-10 p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center gap-6 h-full min-h-[220px]">
        {/* Left content */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Dives remaining — top right of card on md+ */}
          <div className="flex items-center justify-between">
            {/* Zone badge pill */}
            <div
              className="zone-badge"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 12px",
                borderRadius: 6,
                border: "1px solid var(--teal-border, rgba(0,212,170,0.18))",
                background: "var(--ocean-depth-3, #132638)",
                fontFamily: "var(--font-inter, 'Inter', sans-serif)",
                fontSize: "var(--text-label-size, 11px)",
                fontWeight: 600,
                letterSpacing: "var(--text-label-ls, 0.08em)",
                textTransform: "uppercase" as const,
                color: "var(--text-secondary, #94a3b8)",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "var(--text-muted, #2E5C54)",
                  display: "inline-block",
                }}
              />
              {depthName}
            </div>

            {/* Dives remaining indicator */}
            <div
              className="hidden md:flex items-center gap-1.5"
              style={{
                fontFamily: "var(--font-inter, 'Inter', sans-serif)",
                fontSize: 12,
                fontWeight: 500,
                color: "var(--text-muted, #4a6580)",
              }}
            >
              {Array.from({ length: 5 }, (_, i) => (
                <span
                  key={i}
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    display: "inline-block",
                    background:
                      i < divesRemaining
                        ? "var(--text-muted, #2E5C54)"
                        : "var(--text-ghost, #1A3832)",
                  }}
                />
              ))}
              <span style={{ marginLeft: 4 }}>
                {divesRemaining} dives remaining
              </span>
            </div>
          </div>

          {/* Loading state */}
          {isLoading && (
            <>
              <div className="h-10 w-3/4 rounded-lg skeleton-shimmer" />
              <div className="h-5 w-1/2 rounded-md skeleton-shimmer" />
            </>
          )}

          {/* Recommendation loaded */}
          {hasRecommendation && (
            <>
              <h2
                style={{
                  fontFamily: "var(--font-inter, 'Inter', sans-serif)",
                  fontSize: 28,
                  fontWeight: 700,
                  lineHeight: 1.2,
                  color: "var(--text-primary, #e2e8f0)",
                  margin: 0,
                }}
              >
                {recommendation.headline}
              </h2>
              <p
                style={{
                  fontFamily: "var(--font-inter, 'Inter', sans-serif)",
                  fontSize: 14,
                  fontWeight: 400,
                  lineHeight: 1.6,
                  color: "var(--text-secondary, #94a3b8)",
                  margin: 0,
                  maxWidth: 420,
                }}
              >
                {recommendation.subtext}
              </p>
            </>
          )}

          {/* Fallback state — editorial typography with italic serif emphasis */}
          {!isLoading && (error || !recommendation) && (
            <>
              <h2
                style={{
                  fontFamily: "var(--font-inter, 'Inter', sans-serif)",
                  fontSize: 28,
                  fontWeight: 700,
                  lineHeight: 1.2,
                  color: "var(--text-primary, #e2e8f0)",
                  margin: 0,
                }}
              >
                {fallbackMessage.heading}{" "}
                {fallbackMessage.headingEmphasis && (
                  <span style={{ color: "var(--ocean-teal-primary, #00d4aa)" }}>
                    {fallbackMessage.headingEmphasis}
                  </span>
                )}
              </h2>
              <p
                style={{
                  fontFamily: "var(--font-inter, 'Inter', sans-serif)",
                  fontSize: 14,
                  fontWeight: 400,
                  lineHeight: 1.6,
                  color: "var(--text-secondary, #94a3b8)",
                  margin: 0,
                  maxWidth: 420,
                }}
              >
                {fallbackMessage.sub}
              </p>
            </>
          )}

          {/* Meta chips row */}
          {!isLoading && (
            <div
              className={cn(
                "flex flex-wrap items-center gap-2 transition-all duration-500",
                pillarsVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-2",
              )}
            >
              {/* Activity type chip */}
              <div
                className="meta-chip"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 14px",
                  borderRadius: 100,
                  background: "var(--ocean-depth-3, #132638)",
                  border: "1px solid var(--teal-border, rgba(0,212,170,0.18))",
                  fontFamily: "var(--font-inter, 'Inter', sans-serif)",
                  fontSize: 13,
                  color: "var(--text-secondary, #94a3b8)",
                }}
              >
                <ActivityIcon
                  className="w-3.5 h-3.5"
                  style={{ color: "var(--ocean-teal-primary, #00d4aa)" }}
                />
                <span>{activityInfo?.label || "Flashcards"}</span>
              </div>

              {/* Time chip */}
              <div
                className="meta-chip"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 14px",
                  borderRadius: 100,
                  background: "var(--ocean-depth-3, #132638)",
                  border: "1px solid var(--teal-border, rgba(0,212,170,0.18))",
                  fontFamily: "var(--font-inter, 'Inter', sans-serif)",
                  fontSize: 13,
                  color: "var(--text-secondary, #94a3b8)",
                }}
              >
                <Clock className="w-3 h-3" style={{ opacity: 0.6 }} />
                <span>
                  ~{hasRecommendation ? recommendation.estimatedMinutes : 5} min
                </span>
              </div>
            </div>
          )}

          {/* CTA button */}
          {!isLoading && (
            <div className="mt-2">
              <Link href={ctaHref} onClick={handleDiveClick}>
                <button
                  className={cn("dive-cta", "relative flex items-center gap-2")}
                  onMouseEnter={() => setIsButtonHovered(true)}
                  onMouseLeave={() => {
                    setIsButtonHovered(false);
                    setIsButtonPressed(false);
                  }}
                  onMouseDown={() => setIsButtonPressed(true)}
                  onMouseUp={() => setIsButtonPressed(false)}
                  style={{
                    padding: "12px 28px",
                    borderRadius: 8,
                    border: "none",
                    cursor: "pointer",
                    background: isButtonHovered
                      ? "var(--ocean-teal-secondary, #2dd4bf)"
                      : "var(--ocean-teal-primary, #00d4aa)",
                    color: "#070f1a",
                    fontFamily: "var(--font-inter, 'Inter', sans-serif)",
                    fontSize: 15,
                    fontWeight: 600,
                    boxShadow: isButtonPressed
                      ? "0 2px 8px rgba(0, 212, 170, 0.15)"
                      : isButtonHovered
                        ? "0 8px 24px rgba(0, 212, 170, 0.3)"
                        : "none",
                    transition: "all 0.2s ease",
                    transform: isButtonPressed
                      ? "translateY(0)"
                      : isButtonHovered
                        ? "translateY(-2px)"
                        : "translateY(0)",
                  }}
                >
                  <span>Dive in</span>
                  <ArrowRight
                    className="w-4 h-4"
                    style={{
                      transition: "transform 0.2s ease",
                      transform: isButtonHovered
                        ? "translateX(3px)"
                        : "translateX(0)",
                    }}
                  />
                </button>
              </Link>
            </div>
          )}
        </div>

        {/* Right content — Depth gauge circle + floating word chips */}
        <div className="hidden md:flex flex-col items-center gap-5 relative">
          {/* Circular depth gauge with sonar rings */}
          <div
            className="depth-gauge-pulse"
            style={{
              position: "relative",
              width: 160,
              height: 160,
              flexShrink: 0,
            }}
          >
            <svg
              width="160"
              height="160"
              viewBox="0 0 160 160"
              style={{ transform: "rotate(-90deg)" }}
            >
              {/* Sonar ping rings */}
              <circle
                className="sonar-ring"
                cx="80"
                cy="80"
                r="60"
                fill="none"
                stroke="rgba(0, 212, 170, 0.12)"
                strokeWidth="1"
              />
              <circle
                className="sonar-ring"
                cx="80"
                cy="80"
                r="60"
                fill="none"
                stroke="rgba(0, 212, 170, 0.08)"
                strokeWidth="1"
              />
              <circle
                className="sonar-ring"
                cx="80"
                cy="80"
                r="60"
                fill="none"
                stroke="rgba(0, 212, 170, 0.05)"
                strokeWidth="1"
              />
              {/* Outer concentric ring */}
              <circle
                cx="80"
                cy="80"
                r="68"
                fill="none"
                stroke="rgba(255, 255, 255, 0.03)"
                strokeWidth="1"
              />
              {/* Main track ring */}
              <circle
                cx="80"
                cy="80"
                r="60"
                fill="none"
                stroke="rgba(74, 127, 165, 0.2)"
                strokeWidth="3"
              />
              {/* Progress arc */}
              <circle
                cx="80"
                cy="80"
                r="60"
                fill="none"
                stroke="var(--ocean-teal-primary, #00d4aa)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 60}
                strokeDashoffset={
                  2 * Math.PI * 60 - (zoneProgress / 100) * 2 * Math.PI * 60
                }
                style={{
                  transition:
                    "stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)",
                  filter: "drop-shadow(0 0 4px rgba(0, 212, 170, 0.3))",
                }}
              />
              {/* Inner subtle ring */}
              <circle
                cx="80"
                cy="80"
                r="52"
                fill="none"
                stroke="rgba(255, 255, 255, 0.03)"
                strokeWidth="1"
              />
            </svg>
            {/* Center text */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-inter, 'Inter', sans-serif)",
                  fontSize: 34,
                  fontWeight: 700,
                  color: "var(--text-primary, #e2e8f0)",
                  lineHeight: 1,
                }}
              >
                {depthMeters}m
              </span>
              <span
                style={{
                  fontFamily: "var(--font-inter, 'Inter', sans-serif)",
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase" as const,
                  color: "var(--text-muted, #4a6580)",
                  marginTop: 6,
                }}
              >
                DEPTH
              </span>
            </div>
          </div>

          {/* Floating word chips with glass-morphism */}
          <div className="flex flex-col items-center gap-2">
            <span
              style={{
                fontFamily: "var(--font-inter, 'Inter', sans-serif)",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase" as const,
                color: "var(--text-muted, #4a6580)",
              }}
            >
              Words you&apos;ll meet
            </span>
            <div className="flex flex-wrap gap-2 justify-center">
              {["lumière", "mer", "vague"].map((word, i) => (
                <span
                  key={word}
                  className="floating-chip"
                  style={{
                    display: "inline-block",
                    padding: "6px 14px",
                    borderRadius: 100,
                    background: "var(--ocean-depth-3, #132638)",
                    border:
                      "1px solid var(--teal-border, rgba(0,212,170,0.18))",
                    fontFamily: "var(--font-inter, 'Inter', sans-serif)",
                    fontSize: 13,
                    fontStyle: "italic",
                    color: "var(--text-secondary, #94a3b8)",
                    animation: `chipFloat ${4 + i * 0.5}s ease-in-out ${i * 0.8}s infinite`,
                  }}
                >
                  {word}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Keyframes */}
      <style jsx>{`
        @keyframes chipFloat {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-5px);
          }
        }
        .depth-gauge-pulse {
          animation: depthBreathe 6s ease-in-out infinite;
        }
        @keyframes depthBreathe {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.015);
          }
        }
        .sonar-ring:nth-child(1) {
          animation: sonarExpand 4s ease-out 0s infinite;
        }
        .sonar-ring:nth-child(2) {
          animation: sonarExpand 4s ease-out 1.3s infinite;
        }
        .sonar-ring:nth-child(3) {
          animation: sonarExpand 4s ease-out 2.6s infinite;
        }
        @keyframes sonarExpand {
          0% {
            r: 60;
            opacity: 0.15;
          }
          100% {
            r: 78;
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

export default NextLessonHero;
