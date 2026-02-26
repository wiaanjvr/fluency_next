"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Heart, Smile, FileText } from "lucide-react";
import { InlineCorrectionPopover } from "./InlineCorrectionPopover";
import { DepthPointsFloat, useFloatingPoints } from "./DepthPointsFloat";
import type {
  DiveSubmissionWithProfile,
  InlineCorrection,
  ReviewTone,
} from "@/types/dive-tank";

const TONE_OPTIONS: {
  value: ReviewTone;
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "encouraging",
    label: "Encouraging",
    icon: <Heart className="h-3 w-3" />,
  },
  {
    value: "neutral",
    label: "Neutral",
    icon: <FileText className="h-3 w-3" />,
  },
  { value: "detailed", label: "Detailed", icon: <Smile className="h-3 w-3" /> },
];

interface ReviewPanelProps {
  submission: DiveSubmissionWithProfile;
  onClose: () => void;
  onSubmit?: (data: {
    corrections: InlineCorrection[];
    feedback: string;
    tone: ReviewTone;
  }) => void;
}

export function ReviewPanel({
  submission,
  onClose,
  onSubmit,
}: ReviewPanelProps) {
  const [corrections, setCorrections] = useState<InlineCorrection[]>([]);
  const [feedback, setFeedback] = useState("");
  const [tone, setTone] = useState<ReviewTone>("encouraging");
  const [submitting, setSubmitting] = useState(false);
  const { floats, trigger } = useFloatingPoints();

  const handleCorrection = (corr: InlineCorrection) => {
    setCorrections((prev) => [...prev, corr]);
  };

  const updateExplanation = (id: string, explanation: string) => {
    setCorrections((prev) =>
      prev.map((c) => (c.id === id ? { ...c, explanation } : c)),
    );
  };

  const removeCorrection = (id: string) => {
    setCorrections((prev) => prev.filter((c) => c.id !== id));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      onSubmit?.({ corrections, feedback, tone });
      // Floating DP animation
      trigger(5, window.innerWidth / 2, window.innerHeight / 2);
      setTimeout(() => onClose(), 800);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="overflow-hidden"
      >
        <div className="mt-2 rounded-2xl bg-white/[0.02] border border-teal-500/15 p-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-teal-300">
              Review this submission
            </h4>
            <button
              onClick={onClose}
              className="text-[11px] text-seafoam/30 hover:text-seafoam/50 transition-colors"
            >
              Cancel
            </button>
          </div>

          {/* Original text with inline correction tools */}
          <div className="mb-4 rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
            <p className="text-[10px] text-seafoam/30 uppercase tracking-wider mb-2">
              Select text to mark corrections
            </p>
            {submission.content && (
              <InlineCorrectionPopover
                text={submission.content}
                corrections={corrections}
                onCorrection={handleCorrection}
              />
            )}
          </div>

          {/* Corrections list */}
          {corrections.length > 0 && (
            <div className="mb-4 space-y-2">
              <p className="text-[10px] text-seafoam/30 uppercase tracking-wider mb-1.5">
                Corrections ({corrections.length})
              </p>
              {corrections.map((corr) => (
                <div
                  key={corr.id}
                  className="flex items-start gap-3 rounded-xl bg-white/[0.02] border border-white/[0.05] p-3"
                >
                  <span
                    className={`shrink-0 mt-1 inline-block w-2 h-2 rounded-full ${
                      corr.type === "correct"
                        ? "bg-green-400"
                        : corr.type === "error"
                          ? "bg-red-400"
                          : corr.type === "better"
                            ? "bg-amber-400"
                            : "bg-blue-400"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/70 mb-1.5">
                      &ldquo;{corr.original_text}&rdquo;
                    </p>
                    <input
                      type="text"
                      value={corr.explanation}
                      onChange={(e) =>
                        updateExplanation(corr.id, e.target.value)
                      }
                      placeholder="Explain this correction..."
                      className="w-full bg-transparent border-b border-white/[0.08] text-xs text-white/60 placeholder:text-seafoam/20 py-1 outline-none focus:border-teal-500/30"
                    />
                  </div>
                  <button
                    onClick={() => removeCorrection(corr.id)}
                    className="shrink-0 text-[10px] text-seafoam/20 hover:text-red-400 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Overall feedback */}
          <div className="mb-4">
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Overall feedback (optional)..."
              rows={3}
              className="w-full rounded-xl bg-white/[0.02] border border-white/[0.06] p-3 text-sm text-white/80 placeholder:text-seafoam/20 outline-none focus:border-teal-500/20 resize-none"
            />
          </div>

          {/* Tone selector */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[10px] text-seafoam/30 uppercase tracking-wider mr-2">
              Tone
            </span>
            {TONE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTone(opt.value)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all border ${
                  tone === opt.value
                    ? "bg-teal-500/10 border-teal-500/25 text-teal-300"
                    : "border-white/[0.06] text-seafoam/40 hover:border-white/[0.12]"
                }`}
              >
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={submitting || (corrections.length === 0 && !feedback)}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[var(--turquoise)] text-[var(--midnight)] px-5 py-3 text-sm font-semibold hover:brightness-110 active:brightness-95 transition-all shadow-[0_0_20px_rgba(61,214,181,0.2)] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
            Submit Review · earn +5 DP
          </button>
        </div>

        <DepthPointsFloat floats={floats} />
      </motion.div>
    </AnimatePresence>
  );
}
