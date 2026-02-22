/* =============================================================================
   STORY WORD SELECTOR — Knowledge-Graph-Aware Word Selection for Stories
   
   Replaces / wraps the existing selectWordsForGeneration() with a version
   that is aware of the unified knowledge graph:
   
   1. Pulls words where dueDate <= today
   2. Enforces 95% known / 5% new constraint
   3. PRIORITIZES words recently drilled in Propel modules
   4. Respects story_introduction_threshold (grammar-gated words)
   
   The existing story-generator.ts still handles prompt construction — this
   module only handles the WORD SELECTION step.
============================================================================= */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { UnifiedWord, StoryWordSelection } from "@/types/knowledge-graph";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum percentage of unknown/new words in a story */
const MAX_NEW_WORD_RATIO = 0.05;

/** How many hours back to look for "recently drilled in Propel" words */
const RECENT_PROPEL_WINDOW_HOURS = 48;

/** Boost factor for words drilled in Propel recently */
const PROPEL_RECENCY_BOOST = 20;

// ---------------------------------------------------------------------------
// Priority scoring
// ---------------------------------------------------------------------------

function scorePriority(word: UnifiedWord, now: Date): number {
  let score = 0;

  // 1. Overdue bonus — more overdue = higher priority
  const nextReview = new Date(word.next_review);
  const daysOverdue =
    (now.getTime() - nextReview.getTime()) / (1000 * 60 * 60 * 24);
  if (daysOverdue > 0) {
    score += Math.min(daysOverdue * 10, 50); // cap at 50
  }

  // 2. Learning-phase bonus
  if (word.status === "learning") score += 8;

  // 3. Mastered penalty (still review, but lower priority)
  if (word.status === "mastered") score -= 3;

  // 4. Frequency bonus — common words matter more
  if (word.frequency_rank) {
    score += Math.max(0, 20 - word.frequency_rank / 50);
  }

  // 5. Propel recency boost — words drilled in a Propel module recently
  //    get a major priority bump so the story reinforces what was just practiced
  if (word.last_propel_review_at) {
    const propelAge =
      (now.getTime() - new Date(word.last_propel_review_at).getTime()) /
      (1000 * 60 * 60);
    if (propelAge < RECENT_PROPEL_WINDOW_HOURS) {
      // Linear decay: full boost at 0 hours, zero at RECENT_PROPEL_WINDOW_HOURS
      const recencyFactor = 1 - propelAge / RECENT_PROPEL_WINDOW_HOURS;
      score += PROPEL_RECENCY_BOOST * recencyFactor;
    }
  }

  // 6. Low production score = worth reinforcing in context
  if (word.production_score < 40) {
    score += (40 - word.production_score) / 4;
  }

  return score;
}

// ---------------------------------------------------------------------------
// Fisher-Yates shuffle
// ---------------------------------------------------------------------------

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------------------------------------------------------------------------
// Core: getWordsForStory
// ---------------------------------------------------------------------------

/**
 * Select words from the unified knowledge graph for story generation.
 *
 * @param supabase  Authenticated Supabase client (RLS enforced)
 * @param userId    Current user ID
 * @param storyLength Target word count for the story
 * @param language  Target language code (default: user's target_language)
 * @returns StoryWordSelection with known, review, and new word lists
 */
export async function getWordsForStory(
  supabase: SupabaseClient,
  userId: string,
  storyLength: number,
  language: string = "fr",
): Promise<StoryWordSelection> {
  const now = new Date();
  const nowIso = now.toISOString();

  // ── 1. Fetch ALL user words for this language ──────────────────────────
  const { data: allWords, error } = await supabase
    .from("user_words")
    .select("*")
    .eq("user_id", userId)
    .eq("language", language)
    .order("next_review", { ascending: true });

  if (error) {
    console.error("[getWordsForStory] Fetch error:", error.message);
    return emptySelection(storyLength);
  }

  const words = (allWords ?? []) as UnifiedWord[];

  if (words.length === 0) {
    return emptySelection(storyLength);
  }

  // ── 2. Partition into categories ───────────────────────────────────────

  // Known/mastered words that pass the story-introduction threshold
  const knownPool = words.filter(
    (w) =>
      (w.status === "known" ||
        w.status === "mastered" ||
        w.status === "learning") &&
      w.ease_factor >= (w.story_introduction_threshold ?? 1.0),
  );

  // Words due for review (subset of known)
  const dueWords = knownPool.filter((w) => new Date(w.next_review) <= now);

  // New/unseen words that pass the threshold (candidates for introduction)
  const newPool = words.filter(
    (w) =>
      w.status === "new" &&
      w.ease_factor >= (w.story_introduction_threshold ?? 1.0),
  );

  // ── 3. Calculate target counts with 95/5 constraint ────────────────────
  const maxNewCount = Math.max(1, Math.floor(storyLength * MAX_NEW_WORD_RATIO));
  const targetKnownCount = storyLength - maxNewCount;

  // ── 4. Select KNOWN words — prioritize by score ────────────────────────
  const scoredKnown = knownPool.map((w) => ({
    word: w,
    score: scorePriority(w, now),
  }));
  scoredKnown.sort((a, b) => b.score - a.score);

  // Take top 70% by priority, 30% random for variety
  const priorityCount = Math.floor(targetKnownCount * 0.7);
  const randomCount = targetKnownCount - priorityCount;

  const topPriority = scoredKnown.slice(0, priorityCount).map((s) => s.word);
  const remaining = scoredKnown.slice(priorityCount).map((s) => s.word);
  const randomPick = shuffle(remaining).slice(0, randomCount);

  const selectedKnown = [...topPriority, ...randomPick];

  // Identify which of the selected known words are actually due for review
  const selectedReview = selectedKnown.filter(
    (w) => new Date(w.next_review) <= now,
  );

  // ── 5. Select NEW words — prefer recently-drilled Propel words ─────────
  const scoredNew = newPool.map((w) => ({
    word: w,
    score: scorePriority(w, now),
  }));
  scoredNew.sort((a, b) => b.score - a.score);
  const selectedNew = scoredNew.slice(0, maxNewCount).map((s) => s.word);

  // ── 6. Combine and compute metadata ────────────────────────────────────
  const allSelected = [...selectedKnown, ...selectedNew];
  const recentPropelCutoff = new Date(
    now.getTime() - RECENT_PROPEL_WINDOW_HOURS * 60 * 60 * 1000,
  );
  const recentlyDrilledCount = allSelected.filter(
    (w) =>
      w.last_propel_review_at &&
      new Date(w.last_propel_review_at) > recentPropelCutoff,
  ).length;

  const knownPercentage =
    allSelected.length > 0
      ? (selectedKnown.length / allSelected.length) * 100
      : 100;

  return {
    knownWords: selectedKnown,
    reviewWords: selectedReview,
    newWords: selectedNew,
    allWords: allSelected,
    meta: {
      totalRequested: storyLength,
      knownPercentage: Math.round(knownPercentage * 10) / 10,
      recentlyDrilledCount,
    },
  };
}

// ---------------------------------------------------------------------------
// Empty selection fallback
// ---------------------------------------------------------------------------

function emptySelection(storyLength: number): StoryWordSelection {
  return {
    knownWords: [],
    reviewWords: [],
    newWords: [],
    allWords: [],
    meta: {
      totalRequested: storyLength,
      knownPercentage: 100,
      recentlyDrilledCount: 0,
    },
  };
}
