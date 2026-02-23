"use client";

import { useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { cleanGeneratedText } from "@/lib/reading-utils";
import type { ReadingToken } from "@/lib/reading-utils";

interface ReadingTextAreaProps {
  tokens: ReadingToken[];
  /** Index of the word currently being spoken */
  highlightedWordIndex: number | null;
  /** Range of indices in the currently-spoken sentence */
  highlightedSentence: { startIndex: number; endIndex: number } | null;
  /** Callback when user taps/clicks a word */
  onWordClick: (token: ReadingToken) => void;
  /** Font size multiplier (1 = default) */
  fontSize: number;
  /** Index of the currently selected/tapped word (for visual feedback) */
  selectedWordIndex?: number | null;
}

/** Punctuation that should have NO space before it */
const NO_SPACE_BEFORE = new Set([
  ".",
  ",",
  "!",
  "?",
  ";",
  ":",
  ")",
  "]",
  "»",
  "'",
]);

/**
 * Renders the tokenized reading text as tappable word spans
 * with audio-synced highlighting. Uses Cormorant Garamond for
 * an immersive, warm, unhurried reading experience.
 *
 * FIX: per-word underlines (not per-line), inline spans, drop cap,
 * vignette overlay, fade-in animation.
 */
export function ReadingTextArea({
  tokens,
  highlightedWordIndex,
  highlightedSentence,
  onWordClick,
  fontSize,
  selectedWordIndex = null,
}: ReadingTextAreaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const highlightedRef = useRef<HTMLSpanElement>(null);

  // Smooth-scroll the currently highlighted word into view
  useEffect(() => {
    if (highlightedRef.current) {
      highlightedRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });
    }
  }, [highlightedWordIndex]);

  const handleWordClick = useCallback(
    (token: ReadingToken) => {
      if (token.punctuation) return;
      onWordClick(token);
    },
    [onWordClick],
  );

  // Compute text size class based on fontSize multiplier
  const textSizeClass =
    fontSize <= 0.85
      ? "text-lg md:text-lg"
      : fontSize <= 1
        ? "text-lg md:text-xl"
        : fontSize <= 1.15
          ? "text-xl md:text-2xl"
          : "text-2xl md:text-3xl";

  // Find first non-punctuation token for drop cap
  const firstWordToken = tokens.find((t) => !t.punctuation);
  const firstWordIndex = firstWordToken?.index ?? -1;

  return (
    <>
      {/* Vignette overlay */}
      <div
        className="pointer-events-none fixed inset-0 bg-gradient-to-b from-[#0a1628] via-transparent to-[#0a1628] opacity-30 z-10"
        aria-hidden
      />

      <div
        ref={containerRef}
        className={cn(
          "font-display max-w-2xl mx-auto",
          "px-6 md:px-12",
          "pt-8 pb-44",
          "leading-[1.95] tracking-wide",
          textSizeClass,
          // Fade-in animation
          "animate-fade-in",
        )}
        style={{ color: "#f0ebe0" }}
      >
        {tokens.map((token, i) => {
          const isHighlighted = highlightedWordIndex === token.index;
          const isSelected = selectedWordIndex === token.index;
          const isInSentence =
            highlightedSentence &&
            token.index >= highlightedSentence.startIndex &&
            token.index <= highlightedSentence.endIndex;

          // Clean the displayed word (safeguard against residual markdown)
          const displayWord = cleanGeneratedText(token.word);

          // Determine if we should add a space before this token
          const needsSpace =
            i > 0 &&
            !NO_SPACE_BEFORE.has(displayWord) &&
            token.spaceBefore !== false;

          // ── Drop cap: first letter of the first word ──
          if (token.index === firstWordIndex && displayWord.length > 0) {
            const firstLetter = displayWord[0];
            const rest = displayWord.slice(1);
            return (
              <span key={token.index}>
                {needsSpace && " "}
                <span
                  ref={isHighlighted ? highlightedRef : undefined}
                  onClick={() => handleWordClick(token)}
                  className="cursor-pointer"
                >
                  <span className="float-left text-7xl leading-[0.85] mr-2 text-teal-400 font-display">
                    {firstLetter}
                  </span>
                  <span
                    className={cn(
                      "cursor-pointer transition-colors duration-150",
                      "hover:bg-white/10 rounded-sm px-[1px]",
                      token.is_new &&
                        !token.is_known &&
                        !isHighlighted &&
                        !isSelected &&
                        "border-b-2 border-teal-400/60",
                      isHighlighted && "bg-teal-400/20",
                      isSelected && !isHighlighted && "bg-teal-400/30",
                    )}
                  >
                    {rest}
                  </span>
                </span>
              </span>
            );
          }

          // ── Punctuation: plain inline span, no interaction ──
          if (token.punctuation) {
            return (
              <span
                key={token.index}
                className={cn(
                  "transition-colors duration-300",
                  isInSentence && !isHighlighted && "text-white/90",
                )}
              >
                {needsSpace && " "}
                {displayWord}
              </span>
            );
          }

          // ── Regular word ──
          const isNew = token.is_new && !token.is_known;

          return (
            <span key={token.index}>
              {needsSpace && " "}
              <span
                ref={isHighlighted ? highlightedRef : undefined}
                onClick={() => handleWordClick(token)}
                className={cn(
                  "cursor-pointer transition-colors duration-150",
                  "hover:bg-white/10 rounded-sm px-[1px]",
                  isNew &&
                    !isHighlighted &&
                    !isSelected &&
                    "border-b-2 border-teal-400/60",
                  isHighlighted && "bg-teal-400/20",
                  isSelected && !isHighlighted && "bg-teal-400/30",
                  !isHighlighted &&
                    !isSelected &&
                    isInSentence &&
                    "text-white/90",
                  "hover:text-white",
                )}
              >
                {displayWord}
              </span>
            </span>
          );
        })}
      </div>
    </>
  );
}
