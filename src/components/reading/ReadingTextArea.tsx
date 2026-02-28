"use client";

import React, { useCallback, useEffect, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";
import { cleanGeneratedText, detectSentences } from "@/lib/reading-utils";
import type { ReadingToken } from "@/lib/reading-utils";
import { Languages, Loader2 } from "lucide-react";

interface ReadingTextAreaProps {
  tokens: ReadingToken[];
  /** Index of the word currently being spoken */
  highlightedWordIndex: number | null;
  /** Range of indices in the currently-spoken sentence */
  highlightedSentence: { startIndex: number; endIndex: number } | null;
  /** Callback when user taps/clicks a word (rect included for popup positioning) */
  onWordClick: (token: ReadingToken, rect?: DOMRect) => void;
  /** Font size multiplier (1 = default) */
  fontSize: number;
  /** Index of the currently selected/tapped word (for visual feedback) */
  selectedWordIndex?: number | null;
  /** Colour‑class resolver from useReadingSession (blue / yellow / white) */
  getWordClass?: (token: ReadingToken) => string;
  /** Opacity resolver for learning words (confidence‑based) */
  getWordOpacity?: (token: ReadingToken) => number | undefined;
  /** Cached sentence translations keyed by sentence index */
  sentenceTranslations?: Map<number, string>;
  /** Indices of sentences currently being translated */
  translatingIndices?: Set<number>;
  /** Request a sentence translation */
  onSentenceTranslate?: (sentenceIndex: number, text: string) => void;
  /** Whether karaoke highlight syncing is active */
  karaokeEnabled?: boolean;
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
 * Renders tokenized reading text — immersive, editorial Cormorant Garamond italic.
 * Colour-coded vocabulary words, karaoke highlights, sentence translation,
 * decorative gradient drop cap.
 */
export function ReadingTextArea({
  tokens,
  highlightedWordIndex,
  highlightedSentence,
  onWordClick,
  fontSize,
  selectedWordIndex = null,
  getWordClass,
  getWordOpacity,
  sentenceTranslations,
  translatingIndices,
  onSentenceTranslate,
  karaokeEnabled = true,
}: ReadingTextAreaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const highlightedRef = useRef<HTMLSpanElement>(null);

  // Smooth-scroll the currently highlighted word into view (karaoke)
  useEffect(() => {
    if (karaokeEnabled && highlightedRef.current) {
      highlightedRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });
    }
  }, [highlightedWordIndex, karaokeEnabled]);

  const handleWordClick = useCallback(
    (token: ReadingToken, e: React.MouseEvent) => {
      if (token.punctuation) return;
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      onWordClick(token, rect);
    },
    [onWordClick],
  );

  // Find first non-punctuation token for drop cap
  const firstWordToken = tokens.find((t) => !t.punctuation);
  const firstWordIndex = firstWordToken?.index ?? -1;

  // ─── Group tokens into sentences ─────────────────────────────────

  const sentenceGroups = useMemo(() => {
    const sents = detectSentences(tokens);
    return sents.map((s, idx) => ({
      tokens: tokens.slice(s.startIndex, s.endIndex + 1),
      startIndex: s.startIndex,
      endIndex: s.endIndex,
      index: idx,
      text: tokens
        .slice(s.startIndex, s.endIndex + 1)
        .map((t) => t.word)
        .join(" ")
        .replace(/ ([.,!?;:])/g, "$1"),
    }));
  }, [tokens]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "font-display not-italic max-w-2xl mx-auto",
        "px-8 md:px-12",
        "pt-16 pb-32",
        "animate-fade-in",
      )}
      style={{
        color: "var(--sand)",
        fontSize: `${1.3 * fontSize}rem`,
        lineHeight: "1.95",
        letterSpacing: "0.01em",
      }}
    >
      {sentenceGroups.map((group) => (
        <React.Fragment key={group.index}>
          {group.tokens.map((token, i) => {
            const isHighlighted =
              karaokeEnabled && highlightedWordIndex === token.index;
            const isSelected = selectedWordIndex === token.index;
            const isInSentence =
              karaokeEnabled &&
              highlightedSentence &&
              token.index >= highlightedSentence.startIndex &&
              token.index <= highlightedSentence.endIndex;

            const displayWord = cleanGeneratedText(token.word);

            // Space logic: first token of the whole text gets none
            const globalFirst = group.index === 0 && i === 0;
            const needsSpace =
              !globalFirst &&
              !NO_SPACE_BEFORE.has(displayWord) &&
              token.spaceBefore !== false;

            // Colour coding from vocabMap
            const wordClass = getWordClass?.(token);
            const opacity = getWordOpacity?.(token);

            // ── Drop cap: first letter of the first word ──
            if (token.index === firstWordIndex && displayWord.length > 0) {
              const firstLetter = displayWord[0];
              const rest = displayWord.slice(1);
              return (
                <span key={token.index}>
                  {needsSpace && " "}
                  <span
                    ref={isHighlighted ? highlightedRef : undefined}
                    onClick={(e) => handleWordClick(token, e)}
                    className="cursor-pointer"
                  >
                    <span
                      className="float-left font-display not-italic leading-[0.85] mr-2"
                      style={{
                        fontSize: "5.5rem",
                        background: "linear-gradient(180deg, #3dd6b5, #1e6b72)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                      }}
                    >
                      {firstLetter}
                    </span>
                    <span
                      className={cn(
                        "transition-colors duration-150 rounded-sm px-[1px]",
                        wordClass ||
                          cn(
                            "cursor-pointer hover:border-b hover:border-current hover:border-dotted",
                            token.is_new &&
                              !token.is_known &&
                              !isHighlighted &&
                              !isSelected &&
                              "text-[#7dd3fc]",
                          ),
                        isHighlighted && "bg-[#3dd6b5]/15 rounded px-0.5",
                        isSelected &&
                          !isHighlighted &&
                          "bg-[#3dd6b5]/20 rounded px-0.5",
                      )}
                      style={opacity !== undefined ? { opacity } : undefined}
                    >
                      {rest}
                    </span>
                  </span>
                </span>
              );
            }

            // ── Punctuation: plain span, no interaction ──
            if (token.punctuation) {
              return (
                <span
                  key={token.index}
                  className={cn(
                    "text-[var(--seafoam)]/40 transition-colors duration-300",
                    isInSentence && !isHighlighted && "text-[var(--sand)]/80",
                  )}
                >
                  {needsSpace && " "}
                  {displayWord}
                </span>
              );
            }

            // ── Regular word ──
            return (
              <span key={token.index}>
                {needsSpace && " "}
                <span
                  ref={isHighlighted ? highlightedRef : undefined}
                  onClick={(e) => handleWordClick(token, e)}
                  className={cn(
                    "transition-colors duration-150 rounded-sm px-[1px] cursor-pointer",
                    "hover:border-b hover:border-current hover:border-dotted",
                    wordClass ||
                      cn(
                        token.is_new &&
                          !token.is_known &&
                          !isHighlighted &&
                          !isSelected &&
                          "text-[#7dd3fc]",
                        !isHighlighted &&
                          !isSelected &&
                          isInSentence &&
                          "text-[var(--sand)]/80",
                      ),
                    isHighlighted && "bg-[#3dd6b5]/15 rounded px-0.5",
                    isSelected &&
                      !isHighlighted &&
                      "bg-[#3dd6b5]/20 rounded px-0.5",
                  )}
                  style={opacity !== undefined ? { opacity } : undefined}
                >
                  {displayWord}
                </span>
              </span>
            );
          })}

          {/* ── Sentence translate button (subtle Languages icon) ── */}
          {onSentenceTranslate && (
            <button
              className={cn(
                "inline-flex items-center align-baseline ml-1.5 transition-opacity duration-200",
                sentenceTranslations?.has(group.index)
                  ? "text-[var(--seafoam)]/50"
                  : "text-[var(--seafoam)]/30 hover:text-[var(--seafoam)]/70",
              )}
              onClick={(e) => {
                e.stopPropagation();
                onSentenceTranslate(group.index, group.text);
              }}
              title="Translate sentence"
            >
              <Languages className="w-3.5 h-3.5" />
            </button>
          )}

          {/* ── Loading indicator ── */}
          {translatingIndices?.has(group.index) && (
            <span className="block mt-1 mb-2 pl-2">
              <Loader2 className="w-3.5 h-3.5 text-[var(--seafoam)]/40 animate-spin" />
            </span>
          )}

          {/* ── Translation display ── */}
          {sentenceTranslations?.has(group.index) && (
            <p className="text-sm font-body text-[var(--seafoam)] opacity-70 mt-1 mb-3 pl-4 border-l-2 border-[#3dd6b5]/20 tracking-wide">
              {sentenceTranslations.get(group.index)}
            </p>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
