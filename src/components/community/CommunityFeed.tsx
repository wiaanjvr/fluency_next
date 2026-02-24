"use client";

import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { SubmissionCard, langFlag } from "./SubmissionCard";
import { SubmissionModal } from "./SubmissionModal";
import { useCommunityStore } from "@/lib/store/communityStore";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Waves, Pen, Mic, ArrowRightLeft } from "lucide-react";
import type { ExerciseType } from "@/types/community";

const TYPE_FILTERS: {
  value: ExerciseType | "all";
  label: string;
  icon: React.ReactNode;
}[] = [
  { value: "all", label: "All Dives", icon: <Waves className="h-3 w-3" /> },
  { value: "writing", label: "Writing", icon: <Pen className="h-3 w-3" /> },
  { value: "speaking", label: "Speaking", icon: <Mic className="h-3 w-3" /> },
  {
    value: "translation",
    label: "Translation",
    icon: <ArrowRightLeft className="h-3 w-3" />,
  },
];

// Ghost preview cards — shown in empty state to communicate what the feed will look like
const GHOST_PREVIEWS = [
  {
    creature: "🐠",
    name: "CoralDiver_42",
    time: "2 hours ago",
    type: "Writing",
    tint: "bg-ocean-turquoise/10 text-ocean-turquoise border-ocean-turquoise/20",
    prompt: "Describe your morning routine in French",
    content:
      "Le matin, je me lève à sept heures. Je prends une douche froide puis je bois mon café en regardant par la fenêtre…",
  },
  {
    creature: "🐙",
    name: "AbyssExplorer_17",
    time: "5 hours ago",
    type: "Translation",
    tint: "bg-amber-500/10 text-amber-300 border-amber-500/20",
    prompt: "Translate this paragraph from English to Spanish",
    content:
      "El océano es un lugar de misterio y maravilla. Sus profundidades esconden secretos que todavía no hemos descubierto…",
  },
];

interface CommunityFeedProps {
  /** Override default language filter */
  language?: string;
  className?: string;
}

