"use client";

import { useState, useEffect } from "react";
import { X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface LaTeXDialogProps {
  open: boolean;
  onClose: () => void;
  onInsert: (html: string) => void;
}

export function LaTeXDialog({ open, onClose, onInsert }: LaTeXDialogProps) {
  const [latex, setLatex] = useState("");
  const [preview, setPreview] = useState("");
  const [displayMode, setDisplayMode] = useState(false);

  useEffect(() => {
    if (!latex.trim()) {
      setPreview("");
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const katex = await import("katex");
        const html = katex.default.renderToString(latex, {
          throwOnError: false,
          displayMode,
        });
        setPreview(html);
      } catch {
        setPreview(`<span class="text-rose-400">Invalid LaTeX</span>`);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [latex, displayMode]);

  if (!open) return null;

  const handleInsert = () => {
    if (!latex.trim()) return;
    // Wrap in MathJax-compatible delimiters
    const wrapped = displayMode ? `$$${latex}$$` : `$${latex}$`;
    // Also provide pre-rendered KaTeX HTML for preview
    const html = `<span class="math-inline" data-latex="${encodeURIComponent(latex)}" data-display="${displayMode}">${preview || wrapped}</span>`;
    onInsert(html);
    setLatex("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        className={cn(
          "relative z-10 w-full max-w-md rounded-2xl border border-white/10",
          "bg-[#0d2137] p-6 space-y-4 shadow-2xl",
          "animate-in slide-in-from-bottom-4 fade-in duration-300",
        )}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">
            Insert LaTeX / MathJax
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/40 hover:text-white/80 hover:bg-white/5 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-white/70">
            LaTeX Expression
          </label>
          <textarea
            value={latex}
            onChange={(e) => setLatex(e.target.value)}
            placeholder="e.g. \frac{a}{b} or E = mc^2"
            rows={3}
            className={cn(
              "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5",
              "text-white placeholder:text-white/30 font-mono text-sm",
              "focus:outline-none focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/30",
              "transition resize-none",
            )}
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer">
          <input
            type="checkbox"
            checked={displayMode}
            onChange={(e) => setDisplayMode(e.target.checked)}
            className="rounded border-white/20"
          />
          Display mode (block equation)
        </label>

        {preview && (
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-white/50">Preview</span>
            <div
              className="rounded-xl border border-white/10 bg-white/5 p-4 text-white text-center overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: preview }}
            />
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/60 hover:text-white text-sm font-medium transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleInsert}
            disabled={!latex.trim()}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition",
              "bg-teal-500 hover:bg-teal-400 text-[#0a1628]",
              !latex.trim() && "opacity-50 cursor-not-allowed",
            )}
          >
            <Check className="h-4 w-4" />
            Insert
          </button>
        </div>
      </div>
    </div>
  );
}
