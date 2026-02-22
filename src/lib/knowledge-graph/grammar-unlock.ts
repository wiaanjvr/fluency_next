/* =============================================================================
   GRAMMAR UNLOCK — Fires when a grammar lesson is completed
   
   When a user completes a grammar lesson (e.g. "subjunctive"), this function:
   1. Finds all words in the knowledge graph tagged with that grammar concept
   2. Lowers their story_introduction_threshold so the main engine can start
      weaving them into stories
   3. Logs the unlock event to grammar_unlock_events
   
   This is the bridge between "learning a grammar rule in Propel" and
   "seeing that grammar in comprehensible input stories".
============================================================================= */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { UnifiedWord, GrammarUnlockEvent } from "@/types/knowledge-graph";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** The threshold value applied to words after their grammar concept is unlocked.
 *  1.0 = no gate (default for words without grammar prerequisites).
 *  Words gated by grammar start at a higher threshold (e.g. 3.0). */
const UNLOCKED_THRESHOLD = 1.0;

// ---------------------------------------------------------------------------
// Core: onGrammarLessonComplete
// ---------------------------------------------------------------------------

/**
 * Called when a user completes a grammar lesson. Finds all words tagged with
 * the grammar concept and lowers their story_introduction_threshold.
 *
 * @param supabase   Authenticated Supabase client
 * @param userId     Current user ID
 * @param grammarTag The grammar tag/concept that was taught (e.g. "subjunctive")
 * @param lessonId   Optional: the grammar_lessons.id that was completed
 * @returns The unlock event record, or null on failure
 */
export async function onGrammarLessonComplete(
  supabase: SupabaseClient,
  userId: string,
  grammarTag: string,
  lessonId?: string,
): Promise<GrammarUnlockEvent | null> {
  const normalizedTag = grammarTag.toLowerCase().trim();

  // ── 1. Find all user words tagged with this grammar concept ────────────
  //    Postgres: tags @> ARRAY['subjunctive'] checks array containment
  const { data: taggedWords, error: fetchErr } = await supabase
    .from("user_words")
    .select("id, tags, story_introduction_threshold, ease_factor")
    .eq("user_id", userId)
    .contains("tags", [normalizedTag]);

  if (fetchErr) {
    console.error("[onGrammarLessonComplete] Fetch error:", fetchErr.message);
    return null;
  }

  const words = (taggedWords ?? []) as Array<
    Pick<
      UnifiedWord,
      "id" | "tags" | "story_introduction_threshold" | "ease_factor"
    >
  >;

  if (words.length === 0) {
    // No words tagged with this concept yet — still log the event
    return logUnlockEvent(
      supabase,
      userId,
      normalizedTag,
      lessonId,
      0,
      null,
      null,
    );
  }

  // ── 2. Identify words that are currently gated ─────────────────────────
  const gatedWords = words.filter(
    (w) => (w.story_introduction_threshold ?? 1.0) > UNLOCKED_THRESHOLD,
  );

  if (gatedWords.length === 0) {
    // All words already unlocked — still log the event for auditing
    return logUnlockEvent(
      supabase,
      userId,
      normalizedTag,
      lessonId,
      0,
      null,
      null,
    );
  }

  // Capture the previous threshold for the event log (use first word's value)
  const previousThreshold = gatedWords[0].story_introduction_threshold ?? 1.0;

  // ── 3. Lower the threshold for all gated words ─────────────────────────
  const gatedIds = gatedWords.map((w) => w.id);

  const { error: updateErr } = await supabase
    .from("user_words")
    .update({
      story_introduction_threshold: UNLOCKED_THRESHOLD,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .in("id", gatedIds);

  if (updateErr) {
    console.error("[onGrammarLessonComplete] Update error:", updateErr.message);
    return null;
  }

  // ── 4. Log the unlock event ────────────────────────────────────────────
  return logUnlockEvent(
    supabase,
    userId,
    normalizedTag,
    lessonId,
    gatedWords.length,
    previousThreshold,
    UNLOCKED_THRESHOLD,
  );
}

// ---------------------------------------------------------------------------
// Tag words with a grammar concept
// ---------------------------------------------------------------------------

/**
 * Tag a set of words with a grammar concept. This is used to pre-gate words
 * before a grammar lesson is completed. Words tagged with a grammar concept
 * will have their story_introduction_threshold raised.
 *
 * @param supabase Authenticated client
 * @param userId   User ID
 * @param wordIds  Word IDs to tag
 * @param tag      Grammar tag to add
 * @param gateThreshold The threshold to set (default 3.0 = needs grammar lesson first)
 */
export async function tagWordsWithGrammar(
  supabase: SupabaseClient,
  userId: string,
  wordIds: string[],
  tag: string,
  gateThreshold: number = 3.0,
): Promise<number> {
  const normalizedTag = tag.toLowerCase().trim();
  let updated = 0;

  // Process in batches to avoid overly large queries
  for (const wordId of wordIds) {
    // Fetch current tags
    const { data } = await supabase
      .from("user_words")
      .select("tags, story_introduction_threshold")
      .eq("id", wordId)
      .eq("user_id", userId)
      .single();

    if (!data) continue;

    const currentTags: string[] = data.tags ?? [];
    if (currentTags.includes(normalizedTag)) {
      updated++;
      continue; // already tagged
    }

    const newTags = [...currentTags, normalizedTag];
    const { error } = await supabase
      .from("user_words")
      .update({
        tags: newTags,
        story_introduction_threshold: Math.max(
          data.story_introduction_threshold ?? 1.0,
          gateThreshold,
        ),
        updated_at: new Date().toISOString(),
      })
      .eq("id", wordId)
      .eq("user_id", userId);

    if (!error) updated++;
  }

  return updated;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function logUnlockEvent(
  supabase: SupabaseClient,
  userId: string,
  grammarTag: string,
  lessonId: string | undefined,
  wordsUnlocked: number,
  previousThreshold: number | null,
  newThreshold: number | null,
): Promise<GrammarUnlockEvent | null> {
  const { data, error } = await supabase
    .from("grammar_unlock_events")
    .insert({
      user_id: userId,
      grammar_tag: grammarTag,
      lesson_id: lessonId ?? null,
      words_unlocked: wordsUnlocked,
      previous_threshold: previousThreshold,
      new_threshold: newThreshold,
    })
    .select()
    .single();

  if (error) {
    console.warn(
      "[onGrammarLessonComplete] Failed to log event:",
      error.message,
    );
    return null;
  }

  return data as GrammarUnlockEvent;
}
