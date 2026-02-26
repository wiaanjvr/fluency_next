// ==========================================================================
// Dive Tank Community Hub — Type definitions
// ==========================================================================

// ---------------------------------------------------------------------------
// Enums / unions
// ---------------------------------------------------------------------------

export type SubmissionType = "writing" | "speaking" | "grammar";
export type SubmissionStatus = "pending" | "reviewed" | "no_reviews";
export type ReviewTone = "encouraging" | "neutral" | "detailed";
export type CorrectionType = "correct" | "error" | "better" | "explain";

export type DispatchCategory =
  | "all"
  | "grammar-help"
  | "vocabulary"
  | "culture"
  | "resources"
  | "study-methods"
  | "wins-struggles";

export type DepthRank =
  | "The Shallows"
  | "The Reef"
  | "The Twilight"
  | "The Abyss"
  | "The Trench";

export type CommunityTab =
  | "peer-review"
  | "speaking-lab"
  | "dive-logs"
  | "dispatch"
  | "messages";

export type PeerReviewSubTab = "review-others" | "my-dives";

export type SubmissionFilter = "all" | SubmissionType;
export type SubmissionSort = "newest" | "oldest" | "most-urgent" | "unanswered";

// ---------------------------------------------------------------------------
// Inline correction
// ---------------------------------------------------------------------------

export interface InlineCorrection {
  id: string;
  start: number;
  end: number;
  type: CorrectionType;
  explanation: string;
  original_text: string;
}

// ---------------------------------------------------------------------------
// Database row types
// ---------------------------------------------------------------------------

export interface DiveSubmission {
  id: string;
  user_id: string;
  type: SubmissionType;
  prompt: string | null;
  content: string | null;
  audio_url: string | null;
  language_from: string;
  language_to: string;
  proficiency_level: string;
  status: SubmissionStatus;
  depth_points_earned: number;
  review_count: number;
  created_at: string;
}

export interface DiveReview {
  id: string;
  submission_id: string;
  reviewer_id: string;
  corrections: InlineCorrection[];
  overall_feedback: string | null;
  tone: ReviewTone;
  ratings: SpeakingRatings | null;
  depth_points_awarded: number;
  created_at: string;
}

export interface SpeakingRatings {
  pronunciation: number;
  fluency: number;
  accuracy: number;
}

export interface DiveLog {
  id: string;
  user_id: string;
  title: string;
  content: string;
  excerpt: string;
  tags: string[];
  read_time_minutes: number;
  views: number;
  likes: number;
  comment_count: number;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface DiveLogComment {
  id: string;
  log_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
}

export interface DispatchThread {
  id: string;
  user_id: string;
  category: DispatchCategory;
  title: string;
  content: string;
  is_pinned: boolean;
  reply_count: number;
  view_count: number;
  is_hot: boolean;
  created_at: string;
}

export interface DispatchReply {
  id: string;
  thread_id: string;
  user_id: string;
  content: string;
  upvotes: number;
  has_upvoted?: boolean;
  created_at: string;
}

export interface DirectMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  audio_url: string | null;
  is_read: boolean;
  is_de_mode: boolean;
  created_at: string;
}

export interface CommunityStats {
  id: string;
  divers_active: number;
  reviews_today: number;
  awaiting_dive: number;
  online_now: number;
  updated_at: string;
}

export interface DepthPoints {
  id: string;
  user_id: string;
  points_total: number;
  points_this_week: number;
  reviews_written: number;
  reviews_received: number;
  rank_name: DepthRank;
  next_rank_threshold: number;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// View models (joined with profile data)
// ---------------------------------------------------------------------------

export interface CommunityMember {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  target_language: string;
  native_language: string;
  depth_rank: DepthRank;
  is_online: boolean;
  last_active_at: string | null;
}

export interface DiveSubmissionWithProfile extends DiveSubmission {
  profiles: CommunityMember;
}

export interface DiveReviewWithProfile extends DiveReview {
  profiles: CommunityMember;
  review_rating?: number;
}

export interface DiveLogWithProfile extends DiveLog {
  profiles: CommunityMember;
}

export interface DiveLogCommentWithProfile extends DiveLogComment {
  profiles: CommunityMember;
  replies?: DiveLogCommentWithProfile[];
}

export interface DispatchThreadWithProfile extends DispatchThread {
  profiles: CommunityMember;
}

export interface DispatchReplyWithProfile extends DispatchReply {
  profiles: CommunityMember;
}

export interface DirectMessageWithProfile extends DirectMessage {
  sender: CommunityMember;
}

export interface Conversation {
  id: string;
  other_user: CommunityMember;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

// ---------------------------------------------------------------------------
// Leaderboard
// ---------------------------------------------------------------------------

export interface LeaderboardEntry {
  rank: number;
  user: CommunityMember;
  points_this_week: number;
  trend: "up" | "down" | "same";
  is_current_user: boolean;
}

// ---------------------------------------------------------------------------
// Dive Buddy
// ---------------------------------------------------------------------------

export interface DiveBuddy {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  native_language: string;
  target_language: string;
  depth_rank: DepthRank;
  interests: string[];
  timezone_region: string;
  available_for_exchange: boolean;
}

// ---------------------------------------------------------------------------
// Audio review timestamp comment
// ---------------------------------------------------------------------------

export interface TimestampComment {
  id: string;
  timestamp: number; // seconds
  content: string;
  user: CommunityMember;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Payloads
// ---------------------------------------------------------------------------

export interface SubmitDivePayload {
  type: SubmissionType;
  prompt?: string;
  content?: string;
  audio_url?: string;
  language_from?: string;
  language_to?: string;
  proficiency_level?: string;
}

export interface SubmitReviewPayload {
  submission_id: string;
  corrections: InlineCorrection[];
  overall_feedback?: string;
  tone: ReviewTone;
  ratings?: SpeakingRatings;
}

export interface CreateDiveLogPayload {
  title: string;
  content: string;
  tags: string[];
}

export interface CreateThreadPayload {
  category: DispatchCategory;
  title: string;
  content: string;
}

export interface SendMessagePayload {
  receiver_id: string;
  content: string;
  audio_url?: string;
  is_de_mode?: boolean;
}
