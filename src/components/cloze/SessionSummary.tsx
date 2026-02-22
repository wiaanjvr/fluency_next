"use client";

import type { SessionEntry } from "@/types/cloze";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  RotateCcw,
  ArrowLeft,
  Sparkles,
  PenLine,
  Layers,
  Shuffle,
} from "lucide-react";
import Link from "next/link";

interface SessionSummaryProps {
  score: { correct: number; incorrect: number };
  history: SessionEntry[];
  maxStreak: number;
  onDiveAgain: () => void;
}

export function SessionSummary({
  score,
  history,
  maxStreak,
  onDiveAgain,
}: SessionSummaryProps) {
  const total = score.correct + score.incorrect;
  const percentage = total > 0 ? Math.round((score.correct / total) * 100) : 0;
  const missed = history.filter((h) => !h.correct);

  // Mode breakdown
  const typed = history.filter((h) => h.modeUsed === "type").length;
  const chose = history.filter((h) => h.modeUsed === "choice").length;
  const banked = history.filter((h) => h.modeUsed === "wordbank").length;
  const allTyped = typed === total;

  return (
    <div className="max-w-lg mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      {/* CSS-only ocean celebration animation */}
      <div
        className="absolute inset-0 -top-20 pointer-events-none overflow-hidden rounded-3xl"
        aria-hidden
      >
        <div className="cloze-celebration-bubble cloze-bubble-1" />
        <div className="cloze-celebration-bubble cloze-bubble-2" />
        <div className="cloze-celebration-bubble cloze-bubble-3" />
        <div className="cloze-celebration-bubble cloze-bubble-4" />
        <div className="cloze-celebration-bubble cloze-bubble-5" />
        <div className="cloze-celebration-wave" />
      </div>

      {/* Score card */}
      <div className="rounded-2xl border border-white/10 bg-[#0d2137] p-8 text-center space-y-6 relative z-10">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Sparkles className="h-5 w-5 text-amber-400" />
          <h2
            className="font-display text-3xl font-bold"
            style={{ color: "var(--sand, #e8d5b7)" }}
          >
            Session Complete
          </h2>
          <Sparkles className="h-5 w-5 text-amber-400" />
        </div>

        {/* Score display */}
        <div className="flex items-center justify-center gap-2">
          <span className="text-6xl font-bold text-teal-400">
            {score.correct}
          </span>
          <span className="text-2xl text-white/40">/</span>
          <span className="text-4xl text-white/60">{total}</span>
        </div>

        {/* Accuracy % */}
        <p className="text-lg text-white/60">{percentage}% accuracy</p>

        {/* Progress bar */}
        <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-teal-500 to-teal-400 rounded-full transition-all duration-1000"
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Streak */}
        {maxStreak > 1 && (
          <div className="flex items-center justify-center gap-2 text-white/60">
            <span className="text-sm">Best streak:</span>
            <span className="text-lg font-semibold text-amber-400">
              {maxStreak} 🔥
            </span>
          </div>
        )}

        {/* Encouragement */}
        {percentage >= 80 && (
          <p className="text-sm text-teal-400/80">
            Outstanding diving! You&apos;re navigating these waters with ease.
          </p>
        )}
        {percentage >= 50 && percentage < 80 && (
          <p className="text-sm text-white/50">
            Good depth reached. Keep practicing to master these currents.
          </p>
        )}
        {percentage < 50 && (
          <p className="text-sm text-white/50">
            These are deep waters. Review the words below and try again.
          </p>
        )}
      </div>

      {/* Mode breakdown */}
      <div className="rounded-2xl border border-white/10 bg-[#0d2137] p-6 space-y-4 relative z-10">
        <h3
          className="font-display text-lg font-semibold"
          style={{ color: "var(--sand, #e8d5b7)" }}
        >
          Mode breakdown
        </h3>
        <div className="flex flex-wrap gap-3">
          {typed > 0 && (
            <div className="flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2 border border-white/5">
              <PenLine className="h-4 w-4 text-teal-400" />
              <span className="text-sm text-white/70">
                Typed <span className="font-semibold text-white">{typed}</span>
              </span>
            </div>
          )}
          {chose > 0 && (
            <div className="flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2 border border-white/5">
              <Layers className="h-4 w-4 text-teal-400" />
              <span className="text-sm text-white/70">
                Multiple choice{" "}
                <span className="font-semibold text-white">{chose}</span>
              </span>
            </div>
          )}
          {banked > 0 && (
            <div className="flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2 border border-white/5">
              <Shuffle className="h-4 w-4 text-teal-400" />
              <span className="text-sm text-white/70">
                Word bank{" "}
                <span className="font-semibold text-white">{banked}</span>
              </span>
            </div>
          )}
        </div>
        {!allTyped && typed > 0 && (
          <p className="text-xs text-white/40">
            You typed {typed}, chose {chose + banked} — try typing all {total}{" "}
            next time for better retention.
          </p>
        )}
        {!allTyped && typed === 0 && (
          <p className="text-xs text-white/40">
            Try typing your answers next time — it builds stronger recall.
          </p>
        )}
        {allTyped && (
          <p className="text-xs text-teal-400/60">
            All typed! This is the most effective way to build recall. 💪
          </p>
        )}
      </div>

      {/* Missed words */}
      {missed.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-[#0d2137] p-6 space-y-4 relative z-10">
          <h3
            className="font-display text-lg font-semibold flex items-center gap-2"
            style={{ color: "var(--sand, #e8d5b7)" }}
          >
            <BookOpen className="h-5 w-5 text-teal-400" />
            Words to review
          </h3>
          <div className="space-y-3">
            {missed.map((entry, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-xl bg-white/5 p-3 border border-white/5"
              >
                <span className="text-rose-400 font-semibold text-sm min-w-[60px]">
                  {entry.item.answer}
                </span>
                <span className="text-white/40 text-sm flex-1">
                  {entry.item.translation}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3 relative z-10">
        <button
          onClick={onDiveAgain}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl",
            "bg-teal-500 hover:bg-teal-400 text-[#0a1628] font-semibold text-base",
            "transition-all duration-200 shadow-lg shadow-teal-500/25",
          )}
        >
          <RotateCcw className="h-5 w-5" />
          Start another round
        </button>

        <Link
          href="/propel/flashcards"
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl",
            "border border-teal-400/30 bg-teal-500/10 text-teal-300 hover:bg-teal-500/20",
            "font-medium text-base transition-all duration-200",
          )}
        >
          <BookOpen className="h-5 w-5" />
          Review saved flashcards
        </Link>
      </div>

      <div className="flex justify-center relative z-10">
        <Link
          href="/propel"
          className="text-sm text-white/40 hover:text-white/60 transition-colors flex items-center gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Propel
        </Link>
      </div>

      {/* Inline celebration animation styles */}
      <style jsx>{`
        .cloze-celebration-bubble {
          position: absolute;
          border-radius: 50%;
          background: radial-gradient(
            circle,
            rgba(45, 212, 191, 0.15),
            transparent 70%
          );
          animation: clozeBubbleRise 4s ease-in-out infinite;
        }
        .cloze-bubble-1 {
          width: 20px;
          height: 20px;
          left: 10%;
          bottom: -20px;
          animation-delay: 0s;
        }
        .cloze-bubble-2 {
          width: 14px;
          height: 14px;
          left: 30%;
          bottom: -14px;
          animation-delay: 0.8s;
        }
        .cloze-bubble-3 {
          width: 18px;
          height: 18px;
          left: 55%;
          bottom: -18px;
          animation-delay: 1.6s;
        }
        .cloze-bubble-4 {
          width: 12px;
          height: 12px;
          left: 75%;
          bottom: -12px;
          animation-delay: 2.4s;
        }
        .cloze-bubble-5 {
          width: 16px;
          height: 16px;
          left: 90%;
          bottom: -16px;
          animation-delay: 3.2s;
        }
        .cloze-celebration-wave {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 40px;
          background: linear-gradient(
            180deg,
            transparent,
            rgba(45, 212, 191, 0.05)
          );
          animation: clozeWave 3s ease-in-out infinite;
        }
        @keyframes clozeBubbleRise {
          0% {
            transform: translateY(0) scale(1);
            opacity: 0;
          }
          20% {
            opacity: 0.6;
          }
          100% {
            transform: translateY(-400px) scale(0.3);
            opacity: 0;
          }
        }
        @keyframes clozeWave {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-6px);
          }
        }
      `}</style>
    </div>
  );
}
