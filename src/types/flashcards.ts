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

export type InsertionOrder = "sequential" | "random";
export type LeechAction = "suspend" | "tag";

// ── Display Order types ──────────────────────────────────────────────────
export type NewGatherOrder =
  | "deck_order"
  | "ascending_position"
  | "descending_position"
  | "random";
export type NewSortOrder =
  | "card_type"
  | "order_gathered"
  | "card_type_then_random"
  | "random";
export type ReviewSortOrder =
  | "due_date"
  | "random"
  | "intervals_ascending"
  | "intervals_descending"
  | "relative_overdueness";
export type InterleaveMode = "mix" | "new_first" | "reviews_first";

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
  /** Learning steps in minutes (e.g. [1, 10]). Defaults to [1, 10]. */
  learning_steps: number[];
  /** Minimum interval in days on graduating via Good. */
  graduating_interval: number;
  /** Minimum interval in days on graduating via Easy. */
  easy_interval: number;
  /** Whether new cards are introduced in deck order or shuffled. */
  insertion_order: InsertionOrder;

  // ── Reviews ────────────────────────────────────────────────────────────
  /** Absolute cap on scheduled interval in days. Default 36500. */
  max_interval: number;
  /** Global multiplier applied to every review interval. Default 1.0. */
  interval_modifier: number;
  /** Fraction of the previous interval for Hard on review cards. Default 1.2. */
  hard_interval_mult: number;
  /** Extra multiplier for Easy on review cards. Default 1.3. */
  easy_bonus: number;

  // ── Lapses / Relearning ────────────────────────────────────────────────
  /** Relearning steps in minutes, e.g. [10]. Default [10]. */
  relearning_steps: number[];
  /** Minimum interval (days) when re-graduating from relearning. Default 1. */
  min_interval_after_lapse: number;
  /** Multiply old interval by this after a lapse (0 = reset to min). Default 0. */
  new_interval_multiplier: number;

  // ── Leeches ────────────────────────────────────────────────────────────
  /** Number of lapses before a card is flagged as a leech. Default 8. */
  leech_threshold: number;
  /** What happens when a card becomes a leech. Default 'tag'. */
  leech_action: LeechAction;

  // ── Display Order ──────────────────────────────────────────────────────
  /** How new cards are gathered from the deck. Default 'deck_order'. */
  new_gather_order: NewGatherOrder;
  /** How gathered new cards are sorted within a session. Default 'order_gathered'. */
  new_sort_order: NewSortOrder;
  /** How review cards are ordered. Default 'due_date'. */
  review_sort_order: ReviewSortOrder;
  /** Whether to interleave new and review cards or separate them. Default 'mix'. */
  interleave_mode: InterleaveMode;

  // ── Burying ────────────────────────────────────────────────────────────
  /** Bury new siblings during review sessions. Default false. */
  bury_new_siblings: boolean;
  /** Bury review siblings during review sessions. Default false. */
  bury_review_siblings: boolean;

  // ── Timer ──────────────────────────────────────────────────────────────
  /** Show an answer timer on cards during review. Default false. */
  show_answer_timer: boolean;
  /** Stop/cap the timer at N seconds (0 = no cap). Default 60. */
  answer_timer_limit: number;

  // ── Auto Advance ───────────────────────────────────────────────────────
  /** Automatically reveal the answer after N seconds (0 = disabled). Default 0. */
  auto_advance_answer_seconds: number;
  /** Automatically rate the card after N seconds (0 = disabled). Default 0. */
  auto_advance_rate_seconds: number;
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
  /** Sibling group ID — cards with the same group are siblings (for burying). */
  sibling_group: string | null;
  /** Note type used for this card (links to note_types table). */
  note_type_id: string | null;
  /** Structured field values as JSON: {"Front":"...", "Back":"...", ...} */
  fields: Record<string, string> | null;
  /** Which template index within the note type this card was generated from */
  template_index: number | null;
  /** For cloze cards, which cloze ordinal this card represents */
  cloze_ordinal: number | null;
  /** Per-card deck override (optional, for different card→deck routing) */
  deck_override: string | null;
  /** Per-card CSS (cached from note type at card generation time) */
  card_css: string | null;
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
  /** Whether this card schedule is suspended (leech or manual). */
  is_suspended: boolean;
  /** Whether this card has been flagged as a leech. */
  is_leech: boolean;
  /** Whether this card is buried for today's session. */
  is_buried: boolean;
  /** Date/time this card was buried until (auto-unbury next day). */
  buried_until: string | null;
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
  /** Learning queue: cards rated Again re-appear within the same session */
  learningQueue: ScheduledCard[];
  /** Index tracking how many total cards have been shown (for progress) */
  totalReviewed: number;
};

export type StudyAction =
  | { type: "SHOW_ANSWER" }
  | { type: "RATE_CARD"; rating: Rating }
  | { type: "SET_USER_INPUT"; value: string }
  | { type: "CHECK_ANSWER" }
  | { type: "SELECT_CHOICE"; choice: string }
  | { type: "NEXT_CARD"; updatedSchedule?: Partial<CardSchedule> }
  | { type: "SET_MODE"; mode: ReviewMode }
  | { type: "SET_CARDS"; cards: ScheduledCard[] }
  | { type: "ENQUEUE_LEARNING"; card: ScheduledCard };

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

// Rating tooltips — plain-language explanations
export const RATING_TOOLTIPS: Record<Rating, string> = {
  1: "Completely forgot — show again soon",
  2: "Remembered, but it was difficult",
  3: "Remembered with moderate effort",
  4: "Instantly recalled — felt effortless",
};

// Session results for knowledge graph sync
export interface FlashcardSessionResult {
  cardId: string;
  front: string;
  back: string;
  rating: Rating;
  responseTimeMs: number;
  correct: boolean;
  /** Optional user_words ID for knowledge graph sync */
  wordId?: string;
}
