"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Clock, Pen, Mic, BookOpen, Star } from "lucide-react";
import { OceanAvatar } from "./OceanAvatar";
import { AudioWaveform } from "./AudioWaveform";
import { ReviewPanel } from "./ReviewPanel";
import type { DiveSubmissionWithProfile } from "@/types/dive-tank";

const TYPE_CONFIG = {
  writing: {
    label: "Writing",
    color: "text-blue-300 bg-blue-500/15 border-blue-500/20",
    icon: <Pen className="h-3 w-3" />,
  },
  speaking: {
    label: "Speaking",
    color: "text-purple-300 bg-purple-500/15 border-purple-500/20",
    icon: <Mic className="h-3 w-3" />,
  },
  grammar: {
    label: "Grammar",
    color: "text-amber-300 bg-amber-500/15 border-amber-500/20",
    icon: <BookOpen className="h-3 w-3" />,
  },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface SubmissionCardProps {
  submission: DiveSubmissionWithProfile;
  showReviewAction?: boolean;
  onClick?: () => void;
}

export function SubmissionCard({
  submission,
  showReviewAction = true,
  onClick,
}: SubmissionCardProps) {
  const [reviewOpen, setReviewOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

  const type =
    submission.type ?? (submission as any).exercise_type ?? "writing";
  const typeConfig =
    TYPE_CONFIG[type as keyof typeof TYPE_CONFIG] ?? TYPE_CONFIG.writing;
  const profile = submission.profiles;
  const hasReviews = (submission.review_count ?? 0) > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`rounded-2xl bg-white/[0.03] border-l-2 border border-white/[0.06] p-5 transition-all duration-200 cursor-pointer ${
          hovered
            ? "border-l-teal-400 border-teal-400/30 scale-[1.005] shadow-lg shadow-teal-900/10"
            : "border-l-teal-500/30"
        }`}
        onClick={onClick}
      >
        {/* Top row: avatar + meta */}
        <div className="flex items-center gap-3 mb-3">
          <OceanAvatar
            userId={profile?.id ?? submission.user_id}
            size={36}
            isOnline={profile?.is_online}
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-white/80 truncate">
                {profile?.full_name ?? "Anonymous Diver"}
              </span>
              <span className="text-[10px] text-seafoam/30 px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06]">
                🇬🇧 → 🇩🇪
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${typeConfig.color}`}
            >
              {typeConfig.icon}
              {typeConfig.label}
            </span>
            <span className="flex items-center gap-1 text-[10px] text-seafoam/30">
              <Clock className="h-3 w-3" />
              {timeAgo(submission.created_at)}
            </span>
          </div>
        </div>

        {/* Prompt */}
        {submission.prompt && (
          <p className="text-xs text-seafoam/35 italic mb-2 leading-relaxed">
            {submission.prompt}
          </p>
        )}

        {/* Content */}
        {submission.content && (
          <p className="text-[15px] text-white/90 leading-relaxed mb-3">
            {submission.content}
          </p>
        )}

        {/* Audio waveform for speaking */}
        {type === "speaking" && submission.audio_url && (
          <div className="mb-3">
            <AudioWaveform audioUrl={submission.audio_url} duration={23} />
          </div>
        )}

        {/* Bottom action row */}
        {showReviewAction && (
          <div className="flex items-center justify-between mt-2 pt-3 border-t border-white/[0.04]">
            {!hasReviews ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setReviewOpen(!reviewOpen);
                }}
                className="flex items-center gap-2 rounded-xl border border-teal-500/20 bg-teal-500/5 px-3.5 py-2 text-[12px] text-teal-300 font-medium hover:bg-teal-500/10 transition-colors group"
              >
                <Star className="h-3.5 w-3.5" />
                Be the first to review · earn{" "}
                <span className="text-teal-400 group-hover:text-teal-300">
                  +5 DP
                </span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                {/* Stacked reviewer avatars */}
                <div className="flex -space-x-2">
                  {Array.from({
                    length: Math.min(submission.review_count ?? 0, 3),
                  }).map((_, i) => (
                    <OceanAvatar
                      key={i}
                      userId={`reviewer-${submission.id}-${i}`}
                      size={24}
                      className="ring-2 ring-[var(--midnight)]"
                    />
                  ))}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setReviewOpen(!reviewOpen);
                  }}
                  className="text-[12px] text-teal-300/70 hover:text-teal-300 transition-colors"
                >
                  {submission.review_count} review
                  {(submission.review_count ?? 0) > 1 ? "s" : ""} · Add yours
                </button>
              </div>
            )}

            {submission.depth_points_earned > 0 && (
              <span className="text-[11px] text-teal-400 font-medium bg-teal-500/10 px-2 py-1 rounded-lg">
                +{submission.depth_points_earned} DP
              </span>
            )}
          </div>
        )}
      </div>

      {/* Inline review panel */}
      {reviewOpen && (
        <ReviewPanel
          submission={submission}
          onClose={() => setReviewOpen(false)}
        />
      )}
    </motion.div>
  );
}

/** Skeleton card for loading states */
export function SubmissionCardSkeleton() {
  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-9 w-9 rounded-full bg-white/[0.04] animate-pulse" />
        <div className="flex-1">
          <div className="h-3.5 w-28 bg-white/[0.04] animate-pulse rounded" />
          <div className="h-2.5 w-16 bg-white/[0.04] animate-pulse rounded mt-1.5" />
        </div>
        <div className="h-5 w-16 bg-white/[0.04] animate-pulse rounded-full" />
      </div>
      <div className="h-4 w-full bg-white/[0.04] animate-pulse rounded mb-2" />
      <div className="h-4 w-3/4 bg-white/[0.04] animate-pulse rounded mb-2" />
      <div className="h-3 w-24 bg-white/[0.04] animate-pulse rounded mt-4" />
    </div>
  );
}
