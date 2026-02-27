"use client";

import React, { useState } from "react";
import { Flame, BookOpen, Clock, ArrowRight } from "lucide-react";

// ============================================================================
// Dashboard Right Panel — 280px fixed right column
// Contains: Current Session card + Word Spotlight card
// ============================================================================

interface RightPanelProps {
  wordsToday: number;
  dailyGoal: number;
  minutesToday: number;
  streak: number;
  spotlightWord?: {
    word: string;
    translation: string;
    partOfSpeech: string;
    example?: string;
  };
}

/** Circular progress ring */
function ProgressRing({
  value,
  max,
  size = 56,
  strokeWidth = 3,
}: {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(value / max, 1);
  const offset = circumference - pct * circumference;

  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      {/* Track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(74, 127, 165, 0.2)"
        strokeWidth={strokeWidth}
      />
      {/* Progress */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--ocean-teal-primary, #00d4aa)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{
          transition: "stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      />
    </svg>
  );
}

export function DashboardRightPanel({
  wordsToday,
  dailyGoal,
  minutesToday,
  streak,
  spotlightWord,
}: RightPanelProps) {
  const [sessionHovered, setSessionHovered] = useState(false);
  const [spotlightHovered, setSpotlightHovered] = useState(false);
  const [weekHovered, setWeekHovered] = useState(false);
  return (
    <aside
      className="hidden xl:flex flex-col gap-4 p-5 fixed right-0"
      style={{
        top: 64,
        width: 280,
        height: "calc(100vh - 64px)",
        overflowY: "auto",
        background: "var(--ocean-depth-1, #070f1a)",
        borderLeft: "1px solid var(--teal-border, rgba(0,212,170,0.18))",
      }}
    >
      {/* ── Current Session Card ── */}
      <div
        className="flex flex-col gap-4"
        onMouseEnter={() => setSessionHovered(true)}
        onMouseLeave={() => setSessionHovered(false)}
        style={{
          borderRadius: 10,
          padding: 20,
          background: "var(--ocean-depth-2, #0d1d2e)",
          borderTop: "2px solid rgba(0, 212, 170, 0.5)",
          boxShadow: sessionHovered
            ? "0 4px 24px rgba(0,0,0,0.4)"
            : "0 2px 16px rgba(0,0,0,0.3)",
          transition: "box-shadow 0.2s ease",
        }}
      >
        <h3
          style={{
            fontFamily: "var(--font-inter, 'Inter', sans-serif)",
            fontSize: 20,
            fontWeight: 600,
            lineHeight: 1.35,
            color: "var(--text-primary, #e2e8f0)",
            margin: 0,
          }}
        >
          Today&apos;s Session
        </h3>

        {/* Progress ring + daily goal */}
        <div className="flex items-center gap-4">
          <div className="relative flex-shrink-0">
            <ProgressRing value={wordsToday} max={dailyGoal} size={56} />
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-inter, 'Inter', sans-serif)",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--text-primary, #e2e8f0)",
                }}
              >
                {wordsToday}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-0.5">
            <span
              style={{
                fontFamily: "var(--font-inter, 'Inter', sans-serif)",
                fontSize: 14,
                fontWeight: 500,
                color: "var(--text-primary, #e2e8f0)",
              }}
            >
              {wordsToday} / {dailyGoal} words
            </span>
            <span
              style={{
                fontFamily: "var(--font-inter, 'Inter', sans-serif)",
                fontSize: 12,
                fontWeight: 500,
                color: "var(--text-muted, #4a6580)",
              }}
            >
              Daily goal
            </span>
          </div>
        </div>

        {/* Stats row */}
        <div
          className="flex items-center gap-4 pt-3"
          style={{
            borderTop: "1px solid var(--ocean-depth-4, rgba(26,51,71,1))",
          }}
        >
          {/* Time */}
          <div className="flex items-center gap-1.5">
            <Clock
              className="w-3 h-3"
              style={{ color: "var(--text-ghost, #2D5A52)" }}
            />
            <span
              style={{
                fontFamily: "var(--font-inter, 'Inter', sans-serif)",
                fontSize: 12,
                fontWeight: 500,
                color: "var(--text-secondary, #94a3b8)",
              }}
            >
              {minutesToday}m
            </span>
          </div>

          {/* Streak */}
          <div className="flex items-center gap-1.5">
            <Flame
              className="w-3 h-3"
              style={{
                color:
                  streak > 0
                    ? "var(--biolum-orange, #D4A056)"
                    : "var(--text-muted, #2E5C54)",
              }}
            />
            <span
              style={{
                fontFamily: "var(--font-inter, 'Inter', sans-serif)",
                fontSize: 12,
                fontWeight: 500,
                color: "var(--text-secondary, #94a3b8)",
              }}
            >
              {streak > 0 ? `${streak}d streak` : "Day 1 \u2014 begin"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Word Spotlight Card ── */}
      {spotlightWord && (
        <div
          className="spotlight-card flex flex-col gap-4"
          onMouseEnter={() => setSpotlightHovered(true)}
          onMouseLeave={() => setSpotlightHovered(false)}
          style={{
            borderRadius: 10,
            padding: 20,
            background: "var(--ocean-depth-2, #0d1d2e)",
            borderTop: "2px solid rgba(0, 212, 170, 0.5)",
            boxShadow: spotlightHovered
              ? "0 4px 24px rgba(0,0,0,0.4)"
              : "0 2px 16px rgba(0,0,0,0.3)",
            position: "relative",
            overflow: "hidden",
            transition: "box-shadow 0.2s ease",
          }}
        >
          <h3
            style={{
              fontFamily: "var(--font-inter, 'Inter', sans-serif)",
              fontSize: 20,
              fontWeight: 600,
              lineHeight: 1.35,
              color: "var(--text-primary, #e2e8f0)",
              margin: 0,
            }}
          >
            Word Spotlight
          </h3>

          {/* Word */}
          <div className="spotlight-word">
            <span
              style={{
                fontFamily:
                  "var(--font-dm-serif, 'DM Serif Display', Georgia, serif)",
                fontSize: 36,
                fontWeight: 400,
                fontStyle: "italic",
                color: "var(--text-primary, #e2e8f0)",
                display: "block",
                lineHeight: 1.1,
              }}
            >
              {spotlightWord.word}
            </span>
            <span
              style={{
                fontFamily: "var(--font-inter, 'Inter', sans-serif)",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--text-muted, #4a6580)",
                marginTop: 6,
                display: "block",
              }}
            >
              {spotlightWord.partOfSpeech}
            </span>
          </div>

          {/* Translation */}
          <div
            style={{
              fontFamily: "var(--font-inter, 'Inter', sans-serif)",
              fontSize: 14,
              fontStyle: "normal",
              color: "var(--text-secondary, #7BA8A0)",
            }}
          >
            {spotlightWord.translation}
          </div>

          {/* Example sentence — candlelight underwater warmth */}
          {spotlightWord.example && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                background: "rgba(212, 160, 86, 0.03)",
                borderLeft: "2px solid rgba(212, 160, 86, 0.2)",
                fontFamily: "var(--font-inter, 'Inter', sans-serif)",
                fontSize: 12,
                fontStyle: "normal",
                color: "var(--text-warm, #c8b89a)",
                lineHeight: 1.6,
              }}
            >
              {spotlightWord.example}
            </div>
          )}

          {/* Practice button */}
          <button
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid var(--teal-border, rgba(0,212,170,0.18))",
              background: "transparent",
              color: "var(--text-secondary, #94a3b8)",
              fontFamily: "var(--font-inter, 'Inter', sans-serif)",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 200ms ease",
              marginTop: 4,
              width: "100%",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor =
                "var(--ocean-teal-primary, #00d4aa)";
              e.currentTarget.style.color = "var(--text-primary, #e2e8f0)";
              e.currentTarget.style.background =
                "var(--teal-glow, rgba(0,212,170,0.08))";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor =
                "var(--teal-border, rgba(0,212,170,0.18))";
              e.currentTarget.style.color = "var(--text-secondary, #94a3b8)";
              e.currentTarget.style.background = "transparent";
            }}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Practice this word
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* ── This Week — with sparkline ── */}
      <div
        className="flex flex-col gap-3 mt-auto"
        onMouseEnter={() => setWeekHovered(true)}
        onMouseLeave={() => setWeekHovered(false)}
        style={{
          borderRadius: 10,
          padding: 20,
          background: "var(--ocean-depth-2, #0d1d2e)",
          borderTop: "2px solid rgba(0, 212, 170, 0.5)",
          boxShadow: weekHovered
            ? "0 4px 24px rgba(0,0,0,0.4)"
            : "0 2px 16px rgba(0,0,0,0.3)",
          transition: "box-shadow 0.2s ease",
        }}
      >
        <h3
          style={{
            fontFamily: "var(--font-inter, 'Inter', sans-serif)",
            fontSize: 20,
            fontWeight: 600,
            lineHeight: 1.35,
            color: "var(--text-primary, #e2e8f0)",
            margin: 0,
          }}
        >
          This Week
        </h3>
        <div className="flex flex-col gap-0.5">
          <span
            style={{
              fontFamily: "var(--font-inter, 'Inter', sans-serif)",
              fontSize: 40,
              fontWeight: 700,
              color: "var(--ocean-teal-primary, #00d4aa)",
              lineHeight: 1,
            }}
          >
            {wordsToday * 7}
          </span>
          <span
            style={{
              fontFamily: "var(--font-inter, 'Inter', sans-serif)",
              fontSize: 12,
              fontWeight: 500,
              color: "var(--text-muted, #4a6580)",
            }}
          >
            words this week
          </span>
        </div>

        {/* Mini sparkline — 7-day activity bars */}
        <div
          className="flex items-end gap-1"
          style={{ height: 24, marginTop: 4 }}
        >
          {[0.3, 0.5, 0.7, 0.4, 0.9, 0.6, 1.0].map((h, i) => (
            <div
              key={i}
              className="sparkline-bar"
              style={{
                flex: 1,
                height: `${h * 100}%`,
                borderRadius: 2,
                background:
                  i === 6
                    ? "var(--ocean-teal-primary, #00d4aa)"
                    : "rgba(74, 127, 165, 0.15)",
                transition: "height 0.6s ease",
              }}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}

export default DashboardRightPanel;
