"use client";

import { useMemo } from "react";
import { MessageCircle, RotateCcw, ArrowLeft, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TranscriptEntry } from "@/hooks/useGeminiLive";

// ============================================================================
// Helpers
// ============================================================================
function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

/** Extract likely corrections from AI transcript entries */
function extractCorrections(transcript: TranscriptEntry[]): string[] {
  const corrections: string[] = [];
  const correctionPatterns = [
    /(?:actually|instead|correct\s+form|should\s+(?:be|say)|it's\s+better\s+to\s+say|you\s+mean)[:\s]+[""]?(.+?)[""]?[.!?]?$/i,
    /\*(.+?)\*/g,
    /(?:not\s+[""]?.+?[""]?\s*,?\s*but\s+)[""]?(.+?)[""]?/i,
  ];

  for (const entry of transcript) {
    if (entry.role !== "ai") continue;
    for (const pattern of correctionPatterns) {
      const match = entry.text.match(pattern);
      if (match && match[1]) {
        corrections.push(
          entry.text.slice(0, 120) + (entry.text.length > 120 ? "..." : ""),
        );
        break;
      }
    }
    if (corrections.length >= 3) break;
  }

  return corrections;
}

const ENCOURAGEMENT_MESSAGES = [
  "Every conversation builds your fluency. Keep going! 🌊",
  "Practice makes permanent. You're building real skill! 🐬",
  "Your confidence grows with every exchange. Bien fait! ✨",
  "That's real conversation practice. You're doing great! 🎯",
  "Speaking is the fastest path to fluency. Keep diving in! 🏊",
];

// ============================================================================
// Component
// ============================================================================
interface SessionSummaryProps {
  duration: number;
  transcript: TranscriptEntry[];
  exchanges: number;
  onRestart: () => void;
  onBack: () => void;
}

export default function SessionSummary({
  duration,
  transcript,
  exchanges,
  onRestart,
  onBack,
}: SessionSummaryProps) {
  const corrections = useMemo(
    () => extractCorrections(transcript),
    [transcript],
  );
  const encouragement = useMemo(
    () =>
      ENCOURAGEMENT_MESSAGES[
        Math.floor(Math.random() * ENCOURAGEMENT_MESSAGES.length)
      ],
    [],
  );

  return (
    <div className="max-w-lg mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 py-8">
      {/* Header */}
      <div className="flex flex-col items-center mb-8">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
          style={{ background: "rgba(45, 212, 191, 0.12)" }}
        >
          <Sparkles className="w-8 h-8" style={{ color: "var(--turquoise)" }} />
        </div>
        <h2
          className="font-display text-2xl font-bold"
          style={{ color: "var(--sand)" }}
        >
          Session Complete
        </h2>
      </div>

      {/* Stats card */}
      <div
        className="rounded-2xl border border-white/10 p-6 space-y-4"
        style={{ background: "rgba(13, 33, 55, 0.6)" }}
      >
        {/* Duration & exchanges */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p
              className="font-body text-xs uppercase tracking-wider"
              style={{ color: "var(--seafoam)", opacity: 0.5 }}
            >
              Duration
            </p>
            <p
              className="font-display text-xl font-bold"
              style={{ color: "var(--sand)" }}
            >
              {formatDuration(duration)}
            </p>
          </div>
          <div className="space-y-1">
            <p
              className="font-body text-xs uppercase tracking-wider"
              style={{ color: "var(--seafoam)", opacity: 0.5 }}
            >
              Exchanges
            </p>
            <p
              className="font-display text-xl font-bold"
              style={{ color: "var(--sand)" }}
            >
              ~{exchanges}
            </p>
          </div>
        </div>

        {/* Corrections */}
        {corrections.length > 0 && (
          <div className="pt-3 border-t border-white/5 space-y-2">
            <p
              className="font-body text-xs uppercase tracking-wider"
              style={{ color: "var(--seafoam)", opacity: 0.5 }}
            >
              Corrections
            </p>
            {corrections.map((c, i) => (
              <div
                key={i}
                className="rounded-xl px-3 py-2 font-body text-xs leading-relaxed"
                style={{
                  color: "var(--sand)",
                  background: "rgba(255,255,255,0.03)",
                  borderLeft: "2px solid rgba(45, 212, 191, 0.3)",
                }}
              >
                {c}
              </div>
            ))}
          </div>
        )}

        {/* Encouragement */}
        <div
          className="rounded-xl px-4 py-3 mt-2 font-body text-sm text-center"
          style={{
            color: "var(--turquoise)",
            background: "rgba(45, 212, 191, 0.06)",
            border: "1px solid rgba(45, 212, 191, 0.1)",
          }}
        >
          {encouragement}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mt-6">
        <button
          onClick={onBack}
          className={cn(
            "flex-1 rounded-2xl py-3 px-4",
            "flex items-center justify-center gap-2",
            "font-body text-sm font-medium",
            "border border-white/10 hover:border-white/20",
            "transition-all duration-200 cursor-pointer",
          )}
          style={{ color: "var(--seafoam)" }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Propel
        </button>
        <button
          onClick={onRestart}
          className={cn(
            "flex-1 rounded-2xl py-3 px-4",
            "flex items-center justify-center gap-2",
            "font-display text-sm font-semibold",
            "bg-[var(--turquoise)]/15 border border-[var(--turquoise)]/30",
            "hover:bg-[var(--turquoise)]/25 hover:border-[var(--turquoise)]/50",
            "transition-all duration-200 cursor-pointer",
          )}
          style={{ color: "var(--turquoise)" }}
        >
          <RotateCcw className="w-4 h-4" />
          New Session
        </button>
      </div>
    </div>
  );
}
