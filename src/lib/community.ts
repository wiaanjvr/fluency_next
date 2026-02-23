// ==========================================================================
// Community Peer Review — Supabase query helpers
// ==========================================================================

import { createClient } from "@/lib/supabase/client";
import type {
  CommunityFeedParams,
  SubmissionWithProfile,
  ReviewWithProfile,
  SubmitForReviewPayload,
  SubmitReviewPayload,
} from "@/types/community";

const FEED_PAGE_SIZE = 12;

// ---------------------------------------------------------------------------
// Feed queries
// ---------------------------------------------------------------------------

/** Fetch paginated community feed, optionally filtered */
export async function fetchCommunityFeed(params: CommunityFeedParams = {}) {
  const supabase = createClient();
  const {
    language,
    exercise_type,
    status = "open",
    page = 0,
    limit = FEED_PAGE_SIZE,
  } = params;

  let query = supabase
    .from("community_submissions")
    .select(
      `*, profiles:user_id (id, full_name, avatar_url, target_language, native_language)`,
    )
    .eq("status", status)
    .order("created_at", { ascending: false })
    .range(page * limit, (page + 1) * limit - 1);

  if (language) {
    query = query.eq("language", language);
  }
  if (exercise_type) {
    query = query.eq("exercise_type", exercise_type);
  }

  const { data, error } = await query;
  if (error) throw error;

  return {
    submissions: (data ?? []) as SubmissionWithProfile[],
    hasMore: (data?.length ?? 0) === limit,
  };
}

/** Fetch a single submission with its author profile */
export async function fetchSubmission(submissionId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("community_submissions")
    .select(
      `*, profiles:user_id (id, full_name, avatar_url, target_language, native_language)`,
    )
    .eq("id", submissionId)
    .single();

  if (error) throw error;
  return data as SubmissionWithProfile;
}

