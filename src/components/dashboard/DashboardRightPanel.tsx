"use client";

import React from "react";
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
        stroke="rgba(13, 148, 136, 0.12)"
        strokeWidth={strokeWidth}
      />
      {/* Progress */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--teal-surface, #0D9488)"
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
  return (
    <aside
      className="hidden xl:flex flex-col gap-4 p-4 fixed right-0"
      style={{
        top: 64,
        width: 280,
        height: "calc(100vh - 64px)",
        overflowY: "auto",
        background:
          "linear-gradient(180deg, rgba(4, 24, 36, 0.6) 0%, rgba(2, 15, 20, 0.8) 100%)",
        borderLeft: "1px solid rgba(255, 255, 255, 0.04)",
      }}
    >
      {/* ── Current Session Card ── */}
      <div
        className="glass-card flex flex-col gap-4 p-5"
        style={{
          borderRadius: 16,
          background: "rgba(4, 24, 36, 0.5)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255, 255, 255, 0.06)",
        }}
      >
        <h3
          style={{
            fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--text-ghost, #2D5A52)",
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
                  fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--text-primary, #F0FDFA)",
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
                fontSize: 13,
                fontWeight: 500,
                color: "var(--text-primary, #F0FDFA)",
              }}
            >
              {wordsToday} / {dailyGoal} words
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                fontSize: 10,
                color: "var(--text-ghost, #2D5A52)",
              }}
            >
              Daily goal
            </span>
          </div>
        </div>

        {/* Stats row */}
        <div
          className="flex items-center gap-4 pt-3"
          style={{ borderTop: "1px solid rgba(255, 255, 255, 0.04)" }}
        >
          {/* Time */}
          <div className="flex items-center gap-1.5">
            <Clock
              className="w-3 h-3"
              style={{ color: "var(--text-ghost, #2D5A52)" }}
            />
            <span
              style={{
                fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                fontSize: 11,
                color: "var(--text-secondary, #7BA8A0)",
              }}
            >
              {minutesToday}m
            </span>
          </div>

          {/* Streak */}
          <div className="flex items-center gap-1.5">
            <Flame
              className="w-3 h-3"
              style={{ color: "var(--teal-surface, #0D9488)" }}
            />
            <span
              style={{
                fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                fontSize: 11,
                color: "var(--text-secondary, #7BA8A0)",
              }}
            >
              {streak}d streak
            </span>
          </div>
        </div>
      </div>

      {/* ── Word Spotlight Card ── */}
      {spotlightWord && (
        <div
          className="glass-card flex flex-col gap-3 p-5"
          style={{
            borderRadius: 16,
            background: "rgba(4, 24, 36, 0.5)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        >
          <h3
            style={{
              fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--text-ghost, #2D5A52)",
              margin: 0,
            }}
          >
            Word Spotlight
          </h3>

          {/* Word */}
          <div>
            <span
              style={{
                fontFamily: "var(--font-display, 'Playfair Display', serif)",
                fontSize: 22,
                fontWeight: 600,
                fontStyle: "italic",
                color: "var(--text-primary, #F0FDFA)",
                display: "block",
                lineHeight: 1.2,
              }}
            >
              {spotlightWord.word}
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                fontSize: 10,
                color: "var(--text-ghost, #2D5A52)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                marginTop: 2,
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
              color: "var(--text-secondary, #7BA8A0)",
            }}
          >
            {spotlightWord.translation}
          </div>

          {/* Example sentence */}
          {spotlightWord.example && (
            <div
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                background: "rgba(13, 148, 136, 0.04)",
                borderLeft: "2px solid rgba(13, 148, 136, 0.2)",
                fontFamily: "var(--font-inter, 'Inter', sans-serif)",
                fontSize: 12,
                fontStyle: "italic",
                color: "var(--text-ghost, #2D5A52)",
                lineHeight: 1.5,
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
              borderRadius: 100,
              border: "1px solid rgba(13, 148, 136, 0.2)",
              background: "rgba(13, 148, 136, 0.08)",
              color: "var(--teal-surface, #0D9488)",
              fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: "0.04em",
              cursor: "pointer",
              transition: "all 200ms ease",
              marginTop: 4,
              width: "100%",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(13, 148, 136, 0.15)";
              e.currentTarget.style.borderColor = "rgba(13, 148, 136, 0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(13, 148, 136, 0.08)";
              e.currentTarget.style.borderColor = "rgba(13, 148, 136, 0.2)";
            }}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Practice this word
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* ── Quick Stats Placeholder ── */}
      <div
        className="glass-card flex flex-col gap-2 p-4 mt-auto"
        style={{
          borderRadius: 14,
          background: "rgba(4, 24, 36, 0.3)",
          border: "1px solid rgba(255, 255, 255, 0.03)",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
            fontSize: 9,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--text-ghost, #2D5A52)",
          }}
        >
          This week
        </span>
        <div className="flex items-baseline gap-2">
          <span
            style={{
              fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
              fontSize: 24,
              fontWeight: 500,
              color: "var(--text-primary, #F0FDFA)",
              lineHeight: 1,
            }}
          >
            {wordsToday * 7}
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
              fontSize: 10,
              color: "var(--text-ghost, #2D5A52)",
            }}
          >
            words absorbed
          </span>
        </div>
      </div>
    </aside>
  );
}

export default DashboardRightPanel;
