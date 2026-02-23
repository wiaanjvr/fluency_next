/**
 * @deprecated LEGACY — queries the `user_vocab` table (SM-2 v1 system).
 *
 * The `user_vocab` table is superseded by `user_words` + `learner_words_v2`
 * managed by the Knowledge Graph pipeline (`@/lib/knowledge-graph`).
 *
 * Functions that query `user_vocab` (getDueWords, getKnownWords, etc.) should
 * be migrated to use `user_words` queries. The `generated_content` helpers
 * (insertGeneratedContent, getLatestGeneratedContent) are not SRS-dependent
 * and can be extracted to a separate module when this file is removed.
 *
 * Every function accepts an already-authenticated SupabaseClient so RLS is
 * enforced automatically — no service-role key touches this module.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { SrsUpdate } from "@/lib/srs";

// ─── Row types (mirror the DB schema) ───────────────────────────────────────

export interface VocabRow {
  id: string;
  word: string;
  language: string;
  type: string;
  form: string;
  translation: string;
  frequency_rank: number;
}

export interface UserVocabRow {
  id: string;
  user_id: string;
  vocab_id: string;
  status: "unseen" | "learning" | "known";
  ease_factor: number;
  interval_days: number;
  next_review_at: string;
  last_reviewed_at: string | null;
  repetitions: number;
}

export interface UserVocabWithWord extends UserVocabRow {
  vocab: VocabRow;
}

export interface GeneratedContentRow {
  id: string;
  user_id: string;
  content: string;
  stage: "3_word" | "paragraph";
  vocab_ids: string[];
  created_at: string;
}

// ─── Error helper ────────────────────────────────────────────────────────────

export class VocabError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "VocabError";
  }
}

// ─── Queries ─────────────────────────────────────────────────────────────────

/**
 * Get words that are due for review (status = 'learning', next_review_at <= now).
 * Returns up to `limit` rows, ordered by next_review_at ASC (most overdue first).
 */
export async function getDueWords(
  supabase: SupabaseClient,
  userId: string,
  limit = 3,
): Promise<UserVocabWithWord[]> {
  const { data, error } = await supabase
    .from("user_vocab")
    .select("*, vocab(*)")
    .eq("user_id", userId)
    .eq("status", "learning")
    .lte("next_review_at", new Date().toISOString())
    .order("next_review_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw new VocabError(
      `Failed to fetch due words: ${error.message}`,
      "DUE_WORDS_ERROR",
    );
  }

  return (data ?? []) as unknown as UserVocabWithWord[];
}

/**
 * Get a random sample of the user's known words.
 * Supabase doesn't support ORDER BY random() directly through PostgREST,
 * so we fetch more rows than needed and sample client-side.
 */
export async function getKnownWords(
  supabase: SupabaseClient,
  userId: string,
  limit = 30,
): Promise<UserVocabWithWord[]> {
  // Fetch up to 3× the limit so we have a pool to sample from
  const fetchLimit = Math.min(limit * 3, 200);

  const { data, error } = await supabase
    .from("user_vocab")
    .select("*, vocab(*)")
    .eq("user_id", userId)
    .eq("status", "known")
    .limit(fetchLimit);

  if (error) {
    throw new VocabError(
      `Failed to fetch known words: ${error.message}`,
      "KNOWN_WORDS_ERROR",
    );
  }

  const rows = (data ?? []) as unknown as UserVocabWithWord[];

  // Fisher-Yates shuffle, then take `limit`
  for (let i = rows.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rows[i], rows[j]] = [rows[j], rows[i]];
  }

  return rows.slice(0, limit);
}

/**
 * Count how many words the user currently has marked as 'known'.
 */
export async function getKnownWordCount(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("user_vocab")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "known");

  if (error) {
    throw new VocabError(
      `Failed to count known words: ${error.message}`,
      "COUNT_ERROR",
    );
  }

  return count ?? 0;
}

/**
 * Apply an SRS update to a single user_vocab row.
 */
export async function updateUserVocab(
  supabase: SupabaseClient,
  userVocabId: string,
  update: SrsUpdate,
): Promise<UserVocabRow> {
  const { data, error } = await supabase
    .from("user_vocab")
    .update({
      status: update.status,
      ease_factor: update.ease_factor,
      interval_days: update.interval_days,
      repetitions: update.repetitions,
      next_review_at: update.next_review_at.toISOString(),
      last_reviewed_at: update.last_reviewed_at.toISOString(),
    })
    .eq("id", userVocabId)
    .select()
    .single();

  if (error) {
    throw new VocabError(
      `Failed to update user_vocab: ${error.message}`,
      "UPDATE_ERROR",
    );
  }

  return data as UserVocabRow;
}

/**
 * Initialize a user_vocab entry (e.g. when a learner first encounters a word).
 * If the row already exists (unique constraint on user_id + vocab_id), this
 * is a no-op and returns the existing row.
 */
export async function initializeUserVocab(
  supabase: SupabaseClient,
  userId: string,
  vocabId: string,
): Promise<UserVocabRow> {
  const { data, error } = await supabase
    .from("user_vocab")
    .upsert(
      {
        user_id: userId,
        vocab_id: vocabId,
        status: "unseen",
        ease_factor: 2.5,
        interval_days: 1,
        next_review_at: new Date().toISOString(),
        repetitions: 0,
      },
      { onConflict: "user_id,vocab_id", ignoreDuplicates: true },
    )
    .select()
    .single();

  if (error) {
    throw new VocabError(
      `Failed to initialize user_vocab: ${error.message}`,
      "INIT_ERROR",
    );
  }

  return data as UserVocabRow;
}

/**
 * Fetch a single user_vocab row by ID (with the joined vocab data).
 */
export async function getUserVocabById(
  supabase: SupabaseClient,
  userVocabId: string,
): Promise<UserVocabWithWord | null> {
  const { data, error } = await supabase
    .from("user_vocab")
    .select("*, vocab(*)")
    .eq("id", userVocabId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // not found
    throw new VocabError(
      `Failed to fetch user_vocab: ${error.message}`,
      "FETCH_ERROR",
    );
  }

  return data as unknown as UserVocabWithWord;
}

/**
 * Store an AI-generated piece of content.
 */
export async function insertGeneratedContent(
  supabase: SupabaseClient,
  userId: string,
  content: string,
  stage: "3_word" | "paragraph",
  vocabIds: string[],
): Promise<GeneratedContentRow> {
  const { data, error } = await supabase
    .from("generated_content")
    .insert({
      user_id: userId,
      content,
      stage,
      vocab_ids: vocabIds,
    })
    .select()
    .single();

  if (error) {
    throw new VocabError(
      `Failed to insert generated content: ${error.message}`,
      "INSERT_CONTENT_ERROR",
    );
  }

  return data as GeneratedContentRow;
}

/**
 * Fetch the most recent generated content for a user (used for idempotency
 * when there are no due words).
 */
export async function getLatestGeneratedContent(
  supabase: SupabaseClient,
  userId: string,
): Promise<GeneratedContentRow | null> {
  const { data, error } = await supabase
    .from("generated_content")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // no rows
    throw new VocabError(
      `Failed to fetch latest content: ${error.message}`,
      "FETCH_CONTENT_ERROR",
    );
  }

  return data as GeneratedContentRow;
}
