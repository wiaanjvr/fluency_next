"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, RotateCcw, RotateCw, Star, Send } from "lucide-react";
import { AudioWaveform } from "./AudioWaveform";
import type {
  DiveSubmissionWithProfile,
  SpeakingRatings,
  TimestampComment,
} from "@/types/dive-tank";

const SPEED_OPTIONS = [0.75, 1, 1.25];

interface AudioReviewPanelProps {
  submission: DiveSubmissionWithProfile;
  onClose: () => void;
  onSubmit?: (data: {
    ratings: SpeakingRatings;
    feedback: string;
    timestampComments: { timestamp: number; content: string }[];
  }) => void;
}

export function AudioReviewPanel({
  submission,
  onClose,
  onSubmit,
}: AudioReviewPanelProps) {
  const [ratings, setRatings] = useState<SpeakingRatings>({
    pronunciation: 0,
    fluency: 0,
    accuracy: 0,
  });
  const [feedback, setFeedback] = useState("");
  const [timestampComments, setTimestampComments] = useState<
    { timestamp: number; content: string }[]
  >([]);
  const [newComment, setNewComment] = useState("");
  const [selectedTimestamp, setSelectedTimestamp] = useState<number | null>(
    null,
  );
  const [speed, setSpeed] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const handleTimeClick = (seconds: number) => {
    setSelectedTimestamp(seconds);
  };

  const addTimestampComment = () => {
    if (selectedTimestamp !== null && newComment.trim()) {
      setTimestampComments((prev) => [
        ...prev,
        { timestamp: selectedTimestamp, content: newComment.trim() },
      ]);
      setNewComment("");
      setSelectedTimestamp(null);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      onSubmit?.({ ratings, feedback, timestampComments });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const ratingCategories: { key: keyof SpeakingRatings; label: string }[] = [
    { key: "pronunciation", label: "Pronunciation" },
    { key: "fluency", label: "Fluency" },
    { key: "accuracy", label: "Accuracy" },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="overflow-hidden"
      >
        <div className="mt-2 rounded-2xl bg-white/[0.02] border border-purple-500/15 p-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-purple-300">
              Review Speaking Submission
            </h4>
            <button
              onClick={onClose}
              className="text-[11px] text-seafoam/30 hover:text-seafoam/50 transition-colors"
            >
              Cancel
            </button>
          </div>

          {/* Waveform with click-to-comment */}
          <div className="mb-4 rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
            <AudioWaveform
              audioUrl={submission.audio_url ?? undefined}
              duration={23}
              onTimeClick={handleTimeClick}
            />

            {/* Replay controls */}
            <div className="flex items-center justify-center gap-3 mt-3">
              <button className="h-8 w-8 rounded-lg bg-white/[0.04] flex items-center justify-center text-seafoam/40 hover:text-seafoam/60 transition-colors">
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              <button className="h-10 w-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 hover:bg-purple-500/30 transition-colors">
                <Play className="h-4 w-4 ml-0.5" />
              </button>
              <button className="h-8 w-8 rounded-lg bg-white/[0.04] flex items-center justify-center text-seafoam/40 hover:text-seafoam/60 transition-colors">
                <RotateCw className="h-3.5 w-3.5" />
              </button>

              {/* Speed toggle */}
              <div className="flex gap-1 ml-3">
                {SPEED_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSpeed(s)}
                    className={`rounded-md px-2 py-0.5 text-[10px] font-mono transition-colors ${
                      speed === s
                        ? "bg-purple-500/20 text-purple-300 border border-purple-500/25"
                        : "text-seafoam/30 hover:text-seafoam/50"
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Timestamp comment input */}
          {selectedTimestamp !== null && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 flex items-center gap-2"
            >
              <span className="text-[10px] text-purple-300 bg-purple-500/10 px-2 py-1 rounded font-mono shrink-0">
                {Math.floor(selectedTimestamp / 60)}:
                {Math.floor(selectedTimestamp % 60)
                  .toString()
                  .padStart(2, "0")}
              </span>
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTimestampComment()}
                placeholder="Add a comment at this timestamp..."
                className="flex-1 bg-transparent border-b border-white/[0.08] text-xs text-white/60 placeholder:text-seafoam/20 py-1 outline-none focus:border-purple-500/30"
              />
              <button
                onClick={addTimestampComment}
                className="text-purple-300 hover:text-purple-200"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          )}

          {/* Timestamp comments list */}
          {timestampComments.length > 0 && (
            <div className="mb-4 space-y-1.5">
              {timestampComments.map((tc, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 text-xs text-white/50"
                >
                  <span className="text-purple-300/60 font-mono shrink-0">
                    {Math.floor(tc.timestamp / 60)}:
                    {Math.floor(tc.timestamp % 60)
                      .toString()
                      .padStart(2, "0")}
                  </span>
                  <span>{tc.content}</span>
                </div>
              ))}
            </div>
          )}

          {/* Star ratings */}
          <div className="mb-4 space-y-3">
            {ratingCategories.map(({ key, label }) => (
              <div key={key} className="flex items-center gap-3">
                <span className="text-xs text-seafoam/40 w-28">{label}</span>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() =>
                        setRatings((prev) => ({ ...prev, [key]: star }))
                      }
                    >
                      <Star
                        className={`h-4 w-4 transition-colors ${
                          star <= ratings[key]
                            ? "text-amber-400 fill-amber-400"
                            : "text-seafoam/15"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Written feedback */}
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Written feedback..."
            rows={3}
            className="w-full rounded-xl bg-white/[0.02] border border-white/[0.06] p-3 text-sm text-white/80 placeholder:text-seafoam/20 outline-none focus:border-purple-500/20 resize-none mb-4"
          />

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={
              submitting ||
              (ratings.pronunciation === 0 &&
                ratings.fluency === 0 &&
                ratings.accuracy === 0 &&
                !feedback)
            }
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-purple-500 text-white px-5 py-3 text-sm font-semibold hover:bg-purple-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
            Submit Speaking Review
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
