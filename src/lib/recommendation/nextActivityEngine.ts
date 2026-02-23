/* =============================================================================
   NEXT ACTIVITY RECOMMENDATION ENGINE
   
   Computes the single best next activity for a user based on their knowledge
   graph, SRS state, module history, and recency signals. Returns a typed
   recommendation consumed by the dashboard hero card.
   
   Priority order:
     1. SRS Due (flashcards overdue)
     2. Conjugation Weakness (high error rate)
     3. Vocabulary Debt (seen but undrilled words)
     4. Pronunciation Gap (not practiced recently)
     5. Conversation Due (no live session in 4+ days)
     6. Grammar Gap (weak grammar patterns)
     7. Optimal Reading Conditions (fallback)
     8. Cold Start (new user)
   
   Scoring boosts: +10 if >24h since last session, +5 if rated highly,
   -10 if same activity completed < 2h ago. Capped at 100.
============================================================================= */

import type { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type RecommendationReason =
  | "srs_due"
  | "weak_conjugation"
  | "pronunciation_gap"
  | "vocabulary_debt"
  | "conversation_due"
  | "grammar_gap"
  | "reading_streak"
  | "cold_start";

export interface ActivityRecommendation {
  activityType:
    | "reading"
    | "cloze"
    | "flashcards"
    | "conjugation"
    | "pronunciation"
    | "grammar"
    | "conversation";
  route: string;
  urgencyScore: number; // 0–100
  headline: string;
  subtext: string;
  estimatedMinutes: number;
  itemCount?: number;
  reason: RecommendationReason;
}

// ---------------------------------------------------------------------------
// In-memory cache  (per-user, 5 minute TTL)
// ---------------------------------------------------------------------------

const cache = new Map<string, { result: ActivityRecommendation; ts: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export function invalidateRecommendationCache(userId: string) {
  cache.delete(userId);
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function computeNextActivity(
  supabase: SupabaseClient,
  userId: string,
  language: string = "fr",
): Promise<ActivityRecommendation> {
  // Check cache
  const cached = cache.get(userId);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.result;
  }

  const result = await computeUncached(supabase, userId, language);

  // Store in cache
  cache.set(userId, { result, ts: Date.now() });
  return result;
}

// ---------------------------------------------------------------------------
// Core algorithm
// ---------------------------------------------------------------------------

async function computeUncached(
  supabase: SupabaseClient,
  userId: string,
  language: string,
): Promise<ActivityRecommendation> {
  // ── Fetch all user words ───────────────────────────────────────────────
  const { data: words } = await supabase
    .from("user_words")
    .select(
      "id, word, status, next_review, times_seen, production_score, pronunciation_score, exposure_count, recognition_score, last_propel_module, last_propel_review_at, interval_days, repetitions, tags",
    )
    .eq("user_id", userId)
    .eq("language", language);

  const allWords = words ?? [];

  // ── Cold start detection (Rule 8 — checked first but lowest priority) ──
  if (allWords.length < 20) {
    const rec = buildColdStart(allWords);
    return applyBoosts(rec, supabase, userId);
  }

  // ── Rule 1: SRS Due ────────────────────────────────────────────────────
  const now = new Date().toISOString();

  // Check FSRS card_schedules for flashcard-specific due cards
  const { data: dueCards } = await supabase
    .from("card_schedules")
    .select("id")
    .eq("user_id", userId)
    .lte("due", now);

  // Also count user_words with next_review <= now
  const dueWordCount = allWords.filter(
    (w) =>
      w.next_review &&
      new Date(w.next_review).getTime() <= Date.now() &&
      (w.status === "learning" || w.status === "known"),
  ).length;

  const srsDueCount = Math.max(dueCards?.length ?? 0, dueWordCount);

  if (srsDueCount >= 5) {
    const urgency =
      srsDueCount >= 15 ? 95 : Math.min(100, 60 + srsDueCount * 2);
    const headline =
      srsDueCount >= 15
        ? `${srsDueCount} words are slipping away`
        : `${srsDueCount} words are ready for review`;
    const subtext =
      srsDueCount >= 15
        ? "These words need your attention before they fade"
        : "A quick review will lock them in deeper";

    const rec: ActivityRecommendation = {
      activityType: "flashcards",
      route: "/propel/flashcards",
      urgencyScore: urgency,
      headline,
      subtext,
      estimatedMinutes: Math.max(3, Math.ceil(srsDueCount * 0.5)),
      itemCount: srsDueCount,
      reason: "srs_due",
    };
    return applyBoosts(rec, supabase, userId);
  }

  // ── Rule 2: Conjugation Weakness ───────────────────────────────────────
  const { data: conjProgress } = await supabase
    .from("conjugation_progress")
    .select("correct_count, attempt_count")
    .eq("user_id", userId)
    .order("last_attempted_at", { ascending: false })
    .limit(20);

  if (conjProgress && conjProgress.length >= 5) {
    const totalAttempts = conjProgress.reduce(
      (s, r) => s + (r.attempt_count ?? 0),
      0,
    );
    const totalCorrect = conjProgress.reduce(
      (s, r) => s + (r.correct_count ?? 0),
      0,
    );
    const errorRate =
      totalAttempts > 0
        ? ((totalAttempts - totalCorrect) / totalAttempts) * 100
        : 0;

    if (errorRate >= 40) {
      const urgency = Math.min(100, 70 + (errorRate - 40));
      const rec: ActivityRecommendation = {
        activityType: "conjugation",
        route: "/conjugation",
        urgencyScore: urgency,
        headline: "Your verb forms need sharpening",
        subtext: `${Math.round(errorRate)}% error rate on recent conjugations — a focused drill will help`,
        estimatedMinutes: 8,
        reason: "weak_conjugation",
      };
      return applyBoosts(rec, supabase, userId);
    }
  }

  // ── Rule 3: Vocabulary Debt ───────────────────────────────────────────
  const vocabDebt = allWords.filter(
    (w) =>
      (w.times_seen ?? w.exposure_count ?? 0) >= 3 &&
      (w.production_score ?? 0) < 40,
  );

  if (vocabDebt.length >= 8) {
    const rec: ActivityRecommendation = {
      activityType: "flashcards",
      route: "/propel/flashcards",
      urgencyScore: 65,
      headline: `${vocabDebt.length} words need active practice`,
      subtext:
        "You've seen these words but haven't drilled them — time to make them stick",
      estimatedMinutes: Math.max(5, Math.ceil(vocabDebt.length * 0.4)),
      itemCount: vocabDebt.length,
      reason: "vocabulary_debt",
    };
    return applyBoosts(rec, supabase, userId);
  }

  // ── Rule 4: Pronunciation Gap ─────────────────────────────────────────
  const { data: pronSessions } = await supabase
    .from("user_pronunciation_sessions")
    .select("created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1);

  const lastPronSession = pronSessions?.[0]?.created_at;
  const pronGapDays = lastPronSession
    ? (Date.now() - new Date(lastPronSession).getTime()) / (1000 * 60 * 60 * 24)
    : Infinity;

  if (pronGapDays > 3) {
    const unpracticedPronWords = allWords.filter(
      (w) => (w.pronunciation_score ?? 0) < 20 && w.status !== "new",
    );
    if (unpracticedPronWords.length > 0) {
      const rec: ActivityRecommendation = {
        activityType: "pronunciation",
        route: "/propel/pronunciation",
        urgencyScore: 60,
        headline: "Your pronunciation is waiting",
        subtext:
          pronGapDays === Infinity
            ? "You haven't tried pronunciation training yet — give it a go"
            : `It's been ${Math.floor(pronGapDays)} days since your last pronunciation session`,
        estimatedMinutes: 10,
        itemCount: unpracticedPronWords.length,
        reason: "pronunciation_gap",
      };
      return applyBoosts(rec, supabase, userId);
    }
  }

  // ── Rule 5: Conversation Due ──────────────────────────────────────────
  const { data: convSessions } = await supabase
    .from("conversation_sessions")
    .select("created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1);

  const lastConvSession = convSessions?.[0]?.created_at;
  const convGapDays = lastConvSession
    ? (Date.now() - new Date(lastConvSession).getTime()) / (1000 * 60 * 60 * 24)
    : Infinity;

  const comfortableWords = allWords.filter(
    (w) =>
      (w.production_score ?? 0) >= 50 ||
      w.status === "known" ||
      w.status === "mastered",
  ).length;

  if (convGapDays > 4 && comfortableWords >= 30) {
    const rec: ActivityRecommendation = {
      activityType: "conversation",
      route: "/propel/conversation",
      urgencyScore: 55,
      headline: "Ready to speak?",
      subtext:
        convGapDays === Infinity
          ? `You know ${comfortableWords} words — try a live conversation`
          : `It's been ${Math.floor(convGapDays)} days since your last conversation`,
      estimatedMinutes: 10,
      reason: "conversation_due",
    };
    return applyBoosts(rec, supabase, userId);
  }

  // ── Rule 6: Grammar Gap ───────────────────────────────────────────────
  const { data: grammarMastery } = await supabase
    .from("grammar_concept_mastery")
    .select("concept_tag, mastery_score, exposure_count")
    .eq("user_id", userId)
    .lt("mastery_score", 0.5)
    .gt("exposure_count", 0);

  if (grammarMastery && grammarMastery.length > 0) {
    const weakest = grammarMastery.sort(
      (a, b) => (a.mastery_score ?? 0) - (b.mastery_score ?? 0),
    )[0];
    const rec: ActivityRecommendation = {
      activityType: "grammar",
      route: "/grammar",
      urgencyScore: 50,
      headline: "A grammar pattern needs work",
      subtext: `"${weakest.concept_tag}" is at ${Math.round((weakest.mastery_score ?? 0) * 100)}% mastery — reinforce it with exercises`,
      estimatedMinutes: 10,
      reason: "grammar_gap",
    };
    return applyBoosts(rec, supabase, userId);
  }

  // ── Rule 7: Optimal Reading Conditions (fallback) ─────────────────────
  const rec: ActivityRecommendation = {
    activityType: "reading",
    route: "/propel/free-reading",
    urgencyScore: 40,
    headline: "Dive into something new",
    subtext: "Your knowledge is in great shape — expand it with fresh reading",
    estimatedMinutes: 15,
    reason: "reading_streak",
  };
  return applyBoosts(rec, supabase, userId);
}

// ---------------------------------------------------------------------------
// Cold start builder
// ---------------------------------------------------------------------------

function buildColdStart(
  allWords: Array<{ last_propel_module?: string | null }>,
): ActivityRecommendation {
  // Determine which activities the user has never tried
  const triedModules = new Set(
    allWords.map((w) => w.last_propel_module).filter(Boolean),
  );

  // Priority: flashcards → cloze → pronunciation → reading → conjugation → grammar → conversation
  const priority: Array<{
    module: ActivityRecommendation["activityType"];
    route: string;
    propelKey: string;
  }> = [
    {
      module: "flashcards",
      route: "/propel/flashcards",
      propelKey: "flashcards",
    },
    { module: "cloze", route: "/propel/cloze", propelKey: "cloze" },
    {
      module: "pronunciation",
      route: "/propel/pronunciation",
      propelKey: "pronunciation",
    },
    {
      module: "reading",
      route: "/propel/free-reading",
      propelKey: "free_reading",
    },
    { module: "conjugation", route: "/conjugation", propelKey: "conjugation" },
    { module: "grammar", route: "/grammar", propelKey: "grammar" },
    {
      module: "conversation",
      route: "/propel/conversation",
      propelKey: "conversation",
    },
  ];

  const untried = priority.find((p) => !triedModules.has(p.propelKey));
  const target = untried ?? priority[0];

  return {
    activityType: target.module,
    route: target.route,
    urgencyScore: 30,
    headline: "Let's find your depth",
    subtext:
      "Start with a quick activity and we'll chart your course from there",
    estimatedMinutes: 5,
    reason: "cold_start",
  };
}

// ---------------------------------------------------------------------------
// Scoring boosts
// ---------------------------------------------------------------------------

async function applyBoosts(
  rec: ActivityRecommendation,
  supabase: SupabaseClient,
  userId: string,
): Promise<ActivityRecommendation> {
  let score = rec.urgencyScore;

  try {
    // +10 if more than 24h since last session of any kind
    const { data: baseline } = await supabase
      .from("user_baselines")
      .select("last_session_at")
      .eq("user_id", userId)
      .single();

    if (baseline?.last_session_at) {
      const hoursSinceLastSession =
        (Date.now() - new Date(baseline.last_session_at).getTime()) /
        (1000 * 60 * 60);
      if (hoursSinceLastSession > 24) {
        score += 10;
      }
    } else {
      // No baseline at all → treat as >24h
      score += 10;
    }

    // -10 if user just completed this exact activity type in the last 2 hours
    const { data: recentSessions } = await supabase
      .from("session_summaries")
      .select("module_source, ended_at")
      .eq("user_id", userId)
      .order("ended_at", { ascending: false })
      .limit(3);

    const activityToModule: Record<string, string[]> = {
      flashcards: ["flashcards"],
      cloze: ["cloze"],
      conjugation: ["conjugation"],
      pronunciation: ["pronunciation"],
      grammar: ["grammar"],
      reading: ["free_reading", "story_engine"],
      conversation: ["conversation"],
    };

    const mappedModules = activityToModule[rec.activityType] ?? [];

    if (recentSessions) {
      for (const session of recentSessions) {
        if (mappedModules.includes(session.module_source) && session.ended_at) {
          const hoursSince =
            (Date.now() - new Date(session.ended_at).getTime()) /
            (1000 * 60 * 60);
          if (hoursSince < 2) {
            score -= 10;
            break;
          }
        }
      }
    }
  } catch {
    // Boost queries failing is non-fatal — just return base score
  }

  // Cap at 0–100
  rec.urgencyScore = Math.max(0, Math.min(100, score));
  return rec;
}
