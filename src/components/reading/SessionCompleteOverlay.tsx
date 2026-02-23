"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle } from "lucide-react";

interface SessionCompleteOverlayProps {
  /** Whether the overlay should be visible */
  isVisible: boolean;
  /** Number of new/unknown words encountered in this text */
  newWordsCount: number;
  /** Number of words marked as known during this session */
  markedKnownCount: number;
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
  newWordsCount,
  markedKnownCount,
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
        "bg-[#0a1628]/95 backdrop-blur-sm",
        "transition-opacity duration-500 ease-out",
        isVisible ? "opacity-100" : "opacity-0 pointer-events-none",
      )}
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
        {/* Animated teal checkmark */}
        <div
          className={cn(
            "mb-8 transition-transform duration-500 ease-out",
            showContent ? "scale-100" : "scale-0",
          )}
        >
          <div className="relative">
            {/* Outer glow ring */}
            <div className="absolute inset-0 rounded-full bg-teal-400/20 animate-ping" />
            <CheckCircle className="w-20 h-20 text-teal-400 relative z-10" />
          </div>
        </div>

        {/* Title */}
        <h2 className="font-display text-4xl text-white mb-3 tracking-wide">
          You&apos;ve surfaced.
        </h2>

        {/* Stats subtitle */}
        <p className="text-base text-gray-400 font-body leading-relaxed mb-10">
          {newWordsCount > 0 && (
            <>
              {newWordsCount} new word{newWordsCount !== 1 ? "s" : ""}{" "}
              encountered.
            </>
          )}
          {markedKnownCount > 0 && <> {markedKnownCount} marked as known.</>}
          {newWordsCount === 0 && markedKnownCount === 0 && (
            <>Great reading session!</>
          )}
        </p>

        {/* Action buttons */}
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={onDiveAgain}
            className={cn(
              "w-full py-3.5 rounded-xl font-body text-sm font-medium",
              "bg-teal-400 text-[#0a1628] hover:bg-teal-300",
              "transition-all duration-300 active:scale-[0.98]",
              "shadow-[0_0_20px_rgba(45,212,191,0.3)]",
            )}
          >
            Dive Again
          </button>
          <button
            onClick={onReturnToPropel}
            className={cn(
              "w-full py-3.5 rounded-xl font-body text-sm font-medium",
              "bg-transparent text-gray-400 hover:text-white",
              "border border-white/10 hover:border-white/20",
              "transition-all duration-300",
            )}
          >
            Return to Propel
          </button>
        </div>
      </div>
    </div>
  );
}
