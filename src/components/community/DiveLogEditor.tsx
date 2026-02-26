"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { PenLine, X, Send } from "lucide-react";

interface DiveLogEditorProps {
  onSubmit: (data: { title: string; content: string; tags: string[] }) => void;
  onCancel: () => void;
  submitting?: boolean;
}

export function DiveLogEditor({
  onSubmit,
  onCancel,
  submitting,
}: DiveLogEditorProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag) && tags.length < 5) {
      setTags([...tags, tag]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSubmit = () => {
    if (!title.trim() || !content.trim()) return;
    onSubmit({ title: title.trim(), content: content.trim(), tags });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-white/[0.03] border border-teal-500/15 p-6 mb-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-teal-300 flex items-center gap-2">
          <PenLine className="h-4 w-4" />
          Write a Dive Log
        </h3>
        <button
          onClick={onCancel}
          className="text-seafoam/30 hover:text-seafoam/50 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Title */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title of your dive log..."
        className="w-full bg-transparent border-b border-white/[0.08] text-lg text-white/90 placeholder:text-seafoam/20 pb-2 mb-4 outline-none focus:border-teal-500/30 font-display"
      />

      {/* Content */}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write your entry in German (or any language)... Markdown supported."
        rows={12}
        className="w-full rounded-xl bg-white/[0.02] border border-white/[0.06] p-4 text-sm text-white/80 placeholder:text-seafoam/20 outline-none focus:border-teal-500/20 resize-none leading-relaxed mb-4"
      />

      {/* Tags */}
      <div className="mb-4">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 text-[11px] text-teal-300/60 bg-teal-500/5 border border-teal-500/10 rounded-full px-2.5 py-1"
            >
              {tag}
              <button
                onClick={() => removeTag(tag)}
                className="text-seafoam/30 hover:text-red-400 ml-0.5"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <input
          type="text"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              addTag();
            }
          }}
          placeholder="Add tags (press Enter)..."
          className="bg-transparent border-b border-white/[0.06] text-xs text-white/60 placeholder:text-seafoam/20 py-1 outline-none focus:border-teal-500/20 w-48"
        />
      </div>

      {/* Submit */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-seafoam/25">
          {content.split(/\s+/).filter(Boolean).length} words ·{" "}
          {Math.max(
            1,
            Math.round(content.split(/\s+/).filter(Boolean).length / 200),
          )}{" "}
          min read
        </span>
        <button
          onClick={handleSubmit}
          disabled={submitting || !title.trim() || !content.trim()}
          className="flex items-center gap-2 rounded-2xl bg-[var(--turquoise)] text-[var(--midnight)] px-5 py-2.5 text-sm font-semibold hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Send className="h-4 w-4" />
          Publish Dive Log
        </button>
      </div>
    </motion.div>
  );
}
