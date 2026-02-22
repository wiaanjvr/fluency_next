/* =============================================================================
   ML EVENT LOGGING SERVICE
   
   Server-side service for the interaction event pipeline. Handles:
   - Enriching raw events with computed features (time_of_day, fatigue proxy,
     days_since_last_review, etc.)
   - Writing to the append-only interaction_events table
   - Managing session lifecycle (start / end / summarize)
   - Maintaining user baselines for fatigue computation
   
   All functions accept a SupabaseClient with the user's auth context
   (RLS is enforced server-side).
============================================================================= */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  InteractionEventInput,
  InteractionEventRow,
  SessionSummaryRow,
  UserBaselineRow,
  TimeOfDay,
} from "@/types/ml-events";
import type { ModuleSource } from "@/types/knowledge-graph";

// ---------------------------------------------------------------------------
// Helpers — compute derived features
// ---------------------------------------------------------------------------

/** Map hour (0-23) to time-of-day bucket */
function getTimeOfDay(date: Date): TimeOfDay {
  const h = date.getHours();
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "afternoon";
  if (h >= 17 && h < 21) return "evening";
  return "night";
}

/** Get day of week (0 = Sunday, 6 = Saturday) */
function getDayOfWeek(date: Date): number {
  return date.getDay();
}

/** Compute days between two dates (fractional) */
function daysBetween(earlier: Date | string, later: Date): number {
  const e = typeof earlier === "string" ? new Date(earlier) : earlier;
  return (later.getTime() - e.getTime()) / (1000 * 60 * 60 * 24);
}

/**
 * Compute the session fatigue proxy for a response.
 * fatigue_proxy = responseTimeMs / userBaselineMs
 * Values > 1.0 mean the user is slower than their personal average.
 */
