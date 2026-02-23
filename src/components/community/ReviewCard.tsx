"use client";

import { cn } from "@/lib/utils";
import type { ReviewWithProfile, InlineCorrection } from "@/types/community";
import { ThumbsUp, Star } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { langFlag } from "./SubmissionCard";

interface ReviewCardProps {
  review: ReviewWithProfile;
  originalText?: string | null;
  onVoteHelpful?: (reviewId: string) => void;
  className?: string;
}

export function ReviewCard({
  review,
  originalText,
  onVoteHelpful,
  className,
}: ReviewCardProps) {
  const profile = review.profiles;
  const displayName = profile?.full_name || "Anonymous Reviewer";
  const timeAgo = formatDistanceToNow(new Date(review.created_at), {
    addSuffix: true,
  });

  return (
    <div
      className={cn(
        "rounded-2xl border border-ocean-turquoise/10 bg-white/[0.02] p-5",
        className,
      )}
    >
      {/* Header: reviewer info */}
      <div className="flex items-center gap-3 mb-4">
        <div className="h-8 w-8 shrink-0 rounded-full bg-ocean-turquoise/10 flex items-center justify-center overflow-hidden">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={displayName}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-xs font-medium text-ocean-turquoise">
              {displayName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-sand truncate">
              {displayName}
            </p>
            <span
              className="text-sm"
              title={`Native: ${profile?.native_language}`}
            >
              {langFlag(profile?.native_language ?? "")}
            </span>
          </div>
          <p className="text-xs text-seafoam/40">{timeAgo}</p>
        </div>

        {/* Star rating */}
        {review.rating && (
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={cn(
                  "h-3.5 w-3.5",
                  i < review.rating!
                    ? "fill-ocean-turquoise text-ocean-turquoise"
                    : "text-white/10",
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* Inline corrections diff view */}
      {review.inline_corrections && review.inline_corrections.length > 0 && (
        <div className="mb-4 space-y-2">
          <p className="text-xs text-seafoam/50 font-medium mb-2">
            Corrections
          </p>
          {review.inline_corrections.map((c: InlineCorrection, i: number) => (
            <div key={i} className="rounded-lg bg-white/[0.02] px-3 py-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-red-400/70 line-through font-light">
                  {c.original}
                </span>
                <span className="text-seafoam/30">→</span>
                <span className="text-ocean-turquoise font-medium">
                  {c.correction}
                </span>
              </div>
              {c.explanation && (
                <p className="text-xs text-seafoam/40 mt-1">{c.explanation}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Corrected text diff (if full corrected text provided) */}
      {review.corrected_text &&
        originalText &&
        review.corrected_text !== originalText && (
          <div className="mb-4 rounded-xl border border-ocean-turquoise/10 bg-white/[0.01] p-3">
            <p className="text-xs text-seafoam/50 font-medium mb-2">
              Corrected version
            </p>
            <p className="text-sm text-ocean-turquoise/90 font-light leading-relaxed">
              {review.corrected_text}
            </p>
          </div>
        )}

      {/* Overall feedback */}
      {review.overall_feedback && (
        <div className="mb-4">
          <p className="text-sm text-sand/80 font-light leading-relaxed">
            {review.overall_feedback}
          </p>
        </div>
      )}

      {/* Footer: helpful vote button */}
      <div className="flex items-center justify-end">
        <button
          onClick={() => onVoteHelpful?.(review.id)}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
            review.has_voted
              ? "bg-ocean-turquoise/15 text-ocean-turquoise"
              : "bg-white/5 text-seafoam/50 hover:bg-white/10 hover:text-seafoam/70",
          )}
        >
          <ThumbsUp
            className={cn(
              "h-3.5 w-3.5",
              review.has_voted && "fill-ocean-turquoise",
            )}
          />
          <span>Helpful</span>
          {review.helpful_votes > 0 && (
            <span className="ml-0.5">{review.helpful_votes}</span>
          )}
        </button>
      </div>
    </div>
  );
}
