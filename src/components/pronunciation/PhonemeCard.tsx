"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import IPASymbol from "./IPASymbol";
import AudioButton from "./AudioButton";
import type { Phoneme } from "@/types/pronunciation";

interface PhonemeCardProps {
  phoneme: Phoneme;
  /** Whether the user has marked this as "familiar" */
  familiar?: boolean;
  /** Called when familiar toggle is changed */
  onToggleFamiliar?: (phonemeId: string, familiar: boolean) => void;
  /** Pronunciation language for TTS */
  language: string;
  /** Additional class names */
  className?: string;
}

export default function PhonemeCard({
  phoneme,
  familiar = false,
  onToggleFamiliar,
  language,
  className,
}: PhonemeCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={cn(
        "rounded-2xl border transition-all duration-300",
        "bg-gradient-to-br from-[#0d2137]/80 to-[#0a1628]/90",
        familiar
          ? "border-[var(--turquoise)]/30"
          : "border-white/10 hover:border-white/20",
        className,
      )}
    >
      {/* Main card content */}
      <div className="p-6 flex flex-col items-center gap-4">
        {/* IPA Symbol */}
        <IPASymbol symbol={phoneme.ipa_symbol} size="xl" />

        {/* Label */}
        <p
          className="font-display text-base font-semibold text-center"
          style={{ color: "var(--sand)" }}
        >
          {phoneme.label}
        </p>

        {/* Play button */}
        <AudioButton
          src={phoneme.audio_url}
          text={phoneme.example_words?.[0]?.word || phoneme.ipa_symbol}
          language={language}
          size="lg"
        />

        {/* Native equivalent hint */}
        {phoneme.native_language_equivalent && (
          <p
            className="text-xs font-body text-center"
            style={{ color: "var(--seafoam)", opacity: 0.6 }}
          >
            Similar to: {phoneme.native_language_equivalent}
          </p>
        )}

        {/* Expand button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 text-xs font-body transition-colors hover:opacity-100 opacity-60"
          style={{ color: "var(--turquoise)" }}
        >
          <span>{expanded ? "Less detail" : "How to pronounce"}</span>
          {expanded ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Expandable section */}
      {expanded && (
        <div
          className="border-t border-white/5 px-6 py-5 space-y-4"
          style={{
            animation: "fadeIn 0.2s ease-out",
          }}
        >
          {/* Articulation description */}
          {phoneme.description && (
            <p
              className="text-sm font-body leading-relaxed"
              style={{ color: "var(--seafoam)", opacity: 0.8 }}
            >
              {phoneme.description}
            </p>
          )}

          {/* Example words */}
          {phoneme.example_words && phoneme.example_words.length > 0 && (
            <div className="space-y-2">
              <p
                className="text-xs font-body font-medium uppercase tracking-wider"
                style={{ color: "var(--turquoise)", opacity: 0.6 }}
              >
                Example words
              </p>
              <div className="space-y-2">
                {phoneme.example_words.map((ex, i) => (
                  <div key={i} className="flex items-center gap-3 py-1.5">
                    <AudioButton
                      src={ex.audio_url || null}
                      text={ex.word}
                      language={language}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <span
                        className="font-display text-sm font-semibold"
                        style={{ color: "var(--sand)" }}
                      >
                        {ex.word}
                      </span>
                      {ex.translation && (
                        <span
                          className="ml-2 text-xs font-body"
                          style={{ color: "var(--seafoam)", opacity: 0.5 }}
                        >
                          — {ex.translation}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Familiarity toggle */}
      <div className="border-t border-white/5 px-6 py-3">
        <button
          onClick={() => onToggleFamiliar?.(phoneme.id, !familiar)}
          className={cn(
            "flex items-center gap-2 w-full text-xs font-body transition-all duration-200",
            familiar ? "opacity-100" : "opacity-50 hover:opacity-80",
          )}
          style={{ color: familiar ? "var(--turquoise)" : "var(--seafoam)" }}
        >
          {familiar ? (
            <Check className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          <span>{familiar ? "Familiar" : "Needs work"}</span>
        </button>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
