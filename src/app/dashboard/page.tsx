"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import {
  StatCard,
  ProgressBar,
  LessonPreviewCard,
  SectionHeader,
  EmptyState,
} from "@/components/ui/premium-components";
import {
  ProgressPathVisualizer,
  GraduationStatusCard,
  LearningStatsCard,
  FeatureUnlocksGrid,
  MilestoneCelebration,
} from "@/components/progression";
import {
  Play,
  Settings,
  TrendingUp,
  Calendar,
  Clock,
  ArrowRight,
  BookOpen,
  Star,
  Sparkles,
  Brain,
  ChevronDown,
  ChevronUp,
  Volume2,
  Target,
  Flame,
  GraduationCap,
  Lock,
} from "lucide-react";
import { getLevelLabel } from "@/lib/placement/scoring";
import { getLessonPathForWordCount } from "@/lib/srs/seed-vocabulary";
import {
  ProficiencyLevel,
  WordStatus,
  UserWord,
  ProgressMilestone,
  GraduationStatus,
} from "@/types";
import {
  checkProficiencyUpdate,
  getProficiencyProgress,
} from "@/lib/srs/proficiency-calculator";
import {
  checkGraduationReadiness,
  getCurrentMilestone,
  getNextMilestone,
  checkMilestoneAchievement,
  calculateLearningStats,
  getUnlockedFeatures,
  isFeatureUnlocked,
} from "@/lib/progression";
import { cn } from "@/lib/utils";

