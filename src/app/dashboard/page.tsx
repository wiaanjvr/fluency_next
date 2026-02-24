"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { MilestoneCelebration } from "@/components/progression";
import { RewardModal, GameboardRewardModal } from "@/components/rewards";
import type { GameboardStatus, GameboardTier } from "@/types/gameboard";
import LoadingScreen from "@/components/ui/LoadingScreen";
import { UsageLimitBanner } from "@/components/ui/UsageLimitBanner";
import {
  OceanBackground,
  OceanNavigation,
  NextLessonHero,
  DiveTransitionProvider,
  useDiveTransition,
  DepthSidebar,
} from "@/components/ocean";
import { VocabularyViewer } from "@/components/dashboard";
import { SoundContainer } from "@/components/ambient";
import { useAmbientPlayer } from "@/contexts/AmbientPlayerContext";
import { Check, Crown, ArrowRight } from "lucide-react";
import { ProficiencyLevel, WordStatus, ProgressMilestone } from "@/types";
import { checkProficiencyUpdate } from "@/lib/srs/proficiency-calculator";
import { checkMilestoneAchievement } from "@/lib/progression";
import { cn } from "@/lib/utils";
import { getTierConfig, hasAccess, type TierSlug } from "@/lib/tiers";

import "@/styles/ocean-theme.css";

interface VocabularyStats {
  new: number;
  learning: number;
  known: number;
  mastered: number;
  total: number;
}

// ============================================================================
// Depth level logic — internal only, never shown as "modes" to user
// ============================================================================
function getDepthInfo(wordCount: number) {
  if (wordCount >= 500) {
    return { level: 4, name: "The Deep", path: "/lesson-v2" };
  } else if (wordCount >= 200) {
    return { level: 3, name: "Twilight Zone", path: "/lesson-v2" };
  } else if (wordCount >= 50) {
    return { level: 2, name: "Sunlit Zone", path: "/lesson-v2" };
  } else {
    return { level: 1, name: "Shallows", path: "/lesson-v2" };
  }
}

