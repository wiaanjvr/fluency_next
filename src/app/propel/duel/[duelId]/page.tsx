"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import {
  OceanBackground,
  OceanNavigation,
  DepthSidebar,
} from "@/components/ocean";
import LoadingScreen from "@/components/ui/LoadingScreen";
import { CategoryWheel, DuelHeader } from "@/components/duel";
import {
  ArrowLeft,
  Play,
  Clock,
  ChevronDown,
  ChevronUp,
  User as UserIcon,
} from "lucide-react";
import type { DuelWithProfiles, DuelRound, DuelCategory } from "@/types/duel";
import { CATEGORY_COLORS, CATEGORY_LABELS, LANGUAGE_FLAGS } from "@/types/duel";
import "@/styles/ocean-theme.css";

// ============================================================================
// Duel View Content
// ============================================================================
function DuelViewContent({
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
  const { duelId } = useParams<{ duelId: string }>();
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const [duel, setDuel] = useState<DuelWithProfiles | null>(null);
  const [rounds, setRounds] = useState<DuelRound[]>([]);
  const [isChallenger, setIsChallenger] = useState(true);
  const [loading, setLoading] = useState(true);
  const [expandedRound, setExpandedRound] = useState<number | null>(null);

  const handleNavigation = useCallback(
    (href: string) => {
      router.push(href);
    },
    [router],
  );

  // ─── Fetch duel data ───────────────────────────────────────────────

  const fetchDuel = useCallback(async () => {
    try {
      const res = await fetch(`/api/duels/${duelId}`);
      if (!res.ok) {
        router.push("/propel/duel");
        return;
      }
      const data = await res.json();
      setDuel(data.duel);
      setRounds(data.rounds || []);
      setIsChallenger(data.isChallenger);
    } catch {
      router.push("/propel/duel");
    } finally {
      setLoading(false);
    }
  }, [duelId, router]);

  useEffect(() => {
    fetchDuel();
  }, [fetchDuel]);

  // ─── Realtime updates ──────────────────────────────────────────────

  useEffect(() => {
    if (!duelId) return;

    const channel = supabase
      .channel(`duel-${duelId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "duels",
          filter: `id=eq.${duelId}`,
        },
        () => {
          fetchDuel();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [duelId, fetchDuel]);

  if (loading || !duel) {
    return <LoadingScreen />;
  }

  const opponent = isChallenger
    ? duel.opponent_profile
    : duel.challenger_profile;
  const myScore = isChallenger ? duel.challenger_score : duel.opponent_score;
  const theirScore = isChallenger ? duel.opponent_score : duel.challenger_score;
  const isMyTurn = duel.current_turn === userId;
  const opponentName =
    opponent?.display_name || opponent?.id?.slice(0, 8) || "Opponent";

  // Find current round
  const currentRound = rounds.find(
    (r) => r.round_number === duel.current_round,
  );

  // Get my results for the current round's wheel
  const getWheelResults = (
    round: DuelRound,
    forChallenger: boolean,
  ): (boolean | null)[] => {
    const answers = forChallenger
      ? round.challenger_answers
      : round.opponent_answers;

    if (!answers) return round.questions.map(() => null);

    return round.questions.map((q, i) => {
      const userAnswer = answers[i];
      if (userAnswer === undefined) return null;
      return (
        userAnswer.trim().toLowerCase() ===
        q.correct_answer.trim().toLowerCase()
      );
    });
  };

  // Build round results for the DuelHeader progress indicator
  const roundResults = rounds.map((r) => {
    const myRScore = isChallenger ? r.challenger_score : r.opponent_score;
    const theirRScore = isChallenger ? r.opponent_score : r.challenger_score;
    const bothDone = !!r.challenger_completed_at && !!r.opponent_completed_at;
    if (!bothDone) return "unplayed" as const;
    if ((myRScore ?? 0) > (theirRScore ?? 0)) return "you" as const;
    if ((myRScore ?? 0) < (theirRScore ?? 0)) return "them" as const;
    return "unplayed" as const;
  });

  return (
    <OceanBackground>
      <DepthSidebar wordCount={wordsEncountered} scrollable={false} />

      <OceanNavigation
        streak={streak}
        avatarUrl={avatarUrl}
        currentPath={`/propel/duel/${duelId}`}
        isAdmin={isAdmin}
        targetLanguage={targetLanguage}
        wordsEncountered={wordsEncountered}
        onBeforeNavigate={handleNavigation}
      />

      <div className="relative z-10 min-h-screen flex flex-col pt-20 pb-12 px-6 md:pl-[370px]">
        <div className="max-w-2xl mx-auto w-full space-y-6">
          {/* Back link */}
          <Link
            href="/propel/duel"
            className="inline-flex items-center gap-2 font-body text-xs transition-opacity duration-200 hover:opacity-70"
            style={{ color: "#718096" }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Duels
          </Link>

          {/* VS Header */}
          <DuelHeader
            myName="You"
            myAvatar={avatarUrl}
            opponentName={opponentName}
            opponentAvatar={opponent?.avatar_url}
            myScore={myScore}
            opponentScore={theirScore}
            currentRound={duel.current_round}
            maxRounds={duel.max_rounds}
            roundWinners={roundResults}
            language={duel.language_code}
            difficulty={duel.difficulty}
            flag={LANGUAGE_FLAGS[duel.language_code] || "🌍"}
          />

          {/* Category wheels for current round */}
          {currentRound && duel.status === "active" && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex justify-center gap-8"
            >
              <CategoryWheel
                categories={currentRound.questions.map(
                  (q) => q.category as DuelCategory,
                )}
                results={getWheelResults(currentRound, isChallenger)}
                size={130}
                label="You"
              />
              <CategoryWheel
                categories={currentRound.questions.map(
                  (q) => q.category as DuelCategory,
                )}
                results={getWheelResults(currentRound, !isChallenger)}
                size={130}
                label={opponentName}
              />
            </motion.div>
          )}

          {/* Action area */}
          {duel.status === "active" && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              {isMyTurn && currentRound ? (
                <Link
                  href={`/propel/duel/${duelId}/play`}
                  className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-body text-base font-semibold transition-all duration-300 hover:shadow-[0_0_30px_rgba(61,214,181,0.2)]"
                  style={{
                    background: "#3dd6b5",
                    color: "#0a0f1e",
                  }}
                >
                  <Play className="w-5 h-5" />
                  Dive In →
                </Link>
              ) : (
                <div
                  className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl"
                  style={{
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                  }}
                >
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Clock className="w-5 h-5" style={{ color: "#718096" }} />
                  </motion.div>
                  <span
                    className="font-body text-sm"
                    style={{ color: "#718096" }}
                  >
                    Waiting for {opponentName}…
                  </span>
                </div>
              )}
            </motion.div>
          )}

          {/* Round history accordion */}
          {rounds.length > 0 && (
            <div className="space-y-2">
              <h3
                className="font-body text-[11px] font-semibold uppercase tracking-widest mb-3 flex items-center gap-2"
                style={{ color: "#718096" }}
              >
                Round History
              </h3>

              <AnimatePresence>
                {rounds.map((round, roundIdx) => {
                  const myRoundScore = isChallenger
                    ? round.challenger_score
                    : round.opponent_score;
                  const theirRoundScore = isChallenger
                    ? round.opponent_score
                    : round.challenger_score;
                  const bothComplete =
                    !!round.challenger_completed_at &&
                    !!round.opponent_completed_at;
                  const isExpanded = expandedRound === round.round_number;

                  return (
                    <motion.div
                      key={round.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: roundIdx * 0.05 }}
                    >
                      <button
                        onClick={() =>
                          setExpandedRound(
                            isExpanded ? null : round.round_number,
                          )
                        }
                        className="w-full flex items-center justify-between px-5 py-3 rounded-2xl transition-all duration-200 cursor-pointer"
                        style={{
                          background: isExpanded
                            ? "rgba(255, 255, 255, 0.03)"
                            : "rgba(255, 255, 255, 0.01)",
                          border: `1px solid ${isExpanded ? "rgba(255, 255, 255, 0.08)" : "rgba(255, 255, 255, 0.04)"}`,
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className="font-body text-sm font-medium"
                            style={{ color: "#e8d5b0" }}
                          >
                            Round {round.round_number}
                          </span>
                          {bothComplete && (
                            <span
                              className="font-mono text-xs"
                              style={{ color: "#3dd6b5" }}
                            >
                              {myRoundScore ?? 0} – {theirRoundScore ?? 0}
                            </span>
                          )}
                          {!bothComplete && (
                            <span
                              className="font-body text-[10px]"
                              style={{ color: "#718096" }}
                            >
                              In progress
                            </span>
                          )}
                        </div>
                        {isExpanded ? (
                          <ChevronUp
                            className="w-4 h-4"
                            style={{ color: "#718096" }}
                          />
                        ) : (
                          <ChevronDown
                            className="w-4 h-4"
                            style={{ color: "#718096" }}
                          />
                        )}
                      </button>

                      {/* Expanded round detail */}
                      <AnimatePresence>
                        {isExpanded && bothComplete && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.25 }}
                            className="overflow-hidden"
                          >
                            <div
                              className="mt-1 rounded-2xl p-4 space-y-4"
                              style={{
                                background: "rgba(13, 27, 42, 0.4)",
                                border: "1px solid rgba(255, 255, 255, 0.04)",
                              }}
                            >
                              <div className="flex justify-center gap-6">
                                <CategoryWheel
                                  categories={round.questions.map(
                                    (q) => q.category as DuelCategory,
                                  )}
                                  results={getWheelResults(round, isChallenger)}
                                  size={100}
                                  label="You"
                                  mini
                                />
                                <CategoryWheel
                                  categories={round.questions.map(
                                    (q) => q.category as DuelCategory,
                                  )}
                                  results={getWheelResults(
                                    round,
                                    !isChallenger,
                                  )}
                                  size={100}
                                  label={opponentName}
                                  mini
                                />
                              </div>
                              <div className="space-y-1.5">
                                {round.questions.map((q, i) => {
                                  const myAnswer = isChallenger
                                    ? round.challenger_answers?.[i]
                                    : round.opponent_answers?.[i];
                                  const correct =
                                    myAnswer?.trim().toLowerCase() ===
                                    q.correct_answer.trim().toLowerCase();

                                  return (
                                    <motion.div
                                      key={i}
                                      initial={{ opacity: 0, x: -8 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: i * 0.04 }}
                                      className="flex items-start gap-3 px-3 py-2 rounded-xl"
                                      style={{
                                        background: correct
                                          ? "rgba(16, 185, 129, 0.04)"
                                          : "rgba(248, 113, 113, 0.04)",
                                      }}
                                    >
                                      <span
                                        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5"
                                        style={{
                                          background: correct
                                            ? "rgba(16, 185, 129, 0.15)"
                                            : "rgba(248, 113, 113, 0.15)",
                                          color: correct
                                            ? "#10B981"
                                            : "#f87171",
                                        }}
                                      >
                                        {correct ? "✓" : "✗"}
                                      </span>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                          <span
                                            className="font-body text-[9px] px-1.5 py-0.5 rounded-full"
                                            style={{
                                              color:
                                                CATEGORY_COLORS[
                                                  q.category as DuelCategory
                                                ],
                                              background: `${CATEGORY_COLORS[q.category as DuelCategory]}10`,
                                            }}
                                          >
                                            {
                                              CATEGORY_LABELS[
                                                q.category as DuelCategory
                                              ]
                                            }
                                          </span>
                                        </div>
                                        <p
                                          className="font-body text-xs"
                                          style={{ color: "#e8d5b0" }}
                                        >
                                          {q.prompt}
                                        </p>
                                        {!correct && (
                                          <p
                                            className="font-body text-[11px] mt-0.5"
                                            style={{ color: "#718096" }}
                                          >
                                            Answer: {q.correct_answer}
                                          </p>
                                        )}
                                      </div>
                                    </motion.div>
                                  );
                                })}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </OceanBackground>
  );
}

// ============================================================================
// Page
// ============================================================================
export default function DuelViewPage() {
  const router = useRouter();
  const supabase = createClient();

  const [streak, setStreak] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>();
  const [targetLanguage, setTargetLanguage] = useState("fr");
  const [isAdmin, setIsAdmin] = useState(false);
  const [wordsEncountered, setWordsEncountered] = useState(0);
  const [userId, setUserId] = useState("");
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
      <DuelViewContent
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
