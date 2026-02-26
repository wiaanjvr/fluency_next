"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Clock, Mic, Star } from "lucide-react";
import { OceanAvatar } from "./OceanAvatar";
import { AudioWaveform } from "./AudioWaveform";
import { AudioReviewPanel } from "./AudioReviewPanel";
import type { DiveSubmissionWithProfile } from "@/types/dive-tank";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

interface AudioSubmissionCardProps {
  submission: DiveSubmissionWithProfile;
}

export function AudioSubmissionCard({ submission }: AudioSubmissionCardProps) {
  const [reviewOpen, setReviewOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const profile = submission.profiles;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`rounded-2xl bg-white/[0.03] border-l-2 border border-white/[0.06] p-5 transition-all duration-200 ${
          hovered
            ? "border-l-purple-400 border-purple-400/30 scale-[1.005]"
            : "border-l-purple-500/30"
        }`}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <OceanAvatar
            userId={profile?.id ?? submission.user_id}
            size={36}
            isOnline={profile?.is_online}
          />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium text-white/80">
              {profile?.full_name ?? "Anonymous Diver"}
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              {submission.proficiency_level && (
                <span className="text-[10px] text-purple-300 bg-purple-500/10 border border-purple-500/20 rounded-full px-2 py-0.5 font-medium">
                  {submission.proficiency_level}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium text-purple-300 bg-purple-500/15 border-purple-500/20">
              <Mic className="h-3 w-3" />
              Speaking
            </span>
            <span className="flex items-center gap-1 text-[10px] text-seafoam/30">
              <Clock className="h-3 w-3" />
              {timeAgo(submission.created_at)}
            </span>
          </div>
        </div>

        {/* Prompt */}
        {submission.prompt && (
          <p className="text-xs text-seafoam/35 italic mb-3">
            {submission.prompt}
          </p>
        )}

        {/* Waveform */}
        <div className="mb-3 flex items-center gap-3">
          <AudioWaveform
            audioUrl={submission.audio_url ?? undefined}
            duration={23}
            className="flex-1"
          />
          {/* Duration badge */}
          <span className="shrink-0 text-[10px] text-seafoam/30 bg-white/[0.04] rounded-lg px-2 py-1 font-mono">
            0:23
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-white/[0.04]">
          <button
            onClick={() => setReviewOpen(!reviewOpen)}
            className="flex items-center gap-2 rounded-xl border border-purple-500/20 bg-purple-500/5 px-3.5 py-2 text-[12px] text-purple-300 font-medium hover:bg-purple-500/10 transition-colors"
          >
            <Star className="h-3.5 w-3.5" />
            Review Speaking
          </button>

          {(submission.review_count ?? 0) > 0 && (
            <span className="text-[11px] text-seafoam/30">
              {submission.review_count} review
              {(submission.review_count ?? 0) > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Audio review panel */}
      {reviewOpen && (
        <AudioReviewPanel
          submission={submission}
          onClose={() => setReviewOpen(false)}
        />
      )}
    </motion.div>
  );
}
