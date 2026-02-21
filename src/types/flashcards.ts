// ============================================================================
// Types for the Flashcards feature
// ============================================================================

export type FlashcardLanguage = "de" | "fr" | "it";
export type CardState = "new" | "learning" | "review" | "relearning";
export type Rating = 1 | 2 | 3 | 4; // Again | Hard | Good | Easy
export type CardSource =
  | "manual"
  | "csv"
  | "anki"
  | "cloze"
  | "conjugation"
  | "reading";
export type WordClass =
  | "noun"
  | "verb"
  | "adjective"
  | "adverb"
  | "phrase"
  | "other";
export type ReviewMode = "flip" | "type" | "choice";

export interface Deck {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  language: FlashcardLanguage;
  cover_color: string;
  created_at: string;
  card_count: number;
  new_per_day: number;
  review_per_day: number;
}

export interface Flashcard {
  id: string;
  deck_id: string;
  user_id: string;
  front: string;
  back: string;
  example_sentence: string | null;
  example_translation: string | null;
  audio_url: string | null;
  image_url: string | null;
  word_class: string | null;
  grammar_notes: string | null;
  tags: string[] | null;
  source: CardSource;
  created_at: string;
}

export interface CardSchedule {
  id: string;
  user_id: string;
  card_id: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: CardState;
  due: string;
  last_review: string | null;
}

export interface ReviewLogEntry {
  id: string;
  user_id: string;
  card_id: string;
  deck_id: string;
  rating: Rating;
  review_time_ms: number | null;
  reviewed_at: string;
}

// Joined type for study session
export interface ScheduledCard extends CardSchedule {
  flashcards: Flashcard;
}

// Study session state
export type StudyState = {
  cards: ScheduledCard[];
  currentIndex: number;
  reviewMode: ReviewMode;
  cardFace: "front" | "back";
  answerState: "idle" | "correct" | "incorrect";
  userInput: string;
  choiceOptions: string[];
  selectedChoice: string | null;
  sessionStats: {
    again: number;
    hard: number;
    good: number;
    easy: number;
    totalTimeMs: number;
  };
  cardStartTime: number;
  sessionComplete: boolean;
};

export type StudyAction =
  | { type: "SHOW_ANSWER" }
  | { type: "RATE_CARD"; rating: Rating }
  | { type: "SET_USER_INPUT"; value: string }
  | { type: "CHECK_ANSWER" }
  | { type: "SELECT_CHOICE"; choice: string }
  | { type: "NEXT_CARD"; updatedSchedule?: Partial<CardSchedule> }
  | { type: "SET_MODE"; mode: ReviewMode }
  | { type: "SET_CARDS"; cards: ScheduledCard[] };

// Deck stats for dashboard
export interface DeckStats {
  newCount: number;
  learningCount: number;
  reviewCount: number;
  dueCount: number;
}

// Capture payload for cross-mode integration
export interface CapturePayload {
  front: string;
  back: string;
  example_sentence?: string;
  example_translation?: string;
  grammar_notes?: string;
  source: CardSource;
  deckId: string;
  userId: string;
}
