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
}

/**
 * Reading header with title, CEFR badge, actions, and scroll progress bar.
 * BookOpen opens a "New Text" confirmation modal.
 * Type icon cycles font size (persisted to localStorage by parent).
 */
export function ReadingHeader({
  title,
  cefrLevel,
  wordCount,
  isLoading,
  fontSizeIndex,
  onCycleFontSize,
  onNewText,
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
      <div className="sticky top-0 z-40 bg-[#0a1628]/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-2xl mx-auto flex items-center justify-between px-4 py-3">
          {/* Left: back arrow */}
          <Link
            href="/propel"
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors duration-300"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="sr-only">Back to Propel</span>
          </Link>

          {/* Center: title + level badge + word count */}
          <div className="flex items-center gap-2 flex-1 min-w-0 justify-center">
            {!isLoading && title && (
              <>
                <h1 className="font-display text-base md:text-lg text-white truncate max-w-[180px] md:max-w-[280px]">
                  {title}
                </h1>
                <span className="shrink-0 px-2 py-0.5 text-xs font-body font-medium text-teal-400 bg-teal-400/10 rounded-md border border-teal-400/20">
                  {wordCount > 0
                    ? `${wordCount} words · ${cefrLevel}`
                    : cefrLevel}
                </span>
              </>
            )}
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleBookClick}
              disabled={isLoading}
              className={cn(
                "p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5",
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
                "relative p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5",
                "transition-all duration-300",
              )}
              aria-label={`Font size: ${fontSizeLabels[fontSizeIndex]}`}
              title={`Font size: ${fontSizeLabels[fontSizeIndex]}`}
            >
              <Type className="w-5 h-5" />
              {/* Small dot indicator for current size */}
              <span
                className={cn(
                  "absolute bottom-1 right-1 w-1 h-1 rounded-full bg-teal-400/60",
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
            className="h-full bg-teal-400 transition-[width] duration-150 ease-out"
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
              "relative bg-[#0d2137] border border-white/10 rounded-2xl",
              "p-6 max-w-sm w-full space-y-4",
              "shadow-[0_8px_40px_rgba(0,0,0,0.5)]",
              "animate-in fade-in zoom-in-95 duration-300",
            )}
          >
            <h3 className="font-display text-xl text-white text-center">
              Start a new text?
            </h3>
            <p className="text-sm text-gray-400 font-body text-center leading-relaxed">
              Your progress on this one will be saved.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleKeepReading}
                className={cn(
                  "flex-1 py-3 rounded-xl font-body text-sm font-medium",
                  "bg-white/5 text-gray-300 hover:bg-white/10",
                  "border border-white/10 transition-all duration-300",
                )}
              >
                Keep Reading
              </button>
              <button
                onClick={handleConfirmNewText}
                className={cn(
                  "flex-1 py-3 rounded-xl font-body text-sm font-medium",
                  "bg-teal-400/20 text-teal-400 hover:bg-teal-400/30",
                  "border border-teal-400/20 transition-all duration-300",
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
