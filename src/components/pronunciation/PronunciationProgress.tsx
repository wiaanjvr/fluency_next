"use client";

import { useState, useEffect } from "react";
import { TrendingUp, Target, Clock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import IPASymbol from "./IPASymbol";
import type { UserPronunciationProgress } from "@/types/pronunciation";

interface PronunciationProgressProps {
  language: string;
  className?: string;
}

export default function PronunciationProgress({
  language,
  className,
}: PronunciationProgressProps) {
  const [progress, setProgress] = useState<UserPronunciationProgress[]>([]);
  const [overallScore, setOverallScore] = useState(0);
  const [weakestPhoneme, setWeakestPhoneme] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProgress = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/pronunciation/progress?language=${language}`,
        );
        if (res.ok) {
          const data = await res.json();
          setProgress(data.progress || []);
          setOverallScore(data.overall_score || 0);
          setWeakestPhoneme(data.weakest_phoneme || null);
        }
      } catch {
        // Ignore errors
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, [language]);

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2
          className="w-5 h-5 animate-spin"
          style={{ color: "var(--turquoise)" }}
        />
      </div>
    );
  }

  if (progress.length === 0) return null;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Summary row */}
      <div className="flex items-center justify-center gap-6">
        <div className="flex items-center gap-2">
          <TrendingUp
            className="w-4 h-4"
            style={{ color: "var(--turquoise)" }}
          />
          <span
            className="font-body text-sm"
            style={{ color: "var(--seafoam)" }}
          >
            Score:{" "}
            <span
              className="font-semibold"
              style={{ color: "var(--turquoise)" }}
            >
              {overallScore}%
            </span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Target className="w-4 h-4" style={{ color: "var(--turquoise)" }} />
          <span
            className="font-body text-sm"
            style={{ color: "var(--seafoam)" }}
          >
            {progress.length} sounds tracked
          </span>
        </div>

        {weakestPhoneme && (
          <div className="flex items-center gap-2">
            <span
              className="font-body text-xs"
              style={{ color: "var(--seafoam)", opacity: 0.5 }}
            >
              Focus on:
            </span>
            <span
              className="font-serif text-sm font-bold"
              style={{ color: "var(--turquoise)" }}
            >
              /{weakestPhoneme.ipa_symbol}/
            </span>
          </div>
        )}
      </div>

      {/* Phoneme progress bars */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        {progress.slice(0, 10).map((p) => (
          <div
            key={p.id}
            className="rounded-lg border border-white/5 p-2 flex flex-col items-center gap-1"
            style={{ background: "rgba(13, 33, 55, 0.4)" }}
          >
            <span
              className="font-serif text-xs font-bold"
              style={{ color: "var(--turquoise)" }}
            >
              /{p.phoneme?.ipa_symbol || "?"}/
            </span>
            <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.round((p.familiarity_score || 0) * 100)}%`,
                  background:
                    p.familiarity_score >= 0.7
                      ? "var(--turquoise)"
                      : p.familiarity_score >= 0.4
                        ? "var(--seafoam)"
                        : "rgba(239, 68, 68, 0.6)",
                }}
              />
            </div>
            <span
              className="text-[10px] font-body tabular-nums"
              style={{ color: "var(--seafoam)", opacity: 0.4 }}
            >
              {Math.round((p.familiarity_score || 0) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
