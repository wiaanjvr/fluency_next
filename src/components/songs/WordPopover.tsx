"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { X, BookOpen } from "lucide-react";

// ============================================================================
// WordPopover — shows word info and a "Mark as learning" action
// ============================================================================

interface WordPopoverProps {
  word: string;
  lemma: string;
  onClose: () => void;
  onMarkAsLearning: (lemma: string) => void;
  isMarked?: boolean;
}

export default function WordPopover({
  word,
  lemma,
  onClose,
  onMarkAsLearning,
  isMarked = false,
}: WordPopoverProps) {
  return (
    <div
      className={cn(
        "fixed inset-x-4 bottom-24 z-50 mx-auto max-w-sm",
        "rounded-2xl border border-white/10",
        "bg-gradient-to-b from-[#0e2340]/95 to-[#091527]/98",
        "backdrop-blur-xl shadow-2xl shadow-black/40",
        "p-5 animate-in slide-in-from-bottom-4 fade-in duration-300",
      )}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-3 right-3 p-1 rounded-full text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors"
        aria-label="Close"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Word display */}
      <div className="mb-3">
        <h3 className="text-xl font-semibold text-amber-300">{word}</h3>
        {lemma !== word && (
          <p className="text-sm text-white/50 mt-0.5">
            Lemma: <span className="text-white/70">{lemma}</span>
          </p>
        )}
      </div>

      {/* Definition placeholder */}
      <div className="mb-4 rounded-xl bg-white/[0.04] border border-white/[0.06] p-3">
        <p className="text-sm text-white/60 italic">
          {/* TODO: Wire up a dictionary API (e.g. dict.cc, Linguee, or Wiktionary) */}
          Definition will appear here once dictionary integration is connected.
        </p>
      </div>

      {/* Action button */}
      <button
        onClick={() => onMarkAsLearning(lemma)}
        disabled={isMarked}
        className={cn(
          "w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl",
          "text-sm font-medium transition-all duration-200",
          isMarked
            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-default"
            : "bg-amber-500/20 text-amber-200 border border-amber-500/30 hover:bg-amber-500/30 hover:border-amber-400/40",
        )}
      >
        <BookOpen className="w-4 h-4" />
        {isMarked ? "Added to learning queue" : "Mark as learning"}
      </button>
    </div>
  );
}
