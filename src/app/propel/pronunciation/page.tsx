"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import {
  OceanBackground,
  OceanNavigation,
  DepthSidebar,
} from "@/components/ocean";
import LoadingScreen from "@/components/ui/LoadingScreen";
import { useAmbientPlayer } from "@/contexts/AmbientPlayerContext";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { recordReviewBatch } from "@/lib/knowledge-graph/record-review";
import type { ReviewEvent, ModuleSource } from "@/types/knowledge-graph";
import "@/styles/ocean-theme.css";

import SelectionScreen from "@/components/pronunciation/SelectionScreen";
import SoundInventory from "@/components/pronunciation/SoundInventory";
import MinimalPairsGame from "@/components/pronunciation/MinimalPairsGame";
import ShadowingStudio from "@/components/pronunciation/ShadowingStudio";
import PronunciationProgress from "@/components/pronunciation/PronunciationProgress";
import {
  SUPPORTED_LANGUAGES,
  type PronunciationModule,
} from "@/types/pronunciation";

// ============================================================================
// Session Summary overlay
// ============================================================================
function SessionSummary({
  module,
  itemsPracticed,
  accuracy,
  durationSeconds,
  language,
  onDone,
}: {
  module: PronunciationModule;
  itemsPracticed: number;
  accuracy: number | null;
  durationSeconds: number;
  language: string;
  onDone: () => void;
}) {
  const moduleNames: Record<PronunciationModule, string> = {
    sound_inventory: "Sound Inventory",
    minimal_pairs: "Minimal Pairs",
    shadowing: "Shadowing Studio",
  };

  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;

  return (
    <div className="max-w-md mx-auto text-center space-y-6 py-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2
        className="font-display text-3xl font-bold"
        style={{ color: "var(--sand)" }}
      >
        Session Complete
      </h2>

      <div
        className="rounded-2xl border border-white/10 p-6 space-y-4"
        style={{ background: "rgba(13, 33, 55, 0.6)" }}
      >
        <div className="space-y-3">
          <div className="flex justify-between">
            <span
              className="font-body text-sm"
              style={{ color: "var(--seafoam)", opacity: 0.6 }}
            >
              Module
            </span>
            <span
              className="font-body text-sm font-medium"
              style={{ color: "var(--sand)" }}
            >
              {moduleNames[module]}
            </span>
          </div>

          <div className="flex justify-between">
            <span
              className="font-body text-sm"
              style={{ color: "var(--seafoam)", opacity: 0.6 }}
            >
              Items practiced
            </span>
            <span
              className="font-body text-sm font-medium"
              style={{ color: "var(--sand)" }}
            >
              {itemsPracticed}
            </span>
          </div>

          {accuracy !== null && (
            <div className="flex justify-between">
              <span
                className="font-body text-sm"
                style={{ color: "var(--seafoam)", opacity: 0.6 }}
              >
                Accuracy
              </span>
              <span
                className="font-body text-sm font-medium"
                style={{
                  color:
                    accuracy >= 80
                      ? "var(--turquoise)"
                      : accuracy >= 50
                        ? "var(--seafoam)"
                        : "var(--coral)",
                }}
              >
                {accuracy}%
              </span>
            </div>
          )}

          <div className="flex justify-between">
            <span
              className="font-body text-sm"
              style={{ color: "var(--seafoam)", opacity: 0.6 }}
            >
              Duration
            </span>
            <span
              className="font-body text-sm font-medium"
              style={{ color: "var(--sand)" }}
            >
              {minutes > 0 ? `${minutes}m ` : ""}
              {seconds}s
            </span>
          </div>
        </div>
      </div>

      {/* Progress summary */}
      <PronunciationProgress language={language} />

      <button
        onClick={onDone}
        className="px-6 py-3 rounded-xl text-sm font-body font-medium transition-all hover:shadow-lg"
        style={{
          background: "linear-gradient(135deg, var(--turquoise), var(--teal))",
          color: "var(--midnight)",
        }}
      >
        Back to Pronunciation Studio
      </button>
    </div>
  );
}

