"use client";

import React, { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { SongLyricLine } from "@/types/songs";
import { tokenizeLine, lemmatizeGerman } from "@/lib/songs/processLyrics";

// ============================================================================
// LyricLine — renders a single lyric line with per-word highlight
// ============================================================================

interface LyricLineProps {
  line: SongLyricLine;
  userVocab: Set<string>;
  isActive: boolean;
  onWordClick: (word: string, lemma: string) => void;
}

export default function LyricLine({
  line,
  userVocab,
  isActive,
  onWordClick,
}: LyricLineProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Auto-scroll active line into view
  useEffect(() => {
    if (isActive && ref.current) {
      ref.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [isActive]);

  const tokens = tokenizeLine(line.text);
  // Keep original words for display (preserve casing / punctuation between tokens)
  const displayWords = line.text.split(/\s+/).filter((w) => w.length > 0);

  return (
    <div
      ref={ref}
      className={cn(
        "px-4 py-2 rounded-lg transition-all duration-300 ease-out",
        isActive
          ? "opacity-100 scale-[1.02] bg-white/[0.05]"
          : "opacity-40 scale-100",
      )}
    >
      <p className="flex flex-wrap gap-x-1.5 gap-y-0.5 leading-relaxed">
        {displayWords.map((displayWord, idx) => {
          // Get the cleaned token & lemma for this position
          const cleanToken =
            idx < tokens.length ? tokens[idx] : displayWord.toLowerCase();
          const lemma = lemmatizeGerman(cleanToken);
          const isKnown = userVocab.has(lemma);

          return (
            <span
              key={`${line.line_index}-${idx}`}
              role="button"
              tabIndex={isActive ? 0 : -1}
              onClick={() => {
                if (!isKnown) onWordClick(cleanToken, lemma);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isKnown) {
                  onWordClick(cleanToken, lemma);
                }
              }}
              className={cn(
                "inline-block transition-colors duration-200 rounded px-0.5",
                isKnown
                  ? "text-white/90"
                  : "text-amber-300 underline decoration-amber-400/60 decoration-2 underline-offset-2 cursor-pointer hover:bg-amber-400/20",
                isActive ? "text-lg md:text-xl" : "text-base md:text-lg",
              )}
            >
              {displayWord}
            </span>
          );
        })}
      </p>
    </div>
  );
}
