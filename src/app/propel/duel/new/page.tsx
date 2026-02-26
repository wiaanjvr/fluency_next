"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { OceanBackground, DepthSidebar } from "@/components/ocean";
import {
  AppNav,
  ContextualNav,
  MobileBottomNav,
} from "@/components/navigation";
import LoadingScreen from "@/components/ui/LoadingScreen";
import { UserSearchInput } from "@/components/duel";
import { ArrowLeft, Waves, Loader2 } from "lucide-react";
import type {
  DuelLanguage,
  DuelDifficulty,
  UserSearchResult,
} from "@/types/duel";
import { LANGUAGE_LABELS, LANGUAGE_FLAGS } from "@/types/duel";
import "@/styles/ocean-theme.css";

// ============================================================================
// Challenge Screen Content
// ============================================================================
function NewDuelContent({
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

  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(
    null,
  );
  const [language, setLanguage] = useState<DuelLanguage>(
    (targetLanguage as DuelLanguage) || "fr",
  );
  const [difficulty, setDifficulty] = useState<DuelDifficulty>("A2");
  const [rounds, setRounds] = useState(3);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNavigation = useCallback(
    (href: string) => {
      router.push(href);
    },
    [router],
  );

  // ─── Send challenge ────────────────────────────────────────────────

  const handleSendChallenge = async () => {
    if (!selectedUser || sending) return;
    setError(null);
    setSending(true);

    try {
      // Guest invites (unregistered email) use opponent_email; registered users use opponent_id
      const payload = selectedUser.is_guest
        ? {
            opponent_email: selectedUser.email,
            language_code: language,
            difficulty,
          }
        : { opponent_id: selectedUser.id, language_code: language, difficulty };

      const res = await fetch("/api/duels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create duel");
      }

      const { duel } = await res.json();
      router.push(`/propel/duel/${duel.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSending(false);
    }
  };

  const languages: DuelLanguage[] = ["de", "fr", "it"];
  const difficulties: DuelDifficulty[] = ["A1", "A2", "B1", "B2"];

  // Show settings only after opponent is selected
  const showSettings = !!selectedUser;

  return (
    <OceanBackground>
      <DepthSidebar wordCount={wordsEncountered} scrollable={false} />

      <AppNav
        streak={streak}
        avatarUrl={avatarUrl}
        isAdmin={isAdmin}
        wordsEncountered={wordsEncountered}
        onBeforeNavigate={handleNavigation}
      />
      <ContextualNav />
      <MobileBottomNav wordsEncountered={wordsEncountered} />

      <div className="relative z-10 min-h-screen flex flex-col pt-20 pb-12 px-6 md:pl-[370px]">
        <div className="max-w-xl mx-auto w-full">
          {/* Header */}
          <div className="mb-8 space-y-3">
            <Link
              href="/propel/duel"
              className="inline-flex items-center gap-2 mb-4 font-body text-xs transition-opacity duration-200 hover:opacity-70"
              style={{ color: "#718096" }}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Duels
            </Link>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-display text-3xl md:text-4xl font-bold tracking-tight"
              style={{ color: "#e8d5b0" }}
            >
              New Challenge
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="font-body text-sm"
              style={{ color: "#718096" }}
            >
              Find an opponent and send a wave.
            </motion.p>
          </div>

          {/* Glassmorphic form container */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="rounded-3xl p-6 md:p-8 space-y-6"
            style={{
              background: "rgba(13, 27, 42, 0.6)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255, 255, 255, 0.05)",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
            }}
          >
            {/* Opponent search */}
            <UserSearchInput
              selectedUser={selectedUser}
              onSelect={setSelectedUser}
              onDeselect={() => setSelectedUser(null)}
            />

            {/* Challenge settings — animate in when opponent selected */}
            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                  className="space-y-6 overflow-hidden"
                >
                  {/* Language pills */}
                  <div>
                    <label
                      className="font-body text-[11px] font-semibold uppercase tracking-widest mb-3 block"
                      style={{ color: "#718096" }}
                    >
                      Language
                    </label>
                    <div className="flex gap-2">
                      {languages.map((lang) => (
                        <motion.button
                          key={lang}
                          whileHover={{ y: -1 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => setLanguage(lang)}
                          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-body text-sm font-medium cursor-pointer transition-all duration-200"
                          style={{
                            background:
                              language === lang
                                ? "rgba(61, 214, 181, 0.1)"
                                : "rgba(255, 255, 255, 0.02)",
                            border:
                              language === lang
                                ? "1px solid rgba(61, 214, 181, 0.25)"
                                : "1px solid rgba(255, 255, 255, 0.06)",
                            color: language === lang ? "#3dd6b5" : "#a8d5c2",
                          }}
                        >
                          <span>{LANGUAGE_FLAGS[lang]}</span>
                          <span>{LANGUAGE_LABELS[lang]}</span>
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Difficulty segmented control */}
                  <div>
                    <label
                      className="font-body text-[11px] font-semibold uppercase tracking-widest mb-3 block"
                      style={{ color: "#718096" }}
                    >
                      Difficulty
                    </label>
                    <div
                      className="flex gap-1 p-1 rounded-2xl"
                      style={{ background: "rgba(255, 255, 255, 0.03)" }}
                    >
                      {difficulties.map((d) => (
                        <motion.button
                          key={d}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setDifficulty(d)}
                          className="flex-1 py-2.5 rounded-xl font-mono text-sm font-bold cursor-pointer transition-all duration-200"
                          style={{
                            background:
                              difficulty === d
                                ? "rgba(61, 214, 181, 0.12)"
                                : "transparent",
                            color:
                              difficulty === d
                                ? "#3dd6b5"
                                : "rgba(255, 255, 255, 0.35)",
                            border:
                              difficulty === d
                                ? "1px solid rgba(61, 214, 181, 0.15)"
                                : "1px solid transparent",
                          }}
                        >
                          {d}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Rounds stepper */}
                  <div>
                    <label
                      className="font-body text-[11px] font-semibold uppercase tracking-widest mb-3 block"
                      style={{ color: "#718096" }}
                    >
                      Rounds
                    </label>
                    <div className="flex items-center justify-center gap-6">
                      <button
                        onClick={() => setRounds(Math.max(1, rounds - 1))}
                        className="w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 font-display text-lg font-bold"
                        style={{
                          background: "rgba(255, 255, 255, 0.04)",
                          border: "1px solid rgba(255, 255, 255, 0.08)",
                          color: "#a8d5c2",
                        }}
                      >
                        −
                      </button>
                      <span
                        className="font-display text-3xl font-bold min-w-[3ch] text-center"
                        style={{ color: "#3dd6b5" }}
                      >
                        {rounds}
                      </span>
                      <button
                        onClick={() => setRounds(Math.min(7, rounds + 1))}
                        className="w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 font-display text-lg font-bold"
                        style={{
                          background: "rgba(255, 255, 255, 0.04)",
                          border: "1px solid rgba(255, 255, 255, 0.08)",
                          color: "#a8d5c2",
                        }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error */}
            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-body text-sm text-center"
                style={{ color: "#f87171" }}
              >
                {error}
              </motion.p>
            )}

            {/* Send Challenge CTA */}
            <motion.button
              onClick={handleSendChallenge}
              disabled={!selectedUser || sending}
              whileHover={selectedUser && !sending ? { scale: 1.01 } : {}}
              whileTap={selectedUser && !sending ? { scale: 0.99 } : {}}
              className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-body text-base font-semibold cursor-pointer transition-all duration-300"
              style={{
                background:
                  selectedUser && !sending
                    ? "#3dd6b5"
                    : "rgba(255, 255, 255, 0.04)",
                color:
                  selectedUser && !sending
                    ? "#0a0f1e"
                    : "rgba(255, 255, 255, 0.25)",
                boxShadow:
                  selectedUser && !sending
                    ? "0 0 30px rgba(61, 214, 181, 0.2)"
                    : "none",
              }}
            >
              {sending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <Waves className="w-5 h-5" />
                  Send a Wave 🌊
                </>
              )}
            </motion.button>
          </motion.div>
        </div>
      </div>
    </OceanBackground>
  );
}

// ============================================================================
// Page
// ============================================================================
export default function NewDuelPage() {
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
        .select("streak, target_language")
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

  if (loading) return <LoadingScreen />;

  return (
    <ProtectedRoute>
      <NewDuelContent
        streak={streak}
        avatarUrl={avatarUrl}
        targetLanguage={targetLanguage}
        isAdmin={isAdmin}
        wordsEncountered={wordsEncountered}
      />
    </ProtectedRoute>
  );
}