// ============================================================================
// Main content
// ============================================================================
function PronunciationContent({
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
  const { ambientView, setAmbientView } = useAmbientPlayer();

  const [activeModule, setActiveModule] = useState<PronunciationModule | null>(
    null,
  );
  const [selectedLanguage, setSelectedLanguage] = useState(targetLanguage);
  const [sessionSummary, setSessionSummary] = useState<{
    module: PronunciationModule;
    itemsPracticed: number;
    accuracy: number | null;
    durationSeconds: number;
  } | null>(null);

  // Switch to soundbar view if ambient is active
  useEffect(() => {
    if (ambientView === "container") {
      setAmbientView("soundbar");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelect = useCallback(
    (language: string, module: PronunciationModule) => {
      setSelectedLanguage(language);
      setActiveModule(module);
      setSessionSummary(null);
    },
    [],
  );

  const handleBack = useCallback(() => {
    setActiveModule(null);
    setSessionSummary(null);
  }, []);

  const handleSessionComplete = useCallback(
    (data: {
      items_practiced: number;
      accuracy?: number;
      duration_seconds: number;
    }) => {
      if (!activeModule) return;

      const summary = {
        module: activeModule,
        itemsPracticed: data.items_practiced,
        accuracy: data.accuracy ?? null,
        durationSeconds: data.duration_seconds,
      };

      // Notify dashboard recommendation engine
      window.dispatchEvent(
        new CustomEvent("fluensea:session-complete", {
          detail: { activityType: "pronunciation" },
        }),
      );

      // Save session to backend (best-effort)
      fetch("/api/pronunciation/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: selectedLanguage,
          module_type: activeModule,
          duration_seconds: data.duration_seconds,
          items_practiced: data.items_practiced,
          accuracy: data.accuracy ?? null,
        }),
      }).catch(() => {});

      // Sync pronunciation results to the unified knowledge graph
      // This updates user_words.pronunciation_score so the recommendation
      // engine stops permanently recommending pronunciation practice
      const syncPronunciationToKG = async () => {
        try {
          const supabase = createClient();
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) return;

          // Fetch user_words that have pronunciation-relevant entries
          // Use a sample of recently-practiced words for the KG update
          const { data: userWords } = await supabase
            .from("user_words")
            .select("id")
            .eq("user_id", user.id)
            .eq("language", selectedLanguage)
            .not("status", "eq", "new")
            .order("last_reviewed", { ascending: true, nullsFirst: true })
            .limit(data.items_practiced);

          if (userWords && userWords.length > 0) {
            const accuracy = data.accuracy ?? 50;
            const isGoodSession = accuracy >= 60;

            const events: ReviewEvent[] = userWords.map((w) => ({
              wordId: w.id,
              moduleSource: "pronunciation" as ModuleSource,
              correct: isGoodSession,
              responseTimeMs: Math.round(
                (data.duration_seconds * 1000) /
                  Math.max(data.items_practiced, 1),
              ),
            }));

            await recordReviewBatch(supabase, user.id, events);
          }
        } catch (err) {
          console.warn("[pronunciation] Knowledge graph sync failed:", err);
        }
      };
      syncPronunciationToKG();

      setActiveModule(null);
      setSessionSummary(summary);
    },
    [activeModule, selectedLanguage],
  );

  const handleSummaryDone = useCallback(() => {
    setSessionSummary(null);
  }, []);

  return (
    <OceanBackground>
      <DepthSidebar wordCount={wordsEncountered} scrollable={false} />

      <OceanNavigation
        streak={streak}
        avatarUrl={avatarUrl}
        currentPath="/propel/pronunciation"
        isAdmin={isAdmin}
        targetLanguage={targetLanguage}
        wordsEncountered={wordsEncountered}
      />

      <div className="relative z-10 min-h-screen pt-28 pb-24 px-6 md:pl-[370px]">
        <div className="max-w-5xl mx-auto">
          {/* Back to Propel */}
          {!activeModule && !sessionSummary && (
            <div className="mb-8">
              <Link
                href="/propel"
                className="flex items-center gap-2 text-sm font-body transition-opacity hover:opacity-100 opacity-50"
                style={{ color: "var(--turquoise)" }}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Propel
              </Link>
            </div>
          )}

          {/* Selection Screen */}
          {!activeModule && !sessionSummary && (
            <SelectionScreen
              defaultLanguage={targetLanguage}
              onSelect={handleSelect}
              languages={SUPPORTED_LANGUAGES}
            />
          )}

          {/* Session Summary */}
          {sessionSummary && (
            <SessionSummary
              module={sessionSummary.module}
              itemsPracticed={sessionSummary.itemsPracticed}
              accuracy={sessionSummary.accuracy}
              durationSeconds={sessionSummary.durationSeconds}
              language={selectedLanguage}
              onDone={handleSummaryDone}
            />
          )}

          {/* Active modules */}
          {activeModule === "sound_inventory" && (
            <SoundInventory
              language={selectedLanguage}
              onBack={handleBack}
              onSessionComplete={handleSessionComplete}
            />
          )}

          {activeModule === "minimal_pairs" && (
            <MinimalPairsGame
              language={selectedLanguage}
              onBack={handleBack}
              onSessionComplete={handleSessionComplete}
            />
          )}

          {activeModule === "shadowing" && (
            <ShadowingStudio
              language={selectedLanguage}
              onBack={handleBack}
              onSessionComplete={handleSessionComplete}
            />
          )}
        </div>
      </div>
    </OceanBackground>
  );
}

// ============================================================================
// Page — fetch user data, guard auth
// ============================================================================
export default function PronunciationPage() {
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

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <ProtectedRoute>
      <PronunciationContent
        streak={streak}
        avatarUrl={avatarUrl}
        targetLanguage={targetLanguage}
        isAdmin={isAdmin}
        wordsEncountered={wordsEncountered}
      />
    </ProtectedRoute>
  );
}
