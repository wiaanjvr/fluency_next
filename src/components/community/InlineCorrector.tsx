"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import type { InlineCorrection } from "@/types/community";
import { X, Check, MessageSquare } from "lucide-react";

interface InlineCorrectorProps {
  originalText: string;
  corrections: InlineCorrection[];
  onCorrectionsChange: (corrections: InlineCorrection[]) => void;
  className?: string;
}

/**
 * Interactive text correction component.
 * User selects a span of the original text → popover to suggest correction + explanation.
 */
export function InlineCorrector({
  originalText,
  corrections,
  onCorrectionsChange,
  className,
}: InlineCorrectorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [popover, setPopover] = useState<{
    original: string;
    x: number;
    y: number;
  } | null>(null);
  const [correctionInput, setCorrectionInput] = useState("");
  const [explanationInput, setExplanationInput] = useState("");

  // Build a map of corrections for highlighting
  const correctionMap = useMemo(() => {
    const map = new Map<string, InlineCorrection>();
    corrections.forEach((c) => map.set(c.original, c));
    return map;
  }, [corrections]);

  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !containerRef.current) return;

    const selectedText = selection.toString().trim();
    if (!selectedText || selectedText.length < 1) return;

    // Get position for popover
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();

    setPopover({
      original: selectedText,
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.bottom - containerRect.top + 8,
    });
    setCorrectionInput("");
    setExplanationInput("");
  }, []);

  const addCorrection = useCallback(() => {
    if (!popover || !correctionInput.trim()) return;
    const newCorrection: InlineCorrection = {
      original: popover.original,
      correction: correctionInput.trim(),
      explanation: explanationInput.trim(),
    };
    onCorrectionsChange([
      ...corrections.filter((c) => c.original !== popover.original),
      newCorrection,
    ]);
    setPopover(null);
  }, [
    popover,
    correctionInput,
    explanationInput,
    corrections,
    onCorrectionsChange,
  ]);

  const removeCorrection = useCallback(
    (original: string) => {
      onCorrectionsChange(corrections.filter((c) => c.original !== original));
    },
    [corrections, onCorrectionsChange],
  );

  // Render text with highlights for existing corrections
  const renderHighlightedText = useCallback(() => {
    if (corrections.length === 0) {
      return <span>{originalText}</span>;
    }

    // Simple approach: replace each corrected span
    let remaining = originalText;
    const segments: { text: string; correction?: InlineCorrection }[] = [];

    // Sort corrections by their position in the text
    const sorted = [...corrections].sort((a, b) => {
      const posA = remaining.indexOf(a.original);
      const posB = remaining.indexOf(b.original);
      return posA - posB;
    });

    let cursor = 0;
    for (const corr of sorted) {
      const idx = originalText.indexOf(corr.original, cursor);
      if (idx === -1) continue;

      // Text before this correction
      if (idx > cursor) {
        segments.push({ text: originalText.slice(cursor, idx) });
      }
      // The corrected span
      segments.push({ text: corr.original, correction: corr });
      cursor = idx + corr.original.length;
    }
    // Remaining text
    if (cursor < originalText.length) {
      segments.push({ text: originalText.slice(cursor) });
    }

    return segments.map((seg, i) =>
      seg.correction ? (
        <span
          key={i}
          className="relative inline underline decoration-amber-400/60 decoration-wavy cursor-pointer group/corr"
          title={`${seg.correction.correction} — ${seg.correction.explanation}`}
        >
          {seg.text}
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeCorrection(seg.correction!.original);
            }}
            className="absolute -top-2 -right-2 hidden group-hover/corr:flex h-4 w-4 items-center justify-center rounded-full bg-red-500/80 text-white"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </span>
      ) : (
        <span key={i}>{seg.text}</span>
      ),
    );
  }, [originalText, corrections, removeCorrection]);

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      {/* Instruction */}
      <div className="flex items-center gap-2 mb-2 text-xs text-seafoam/50">
        <MessageSquare className="h-3.5 w-3.5" />
        <span>Select text to suggest a correction</span>
      </div>

      {/* Text area with selectable text */}
      <div
        className="rounded-2xl border border-ocean-turquoise/15 bg-white/[0.02] p-4 text-sm text-sand/90 leading-relaxed font-light select-text cursor-text"
        onMouseUp={handleTextSelection}
      >
        {renderHighlightedText()}
      </div>

      {/* Popover for adding correction */}
      {popover && (
        <div
          className="absolute z-20 w-72 rounded-xl border border-ocean-turquoise/20 bg-[var(--deep-navy)] p-4 shadow-luxury"
          style={{
            left: `${Math.max(0, popover.x - 144)}px`,
            top: `${popover.y}px`,
          }}
        >
          <div className="mb-2">
            <p className="text-xs text-seafoam/50 mb-1">Correcting:</p>
            <p className="text-sm text-sand font-medium line-through decoration-red-400/60">
              {popover.original}
            </p>
          </div>

          <input
            type="text"
            placeholder="Suggested correction…"
            value={correctionInput}
            onChange={(e) => setCorrectionInput(e.target.value)}
            className="w-full rounded-lg border border-ocean-turquoise/15 bg-white/[0.03] px-3 py-2 text-sm text-sand placeholder:text-seafoam/30 focus:outline-none focus:border-ocean-turquoise/40 mb-2"
            autoFocus
          />

          <input
            type="text"
            placeholder="Explanation (optional)…"
            value={explanationInput}
            onChange={(e) => setExplanationInput(e.target.value)}
            className="w-full rounded-lg border border-ocean-turquoise/15 bg-white/[0.03] px-3 py-2 text-sm text-sand placeholder:text-seafoam/30 focus:outline-none focus:border-ocean-turquoise/40 mb-3"
          />

          <div className="flex items-center gap-2">
            <button
              onClick={addCorrection}
              disabled={!correctionInput.trim()}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-ocean-turquoise/15 px-3 py-1.5 text-xs font-medium text-ocean-turquoise hover:bg-ocean-turquoise/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Check className="h-3.5 w-3.5" />
              Add
            </button>
            <button
              onClick={() => setPopover(null)}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs font-medium text-seafoam/60 hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Corrections summary */}
      {corrections.length > 0 && (
        <div className="mt-3 space-y-1.5">
          <p className="text-xs text-seafoam/50 font-medium">
            {corrections.length} correction{corrections.length !== 1 ? "s" : ""}
          </p>
          {corrections.map((c, i) => (
            <div
              key={i}
              className="flex items-start gap-2 rounded-lg bg-white/[0.02] px-3 py-2 text-xs"
            >
              <div className="flex-1 min-w-0">
                <span className="text-red-400/80 line-through">
                  {c.original}
                </span>
                <span className="mx-1 text-seafoam/30">→</span>
                <span className="text-ocean-turquoise font-medium">
                  {c.correction}
                </span>
                {c.explanation && (
                  <p className="text-seafoam/40 mt-0.5">{c.explanation}</p>
                )}
              </div>
              <button
                onClick={() => removeCorrection(c.original)}
                className="shrink-0 rounded p-0.5 text-seafoam/30 hover:text-red-400 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
