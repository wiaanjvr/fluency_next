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
// Session Hero Card — Intelligent "Next Activity" recommendation
// Consumes useNextActivity() and renders the recommendation with ocean theming.
// Preserves all existing caustic / ocean-card animations.
// ============================================================================

interface SessionHeroProps {
  depthName: string;
  wordsAbsorbed: number;
  sessionPath: string;
  onDiveClick?: () => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Activity icon + label mapping
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Urgency-driven glow style
// ---------------------------------------------------------------------------
function getGlowStyle(urgency: number) {
  if (urgency >= 80) {
    return {
      boxShadow:
        "0 0 30px rgba(61, 214, 181, 0.25), inset 0 0 60px rgba(61, 214, 181, 0.06)",
      borderColor: "rgba(61, 214, 181, 0.35)",
    };
  }
  if (urgency >= 50) {
    return {
      boxShadow:
        "0 0 20px rgba(61, 214, 181, 0.15), inset 0 0 40px rgba(61, 214, 181, 0.04)",
      borderColor: "rgba(61, 214, 181, 0.2)",
    };
  }
  return {
    boxShadow:
      "0 0 12px rgba(61, 214, 181, 0.08), inset 0 0 30px rgba(61, 214, 181, 0.02)",
    borderColor: "rgba(61, 214, 181, 0.12)",
  };
}

// Generates a poetic depth prompt based on word count (fallback only)
function getDepthMessage(words: number): { heading: string; sub: string } {
  if (words === 0) {
    return {
      heading: "Begin your immersion",
      sub: "Listen. Echo. Let the language wash over you.",
    };
  }
  if (words < 50) {
    return {
      heading: "The first sounds",
      sub: "Words are taking shape beneath the surface.",
    };
  }
  if (words < 150) {
    return {
      heading: "Phrases are forming",
      sub: "Sentences begin to connect. Keep listening.",
    };
  }
  if (words < 300) {
    return {
      heading: "Stories await",
      sub: "Your vocabulary is deep enough for narratives.",
    };
  }
  if (words < 500) {
    return {
      heading: "The current carries you",
      sub: "Full stories, natural speed. You belong here.",
    };
  }
  return {
    heading: "Deep immersion",
    sub: "The language moves through you now.",
  };
}

export function NextLessonHero({
  depthName,
  wordsAbsorbed,
  sessionPath,
  onDiveClick,
  className,
}: SessionHeroProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [pillarsVisible, setPillarsVisible] = useState(false);
  const { recommendation, isLoading, error } = useNextActivity();
  const fallbackMessage = getDepthMessage(wordsAbsorbed);

  useEffect(() => {
    const timer = setTimeout(() => setPillarsVisible(true), 800);
    return () => clearTimeout(timer);
  }, []);

  // Determine what to show
  const hasRecommendation = !isLoading && !error && recommendation;
  const urgency = recommendation?.urgencyScore ?? 0;
  const glowStyle = hasRecommendation ? getGlowStyle(urgency) : getGlowStyle(0);

  // CTA destination
  const ctaHref = hasRecommendation ? recommendation.route : sessionPath;
  const ctaLabel = hasRecommendation ? "Dive in" : "Enter the water";

  const handleDiveClick = (e: React.MouseEvent) => {
    if (!hasRecommendation && onDiveClick) {
      e.preventDefault();
      onDiveClick();
    }
  };

  // Activity meta
  const activityInfo = hasRecommendation
    ? ACTIVITY_META[recommendation.activityType]
    : null;
  const ActivityIcon = activityInfo?.icon ?? BookOpen;

  return (
    <div
      className={cn(
        "ocean-card caustic-bg relative overflow-hidden w-full",
        "ocean-card-animate",
        "border border-solid",
        "transition-shadow duration-500",
        className,
      )}
      style={{
        background: `linear-gradient(135deg, rgba(13, 27, 42, 0.95) 0%, rgba(10, 15, 30, 0.9) 100%)`,
        minHeight: "320px",
        ...glowStyle,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Caustic light layer */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 70% 30%, rgba(30, 107, 114, 0.12) 0%, transparent 50%)`,
          animation: "caustic3 18s ease-in-out infinite",
        }}
      />

      {/* Content */}
      <div className="relative z-10 p-10 flex flex-col h-full min-h-[320px]">
        {/* Depth indicator */}
        <div className="flex items-center gap-2 mb-6">
          <div
            className="w-2 h-2 rounded-full"
            style={{
              background: "var(--turquoise)",
              boxShadow: "0 0 8px rgba(61, 214, 181, 0.4)",
            }}
          />
          <span
            className="font-body text-sm uppercase tracking-widest"
            style={{ color: "var(--seafoam)", opacity: 0.7 }}
          >
            {depthName}
          </span>
        </div>

        {/* ── Loading state ── */}
        {isLoading && (
          <>
            <div className="mb-3">
              <div
                className="h-10 w-3/4 rounded-lg animate-pulse"
                style={{ background: "rgba(255,255,255,0.06)" }}
              />
            </div>
            <div className="mb-8">
              <div
                className="h-5 w-1/2 rounded-md animate-pulse"
                style={{ background: "rgba(255,255,255,0.04)" }}
              />
            </div>
            <p
              className="font-body text-sm italic"
              style={{ color: "var(--seafoam)", opacity: 0.5 }}
            >
              Charting your course...
            </p>
          </>
        )}

        {/* ── Recommendation loaded state ── */}
        {hasRecommendation && (
          <>
            {/* Headline */}
            <h2
              className={cn(
                "font-display tracking-tight mb-3",
                urgency >= 80
                  ? "text-4xl md:text-5xl lg:text-6xl font-bold"
                  : "text-4xl md:text-5xl lg:text-6xl font-semibold",
              )}
              style={{
                color: urgency >= 80 ? "var(--sand)" : "var(--sand)",
              }}
            >
              {recommendation.headline}
            </h2>

            {/* Subtext */}
            <p
              className="font-body text-lg mb-6 max-w-md"
              style={{ color: "var(--seafoam)" }}
            >
              {recommendation.subtext}
            </p>

            {/* Activity info pills */}
            <div
              className={cn(
                "flex flex-wrap items-center gap-3 mb-10 transition-all duration-700",
                pillarsVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-2",
              )}
            >
              {/* Activity type pill */}
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                style={{ background: "rgba(61, 214, 181, 0.1)" }}
              >
                <ActivityIcon
                  className="w-4 h-4"
                  style={{ color: "var(--turquoise)" }}
                />
                <span
                  className="text-sm font-body font-medium"
                  style={{ color: "var(--sand)" }}
                >
                  {activityInfo?.label}
                </span>
              </div>

              {/* Estimated time pill */}
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                style={{ background: "rgba(255, 255, 255, 0.05)" }}
              >
                <Clock
                  className="w-3.5 h-3.5"
                  style={{ color: "var(--seafoam)", opacity: 0.7 }}
                />
                <span
                  className="text-sm font-body"
                  style={{ color: "var(--sand)", opacity: 0.7 }}
                >
                  ~{recommendation.estimatedMinutes} min
                </span>
              </div>

              {/* Item count pill */}
              {recommendation.itemCount && (
                <div
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                  style={{ background: "rgba(255, 255, 255, 0.05)" }}
                >
                  <span
                    className="text-sm font-body"
                    style={{ color: "var(--sand)", opacity: 0.7 }}
                  >
                    {recommendation.itemCount} items ready
                  </span>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Error / fallback state ── */}
        {!isLoading && (error || !recommendation) && (
          <>
            <h2
              className="font-display text-4xl md:text-5xl lg:text-6xl font-semibold mb-3 tracking-tight"
              style={{ color: "var(--sand)" }}
            >
              {fallbackMessage.heading}
            </h2>
            <p
              className="font-body text-lg mb-8 max-w-md"
              style={{ color: "var(--seafoam)" }}
            >
              {fallbackMessage.sub}
            </p>
          </>
        )}

        {/* Cold start wave animation (subtle) */}
        {hasRecommendation && recommendation.reason === "cold_start" && (
          <div
            className="absolute bottom-0 left-0 right-0 h-1 pointer-events-none"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(61, 214, 181, 0.3), transparent)",
              animation: "coldStartWave 3s ease-in-out infinite",
            }}
          />
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Dive In CTA */}
        <Link href={ctaHref} onClick={handleDiveClick}>
          <button
            className={cn(
              "ocean-cta px-8 py-4 text-lg font-semibold flex items-center gap-3 group",
              "transition-all duration-300",
              hasRecommendation && urgency >= 80 && "animate-gentle-pulse",
            )}
          >
            <span>{ctaLabel}</span>
            <ArrowRight
              className={cn(
                "w-5 h-5 transition-transform duration-300",
                isHovered ? "translate-x-1" : "",
              )}
            />
          </button>
        </Link>
      </div>

      {/* Decorative corner accent */}
      <div
        className="absolute top-6 right-6 w-24 h-24 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, rgba(61, 214, 181, 0.08) 0%, transparent 70%)`,
          filter: "blur(12px)",
        }}
      />

      {/* Keyframe styles for gentle pulse + cold start wave */}
      <style jsx>{`
        @keyframes gentle-pulse {
          0%,
          100% {
            box-shadow: 0 0 0 0 rgba(61, 214, 181, 0.3);
          }
          50% {
            box-shadow: 0 0 0 6px rgba(61, 214, 181, 0);
          }
        }
        .animate-gentle-pulse {
          animation: gentle-pulse 2.5s ease-in-out infinite;
        }
        @keyframes coldStartWave {
          0%,
          100% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}

export default NextLessonHero;
