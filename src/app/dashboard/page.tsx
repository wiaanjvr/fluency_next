"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { MilestoneCelebration } from "@/components/progression";
import { RewardModal } from "@/components/rewards";
import LoadingScreen from "@/components/ui/LoadingScreen";
import { UsageLimitBanner } from "@/components/ui/UsageLimitBanner";
import {
  OceanBackground,
  OceanNavigation,
  NextLessonHero,
  DepthChart,
  DiveTransitionProvider,
  useDiveTransition,
} from "@/components/ocean";
import { VocabularyViewer } from "@/components/dashboard";
import { Check, Crown, ArrowRight } from "lucide-react";
import { ProficiencyLevel, WordStatus, ProgressMilestone } from "@/types";
import { checkProficiencyUpdate } from "@/lib/srs/proficiency-calculator";
import { checkMilestoneAchievement } from "@/lib/progression";
import { cn } from "@/lib/utils";
import { getLanguageConfig } from "@/lib/languages";

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
}) {
  const { triggerDive } = useDiveTransition();
  const contentRef = useRef<HTMLDivElement>(null);
  const depthChartRef = useRef<HTMLDivElement>(null);
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

  // Scroll to depth chart when progress view is active
  useEffect(() => {
    if (isProgressView && depthChartRef.current) {
      setTimeout(() => {
        depthChartRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    }
  }, [isProgressView]);

  return (
    <OceanBackground>
      {/* Navigation — Simplified: Immerse, Progress, Settings */}
      <OceanNavigation
        wordsEncountered={stats.wordsEncountered}
        totalMinutes={stats.totalTime}
        avatarUrl={avatarUrl}
        currentPath="/dashboard"
      />

      {/* Main Content */}
      <div
        ref={contentRef}
        className="relative z-10 min-h-screen pt-24 pb-16 px-6"
      >
        {/* Payment Success Notification */}
        {showPaymentSuccess && (
          <div className="fixed top-20 right-6 z-50 max-w-md">
            <div
              className="ocean-card p-4"
              style={{ background: "rgba(61, 214, 181, 0.1)" }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: "rgba(61, 214, 181, 0.2)" }}
                >
                  <Check
                    className="w-5 h-5"
                    style={{ color: "var(--turquoise)" }}
                  />
                </div>
                <div className="flex-1">
                  <h3
                    className="font-display font-semibold mb-1"
                    style={{ color: "var(--turquoise)" }}
                  >
                    Welcome to Pro
                  </h3>
                  <p
                    className="text-sm font-body"
                    style={{ color: "var(--seafoam)" }}
                  >
                    Unlimited immersion unlocked. Go deeper.
                  </p>
                </div>
                <button
                  onClick={() => setShowPaymentSuccess(false)}
                  className="transition-opacity hover:opacity-100 opacity-60"
                  style={{ color: "var(--sand)" }}
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

          {/* Pro Badge */}
          {subscriptionTier === "premium" && (
            <div className="flex justify-center">
              <div
                className="flex items-center gap-2 px-4 py-2 rounded-full ocean-card"
                style={{ background: "rgba(255, 179, 0, 0.1)" }}
              >
                <Crown className="w-4 h-4" style={{ color: "#ffb300" }} />
                <span
                  className="text-sm font-body font-medium"
                  style={{ color: "#ffb300" }}
                >
                  Pro
                </span>
              </div>
            </div>
          )}

          {/* ========== SESSION HERO — Single entry to immersion ========== */}
          <section
            style={{
              transform: `translate(${mousePosition.x * -4}px, ${mousePosition.y * -4}px)`,
              transition: "transform 0.3s ease-out",
            }}
          >
            <NextLessonHero
              depthName={depthInfo.name}
              wordsAbsorbed={stats.wordsEncountered}
              sessionPath={depthInfo.path}
              onDiveClick={handleDiveClick}
            />
          </section>

          {/* ========== DEPTH CHART — The tide rising ========== */}
          <section
            ref={depthChartRef}
            className="ocean-card-animate"
            style={{ animationDelay: "0.4s" }}
          >
            <DepthChart
              wordCount={stats.wordsEncountered}
              totalMinutes={stats.totalTime}
              shadowingSessions={stats.totalSessions}
            />
          </section>

          {/* ========== VOCABULARY VIEWER ========== */}
          {userId && stats.wordsEncountered > 0 && (
            <section
              className="ocean-card p-6 ocean-card-animate"
              style={{ animationDelay: "0.5s" }}
            >
              <h3
                className="font-display text-2xl font-semibold mb-6"
                style={{ color: "var(--sand)" }}
              >
                Words You Know
              </h3>
              <VocabularyViewer userId={userId} language={targetLanguage} />
            </section>
          )}

          {/* ========== PREMIUM CTA (for free users after depth 2) ========== */}
          {stats.wordsEncountered >= 50 && subscriptionTier === "free" && (
            <section
              className="ocean-card ocean-card-animate p-6"
              style={{
                animationDelay: "0.6s",
                background:
                  "linear-gradient(135deg, rgba(255, 179, 0, 0.06) 0%, rgba(255, 140, 0, 0.03) 100%)",
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3
                    className="font-display text-xl font-semibold mb-1"
                    style={{ color: "var(--sand)" }}
                  >
                    Go deeper
                  </h3>
                  <p
                    className="text-sm font-body"
                    style={{ color: "var(--seafoam)" }}
                  >
                    Unlimited immersion time, longer stories, and advanced
                    shadowing tools.
                  </p>
                </div>
                <Link href="/pricing">
                  <button
                    className="ocean-cta px-6 py-3 text-sm font-semibold flex items-center gap-2"
                    style={{
                      background: "linear-gradient(135deg, #ffb300, #ff8c00)",
                    }}
                  >
                    Unlock Pro
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
export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isProgressView = searchParams.get("view") === "progress";
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [subscriptionTier, setSubscriptionTier] = useState<string>("free");
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>();

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
  const [rewardAmount, setRewardAmount] = useState(0);
  const [rewardId, setRewardId] = useState("");

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

        const { data: allWords } = await supabase
          .from("learner_words_v2")
          .select("id, status")
          .eq("user_id", user.id);

        const wordsCount = allWords?.length || 0;

        const vocabStats: VocabularyStats = {
          new: 0,
          learning: 0,
          known: 0,
          mastered: 0,
          total: wordsCount,
        };

        if (allWords) {
          allWords.forEach((word) => {
            const v2Status = word.status as string;
            // Map v2 statuses to v1 VocabularyStats keys
            if (v2Status === "introduced") vocabStats.new++;
            else if (v2Status === "learning") vocabStats.learning++;
            else if (v2Status === "mastered") vocabStats.mastered++;
          });
        }

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
        if (profile?.subscription_tier === "premium") {
          try {
            const rewardRes = await fetch("/api/rewards/check-goals", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
            });
            if (rewardRes.ok) {
              const rewardData = await rewardRes.json();
              if (
                rewardData.all_goals_complete &&
                rewardData.reward_amount > 0
              ) {
                setRewardAmount(rewardData.reward_amount);
                setRewardId(rewardData.reward_id);
                setShowRewardModal(true);
              }
            }
          } catch (rewardErr) {
            // Non-critical — don't block dashboard loading
            console.error("Reward check failed:", rewardErr);
          }
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

            const { data: allWords } = await supabase
              .from("learner_words_v2")
              .select("id, status")
              .eq("user_id", user.id);

            const wordsCount = allWords?.length || 0;

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

  const languageConfig = useMemo(
    () => getLanguageConfig(targetLanguage),
    [targetLanguage],
  );

  if (!authChecked || loading) {
    return <LoadingScreen />;
  }

  return (
    <ProtectedRoute>
      {/* Reward Modal — shown when all monthly goals are complete */}
      <RewardModal
        isOpen={showRewardModal}
        onClose={() => setShowRewardModal(false)}
        rewardAmount={rewardAmount}
        rewardId={rewardId}
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
        />
      </DiveTransitionProvider>
    </ProtectedRoute>
  );
}
