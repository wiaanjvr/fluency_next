"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ArrowLeft, BookOpen, Type } from "lucide-react";

interface ReadingHeaderProps {
  title: string;
  cefrLevel: string;
  wordCount: number;
  isLoading: boolean;
  fontSizeIndex: number;
  onCycleFontSize: () => void;
  onNewText: () => void;
  /** Global known‑word count for the target language */
  knownWordsCount?: number;
}

/**
 * Reading header — editorial, glassy bar.
 * Cormorant title, muted pills, ONE turquoise touch (known words).
 */
export function ReadingHeader({
  title,
  cefrLevel,
  wordCount,
  isLoading,
  fontSizeIndex,
  onCycleFontSize,
  onNewText,
  knownWordsCount,
}: ReadingHeaderProps) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const modalRef = useRef<HTMLDivElement>(null);

  // ─── Scroll progress tracking ───────────────────────────────────

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) {
        setScrollProgress(0);
        return;
      }
      setScrollProgress(Math.min(1, scrollTop / docHeight));
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ─── New text modal handlers ────────────────────────────────────

  const handleBookClick = useCallback(() => {
    if (isLoading) return;
    setShowConfirmModal(true);
  }, [isLoading]);

  const handleConfirmNewText = useCallback(() => {
    setShowConfirmModal(false);
    onNewText();
  }, [onNewText]);

  const handleKeepReading = useCallback(() => {
    setShowConfirmModal(false);
  }, []);

  // Close modal on backdrop click
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      setShowConfirmModal(false);
    }
  }, []);

  // Close modal on Escape
  useEffect(() => {
    if (!showConfirmModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowConfirmModal(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showConfirmModal]);

  // Font size label for accessibility
  const fontSizeLabels = ["Small", "Medium", "Large", "Extra Large"];

  return (
    <>
      <div className="sticky top-0 z-40 backdrop-blur-[20px] bg-[rgba(10,15,30,0.75)] border-b border-white/[0.06]">
        <div className="max-w-2xl mx-auto flex items-center justify-between px-4 py-3">
          {/* Left: back arrow */}
          <Link
            href="/propel"
            className="flex items-center gap-2 text-[var(--seafoam)] hover:text-[var(--sand)] transition-colors duration-300"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="sr-only">Back to Propel</span>
          </Link>

          {/* Center: title + pills + known words */}
          <div className="flex items-center gap-2.5 flex-1 min-w-0 justify-center">
            {!isLoading && title && (
              <>
                <h1 className="font-display text-xl text-[var(--sand)] truncate max-w-[180px] md:max-w-[280px]">
                  {title}
                </h1>
                {/* Word count pill */}
                {wordCount > 0 && (
                  <span className="shrink-0 bg-white/[0.06] border border-white/10 rounded-full px-3 py-0.5 text-xs font-body text-[var(--seafoam)]">
                    {wordCount} words
                  </span>
                )}
                {/* CEFR pill */}
                <span className="shrink-0 bg-white/[0.06] border border-white/10 rounded-full px-3 py-0.5 text-xs font-body text-[var(--seafoam)]">
                  {cefrLevel}
                </span>
              </>
            )}
            {/* Known words counter — the ONE turquoise accent */}
            {knownWordsCount !== undefined && knownWordsCount > 0 && (
              <div className="flex items-center gap-1.5 text-sm font-body shrink-0">
                <BookOpen className="w-4 h-4 text-[#3dd6b5]" />
                <span>
                  <span className="text-[#3dd6b5] font-semibold">
                    {knownWordsCount.toLocaleString()}
                  </span>{" "}
                  <span className="text-[var(--seafoam)]">known words</span>
                </span>
              </div>
            )}
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleBookClick}
              disabled={isLoading}
              className={cn(
                "p-2 rounded-lg text-[var(--seafoam)]/50 hover:text-[var(--seafoam)]",
                "transition-all duration-300",
                isLoading && "opacity-30 cursor-not-allowed",
              )}
              aria-label="Generate new text"
              title="New text"
            >
              <BookOpen className="w-5 h-5" />
            </button>
            <button
              onClick={onCycleFontSize}
              className={cn(
                "relative p-2 rounded-lg text-[var(--seafoam)]/50 hover:text-[var(--seafoam)]",
                "transition-all duration-300",
              )}
              aria-label={`Font size: ${fontSizeLabels[fontSizeIndex]}`}
              title={`Font size: ${fontSizeLabels[fontSizeIndex]}`}
            >
              <Type className="w-5 h-5" />
              {/* Small dot indicator for current size */}
              <span
                className={cn(
                  "absolute bottom-1 right-1 w-1 h-1 rounded-full bg-[#3dd6b5]/60",
                  "transition-transform duration-300",
                  fontSizeIndex === 0 && "scale-50",
                  fontSizeIndex === 1 && "scale-75",
                  fontSizeIndex === 2 && "scale-100",
                  fontSizeIndex === 3 && "scale-125",
                )}
              />
            </button>
          </div>
        </div>

        {/* Scroll progress bar */}
        <div className="h-0.5 w-full bg-transparent">
          <div
            className="h-full bg-[#3dd6b5]/60 transition-[width] duration-150 ease-out"
            style={{ width: `${scrollProgress * 100}%` }}
          />
        </div>
      </div>

      {/* ═══ New Text Confirmation Modal ═══ */}
      {showConfirmModal && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center px-4"
          onClick={handleBackdropClick}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Modal card */}
          <div
            ref={modalRef}
            className={cn(
              "relative bg-[#0d1b2a] border border-white/[0.08] rounded-2xl",
              "p-6 max-w-sm w-full space-y-4",
              "shadow-[0_8px_40px_rgba(0,0,0,0.6),0_0_0_1px_rgba(61,214,181,0.06)]",
              "animate-in fade-in zoom-in-95 duration-300",
            )}
          >
            <h3 className="font-display text-xl text-[var(--sand)] text-center">
              Start a new text?
            </h3>
            <p className="text-sm text-[var(--seafoam)]/70 font-body text-center leading-relaxed">
              Your progress on this one will be saved.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleKeepReading}
                className={cn(
                  "flex-1 py-3 rounded-xl font-body text-sm font-medium",
                  "bg-white/[0.04] text-[var(--seafoam)] hover:bg-white/[0.08]",
                  "border border-white/10 transition-all duration-300",
                )}
              >
                Keep Reading
              </button>
              <button
                onClick={handleConfirmNewText}
                className={cn(
                  "flex-1 py-3 rounded-xl font-body text-sm font-medium",
                  "bg-[#3dd6b5]/10 text-[#3dd6b5] hover:bg-[#3dd6b5]/20",
                  "border border-[#3dd6b5]/20 transition-all duration-300",
                )}
              >
                New Dive
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
