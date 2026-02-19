"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ArrowRight, Headphones, BookOpen, Mic } from "lucide-react";

// ============================================================================
// Session Hero Card - The single entry point to immersion
// No modes. No lesson types. Just "Enter the water."
// ============================================================================

interface SessionHeroProps {
  depthName: string;
  wordsAbsorbed: number;
  sessionPath: string;
  onDiveClick?: () => void;
  className?: string;
}

// Generates a poetic depth prompt based on word count
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
  const message = getDepthMessage(wordsAbsorbed);

  useEffect(() => {
    const timer = setTimeout(() => setPillarsVisible(true), 800);
    return () => clearTimeout(timer);
  }, []);

  const handleDiveClick = (e: React.MouseEvent) => {
    if (onDiveClick) {
      e.preventDefault();
      onDiveClick();
    }
  };

  return (
    <div
      className={cn(
        "ocean-card caustic-bg relative overflow-hidden w-full max-w-3xl mx-auto",
        "ocean-card-animate",
        className,
      )}
      style={{
        background: `linear-gradient(135deg, rgba(13, 27, 42, 0.95) 0%, rgba(10, 15, 30, 0.9) 100%)`,
        minHeight: "320px",
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

        {/* Heading — poetic, not instructional */}
        <h2
          className="font-display text-4xl md:text-5xl lg:text-6xl font-semibold mb-3 tracking-tight"
          style={{ color: "var(--sand)" }}
        >
          {message.heading}
        </h2>

        {/* Subtext */}
        <p
          className="font-body text-lg mb-8 max-w-md"
          style={{ color: "var(--seafoam)" }}
        >
          {message.sub}
        </p>

        {/* Three Pillars — Reading, Listening, Shadowing */}
        <div
          className={cn(
            "flex items-center gap-6 mb-10 transition-all duration-700",
            pillarsVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-2",
          )}
        >
          <div className="flex items-center gap-2">
            <BookOpen
              className="w-4 h-4"
              style={{ color: "var(--seafoam)", opacity: 0.6 }}
            />
            <span
              className="text-sm font-body"
              style={{ color: "var(--sand)", opacity: 0.6 }}
            >
              Read
            </span>
          </div>
          <div
            className="w-px h-4"
            style={{ background: "rgba(255,255,255,0.1)" }}
          />
          <div className="flex items-center gap-2">
            <Headphones
              className="w-4 h-4"
              style={{ color: "var(--seafoam)", opacity: 0.6 }}
            />
            <span
              className="text-sm font-body"
              style={{ color: "var(--sand)", opacity: 0.6 }}
            >
              Listen
            </span>
          </div>
          <div
            className="w-px h-4"
            style={{ background: "rgba(255,255,255,0.1)" }}
          />
          <div className="flex items-center gap-2">
            <Mic
              className="w-4 h-4"
              style={{ color: "var(--seafoam)", opacity: 0.6 }}
            />
            <span
              className="text-sm font-body"
              style={{ color: "var(--sand)", opacity: 0.6 }}
            >
              Shadow
            </span>
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Dive In CTA */}
        <Link href={sessionPath} onClick={handleDiveClick}>
          <button
            className={cn(
              "ocean-cta px-8 py-4 text-lg font-semibold flex items-center gap-3 group",
              "transition-all duration-300",
            )}
          >
            <span>Enter the water</span>
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
    </div>
  );
}

export default NextLessonHero;
