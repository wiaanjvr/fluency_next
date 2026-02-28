"use client";

import { useState, useCallback, useMemo } from "react";
import { Brackets, Plus, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  extractClozeOrdinals,
  renderClozeFront,
} from "@/lib/flashcard-template";

// ── Props ──────────────────────────────────────────────────────────────────
interface ClozeToolbarProps {
  /** Current field HTML value */
  value: string;
  /** Insert cloze markup at selection / around selected text */
  onInsertCloze: (clozeNum: number) => void;
  /** All field values (to detect existing ordinals) */
  allFields: Record<string, string>;
}

/**
 * Toolbar for inserting cloze deletions into a rich text field.
 * Shows the next available cloze number and previews cards.
 */
export function ClozeToolbar({
  value,
  onInsertCloze,
  allFields,
}: ClozeToolbarProps) {
  const [showPreview, setShowPreview] = useState(false);

  const ordinals = useMemo(() => extractClozeOrdinals(allFields), [allFields]);

  const nextOrdinal = useMemo(() => {
    if (ordinals.length === 0) return 1;
    return Math.max(...ordinals) + 1;
  }, [ordinals]);

  return (
    <div className="space-y-2">
      {/* Cloze insertion buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => onInsertCloze(nextOrdinal)}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition",
            "bg-teal-500/10 text-teal-400 border border-teal-500/20",
            "hover:bg-teal-500/20 hover:border-teal-500/30",
          )}
          title={`Insert new cloze deletion (c${nextOrdinal})`}
        >
          <Plus className="h-3 w-3" />
          <Brackets className="h-3.5 w-3.5" />c{nextOrdinal}
        </button>

        {/* Quick re-use existing ordinals */}
        {ordinals.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onInsertCloze(n)}
            className={cn(
              "px-2 py-1 rounded-lg text-xs transition",
              "bg-white/5 text-white/60 border border-white/10",
              "hover:bg-white/10 hover:text-white/80",
            )}
            title={`Insert cloze c${n} (same blank on card ${n})`}
          >
            c{n}
          </button>
        ))}

        {ordinals.length > 0 && (
          <>
            <div className="w-px h-4 bg-white/10" />
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition",
                "border border-white/10",
                showPreview
                  ? "text-teal-400 bg-teal-500/10"
                  : "text-white/40 hover:text-white/60",
              )}
            >
              <Eye className="h-3.5 w-3.5" />
              Preview ({ordinals.length} card{ordinals.length !== 1 ? "s" : ""})
            </button>
          </>
        )}
      </div>

      {/* Cloze preview */}
      {showPreview && ordinals.length > 0 && (
        <div className="space-y-2 pl-2 border-l-2 border-teal-500/20">
          {ordinals.map((n) => {
            // Build a combined preview from all fields that have clozes
            const previewParts: string[] = [];
            for (const [, val] of Object.entries(allFields)) {
              if (val.includes(`{{c${n}::`)) {
                previewParts.push(renderClozeFront(val, n));
              }
            }
            return (
              <div key={n} className="text-xs space-y-0.5">
                <span className="text-white/30 font-mono">Card {n}:</span>
                <div
                  className="text-white/70 leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html:
                      previewParts.join("<br/>") || "<em>No cloze content</em>",
                  }}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Helper: build cloze markup string ──────────────────────────────────────

/**
 * Wrap selected text in cloze markup or insert an empty cloze placeholder.
 */
export function buildClozeMarkup(
  selectedText: string,
  clozeNum: number,
  hint?: string,
): string {
  const text = selectedText.trim() || "...";
  if (hint) {
    return `{{c${clozeNum}::${text}::${hint}}}`;
  }
  return `{{c${clozeNum}::${text}}}`;
}
