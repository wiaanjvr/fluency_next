// ==========================================================================
// Community Peer Review — Zustand store
// ==========================================================================

import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";
import {
  fetchCommunityFeed,
  fetchSubmission,
  fetchReviews,
  submitForReview as submitForReviewLib,
  submitReview as submitReviewLib,
  toggleHelpfulVote as toggleHelpfulVoteLib,
  fetchMySubmissions,
} from "@/lib/community";
import type {
  SubmissionWithProfile,
  ReviewWithProfile,
  CommunityFeedParams,
  ExerciseType,
  SubmitForReviewPayload,
  SubmitReviewPayload,
} from "@/types/community";

// ---------------------------------------------------------------------------
// State interface
// ---------------------------------------------------------------------------

interface CommunityState {
  // Feed
  submissions: SubmissionWithProfile[];
  hasMore: boolean;
  page: number;
  feedLoading: boolean;
  feedError: string | null;

  // Feed filters
  filterLanguage: string | undefined;
  filterType: ExerciseType | undefined;

  // Active submission (detail view)
  activeSubmission: SubmissionWithProfile | null;
  activeReviews: ReviewWithProfile[];
  activeLoading: boolean;

  // My submissions
  mySubmissions: SubmissionWithProfile[];
  mySubmissionsHasMore: boolean;
  mySubmissionsPage: number;
  mySubmissionsLoading: boolean;

  // Mutation loading states
  isSubmitting: boolean;
  isReviewing: boolean;

  // Realtime subscription cleanup
  _realtimeCleanup: (() => void) | null;

  // Actions – feed
  fetchFeed: (params?: CommunityFeedParams) => Promise<void>;
  loadMoreFeed: () => Promise<void>;
  setFilterLanguage: (language: string | undefined) => void;
  setFilterType: (type: ExerciseType | undefined) => void;

  // Actions – active submission
  fetchSubmission: (id: string, currentUserId?: string) => Promise<void>;
  clearActiveSubmission: () => void;
  subscribeToReviews: (submissionId: string, currentUserId?: string) => void;
  unsubscribeFromReviews: () => void;

  // Actions – my submissions
  fetchMySubmissions: (userId: string) => Promise<void>;
  loadMoreMySubmissions: (userId: string) => Promise<void>;

