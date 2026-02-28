"use client";

import { useState } from "react";
import { Pencil, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ScheduledCard } from "@/types/flashcards";

interface InlineCardEditorProps {
  card: ScheduledCard;
  onSave: (updates: { front?: string; back?: string }) => Promise<void>;
  onClose: () => void;
}

/**
 * Minimal inline editor shown mid-review to quickly fix typos
 * or update card content without leaving the study session.
 */
export function InlineCardEditor({
  card,
  onSave,
  onClose,
}: InlineCardEditorProps) {
  const [front, setFront] = useState(
    card.flashcards.front.replace(/<[^>]*>/g, ""),
  );
  const [back, setBack] = useState(
    card.flashcards.back.replace(/<[^>]*>/g, ""),
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ front, back });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d2137] p-5 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-white/70 flex items-center gap-2">
          <Pencil className="h-4 w-4 text-teal-400" />
          Edit Card
        </h4>
        <button
          onClick={onClose}
          className="text-white/40 hover:text-white/70 transition"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-[10px] text-white/40 uppercase tracking-wider mb-1 block">
            Front
          </label>
          <textarea
            value={front}
            onChange={(e) => setFront(e.target.value)}
            rows={2}
            className={cn(
              "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5",
              "text-white text-sm placeholder:text-white/30",
              "focus:outline-none focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/30",
              "resize-none transition",
            )}
          />
        </div>
        <div>
          <label className="text-[10px] text-white/40 uppercase tracking-wider mb-1 block">
            Back
          </label>
          <textarea
            value={back}
            onChange={(e) => setBack(e.target.value)}
            rows={2}
            className={cn(
              "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5",
              "text-white text-sm placeholder:text-white/30",
              "focus:outline-none focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/30",
              "resize-none transition",
            )}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg text-sm text-white/50 hover:text-white/80 border border-white/10 hover:border-white/20 transition"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition",
            "bg-teal-500 hover:bg-teal-400 text-[#0a1628]",
            saving && "opacity-50 cursor-not-allowed",
          )}
        >
          {saving ? (
            <div className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
          Save
        </button>
      </div>
    </div>
  );
}
