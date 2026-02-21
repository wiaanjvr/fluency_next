"use client";

import { useState, useEffect, useReducer, useCallback } from "react";
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
import Link from "next/link";
import "@/styles/ocean-theme.css";

const ITEMS_PER_SESSION = 10;
const SEEN_IDS_KEY = "fluensea_cloze_seen_ids";

function getSeenIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(SEEN_IDS_KEY) || "[]");
  } catch {
    return [];
  }
}

function addSeenIds(ids: string[]) {
  if (typeof window === "undefined") return;
  const existing = getSeenIds();
  const updated = [...new Set([...existing, ...ids])];
  // Keep only last 500 to avoid bloat
  const trimmed = updated.slice(-500);
  localStorage.setItem(SEEN_IDS_KEY, JSON.stringify(trimmed));
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
): Promise<ClozeItem[]> {
  const seenIds = getSeenIds();

  // Build query
  let query = supabase
    .from("cloze_items")
    .select("*")
    .eq("language", userLanguage)
    .eq("level", userLevel)
    .order("used_count", { ascending: true })
    .limit(ITEMS_PER_SESSION);

  // Exclude already seen items
  if (seenIds.length > 0) {
    query = query.not("id", "in", `(${seenIds.join(",")})`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[cloze] Fetch error:", error);
    return [];
  }

  // If not enough items, broaden to adjacent levels
  if (!data || data.length < ITEMS_PER_SESSION) {
    const adjacentLevels = getAdjacentLevels(userLevel);
    const existingIds = new Set((data || []).map((d: ClozeItem) => d.id));

    let broadQuery = supabase
      .from("cloze_items")
      .select("*")
      .eq("language", userLanguage)
      .in("level", adjacentLevels)
      .order("used_count", { ascending: true })
      .limit(ITEMS_PER_SESSION);

    if (seenIds.length > 0) {
      broadQuery = broadQuery.not("id", "in", `(${seenIds.join(",")})`);
    }

    const { data: broadData } = await broadQuery;
    if (broadData) {
      const additional = broadData.filter(
        (d: ClozeItem) => !existingIds.has(d.id),
      );
      return [...(data || []), ...additional].slice(0, ITEMS_PER_SESSION);
    }
  }

  return (data || []) as ClozeItem[];
}

function ClozeContent({
  streak,
  avatarUrl,
  targetLanguage,
  isAdmin,
  wordsEncountered,
}: {
  streak: number;
  avatarUrl?: string;
  targetLanguage: string;
  isAdmin: boolean;
  wordsEncountered: number;
}) {
  const router = useRouter();
  const supabase = createClient();
  const { ambientView, setAmbientView } = useAmbientPlayer();
  const [state, dispatch] = useReducer(clozeReducer, initialState);
  const [loading, setLoading] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);

  // Map target language to 2-char code
  const langCode =
    targetLanguage === "french"
      ? "fr"
      : targetLanguage === "german"
        ? "de"
        : targetLanguage === "italian"
          ? "it"
          : "fr";

  // Default user level — in a real app this would come from profile
  const userLevel: ClozeLevel = "B1";

  const loadItems = useCallback(async () => {
    setLoading(true);
    const items = await fetchClozeItems(supabase, langCode, userLevel);
    if (items.length > 0) {
      dispatch({ type: "SET_ITEMS", items });
      addSeenIds(items.map((i) => i.id));

      // Increment used_count in background
      const ids = items.map((i) => i.id);
      Promise.resolve(
        supabase.rpc("increment_cloze_used_count", { item_ids: ids }),
      ).catch(() => {});
    }
    setLoading(false);
  }, [supabase, langCode, userLevel]);

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
          dispatch({ type: "NEXT_QUESTION" });
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [state.answerState, state.sessionComplete]);

  // Record progress to Supabase
  useEffect(() => {
    if (state.answerState === "idle") return;
    const currentItem = state.items[state.currentIndex];
    if (!currentItem) return;

    const isCorrect = state.answerState === "correct";
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      Promise.resolve(
        supabase.from("user_cloze_progress").insert({
          user_id: user.id,
          cloze_item_id: currentItem.id,
          answered_correctly: isCorrect,
        }),
      ).catch(() => {});
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
            className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/60 transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Propel
          </Link>

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
                  onNext={() => dispatch({ type: "NEXT_QUESTION" })}
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
        .eq("user_id", user.id);
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

  if (loading) return <LoadingScreen />;

  return (
    <ProtectedRoute>
      <ClozeContent
        streak={streak}
        avatarUrl={avatarUrl}
        targetLanguage={targetLanguage}
        isAdmin={isAdmin}
        wordsEncountered={wordsEncountered}
      />
    </ProtectedRoute>
  );
}
