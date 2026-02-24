// ==========================================================================
// Duel Multiplayer Trivia Types
// ==========================================================================

export type DuelStatus = "pending" | "active" | "completed" | "declined";
export type DuelDifficulty = "A1" | "A2" | "B1" | "B2";
export type DuelLanguage = "de" | "fr" | "it";

export type DuelCategory =
  | "vocabulary"
  | "cloze"
  | "conjugation"
  | "grammar"
  | "listening"
  | "translation";

export const DUEL_CATEGORIES: DuelCategory[] = [
  "vocabulary",
  "cloze",
  "conjugation",
  "grammar",
  "listening",
  "translation",
];

export const CATEGORY_LABELS: Record<DuelCategory, string> = {
  vocabulary: "Vocabulary",
  cloze: "Fill the Blank",
  conjugation: "Conjugation",
  grammar: "Grammar",
  listening: "Listening",
  translation: "Translation",
};

export const CATEGORY_COLORS: Record<DuelCategory, string> = {
  vocabulary: "#6C63FF", // violet
  cloze: "#3B82F6", // blue
  conjugation: "#10B981", // emerald
  grammar: "#F59E0B", // amber
  listening: "#EC4899", // pink
  translation: "#8B5CF6", // purple
};

export const LANGUAGE_LABELS: Record<DuelLanguage, string> = {
  de: "German",
  fr: "French",
  it: "Italian",
};

export const LANGUAGE_FLAGS: Record<DuelLanguage, string> = {
  de: "🇩🇪",
  fr: "🇫🇷",
  it: "🇮🇹",
};

// ─── Question shape (stored as JSONB in duel_rounds.questions) ───────────

export interface DuelQuestion {
  index: number;
  category: DuelCategory;
  prompt: string;
  options: string[] | null; // null for translation (free input)
  correct_answer: string;
  explanation: string;
  audio_text: string | null; // for listening questions
}

// ─── Database row types ──────────────────────────────────────────────────

export interface Duel {
  id: string;
  challenger_id: string;
  /** null when the invite was sent to an unregistered email */
  opponent_id: string | null;
  /** set when the invite was sent to an unregistered email address */
  opponent_email?: string | null;
  language_code: DuelLanguage;
  difficulty: DuelDifficulty;
  status: DuelStatus;
  current_turn: string | null;
  challenger_score: number;
  opponent_score: number;
  current_round: number;
  max_rounds: number;
  winner_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DuelRound {
  id: string;
  duel_id: string;
  round_number: number;
  questions: DuelQuestion[];
  challenger_answers: Record<number, string> | null;
  opponent_answers: Record<number, string> | null;
  challenger_score: number | null;
  opponent_score: number | null;
  challenger_completed_at: string | null;
  opponent_completed_at: string | null;
  created_at: string;
}

export interface DuelStats {
  user_id: string;
  duels_played: number;
  duels_won: number;
  total_correct: number;
  total_questions: number;
  current_streak: number;
  best_streak: number;
  updated_at: string;
}

// ─── Extended types with profile joins ───────────────────────────────────

export interface DuelWithProfiles extends Duel {
  challenger_profile?: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  /** undefined when the opponent hasn't registered yet (email invite) */
  opponent_profile?: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

// ─── API request/response types ──────────────────────────────────────────

export interface CreateDuelRequest {
  /** Required unless opponent_email is provided */
  opponent_id?: string;
  /** Required unless opponent_id is provided — invite sent to an unregistered email */
  opponent_email?: string;
  language_code: DuelLanguage;
  difficulty: DuelDifficulty;
}

export interface SubmitTurnRequest {
  round_id: string;
  answers: Record<number, string>; // { 0: "The key", 1: "hat gegessen", ... }
}

export interface SubmitTurnResponse {
  correct: boolean[];
  score_this_round: number;
  duel_complete: boolean;
}

export interface UserSearchResult {
  /** Empty string for unregistered email invites */
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  email: string;
  /** True when the user doesn't have an account yet — invite by email */
  is_guest?: boolean;
}
