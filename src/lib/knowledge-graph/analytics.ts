/* =============================================================================
   KNOWLEDGE GRAPH ANALYTICS
   
   Aggregate statistics and diagnostic queries over the unified knowledge graph.
   Used by the dashboard, recommendation engine, and admin tools.
============================================================================= */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  UnifiedWord,
  ModuleSource,
  KnowledgeGraphStats,
  MODULE_SOURCES,
} from "@/types/knowledge-graph";

// ---------------------------------------------------------------------------
// Core: getKnowledgeGraphStats
// ---------------------------------------------------------------------------

/**
 * Compute aggregate statistics over the user's knowledge graph.
 */
export async function getKnowledgeGraphStats(
  supabase: SupabaseClient,
  userId: string,
  language: string = "fr",
): Promise<KnowledgeGraphStats> {
  const now = new Date();

  // ── Fetch all words ─────────────────────────────────────────────────────
  const { data, error } = await supabase
    .from("user_words")
    .select("*")
    .eq("user_id", userId)
    .eq("language", language);

  if (error || !data) {
    return emptyStats();
  }

  const words = data as UnifiedWord[];

  if (words.length === 0) {
    return emptyStats();
  }

  // ── Basic counts ────────────────────────────────────────────────────────
  const totalWords = words.length;
  const dueForReview = words.filter(
    (w) => new Date(w.next_review) <= now,
  ).length;

  // ── Averages ────────────────────────────────────────────────────────────
  const avgProd =
    words.reduce((sum, w) => sum + (w.production_score ?? 0), 0) / totalWords;
  const avgPron =
    words.reduce((sum, w) => sum + (w.pronunciation_score ?? 0), 0) /
    totalWords;

  // ── Weak grammar tags ──────────────────────────────────────────────────
  const tagMap = new Map<string, { scores: number[]; count: number }>();
  for (const w of words) {
    for (const tag of w.tags ?? []) {
      const key = tag.toLowerCase();
      if (!tagMap.has(key)) tagMap.set(key, { scores: [], count: 0 });
      const entry = tagMap.get(key)!;
      entry.scores.push(w.production_score ?? 0);
      entry.count++;
    }
  }
  const weakGrammarTags = Array.from(tagMap.entries())
    .map(([tag, { scores, count }]) => ({
      tag,
      avgScore: Math.round(scores.reduce((a, b) => a + b, 0) / count),
      wordCount: count,
    }))
    .filter((t) => t.avgScore < 50)
    .sort((a, b) => a.avgScore - b.avgScore);

  // ── Module breakdown (from module_review_history) ──────────────────────
  const { data: historyData } = await supabase
    .from("module_review_history")
    .select("module_source")
    .eq("user_id", userId);

  const moduleBreakdown: Record<string, number> = {};
  for (const row of historyData ?? []) {
    const src = row.module_source as ModuleSource;
    moduleBreakdown[src] = (moduleBreakdown[src] ?? 0) + 1;
  }

  // ── Ready for stories ─────────────────────────────────────────────────
  const readyForStories = words.filter(
    (w) =>
      (w.status === "known" ||
        w.status === "mastered" ||
        w.status === "learning") &&
      w.ease_factor >= (w.story_introduction_threshold ?? 1.0),
  ).length;

  return {
    totalWords,
    dueForReview,
    averageProductionScore: Math.round(avgProd),
    averagePronunciationScore: Math.round(avgPron),
    weakGrammarTags,
    moduleBreakdown: moduleBreakdown as Record<ModuleSource, number>,
    readyForStories,
  };
}

// ---------------------------------------------------------------------------
// Get recent module activity
// ---------------------------------------------------------------------------

export interface ModuleActivity {
  moduleSource: ModuleSource;
  reviewCount: number;
  correctCount: number;
  lastActive: string;
  accuracy: number;
}

/**
 * Get recent activity breakdown by module (last 7 days).
 */
export async function getRecentModuleActivity(
  supabase: SupabaseClient,
  userId: string,
  days: number = 7,
): Promise<ModuleActivity[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from("module_review_history")
    .select("module_source, correct, created_at")
    .eq("user_id", userId)
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  const map = new Map<
    string,
    { count: number; correct: number; lastActive: string }
  >();

  for (const row of data) {
    const src = row.module_source;
    if (!map.has(src)) {
      map.set(src, { count: 0, correct: 0, lastActive: row.created_at });
    }
    const entry = map.get(src)!;
    entry.count++;
    if (row.correct) entry.correct++;
  }

  return Array.from(map.entries()).map(
    ([src, { count, correct, lastActive }]) => ({
      moduleSource: src as ModuleSource,
      reviewCount: count,
      correctCount: correct,
      lastActive,
      accuracy: count > 0 ? Math.round((correct / count) * 100) : 0,
    }),
  );
}

// ---------------------------------------------------------------------------
// Get words needing attention
// ---------------------------------------------------------------------------

/**
 * Find words that need the most attention across all dimensions.
 */
export async function getWordsNeedingAttention(
  supabase: SupabaseClient,
  userId: string,
  language: string = "fr",
  limit: number = 20,
): Promise<UnifiedWord[]> {
  const { data, error } = await supabase
    .from("user_words")
    .select("*")
    .eq("user_id", userId)
    .eq("language", language)
    .or("status.eq.learning,status.eq.new")
    .order("production_score", { ascending: true })
    .limit(limit);

  if (error || !data) return [];
  return data as UnifiedWord[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function emptyStats(): KnowledgeGraphStats {
  return {
    totalWords: 0,
    dueForReview: 0,
    averageProductionScore: 0,
    averagePronunciationScore: 0,
    weakGrammarTags: [],
    moduleBreakdown: {} as Record<ModuleSource, number>,
    readyForStories: 0,
  };
}
