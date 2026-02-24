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
import "@/styles/ocean-theme.css";

import SessionSetup from "@/components/conversation/SessionSetup";
import ConversationSession from "@/components/conversation/ConversationSession";
import SessionSummary from "@/components/conversation/SessionSummary";
import type { SessionConfig, TranscriptEntry } from "@/hooks/useGeminiLive";

// ============================================================================
// Custom keyframe styles (injected once)
// ============================================================================
const rippleKeyframes = `
@keyframes ripple {
  0% { transform: scale(1); opacity: 1; }
  100% { transform: scale(1.6); opacity: 0; }
}
`;

// ============================================================================
// View states
// ============================================================================
type ViewState = "setup" | "session" | "summary";

interface SessionResult {
  duration: number;
  transcript: TranscriptEntry[];
  exchanges: number;
}

// ============================================================================
// Helper: extract vocabulary from transcript for KG sync
// ============================================================================
function extractVocabularyFromTranscript(
  transcript: TranscriptEntry[],
  language: string,
): string[] {
  // Common stop words to skip (French/German/Italian/Spanish)
  const STOP_WORDS = new Set([
    // French
    "le",
    "la",
    "les",
    "un",
    "une",
    "des",
    "de",
    "du",
    "au",
    "aux",
    "à",
    "et",
    "ou",
    "mais",
    "donc",
    "ni",
    "car",
    "ce",
    "cette",
    "ces",
    "je",
    "tu",
    "il",
    "elle",
    "on",
    "nous",
    "vous",
    "ils",
    "elles",
    "me",
    "te",
    "se",
    "en",
    "y",
    "ne",
    "pas",
    "que",
    "qui",
    "est",
    // German
    "der",
    "die",
    "das",
    "ein",
    "eine",
    "und",
    "oder",
    "aber",
    "ich",
    "du",
    "er",
    "sie",
    "es",
    "wir",
    "ihr",
    "mein",
    "dein",
    "sein",
    "nicht",
    "ist",
    "hat",
    "mit",
    "von",
    "zu",
    "für",
    "auf",
    // Italian
    "il",
    "lo",
    "la",
    "i",
    "gli",
    "le",
    "un",
    "uno",
    "una",
    "e",
    "ma",
    "che",
    "di",
    "da",
    "in",
    "con",
    "su",
    "per",
    "io",
    "tu",
    "lui",
    "lei",
    "noi",
    "voi",
    "loro",
    "non",
    "sono",
    // Spanish
    "el",
    "la",
    "los",
    "las",
    "un",
    "una",
    "y",
    "o",
    "pero",
    "yo",
    "tú",
    "él",
    "ella",
    "nosotros",
    "ellos",
    "no",
    "es",
    "con",
    "por",
  ]);

  const words = new Set<string>();

  for (const entry of transcript) {
    // Extract words from both user and AI text
    const tokens = entry.text
      .toLowerCase()
      .replace(/[.,;:!?'"()«»\-—–]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !STOP_WORDS.has(w) && !/^\d+$/.test(w));

    for (const token of tokens) {
      words.add(token);
    }
  }

  // Return at most 50 words (reasonable limit for KG sync)
  return Array.from(words).slice(0, 50);
}

// ============================================================================
// Content
// ============================================================================
function ConversationContent({
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
  const [view, setView] = useState<ViewState>("setup");
  const [sessionConfig, setSessionConfig] = useState<SessionConfig | null>(
    null,
  );
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(
    null,
  );
  const { ambientView, setAmbientView } = useAmbientPlayer();

  useEffect(() => {
    if (ambientView === "container") {
      setAmbientView("soundbar");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStartSession = useCallback((config: SessionConfig) => {
    setSessionConfig(config);
    setView("session");
  }, []);

  const handleSessionEnd = useCallback(
    (result: SessionResult) => {
      setSessionResult(result);
      setView("summary");

      // Notify dashboard recommendation engine
      window.dispatchEvent(
        new CustomEvent("fluensea:session-complete", {
          detail: { activityType: "conversation" },
        }),
      );

      // --- Goal tracking: AI conversation completed ---
      fetch("/api/goals/log-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: "ai_conversation_completed",
          value: 1,
        }),
      }).catch(() => {});
      // Also track daily activity (server deduplicates)
      fetch("/api/goals/log-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventType: "daily_activity", value: 1 }),
      }).catch(() => {});

      // Persist the conversation session to the backend + knowledge graph
      // Extract unique vocabulary words from the transcript
      const vocabularyUsed = extractVocabularyFromTranscript(
        result.transcript,
        targetLanguage,
      );

      fetch("/api/conversation/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: targetLanguage,
          duration_seconds: result.duration,
          exchanges: result.exchanges,
          transcript: result.transcript.map((t) => ({
            role: t.role,
            text: t.text,
            timestamp: t.timestamp,
          })),
          vocabulary_used: vocabularyUsed,
        }),
      }).catch((err) => {
        console.warn("[conversation] Session persistence failed:", err);
      });
    },
    [targetLanguage],
  );

  const handleRestart = useCallback(() => {
    setSessionConfig(null);
    setSessionResult(null);
    setView("setup");
  }, []);

  const handleBack = useCallback(() => {
    router.push("/propel");
  }, [router]);

  return (
    <OceanBackground>
      {/* Inject ripple keyframes */}
      <style dangerouslySetInnerHTML={{ __html: rippleKeyframes }} />

      <DepthSidebar wordCount={wordsEncountered} scrollable={false} />

      <OceanNavigation
        streak={streak}
        avatarUrl={avatarUrl}
        currentPath="/propel/conversation"
        isAdmin={isAdmin}
        targetLanguage={targetLanguage}
        wordsEncountered={wordsEncountered}
      />

      <div className="relative z-10 min-h-screen pt-20 pb-8 px-4 lg:pl-[370px]">
        {/* Back link — only show in setup & summary */}
        {view !== "session" && (
          <div className="max-w-5xl mx-auto mb-6">
            <Link
              href="/propel"
              className={cn(
                "inline-flex items-center gap-1.5 font-body text-sm",
                "transition-colors duration-200 hover:opacity-100",
              )}
              style={{ color: "var(--seafoam)", opacity: 0.5 }}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Propel
            </Link>
          </div>
        )}

        {/* Views */}
        {view === "setup" && (
          <SessionSetup
            targetLanguage={targetLanguage}
            onStart={handleStartSession}
          />
        )}

        {view === "session" && sessionConfig && (
          <ConversationSession
            config={sessionConfig}
            onSessionEnd={handleSessionEnd}
          />
        )}

        {view === "summary" && sessionResult && (
          <SessionSummary
            duration={sessionResult.duration}
            transcript={sessionResult.transcript}
            exchanges={sessionResult.exchanges}
            onRestart={handleRestart}
            onBack={handleBack}
          />
        )}
      </div>
    </OceanBackground>
  );
}

// ============================================================================
// Page — fetches user data, guards auth
// ============================================================================
export default function ConversationPage() {
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
      <ConversationContent
        streak={streak}
        avatarUrl={avatarUrl}
        targetLanguage={targetLanguage}
        isAdmin={isAdmin}
        wordsEncountered={wordsEncountered}
      />
    </ProtectedRoute>
  );
}
