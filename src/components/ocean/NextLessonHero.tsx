"use client";

import React, { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Clock, TrendingUp, ArrowRight } from "lucide-react";

// ============================================================================
// Next Lesson Hero Card - The largest, most prominent card
// Features water caustic animations and the signature turquoise CTA
// ============================================================================

interface NextLessonHeroProps {
  title: string;
  description: string;
  timeEstimate?: string;
  avgScore?: number;
  lessonPath: string;
  onDiveClick?: () => void;
  className?: string;
}

export function NextLessonHero({
  title,
  description,
  timeEstimate = "~15 min",
  avgScore = 0,
  lessonPath,
  onDiveClick,
  className,
}: NextLessonHeroProps) {
  const [isHovered, setIsHovered] = useState(false);

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
        minHeight: "280px",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Third caustic layer for extra depth */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 70% 30%, rgba(30, 107, 114, 0.12) 0%, transparent 50%)`,
          animation: "caustic3 18s ease-in-out infinite",
        }}
      />

      {/* Subtle grid pattern overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-5"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Content */}
      <div className="relative z-10 p-10">
        {/* Heading */}
        <h2
          className="font-display text-5xl md:text-6xl font-semibold mb-4 tracking-tight"
          style={{ color: "var(--sand)" }}
        >
          {title}
        </h2>

        {/* Subtext */}
        <p
          className="font-body text-lg mb-8 max-w-md"
          style={{ color: "var(--seafoam)" }}
        >
          {description}
        </p>

        {/* Stats Row */}
        <div className="flex items-center gap-6 mb-8">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" style={{ color: "var(--seafoam)" }} />
            <span
              className="text-sm font-body"
              style={{ color: "var(--sand)", opacity: 0.8 }}
            >
              {timeEstimate}
            </span>
          </div>
          {avgScore > 0 && (
            <div className="flex items-center gap-2">
              <TrendingUp
                className="w-4 h-4"
                style={{ color: "var(--seafoam)" }}
              />
              <span
                className="text-sm font-body"
                style={{ color: "var(--sand)", opacity: 0.8 }}
              >
                {avgScore}% avg score
              </span>
            </div>
          )}
        </div>

        {/* Dive In CTA - THE turquoise button */}
        <Link href={lessonPath} onClick={handleDiveClick}>
          <button
            className={cn(
              "ocean-cta px-8 py-4 text-lg font-semibold flex items-center gap-3 group",
              "transition-all duration-300",
            )}
          >
            <span>Dive In</span>
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
        className="absolute top-6 right-6 w-20 h-20 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, rgba(61, 214, 181, 0.1) 0%, transparent 70%)`,
          filter: "blur(10px)",
        }}
      />
    </div>
  );
}

export default NextLessonHero;
