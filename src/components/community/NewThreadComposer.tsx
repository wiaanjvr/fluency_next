"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { X, Send } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import type { DispatchCategory } from "@/types/dive-tank";

const categoryOptions: { key: DispatchCategory; label: string }[] = [
  { key: "grammar-help", label: "Grammar Help" },
  { key: "vocabulary", label: "Vocabulary" },
  { key: "culture", label: "Culture" },
  { key: "resources", label: "Resources" },
  { key: "study-methods", label: "Study Methods" },
  { key: "wins-struggles", label: "Wins & Struggles" },
];

interface NewThreadComposerProps {
  onSubmit: (data: {
    title: string;
    body: string;
    category: DispatchCategory;
  }) => void;
  onCancel: () => void;
  submitting?: boolean;
}

export function NewThreadComposer({
  onSubmit,
  onCancel,
  submitting,
}: NewThreadComposerProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<DispatchCategory>("grammar-help");

  const handleSubmit = () => {
    if (!title.trim() || !body.trim()) return;
    onSubmit({ title: title.trim(), body: body.trim(), category });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="rounded-2xl bg-white/[0.03] border border-teal-500/15 p-5 mb-5"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-teal-300">New Thread</h3>
        <button
          onClick={onCancel}
          className="text-seafoam/30 hover:text-seafoam/50 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Category */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        {categoryOptions.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setCategory(cat.key)}
            className={`text-[11px] font-medium px-3 py-1.5 rounded-full border transition-all ${
              category === cat.key
                ? "text-teal-200 bg-teal-500/15 border-teal-500/25"
                : "text-seafoam/35 bg-white/[0.02] border-white/[0.06] hover:border-white/[0.1]"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Title */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Thread title..."
        className="w-full bg-transparent border-b border-white/[0.08] text-sm text-white/80 placeholder:text-seafoam/20 pb-2 mb-3 outline-none focus:border-teal-500/25"
      />

      {/* Body */}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="What's on your mind?"
        rows={5}
        className="w-full rounded-xl bg-white/[0.02] border border-white/[0.06] p-3 text-sm text-white/70 placeholder:text-seafoam/20 outline-none focus:border-teal-500/20 resize-none leading-relaxed mb-4"
      />

      {/* Submit */}
      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={submitting || !title.trim() || !body.trim()}
          className="flex items-center gap-2 rounded-2xl bg-[var(--turquoise)] text-[var(--midnight)] px-5 py-2.5 text-sm font-semibold hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Send className="h-4 w-4" />
          Post Thread
        </button>
      </div>
    </motion.div>
  );
}
