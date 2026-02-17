"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { MilestoneCelebration } from "@/components/progression";
import LoadingScreen from "@/components/ui/LoadingScreen";
import { UsageLimitBanner } from "@/components/ui/UsageLimitBanner";
import {
  OceanBackground,
  OceanNavigation,
  NextLessonHero,
  WordProgressSection,
  DepthChart,
  DiveTransitionProvider,
  useDiveTransition,
} from "@/components/ocean";
import { VocabularyViewer } from "@/components/dashboard";
import { Check, Crown, ArrowRight } from "lucide-react";
import { getLessonPathForWordCount } from "@/lib/srs/seed-vocabulary";
import { ProficiencyLevel, WordStatus, ProgressMilestone } from "@/types";
import { checkProficiencyUpdate } from "@/lib/srs/proficiency-calculator";
import { checkMilestoneAchievement } from "@/lib/progression";
import { cn } from "@/lib/utils";
import { getLanguageConfig } from "@/lib/languages";

// Import ocean theme styles
import "@/styles/ocean-theme.css";

interface VocabularyStats {
  new: number;
  learning: number;
  known: number;
  mastered: number;
  total: number;
}

// Separate component for dashboard content to use dive transition context
function DashboardContent({
  stats,
  vocabularyStats,
  lessonType,
  subscriptionTier,
  userId,
  targetLanguage,
  showPaymentSuccess,
  setShowPaymentSuccess,
  celebratingMilestone,
  setCelebratingMilestone,
  avatarUrl,
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
  lessonType: { title: string; description: string; path: string };
  subscriptionTier: string;
  userId: string;
  targetLanguage: string;
  showPaymentSuccess: boolean;
  setShowPaymentSuccess: (show: boolean) => void;
  celebratingMilestone: ProgressMilestone | null;
  setCelebratingMilestone: (milestone: ProgressMilestone | null) => void;
  avatarUrl?: string;
}) {
  const { triggerDive } = useDiveTransition();
  const contentRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Parallax mouse move effect for cards
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
    triggerDive(lessonType.path);
  };

  return (
    <OceanBackground>
      {/* Fixed Navigation */}
      <OceanNavigation
        streak={stats.streak}
        wordsEncountered={stats.wordsEncountered}
        avatarUrl={avatarUrl}
        currentPath={lessonType.path}
      />

      {/* Main Content */}
      <div
        ref={contentRef}
        className="relative z-10 min-h-screen pt-24 pb-16 px-6"
      >
        {/* ========== PAYMENT SUCCESS NOTIFICATION ========== */}
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
                    Welcome to Pro! 🎉
                  </h3>
                  <p
                    className="text-sm font-body"
                    style={{ color: "var(--seafoam)" }}
                  >
                    Your subscription is now active. Enjoy unlimited lessons!
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

        {/* ========== MILESTONE CELEBRATION MODAL ========== */}
        {celebratingMilestone && (
          <MilestoneCelebration
            milestone={celebratingMilestone}
            onClose={() => setCelebratingMilestone(null)}
          />
        )}

        <div className="max-w-5xl mx-auto space-y-12">
          {/* Usage Limit Banner */}
          <UsageLimitBanner className="mb-4" />

          {/* Pro Badge (if applicable) */}
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
                  Pro Member
                </span>
              </div>
            </div>
          )}

          {/* ========== NEXT LESSON HERO CARD ========== */}
          <section
            style={{
              transform: `translate(${mousePosition.x * -4}px, ${mousePosition.y * -4}px)`,
              transition: "transform 0.3s ease-out",
            }}
          >
            <NextLessonHero
              title={lessonType.title}
              description={lessonType.description}
              timeEstimate="~15 min"
              avgScore={stats.avgComprehension}
              lessonPath={lessonType.path}
              onDiveClick={handleDiveClick}
            />
          </section>

          {/* ========== WORD PROGRESS SECTION ========== */}
          <section
            style={{
              transform: `translate(${mousePosition.x * -2}px, ${mousePosition.y * -2}px)`,
              transition: "transform 0.3s ease-out",
            }}
          >
            <WordProgressSection
              newWords={vocabularyStats.new}
              knownWords={vocabularyStats.known}
              masteredWords={vocabularyStats.mastered}
            />
          </section>

          {/* ========== DEPTH CHART ROADMAP ========== */}
          <section
            className="ocean-card-animate"
            style={{ animationDelay: "0.5s" }}
          >
            <DepthChart wordCount={stats.wordsEncountered} />
          </section>

          {/* ========== VOCABULARY VIEWER (if words exist) ========== */}
          {userId && stats.wordsEncountered > 0 && (
            <section
              className="ocean-card p-6 ocean-card-animate"
              style={{ animationDelay: "0.6s" }}
            >
              <h3
                className="font-display text-2xl font-semibold mb-6"
                style={{ color: "var(--sand)" }}
              >
                Your Vocabulary
              </h3>
              <VocabularyViewer userId={userId} language={targetLanguage} />
            </section>
          )}

          {/* ========== PREMIUM CTA (for free users after 3 sessions) ========== */}
          {stats.totalSessions >= 3 && subscriptionTier === "free" && (
            <section
              className="ocean-card ocean-card-animate p-6"
              style={{
                animationDelay: "0.7s",
                background:
                  "linear-gradient(135deg, rgba(255, 179, 0, 0.08) 0%, rgba(255, 140, 0, 0.05) 100%)",
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3
                    className="font-display text-xl font-semibold mb-1"
                    style={{ color: "var(--sand)" }}
                  >
                    Ready to accelerate?
                  </h3>
                  <p
                    className="text-sm font-body"
                    style={{ color: "var(--seafoam)" }}
                  >
                    Unlock unlimited sessions, detailed analytics, and
                    personalized learning.
                  </p>
                </div>
                <Link href="/pricing">
                  <button
                    className="ocean-cta px-6 py-3 text-sm font-semibold flex items-center gap-2"
                    style={{
                      background: "linear-gradient(135deg, #ffb300, #ff8c00)",
                    }}
                  >
                    Go Premium
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

export default function DashboardPage() {
  const router = useRouter();
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

  useEffect(() => {
    // Check for payment success query parameter
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const paymentStatus = urlParams.get("payment");
      if (paymentStatus === "success") {
        setShowPaymentSuccess(true);
        // Force refresh of subscription status after successful payment
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
        // Clean up URL
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
          // Set the target language from profile
          if (profile?.target_language) {
            setTargetLanguage(profile.target_language);
          }
          // Set the subscription tier from profile
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
          .from("user_words")
          .select(
            "id, word, lemma, status, rating, next_review, ease_factor, interval, repetitions, created_at, updated_at, last_rated_at",
          )
          .eq("user_id", user.id)
          .order("status", { ascending: false })
          .order("word", { ascending: true });

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
            const status = word.status as WordStatus;
            if (status in vocabStats) {
              vocabStats[status]++;
            }
          });
        }

        setVocabularyStats(vocabStats);

        // Check for new milestone achievement
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
      } catch (error) {
        console.error("Error fetching stats:", error);
        setAuthChecked(true);
      } finally {
        setLoading(false);
      }
    };

    fetchUserStats();
  }, [supabase, router, previousWordCount]);

  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const languageConfig = useMemo(
    () => getLanguageConfig(targetLanguage),
    [targetLanguage],
  );

  // Loading state
  if (!authChecked || loading) {
    return <LoadingScreen />;
  }

  // Determine lesson path and type
  const getLessonTypeInfo = () => {
    if (stats.wordsEncountered >= 500) {
      return {
        title: "Acquisition Mode",
        description: "Listen without text. Speak before reading.",
        path: "/learn/stories",
      };
    } else if (stats.wordsEncountered >= 300) {
      return {
        title: "Micro Stories",
        description: "Short stories using your known words.",
        path: "/learn/stories",
      };
    } else if (stats.wordsEncountered >= 100) {
      return {
        title: "Sentence Patterns",
        description: "Practice with simple sentences.",
        path: "/learn/sentences",
      };
    } else {
      return {
        title: "Foundation Vocabulary",
        description: `Learn your first 100 ${languageConfig.name} words.`,
        path: "/learn/foundation",
      };
    }
  };

  const lessonType = getLessonTypeInfo();

  return (
    <ProtectedRoute>
      <DiveTransitionProvider>
        <DashboardContent
          stats={stats}
          vocabularyStats={vocabularyStats}
          lessonType={lessonType}
          subscriptionTier={subscriptionTier}
          userId={userId}
          targetLanguage={targetLanguage}
          showPaymentSuccess={showPaymentSuccess}
          setShowPaymentSuccess={setShowPaymentSuccess}
          celebratingMilestone={celebratingMilestone}
          setCelebratingMilestone={setCelebratingMilestone}
          avatarUrl={avatarUrl}
        />
      </DiveTransitionProvider>
    </ProtectedRoute>
  );
}
