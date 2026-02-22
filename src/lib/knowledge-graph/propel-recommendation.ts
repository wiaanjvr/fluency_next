/* =============================================================================
   PROPEL RECOMMENDATION ENGINE
   
   Analyzes the unified word knowledge graph and recommends which Propel
   module the user should visit next, along with the reason and target words.
   
   Heuristics:
   - Many words tagged "subjunctive" with low productionScore → conjugation
   - High exposureCount but low productionScore → cloze or typing mode
   - Healthy intervals but low pronunciationScore → pronunciation / Mimic Method
   - Many new words just unlocked by grammar → grammar drill
   - General weakness in active recall → flashcards
   - Comfortable learner wanting immersion → free reading
============================================================================= */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  UnifiedWord,
  PropelRecommendation,
  PropelModule,
  ModuleSource,
} from "@/types/knowledge-graph";

// ---------------------------------------------------------------------------
// Thresholds (tunable)
// ---------------------------------------------------------------------------

const LOW_PRODUCTION = 35;
const LOW_PRONUNCIATION = 30;
const HIGH_EXPOSURE = 8;
const GRAMMAR_TAG_CLUSTER_MIN = 3; // min words sharing a tag to trigger recommendation
const HEALTHY_INTERVAL_DAYS = 4; // words with interval >= this are "stable"

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface TagCluster {
  tag: string;
  words: UnifiedWord[];
  avgProduction: number;
  avgPronunciation: number;
}

interface Signal {
  module: PropelModule;
  reason: string;
  targetWords: string[];
  priority: number;
}

// ---------------------------------------------------------------------------
// Core: getPropelRecommendation
// ---------------------------------------------------------------------------

/**
 * Analyze the user's knowledge graph and return a ranked recommendation for
 * which Propel module to visit next.
 *
 * Returns the TOP recommendation. For a ranked list, use `getPropelRecommendations`.
 */
export async function getPropelRecommendation(
  supabase: SupabaseClient,
  userId: string,
  language: string = "fr",
): Promise<PropelRecommendation> {
  const ranked = await getPropelRecommendations(supabase, userId, language);
  return ranked[0]; // always has at least one (free_reading fallback)
}

/**
 * Return ALL recommendations sorted by priority (highest first).
 */
