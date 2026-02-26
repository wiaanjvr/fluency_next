"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, RefreshCw, HelpCircle } from "lucide-react";
import type { CorrectionType, InlineCorrection } from "@/types/dive-tank";

interface InlineCorrectionPopoverProps {
  text: string;
  onCorrection: (correction: InlineCorrection) => void;
  corrections: InlineCorrection[];
  className?: string;
}

const CORRECTION_OPTIONS: {
  type: CorrectionType;
  label: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  {
    type: "correct",
    label: "Correct",
    icon: <Check className="h-3 w-3" />,
    color: "text-green-300 bg-green-500/20 border-green-500/30",
  },
  {
    type: "error",
    label: "Error",
    icon: <X className="h-3 w-3" />,
    color: "text-red-300 bg-red-500/20 border-red-500/30",
  },
  {
    type: "better",
    label: "Better phrasing",
    icon: <RefreshCw className="h-3 w-3" />,
    color: "text-amber-300 bg-amber-500/20 border-amber-500/30",
  },
  {
    type: "explain",
    label: "Explain",
    icon: <HelpCircle className="h-3 w-3" />,
    color: "text-blue-300 bg-blue-500/20 border-blue-500/30",
  },
];

const HIGHLIGHT_STYLES: Record<CorrectionType, string> = {
  correct: "bg-green-500/20 text-green-300",
  error:
    "bg-red-500/20 text-red-300 underline decoration-wavy decoration-red-400/50",
  better: "bg-amber-500/20 text-amber-300",
  explain: "bg-blue-500/20 text-blue-300",
};

export function InlineCorrectionPopover({
  text,
  onCorrection,
  corrections,
  className = "",
}: InlineCorrectionPopoverProps) {
  const [popover, setPopover] = useState<{
    x: number;
    y: number;
    start: number;
    end: number;
    selectedText: string;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !containerRef.current) {
      return;
    }

    const range = selection.getRangeAt(0);
    if (!containerRef.current.contains(range.commonAncestorContainer)) {
      return;
    }

    const selectedText = selection.toString().trim();
    if (!selectedText) return;

    // Calculate offsets relative to the full text
    const preRange = document.createRange();
    preRange.setStart(containerRef.current, 0);
    preRange.setEnd(range.startContainer, range.startOffset);
    const start = preRange.toString().length;
    const end = start + selectedText.length;

    const rect = range.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();

    setPopover({
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top - 8,
      start,
      end,
      selectedText,
    });
  }, []);

  const handleCorrectionSelect = (type: CorrectionType) => {
    if (!popover) return;
    onCorrection({
      id: `${Date.now()}-${Math.random()}`,
      start: popover.start,
      end: popover.end,
      type,
      explanation: "",
      original_text: popover.selectedText,
    });
    setPopover(null);
    window.getSelection()?.removeAllRanges();
  };

  // Close popover on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        popover &&
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setPopover(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [popover]);

  // Render text with correction highlights
  const renderHighlightedText = () => {
    if (corrections.length === 0) return text;

    // Sort corrections by start position
    const sorted = [...corrections].sort((a, b) => a.start - b.start);
    const segments: React.ReactNode[] = [];
    let lastEnd = 0;

    sorted.forEach((corr, idx) => {
      if (corr.start > lastEnd) {
        segments.push(text.slice(lastEnd, corr.start));
      }
      segments.push(
        <span
          key={idx}
          className={`rounded px-0.5 ${HIGHLIGHT_STYLES[corr.type]}`}
          title={corr.explanation || corr.type}
        >
          {text.slice(corr.start, corr.end)}
        </span>,
      );
      lastEnd = corr.end;
    });

    if (lastEnd < text.length) {
      segments.push(text.slice(lastEnd));
    }

    return segments;
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div
        onMouseUp={handleMouseUp}
        className="text-white/90 text-[15px] leading-relaxed cursor-text select-text"
      >
        {renderHighlightedText()}
      </div>

      <AnimatePresence>
        {popover && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 flex gap-1 rounded-xl bg-[var(--deep-navy)] border border-white/10 p-1.5 shadow-lg shadow-black/40"
            style={{
              left: popover.x,
              top: popover.y,
              transform: "translate(-50%, -100%)",
            }}
          >
            {CORRECTION_OPTIONS.map((opt) => (
              <button
                key={opt.type}
                onClick={() => handleCorrectionSelect(opt.type)}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-all hover:scale-105 ${opt.color}`}
                title={opt.label}
              >
                {opt.icon}
                <span className="hidden sm:inline">{opt.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Standalone colored correction highlight span */
export function CorrectionHighlight({
  type,
  children,
  explanation,
}: {
  type: CorrectionType;
  children: React.ReactNode;
  explanation?: string;
}) {
  return (
    <span
      className={`rounded px-0.5 ${HIGHLIGHT_STYLES[type]}`}
      title={explanation}
    >
      {children}
    </span>
  );
}
