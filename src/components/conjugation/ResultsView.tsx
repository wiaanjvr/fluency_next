"use client";

import { useState } from "react";
import { useConjugationStore } from "@/lib/store/conjugationStore";
import { getTenseLabel } from "@/lib/conjugation/languageConfig";
import { Button } from "@/components/ui/button";
import { XPToast } from "@/components/ui/xp-toast";
import { cn } from "@/lib/utils";
import { RotateCcw, Settings, ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Language } from "@/types/conjugation";

export function ResultsView() {
  const config = useConjugationStore((s) => s.config);
  const sessionResult = useConjugationStore((s) => s.sessionResult);
  const startSession = useConjugationStore((s) => s.startSession);
  const resetSession = useConjugationStore((s) => s.resetSession);

  const [showXP, setShowXP] = useState(true);
  const language = (config?.language ?? "de") as Language;

  if (!sessionResult) return null;

  const {
    totalQuestions,
    correctAnswers,
    accuracy,
    timeTakenSeconds,
    xpEarned,
    weakestVerbs,
    strongestVerbs,
    tenseBreakdown,
  } = sessionResult;

  const accuracyColor =
    accuracy >= 70
      ? "text-ocean-turquoise"
      : accuracy >= 50
        ? "text-amber-400"
        : "text-red-400";

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  return (
    <div className="space-y-8">
      <XPToast xp={xpEarned} show={showXP} onDone={() => setShowXP(false)} />

      {/* ============================================================ */}
      {/* Hero stats */}
      {/* ============================================================ */}
      <div className="text-center space-y-3">
        <p className={cn("text-6xl font-light tabular-nums", accuracyColor)}>
          {Math.round(accuracy)}%
        </p>
        <p className="text-lg text-muted-foreground font-light">
          {correctAnswers} / {totalQuestions} correct
        </p>
        <div className="flex items-center justify-center gap-4">
          <span className="text-sm text-muted-foreground font-light">
            {formatTime(timeTakenSeconds)}
          </span>
          {xpEarned > 0 && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full",
                "bg-ocean-turquoise/10 border-[1.5px] border-ocean-turquoise/20",
                "px-3 py-1 text-sm text-ocean-turquoise font-light",
              )}
            >
              +{xpEarned} XP 🌊
            </span>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* Tense breakdown */}
      {/* ============================================================ */}
      {tenseBreakdown.length > 0 && (
        <section>
          <h3 className="mb-4 text-lg font-light text-foreground">
            Tense Breakdown
          </h3>
          <div className="rounded-2xl border-[1.5px] border-white/5 bg-white/[0.02] overflow-hidden">
            <div className="divide-y divide-white/5">
              {tenseBreakdown.map((t) => {
                const tenseAcc = t.total > 0 ? (t.correct / t.total) * 100 : 0;
                return (
                  <div
                    key={t.tense}
                    className="flex items-center gap-4 px-4 py-3"
                  >
                    <span className="w-40 text-sm font-light text-foreground truncate">
                      {getTenseLabel(language, t.tense)}
                    </span>
                    <span className="w-16 text-xs text-muted-foreground text-right tabular-nums">
                      {t.correct}/{t.total}
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          tenseAcc >= 70
                            ? "bg-ocean-turquoise"
                            : tenseAcc >= 50
                              ? "bg-amber-400"
                              : "bg-red-400",
                        )}
                        style={{ width: `${tenseAcc}%` }}
                      />
                    </div>
                    <span className="w-12 text-xs text-muted-foreground text-right tabular-nums">
                      {Math.round(tenseAcc)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ============================================================ */}
      {/* Verb breakdown */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Weakest verbs */}
        {weakestVerbs.length > 0 && (
          <section>
            <h3 className="mb-3 text-sm font-medium text-red-400/80">
              Needs Work
            </h3>
            <div className="rounded-2xl border-[1.5px] border-white/5 bg-white/[0.02] divide-y divide-white/5">
              {weakestVerbs.map((v) => (
                <div
                  key={v.infinitive}
                  className="flex items-center gap-3 px-4 py-2.5"
                >
                  <span className="flex-1 text-sm font-light text-foreground">
                    {v.infinitive}
                  </span>
                  <div className="w-16 h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-red-400"
                      style={{ width: `${v.accuracy}%` }}
                    />
                  </div>
                  <span className="w-10 text-xs text-muted-foreground text-right tabular-nums">
                    {v.accuracy}%
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Strongest verbs */}
        {strongestVerbs.length > 0 && (
          <section>
            <h3 className="mb-3 text-sm font-medium text-ocean-turquoise/80">
              Strongest
            </h3>
            <div className="rounded-2xl border-[1.5px] border-white/5 bg-white/[0.02] divide-y divide-white/5">
              {strongestVerbs.map((v) => (
                <div
                  key={v.infinitive}
                  className="flex items-center gap-3 px-4 py-2.5"
                >
                  <span className="flex-1 text-sm font-light text-foreground">
                    {v.infinitive}
                  </span>
                  <div className="w-16 h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-ocean-turquoise"
                      style={{ width: `${v.accuracy}%` }}
                    />
                  </div>
                  <span className="w-10 text-xs text-muted-foreground text-right tabular-nums">
                    {v.accuracy}%
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* ============================================================ */}
      {/* Action row */}
      {/* ============================================================ */}
      <div className="flex flex-col gap-3 pb-8">
        <Button
          variant="accent"
          size="lg"
          className="w-full"
          onClick={() => {
            if (config) startSession(config);
          }}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Drill Again
        </Button>
        <Button
          variant="ghost"
          size="lg"
          className="w-full"
          onClick={resetSession}
        >
          <Settings className="mr-2 h-4 w-4" />
          Adjust Settings
        </Button>
        <Button variant="ghost" size="lg" className="w-full" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}