  // Actions – mutations
  submitForReview: (
    payload: SubmitForReviewPayload,
  ) => Promise<SubmissionWithProfile>;
  submitReview: (
    payload: SubmitReviewPayload,
  ) => Promise<{ xpAwarded: number }>;
  voteHelpful: (reviewId: string) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useCommunityStore = create<CommunityState>((set, get) => ({
  // Initial state
  submissions: [],
  hasMore: false,
  page: 0,
  feedLoading: false,
  feedError: null,
  filterLanguage: undefined,
  filterType: undefined,
  activeSubmission: null,
  activeReviews: [],
  activeLoading: false,
  mySubmissions: [],
  mySubmissionsHasMore: false,
  mySubmissionsPage: 0,
  mySubmissionsLoading: false,
  isSubmitting: false,
  isReviewing: false,
  _realtimeCleanup: null,

  // ---- Feed ----

  fetchFeed: async (params) => {
    const { filterLanguage, filterType } = get();
    set({ feedLoading: true, feedError: null, page: 0 });
    try {
      const result = await fetchCommunityFeed({
        language: params?.language ?? filterLanguage,
        exercise_type: params?.exercise_type ?? filterType,
        status: params?.status ?? "open",
        page: 0,
        ...params,
      });
      set({
        submissions: result.submissions,
        hasMore: result.hasMore,
        page: 0,
        feedLoading: false,
      });
    } catch (err: unknown) {
      set({
        feedError: err instanceof Error ? err.message : "Failed to load feed",
        feedLoading: false,
      });
    }
  },

  loadMoreFeed: async () => {
    const { page, filterLanguage, filterType, submissions, hasMore } = get();
    if (!hasMore) return;
    const nextPage = page + 1;
    set({ feedLoading: true });
    try {
      const result = await fetchCommunityFeed({
        language: filterLanguage,
        exercise_type: filterType,
        page: nextPage,
      });
      set({
        submissions: [...submissions, ...result.submissions],
        hasMore: result.hasMore,
        page: nextPage,
        feedLoading: false,
      });
    } catch {
      set({ feedLoading: false });
    }
  },

  setFilterLanguage: (language) => {
    set({ filterLanguage: language });
    get().fetchFeed({ language });
  },

  setFilterType: (type) => {
    set({ filterType: type });
    get().fetchFeed({ exercise_type: type });
  },

  // ---- Active submission ----

  fetchSubmission: async (id, currentUserId) => {
    set({ activeLoading: true });
    try {
      const [submission, reviews] = await Promise.all([
        fetchSubmission(id),
        fetchReviews(id, currentUserId),
      ]);
      set({
        activeSubmission: submission,
        activeReviews: reviews,
        activeLoading: false,
      });
    } catch {
      set({ activeLoading: false });
    }
  },

  clearActiveSubmission: () => {
    get().unsubscribeFromReviews();
    set({ activeSubmission: null, activeReviews: [] });
  },

  subscribeToReviews: (submissionId, currentUserId) => {
    // Clean up any previous subscription
    get().unsubscribeFromReviews();

    const supabase = createClient();
    const channel = supabase
      .channel(`reviews:${submissionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "community_reviews",
          filter: `submission_id=eq.${submissionId}`,
        },
        async () => {
          // Refetch reviews to get full joined data
          const reviews = await fetchReviews(submissionId, currentUserId);
          set({ activeReviews: reviews });
        },
      )
      .subscribe();

    set({
      _realtimeCleanup: () => {
        supabase.removeChannel(channel);
      },
    });
  },

  unsubscribeFromReviews: () => {
    const cleanup = get()._realtimeCleanup;
    if (cleanup) {
      cleanup();
      set({ _realtimeCleanup: null });
    }
  },

  // ---- My submissions ----

  fetchMySubmissions: async (userId) => {
    set({ mySubmissionsLoading: true, mySubmissionsPage: 0 });
    try {
      const result = await fetchMySubmissions(userId, 0);
      set({
        mySubmissions: result.submissions,
        mySubmissionsHasMore: result.hasMore,
        mySubmissionsPage: 0,
        mySubmissionsLoading: false,
      });
    } catch {
      set({ mySubmissionsLoading: false });
    }
  },

  loadMoreMySubmissions: async (userId) => {
    const { mySubmissionsPage, mySubmissions, mySubmissionsHasMore } = get();
    if (!mySubmissionsHasMore) return;
    const nextPage = mySubmissionsPage + 1;
    set({ mySubmissionsLoading: true });
    try {
      const result = await fetchMySubmissions(userId, nextPage);
      set({
        mySubmissions: [...mySubmissions, ...result.submissions],
        mySubmissionsHasMore: result.hasMore,
        mySubmissionsPage: nextPage,
        mySubmissionsLoading: false,
      });
    } catch {
      set({ mySubmissionsLoading: false });
    }
  },

  // ---- Mutations ----

  submitForReview: async (payload) => {
    set({ isSubmitting: true });
    try {
      const submission = await submitForReviewLib(payload);
      // Add to my submissions optimistically
      set((state) => ({
        mySubmissions: [submission, ...state.mySubmissions],
        isSubmitting: false,
      }));
      return submission;
    } catch (err) {
      set({ isSubmitting: false });
      throw err;
    }
  },

  submitReview: async (payload) => {
    set({ isReviewing: true });
    try {
      const { review, xpAwarded } = await submitReviewLib(payload);
      // Add the review to active reviews optimistically
      set((state) => ({
        activeReviews: [...state.activeReviews, review],
        isReviewing: false,
        // Update the submission review count in the feed
        submissions: state.submissions.map((s) =>
          s.id === payload.submission_id
            ? {
                ...s,
                review_count: s.review_count + 1,
                status: s.review_count === 0 ? ("reviewed" as const) : s.status,
              }
            : s,
        ),
      }));
      return { xpAwarded };
    } catch (err) {
      set({ isReviewing: false });
      throw err;
    }
  },

  voteHelpful: async (reviewId) => {
    const { activeReviews } = get();
    const review = activeReviews.find((r) => r.id === reviewId);
    if (!review) return;

    // Optimistic update
    const wasVoted = review.has_voted;
    set({
      activeReviews: activeReviews.map((r) =>
        r.id === reviewId
          ? {
              ...r,
              has_voted: !wasVoted,
              helpful_votes: wasVoted
                ? Math.max(r.helpful_votes - 1, 0)
                : r.helpful_votes + 1,
            }
          : r,
      ),
    });

    try {
      await toggleHelpfulVoteLib(reviewId);
    } catch {
      // Revert on error
      set({
        activeReviews: activeReviews.map((r) =>
          r.id === reviewId
            ? { ...r, has_voted: wasVoted, helpful_votes: review.helpful_votes }
            : r,
        ),
      });
    }
  },
}));
