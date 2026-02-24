"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ReviewCard } from "@/components/community/ReviewCard";
import { ReviewForm } from "@/components/community/ReviewForm";
import { AudioPlayer } from "@/components/community/AudioPlayer";
import {
  langFlag,
  EXERCISE_LABELS,
  EXERCISE_ICONS,
} from "@/components/community/SubmissionCard";
import {
  getOceanCreature,
  getOceanDisplayName,
} from "@/components/community/CommunityLeaderboard";
import { useCommunityStore } from "@/lib/store/communityStore";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import type { SubmitReviewPayload } from "@/types/community";
import "@/styles/ocean-theme.css";

export default function SubmissionDetailPage() {
  const params = useParams();
  const submissionId = params.submissionId as string;
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

  useEffect(() => {
    if (submissionId) {
      fetchSubmission(submissionId, user?.id);
      subscribeToReviews(submissionId, user?.id);
    }
    return () => {
      clearActiveSubmission();
      unsubscribeFromReviews();
    };
  }, [
    submissionId,
    user?.id,
    fetchSubmission,
    subscribeToReviews,
    clearActiveSubmission,
    unsubscribeFromReviews,
  ]);

  const isOwnSubmission = activeSubmission?.user_id === user?.id;
  const hasReviewed = activeReviews.some((r) => r.reviewer_id === user?.id);

  const handleSubmitReview = async (payload: SubmitReviewPayload) => {
    try {
      const { xpAwarded } = await submitReview(payload);
      setShowReviewForm(false);
      setXpMessage(`You earned +${xpAwarded} XP for this review 🌊`);
      setTimeout(() => setXpMessage(null), 4000);
    } catch (err) {
      console.error("Failed to submit review:", err);
    }
  };

  const profile = activeSubmission?.profiles;
  const displayName = activeSubmission
    ? getOceanDisplayName(activeSubmission.user_id, profile?.full_name)
    : "";
  const creature = activeSubmission
    ? getOceanCreature(activeSubmission.user_id)
    : "🌊";

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[var(--midnight)]">
        <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
          {/* Back link */}
          <Link
            href="/community"
            className="inline-flex items-center gap-2 text-sm text-seafoam/50 hover:text-seafoam transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Community
          </Link>

          {activeLoading || !activeSubmission ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <>
              {/* Author header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="h-12 w-12 shrink-0 rounded-full bg-gradient-to-br from-ocean-turquoise/20 to-teal-900/40 border border-ocean-turquoise/15 flex items-center justify-center overflow-hidden">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={displayName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-xl leading-none">{creature}</span>
                  )}
                </div>
                <div>
                  <h1 className="text-xl font-display font-semibold text-sand">
                    {displayName}
                  </h1>
                  <p className="text-sm text-seafoam/50">
                    {formatDistanceToNow(
                      new Date(activeSubmission.created_at),
                      {
                        addSuffix: true,
                      },
                    )}
                  </p>
                </div>
              </div>

              {/* Badges */}
              <div className="flex items-center gap-2 flex-wrap mb-6">
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
                  {activeSubmission.review_count} review
                  {activeSubmission.review_count !== 1 ? "s" : ""}
                </Badge>
              </div>

              {/* Prompt */}
              {activeSubmission.prompt && (
                <div className="mb-6 rounded-2xl border border-ocean-turquoise/10 bg-white/[0.02] p-5">
                  <p className="text-xs text-seafoam/50 font-medium mb-2">
                    Exercise prompt
                  </p>
                  <p className="text-sm text-sand/70 italic font-light">
                    &ldquo;{activeSubmission.prompt}&rdquo;
                  </p>
                </div>
              )}

              {/* Content */}
              {activeSubmission.content && (
                <div className="mb-6 rounded-2xl border border-ocean-turquoise/10 bg-white/[0.02] p-5">
                  <p className="text-xs text-seafoam/50 font-medium mb-2">
                    Submission
                  </p>
                  <p className="text-base text-sand/90 font-light leading-relaxed whitespace-pre-wrap">
                    {activeSubmission.content}
                  </p>
                </div>
              )}

              {/* Audio */}
              {activeSubmission.audio_url && (
                <div className="mb-6">
                  <p className="text-xs text-seafoam/50 font-medium mb-2">
                    Audio submission
                  </p>
                  <AudioPlayer src={activeSubmission.audio_url} />
                </div>
              )}

              {/* XP message */}
              {xpMessage && (
                <div className="mb-6 rounded-xl border border-ocean-turquoise/20 bg-ocean-turquoise/5 px-4 py-3 text-sm text-ocean-turquoise font-medium text-center">
                  {xpMessage}
                </div>
              )}

              {/* Reviews */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-display font-semibold text-sand">
                    Reviews
                  </h2>
                  {!isOwnSubmission && !hasReviewed && !showReviewForm && (
                    <button
                      onClick={() => setShowReviewForm(true)}
                      className="rounded-xl bg-ocean-turquoise/15 px-4 py-2 text-sm font-medium text-ocean-turquoise hover:bg-ocean-turquoise/25 transition-colors border border-ocean-turquoise/20"
                    >
                      Write a review
                    </button>
                  )}
                </div>

                {activeReviews.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-ocean-turquoise/10 bg-white/[0.01] p-10 text-center">
                    <p className="text-seafoam/40 text-sm">
                      No reviews yet. Be the first to help!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
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

              {/* Review form */}
              {showReviewForm && !isOwnSubmission && !hasReviewed && (
                <ReviewForm
                  submissionId={activeSubmission.id}
                  originalText={activeSubmission.content}
                  isSubmitting={isReviewing}
                  onSubmit={handleSubmitReview}
                />
              )}

              {hasReviewed && (
                <div className="rounded-xl border border-ocean-turquoise/15 bg-ocean-turquoise/5 px-4 py-3 text-center">
                  <p className="text-sm text-ocean-turquoise/80">
                    You have already reviewed this submission ✓
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
