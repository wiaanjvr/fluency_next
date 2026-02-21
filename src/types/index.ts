// User types
import type { TierSlug } from "@/lib/tiers";
export type SubscriptionTier = TierSlug;

export type ProficiencyLevel = "A0" | "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export type LessonType = "foundation-phrase" | "single-sentence" | "passage";

export interface User {
  id: string;
  email: string;
  created_at: string;
  target_language: string;
  native_language: string;
  proficiency_level: ProficiencyLevel;
  interests: string[];
  subscription_tier: SubscriptionTier;
}

// Foundation lesson types
export interface FoundationPhrase {
  id: string;
  type: "foundation-phrase";
  language: string;
  level: "A0";
  phase: "survival-basics";
  order: number;
  phrase_target: string; // target language (fr/de/it)
  phrase_english: string;
  phrase_french?: string; // deprecated, kept for backwards compatibility
  audio_url: string;
  phonetic: string;
  breakdown: Array<{
    part: string;
    meaning: string;
  }>;
  usage_context: string;
  practice_sentences: Array<{
    target: string; // target language
    english: string;
    french?: string; // deprecated
    audio_url: string;
  }>;
}

export interface SingleSentence {
  id: string;
  type: "single-sentence";
  language: string;
  level: "A0";
  phase: "basic-sentences";
  order: number;
  topic: string;
  sentence_target: string; // target language (fr/de/it)
  sentence_english: string;
  sentence_french?: string; // deprecated
  audio_url: string;
  phonetic: string;
  key_vocabulary: Array<{
    word: string;
    meaning: string;
  }>;
  response_options: Array<{
    target: string; // target language
    english: string;
    french?: string; // deprecated
    audio_url: string;
  }>;
}

export type FoundationLesson = FoundationPhrase | SingleSentence;

// Content types
export interface ContentSegment {
  id: string;
  language: string;
  level: ProficiencyLevel;
  topic: string;
  duration_seconds: number;
  audio_url: string;
  transcript: string;
  translations: Record<string, string>;
  key_vocabulary: string[];
  grammar_patterns: string[];
  created_at: string;
}

export interface ComprehensionQuestion {
  id: string;
  segment_id: string;
  question: string;
  question_language: string; // 'native' or 'target'
  options: string[];
  correct_answer: number;
  explanation?: string;
}

// Progress tracking
export interface UserProgress {
  user_id: string;
  segment_id: string;
  first_encountered: string;
  last_encountered: string;
  times_heard: number;
  comprehension_score: number;
  spoken_attempts: number;
}

export interface SessionLog {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string;
  segments_completed: string[];
  overall_comprehension: number;
}

export interface SpeakingAttempt {
  id: string;
  user_id: string;
  segment_id: string;
  audio_url: string;
  transcript?: string;
  pronunciation_score?: number;
  fluency_score?: number;
  created_at: string;
}

// Learning session types
export interface LearningSession {
  segment: ContentSegment;
  questions: ComprehensionQuestion[];
  progress?: UserProgress;
}

// Interest topics
export const INTEREST_TOPICS = [
  "philosophy",
  "fitness",
  "business",
  "science",
  "art",
  "travel",
  "technology",
  "history",
  "psychology",
  "cooking",
] as const;

export type InterestTopic = (typeof INTEREST_TOPICS)[number];

// Spaced Repetition System (SRS) types
export type WordStatus = "new" | "learning" | "known" | "mastered";

export type WordRating = 0 | 1 | 2 | 3 | 4 | 5;
// 0: Total blackout - complete fail
// 1: Wrong - incorrect response
// 2: Hard - correct with serious difficulty
// 3: Good - correct with some hesitation
// 4: Easy - correct with no difficulty
// 5: Perfect - immediate, confident recall

export interface UserWord {
  id: string;
  user_id: string;
  word: string;
  language: string;
  lemma: string; // base form

  // SM-2 Algorithm fields
  ease_factor: number; // 1.3 to 2.5+ (renamed from easiness_factor to match DB)
  repetitions: number;
  interval: number; // renamed from interval_days to match DB
  next_review: string;

  // Learning state
  status: WordStatus;

  // Tracking (renamed to match DB schema)
  created_at: string; // renamed from first_seen
  updated_at: string; // renamed from last_seen
  last_reviewed?: string; // DB column for last review timestamp
  last_rated_at?: string; // DB column for last rating timestamp

  // Metadata
  part_of_speech?: string;
  frequency_rank?: number;
  rating?: number; // DB column for current rating
}

export interface WordInteraction {
  id: string;
  user_id: string;
  word_id: string;
  story_id?: string;
  rating: WordRating;
  context_sentence?: string;
  response_time_ms?: number;
  created_at: string;
}

export interface GeneratedStory {
  id: string;
  user_id: string;
  title: string;
  content: string;
  language: string;
  level: string;

  // Metadata
  word_count: number;
  new_words: string[];
  review_words: string[];
  known_words: string[];

  // Audio
  audio_url?: string;

  // User interaction
  completed: boolean;
  listened: boolean;
  read: boolean;

  // Timing
  created_at: string;
  completed_at?: string;

  // Generation params
  generation_params: Record<string, any>;
}

export type StoryPhase = "listen" | "read" | "interact" | "completed";

export interface StoryProgress {
  id: string;
  user_id: string;
  story_id: string;
  current_phase: StoryPhase;
  listen_count: number;
  words_rated: number;
  started_at: string;
  last_activity: string;
}

// Story generation parameters
export interface StoryGenerationParams {
  user_id: string;
  language: string;
  level: ProficiencyLevel;
  topic?: string;
  content_type?: string; // narrative, dialogue, descriptive, opinion
  word_count_target: number;
  new_word_percentage: number; // e.g., 0.05 for 5%
  prioritize_review: boolean; // use words due for review
}

// Interactive word for UI
export interface InteractiveWord {
  text: string;
  lemma: string;
  isNew: boolean;
  isDueForReview: boolean;
  userWord?: UserWord;
  index: number; // position in story
}

// Word due for review
export interface WordDueForReview {
  word: string;
  lemma: string;
  status: WordStatus;
  days_overdue: number;
}

// Re-export lesson types
export * from "./lesson";

// Re-export foundation vocabulary types
export * from "./foundation-vocabulary";

// Re-export sentence transition types (Phase 1: 100-300 words)
export * from "./sentence-transition";

// Re-export micro-stories types (Phase 2: 300-500 words)
export * from "./micro-stories";

// Re-export progression gateway types
export * from "./progression";

// Re-export reward system types
export * from "./rewards";

// Re-export cloze exercise types
export * from "./cloze";
