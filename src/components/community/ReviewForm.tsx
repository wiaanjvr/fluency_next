"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { InlineCorrector } from "./InlineCorrector";
import { Star, Loader2 } from "lucide-react";
import type { InlineCorrection, SubmitReviewPayload } from "@/types/community";

interface ReviewFormProps {
  submissionId: string;
  originalText: string | null;
  isSubmitting: boolean;
  onSubmit: (payload: SubmitReviewPayload) => Promise<void>;
  className?: string;
}

type ReviewMode = "quick" | "inline";

const MAX_FEEDBACK_CHARS = 1000;

export function ReviewForm({
  submissionId,
  originalText,
  isSubmitting,
  onSubmit,
  className,
}: ReviewFormProps) {
  const [mode, setMode] = useState<ReviewMode>("quick");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [overallFeedback, setOverallFeedback] = useState("");
  const [correctedText, setCorrectedText] = useState("");
  const [inlineCorrections, setInlineCorrections] = useState<
    InlineCorrection[]
  >([]);

  const feedbackLength = overallFeedback.length;
  const isValid = rating >= 1 && rating <= 5;

  const handleSubmit = useCallback(async () => {
    if (!isValid || isSubmitting) return;

    const payload: SubmitReviewPayload = {
      submission_id: submissionId,
      rating,
      overall_feedback: overallFeedback.trim() || undefined,
      corrected_text:
        mode === "inline" && correctedText.trim()
          ? correctedText.trim()
          : undefined,
      inline_corrections:
        mode === "inline" && inlineCorrections.length > 0
          ? inlineCorrections
          : undefined,
    };

    await onSubmit(payload);
  }, [
    submissionId,
    rating,
    overallFeedback,
    correctedText,
    inlineCorrections,
    mode,
    isValid,
    isSubmitting,
    onSubmit,
  ]);

  return (
    <div
      className={cn(
        "rounded-2xl border border-ocean-turquoise/15 bg-white/[0.02] p-5",
        className,
      )}
    >
      <h3 className="text-sm font-display font-semibold text-sand mb-4">
        Write your review
      </h3>

      {/* Mode toggle (only show if there's text content to correct) */}
      {originalText && (
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setMode("quick")}
            className={cn(
              "rounded-xl px-3 py-1.5 text-xs font-medium transition-all",
              mode === "quick"
                ? "bg-ocean-turquoise/15 text-ocean-turquoise"
                : "bg-white/5 text-seafoam/50 hover:bg-white/10",
            )}
          >
            Quick feedback
          </button>
          <button
            onClick={() => setMode("inline")}
            className={cn(
              "rounded-xl px-3 py-1.5 text-xs font-medium transition-all",
              mode === "inline"
                ? "bg-ocean-turquoise/15 text-ocean-turquoise"
                : "bg-white/5 text-seafoam/50 hover:bg-white/10",
            )}
          >
            Inline corrections
          </button>
        </div>
      )}

      {/* Inline corrections mode */}
      {mode === "inline" && originalText && (
        <div className="mb-4">
          <InlineCorrector
            originalText={originalText}
            corrections={inlineCorrections}
            onCorrectionsChange={setInlineCorrections}
          />

          {/* Optional full corrected text */}
          <div className="mt-4">
            <label className="text-xs text-seafoam/50 font-medium mb-1.5 block">
              Full corrected version (optional)
            </label>
            <Textarea
              value={correctedText}
              onChange={(e) => setCorrectedText(e.target.value)}
              placeholder="Rewrite the full text with your corrections…"
              className="min-h-[80px] bg-white/[0.02] border-ocean-turquoise/10 text-sm"
            />
          </div>
        </div>
      )}

      {/* Overall feedback (always shown) */}
      <div className="mb-4">
        <label className="text-xs text-seafoam/50 font-medium mb-1.5 block">
          Overall feedback
        </label>
        <Textarea
          value={overallFeedback}
          onChange={(e) => setOverallFeedback(e.target.value)}
          placeholder="Share constructive feedback about this submission…"
          maxLength={MAX_FEEDBACK_CHARS}
          className="min-h-[100px] bg-white/[0.02] border-ocean-turquoise/10 text-sm"
        />
        <div className="flex justify-end mt-1">
          <span
            className={cn(
              "text-xs",
              feedbackLength > MAX_FEEDBACK_CHARS * 0.9
                ? "text-red-400"
                : "text-seafoam/30",
            )}
          >
            {feedbackLength}/{MAX_FEEDBACK_CHARS}
          </span>
        </div>
      </div>

      {/* Star rating */}
      <div className="mb-5">
        <label className="text-xs text-seafoam/50 font-medium mb-2 block">
          Rating
        </label>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="p-0.5 transition-transform hover:scale-110"
            >
              <Star
                className={cn(
                  "h-6 w-6 transition-colors",
                  star <= (hoverRating || rating)
                    ? "fill-ocean-turquoise text-ocean-turquoise"
                    : "text-white/10 hover:text-white/20",
                )}
              />
            </button>
          ))}
          {rating > 0 && (
            <span className="ml-2 text-xs text-seafoam/40">
              {rating === 1
                ? "Needs work"
                : rating === 2
                  ? "Fair"
                  : rating === 3
                    ? "Good"
                    : rating === 4
                      ? "Very good"
                      : "Excellent"}
            </span>
          )}
        </div>
      </div>

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={!isValid || isSubmitting}
        className={cn(
          "w-full flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-medium transition-all min-h-touch",
          isValid && !isSubmitting
            ? "bg-ocean-turquoise/15 text-ocean-turquoise hover:bg-ocean-turquoise/25 border border-ocean-turquoise/20"
            : "bg-white/5 text-seafoam/30 cursor-not-allowed",
        )}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Submitting review…
          </>
        ) : (
          "Submit Review"
        )}
      </button>
    </div>
  );
}