export async function getPropelRecommendations(
  supabase: SupabaseClient,
  userId: string,
  language: string = "fr",
): Promise<PropelRecommendation[]> {
  // ── 1. Fetch user words ─────────────────────────────────────────────────
  const { data, error } = await supabase
    .from("user_words")
    .select("*")
    .eq("user_id", userId)
    .eq("language", language);

  if (error || !data || data.length === 0) {
    return [fallbackRecommendation()];
  }

  const words = data as UnifiedWord[];
  const signals: Signal[] = [];

  // ── 2. Analyze grammar tag clusters ─────────────────────────────────────
  const tagClusters = buildTagClusters(words);

  for (const cluster of tagClusters) {
    // Weak grammar concepts → conjugation drills
    if (
      cluster.avgProduction < LOW_PRODUCTION &&
      cluster.words.length >= GRAMMAR_TAG_CLUSTER_MIN
    ) {
      const isVerbTag =
        /verb|conjug|tense|subjunctive|conditional|imperative|participle/i.test(
          cluster.tag,
        );

      if (isVerbTag) {
        signals.push({
          module: "conjugation",
          reason: `${cluster.words.length} words tagged "${cluster.tag}" have low production scores (avg ${Math.round(cluster.avgProduction)}%). Conjugation drills will build active recall.`,
          targetWords: cluster.words.map((w) => w.id),
          priority: 85 + (GRAMMAR_TAG_CLUSTER_MIN - cluster.avgProduction) / 2,
        });
      } else {
        signals.push({
          module: "grammar",
          reason: `${cluster.words.length} words tagged "${cluster.tag}" need grammar reinforcement (avg production: ${Math.round(cluster.avgProduction)}%).`,
          targetWords: cluster.words.map((w) => w.id),
          priority: 70 + (GRAMMAR_TAG_CLUSTER_MIN - cluster.avgProduction) / 3,
        });
      }
    }
  }

  // ── 3. High exposure, low production → cloze/typing ─────────────────────
  const highExposureLowProd = words.filter(
    (w) =>
      (w.exposure_count ?? 0) >= HIGH_EXPOSURE &&
      (w.production_score ?? 0) < LOW_PRODUCTION,
  );
  if (highExposureLowProd.length >= 3) {
    signals.push({
      module: "cloze",
      reason: `${highExposureLowProd.length} words have been seen ${HIGH_EXPOSURE}+ times but production is below ${LOW_PRODUCTION}%. Cloze exercises force typed production in context.`,
      targetWords: highExposureLowProd.map((w) => w.id),
      priority: 80,
    });
  }

  // ── 4. Stable intervals, low pronunciation → Mimic Method ──────────────
  const stableLowPronunciation = words.filter(
    (w) =>
      (w.interval ?? 0) >= HEALTHY_INTERVAL_DAYS &&
      (w.pronunciation_score ?? 0) < LOW_PRONUNCIATION &&
      (w.status === "known" || w.status === "mastered"),
  );
  if (stableLowPronunciation.length >= 3) {
    signals.push({
      module: "pronunciation",
      reason: `${stableLowPronunciation.length} words are well-memorized but pronunciation is weak (avg ${Math.round(avg(stableLowPronunciation, "pronunciation_score"))}%). A Mimic Method session will improve spoken fluency.`,
      targetWords: stableLowPronunciation.map((w) => w.id),
      priority: 75,
    });
  }

  // ── 5. General weak recall → flashcards ─────────────────────────────────
  const weakRecall = words.filter(
    (w) =>
      w.status === "learning" &&
      (w.repetitions ?? 0) < 3 &&
      (w.production_score ?? 0) < 50,
  );
  if (weakRecall.length >= 5) {
    signals.push({
      module: "flashcards",
      reason: `${weakRecall.length} words are in early learning with few repetitions. Flashcard drills build foundational recall quickly.`,
      targetWords: weakRecall.slice(0, 20).map((w) => w.id),
      priority: 65,
    });
  }

  // ── 6. Comfortable learner → free reading ──────────────────────────────
  const knownCount = words.filter(
    (w) => w.status === "known" || w.status === "mastered",
  ).length;
  if (knownCount > 200) {
    signals.push({
      module: "free_reading",
      reason: `You know ${knownCount} words — enough for comfortable free reading. Extensive input reinforces everything passively.`,
      targetWords: [], // free reading doesn't target specific words
      priority: 40,
    });
  }

  // ── 7. Sort by priority and return ──────────────────────────────────────
  if (signals.length === 0) {
    return [fallbackRecommendation()];
  }

  signals.sort((a, b) => b.priority - a.priority);

  return signals.map((s) => ({
    module: s.module,
    reason: s.reason,
    targetWords: s.targetWords,
    priority: Math.round(Math.min(100, Math.max(0, s.priority))),
  }));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildTagClusters(words: UnifiedWord[]): TagCluster[] {
  const tagMap = new Map<string, UnifiedWord[]>();

  for (const w of words) {
    const tags = w.tags ?? [];
    for (const tag of tags) {
      const key = tag.toLowerCase().trim();
      if (!key) continue;
      if (!tagMap.has(key)) tagMap.set(key, []);
      tagMap.get(key)!.push(w);
    }
  }

  return Array.from(tagMap.entries()).map(([tag, ws]) => ({
    tag,
    words: ws,
    avgProduction: avg(ws, "production_score"),
    avgPronunciation: avg(ws, "pronunciation_score"),
  }));
}

function avg(
  words: UnifiedWord[],
  field: "production_score" | "pronunciation_score",
): number {
  if (words.length === 0) return 0;
  const sum = words.reduce((acc, w) => acc + (w[field] ?? 0), 0);
  return sum / words.length;
}

function fallbackRecommendation(): PropelRecommendation {
  return {
    module: "flashcards",
    reason:
      "Start with flashcards to build your foundational vocabulary before diving into other modules.",
    targetWords: [],
    priority: 50,
  };
}
