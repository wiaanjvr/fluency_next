"use client";

import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ReviewCard } from "./ReviewCard";
import { ReviewForm } from "./ReviewForm";
import { AudioPlayer } from "./AudioPlayer";
import { langFlag, EXERCISE_LABELS, EXERCISE_ICONS } from "./SubmissionCard";
import { getOceanCreature, getOceanDisplayName } from "./CommunityLeaderboard";
import { useCommunityStore } from "@/lib/store/communityStore";
import { useAuth } from "@/contexts/AuthContext";
import type { SubmitReviewPayload } from "@/types/community";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare } from "lucide-react";

interface SubmissionModalProps {
  submissionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SubmissionModal({
  submissionId,
  open,
  onOpenChange,
}: SubmissionModalProps) {
  const { user } = useAuth();
  const {
    activeSubmission,
    activeReviews,
    activeLoading,
    isReviewing,
    fetchSubmission,
    clearActiveSubmission,
    subscribeToReviews,
    unsubscribeFromReviews,
    submitReview,
    voteHelpful,
  } = useCommunityStore();

  const [showReviewForm, setShowReviewForm] = useState(false);
  const [xpMessage, setXpMessage] = useState<string | null>(null);

  // Load submission and subscribe to realtime on open
  useEffect(() => {
    if (open && submissionId) {
      fetchSubmission(submissionId, user?.id);
      subscribeToReviews(submissionId, user?.id);
    }
    return () => {
      if (!open) {
        clearActiveSubmission();
        unsubscribeFromReviews();
      }
    };
  }, [
    open,
    submissionId,
    user?.id,
    fetchSubmission,
    subscribeToReviews,
    clearActiveSubmission,
    unsubscribeFromReviews,
  ]);

  const isOwnSubmission = activeSubmission?.user_id === user?.id;
  const hasReviewed = activeReviews.some((r) => r.reviewer_id === user?.id);

  const handleSubmitReview = useCallback(
    async (payload: SubmitReviewPayload) => {
      try {
        const { xpAwarded } = await submitReview(payload);
        setShowReviewForm(false);
        setXpMessage(`You earned +${xpAwarded} XP for this review 🌊`);
        setTimeout(() => setXpMessage(null), 4000);
      } catch (err) {
        console.error("Failed to submit review:", err);
      }
    },
    [submitReview],
  );

  const profile = activeSubmission?.profiles;
  const displayName = activeSubmission
    ? getOceanDisplayName(activeSubmission.user_id, profile?.full_name)
    : "";
  const creature = activeSubmission
    ? getOceanCreature(activeSubmission.user_id)
    : "🌊";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="overflow-y-auto sm:max-w-xl w-full">
        {activeLoading || !activeSubmission ? (
          // Loading skeleton
          <div className="space-y-4 pt-8">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : (
          <div className="pt-2">
            <SheetHeader className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                {/* Author avatar */}
                <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-ocean-turquoise/20 to-teal-900/40 border border-ocean-turquoise/15 flex items-center justify-center overflow-hidden">
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
                <div>
                  <SheetTitle className="text-base">{displayName}</SheetTitle>
                  <SheetDescription>
                    {formatDistanceToNow(
                      new Date(activeSubmission.created_at),
                      {
                        addSuffix: true,
                      },
                    )}
                  </SheetDescription>
                </div>
              </div>

              {/* Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="default" className="gap-1">
                  {EXERCISE_ICONS[activeSubmission.exercise_type]}
                  {EXERCISE_LABELS[activeSubmission.exercise_type]}
                </Badge>
                <Badge variant="secondary">
                  {langFlag(activeSubmission.language)}{" "}
                  {activeSubmission.language.toUpperCase()}
                </Badge>
                <Badge
                  variant={
                    activeSubmission.review_count > 0 ? "success" : "outline"
                  }
                >
                  <MessageSquare className="h-3 w-3 mr-1" />
                  {activeSubmission.review_count === 0
                    ? "Be the first to review"
                    : `${activeSubmission.review_count} review${activeSubmission.review_count !== 1 ? "s" : ""}`}
                </Badge>
              </div>
            </SheetHeader>

            {/* Prompt */}
            {activeSubmission.prompt && (
              <div className="mb-4 rounded-xl border border-ocean-turquoise/10 bg-white/[0.02] p-4">
                <p className="text-xs text-seafoam/50 font-medium mb-1">
                  Exercise prompt
                </p>
                <p className="text-sm text-sand/70 italic font-light">
                  &ldquo;{activeSubmission.prompt}&rdquo;
                </p>
              </div>
            )}

            {/* Content */}
            {activeSubmission.content && (
              <div className="mb-4 rounded-xl border border-ocean-turquoise/10 bg-white/[0.02] p-4">
                <p className="text-xs text-seafoam/50 font-medium mb-2">
                  Submission
                </p>
                <p className="text-sm text-sand/90 font-light leading-relaxed whitespace-pre-wrap">
                  {activeSubmission.content}
                </p>
              </div>
            )}

            {/* Audio player for speaking submissions */}
            {activeSubmission.audio_url && (
              <div className="mb-4">
                <p className="text-xs text-seafoam/50 font-medium mb-2">
                  Audio submission
                </p>
                <AudioPlayer src={activeSubmission.audio_url} />
              </div>
            )}

            {/* XP awarded message */}
            {xpMessage && (
              <div className="mb-4 rounded-xl border border-ocean-turquoise/20 bg-ocean-turquoise/5 px-4 py-3 text-sm text-ocean-turquoise font-medium text-center animate-in fade-in slide-in-from-top-2 duration-300">
                {xpMessage}
              </div>
            )}

            {/* Reviews section */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-display font-semibold text-sand">
                  Corrections from the community
                </h3>
                {!isOwnSubmission && !hasReviewed && !showReviewForm && (
                  <button
                    onClick={() => setShowReviewForm(true)}
                    className="rounded-xl bg-[var(--turquoise)] text-[var(--midnight)] px-3 py-1.5 text-xs font-semibold hover:brightness-110 transition-all"
                  >
                    Write a correction
                  </button>
                )}
              </div>

              {activeReviews.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-ocean-turquoise/15 bg-ocean-turquoise/[0.03] p-8 text-center">
                  <span className="text-2xl block mb-2">🤿</span>
                  <p className="text-sm font-medium text-sand/60 mb-1">
                    No corrections yet
                  </p>
                  <p className="text-xs text-seafoam/30">
                    Be the first dive buddy to help — earn +5 depth points
                  </p>
                  {!isOwnSubmission && !hasReviewed && !showReviewForm && (
                    <button
                      onClick={() => setShowReviewForm(true)}
                      className="mt-4 rounded-xl bg-ocean-turquoise/15 border border-ocean-turquoise/20 px-4 py-2 text-xs font-medium text-ocean-turquoise hover:bg-ocean-turquoise/25 transition-colors"
                    >
                      Dive in and review →
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {activeReviews.map((review) => (
                    <ReviewCard
                      key={review.id}
                      review={review}
                      originalText={activeSubmission.content}
                      onVoteHelpful={voteHelpful}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Review form (inline, below reviews) */}
            {showReviewForm && !isOwnSubmission && !hasReviewed && (
              <ReviewForm
                submissionId={activeSubmission.id}
                originalText={activeSubmission.content}
                isSubmitting={isReviewing}
                onSubmit={handleSubmitReview}
                className="mt-4"
              />
            )}

            {/* Message if user already reviewed */}
            {hasReviewed && (
              <div className="mt-4 rounded-xl border border-ocean-turquoise/15 bg-ocean-turquoise/5 px-4 py-3 text-center">
                <p className="text-sm text-ocean-turquoise/80">
                  You have already reviewed this submission ✓
                </p>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