/** Fetch reviews for a submission, with reviewer profiles and vote state */
export async function fetchReviews(
  submissionId: string,
  currentUserId?: string,
) {
  const supabase = createClient();

  const { data: reviews, error } = await supabase
    .from("community_reviews")
    .select(
      `*, profiles:reviewer_id (id, full_name, avatar_url, target_language, native_language)`,
    )
    .eq("submission_id", submissionId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  // If we have a current user, check which reviews they have voted on
  if (currentUserId && reviews && reviews.length > 0) {
    const reviewIds = reviews.map((r: ReviewWithProfile) => r.id);
    const { data: votes } = await supabase
      .from("community_review_votes")
      .select("review_id")
      .eq("voter_id", currentUserId)
      .in("review_id", reviewIds);

    const votedSet = new Set(
      (votes ?? []).map((v: { review_id: string }) => v.review_id),
    );
    return reviews.map((r: ReviewWithProfile) => ({
      ...r,
      has_voted: votedSet.has(r.id),
    })) as ReviewWithProfile[];
  }

  return (reviews ?? []) as ReviewWithProfile[];
}

/** Fetch the current user's submissions */
export async function fetchMySubmissions(
  userId: string,
  page = 0,
  limit = FEED_PAGE_SIZE,
) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("community_submissions")
    .select(
      `*, profiles:user_id (id, full_name, avatar_url, target_language, native_language)`,
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(page * limit, (page + 1) * limit - 1);

  if (error) throw error;
  return {
    submissions: (data ?? []) as SubmissionWithProfile[],
    hasMore: (data?.length ?? 0) === limit,
  };
}

/** Fetch reviews the current user has given */
export async function fetchMyReviews(
  userId: string,
  page = 0,
  limit = FEED_PAGE_SIZE,
) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("community_reviews")
    .select(
      `*, profiles:reviewer_id (id, full_name, avatar_url, target_language, native_language), community_submissions (id, language, exercise_type, prompt, content)`,
    )
    .eq("reviewer_id", userId)
    .order("created_at", { ascending: false })
    .range(page * limit, (page + 1) * limit - 1);

  if (error) throw error;
  return (data ?? []) as (ReviewWithProfile & {
    community_submissions: {
      id: string;
      language: string;
      exercise_type: string;
      prompt: string | null;
      content: string | null;
    };
  })[];
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/** Submit an exercise for community review */
export async function submitForReview(payload: SubmitForReviewPayload) {
  const supabase = createClient();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Not authenticated");

  // Get user profile for language default and submission limit
  const { data: profile } = await supabase
    .from("profiles")
    .select("target_language, subscription_tier")
    .eq("id", user.id)
    .single();

  const language = payload.language || profile?.target_language || "fr";

  // Check open submission limit
  const maxOpen = profile?.subscription_tier === "snorkeler" ? 3 : 10;
  const { count } = await supabase
    .from("community_submissions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "open");

  if ((count ?? 0) >= maxOpen) {
    throw new Error(
      `You have reached the maximum of ${maxOpen} open submissions. Close or wait for reviews before submitting more.`,
    );
  }

  const { data, error } = await supabase
    .from("community_submissions")
    .insert({
      user_id: user.id,
      language,
      exercise_type: payload.exercise_type,
      prompt: payload.prompt ?? null,
      content: payload.content ?? null,
      audio_url: payload.audio_url ?? null,
    })
    .select(
      `*, profiles:user_id (id, full_name, avatar_url, target_language, native_language)`,
    )
    .single();

  if (error) throw error;
  return data as SubmissionWithProfile;
}

/** Submit a review on a community submission */
export async function submitReview(payload: SubmitReviewPayload) {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Not authenticated");

  // Check the user isn't reviewing their own submission
  const { data: submission } = await supabase
    .from("community_submissions")
    .select("user_id, exercise_type")
    .eq("id", payload.submission_id)
    .single();

  if (!submission) throw new Error("Submission not found");
  if (submission.user_id === user.id)
    throw new Error("You cannot review your own submission");

  // Insert review
  const { data: review, error } = await supabase
    .from("community_reviews")
    .insert({
      submission_id: payload.submission_id,
      reviewer_id: user.id,
      corrected_text: payload.corrected_text ?? null,
      inline_corrections: payload.inline_corrections ?? null,
      overall_feedback: payload.overall_feedback ?? null,
      rating: payload.rating,
    })
    .select(
      `*, profiles:reviewer_id (id, full_name, avatar_url, target_language, native_language)`,
    )
    .single();

  if (error) throw error;

  // Increment review_count on the submission & set status to reviewed
  await supabase.rpc("increment_review_count", {
    p_submission_id: payload.submission_id,
  });

  // Award XP to reviewer
  const xpAward = submission.exercise_type === "speaking" ? 8 : 5;
  await supabase.rpc("award_community_xp", {
    p_user_id: user.id,
    p_xp: xpAward,
  });

  return { review: review as ReviewWithProfile, xpAwarded: xpAward };
}

/** Toggle a helpful vote on a review */
export async function toggleHelpfulVote(reviewId: string) {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Not authenticated");

  // Check if user already voted
  const { data: existing } = await supabase
    .from("community_review_votes")
    .select("id")
    .eq("review_id", reviewId)
    .eq("voter_id", user.id)
    .maybeSingle();

  if (existing) {
    // Remove vote
    await supabase
      .from("community_review_votes")
      .delete()
      .eq("id", existing.id);

    // Decrement helpful_votes
    await supabase.rpc("decrement_helpful_votes", { p_review_id: reviewId });

    return { voted: false };
  } else {
    // Add vote
    const { error } = await supabase
      .from("community_review_votes")
      .insert({ review_id: reviewId, voter_id: user.id });

    if (error) throw error;

    // Increment helpful_votes + award 1 XP to reviewer
    await supabase.rpc("increment_helpful_votes", { p_review_id: reviewId });

    return { voted: true };
  }
}

/** Count open submissions for a user (to show remaining slots) */
export async function countOpenSubmissions(userId: string) {
  const supabase = createClient();
  const { count, error } = await supabase
    .from("community_submissions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "open");

  if (error) throw error;
  return count ?? 0;
}