interface VocabularyWord {
  id: string;
  word: string;
  lemma: string;
  status: WordStatus;
  rating: number;
  next_review: string;
}

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
  const maxSessionsFree = 1;

  const [stats, setStats] = useState({
    totalSessions: 0,
    currentLevel: "A1",
    streak: 0,
    totalTime: 0,
    avgComprehension: 0,
    wordsEncountered: 0,
  });
  const [vocabularyStats, setVocabularyStats] = useState<VocabularyStats>({
    new: 0,
    learning: 0,
    known: 0,
    mastered: 0,
    total: 0,
  });
  const [vocabularyWords, setVocabularyWords] = useState<VocabularyWord[]>([]);
  const [showVocabulary, setShowVocabulary] = useState(false);
  const [vocabFilter, setVocabFilter] = useState<WordStatus | "all">("all");
  const [proficiencyProgress, setProficiencyProgress] = useState<{
    nextLevel: ProficiencyLevel | null;
    wordsNeeded: number;
    progress: number;
  } | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);

  // Progression gateway state
  const [graduationStatus, setGraduationStatus] =
    useState<GraduationStatus | null>(null);
  const [celebratingMilestone, setCelebratingMilestone] =
    useState<ProgressMilestone | null>(null);
  const [previousWordCount, setPreviousWordCount] = useState<number>(0);

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
            "streak, total_practice_minutes, sessions_completed, proficiency_level, interests",
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
          setVocabularyWords(allWords as VocabularyWord[]);
        }

        setVocabularyStats(vocabStats);

        // Calculate graduation status for progression gateway
        const userWordsForGraduation: UserWord[] = (allWords || []).map(
          (w: any) => ({
            id: w.id,
            user_id: user.id,
            word: w.word,
            language: "french",
            lemma: w.lemma,
            ease_factor: w.ease_factor ?? 2.5,
            repetitions: w.repetitions ?? 0,
            interval: w.interval ?? 0,
            next_review: w.next_review || new Date().toISOString(),
            status: w.status as WordStatus,
            created_at: w.created_at || new Date().toISOString(),
            updated_at: w.updated_at || new Date().toISOString(),
            last_rated_at: w.last_rated_at,
            rating: w.rating,
          }),
        );

        const gradStatus = checkGraduationReadiness(userWordsForGraduation);
        setGraduationStatus(gradStatus);

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

        const progress = getProficiencyProgress(
          finalLevel,
          vocabStats.known,
          vocabStats.mastered,
        );
        setProficiencyProgress({
          nextLevel: progress.nextLevel,
          wordsNeeded: progress.wordsNeeded,
          progress: progress.progress,
        });

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
        setDbError(error instanceof Error ? error.message : "Unknown error");
        setAuthChecked(true);
      } finally {
        setLoading(false);
      }
    };

    fetchUserStats();
  }, [supabase, router]);

  // Premium loading state
  if (!authChecked || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="w-12 h-12 rounded-xl bg-library-forest/20 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-library-forest/30 border-t-library-forest rounded-full animate-spin" />
          </div>
          <p className="text-muted-foreground font-light">
            Loading your dashboard...
          </p>
        </div>
      </div>
    );
  }

  const canStartLesson = sessionsToday < maxSessionsFree;

  // Determine lesson path based on word count, not just proficiency level
  // This respects the placement test seeding and progressive unlocking
  const lessonPath = getLessonPathForWordCount(stats.wordsEncountered);

  // Helper to get lesson type description
  const getLessonTypeDescription = () => {
    if (stats.wordsEncountered >= 500) {
      return {
        title: "acquisition mode",
        description:
          "Listen without text. Speak before reading. Embrace the productive discomfort.",
      };
    } else if (stats.wordsEncountered >= 300) {
      return {
        title: "micro-stories",
        description:
          "Read short, engaging stories using your 300+ known words.",
      };
    } else if (stats.wordsEncountered >= 100) {
      return {
        title: "sentence patterns",
        description: "Practice with simple sentences and common patterns.",
      };
    } else {
      return {
        title: "foundation vocabulary",
        description:
          "Learn your first 100 French words with images, audio, and practice exercises.",
      };
    }
  };

  const lessonType = getLessonTypeDescription();

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* ========== MILESTONE CELEBRATION MODAL ========== */}
      {celebratingMilestone && (
        <MilestoneCelebration
          milestone={celebratingMilestone}
          onClose={() => setCelebratingMilestone(null)}
        />
      )}

      {/* ========== NAVIGATION ========== */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-background/80 border-b border-library-forest/20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <div className="w-9 h-9 bg-library-forest rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-105 group-hover:bg-library-brass">
                <span className="text-foreground font-serif font-semibold text-lg">
                  L
                </span>
              </div>
              <span className="text-lg font-light">Lingua</span>
            </Link>

            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground font-light hidden sm:block">
                Free Plan
              </span>
              <Link href="/settings">
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-xl text-muted-foreground hover:text-foreground"
                >
                  <Settings className="h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="pt-24 pb-16 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Database Error Banner */}
          {dbError && (
            <ScrollReveal>
              <div className="mb-8 p-6 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                <p className="font-medium text-amber-700 dark:text-amber-400 mb-1">
                  Database Setup Required
                </p>
                <p className="text-sm text-amber-600 dark:text-amber-500">
                  {dbError}
                </p>
              </div>
            </ScrollReveal>
          )}

          {/* ========== HERO SECTION ========== */}
          <section className="mb-16">
            <ScrollReveal>
              <p className="text-sm font-light tracking-[0.2em] uppercase text-muted-foreground mb-4">
                Welcome back
              </p>
            </ScrollReveal>

            <ScrollReveal delay={100}>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-light tracking-tight mb-4">
                Ready to{" "}
                <span className="font-serif italic text-library-brass">
                  learn?
                </span>
              </h1>
            </ScrollReveal>

            <ScrollReveal delay={200}>
              <p className="text-lg text-muted-foreground font-light">
                Embrace the productive discomfort. Progress awaits.
              </p>
            </ScrollReveal>
          </section>

          {/* ========== MAIN CONTENT GRID ========== */}
          <div className="grid lg:grid-cols-3 gap-8">
            {/* ========== TODAY'S LESSON CARD ========== */}
            <ScrollReveal delay={300} className="lg:col-span-2">
              <div className="relative overflow-hidden rounded-3xl bg-card border border-border p-8 md:p-10 min-h-[400px]">
                {/* Ambient glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-library-forest/[0.04] rounded-full blur-3xl -mr-32 -mt-32" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-luxury-bronze/[0.02] rounded-full blur-2xl -ml-24 -mb-24" />

                <div className="relative z-10 h-full flex flex-col">
                  <div className="flex items-center gap-2 mb-8">
                    <div className="w-2 h-2 rounded-full bg-library-forest" />
                    <span className="text-sm font-light tracking-wider uppercase text-muted-foreground">
                      Today's Session
                    </span>
                  </div>

                  <div className="flex-1 flex flex-col justify-center">
                    <h2 className="text-3xl md:text-4xl font-light mb-4 leading-tight">
                      {canStartLesson ? (
                        <>
                          Begin your
                          <br />
                          <span className="font-serif italic text-library-brass">
                            {lessonType.title}
                          </span>
                        </>
                      ) : (
                        <>
                          Session
                          <br />
                          <span className="font-serif italic text-library-brass">
                            complete
                          </span>
                        </>
                      )}
                    </h2>

                    <p className="text-muted-foreground font-light mb-8 max-w-md">
                      {canStartLesson
                        ? lessonType.description
                        : "Great work today. Upgrade to Premium for unlimited daily sessions."}
                    </p>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      {canStartLesson ? (
                        <Link href={lessonPath}>
                          <Button
                            size="lg"
                            className="bg-library-brass text-background hover:bg-library-brass/90 h-14 px-8 text-base font-light rounded-full group"
                          >
                            <Play className="mr-2 h-4 w-4" />
                            Start Learning
                            <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                          </Button>
                        </Link>
                      ) : (
                        <>
                          <Button
                            disabled
                            size="lg"
                            className="bg-muted text-muted-foreground h-14 px-8 font-light rounded-full"
                          >
                            <Play className="mr-2 h-4 w-4" />
                            Session Complete
                          </Button>
                          <Button
                            variant="outline"
                            size="lg"
                            className="h-14 px-8 font-light rounded-full border-library-brass/30 text-library-brass hover:bg-library-brass/10"
                          >
                            Upgrade to Premium
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="pt-6 border-t border-border/50 mt-8">
                    <p className="text-sm text-muted-foreground font-light">
                      Free tier:{" "}
                      <span className="text-foreground">
                        {sessionsToday}/{maxSessionsFree}
                      </span>{" "}
                      sessions used today
                    </p>
                  </div>
                </div>
              </div>
            </ScrollReveal>

            {/* ========== STATS SIDEBAR ========== */}
            <div className="space-y-4">
              <ScrollReveal delay={400}>
                <StatCard
                  label="Current Level"
                  value={stats.currentLevel}
                  subtext={getLevelLabel(
                    stats.currentLevel as ProficiencyLevel,
                  )}
                  icon={<TrendingUp className="h-4 w-4" />}
                  accent
                />
              </ScrollReveal>

              <ScrollReveal delay={500}>
                <StatCard
                  label="Learning Streak"
                  value={stats.streak}
                  subtext="days consecutive"
                  icon={<Flame className="h-4 w-4" />}
                />
              </ScrollReveal>

              <ScrollReveal delay={600}>
                <StatCard
                  label="Total Time"
                  value={`${stats.totalTime}`}
                  subtext="minutes practiced"
                  icon={<Clock className="h-4 w-4" />}
                />
              </ScrollReveal>
            </div>
          </div>

          {/* ========== PROGRESS SECTION ========== */}
          <section className="mt-20">
            <ScrollReveal>
              <SectionHeader
                eyebrow="Your Progress"
                title="Track your journey"
              />
            </ScrollReveal>

            {/* Progress Path Visualizer - 0 → 100 → 300 → 500 → 1000+ */}
            <ScrollReveal delay={50} className="mt-10">
              <ProgressPathVisualizer wordCount={stats.wordsEncountered} />
            </ScrollReveal>

            {/* Graduation Status & Stats Grid */}
            <div className="grid lg:grid-cols-2 gap-6 mt-8">
              {/* Graduation Status Card */}
              {graduationStatus && (
                <ScrollReveal delay={100}>
                  <GraduationStatusCard graduationStatus={graduationStatus} />
                </ScrollReveal>
              )}

              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-4">
                <ScrollReveal delay={150}>
                  <div className="bg-card border border-border rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-library-forest/10 flex items-center justify-center">
                        <Target className="h-5 w-5 text-library-forest" />
                      </div>
                      <span className="text-sm text-muted-foreground font-light">
                        Sessions
                      </span>
                    </div>
                    <div className="text-3xl font-light mb-1">
                      {stats.totalSessions}
                    </div>
                    <p className="text-sm text-muted-foreground font-light">
                      {stats.totalSessions === 0
                        ? "The journey begins"
                        : "Keep the momentum"}
                    </p>
                  </div>
                </ScrollReveal>

                <ScrollReveal delay={200}>
                  <div className="bg-card border border-border rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-library-brass/10 flex items-center justify-center">
                        <Brain className="h-5 w-5 text-library-brass" />
                      </div>
                      <span className="text-sm text-muted-foreground font-light">
                        Comprehension
                      </span>
                    </div>
                    <div className="text-3xl font-light mb-1">
                      {stats.avgComprehension}
                      <span className="text-xl text-muted-foreground">%</span>
                    </div>
                    <p className="text-sm text-muted-foreground font-light">
                      Average accuracy
                    </p>
                  </div>
                </ScrollReveal>

                <ScrollReveal delay={250}>
                  <div className="bg-card border border-border rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-library-forest/10 flex items-center justify-center">
                        <BookOpen className="h-5 w-5 text-library-forest" />
                      </div>
                      <span className="text-sm text-muted-foreground font-light">
                        Vocabulary
                      </span>
                    </div>
                    <div className="text-3xl font-light mb-1">
                      {stats.wordsEncountered}
                    </div>
                    <p className="text-sm text-muted-foreground font-light">
                      Words encountered
                    </p>
                  </div>
                </ScrollReveal>
              </div>
            </div>

            {/* Feature Unlocks Grid */}
            <ScrollReveal delay={300} className="mt-8">
              <FeatureUnlocksGrid wordCount={stats.wordsEncountered} />
            </ScrollReveal>
          </section>

          {/* ========== LEARNING PATHS SECTION ========== */}
          <section className="mt-20">
            <ScrollReveal>
              <SectionHeader
                eyebrow="Learning Paths"
                title="Your structured journey"
              />
            </ScrollReveal>

            <div className="grid md:grid-cols-3 gap-6 mt-10 mb-20">
              {/* Phase 0: Foundation - Always unlocked */}
              <ScrollReveal delay={100}>
                <Link href="/learn/foundation">
                  <div className="bg-card border border-border rounded-2xl p-6 h-full hover:shadow-luxury hover:-translate-y-0.5 transition-all duration-300 cursor-pointer">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                          <BookOpen className="h-5 w-5 text-blue-500" />
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground font-light">
                            Phase 0
                          </span>
                          <h3 className="font-medium">Foundation</h3>
                        </div>
                      </div>
                      {stats.wordsEncountered >= 100 && (
                        <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                          <Star className="h-3 w-3 text-emerald-500" />
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground font-light mb-4">
                      Learn your first 100 words with images and audio.
                    </p>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        <span className="text-muted-foreground">
                          0-100 words
                        </span>
                      </div>
                      {stats.wordsEncountered > 0 && (
                        <span className="text-xs text-blue-500">
                          {Math.min(stats.wordsEncountered, 100)}/100
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </ScrollReveal>

              {/* Phase 1: Sentences - Unlocks at 100 words */}
              <ScrollReveal delay={200}>
                {stats.wordsEncountered >= 100 ? (
                  <Link href="/learn/sentences">
                    <div className="bg-card border border-border rounded-2xl p-6 h-full hover:shadow-luxury hover:-translate-y-0.5 transition-all duration-300 cursor-pointer">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                            <Brain className="h-5 w-5 text-emerald-500" />
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground font-light">
                              Phase 1
                            </span>
                            <h3 className="font-medium">Sentences</h3>
                          </div>
                        </div>
                        {stats.wordsEncountered >= 300 && (
                          <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                            <Star className="h-3 w-3 text-emerald-500" />
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground font-light mb-4">
                        Read simple sentences with pattern recognition.
                      </p>
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-muted-foreground">
                          100-300 words
                        </span>
                      </div>
                    </div>
                  </Link>
                ) : (
                  <div className="bg-card border border-border rounded-2xl p-6 h-full opacity-60 cursor-not-allowed">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                          <Lock className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground font-light">
                            Phase 1
                          </span>
                          <h3 className="font-medium text-muted-foreground">
                            Sentences
                          </h3>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground font-light mb-4">
                      Read simple sentences with pattern recognition.
                    </p>
                    <div className="flex items-center gap-2 text-sm">
                      <Lock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        Unlocks at 100 words ({100 - stats.wordsEncountered} to
                        go)
                      </span>
                    </div>
                  </div>
                )}
              </ScrollReveal>

              {/* Phase 2: Micro-Stories - Unlocks at 300 words */}
              <ScrollReveal delay={300}>
                {stats.wordsEncountered >= 300 ? (
                  <Link href="/learn/stories">
                    <div className="bg-card border border-border rounded-2xl p-6 h-full hover:shadow-luxury hover:-translate-y-0.5 transition-all duration-300 cursor-pointer">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                            <Sparkles className="h-5 w-5 text-amber-500" />
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground font-light">
                              Phase 2
                            </span>
                            <h3 className="font-medium">Micro-Stories</h3>
                          </div>
                        </div>
                        {stats.wordsEncountered >= 500 && (
                          <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center">
                            <Star className="h-3 w-3 text-amber-500" />
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground font-light mb-4">
                        Read short stories with interactive vocabulary.
                      </p>
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                        <span className="text-muted-foreground">
                          300-500 words
                        </span>
                      </div>
                    </div>
                  </Link>
                ) : (
                  <div className="bg-card border border-border rounded-2xl p-6 h-full opacity-60 cursor-not-allowed">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                          <Lock className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground font-light">
                            Phase 2
                          </span>
                          <h3 className="font-medium text-muted-foreground">
                            Micro-Stories
                          </h3>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground font-light mb-4">
                      Read short stories with interactive vocabulary.
                    </p>
                    <div className="flex items-center gap-2 text-sm">
                      <Lock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        Unlocks at 300 words ({300 - stats.wordsEncountered} to
                        go)
                      </span>
                    </div>
                  </div>
                )}
              </ScrollReveal>
            </div>
          </section>

          {/* ========== VOCABULARY COLLECTION ========== */}
          <section className="mt-20">
            <ScrollReveal>
              <div className="flex items-center justify-between mb-10">
                <SectionHeader
                  eyebrow="Vocabulary"
                  title="Your word collection"
                />
                <Button
                  variant="ghost"
                  onClick={() => setShowVocabulary(!showVocabulary)}
                  className="gap-2 text-muted-foreground hover:text-foreground"
                >
                  {showVocabulary ? (
                    <>
                      <ChevronUp className="h-4 w-4" />
                      Hide words
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4" />
                      Show all
                    </>
                  )}
                </Button>
              </div>
            </ScrollReveal>

            {/* Vocabulary Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                {
                  status: "mastered" as WordStatus,
                  icon: Star,
                  color: "text-yellow-500",
                  bgColor: "bg-yellow-500/10",
                  count: vocabularyStats.mastered,
                },
                {
                  status: "known" as WordStatus,
                  icon: Sparkles,
                  color: "text-emerald-500",
                  bgColor: "bg-emerald-500/10",
                  count: vocabularyStats.known,
                },
                {
                  status: "learning" as WordStatus,
                  icon: Brain,
                  color: "text-blue-500",
                  bgColor: "bg-blue-500/10",
                  count: vocabularyStats.learning,
                },
                {
                  status: "new" as WordStatus,
                  icon: BookOpen,
                  color: "text-muted-foreground",
                  bgColor: "bg-muted",
                  count: vocabularyStats.new,
                },
              ].map((item, i) => (
                <ScrollReveal key={item.status} delay={100 + i * 50}>
                  <button
                    onClick={() =>
                      setVocabFilter(
                        vocabFilter === item.status ? "all" : item.status,
                      )
                    }
                    className={cn(
                      "w-full bg-card border rounded-2xl p-5 text-left transition-all duration-300 hover:shadow-luxury hover:-translate-y-0.5",
                      vocabFilter === item.status
                        ? "border-library-brass"
                        : "border-border",
                    )}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div
                        className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center",
                          item.bgColor,
                        )}
                      >
                        <item.icon className={cn("h-4 w-4", item.color)} />
                      </div>
                      <span className="text-xs font-light tracking-wider uppercase text-muted-foreground">
                        {item.status}
                      </span>
                    </div>
                    <div className="text-2xl font-light">{item.count}</div>
                  </button>
                </ScrollReveal>
              ))}
            </div>

            {/* Progress to Next Level */}
            {proficiencyProgress?.nextLevel && (
              <ScrollReveal>
                <div className="bg-card border border-border rounded-2xl p-6 mb-8">
                  <ProgressBar
                    value={proficiencyProgress.progress}
                    label={`Progress to ${proficiencyProgress.nextLevel}`}
                    valueLabel={`${proficiencyProgress.wordsNeeded} words needed`}
                  />
                </div>
              </ScrollReveal>
            )}

            {/* Word List */}
            {showVocabulary && (
              <ScrollReveal>
                <div className="bg-card border border-border rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-sm text-muted-foreground font-light">
                      {vocabFilter === "all"
                        ? "All Words"
                        : `${vocabFilter.charAt(0).toUpperCase() + vocabFilter.slice(1)} Words`}
                    </span>
                    {vocabFilter !== "all" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setVocabFilter("all")}
                        className="text-muted-foreground"
                      >
                        Clear filter
                      </Button>
                    )}
                  </div>

                  <div className="max-h-96 overflow-y-auto">
                    {vocabularyWords.length === 0 ? (
                      <EmptyState
                        icon={<BookOpen className="h-8 w-8" />}
                        title="No words yet"
                        description="Start a lesson to build your vocabulary collection."
                      />
                    ) : (
                      <div className="space-y-2">
                        {vocabularyWords
                          .filter(
                            (word) =>
                              vocabFilter === "all" ||
                              word.status === vocabFilter,
                          )
                          .map((word) => (
                            <div
                              key={word.id}
                              className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <span
                                  className={cn(
                                    "w-2 h-2 rounded-full",
                                    word.status === "mastered" &&
                                      "bg-yellow-500",
                                    word.status === "known" && "bg-emerald-500",
                                    word.status === "learning" && "bg-blue-500",
                                    word.status === "new" &&
                                      "bg-muted-foreground",
                                  )}
                                />
                                <span className="font-medium">{word.word}</span>
                                {word.lemma && word.lemma !== word.word && (
                                  <span className="text-xs text-muted-foreground">
                                    ({word.lemma})
                                  </span>
                                )}
                              </div>
                              <span
                                className={cn(
                                  "text-xs px-3 py-1 rounded-full font-light",
                                  word.status === "mastered" &&
                                    "bg-yellow-500/10 text-yellow-600",
                                  word.status === "known" &&
                                    "bg-emerald-500/10 text-emerald-600",
                                  word.status === "learning" &&
                                    "bg-blue-500/10 text-blue-600",
                                  word.status === "new" &&
                                    "bg-muted text-muted-foreground",
                                )}
                              >
                                {word.status}
                              </span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              </ScrollReveal>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
