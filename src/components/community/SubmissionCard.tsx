"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { CardInteractive } from "@/components/ui/card";
import type { SubmissionWithProfile, ExerciseType } from "@/types/community";
import { MessageSquare, Pen, Mic, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface SubmissionCardProps {
  submission: SubmissionWithProfile;
  onClick?: () => void;
  className?: string;
}

const EXERCISE_ICONS: Record<ExerciseType, React.ReactNode> = {
  writing: <Pen className="h-3.5 w-3.5" />,
  speaking: <Mic className="h-3.5 w-3.5" />,
  translation: <RefreshCw className="h-3.5 w-3.5" />,
};

const EXERCISE_LABELS: Record<ExerciseType, string> = {
  writing: "Writing",
  speaking: "Speaking",
  translation: "Translation",
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

export function SubmissionCard({
  submission,
  onClick,
  className,
}: SubmissionCardProps) {
  const profile = submission.profiles;
  const displayName = profile?.full_name || "Anonymous Learner";
  const timeAgo = formatDistanceToNow(new Date(submission.created_at), {
    addSuffix: true,
  });

  const contentPreview =
    submission.content && submission.content.length > 100
      ? submission.content.slice(0, 100) + "…"
      : submission.content;

  return (
    <CardInteractive
      className={cn(
        "group cursor-pointer border-ocean-turquoise/10 hover:border-ocean-turquoise/30",
        className,
      )}
      onClick={onClick}
    >
      <div className="p-5">
        {/* Header: avatar, name, time */}
        <div className="flex items-center gap-3 mb-3">
          {/* Avatar */}
          <div className="h-9 w-9 shrink-0 rounded-full bg-ocean-turquoise/10 flex items-center justify-center overflow-hidden">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={displayName}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-sm font-medium text-ocean-turquoise">
                {displayName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sand truncate">
              {displayName}
            </p>
            <p className="text-xs text-seafoam/50">{timeAgo}</p>
          </div>
          {/* Native language flag */}
          <span
            className="text-lg"
            title={`Native: ${profile?.native_language}`}
          >
            {langFlag(profile?.native_language ?? "")}
          </span>
        </div>

        {/* Badges row */}
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="default" className="gap-1">
            {EXERCISE_ICONS[submission.exercise_type]}
            {EXERCISE_LABELS[submission.exercise_type]}
          </Badge>
          <Badge variant="secondary">
            {langFlag(submission.language)} {submission.language.toUpperCase()}
          </Badge>
        </div>

        {/* Prompt */}
        {submission.prompt && (
          <p className="text-xs text-seafoam/60 italic mb-2 line-clamp-1">
            &ldquo;{submission.prompt}&rdquo;
          </p>
        )}

        {/* Content preview */}
        {contentPreview ? (
          <p className="text-sm text-sand/80 font-light leading-relaxed mb-3">
            {contentPreview}
          </p>
        ) : submission.exercise_type === "speaking" ? (
          <div className="flex items-center gap-2 text-sm text-seafoam/50 mb-3">
            <Mic className="h-4 w-4" />
            <span>Audio submission — tap to listen</span>
          </div>
        ) : null}

        {/* Footer: review count + CTA */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <MessageSquare
              className={cn(
                "h-4 w-4",
                submission.review_count > 0
                  ? "text-ocean-turquoise"
                  : "text-seafoam/30",
              )}
            />
            <span
              className={cn(
                "text-xs font-medium",
                submission.review_count > 0
                  ? "text-ocean-turquoise"
                  : "text-seafoam/40",
              )}
            >
              {submission.review_count}{" "}
              {submission.review_count === 1 ? "review" : "reviews"}
            </span>
          </div>
          <span className="text-xs text-seafoam/40 group-hover:text-ocean-turquoise transition-colors">
            Read full submission →
          </span>
        </div>
      </div>
    </CardInteractive>
  );
}

export { langFlag, EXERCISE_ICONS, EXERCISE_LABELS };
