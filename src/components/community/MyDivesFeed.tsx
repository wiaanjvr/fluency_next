"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Clock, Minus, ChevronDown, Star } from "lucide-react";
import { OceanAvatar } from "./OceanAvatar";
import { OceanEmptyState } from "./OceanEmptyState";
import { CorrectionHighlight } from "./InlineCorrectionPopover";
import type {
  DiveSubmissionWithProfile,
  DiveReviewWithProfile,
} from "@/types/dive-tank";

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    icon: <Clock className="h-3 w-3" />,
    color: "text-amber-300 bg-amber-500/10 border-amber-500/20",
    dot: "bg-amber-400 animate-pulse",
  },
  reviewed: {
    label: "Reviewed",
    icon: <Check className="h-3 w-3" />,
    color: "text-teal-300 bg-teal-500/10 border-teal-500/20",
    dot: "bg-teal-400",
  },
  no_reviews: {
    label: "No Reviews Yet",
    icon: <Minus className="h-3 w-3" />,
    color: "text-seafoam/40 bg-white/[0.03] border-white/[0.06]",
    dot: "bg-seafoam/20",
  },
};

interface ReceivedReviewProps {
  review: DiveReviewWithProfile;
}

function ReceivedReview({ review }: ReceivedReviewProps) {
  const [rating, setRating] = useState(0);

  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-4 mt-2">
      <div className="flex items-center gap-2 mb-3">
        <OceanAvatar userId={review.reviewer_id} size={28} />
        <span className="text-sm text-white/70">
          {review.profiles?.full_name ?? "Anonymous Reviewer"}
        </span>
        {review.tone && (
          <span className="text-[10px] text-seafoam/30 bg-white/[0.03] px-2 py-0.5 rounded-full">
            {review.tone}
          </span>
        )}
      </div>

      {/* Inline corrections */}
      {review.corrections && review.corrections.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {review.corrections.map((corr: any, i: number) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <CorrectionHighlight type={corr.type}>
                {corr.original_text}
              </CorrectionHighlight>
              {corr.explanation && (
                <span className="text-seafoam/40">— {corr.explanation}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Overall feedback */}
      {review.overall_feedback && (
        <p className="text-sm text-white/60 leading-relaxed mb-3">
          {review.overall_feedback}
        </p>
      )}

      {/* Rate this review */}
      <div className="flex items-center gap-1 pt-2 border-t border-white/[0.04]">
        <span className="text-[10px] text-seafoam/30 mr-2">
          Rate this review
        </span>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => setRating(star)}
            className="transition-colors"
          >
            <Star
              className={`h-3.5 w-3.5 ${
                star <= rating
                  ? "text-amber-400 fill-amber-400"
                  : "text-seafoam/20"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

interface MyDivesFeedProps {
  submissions: DiveSubmissionWithProfile[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onSubmitClick: () => void;
}

export function MyDivesFeed({
  submissions,
  loading,
  hasMore,
  onLoadMore,
  onSubmitClick,
}: MyDivesFeedProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (loading && submissions.length === 0) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="h-9 w-9 rounded-full bg-white/[0.04] animate-pulse" />
              <div className="flex-1">
                <div className="h-3.5 w-32 bg-white/[0.04] animate-pulse rounded" />
              </div>
              <div className="h-5 w-20 bg-white/[0.04] animate-pulse rounded-full" />
            </div>
            <div className="h-4 w-full bg-white/[0.04] animate-pulse rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <OceanEmptyState
        message="You haven't submitted anything yet. Your dives appear here."
        actionLabel="+ Submit your first dive"
        onAction={onSubmitClick}
      />
    );
  }

  return (
    <div className="space-y-3">
      {submissions.map((sub, idx) => {
        const status = sub.status ?? "pending";
        const config =
          STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ??
          STATUS_CONFIG.pending;
        const isExpanded = expandedId === sub.id;

        return (
          <motion.div
            key={sub.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.05 }}
          >
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${config.dot}`} />
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${config.color}`}
                  >
                    {config.icon}
                    {config.label}
                  </span>
                  <span className="text-[10px] text-seafoam/25">
                    {new Date(sub.created_at).toLocaleDateString()}
                  </span>
                </div>

                <button
                  onClick={() => setExpandedId(isExpanded ? null : sub.id)}
                  className="flex items-center gap-1 text-[11px] text-seafoam/30 hover:text-seafoam/50 transition-colors"
                >
                  {(sub.review_count ?? 0) > 0
                    ? `${sub.review_count} review${
                        (sub.review_count ?? 0) > 1 ? "s" : ""
                      }`
                    : "No reviews yet"}
                  <ChevronDown
                    className={`h-3 w-3 transition-transform ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  />
                </button>
              </div>

              {sub.prompt && (
                <p className="text-xs text-seafoam/30 italic mb-1">
                  {sub.prompt}
                </p>
              )}
              {sub.content && (
                <p className="text-sm text-white/80 leading-relaxed">
                  {sub.content}
                </p>
              )}

              {/* Expanded reviews */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden mt-3"
                  >
                    {/* Reviews would be fetched here — placeholder */}
                    <p className="text-xs text-seafoam/25 py-4 text-center">
                      Reviews will appear here when loaded…
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        );
      })}

      {hasMore && (
        <div className="flex justify-center mt-6">
          <button
            onClick={onLoadMore}
            disabled={loading}
            className="rounded-2xl bg-white/5 px-6 py-3 text-sm font-medium text-seafoam/60 hover:bg-white/10 transition-colors border border-white/5 disabled:opacity-50"
          >
            {loading ? "Loading…" : "Load more dives"}
          </button>
        </div>
      )}
    </div>
  );
}
