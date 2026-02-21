"use client";

import type { SessionEntry } from "@/types/cloze";
import { cn } from "@/lib/utils";
import { BookOpen, RotateCcw, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface SessionSummaryProps {
  score: { correct: number; incorrect: number };
  history: SessionEntry[];
  onDiveAgain: () => void;
}

export function SessionSummary({
  score,
  history,
  onDiveAgain,
}: SessionSummaryProps) {
  const total = score.correct + score.incorrect;
  const percentage = total > 0 ? Math.round((score.correct / total) * 100) : 0;
  const xp = score.correct * 10 + score.incorrect * 2;
  const missed = history.filter((h) => !h.correct);

  return (
    <div className="max-w-lg mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Score card */}
      <div className="rounded-2xl border border-white/10 bg-[#0d2137] p-8 text-center space-y-6">
        <h2
          className="font-display text-3xl font-bold"
          style={{ color: "var(--sand, #e8d5b7)" }}
        >
          Session Complete
        </h2>

        <div className="flex items-center justify-center gap-2">
          <span className="text-6xl font-bold text-teal-400">
            {score.correct}
          </span>
          <span className="text-2xl text-white/40">/</span>
          <span className="text-4xl text-white/60">{total}</span>
        </div>

        <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-teal-500 to-teal-400 rounded-full transition-all duration-1000"
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Depth gained XP */}
        <div className="flex items-center justify-center gap-2 text-white/60">
          <span className="text-sm">Depth gained:</span>
          <span className="text-lg font-semibold text-teal-400">{xp} XP</span>
          <span className="text-xs text-white/40">🫧</span>
        </div>

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

      {/* Missed words */}
      {missed.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-[#0d2137] p-6 space-y-4">
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
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onDiveAgain}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl",
            "bg-teal-500 hover:bg-teal-400 text-[#0a1628] font-semibold text-base",
            "transition-all duration-200 shadow-lg shadow-teal-500/25",
          )}
        >
          <RotateCcw className="h-5 w-5" />
          Dive again
        </button>

        <Link
          href="/propel"
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl",
            "border border-white/20 bg-white/5 text-white/80 hover:text-white hover:border-white/30",
            "font-medium text-base transition-all duration-200",
          )}
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Propel
        </Link>
      </div>
    </div>
  );
}