function computeFatigueProxy(
  responseTimeMs: number | null | undefined,
  baselineMs: number,
): number | null {
  if (responseTimeMs == null || responseTimeMs <= 0) return null;
  if (baselineMs <= 0) return null;
  return Math.round((responseTimeMs / baselineMs) * 100) / 100;
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

/** Get (or create) the user's response-time baseline */
export async function getUserBaseline(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserBaselineRow> {
  const { data, error } = await supabase
    .from("user_baselines")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (data && !error) return data as UserBaselineRow;

  // First time — create a default baseline
  const defaultBaseline: Partial<UserBaselineRow> = {
    user_id: userId,
    avg_response_time_ms: 3000, // reasonable default
    total_sessions: 0,
    last_session_at: null,
  };

  const { data: created, error: createErr } = await supabase
    .from("user_baselines")
    .upsert(defaultBaseline, { onConflict: "user_id" })
    .select()
    .single();

  if (createErr) {
    console.warn("[ml-events] Failed to create baseline:", createErr.message);
    // Return a sensible default even on failure
    return {
      user_id: userId,
      avg_response_time_ms: 3000,
      total_sessions: 0,
      last_session_at: null,
      updated_at: new Date().toISOString(),
    };
  }

  return created as UserBaselineRow;
}

/** Get the last review date for a specific word by this user */
async function getLastReviewDate(
  supabase: SupabaseClient,
  userId: string,
  wordId: string | null | undefined,
): Promise<string | null> {
  if (!wordId) return null;

  const { data } = await supabase
    .from("interaction_events")
    .select("created_at")
    .eq("user_id", userId)
    .eq("word_id", wordId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return data?.created_at ?? null;
}

/** Get the current event count for a session (for sequence numbering) */
async function getSessionEventCount(
  supabase: SupabaseClient,
  sessionId: string,
): Promise<number> {
  const { count } = await supabase
    .from("interaction_events")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId);

  return count ?? 0;
}

/** Get the current consecutive correct streak within a session */
async function getConsecutiveCorrectInSession(
  supabase: SupabaseClient,
  sessionId: string,
): Promise<number> {
  // Fetch the most recent events in this session, newest first
  const { data } = await supabase
    .from("interaction_events")
    .select("correct")
    .eq("session_id", sessionId)
    .order("session_sequence_number", { ascending: false })
    .limit(50);

  if (!data || data.length === 0) return 0;

  let streak = 0;
  for (const row of data) {
    if (row.correct) streak++;
    else break;
  }
  return streak;
}

// ---------------------------------------------------------------------------
// Core: logInteractionEvent
// ---------------------------------------------------------------------------

/**
 * Log a single interaction event with all computed features.
 * This is the primary entry point for event logging.
 */
export async function logInteractionEvent(
  supabase: SupabaseClient,
  userId: string,
  sessionId: string,
  event: InteractionEventInput,
): Promise<InteractionEventRow | null> {
  const now = new Date();

  // Fetch user baseline + contextual data in parallel
  const [baseline, lastReviewDate, seqNum, streak] = await Promise.all([
    getUserBaseline(supabase, userId),
    getLastReviewDate(supabase, userId, event.word_id),
    getSessionEventCount(supabase, sessionId),
    getConsecutiveCorrectInSession(supabase, sessionId),
  ]);

  // Compute derived features
  const timeOfDay = getTimeOfDay(now);
  const dayOfWeek = getDayOfWeek(now);

  const daysSinceLastReview = lastReviewDate
    ? daysBetween(lastReviewDate, now)
    : null;

  const daysSinceLastSession = baseline.last_session_at
    ? daysBetween(baseline.last_session_at, now)
    : null;

  const consecutiveCorrect = event.correct ? streak + 1 : 0;

  const fatigueProxy = computeFatigueProxy(
    event.response_time_ms,
    baseline.avg_response_time_ms,
  );

  // Build the full row
  const row = {
    user_id: userId,
    word_id: event.word_id ?? null,
    grammar_concept_id: event.grammar_concept_id ?? null,
    module_source: event.module_source,
    correct: event.correct,
    response_time_ms: event.response_time_ms ?? null,
    session_id: sessionId,
    session_sequence_number: seqNum,
    time_of_day: timeOfDay,
    day_of_week: dayOfWeek,
    days_since_last_review: daysSinceLastReview
      ? Math.round(daysSinceLastReview * 100) / 100
      : null,
    days_since_last_session: daysSinceLastSession
      ? Math.round(daysSinceLastSession * 100) / 100
      : null,
    consecutive_correct_in_session: consecutiveCorrect,
    session_fatigue_proxy: fatigueProxy,
    story_complexity_level: event.story_complexity_level ?? null,
    input_mode: event.input_mode,
  };

  const { data, error } = await supabase
    .from("interaction_events")
    .insert(row)
    .select()
    .single();

  if (error) {
    console.error("[ml-events] Failed to log event:", error.message);
    return null;
  }

  return data as InteractionEventRow;
}

/**
 * Log a batch of interaction events (e.g. at end of session).
 * Events are enriched and inserted in order.
 */
export async function logInteractionEventBatch(
  supabase: SupabaseClient,
  userId: string,
  sessionId: string,
  events: InteractionEventInput[],
): Promise<InteractionEventRow[]> {
  const results: InteractionEventRow[] = [];

  for (const event of events) {
    const row = await logInteractionEvent(supabase, userId, sessionId, event);
    if (row) results.push(row);
  }

  return results;
}

// ---------------------------------------------------------------------------
// Session lifecycle
// ---------------------------------------------------------------------------

/**
 * Start a new session. Creates a session_summaries row with started_at
 * and returns the session_id for the caller to use.
 */
export async function startSession(
  supabase: SupabaseClient,
  userId: string,
  moduleSource: ModuleSource,
): Promise<{ session_id: string; started_at: string } | null> {
  const sessionId = crypto.randomUUID();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("session_summaries")
    .insert({
      session_id: sessionId,
      user_id: userId,
      module_source: moduleSource,
      total_words: 0,
      correct_count: 0,
      completed_session: false,
      words_reviewed_ids: [],
      started_at: now,
    })
    .select()
    .single();

  if (error) {
    console.error("[ml-events] Failed to start session:", error.message);
    return null;
  }

  return { session_id: data.session_id, started_at: data.started_at };
}

/**
 * End a session. Computes the session summary from all logged interaction
 * events and updates the session_summaries row.
 * Also updates the user's rolling baseline.
 */
export async function endSession(
  supabase: SupabaseClient,
  userId: string,
  sessionId: string,
  completed: boolean,
): Promise<SessionSummaryRow | null> {
  const now = new Date();

  // Fetch all events in this session
  const { data: events, error: eventsErr } = await supabase
    .from("interaction_events")
    .select("*")
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .order("session_sequence_number", { ascending: true });

  if (eventsErr) {
    console.error(
      "[ml-events] Failed to fetch session events:",
      eventsErr.message,
    );
    return null;
  }

  const rows = (events ?? []) as InteractionEventRow[];

  // Compute summary stats
  const totalWords = rows.length;
  const correctCount = rows.filter((r) => r.correct).length;

  const responseTimes = rows
    .map((r) => r.response_time_ms)
    .filter((t): t is number => t != null && t > 0);

  const averageResponseTimeMs =
    responseTimes.length > 0
      ? Math.round(
          responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
        )
      : null;

  const wordIds = [
    ...new Set(
      rows.map((r) => r.word_id).filter((id): id is string => id != null),
    ),
  ];

  const fatigueValues = rows
    .map((r) => r.session_fatigue_proxy)
    .filter((f): f is number => f != null);

  const estimatedCognitiveLoad =
    fatigueValues.length > 0
      ? Math.round(
          (fatigueValues.reduce((a, b) => a + b, 0) / fatigueValues.length) *
            100,
        ) / 100
      : null;

  // Fetch the session start time
  const { data: sessionRow } = await supabase
    .from("session_summaries")
    .select("started_at")
    .eq("session_id", sessionId)
    .single();

  const startedAt = sessionRow?.started_at
    ? new Date(sessionRow.started_at)
    : null;

  const sessionDurationMs = startedAt
    ? now.getTime() - startedAt.getTime()
    : null;

  // Update the session summary
  const { data: summary, error: updateErr } = await supabase
    .from("session_summaries")
    .update({
      total_words: totalWords,
      correct_count: correctCount,
      average_response_time_ms: averageResponseTimeMs,
      completed_session: completed,
      session_duration_ms: sessionDurationMs,
      words_reviewed_ids: wordIds,
      estimated_cognitive_load: estimatedCognitiveLoad,
      ended_at: now.toISOString(),
    })
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .select()
    .single();

  if (updateErr) {
    console.error("[ml-events] Failed to end session:", updateErr.message);
    return null;
  }

  // Update user baseline (exponential moving average of response time)
  if (averageResponseTimeMs != null) {
    await updateUserBaseline(supabase, userId, averageResponseTimeMs, now);
  }

  return summary as SessionSummaryRow;
}

// ---------------------------------------------------------------------------
// Baseline management
// ---------------------------------------------------------------------------

/**
 * Update the user's rolling response-time baseline using an
 * exponential moving average. Also bumps total_sessions and
 * last_session_at.
 */
async function updateUserBaseline(
  supabase: SupabaseClient,
  userId: string,
  sessionAvgResponseTimeMs: number,
  now: Date,
): Promise<void> {
  const baseline = await getUserBaseline(supabase, userId);

  // EMA with a smoothing factor that increases with more sessions
  // α = 2 / (N + 1), capped so old data fades fast enough
  const n = Math.min(baseline.total_sessions + 1, 20);
  const alpha = 2 / (n + 1);
  const newAvg =
    baseline.avg_response_time_ms * (1 - alpha) +
    sessionAvgResponseTimeMs * alpha;

  const { error } = await supabase
    .from("user_baselines")
    .update({
      avg_response_time_ms: Math.round(newAvg),
      total_sessions: baseline.total_sessions + 1,
      last_session_at: now.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq("user_id", userId);

  if (error) {
    console.warn("[ml-events] Failed to update baseline:", error.message);
  }
}
