"use client";

import { cn } from "@/lib/utils";
import { CardInteractive } from "@/components/ui/card";
import type { SubmissionWithProfile, ExerciseType } from "@/types/community";
import { Pen, Mic, ArrowRightLeft, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { getOceanCreature, getOceanDisplayName } from "./CommunityLeaderboard";

interface SubmissionCardProps {
  submission: SubmissionWithProfile;
  onClick?: () => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Metadata maps
// ---------------------------------------------------------------------------

const EXERCISE_ICONS: Record<ExerciseType, React.ReactNode> = {
  writing: <Pen className="h-3 w-3" />,
  speaking: <Mic className="h-3 w-3" />,
  translation: <ArrowRightLeft className="h-3 w-3" />,
};

const EXERCISE_LABELS: Record<ExerciseType, string> = {
  writing: "Writing",
  speaking: "Speaking",
  translation: "Translation",
};

const EXERCISE_TINTS: Record<ExerciseType, string> = {
  writing:
    "bg-ocean-turquoise/10 text-ocean-turquoise border-ocean-turquoise/20",
  speaking: "bg-purple-500/10 text-purple-300 border-purple-500/20",
  translation: "bg-amber-500/10 text-amber-300 border-amber-500/20",
};

/** Language code → flag emoji */
function langFlag(code: string): string {
  const flags: Record<string, string> = {
    fr: "🇫🇷",
    de: "🇩🇪",
    es: "🇪🇸",
    it: "🇮🇹",
    pt: "🇵🇹",
    nl: "🇳🇱",
    ru: "🇷🇺",
    ja: "🇯🇵",
    ko: "🇰🇷",
    zh: "🇨🇳",
    ar: "🇸🇦",
    en: "🇬🇧",
  };
  return flags[code] ?? "🌐";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SubmissionCard({
  submission,
  onClick,
  className,
}: SubmissionCardProps) {
  const profile = submission.profiles;
  const displayName = getOceanDisplayName(
    submission.user_id,
    profile?.full_name,
  );
  const creature = getOceanCreature(submission.user_id);
  const timeAgo = formatDistanceToNow(new Date(submission.created_at), {
    addSuffix: true,
  });

  const contentPreview =
    submission.content && submission.content.length > 110
      ? submission.content.slice(0, 110) + "…"
      : submission.content;

  const needsFirstReview = submission.review_count === 0;

  return (
    <CardInteractive
      className={cn(
        "group cursor-pointer border-white/[0.06] hover:border-ocean-turquoise/30",
        "transition-all duration-300",
        className,
      )}
      onClick={onClick}
    >
      <div className="p-5">
        {/* ── Header ── */}
        <div className="flex items-start gap-3 mb-3.5">
          {/* Ocean creature avatar */}
          <div className="relative shrink-0">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-ocean-turquoise/20 to-teal-900/40 border border-ocean-turquoise/15 flex items-center justify-center overflow-hidden">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={displayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-lg leading-none">{creature}</span>
              )}
            </div>
            {/* Depth indicator dot */}
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[var(--midnight)] bg-ocean-turquoise/70 block" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-sm font-medium text-sand/90 truncate">
                {displayName}
              </p>
              {/* Native → target language */}
              <span className="text-[10px] text-seafoam/30">
                {langFlag(profile?.native_language ?? "")} →{" "}
                {langFlag(submission.language)}
              </span>
            </div>
            <p className="text-xs text-seafoam/40 mt-0.5">{timeAgo}</p>
          </div>

          {/* Exercise type badge */}
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-medium shrink-0",
              EXERCISE_TINTS[submission.exercise_type],
            )}
          >
            {EXERCISE_ICONS[submission.exercise_type]}
            {EXERCISE_LABELS[submission.exercise_type]}
          </span>
        </div>

        {/* ── Prompt ── */}
        {submission.prompt && (
          <p className="text-[11px] text-seafoam/50 italic mb-2 line-clamp-1 border-l-2 border-ocean-turquoise/20 pl-2">
            {submission.prompt}
          </p>
        )}

        {/* ── Content preview ── */}
        {contentPreview ? (
          <p className="text-sm text-sand/75 font-light leading-relaxed mb-4">
            {contentPreview}
          </p>
        ) : submission.exercise_type === "speaking" ? (
          <div className="flex items-center gap-2 text-sm text-seafoam/40 mb-4 rounded-xl bg-white/[0.03] border border-white/5 px-3 py-2.5">
            <Mic className="h-4 w-4 text-purple-400/60" />
            <span className="text-xs">Audio submission — tap to listen</span>
          </div>
        ) : null}

        {/* ── Footer ── */}
        {needsFirstReview ? (
          <div className="flex items-center gap-2 rounded-xl bg-ocean-turquoise/[0.07] border border-ocean-turquoise/15 px-3 py-2 group-hover:bg-ocean-turquoise/[0.12] transition-colors">
            <Sparkles className="h-3.5 w-3.5 text-ocean-turquoise shrink-0" />
            <span className="text-xs font-medium text-ocean-turquoise">
              Be the first to review · earn +5 depth points
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-ocean-turquoise/20 text-[9px] font-bold text-ocean-turquoise">
                {submission.review_count}
              </span>
              <span className="text-xs text-seafoam/50">
                {submission.review_count === 1 ? "review" : "reviews"}
              </span>
            </div>
            <span className="text-xs text-seafoam/30 group-hover:text-ocean-turquoise transition-colors">
              View corrections →
            </span>
          </div>
        )}
      </div>
    </CardInteractive>
  );
}

export { langFlag, EXERCISE_ICONS, EXERCISE_LABELS };
