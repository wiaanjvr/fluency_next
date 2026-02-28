"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle } from "lucide-react";

interface SessionCompleteOverlayProps {
  /** Whether the overlay should be visible */
  isVisible: boolean;
  /** Total words read in this session (content token count) */
  wordsRead?: number;
  /** Number of new/unknown words encountered in this text */
  newWordsCount: number;
  /** Number of words marked as known during this session */
  markedKnownCount: number;
  /** Number of words looked up via the popup */
  wordsLookedUp?: number;
  /** Number of words added to flashcard deck */
  wordsAddedToDeck?: number;
  /** Callback to generate a new text at the same level */
  onDiveAgain: () => void;
  /** Callback to navigate back to Propel */
  onReturnToPropel: () => void;
}

/**
 * Full-screen overlay shown when the reading session ends
 * (audio finishes or user reaches end of text).
 * Animated scale-in checkmark, session stats, two action buttons.
 */
export function SessionCompleteOverlay({
  isVisible,
  wordsRead,
  newWordsCount,
  markedKnownCount,
  wordsLookedUp,
  wordsAddedToDeck,
  onDiveAgain,
  onReturnToPropel,
}: SessionCompleteOverlayProps) {
  const [showContent, setShowContent] = useState(false);

  // Stagger the content entrance after the overlay fades in
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => setShowContent(true), 200);
      return () => clearTimeout(timer);
    } else {
      setShowContent(false);
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[80] flex items-center justify-center px-6",
        "backdrop-blur-sm",
        "transition-opacity duration-500 ease-out",
        isVisible ? "opacity-100" : "opacity-0 pointer-events-none",
      )}
      style={{
        background:
          "radial-gradient(ellipse at 50% 0%, rgba(13,37,53,0.95) 0%, rgba(10,15,30,0.98) 60%)",
      }}
    >
      <div
        className={cn(
          "flex flex-col items-center text-center max-w-sm",
          "transition-all duration-500 ease-out",
          showContent
            ? "opacity-100 translate-y-0 scale-100"
            : "opacity-0 translate-y-4 scale-95",
        )}
      >
        {/* Animated turquoise checkmark */}
        <div
          className={cn(
            "mb-8 transition-transform duration-500 ease-out",
            showContent ? "scale-100" : "scale-0",
          )}
        >
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-[#3dd6b5]/15 animate-ping" />
            <CheckCircle className="w-20 h-20 text-[#3dd6b5] relative z-10" />
          </div>
        </div>

        {/* Title */}
        <h2 className="font-display text-4xl text-[var(--sand)] mb-3 tracking-wide">
          You&apos;ve surfaced.
        </h2>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3 w-full max-w-xs mb-10">
          {wordsRead !== undefined && wordsRead > 0 && (
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-center">
              <div className="text-xl font-semibold text-[#3dd6b5]">
                {wordsRead}
              </div>
              <div className="text-xs text-[var(--seafoam)]/60 font-body">
                Words read
              </div>
            </div>
          )}
          {newWordsCount > 0 && (
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-center">
              <div className="text-xl font-semibold text-[#3dd6b5]">
                {newWordsCount}
              </div>
              <div className="text-xs text-[var(--seafoam)]/60 font-body">
                New words
              </div>
            </div>
          )}
          {markedKnownCount > 0 && (
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-center">
              <div className="text-xl font-semibold text-[#3dd6b5]">
                {markedKnownCount}
              </div>
              <div className="text-xs text-[var(--seafoam)]/60 font-body">
                Marked known
              </div>
            </div>
          )}
          {wordsLookedUp !== undefined && wordsLookedUp > 0 && (
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-center">
              <div className="text-xl font-semibold text-[#3dd6b5]">
                {wordsLookedUp}
              </div>
              <div className="text-xs text-[var(--seafoam)]/60 font-body">
                Looked up
              </div>
            </div>
          )}
          {wordsAddedToDeck !== undefined && wordsAddedToDeck > 0 && (
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-center">
              <div className="text-xl font-semibold text-[#3dd6b5]">
                {wordsAddedToDeck}
              </div>
              <div className="text-xs text-[var(--seafoam)]/60 font-body">
                Added to deck
              </div>
            </div>
          )}
        </div>

        {/* Fallback if no stats at all */}
        {(!wordsRead || wordsRead === 0) &&
          newWordsCount === 0 &&
          markedKnownCount === 0 && (
            <p className="text-base text-[var(--seafoam)]/70 font-body leading-relaxed mb-10">
              Great reading session!
            </p>
          )}

        {/* Action buttons */}
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={onReturnToPropel}
            className={cn(
              "w-full py-3.5 rounded-xl font-body text-sm font-medium",
              "bg-[#3dd6b5] text-[#0a0f1e] hover:bg-[#3dd6b5]/90",
              "transition-all duration-300 active:scale-[0.98]",
            )}
          >
            Back to Propel
          </button>
          <button
            onClick={onDiveAgain}
            className={cn(
              "w-full py-3.5 rounded-xl font-body text-sm font-medium",
              "bg-transparent text-[var(--seafoam)] hover:text-[var(--sand)]",
              "border border-white/10 hover:border-white/20",
              "transition-all duration-300",
            )}
          >
            Read another story
          </button>
        </div>
      </div>
    </div>
  );
}
