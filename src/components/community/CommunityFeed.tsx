"use client";

import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SubmissionCard, langFlag } from "./SubmissionCard";
import { SubmissionModal } from "./SubmissionModal";
import { useCommunityStore } from "@/lib/store/communityStore";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Waves } from "lucide-react";
import type { ExerciseType } from "@/types/community";

const TYPE_FILTERS: { value: ExerciseType | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "writing", label: "✍️ Writing" },
  { value: "speaking", label: "🎙️ Speaking" },
  { value: "translation", label: "🔄 Translation" },
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
      {/* Filter bar */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {TYPE_FILTERS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() =>
              setFilterType(
                value === "all" ? undefined : (value as ExerciseType),
              )
            }
            className={cn(
              "rounded-xl px-3.5 py-2 text-xs font-medium transition-all border",
              activeTypeFilter === value
                ? "bg-ocean-turquoise/15 text-ocean-turquoise border-ocean-turquoise/25"
                : "bg-white/[0.03] text-seafoam/50 border-white/5 hover:bg-white/5 hover:text-seafoam/70",
            )}
          >
            {label}
          </button>
        ))}

        {/* Active language indicator */}
        {filterLanguage && (
          <Badge variant="secondary" className="ml-auto">
            {langFlag(filterLanguage)} {filterLanguage.toUpperCase()}
          </Badge>
        )}
      </div>

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
              className="rounded-3xl border border-ocean-turquoise/10 p-5"
            >
              <div className="flex items-center gap-3 mb-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4 mb-3" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!feedLoading && submissions.length === 0 && !feedError && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-20 w-20 rounded-full bg-ocean-turquoise/5 flex items-center justify-center mb-6">
            <Waves className="h-10 w-10 text-ocean-turquoise/30" />
          </div>
          <h3 className="text-lg font-display font-semibold text-sand/80 mb-2">
            No submissions yet
          </h3>
          <p className="text-sm text-seafoam/40 max-w-sm">
            Be the first to submit your work for review
            {filterLanguage ? ` in ${filterLanguage.toUpperCase()}` : ""}. The
            community is waiting to help!
          </p>
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
                  "Load more submissions"
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
