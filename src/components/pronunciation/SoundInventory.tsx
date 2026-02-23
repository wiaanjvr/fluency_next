"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import PhonemeCard from "./PhonemeCard";
import type { Phoneme, UserPronunciationProgress } from "@/types/pronunciation";

interface SoundInventoryProps {
  language: string;
  onBack: () => void;
  onSessionComplete: (data: {
    items_practiced: number;
    duration_seconds: number;
  }) => void;
}

export default function SoundInventory({
  language,
  onBack,
  onSessionComplete,
}: SoundInventoryProps) {
  const [phonemes, setPhonemes] = useState<Phoneme[]>([]);
  const [progress, setProgress] = useState<
    Record<string, UserPronunciationProgress>
  >({});
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const startTimeRef = useRef(Date.now());
  const practicedRef = useRef(new Set<string>());

  // Fetch phonemes + user progress
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [phonemeRes, progressRes] = await Promise.all([
          fetch(`/api/pronunciation/phonemes?language=${language}`),
          fetch(`/api/pronunciation/progress?language=${language}`),
        ]);

        const phonemeData = await phonemeRes.json();
        const progressData = await progressRes.json();

        setPhonemes(phonemeData.phonemes || []);

        // Build progress map keyed by phoneme_id
        const progressMap: Record<string, UserPronunciationProgress> = {};
        for (const p of progressData.progress || []) {
          progressMap[p.phoneme_id] = p;
        }
        setProgress(progressMap);
      } catch (err) {
        console.error("Failed to load sound inventory:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [language]);

  const handleToggleFamiliar = useCallback(
    async (phonemeId: string, familiar: boolean) => {
      // Optimistic update
      setProgress((prev) => ({
        ...prev,
        [phonemeId]: {
          ...(prev[phonemeId] || {}),
          phoneme_id: phonemeId,
          familiarity_score: familiar ? 0.8 : 0.2,
        } as UserPronunciationProgress,
      }));

      practicedRef.current.add(phonemeId);

      // Persist to backend
      try {
        // We use the progress endpoint to track this
        await fetch("/api/pronunciation/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            language,
            module_type: "sound_inventory",
            duration_seconds: Math.floor(
              (Date.now() - startTimeRef.current) / 1000,
            ),
            items_practiced: practicedRef.current.size,
            accuracy: null,
            session_data: {
              phoneme_id: phonemeId,
              action: familiar ? "marked_familiar" : "marked_needs_work",
            },
          }),
        });
      } catch {
        // Best-effort
      }
    },
    [language],
  );

  const handleFinish = useCallback(() => {
    onSessionComplete({
      items_practiced: practicedRef.current.size || Math.max(currentIndex, 1),
      duration_seconds: Math.floor((Date.now() - startTimeRef.current) / 1000),
    });
  }, [onSessionComplete, currentIndex]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2
          className="w-8 h-8 animate-spin"
          style={{ color: "var(--turquoise)" }}
        />
      </div>
    );
  }

  if (phonemes.length === 0) {
    return (
      <div className="text-center py-16">
        <p
          className="font-body text-sm"
          style={{ color: "var(--seafoam)", opacity: 0.7 }}
        >
          No phonemes available for this language yet.
        </p>
        <button
          onClick={onBack}
          className="mt-4 text-sm font-body"
          style={{ color: "var(--turquoise)" }}
        >
          ← Back
        </button>
      </div>
    );
  }

  const currentPhoneme = phonemes[currentIndex];
  const isFamiliar =
    (progress[currentPhoneme?.id]?.familiarity_score || 0) >= 0.5;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-body transition-opacity hover:opacity-100 opacity-60"
          style={{ color: "var(--turquoise)" }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* Progress indicator */}
        <div className="flex items-center gap-3">
          <span
            className="text-xs font-body"
            style={{ color: "var(--seafoam)", opacity: 0.5 }}
          >
            {currentIndex + 1} / {phonemes.length}
          </span>
          <div className="w-32 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${((currentIndex + 1) / phonemes.length) * 100}%`,
                background:
                  "linear-gradient(90deg, var(--turquoise), var(--teal))",
              }}
            />
          </div>
        </div>
      </div>

      {/* Section heading */}
      <div className="text-center space-y-1">
        <h2
          className="font-display text-2xl md:text-3xl font-bold"
          style={{ color: "var(--sand)" }}
        >
          Sound Inventory
        </h2>
        <p
          className="font-body text-sm"
          style={{ color: "var(--seafoam)", opacity: 0.6 }}
        >
          Explore each sound. Listen, then mark whether you can hear it clearly.
        </p>
      </div>

      {/* Current phoneme card */}
      {currentPhoneme && (
        <PhonemeCard
          phoneme={currentPhoneme}
          familiar={isFamiliar}
          onToggleFamiliar={handleToggleFamiliar}
          language={language}
        />
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        <button
          onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
          disabled={currentIndex === 0}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-sm font-body transition-all",
            currentIndex === 0
              ? "opacity-30 cursor-not-allowed"
              : "hover:border-white/20 hover:bg-white/5",
          )}
          style={{ color: "var(--seafoam)" }}
        >
          <ArrowLeft className="w-4 h-4" />
          Previous
        </button>

        {currentIndex < phonemes.length - 1 ? (
          <button
            onClick={() =>
              setCurrentIndex(Math.min(phonemes.length - 1, currentIndex + 1))
            }
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-body font-medium transition-all hover:shadow-lg"
            style={{
              background:
                "linear-gradient(135deg, var(--turquoise), var(--teal))",
              color: "var(--midnight)",
            }}
          >
            Next
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleFinish}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-body font-medium transition-all hover:shadow-lg"
            style={{
              background:
                "linear-gradient(135deg, var(--turquoise), var(--teal))",
              color: "var(--midnight)",
            }}
          >
            Finish
          </button>
        )}
      </div>

      {/* Quick-access phoneme dots */}
      <div className="flex flex-wrap justify-center gap-2 pt-2">
        {phonemes.map((p, i) => {
          const isFam = (progress[p.id]?.familiarity_score || 0) >= 0.5;
          return (
            <button
              key={p.id}
              onClick={() => setCurrentIndex(i)}
              className={cn(
                "w-8 h-8 rounded-lg text-xs font-serif font-bold transition-all duration-200",
                "border flex items-center justify-center",
                i === currentIndex
                  ? "border-[var(--turquoise)]/60 bg-[var(--turquoise)]/15 text-[var(--turquoise)]"
                  : isFam
                    ? "border-[var(--turquoise)]/20 bg-[var(--turquoise)]/5 text-[var(--turquoise)] opacity-60"
                    : "border-white/10 bg-white/[0.03] text-white/40",
              )}
              title={p.label || p.ipa_symbol}
            >
              {p.ipa_symbol.length <= 2 ? p.ipa_symbol : "·"}
            </button>
          );
        })}
      </div>
    </div>
  );
}
