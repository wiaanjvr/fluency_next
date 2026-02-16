"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  LeftSidebar,
  RightSidebar,
  VocabularyViewer,
} from "@/components/dashboard";
import { MilestoneCelebration } from "@/components/progression";
import { LinguaLoadingAnimation } from "@/components/ui/LinguaLoadingAnimation";
import { UsageLimitBanner } from "@/components/ui/UsageLimitBanner";
import { DiveIn } from "@/components/ui/ocean-animations";
import {
  Play,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Clock,
  Zap,
  Star,
} from "lucide-react";
import { getLessonPathForWordCount } from "@/lib/srs/seed-vocabulary";
import {
  ProficiencyLevel,
  WordStatus,
  UserWord,
  ProgressMilestone,
} from "@/types";
import {
  checkProficiencyUpdate,
  getProficiencyProgress,
} from "@/lib/srs/proficiency-calculator";
import { checkMilestoneAchievement } from "@/lib/progression";
import { cn } from "@/lib/utils";
import { getLanguageConfig } from "@/lib/languages";

interface VocabularyStats {
  new: number;
  learning: number;
  known: number;
  mastered: number;
  total: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [sessionsToday, setSessionsToday] = useState(0);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

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
            "streak, total_practice_minutes, sessions_completed, proficiency_level, interests, target_language",
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
          setAuthChecked(true);
        }

        const today = new Date().toISOString().split("T")[0];
        const { count: todayCount, error: lessonsError } = await supabase
          .from("lessons")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("completed", true)
          .gte("completed_at", today);

        if (lessonsError && lessonsError.code === "42P01") {
          setDbError(
            "Lessons table not found. Please run the add_lessons_table.sql migration.",
          );
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

        setSessionsToday(todayCount || 0);
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
    return <LinguaLoadingAnimation message="Loading your dashboard..." />;
  }

  // Determine lesson path and type
  const lessonPath = getLessonPathForWordCount(stats.wordsEncountered);
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
    <div className="flex min-h-screen bg-background">
      {/* ========== MILESTONE CELEBRATION MODAL ========== */}
      {celebratingMilestone && (
        <MilestoneCelebration
          milestone={celebratingMilestone}
          onClose={() => setCelebratingMilestone(null)}
        />
      )}

      {/* ========== LEFT SIDEBAR ========== */}
      <LeftSidebar stats={stats} targetLanguage={targetLanguage} />

      {/* ========== MAIN CONTENT ========== */}
      <main className="flex-1 overflow-y-auto">
        <DiveIn>
          <div className="max-w-5xl mx-auto p-8">
            {/* Usage Limit Banner */}
            <UsageLimitBanner className="mb-8" />

            {/* Hero Section */}
            <div className="mb-12">
              <h1 className="text-4xl font-bold mb-2">Welcome back</h1>
              <p className="text-lg text-muted-foreground">
                Ready to continue your journey to fluency?
              </p>
            </div>

            {/* Next Lesson Card */}
            <div className="mb-8">
              <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/20 rounded-2xl p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32" />

                <div className="relative">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Next Lesson
                      </p>
                      <h2 className="text-3xl font-bold mb-2">
                        {lessonType.title}
                      </h2>
                      <p className="text-muted-foreground">
                        {lessonType.description}
                      </p>
                    </div>
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <Play className="w-8 h-8 text-primary" />
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mb-6">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>~15 min</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <TrendingUp className="w-4 h-4" />
                      <span>{stats.avgComprehension}% avg score</span>
                    </div>
                  </div>

                  <Link href={lessonType.path}>
                    <Button size="lg" className="group">
                      Start Learning
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-blue-500" />
                  </div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">
                    New
                  </span>
                </div>
                <div className="text-3xl font-bold mb-1">
                  {vocabularyStats.new}
                </div>
                <p className="text-sm text-muted-foreground">New Words</p>
              </div>

              <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-green-500" />
                  </div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">
                    Known
                  </span>
                </div>
                <div className="text-3xl font-bold mb-1">
                  {vocabularyStats.known}
                </div>
                <p className="text-sm text-muted-foreground">Known Words</p>
              </div>

              <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                    <Star className="w-5 h-5 text-yellow-500" />
                  </div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">
                    Mastered
                  </span>
                </div>
                <div className="text-3xl font-bold mb-1">
                  {vocabularyStats.mastered}
                </div>
                <p className="text-sm text-muted-foreground">Mastered Words</p>
              </div>
            </div>

            {/* Vocabulary Viewer */}
            {userId && stats.wordsEncountered > 0 && (
              <div className="mb-8">
                <VocabularyViewer userId={userId} language={targetLanguage} />
              </div>
            )}

            {/* Premium CTA */}
            {stats.totalSessions >= 3 && (
              <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-500/20 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">
                      Ready to accelerate?
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Unlock unlimited sessions, detailed analytics, and
                      personalized learning.
                    </p>
                  </div>
                  <Link href="/pricing">
                    <Button variant="default" className="shrink-0">
                      Go Premium
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </DiveIn>
      </main>

      {/* ========== RIGHT SIDEBAR (ROADMAP) ========== */}
      <RightSidebar wordCount={stats.wordsEncountered} />
    </div>
  );
}
