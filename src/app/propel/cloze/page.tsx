"use client";

import { useState, useEffect, useReducer, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import {
  OceanBackground,
  OceanNavigation,
  DepthSidebar,
} from "@/components/ocean";
import LoadingScreen from "@/components/ui/LoadingScreen";
import { useAmbientPlayer } from "@/contexts/AmbientPlayerContext";
import {
  TypeInput,
  MultipleChoice,
  WordBank,
  FeedbackPanel,
  SessionSummary,
  InputModeToggle,
} from "@/components/cloze";
import { clozeReducer, initialState } from "@/lib/cloze/cloze-reducer";
import { cn } from "@/lib/utils";
import { ArrowLeft, Check, X } from "lucide-react";
import type { ClozeItem, InputMode, ClozeLevel } from "@/types/cloze";
import { recordReview } from "@/lib/knowledge-graph/record-review";
import type { ModuleSource } from "@/types/knowledge-graph";
import { lemmatize } from "@/lib/srs/word-utils";
import Link from "next/link";
import "@/styles/ocean-theme.css";

const ITEMS_PER_SESSION = 10;

// Fix #14: Server-side seen IDs via user_cloze_progress table
async function getSeenIds(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<string[]> {
  try {
    const { data } = await supabase
      .from("user_cloze_progress")
      .select("cloze_item_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(500);
    return (data || []).map((row) => row.cloze_item_id);
  } catch {
    return [];
  }
}

const LEVEL_ORDER: ClozeLevel[] = ["A1", "A2", "B1", "B2", "C1"];

function getAdjacentLevels(level: ClozeLevel): ClozeLevel[] {
  const idx = LEVEL_ORDER.indexOf(level);
  const levels: ClozeLevel[] = [level];
  if (idx > 0) levels.push(LEVEL_ORDER[idx - 1]);
  if (idx < LEVEL_ORDER.length - 1) levels.push(LEVEL_ORDER[idx + 1]);
  return levels;
}

async function fetchClozeItems(
  supabase: ReturnType<typeof createClient>,
  userLanguage: string,
  userLevel: ClozeLevel,
  userId: string,
): Promise<ClozeItem[]> {
  const seenIds = await getSeenIds(supabase, userId);

  // Fix #10: Query user_words for weak/due words to prioritize them
  const now = new Date().toISOString();
  const { data: weakWords } = await supabase
    .from("user_words")
    .select("word, lemma")
    .eq("user_id", userId)
    .eq("language", userLanguage)
    .or(`status.eq.new,status.eq.learning,next_review.lte.${now}`)
    .limit(50);

  const weakWordSet = new Set<string>();
  for (const w of weakWords || []) {
    weakWordSet.add((w.word || "").toLowerCase());
    if (w.lemma) weakWordSet.add(w.lemma.toLowerCase());
  }

  let priorityItems: ClozeItem[] = [];

  // First, try to get items that test weak/due words
  if (weakWordSet.size > 0) {
    const weakWordArr = Array.from(weakWordSet).filter(Boolean);
    let priorityQuery = supabase
      .from("cloze_items")
      .select("*")
      .eq("language", userLanguage)
      .eq("level", userLevel)
      .in("answer", weakWordArr)
      .order("used_count", { ascending: true })
      .limit(ITEMS_PER_SESSION);

    if (seenIds.length > 0) {
      priorityQuery = priorityQuery.not("id", "in", `(${seenIds.join(",")})`);
    }

    const { data: pData } = await priorityQuery;
    priorityItems = (pData || []) as ClozeItem[];
  }

  // Fill remaining slots with standard least-used items
  const remaining = ITEMS_PER_SESSION - priorityItems.length;
  if (remaining > 0) {
    const excludeIds = [...seenIds, ...priorityItems.map((i) => i.id)];

    let query = supabase
      .from("cloze_items")
      .select("*")
      .eq("language", userLanguage)
      .eq("level", userLevel)
      .order("used_count", { ascending: true })
      .limit(remaining);

    if (excludeIds.length > 0) {
      query = query.not("id", "in", `(${excludeIds.join(",")})`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[cloze] Fetch error:", error);
      return priorityItems;
    }

    const combined = [...priorityItems, ...(data || [])];

    // If still not enough, broaden to adjacent levels
    if (combined.length < ITEMS_PER_SESSION) {
      const adjacentLevels = getAdjacentLevels(userLevel);
      const existingIds = new Set(combined.map((d) => d.id));
      const allExclude = [...seenIds, ...Array.from(existingIds)];

      let broadQuery = supabase
        .from("cloze_items")
        .select("*")
        .eq("language", userLanguage)
        .in("level", adjacentLevels)
        .order("used_count", { ascending: true })
        .limit(ITEMS_PER_SESSION);

      if (allExclude.length > 0) {
        broadQuery = broadQuery.not("id", "in", `(${allExclude.join(",")})`);
      }

      const { data: broadData } = await broadQuery;
      if (broadData) {
        const additional = broadData.filter(
          (d: ClozeItem) => !existingIds.has(d.id),
        );
        return [...combined, ...additional].slice(0, ITEMS_PER_SESSION);
      }
    }

    return combined.slice(0, ITEMS_PER_SESSION);
  }

  return priorityItems;
}

function ClozeContent({
  streak,
  avatarUrl,
  targetLanguage,
  isAdmin,
  wordsEncountered,
  userId,
}: {
  streak: number;
  avatarUrl?: string;
  targetLanguage: string;
  isAdmin: boolean;
  wordsEncountered: number;
  userId: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const { ambientView, setAmbientView } = useAmbientPlayer();
  const [state, dispatch] = useReducer(clozeReducer, initialState);
  const [loading, setLoading] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);
  const [activeLevel, setActiveLevel] = useState<ClozeLevel>("B1");

  // Fix #17: Track question start time for responseTimeMs
  const questionStartRef = useRef<number>(Date.now());

  // Map target language to 2-char code
  const langCode =
    targetLanguage === "french"
      ? "fr"
      : targetLanguage === "german"
        ? "de"
        : targetLanguage === "italian"
          ? "it"
          : "fr";

  const loadItems = useCallback(
    async (level?: ClozeLevel) => {
      const targetLevel = level ?? activeLevel;
      setLoading(true);
      const items = await fetchClozeItems(
        supabase,
        langCode,
        targetLevel,
        userId,
      );
      if (items.length > 0) {
        dispatch({ type: "SET_ITEMS", items });
        questionStartRef.current = Date.now();

        // Increment used_count in background
        const ids = items.map((i) => i.id);
        Promise.resolve(
          supabase.rpc("increment_cloze_used_count", { item_ids: ids }),
        ).catch(() => {});
      }
      setLoading(false);
    },
    [supabase, langCode, activeLevel, userId],
  );

  function handleLevelChange(level: ClozeLevel) {
    setActiveLevel(level);
    loadItems(level);
  }

  useEffect(() => {
    if (ambientView === "container") {
      setAmbientView("soundbar");
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (state.answerState !== "idle") {
        if (e.key === "Enter" || e.key === "ArrowRight") {
          e.preventDefault();
          if (state.sessionComplete) return;
          questionStartRef.current = Date.now();
          dispatch({ type: "NEXT_QUESTION" });
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [state.answerState, state.sessionComplete]);

  // Record progress to Supabase + unified knowledge system
  useEffect(() => {
    if (state.answerState === "idle") return;
    const currentItem = state.items[state.currentIndex];
    if (!currentItem) return;

    const isCorrect = state.answerState === "correct";
    // Fix #17: Compute response time for this question
    const responseTimeMs = Date.now() - questionStartRef.current;

    // "close" counts as incorrect for scoring but we still track it
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;

      // 1. Record cloze-specific progress (existing behavior)
      Promise.resolve(
        supabase.from("user_cloze_progress").insert({
          user_id: user.id,
          cloze_item_id: currentItem.id,
          answered_correctly: isCorrect,
        }),
      ).catch(() => {});

      // 2. Update unified knowledge system via recordReview
      const syncKnowledge = async () => {
        try {
          const answerWord = currentItem.answer.toLowerCase();
          // Fix #13: Use lemmatize() for proper lemma when creating user_words entries
          const answerLemma = lemmatize(answerWord, langCode);

          // Try to find existing word in user_words
          const { data: existingWords } = await supabase
            .from("user_words")
            .select("id")
            .eq("user_id", user.id)
            .eq("word", answerWord)
            .limit(1);

          let wordId: string | null = existingWords?.[0]?.id ?? null;

          // If not found by word, try by lemma
          if (!wordId) {
            const { data: byLemma } = await supabase
              .from("user_words")
              .select("id")
              .eq("user_id", user.id)
              .eq("lemma", answerLemma)
              .limit(1);
            wordId = byLemma?.[0]?.id ?? null;
          }

          // If the word doesn't exist in user_words yet, create it
          if (!wordId) {
            const { data: inserted } = await supabase
              .from("user_words")
              .insert({
                user_id: user.id,
                word: answerWord,
                lemma: answerLemma,
                language: langCode,
                status: "new",
              })
              .select("id")
              .single();
            wordId = inserted?.id ?? null;
          }

          if (wordId) {
            await recordReview(supabase, user.id, {
              wordId,
              moduleSource: "cloze" as ModuleSource,
              correct: isCorrect,
              responseTimeMs,
            });
          }
        } catch (err) {
          // Non-fatal — cloze progress is already saved
          console.warn("[cloze] Knowledge sync failed:", err);
        }
      };

      syncKnowledge();
    });
  }, [state.answerState]);

  const handleNavigation = useCallback(
    (href: string) => {
      setIsNavigating(true);
      router.push(href);
    },
    [router],
  );

  if (isNavigating) return <LoadingScreen />;

  const currentItem = state.items[state.currentIndex];
  const total = state.items.length;
  const questionNum = state.currentIndex + 1;
  const progressPercent = total > 0 ? (questionNum / total) * 100 : 0;

  // Source label mapping
  const sourceLabels: Record<string, string> = {
    wikipedia: "via Wikipedia",
    gutenberg: "via Gutenberg",
    newsapi: "via News",
    reddit: "via Reddit",
    tatoeba: "via Tatoeba",
  };

  function handleMultipleChoiceSelect(answer: string) {
    dispatch({ type: "SET_USER_ANSWER", answer });
    // Auto-submit for multiple choice
    setTimeout(() => {
      dispatch({ type: "SUBMIT_ANSWER" });
    }, 50);
  }

  return (
    <OceanBackground>
      <DepthSidebar wordCount={wordsEncountered} scrollable={false} />
      <OceanNavigation
        streak={streak}
        avatarUrl={avatarUrl}
        currentPath="/propel/cloze"
        isAdmin={isAdmin}
        targetLanguage={targetLanguage}
        wordsEncountered={wordsEncountered}
        onBeforeNavigate={handleNavigation}
      />

      <div className="relative z-10 min-h-screen pt-24 pb-24 px-4 md:pl-[370px]">
        <div className="max-w-2xl mx-auto">
          {/* Back link */}
          <Link
            href="/propel"
            className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/60 transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Propel
          </Link>

          {/* Level filter pills */}
          <div className="flex items-center gap-2 mb-6 flex-wrap">
            {LEVEL_ORDER.map((level) => (
              <button
                key={level}
                onClick={() => handleLevelChange(level)}
                disabled={
                  loading ||
                  (state.answerState !== "idle" && !state.sessionComplete)
                }
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-full border transition-all duration-200",
                  activeLevel === level
                    ? "bg-teal-500/20 text-teal-400 border-teal-400/30"
                    : "bg-white/5 text-white/40 border-white/10 hover:text-white/60 hover:border-white/20",
                  (loading ||
                    (state.answerState !== "idle" && !state.sessionComplete)) &&
                    "opacity-50 cursor-not-allowed",
                )}
              >
                {level}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/20 border-t-teal-400" />
            </div>
          ) : state.items.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-[#0d2137] p-10 text-center space-y-4">
              <h2
                className="font-display text-2xl font-bold"
                style={{ color: "var(--sand, #e8d5b7)" }}
              >
                No exercises available yet
              </h2>
              <p className="text-white/50 text-sm">
                Cloze exercises for your language and level are being generated.
                Check back soon!
              </p>
              <Link
                href="/propel"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-[#0a1628] font-medium transition-all"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Propel
              </Link>
            </div>
          ) : state.sessionComplete ? (
            <SessionSummary
              score={state.score}
              history={state.sessionHistory}
              maxStreak={state.maxStreak}
              onDiveAgain={loadItems}
            />
          ) : currentItem ? (
            <div className="space-y-6">
              {/* Top bar: progress + score + input mode */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-white/50">
                      Question {questionNum} of {total}
                    </span>
                    <div className="flex items-center gap-1.5 text-sm">
                      <span className="text-teal-400 flex items-center gap-0.5">
                        {state.score.correct} <Check className="h-3.5 w-3.5" />
                      </span>
                      <span className="text-white/20">/</span>
                      <span className="text-rose-400 flex items-center gap-0.5">
                        {state.score.incorrect} <X className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                  <InputModeToggle
                    mode={state.inputMode}
                    onChange={(mode: InputMode) =>
                      dispatch({ type: "SET_INPUT_MODE", mode })
                    }
                  />
                </div>

                {/* Progress bar */}
                <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-teal-500 to-teal-400 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Main exercise card */}
              <div className="rounded-2xl border border-white/10 bg-[#0d2137] p-6 md:p-10 space-y-2">
                {/* Level + source badges */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-teal-500/10 text-teal-400 border border-teal-400/20">
                    {currentItem.level}
                  </span>
                  <span className="text-xs text-white/30">
                    {sourceLabels[currentItem.source] || currentItem.source}
                  </span>
                </div>

                {/* Exercise input */}
                {state.inputMode === "type" && (
                  <TypeInput
                    item={currentItem}
                    userAnswer={state.userAnswer}
                    answerState={state.answerState}
                    onAnswerChange={(answer) =>
                      dispatch({ type: "SET_USER_ANSWER", answer })
                    }
                    onSubmit={() => dispatch({ type: "SUBMIT_ANSWER" })}
                  />
                )}

                {state.inputMode === "choice" && (
                  <MultipleChoice
                    item={currentItem}
                    userAnswer={state.userAnswer}
                    answerState={state.answerState}
                    onSelect={handleMultipleChoiceSelect}
                  />
                )}

                {state.inputMode === "wordbank" && (
                  <WordBank
                    item={currentItem}
                    userAnswer={state.userAnswer}
                    answerState={state.answerState}
                    onSelect={(answer) =>
                      dispatch({ type: "SET_USER_ANSWER", answer })
                    }
                    onSubmit={() => dispatch({ type: "SUBMIT_ANSWER" })}
                  />
                )}

                {/* Feedback panel */}
                <FeedbackPanel
                  item={currentItem}
                  answerState={state.answerState}
                  userAnswer={state.userAnswer}
                  onNext={() => {
                    questionStartRef.current = Date.now();
                    dispatch({ type: "NEXT_QUESTION" });
                  }}
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </OceanBackground>
  );
}

export default function ClozePage() {
  const router = useRouter();
  const supabase = createClient();
  const [streak, setStreak] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>();
  const [targetLanguage, setTargetLanguage] = useState("fr");
  const [isAdmin, setIsAdmin] = useState(false);
  const [wordsEncountered, setWordsEncountered] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/auth/login");
        return;
      }
      setUserId(user.id);
      setAvatarUrl(
        user.user_metadata?.avatar_url || user.user_metadata?.picture,
      );

      const { data: profile } = await supabase
        .from("profiles")
        .select("streak, target_language, subscription_tier")
        .eq("id", user.id)
        .single();

      if (profile) {
        setStreak(profile.streak ?? 0);
        setTargetLanguage(profile.target_language ?? "fr");
      }

      const { data: allWords } = await supabase
        .from("learner_words_v2")
        .select("id")
        .eq("user_id", user.id)
        .eq("language", profile?.target_language ?? "fr");
      setWordsEncountered(allWords?.length ?? 0);

      const { data: adminRow } = await supabase
        .from("admin_users")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();
      setIsAdmin(!!adminRow);

      setLoading(false);
    };
    load();
  }, [supabase, router]);

  if (loading || !userId) return <LoadingScreen />;

  return (
    <ProtectedRoute>
      <ClozeContent
        streak={streak}
        avatarUrl={avatarUrl}
        targetLanguage={targetLanguage}
        isAdmin={isAdmin}
        wordsEncountered={wordsEncountered}
        userId={userId}
      />
    </ProtectedRoute>
  );
}
