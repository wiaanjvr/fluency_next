"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import {
  OceanBackground,
  OceanNavigation,
  DepthSidebar,
} from "@/components/ocean";
import LoadingScreen from "@/components/ui/LoadingScreen";
import {
  DuelCard,
  BioluminescenceBackground,
  StatsBar,
  SkeletonCard,
} from "@/components/duel";
import {
  Swords,
  Plus,
  Anchor,
  ArrowLeft,
  Trophy,
  Check,
  X,
  Settings,
  Zap,
  Clock,
} from "lucide-react";
import type { DuelWithProfiles, DuelStats } from "@/types/duel";
import "@/styles/ocean-theme.css";

// ─── Section divider ─────────────────────────────────────────────────
function SectionDivider({
  icon,
  label,
  count,
  color = "#718096",
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-3 pt-2 pb-1">
      <span style={{ color }} className="flex items-center gap-2">
        {icon}
        <span className="font-body text-[11px] font-semibold uppercase tracking-widest">
          {label}
        </span>
      </span>
      <span
        className="font-body text-[10px] px-1.5 py-0.5 rounded-full"
        style={{ background: `${color}12`, color }}
      >
        {count}
      </span>
      <div className="flex-1 h-px" style={{ background: `${color}15` }} />
    </div>
  );
}

