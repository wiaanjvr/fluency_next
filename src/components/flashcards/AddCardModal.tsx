"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const WORD_CLASSES = [
  { value: "", label: "Select..." },
  { value: "noun", label: "Noun" },
  { value: "verb", label: "Verb" },
  { value: "adjective", label: "Adjective" },
  { value: "adverb", label: "Adverb" },
  { value: "phrase", label: "Phrase" },
  { value: "other", label: "Other" },
];

interface AddCardModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    front: string;
    back: string;
    example_sentence?: string;
    example_translation?: string;
    word_class?: string;
    grammar_notes?: string;
    tags?: string[];
  }) => Promise<void>;
}

export function AddCardModal({ open, onClose, onSubmit }: AddCardModalProps) {
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [exampleSentence, setExampleSentence] = useState("");
  const [exampleTranslation, setExampleTranslation] = useState("");
  const [wordClass, setWordClass] = useState("");
  const [grammarNotes, setGrammarNotes] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const resetForm = () => {
    setFront("");
    setBack("");
    setExampleSentence("");
    setExampleTranslation("");
    setWordClass("");
    setGrammarNotes("");
    setTagsInput("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!front.trim() || !back.trim()) return;
    setSubmitting(true);
    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      await onSubmit({
        front: front.trim(),
        back: back.trim(),
        example_sentence: exampleSentence.trim() || undefined,
        example_translation: exampleTranslation.trim() || undefined,
        word_class: wordClass || undefined,
        grammar_notes: grammarNotes.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
      });
      resetForm();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = cn(
    "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5",
    "text-white placeholder:text-white/30",
    "focus:outline-none focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/30",
    "transition",
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <form
        onSubmit={handleSubmit}
        className={cn(
          "relative z-10 w-full max-w-lg rounded-2xl border border-white/10",
          "bg-[#0d2137] p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto",
          "animate-in slide-in-from-bottom-4 fade-in duration-300",
        )}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Add Card</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/40 hover:text-white/80 hover:bg-white/5 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Front */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-white/70">
            Word / Phrase (target language){" "}
            <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            value={front}
            onChange={(e) => setFront(e.target.value)}
            placeholder="e.g. la maison"
            required
            className={inputClass}
          />
        </div>

        {/* Back */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-white/70">
            Translation <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            value={back}
            onChange={(e) => setBack(e.target.value)}
            placeholder="e.g. the house"
            required
            className={inputClass}
          />
        </div>

        {/* Example Sentence */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-white/70">
            Example Sentence <span className="text-white/30">(optional)</span>
          </label>
          <textarea
            value={exampleSentence}
            onChange={(e) => setExampleSentence(e.target.value)}
            placeholder="e.g. La maison est grande."
            rows={2}
            className={cn(inputClass, "resize-none")}
          />
        </div>

        {/* Example Translation */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-white/70">
            Example Translation{" "}
            <span className="text-white/30">(optional)</span>
          </label>
          <textarea
            value={exampleTranslation}
            onChange={(e) => setExampleTranslation(e.target.value)}
            placeholder="e.g. The house is big."
            rows={2}
            className={cn(inputClass, "resize-none")}
          />
        </div>

        {/* Word Class */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-white/70">
            Word Class <span className="text-white/30">(optional)</span>
          </label>
          <select
            value={wordClass}
            onChange={(e) => setWordClass(e.target.value)}
            className={cn(inputClass, "appearance-none")}
          >
            {WORD_CLASSES.map((wc) => (
              <option key={wc.value} value={wc.value} className="bg-[#0d2137]">
                {wc.label}
              </option>
            ))}
          </select>
        </div>

        {/* Grammar Notes */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-white/70">
            Grammar Notes <span className="text-white/30">(optional)</span>
          </label>
          <textarea
            value={grammarNotes}
            onChange={(e) => setGrammarNotes(e.target.value)}
            placeholder="e.g. Feminine noun — always 'la'"
            rows={2}
            className={cn(inputClass, "resize-none")}
          />
        </div>

        {/* Tags */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-white/70">
            Tags{" "}
            <span className="text-white/30">(comma-separated, optional)</span>
          </label>
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="e.g. housing, basics, A1"
            className={inputClass}
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting || !front.trim() || !back.trim()}
          className={cn(
            "w-full rounded-xl py-3 font-medium text-[#0a1628] transition",
            "bg-teal-400 hover:bg-teal-300 disabled:opacity-50 disabled:cursor-not-allowed",
            "shadow-lg shadow-teal-500/25",
          )}
        >
          {submitting ? "Adding..." : "Add Card"}
        </button>
      </form>
    </div>
  );
}
