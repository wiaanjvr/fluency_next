"use client";

import { useState, useEffect } from "react";
import { Layers, Plus, Play, ChevronRight, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FlashcardOnboardingProps {
  onDismiss: () => void;
  onCreateDeck: () => void;
}

const STEPS = [
  {
    icon: Layers,
    title: "Create a Deck",
    description:
      "Organize your flashcards into decks by topic, level, or language. Each deck has its own daily limits.",
  },
  {
    icon: Plus,
    title: "Add Cards",
    description:
      "Type cards manually, import from CSV, or load an Anki .apkg file. Cards captured from Cloze or Reading also land here.",
  },
  {
    icon: Play,
    title: "Study & Review",
    description:
      "Choose Classic Flip, Type Answer, or Multiple Choice. FSRS-4.5 schedules each card at the optimal moment for long-term retention.",
  },
  {
    icon: Sparkles,
    title: "Connected Learning",
    description:
      "Every review syncs with your knowledge graph. Words you drill here get prioritized in future stories and exercises.",
  },
];

const STORAGE_KEY = "flashcards-onboarding-seen";

export function FlashcardOnboarding({
  onDismiss,
  onCreateDeck,
}: FlashcardOnboardingProps) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      setVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, "true");
    }
    setVisible(false);
    onDismiss();
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      handleDismiss();
      onCreateDeck();
    }
  };

  if (!visible) return null;

  const current = STEPS[step];
  const Icon = current.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleDismiss}
      />

      <div
        className={cn(
          "relative z-10 w-full max-w-sm rounded-2xl border border-white/10",
          "bg-[#0d2137] p-8 shadow-2xl text-center",
          "animate-in slide-in-from-bottom-4 fade-in duration-500",
        )}
      >
        {/* Close */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 rounded-lg p-1.5 text-white/30 hover:text-white/60 transition"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Icon */}
        <div className="w-14 h-14 rounded-2xl bg-teal-500/15 flex items-center justify-center mx-auto mb-5">
          <Icon className="h-7 w-7 text-teal-400" />
        </div>

        {/* Content */}
        <h3
          className="font-display text-xl font-bold mb-2"
          style={{ color: "var(--sand)" }}
        >
          {current.title}
        </h3>
        <p className="text-sm text-white/50 leading-relaxed mb-8">
          {current.description}
        </p>

        {/* Step indicators */}
        <div className="flex justify-center gap-1.5 mb-6">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all duration-500",
                i === step
                  ? "w-6 bg-teal-400"
                  : i < step
                    ? "w-1.5 bg-teal-400/40"
                    : "w-1.5 bg-white/10",
              )}
            />
          ))}
        </div>

        {/* Action */}
        <div className="flex gap-3 justify-center">
          <button
            onClick={handleDismiss}
            className="px-4 py-2.5 rounded-xl text-sm text-white/40 hover:text-white/60 transition"
          >
            Skip
          </button>
          <button
            onClick={handleNext}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl",
              "bg-teal-500 hover:bg-teal-400 text-[#0a1628] font-medium text-sm",
              "transition shadow-lg shadow-teal-500/20",
            )}
          >
            {step === STEPS.length - 1 ? "Create First Deck" : "Next"}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/** Hook to check if onboarding should be shown */
export function useFlashcardOnboarding() {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const seen = localStorage.getItem(STORAGE_KEY);
      setShouldShow(!seen);
    }
  }, []);

  return shouldShow;
}