// ============================================================================
// Dashboard Content
// ============================================================================
function DashboardContent({
  stats,
  vocabularyStats,
  subscriptionTier,
  userId,
  targetLanguage,
  showPaymentSuccess,
  setShowPaymentSuccess,
  celebratingMilestone,
  setCelebratingMilestone,
  avatarUrl,
  isProgressView,
  isAdmin,
}: {
  stats: {
    totalSessions: number;
    currentLevel: string;
    streak: number;
    totalTime: number;
    avgComprehension: number;
    wordsEncountered: number;
  };
  vocabularyStats: VocabularyStats;
  subscriptionTier: string;
  userId: string;
  targetLanguage: string;
  showPaymentSuccess: boolean;
  setShowPaymentSuccess: (show: boolean) => void;
  celebratingMilestone: ProgressMilestone | null;
  setCelebratingMilestone: (milestone: ProgressMilestone | null) => void;
  avatarUrl?: string;
  isProgressView?: boolean;
  isAdmin?: boolean;
}) {
  const { triggerDive } = useDiveTransition();
  const { ambientView } = useAmbientPlayer();
  const contentRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const depthInfo = getDepthInfo(stats.wordsEncountered);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!contentRef.current) return;
    const rect = contentRef.current.getBoundingClientRect();
    setMousePosition({
      x: (e.clientX - rect.left - rect.width / 2) / rect.width,
      y: (e.clientY - rect.top - rect.height / 2) / rect.height,
    });
  }, []);

  useEffect(() => {
    const container = contentRef.current;
    if (container) {
      container.addEventListener("mousemove", handleMouseMove);
      return () => container.removeEventListener("mousemove", handleMouseMove);
    }
  }, [handleMouseMove]);

  const handleDiveClick = () => {
    triggerDive(depthInfo.path);
  };

  return (
    <OceanBackground>
      {/* Depth sidebar — always visible on desktop */}
      <DepthSidebar
        wordCount={stats.wordsEncountered}
        totalMinutes={stats.totalTime}
      />

      {/* Navigation — Immerse, Settings */}
      <OceanNavigation
        wordsEncountered={stats.wordsEncountered}
        totalMinutes={stats.totalTime}
        streak={stats.streak}
        avgScore={stats.avgComprehension}
        avatarUrl={avatarUrl}
        currentPath="/dashboard"
        isAdmin={isAdmin}
        isProgressView={isProgressView}
        targetLanguage={targetLanguage}
      />

      {/* Main Content — offset right for depth sidebar */}
      <div
        ref={contentRef}
        className={cn(
          "relative z-10 min-h-screen pt-24 pb-16 px-6",
          isProgressView ? "lg:pl-[570px]" : "lg:pl-[350px]",
        )}
      >
        {/* Payment Success Notification */}
        {showPaymentSuccess && (
          <div className="fixed top-20 right-6 z-50 max-w-md">
            <div className="ocean-card p-4 bg-ocean-turquoise/10">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-ocean-turquoise/20">
                  <Check className="w-5 h-5 text-[var(--turquoise)]" />
                </div>
                <div className="flex-1">
                  <h3 className="font-display font-semibold mb-1 text-[var(--turquoise)]">
                    Welcome aboard!
                  </h3>
                  <p className="text-sm font-body text-[var(--seafoam)]">
                    Your{" "}
                    {getTierConfig(subscriptionTier as TierSlug)?.displayName ||
                      "subscription"}{" "}
                    plan is active. Go deeper.
                  </p>
                </div>
                <button
                  onClick={() => setShowPaymentSuccess(false)}
                  className="transition-opacity hover:opacity-100 opacity-60 text-[var(--sand)]"
                >
                  ×
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Milestone Celebration Modal */}
        {celebratingMilestone && (
          <MilestoneCelebration
            milestone={celebratingMilestone}
            onClose={() => setCelebratingMilestone(null)}
          />
        )}

        <div className="max-w-5xl mx-auto space-y-12">
          {/* Usage Limit Banner */}
          <UsageLimitBanner className="mb-4" />

          {/* Tier Badge */}
          {hasAccess(subscriptionTier as TierSlug, "diver") && (
            <div className="flex justify-center">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full ocean-card bg-[rgba(255,179,0,0.1)]">
                <Crown className="w-4 h-4 text-[#ffb300]" />
                <span className="text-sm font-body font-medium text-[#ffb300]">
                  {getTierConfig(subscriptionTier as TierSlug)?.displayName ||
                    "Pro"}
                </span>
              </div>
            </div>
          )}

          {/* ========== SESSION HERO — Single entry to immersion ========== */}
          <section
            style={{
              transform: `translate(${mousePosition.x * -4}px, ${mousePosition.y * -4}px)`,
              transition: "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            {ambientView === "container" ? (
              <SoundContainer />
            ) : (
              <NextLessonHero
                depthName={depthInfo.name}
                wordsAbsorbed={stats.wordsEncountered}
                sessionPath={depthInfo.path}
                onDiveClick={handleDiveClick}
              />
            )}
          </section>

          {/* ========== VOCABULARY VIEWER ========== */}
          {userId && (
            <section
              className="ocean-card p-6 ocean-card-animate backdrop-blur-lg"
              style={{ animationDelay: "0.5s" }}
            >
              <VocabularyViewer userId={userId} language={targetLanguage} />
            </section>
          )}

          {/* ========== UPGRADE CTA (for Snorkeler users after depth 2) ========== */}
          {stats.wordsEncountered >= 50 &&
            !hasAccess(subscriptionTier as TierSlug, "diver") && (
              <section
                className="ocean-card ocean-card-animate p-8 backdrop-blur-lg bg-gradient-to-br from-[rgba(255,179,0,0.06)] to-[rgba(255,140,0,0.03)]"
                style={{ animationDelay: "0.6s" }}
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="font-display text-xl font-semibold mb-1 text-[var(--sand)]">
                      Go deeper
                    </h3>
                    <p className="text-sm font-body text-[var(--seafoam)]">
                      Unlimited immersion time, longer stories, and advanced
                      shadowing tools.
                    </p>
                  </div>
                  <Link href="/pricing">
                    <button
                      className="ocean-cta px-6 py-3 text-sm font-semibold flex items-center gap-2 transition-all duration-500 hover:shadow-[0_0_30px_rgba(255,179,0,0.3)]"
                      style={{
                        background: "linear-gradient(135deg, #ffb300, #ff8c00)",
                      }}
                    >
                      Start Diving
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </Link>
                </div>
              </section>
            )}
        </div>
      </div>
    </OceanBackground>
  );
}