export function CommunityFeed({ language, className }: CommunityFeedProps) {
  const { user } = useAuth();
  const {
    submissions,
    hasMore,
    feedLoading,
    feedError,
    filterLanguage,
    filterType,
    fetchFeed,
    loadMoreFeed,
    setFilterLanguage,
    setFilterType,
  } = useCommunityStore();

  const [selectedSubmissionId, setSelectedSubmissionId] = useState<
    string | null
  >(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Initial feed load
  useEffect(() => {
    if (language) {
      setFilterLanguage(language);
    } else {
      fetchFeed();
    }
  }, [language, setFilterLanguage, fetchFeed]);

  const handleCardClick = useCallback((id: string) => {
    setSelectedSubmissionId(id);
    setModalOpen(true);
  }, []);

  const activeTypeFilter = filterType ?? "all";

  return (
    <div className={cn("w-full", className)}>
      {/* Filter bar — hidden when there's too little content to filter */}
      {(submissions.length >= 3 || filterType !== undefined) && (
        <div className="flex items-center gap-1.5 mb-5 flex-wrap">
          {TYPE_FILTERS.map(({ value, label, icon }) => (
            <button
              key={value}
              onClick={() =>
                setFilterType(
                  value === "all" ? undefined : (value as ExerciseType),
                )
              }
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all border",
                activeTypeFilter === value
                  ? "bg-ocean-turquoise/15 text-ocean-turquoise border-ocean-turquoise/25"
                  : "bg-white/[0.03] text-seafoam/40 border-white/[0.05] hover:bg-white/[0.06] hover:text-seafoam/70",
              )}
            >
              {icon}
              {label}
            </button>
          ))}

          {/* Active language indicator */}
          {filterLanguage && (
            <span className="ml-auto inline-flex items-center gap-1 rounded-xl bg-white/[0.03] border border-white/[0.05] px-2.5 py-1 text-xs text-seafoam/50">
              {langFlag(filterLanguage)} {filterLanguage.toUpperCase()}
            </span>
          )}
        </div>
      )}

      {/* Error state */}
      {feedError && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-center mb-6">
          <p className="text-sm text-red-400">{feedError}</p>
          <button
            onClick={() => fetchFeed()}
            className="mt-3 rounded-xl bg-white/5 px-4 py-2 text-xs font-medium text-seafoam/60 hover:bg-white/10 transition-colors"
          >
            Try again
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {feedLoading && submissions.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-3xl border border-white/[0.06] bg-white/[0.02] p-5"
            >
              <div className="flex items-center gap-3 mb-3.5">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-28 mb-1.5" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-5 w-16 rounded-lg" />
              </div>
              <Skeleton className="h-3 w-3/4 mb-2" />
              <Skeleton className="h-4 w-full mb-1.5" />
              <Skeleton className="h-4 w-4/5 mb-4" />
              <Skeleton className="h-8 w-full rounded-xl" />
            </div>
          ))}
        </div>
      )}

      {/* Rich empty state — ghost cards + prompts */}
      {!feedLoading && submissions.length === 0 && !feedError && (
        <div className="space-y-6">
          {/* Ghost "teaser" cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-40 pointer-events-none select-none">
            {GHOST_PREVIEWS.map((ghost, i) => (
              <div
                key={i}
                className="rounded-3xl border border-ocean-turquoise/10 bg-white/[0.02] p-5"
              >
                <div className="flex items-start gap-3 mb-3.5">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-ocean-turquoise/20 to-teal-900/40 border border-ocean-turquoise/15 flex items-center justify-center text-lg">
                    {ghost.creature}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-sand/70">
                      {ghost.name}
                    </p>
                    <p className="text-xs text-seafoam/30">{ghost.time}</p>
                  </div>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-medium",
                      ghost.tint,
                    )}
                  >
                    {ghost.type}
                  </span>
                </div>
                <p className="text-[11px] text-seafoam/40 italic mb-2 border-l-2 border-ocean-turquoise/15 pl-2">
                  {ghost.prompt}
                </p>
                <p className="text-sm text-sand/50 font-light leading-relaxed mb-4">
                  {ghost.content}
                </p>
                <div className="flex items-center gap-2 rounded-xl bg-ocean-turquoise/5 border border-ocean-turquoise/10 px-3 py-2">
                  <span className="text-xs text-ocean-turquoise/60">
                    Be the first to review · earn +5 depth points
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Empty state CTA overlay */}
          <div className="text-center -mt-2">
            <div className="inline-flex flex-col items-center gap-3 rounded-2xl border border-ocean-turquoise/15 bg-ocean-turquoise/[0.05] px-8 py-6">
              <span className="text-3xl">🌊</span>
              <div>
                <h3 className="text-base font-display font-semibold text-sand/80 mb-1">
                  The tank is calm — for now
                </h3>
                <p className="text-sm text-seafoam/40 max-w-xs">
                  No open submissions yet. Be the first to dive in — submit your
                  work and start the current.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Submissions grid */}
      {submissions.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {submissions.map((submission) => (
              <SubmissionCard
                key={submission.id}
                submission={submission}
                onClick={() => handleCardClick(submission.id)}
              />
            ))}
          </div>

          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center mt-8">
              <button
                onClick={loadMoreFeed}
                disabled={feedLoading}
                className="flex items-center gap-2 rounded-2xl bg-white/5 px-6 py-3 text-sm font-medium text-seafoam/60 hover:bg-white/10 hover:text-seafoam transition-colors border border-white/5 disabled:opacity-50"
              >
                {feedLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading…
                  </>
                ) : (
                  "Dive deeper — load more"
                )}
              </button>
            </div>
          )}
        </>
      )}

      {/* Submission detail modal */}
      <SubmissionModal
        submissionId={selectedSubmissionId}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  );
}
