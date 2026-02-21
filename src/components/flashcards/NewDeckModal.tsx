"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FlashcardLanguage } from "@/types/flashcards";

const LANGUAGES = [
  { code: "de" as FlashcardLanguage, flag: "🇩🇪", name: "German" },
  { code: "fr" as FlashcardLanguage, flag: "🇫🇷", name: "French" },
  { code: "it" as FlashcardLanguage, flag: "🇮🇹", name: "Italian" },
];

interface NewDeckModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    language: FlashcardLanguage;
    description: string;
    new_per_day: number;
    review_per_day: number;
  }) => Promise<void>;
}

export function NewDeckModal({ open, onClose, onSubmit }: NewDeckModalProps) {
  const [name, setName] = useState("");
  const [language, setLanguage] = useState<FlashcardLanguage>("fr");
  const [description, setDescription] = useState("");
  const [newPerDay, setNewPerDay] = useState(20);
  const [reviewPerDay, setReviewPerDay] = useState(100);
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        language,
        description: description.trim(),
        new_per_day: newPerDay,
        review_per_day: reviewPerDay,
      });
      setName("");
      setDescription("");
      setNewPerDay(20);
      setReviewPerDay(100);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <form
        onSubmit={handleSubmit}
        className={cn(
          "relative z-10 w-full max-w-md rounded-2xl border border-white/10",
          "bg-[#0d2137] p-6 space-y-5 shadow-2xl",
          "animate-in slide-in-from-bottom-4 fade-in duration-300",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">New Deck</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/40 hover:text-white/80 hover:bg-white/5 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Deck Name */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-white/70">Deck Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. French Basics"
            required
            className={cn(
              "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5",
              "text-white placeholder:text-white/30",
              "focus:outline-none focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/30",
              "transition",
            )}
          />
        </div>

        {/* Language */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-white/70">Language</label>
          <div className="flex gap-2">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => setLanguage(lang.code)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 rounded-xl border py-2.5 px-3",
                  "text-sm font-medium transition",
                  language === lang.code
                    ? "border-teal-400/50 bg-teal-500/10 text-teal-300"
                    : "border-white/10 bg-white/5 text-white/60 hover:border-white/20",
                )}
              >
                <span>{lang.flag}</span>
                <span>{lang.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-white/70">
            Description <span className="text-white/30">(optional)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this deck for?"
            rows={2}
            className={cn(
              "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5",
              "text-white placeholder:text-white/30 resize-none",
              "focus:outline-none focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/30",
              "transition",
            )}
          />
        </div>

        {/* Daily Limits */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-white/70">
              New cards / day
            </label>
            <input
              type="number"
              value={newPerDay}
              onChange={(e) => setNewPerDay(Number(e.target.value))}
              min={1}
              max={200}
              className={cn(
                "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5",
                "text-white focus:outline-none focus:border-teal-400/50",
                "focus:ring-1 focus:ring-teal-400/30 transition",
              )}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-white/70">
              Reviews / day
            </label>
            <input
              type="number"
              value={reviewPerDay}
              onChange={(e) => setReviewPerDay(Number(e.target.value))}
              min={1}
              max={9999}
              className={cn(
                "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5",
                "text-white focus:outline-none focus:border-teal-400/50",
                "focus:ring-1 focus:ring-teal-400/30 transition",
              )}
            />
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting || !name.trim()}
          className={cn(
            "w-full rounded-xl py-3 font-medium text-[#0a1628] transition",
            "bg-teal-400 hover:bg-teal-300 disabled:opacity-50 disabled:cursor-not-allowed",
            "shadow-lg shadow-teal-500/25",
          )}
        >
          {submitting ? "Creating..." : "Create Deck"}
        </button>
      </form>
    </div>
  );
}
