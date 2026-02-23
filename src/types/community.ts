// ==========================================================================
// Community Peer Review — Type definitions
// ==========================================================================

/** Exercise types allowed in community submissions */
export type ExerciseType = "writing" | "speaking" | "translation";

/** Submission status lifecycle */
export type SubmissionStatus = "open" | "reviewed" | "closed";

/** A single inline correction within a review */
export interface InlineCorrection {
  /** The original text span that needs correction */
  original: string;
  /** The suggested correction */
  correction: string;
  /** Explanation of why this correction is needed */
  explanation: string;
}

// ---------------------------------------------------------------------------
// Database row types (match Supabase columns exactly)
// ---------------------------------------------------------------------------

export interface CommunitySubmission {
  id: string;
  user_id: string;
  language: string;
  exercise_type: ExerciseType;
  prompt: string | null;
  content: string | null;
  audio_url: string | null;
  status: SubmissionStatus;
  review_count: number;
  created_at: string;
  updated_at: string;
}

export interface CommunityReview {
  id: string;
  submission_id: string;
  reviewer_id: string;
  corrected_text: string | null;
  inline_corrections: InlineCorrection[] | null;
  overall_feedback: string | null;
  rating: number | null;
  helpful_votes: number;
  created_at: string;
}

export interface CommunityReviewVote {
  id: string;
  review_id: string;
  voter_id: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// View models (joined with profile data for display)
// ---------------------------------------------------------------------------

/** Profile subset used in community views */
export interface CommunityProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  target_language: string;
  native_language: string;
}

/** Submission with its author profile */
export interface SubmissionWithProfile extends CommunitySubmission {
  profiles: CommunityProfile;
}

/** Review with reviewer profile and vote state */
export interface ReviewWithProfile extends CommunityReview {
  profiles: CommunityProfile;
  /** Whether the current user has voted this review helpful */
  has_voted?: boolean;
}

// ---------------------------------------------------------------------------
// Request / response payloads
// ---------------------------------------------------------------------------

export interface SubmitForReviewPayload {
  exercise_type: ExerciseType;
  prompt?: string;
  content?: string;
  audio_url?: string;
  language?: string; // defaults to user's target_language
}

export interface SubmitReviewPayload {
  submission_id: string;
  corrected_text?: string;
  inline_corrections?: InlineCorrection[];
  overall_feedback?: string;
  rating: number;
}

export interface VoteHelpfulPayload {
  review_id: string;
}

// ---------------------------------------------------------------------------
// Feed query parameters
// ---------------------------------------------------------------------------

export interface CommunityFeedParams {
  language?: string;
  exercise_type?: ExerciseType;
  status?: SubmissionStatus;
  page?: number;
  limit?: number;
}

// ---------------------------------------------------------------------------
// Store state
// ---------------------------------------------------------------------------

export interface CommunityFeedState {
  submissions: SubmissionWithProfile[];
  hasMore: boolean;
  page: number;
  isLoading: boolean;
}

export interface ActiveSubmissionState {
  submission: SubmissionWithProfile | null;
  reviews: ReviewWithProfile[];
  isLoading: boolean;
}