// ============================================================================
// Duel Lobby Content
// ============================================================================
function DuelLobbyContent({
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
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const [duels, setDuels] = useState<DuelWithProfiles[]>([]);
  const [loadingDuels, setLoadingDuels] = useState(true);
  const [stats, setStats] = useState<DuelStats | null>(null);

  const handleNavigation = useCallback(
    (href: string) => {
      router.push(href);
    },
    [router],
  );

  // ─── Fetch duels ────────────────────────────────────────────────────

  const fetchDuels = useCallback(async () => {
    try {
      const res = await fetch("/api/duels");
      if (!res.ok) throw new Error("Failed to fetch duels");
      const data = await res.json();
      setDuels(data.duels || []);
    } catch (err) {
      console.error("Failed to load duels:", err);
    } finally {
      setLoadingDuels(false);
    }
  }, []);

  useEffect(() => {
    fetchDuels();
  }, [fetchDuels]);

  // ─── Fetch stats ───────────────────────────────────────────────────

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await supabase
          .from("duel_stats")
          .select("*")
          .eq("user_id", userId)
          .single();
        if (data) setStats(data as DuelStats);
      } catch {
        // Stats may not exist yet
      }
    };
    fetchStats();
  }, [userId]);

  // ─── Accept / Decline handlers ─────────────────────────────────────

  const handleAccept = async (duelId: string) => {
    try {
      const res = await fetch(`/api/duels/${duelId}/accept`, {
        method: "POST",
      });
      if (res.ok) {
        await fetchDuels();
      }
    } catch (err) {
      console.error("Failed to accept duel:", err);
    }
  };

  const handleDecline = async (duelId: string) => {
    try {
      const res = await fetch(`/api/duels/${duelId}/decline`, {
        method: "POST",
      });
      if (res.ok) {
        await fetchDuels();
      }
    } catch (err) {
      console.error("Failed to decline duel:", err);
    }
  };

  // ─── Realtime subscription ─────────────────────────────────────────

  useEffect(() => {
    const channel = supabase
      .channel("duel-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "duels",
          filter: `challenger_id=eq.${userId}`,
        },
        () => {
          fetchDuels();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "duels",
          filter: `opponent_id=eq.${userId}`,
        },
        () => {
          fetchDuels();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchDuels]);

  // ─── Categorize duels ──────────────────────────────────────────────

  const pendingInvites = duels.filter(
    (d) => d.status === "pending" && d.opponent_id === userId,
  );
  const myTurnDuels = duels.filter(
    (d) => d.status === "active" && d.current_turn === userId,
  );
  const waitingDuels = duels.filter(
    (d) => d.status === "active" && d.current_turn !== userId,
  );
  const sentChallenges = duels.filter(
    (d) => d.status === "pending" && d.challenger_id === userId,
  );
  const completedDuels = duels.filter(
    (d) => d.status === "completed" || d.status === "declined",
  );

  const activeDuels = [...myTurnDuels, ...waitingDuels, ...sentChallenges];
  const wins = stats?.duels_won ?? 0;
  const totalGames = stats?.duels_played ?? 0;
  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

  return (
    <OceanBackground>
      <DepthSidebar wordCount={wordsEncountered} scrollable={false} />

      <OceanNavigation
        streak={streak}
        avatarUrl={avatarUrl}
        currentPath="/propel/duel"
        isAdmin={isAdmin}
        targetLanguage={targetLanguage}
        wordsEncountered={wordsEncountered}
        onBeforeNavigate={handleNavigation}
      />

      {/* Bioluminescence particles */}
      <BioluminescenceBackground />

      <div className="relative z-10 min-h-screen flex flex-col pt-20 pb-12 px-6 md:pl-[370px]">
        <div className="max-w-2xl mx-auto w-full">
          {/* Back link */}
          <Link
            href="/propel"
            className="inline-flex items-center gap-2 mb-6 font-body text-xs transition-colors duration-200 hover:opacity-70"
            style={{ color: "#718096" }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Propel
          </Link>

          {/* Hero header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8 space-y-4"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <h1
                  className="font-display text-4xl md:text-5xl font-bold tracking-tight"
                  style={{ color: "#e8d5b0" }}
                >
                  The Deep Challenge
                </h1>
                <p className="font-body text-sm" style={{ color: "#718096" }}>
                  Challenge the deep. Prove your depth.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/propel/duel/settings"
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 hover:bg-white/[0.04]"
                  style={{ color: "#718096" }}
                >
                  <Settings className="w-4 h-4" />
                </Link>
                <Link
                  href="/propel/duel/new"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-body text-sm font-semibold transition-all duration-300 hover:shadow-[0_0_25px_rgba(61,214,181,0.2)]"
                  style={{
                    background: "#3dd6b5",
                    color: "#0a0f1e",
                  }}
                >
                  <Plus className="w-4 h-4" />
                  New Duel
                </Link>
              </div>
            </div>

            {/* Stats bar */}
            <StatsBar
              winRate={winRate}
              activeDuels={activeDuels.length}
              winStreak={stats?.current_streak ?? 0}
            />
          </motion.div>

          {/* Content */}
          {loadingDuels ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : duels.length === 0 ? (
            /* Empty state */
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-20 space-y-5"
            >
              <div
                className="w-24 h-24 rounded-3xl mx-auto flex items-center justify-center"
                style={{
                  background: "rgba(61, 214, 181, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.05)",
                }}
              >
                <Anchor
                  className="w-10 h-10"
                  style={{ color: "#3dd6b5", opacity: 0.4 }}
                />
              </div>
              <div>
                <p
                  className="font-display text-xl font-bold"
                  style={{ color: "#e8d5b0" }}
                >
                  The deep is quiet.
                </p>
                <p
                  className="font-body text-sm mt-1"
                  style={{ color: "#718096" }}
                >
                  Challenge someone and make waves.
                </p>
              </div>
              <Link
                href="/propel/duel/new"
                className="inline-flex items-center gap-2 mt-4 px-6 py-3 rounded-2xl font-body text-sm font-medium transition-all duration-300"
                style={{
                  background: "rgba(61, 214, 181, 0.08)",
                  border: "1px solid rgba(61, 214, 181, 0.15)",
                  color: "#3dd6b5",
                }}
              >
                <Swords className="w-4 h-4" />
                Send a Wave
              </Link>
            </motion.div>
          ) : (
            <div className="space-y-6">
              {/* Pending invites */}
              {pendingInvites.length > 0 && (
                <section className="space-y-3">
                  <SectionDivider
                    icon={<Swords className="w-3.5 h-3.5" />}
                    label="Incoming Challenges"
                    count={pendingInvites.length}
                    color="#3dd6b5"
                  />
                  <AnimatePresence>
                    {pendingInvites.map((duel, i) => (
                      <motion.div
                        key={duel.id}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        transition={{ delay: i * 0.05 }}
                        className="rounded-2xl overflow-hidden"
                        style={{
                          background: "rgba(13, 27, 42, 0.5)",
                          border: "1px solid rgba(61, 214, 181, 0.12)",
                        }}
                      >
                        <DuelCard
                          duel={duel}
                          currentUserId={userId}
                          index={i}
                        />
                        <div className="flex gap-2 px-5 pb-4">
                          <button
                            onClick={() => handleAccept(duel.id)}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-body text-sm font-semibold cursor-pointer transition-all duration-300 hover:shadow-[0_0_20px_rgba(61,214,181,0.2)]"
                            style={{
                              background: "#3dd6b5",
                              color: "#0a0f1e",
                            }}
                          >
                            <Check className="w-4 h-4" />
                            Accept
                          </button>
                          <button
                            onClick={() => handleDecline(duel.id)}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-body text-sm font-medium cursor-pointer transition-all duration-300"
                            style={{
                              background: "rgba(255, 255, 255, 0.02)",
                              border: "1px solid rgba(255, 255, 255, 0.08)",
                              color: "#a8d5c2",
                            }}
                          >
                            <X className="w-4 h-4" />
                            Decline
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </section>
              )}

              {/* Your move */}
              {myTurnDuels.length > 0 && (
                <section className="space-y-3">
                  <SectionDivider
                    icon={<Zap className="w-3.5 h-3.5" />}
                    label="Your Move"
                    count={myTurnDuels.length}
                    color="#F59E0B"
                  />
                  <div className="space-y-2">
                    {myTurnDuels.map((duel, i) => (
                      <DuelCard
                        key={duel.id}
                        duel={duel}
                        currentUserId={userId}
                        index={i}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Awaiting */}
              {(waitingDuels.length > 0 || sentChallenges.length > 0) && (
                <section className="space-y-3">
                  <SectionDivider
                    icon={<Clock className="w-3.5 h-3.5" />}
                    label="Awaiting"
                    count={waitingDuels.length + sentChallenges.length}
                    color="#718096"
                  />
                  <div className="space-y-2">
                    {[...waitingDuels, ...sentChallenges].map((duel, i) => (
                      <DuelCard
                        key={duel.id}
                        duel={duel}
                        currentUserId={userId}
                        index={i}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Completed */}
              {completedDuels.length > 0 && (
                <section className="space-y-3">
                  <SectionDivider
                    icon={<Trophy className="w-3.5 h-3.5" />}
                    label="Concluded"
                    count={completedDuels.length}
                    color="#718096"
                  />
                  <div className="space-y-2">
                    {completedDuels.slice(0, 10).map((duel, i) => (
                      <DuelCard
                        key={duel.id}
                        duel={duel}
                        currentUserId={userId}
                        index={i}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </OceanBackground>
  );
}

// ============================================================================
// Page — fetches user data, guards auth
// ============================================================================
export default function DuelLobbyPage() {
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

  if (loading) return <LoadingScreen />;

  return (
    <ProtectedRoute>
      <DuelLobbyContent
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