// ============================================================================
// Dashboard Page — Main Export
// ============================================================================
function DashboardPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isProgressView = searchParams.get("view") === "progress";
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [subscriptionTier, setSubscriptionTier] = useState<string>("snorkeler");
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>();
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  const [stats, setStats] = useState({
    totalSessions: 0,
    currentLevel: "A1",
    streak: 0,
    totalTime: 0,
    avgComprehension: 0,
    wordsEncountered: 0,
  });
  const [targetLanguage, setTargetLanguage] = useState<string>("fr");
  const [vocabularyStats, setVocabularyStats] = useState<VocabularyStats>({
    new: 0,
    learning: 0,
    known: 0,
    mastered: 0,
    total: 0,
  });
  const [celebratingMilestone, setCelebratingMilestone] =
    useState<ProgressMilestone | null>(null);
  const [previousWordCount, setPreviousWordCount] = useState<number>(0);
  const [dbError, setDbError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>("");
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [creditsAwarded, setCreditsAwarded] = useState(0);
  const [rewardId, setRewardId] = useState("");

  // ── Gameboard reward state ──────────────────────────────────────────────
  const [showGameboardModal, setShowGameboardModal] = useState(false);
  const [gameboardStatus, setGameboardStatus] = useState<
    GameboardStatus | "not_eligible" | "no_reward"
  >("no_reward");
  const [gameboardTier, setGameboardTier] = useState<
    GameboardTier | "snorkeler" | string
  >("snorkeler");
  const [gameboardClaimedIndex, setGameboardClaimedIndex] = useState<
    number | null
  >(null);
  const [gameboardClaimedDiscount, setGameboardClaimedDiscount] = useState<
    number | null
  >(null);
  const [gameboardExpiresAt, setGameboardExpiresAt] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const paymentStatus = urlParams.get("payment");
      if (paymentStatus === "success") {
        setShowPaymentSuccess(true);
        const refreshSubscription = async () => {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("subscription_tier")
              .eq("id", user.id)
              .single();
            if (profile?.subscription_tier) {
              setSubscriptionTier(profile.subscription_tier);
            }
          }
        };
        refreshSubscription();
        window.history.replaceState({}, "", "/dashboard");
      }
    }
  }, [supabase]);

  useEffect(() => {
    const fetchUserStats = async () => {
      try {
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

        const justCompletedOnboarding =
          typeof window !== "undefined" &&
          sessionStorage.getItem("onboarding_completed") === "true";

        if (justCompletedOnboarding) {
          sessionStorage.removeItem("onboarding_completed");
          setAuthChecked(true);
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select(
            "streak, total_practice_minutes, sessions_completed, proficiency_level, interests, target_language, subscription_tier",
          )
          .eq("id", user.id)
          .single();

        if (profileError) {
          if (profileError.code === "PGRST116") {
            const { error: insertError } = await supabase
              .from("profiles")
              .insert({
                id: user.id,
                email: user.email,
                full_name:
                  user.user_metadata?.full_name ||
                  user.user_metadata?.name ||
                  "",
                avatar_url:
                  user.user_metadata?.avatar_url ||
                  user.user_metadata?.picture ||
                  "",
              });

            if (insertError) {
              setDbError(`Profile creation failed: ${insertError.message}`);
              setAuthChecked(true);
            } else {
              router.replace("/onboarding");
              return;
            }
          } else if (
            profileError.message?.includes("column") ||
            profileError.code === "PGRST204"
          ) {
            setDbError(
              "Database migration needed. Please run the add_lesson_metrics.sql migration.",
            );
            setAuthChecked(true);
          } else {
            setDbError(profileError.message);
            setAuthChecked(true);
          }
        } else {
          if (!justCompletedOnboarding) {
            const interests = profile?.interests || [];
            if (!interests || interests.length < 3) {
              router.replace("/onboarding");
              return;
            }
          }
          if (profile?.target_language) {
            setTargetLanguage(profile.target_language);
          }
          if (profile?.subscription_tier) {
            setSubscriptionTier(profile.subscription_tier);
          }
          setAuthChecked(true);
        }

        let avgComprehension = 0;
        const { data: completedLessons } = await supabase
          .from("lessons")
          .select("final_comprehension_score, comprehension_percentage")
          .eq("user_id", user.id)
          .eq("completed", true);

        if (completedLessons && completedLessons.length > 0) {
          const scores = completedLessons
            .map(
              (l) =>
                l.final_comprehension_score ?? l.comprehension_percentage ?? 0,
            )
            .filter((s) => s > 0);
          if (scores.length > 0) {
            avgComprehension = Math.round(
              scores.reduce((a, b) => a + b, 0) / scores.length,
            );
          }
        }

        // Fetch from both learner_words_v2 AND user_words to get a unified view.
        // learner_words_v2 is the story engine's table; user_words is Propel's table.
        // Both are now language-scoped so only the active language's words are counted.
        const activeLanguage = profile?.target_language || "fr";
        const [{ data: learnerWords }, { data: propelWords }] =
          await Promise.all([
            supabase
              .from("learner_words_v2")
              .select("id, status, lemma")
              .eq("user_id", user.id)
              .eq("language", activeLanguage),
            supabase
              .from("user_words")
              .select("id, status, lemma, word")
              .eq("user_id", user.id)
              .eq("language", activeLanguage),
          ]);

        // Deduplicate by lemma (or word as fallback), preferring user_words status
        // since it has richer SRS data from Propel modules.
        const wordsByLemma = new Map<
          string,
          { status: string; source: string }
        >();

        // First pass: add all learner_words_v2 entries
        if (learnerWords) {
          learnerWords.forEach((w) => {
            const lemma = (w.lemma || "").toLowerCase();
            if (lemma) {
              // Map v2 statuses to v1 keys
              const mapped =
                w.status === "introduced"
                  ? "new"
                  : w.status === "mastered"
                    ? "mastered"
                    : w.status;
              wordsByLemma.set(lemma, { status: mapped, source: "learner" });
            }
          });
        }

        // Second pass: merge user_words (Propel), overriding status if more advanced
        const statusRank: Record<string, number> = {
          new: 0,
          learning: 1,
          known: 2,
          mastered: 3,
        };
        if (propelWords) {
          propelWords.forEach((w) => {
            const lemma = (w.lemma || w.word || "").toLowerCase();
            if (!lemma) return;
            const existing = wordsByLemma.get(lemma);
            const propelStatus = w.status as string;
            if (
              !existing ||
              (statusRank[propelStatus] ?? 0) >
                (statusRank[existing.status] ?? 0)
            ) {
              wordsByLemma.set(lemma, {
                status: propelStatus,
                source: "propel",
              });
            }
          });
        }

        const wordsCount = wordsByLemma.size;

        const vocabStats: VocabularyStats = {
          new: 0,
          learning: 0,
          known: 0,
          mastered: 0,
          total: wordsCount,
        };

        wordsByLemma.forEach(({ status }) => {
          if (status === "new" || status === "introduced") vocabStats.new++;
          else if (status === "learning") vocabStats.learning++;
          else if (status === "known") vocabStats.known++;
          else if (status === "mastered") vocabStats.mastered++;
        });

        setVocabularyStats(vocabStats);

        const milestone = checkMilestoneAchievement(
          previousWordCount,
          wordsCount,
        );
        if (milestone && previousWordCount > 0) {
          setCelebratingMilestone(milestone);
        }
        setPreviousWordCount(wordsCount);

        const currentLevel = (profile?.proficiency_level ||
          "A1") as ProficiencyLevel;
        const newLevel = checkProficiencyUpdate(
          currentLevel,
          vocabStats.known,
          vocabStats.mastered,
        );

        let finalLevel = currentLevel;
        if (newLevel) {
          await supabase
            .from("profiles")
            .update({ proficiency_level: newLevel })
            .eq("id", user.id);
          finalLevel = newLevel;
        }

        setStats({
          totalSessions: profile?.sessions_completed || 0,
          currentLevel: finalLevel,
          streak: profile?.streak || 0,
          totalTime: profile?.total_practice_minutes || 0,
          avgComprehension,
          wordsEncountered: wordsCount,
        });

        // Check if all monthly goals are complete and offer a reward
        if (hasAccess(profile?.subscription_tier as TierSlug, "diver")) {
          try {
            const rewardRes = await fetch("/api/rewards/check-goals", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
            });
            if (rewardRes.ok) {
              const rewardData = await rewardRes.json();
              if (
                rewardData.all_goals_complete &&
                rewardData.credits_awarded > 0
              ) {
                setCreditsAwarded(rewardData.credits_awarded);
                setRewardId(rewardData.reward_id);
                setShowRewardModal(true);
              }
            }
          } catch (rewardErr) {
            // Non-critical — don't block dashboard loading
            console.error("Reward check failed:", rewardErr);
          }

          // ── Check gameboard reward (tile-flip discount) ─────────────
          try {
            const gbRes = await fetch("/api/rewards/gameboard/check", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
            });
            if (gbRes.ok) {
              const gb = await gbRes.json();
              setGameboardTier(profile?.subscription_tier || "snorkeler");
              setGameboardStatus(gb.status);
              setGameboardExpiresAt(gb.expiresAt);
              if (gb.status === "claimed") {
                setGameboardClaimedIndex(gb.chosenIndex ?? null);
                setGameboardClaimedDiscount(gb.discountPercent ?? null);
              }
              // Show modal if there's a pending (unclaimed) reward
              if (gb.eligible && gb.status === "pending") {
                setShowGameboardModal(true);
              }
            }
          } catch (gbErr) {
            console.error("Gameboard check failed:", gbErr);
          }
        } else {
          // Show locked state for free/snorkeler users (optional preview)
          setGameboardTier(profile?.subscription_tier || "snorkeler");
        }
      } catch (error) {
        console.error("Error fetching stats:", error);
        setAuthChecked(true);
      } finally {
        setLoading(false);
      }
    };

    fetchUserStats();
  }, [supabase, router, previousWordCount]);

  // Fetch admin status for the current session user (server-side check)
  useEffect(() => {
    if (!authChecked) return;
    const checkAdmin = async () => {
      try {
        const res = await fetch("/api/admin/is-admin");
        if (!res.ok) return;
        const j = await res.json();
        setIsAdmin(Boolean(j.is_admin));
      } catch (err) {
        console.error("Failed to check admin status:", err);
      }
    };
    checkAdmin();
  }, [authChecked]);

  // Re-fetch stats when user returns to the tab (e.g. after completing a lesson)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && authChecked) {
        const refreshStats = async () => {
          try {
            const {
              data: { user },
            } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase
              .from("profiles")
              .select(
                "streak, total_practice_minutes, sessions_completed, proficiency_level, target_language, subscription_tier",
              )
              .eq("id", user.id)
              .single();

            if (!profile) return;

            const { data: completedLessons } = await supabase
              .from("lessons")
              .select("final_comprehension_score, comprehension_percentage")
              .eq("user_id", user.id)
              .eq("completed", true);

            let avgComprehension = 0;
            if (completedLessons && completedLessons.length > 0) {
              const scores = completedLessons
                .map(
                  (l) =>
                    l.final_comprehension_score ??
                    l.comprehension_percentage ??
                    0,
                )
                .filter((s) => s > 0);
              if (scores.length > 0) {
                avgComprehension = Math.round(
                  scores.reduce((a, b) => a + b, 0) / scores.length,
                );
              }
            }

            const activeLanguage = profile.target_language || "fr";
            const [{ data: learnerWords }, { data: propelWords }] =
              await Promise.all([
                supabase
                  .from("learner_words_v2")
                  .select("id, status, lemma")
                  .eq("user_id", user.id)
                  .eq("language", activeLanguage),
                supabase
                  .from("user_words")
                  .select("id, status, lemma, word")
                  .eq("user_id", user.id)
                  .eq("language", activeLanguage),
              ]);

            // Deduplicate by lemma, preferring higher status
            const wordsByLemma = new Map<string, string>();
            const statusRank: Record<string, number> = {
              new: 0,
              introduced: 0,
              learning: 1,
              known: 2,
              mastered: 3,
            };

            if (learnerWords) {
              learnerWords.forEach((w) => {
                const lemma = (w.lemma || "").toLowerCase();
                if (lemma) {
                  const mapped = w.status === "introduced" ? "new" : w.status;
                  wordsByLemma.set(lemma, mapped);
                }
              });
            }
            if (propelWords) {
              propelWords.forEach((w) => {
                const lemma = (w.lemma || w.word || "").toLowerCase();
                if (!lemma) return;
                const existing = wordsByLemma.get(lemma);
                const s = w.status as string;
                if (
                  !existing ||
                  (statusRank[s] ?? 0) > (statusRank[existing] ?? 0)
                ) {
                  wordsByLemma.set(lemma, s);
                }
              });
            }

            const wordsCount = wordsByLemma.size;

            setStats({
              totalSessions: profile.sessions_completed || 0,
              currentLevel: profile.proficiency_level || "A1",
              streak: profile.streak || 0,
              totalTime: profile.total_practice_minutes || 0,
              avgComprehension,
              wordsEncountered: wordsCount,
            });
          } catch (err) {
            console.error("Error refreshing stats:", err);
          }
        };
        refreshStats();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [supabase, authChecked]);

  if (!authChecked || loading) {
    return <LoadingScreen />;
  }

  return (
    <ProtectedRoute>
      {/* Reward Modal — shown when all monthly goals are complete */}
      <RewardModal
        isOpen={showRewardModal}
        onClose={() => setShowRewardModal(false)}
        creditsAwarded={creditsAwarded}
        rewardId={rewardId}
      />

      {/* Gameboard Reward Modal — tile-flip discount board */}
      <GameboardRewardModal
        isOpen={showGameboardModal}
        onClose={() => setShowGameboardModal(false)}
        status={gameboardStatus}
        tier={gameboardTier}
        claimedIndex={gameboardClaimedIndex}
        claimedDiscount={gameboardClaimedDiscount}
        expiresAt={gameboardExpiresAt}
        onClaimed={(discount) => {
          setGameboardClaimedDiscount(discount);
          setGameboardStatus("claimed");
        }}
      />
      <DiveTransitionProvider>
        <DashboardContent
          stats={stats}
          vocabularyStats={vocabularyStats}
          subscriptionTier={subscriptionTier}
          userId={userId}
          targetLanguage={targetLanguage}
          showPaymentSuccess={showPaymentSuccess}
          setShowPaymentSuccess={setShowPaymentSuccess}
          celebratingMilestone={celebratingMilestone}
          setCelebratingMilestone={setCelebratingMilestone}
          avatarUrl={avatarUrl}
          isProgressView={isProgressView}
          isAdmin={isAdmin}
        />
      </DiveTransitionProvider>
    </ProtectedRoute>
  );
}

export default function DashboardPage() {
  return (
    <Suspense>
      <DashboardPageContent />
    </Suspense>
  );
}
