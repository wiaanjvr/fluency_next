/* =============================================================================
   ML EVENT TYPES — Interaction Events & Session Summaries
   
   Types for the ML personalization event store. These mirror the
   interaction_events and session_summaries DB tables and provide the
   TypeScript contracts for the event logging pipeline.
============================================================================= */

import type { ModuleSource } from "./knowledge-graph";

// ---------------------------------------------------------------------------
// Enums / Literal Unions
// ---------------------------------------------------------------------------

export const TIME_OF_DAY_VALUES = [
  "morning", // 05:00–11:59
  "afternoon", // 12:00–16:59
  "evening", // 17:00–20:59
  "night", // 21:00–04:59
] as const;

export type TimeOfDay = (typeof TIME_OF_DAY_VALUES)[number];

export const INPUT_MODE_VALUES = [
  "multiple_choice",
  "typing",
  "speaking",
  "reading",
] as const;

export type InputMode = (typeof INPUT_MODE_VALUES)[number];

// ---------------------------------------------------------------------------
// InteractionEvent — a single user action in any module
// ---------------------------------------------------------------------------

/** Shape of a row in the `interaction_events` table. */
export interface InteractionEventRow {
  id: string;
  user_id: string;
  word_id: string | null;
  grammar_concept_id: string | null;
  module_source: ModuleSource;
  correct: boolean;
  response_time_ms: number | null;
  session_id: string;
  session_sequence_number: number;
  time_of_day: TimeOfDay;
  day_of_week: number; // 0 = Sunday, 6 = Saturday
  days_since_last_review: number | null;
  days_since_last_session: number | null;
  consecutive_correct_in_session: number;
  session_fatigue_proxy: number | null;
  story_complexity_level: number | null;
  input_mode: InputMode;
  created_at: string;
}

/**
 * Input payload for logging a new interaction event.
 * Fields like time_of_day, day_of_week, days_since_last_review,
 * session_fatigue_proxy, and session_sequence_number are computed
 * automatically by the logging service — callers only need to provide
 * the core interaction data.
 */
export interface InteractionEventInput {
  word_id?: string | null;
  grammar_concept_id?: string | null;
  module_source: ModuleSource;
  correct: boolean;
  response_time_ms?: number | null;
  input_mode: InputMode;
  /** Only set when module_source = 'story_engine' */
  story_complexity_level?: number | null;
}

// ---------------------------------------------------------------------------
// SessionSummary — aggregated stats for a completed session
// ---------------------------------------------------------------------------

/** Shape of a row in the `session_summaries` table. */
export interface SessionSummaryRow {
  id: string;
  session_id: string;
  user_id: string;
  module_source: ModuleSource;
  total_words: number;
  correct_count: number;
  average_response_time_ms: number | null;
  completed_session: boolean;
  session_duration_ms: number | null;
  words_reviewed_ids: string[];
  estimated_cognitive_load: number | null;
  started_at: string;
  ended_at: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// UserBaseline — rolling per-user baseline for fatigue computation
// ---------------------------------------------------------------------------

export interface UserBaselineRow {
  user_id: string;
  avg_response_time_ms: number;
  total_sessions: number;
  last_session_at: string | null;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Session tracking — in-memory state for an active session
// ---------------------------------------------------------------------------

export interface ActiveSession {
  session_id: string;
  user_id: string;
  module_source: ModuleSource;
  started_at: number; // Date.now() epoch ms
  events: InteractionEventInput[]; // buffered events (for summary computation)
  response_times: number[]; // all response times this session
  correct_streak: number; // current consecutive correct
  word_ids: Set<string>; // unique words seen
  correct_count: number;
  total_count: number;
  fatigue_proxies: number[]; // per-event fatigue proxy values
}

// ---------------------------------------------------------------------------
// API request / response shapes
// ---------------------------------------------------------------------------

/** POST /api/events — log a single interaction event */
export interface LogEventRequest {
  session_id: string;
  event: InteractionEventInput;
}

/** POST /api/events/batch — log multiple events at once */
export interface LogEventBatchRequest {
  session_id: string;
  events: InteractionEventInput[];
}

/** POST /api/events/session/start — begin a new session */
export interface StartSessionRequest {
  module_source: ModuleSource;
}

export interface StartSessionResponse {
  session_id: string;
  started_at: string;
}

/** POST /api/events/session/end — finish + summarize a session */
export interface EndSessionRequest {
  session_id: string;
  completed: boolean;
}

export interface EndSessionResponse {
  summary: SessionSummaryRow;
}
