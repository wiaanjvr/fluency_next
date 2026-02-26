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
        borderRadius: 20,
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
                borderRadius: 100,
                border: "1px solid var(--border-dim, rgba(255,255,255,0.07))",
                background: "rgba(255, 255, 255, 0.03)",
                fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: "0.08em",
                textTransform: "uppercase" as const,
                color: "var(--text-secondary, #6B9E96)",
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
                fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                fontSize: 10,
                color: "var(--text-ghost, #2D5A52)",
                letterSpacing: "0.04em",
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
                  fontSize: "clamp(1.6rem, 2.5vw, 2.2rem)",
                  fontWeight: 600,
                  color: "var(--text-primary, #F0FDFA)",
                  lineHeight: 1.15,
                  margin: 0,
                }}
              >
                {recommendation.headline}
              </h2>
              <p
                style={{
                  fontFamily: "var(--font-inter, 'Inter', sans-serif)",
                  fontSize: 16,
                  color: "var(--text-secondary, #7BA8A0)",
                  margin: 0,
                  maxWidth: 400,
                  lineHeight: 1.5,
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
                  fontSize: "clamp(1.6rem, 2.5vw, 2.4rem)",
                  fontWeight: 300,
                  color: "var(--text-primary, #F0FDFA)",
                  lineHeight: 1.15,
                  margin: 0,
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-inter, 'Inter', sans-serif)",
                    fontWeight: 300,
                  }}
                >
                  {fallbackMessage.heading}{" "}
                </span>
                {fallbackMessage.headingEmphasis && (
                  <em
                    style={{
                      fontFamily:
                        "var(--font-editorial, 'Cormorant Garamond', serif)",
                      fontWeight: 500,
                      fontStyle: "italic",
                      color: "var(--text-primary, #F0FDFA)",
                    }}
                  >
                    {fallbackMessage.headingEmphasis}
                  </em>
                )}
              </h2>
              <p
                style={{
                  fontFamily: "var(--font-inter, 'Inter', sans-serif)",
                  fontSize: 16,
                  fontWeight: 300,
                  color: "var(--text-secondary, #7BA8A0)",
                  margin: 0,
                  maxWidth: 400,
                  lineHeight: 1.6,
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
                  gap: 4,
                  padding: "4px 10px",
                  borderRadius: 100,
                  background: "rgba(4, 24, 36, 0.7)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                  fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                  fontSize: 11,
                  color: "var(--text-secondary, #7BA8A0)",
                }}
              >
                <ActivityIcon
                  className="w-3.5 h-3.5"
                  style={{ color: "var(--text-muted, #2E5C54)" }}
                />
                <span>{activityInfo?.label || "Flashcards"}</span>
              </div>

              {/* Time chip */}
              <div
                className="meta-chip"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "4px 10px",
                  borderRadius: 100,
                  background: "rgba(4, 24, 36, 0.7)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                  fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                  fontSize: 11,
                  color: "var(--text-secondary, #7BA8A0)",
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
                  className={cn(
                    "dive-cta dive-cta-pulse",
                    "relative flex items-center gap-2",
                  )}
                  style={{
                    padding: "12px 28px",
                    borderRadius: 100,
                    border: "none",
                    cursor: "pointer",
                    background: "var(--teal-surface, #0D9488)",
                    color: "#020F14",
                    fontFamily: "var(--font-inter, 'Inter', sans-serif)",
                    fontSize: 15,
                    fontWeight: 600,
                    boxShadow: isHovered
                      ? "0 0 40px rgba(13, 148, 136, 0.4)"
                      : "0 0 24px rgba(13, 148, 136, 0.25)",
                    transition: "all 300ms cubic-bezier(0.4, 0, 0.2, 1)",
                    transform: isHovered ? "translateY(-1px)" : "translateY(0)",
                  }}
                >
                  <span>Dive in</span>
                  <ArrowRight className="w-4 h-4" />
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
                stroke="rgba(13, 148, 136, 0.12)"
                strokeWidth="1"
              />
              <circle
                className="sonar-ring"
                cx="80"
                cy="80"
                r="60"
                fill="none"
                stroke="rgba(13, 148, 136, 0.08)"
                strokeWidth="1"
              />
              <circle
                className="sonar-ring"
                cx="80"
                cy="80"
                r="60"
                fill="none"
                stroke="rgba(13, 148, 136, 0.05)"
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
                stroke="rgba(255, 255, 255, 0.06)"
                strokeWidth="3"
              />
              {/* Progress arc */}
              <circle
                cx="80"
                cy="80"
                r="60"
                fill="none"
                stroke="var(--teal-dim, rgba(13, 148, 136, 0.5))"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 60}
                strokeDashoffset={
                  2 * Math.PI * 60 - (zoneProgress / 100) * 2 * Math.PI * 60
                }
                style={{
                  transition:
                    "stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)",
                  filter: "drop-shadow(0 0 4px rgba(13, 148, 136, 0.3))",
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
                  fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                  fontSize: 32,
                  fontWeight: 500,
                  color: "var(--text-primary, #F0FDFA)",
                  lineHeight: 1,
                }}
              >
                {depthMeters}m
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                  fontSize: 8,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase" as const,
                  color: "var(--text-ghost, #2D5A52)",
                  marginTop: 4,
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
                fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                fontSize: 8,
                letterSpacing: "0.15em",
                color: "var(--text-ghost, #1A3832)",
                textTransform: "uppercase" as const,
              }}
            >
              TODAY&apos;S WORDS
            </span>
            <div className="flex flex-wrap gap-2 justify-center">
              {["lumière", "mer", "vague"].map((word, i) => (
                <span
                  key={word}
                  className="floating-chip"
                  style={{
                    display: "inline-block",
                    padding: "5px 14px",
                    borderRadius: 20,
                    background: "rgba(255, 255, 255, 0.04)",
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    boxShadow:
                      "0 2px 12px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.06)",
                    fontFamily:
                      "var(--font-display, 'Playfair Display', serif)",
                    fontSize: 13,
                    fontStyle: "italic",
                    color: "var(--text-secondary, #6B9E96)",
                    letterSpacing: "0.03em",
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
