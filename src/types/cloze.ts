// Types for the Cloze Activities feature

export type ClozeLanguage = "de" | "fr" | "it";
export type ClozeLevel = "A1" | "A2" | "B1" | "B2" | "C1";
export type ClozeSource =
  | "wikipedia"
  | "gutenberg"
  | "newsapi"
  | "reddit"
  | "tatoeba";
export type InputMode = "type" | "choice" | "wordbank";
export type AnswerState = "idle" | "correct" | "incorrect";

export interface ClozeItem {
  id: string;
  language: ClozeLanguage;
  level: ClozeLevel;
  sentence: string;
  answer: string;
  answer_position: number;
  translation: string;
  explanation: string;
  distractors: string[];
  source: ClozeSource;
  source_url: string | null;
  created_at: string;
  used_count: number;
}

export interface UserClozeProgress {
  id: string;
  user_id: string;
  cloze_item_id: string;
  answered_correctly: boolean;
  answered_at: string;
}

export interface SessionEntry {
  item: ClozeItem;
  userAnswer: string;
  correct: boolean;
}

export interface ClozeSessionState {
  items: ClozeItem[];
  currentIndex: number;
  inputMode: InputMode;
  answerState: AnswerState;
  userAnswer: string;
  score: { correct: number; incorrect: number };
  sessionHistory: SessionEntry[];
  sessionComplete: boolean;
}

export type ClozeAction =
  | { type: "SET_ITEMS"; items: ClozeItem[] }
  | { type: "SET_INPUT_MODE"; mode: InputMode }
  | { type: "SET_USER_ANSWER"; answer: string }
  | { type: "SUBMIT_ANSWER" }
  | { type: "NEXT_QUESTION" }
  | { type: "RESET_SESSION"; items: ClozeItem[] };

// Pipeline types
export interface RawSentence {
  text: string;
  language: ClozeLanguage;
  source: ClozeSource;
  sourceUrl?: string;
  translation?: string; // Pre-existing for Tatoeba
}

export interface ProcessedSentence {
  sentence: string; // With ___ blank
  answer: string;
  answerPosition: number;
  originalText: string;
  language: ClozeLanguage;
  source: ClozeSource;
  sourceUrl?: string;
  translation: string;
  level: ClozeLevel;
}

export interface EnrichedSentence extends ProcessedSentence {
  explanation: string;
  distractors: string[];
}

export interface PipelineStats {
  fetched: number;
  passedFilter: number;
  translated: number;
  enriched: number;
  stored: number;
  geminiCalls: number;
  translateCalls: number;
  errors: string[];
}
