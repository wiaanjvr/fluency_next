"use client";

import { useState, useEffect } from "react";
import {
  Ear,
  GitCompareArrows,
  Mic,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type {
  PronunciationModule,
  LanguageOption,
  SUPPORTED_LANGUAGES,
} from "@/types/pronunciation";

interface SelectionScreenProps {
  /** User's current target language */
  defaultLanguage: string;
  /** Called with the selected language + module */
  onSelect: (language: string, module: PronunciationModule) => void;
  /** Supported languages */
  languages: typeof SUPPORTED_LANGUAGES;
}

interface ModuleOption {
  key: PronunciationModule;
  name: string;
  description: string;
  Icon: React.ElementType;
}

const MODULES: ModuleOption[] = [
  {
    key: "sound_inventory",
    name: "Sound Inventory",
    description: "Learn the sounds that don't exist in English",
    Icon: Ear,
  },
  {
    key: "minimal_pairs",
    name: "Minimal Pairs",
    description: "Train your ear to distinguish similar sounds",
    Icon: GitCompareArrows,
  },
  {
    key: "shadowing",
    name: "Shadowing Studio",
    description: "Record, compare, and refine your pronunciation",
    Icon: Mic,
  },
];

export default function SelectionScreen({
  defaultLanguage,
  onSelect,
  languages,
}: SelectionScreenProps) {
  const [selectedLanguage, setSelectedLanguage] = useState(defaultLanguage);
  const [overallScore, setOverallScore] = useState<number | null>(null);
  const [phonemesPracticed, setPhonemesPracticed] = useState(0);
  const supabase = createClient();

  // Fetch progress for selected language
  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const res = await fetch(
          `/api/pronunciation/progress?language=${selectedLanguage}`,
        );
        if (res.ok) {
          const data = await res.json();
          setOverallScore(data.overall_score);
          setPhonemesPracticed(data.phonemes_practiced);
        }
      } catch {
        // Ignore — progress is optional
      }
    };

    fetchProgress();
  }, [selectedLanguage]);

  return (
    <div className="max-w-3xl mx-auto space-y-10">
      {/* Header */}
      <div className="space-y-3 text-center">
        <h1
          className="font-display text-4xl md:text-5xl font-bold tracking-tight"
          style={{ color: "var(--sand)" }}
        >
          Pronunciation Studio
        </h1>
        <p
          className="font-body text-base md:text-lg"
          style={{ color: "var(--seafoam)", opacity: 0.7 }}
        >
          Train your ear first. Then your mouth will follow.
        </p>
        <div
          className="h-px w-16 mx-auto mt-4"
          style={{
            background:
              "linear-gradient(90deg, transparent, var(--turquoise), transparent)",
          }}
        />
      </div>

      {/* Language selector */}
      <div className="space-y-3">
        <p
          className="text-xs font-body font-medium uppercase tracking-wider text-center"
          style={{ color: "var(--turquoise)", opacity: 0.6 }}
        >
          Choose language
        </p>
        <div className="flex justify-center gap-3">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setSelectedLanguage(lang.code)}
              className={cn(
                "flex items-center gap-2.5 px-5 py-3 rounded-xl border transition-all duration-300",
                "font-body text-sm",
                selectedLanguage === lang.code
                  ? "border-[var(--turquoise)]/50 bg-[var(--turquoise)]/10 shadow-[0_0_16px_rgba(61,214,181,0.1)]"
                  : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/5",
              )}
              style={{
                color:
                  selectedLanguage === lang.code
                    ? "var(--turquoise)"
                    : "var(--seafoam)",
              }}
            >
              <span className="text-xl">{lang.flag}</span>
              <span>{lang.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Progress indicator */}
      {overallScore !== null && overallScore > 0 && (
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
              Pronunciation Score:{" "}
              <span
                className="font-semibold"
                style={{ color: "var(--turquoise)" }}
              >
                {overallScore}%
              </span>
            </span>
          </div>
          <span
            className="font-body text-xs"
            style={{ color: "var(--seafoam)", opacity: 0.5 }}
          >
            {phonemesPracticed} sounds practiced
          </span>
        </div>
      )}

      {/* Module cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {MODULES.map((mod) => (
          <button
            key={mod.key}
            onClick={() => onSelect(selectedLanguage, mod.key)}
            className={cn(
              "group relative rounded-2xl border border-white/10 p-6",
              "bg-gradient-to-br from-[#0d2137]/80 to-[#0a1628]/90",
              "transition-all duration-300 text-left",
              "hover:border-[var(--turquoise)]/30 hover:shadow-[0_0_20px_rgba(61,214,181,0.1)] hover:-translate-y-1",
            )}
          >
            {/* Icon */}
            <div
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all duration-300",
                "bg-white/5 group-hover:bg-[var(--turquoise)]/15",
              )}
            >
              <mod.Icon className="w-6 h-6 transition-colors duration-300 text-[var(--seafoam)] group-hover:text-[var(--turquoise)]" />
            </div>

            {/* Text */}
            <h3
              className="font-display text-base font-semibold mb-1"
              style={{ color: "var(--sand)" }}
            >
              {mod.name}
            </h3>
            <p
              className="font-body text-xs leading-relaxed mb-4"
              style={{ color: "var(--seafoam)", opacity: 0.7 }}
            >
              {mod.description}
            </p>

            {/* Start arrow */}
            <div
              className="flex items-center gap-1.5 text-xs font-body font-medium opacity-0 group-hover:opacity-100 transition-all duration-300"
              style={{ color: "var(--turquoise)" }}
            >
              <span>Start</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>

            {/* Subtle glow */}
            <div className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div
                className="absolute inset-0 rounded-2xl"
                style={{
                  background:
                    "radial-gradient(ellipse at top left, rgba(61,214,181,0.04) 0%, transparent 60%)",
                }}
              />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
