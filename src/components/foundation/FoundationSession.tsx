"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import LoadingScreen from "@/components/ui/LoadingScreen";
import { ArrowLeft, Star, Trophy, BookOpen, Brain, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  FoundationWord,
  SessionResults,
  ExerciseResult,
  PronunciationAttempt,
  WordPerformance,
} from "@/types/foundation-vocabulary";
import { MultimodalWordLearningSession } from "@/components/foundation/MultimodalWordLearning";
import { ExerciseSession } from "@/components/foundation/FoundationExercises";
import { SequentialShadowing } from "@/components/foundation/SequentialShadowing";
import {
  generateFoundationVocabulary,
  createLearningSessions,
  getImageableWords,
} from "@/data/foundation-vocabulary";
import { getVocabularyData } from "@/lib/languages/data-loader";
import {
  CircularProgress,
  CompletionCelebration,
  FadeIn,
} from "@/components/ui/animations";
import { useSoundEffects } from "@/lib/sounds";
import {
  completeSession,
  processSessionResults,
  getFoundationProgress,
} from "@/lib/srs/foundation-srs";
import { createClient } from "@/lib/supabase/client";
import type { SupportedLanguage } from "@/lib/languages";

// Session phases
type SessionPhase =
  | "introduction" // Introduce new words
  | "practice" // Exercise practice
  | "shadowing" // Shadow and record all words
  | "results"; // Show results

interface FoundationSessionPageProps {
  sessionIndex: number;
}

export function FoundationSessionPage({
  sessionIndex,
}: FoundationSessionPageProps) {
  const router = useRouter();
  const supabase = createClient();
  const { playAchieve, playComplete } = useSoundEffects();

  // Dynamic vocabulary loading based on user's target language
  const [allWords, setAllWords] = useState<FoundationWord[]>([]);
  const [sessions, setSessions] = useState<FoundationWord[][]>([]);
  const [loading, setLoading] = useState(true);
  const [targetLanguage, setTargetLanguage] = useState<SupportedLanguage>("fr");
  const [isDynamicSession, setIsDynamicSession] = useState(false);

  // Session state
  const [phase, setPhase] = useState<SessionPhase>("introduction");
  const [learnedWords, setLearnedWords] = useState<FoundationWord[]>([]);
  const [exerciseResults, setExerciseResults] = useState<ExerciseResult[]>([]);
  const [pronunciationAttempts, setPronunciationAttempts] = useState<
    PronunciationAttempt[]
  >([]);
  const [sessionCompleted, setSessionCompleted] = useState(false);

  // Usage limit tracking
  const [canStartSession, setCanStartSession] = useState(true);
  const [usageLimitReached, setUsageLimitReached] = useState(false);

  // Load user's target language and generate vocabulary
  useEffect(() => {
    async function loadLanguageAndVocabulary() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.replace("/auth/login");
          return;
        }

        // Check usage limits before loading session
        try {
          const response = await fetch("/api/usage/check", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionType: "foundation" }),
          });

          if (response.ok) {
            const usageStatus = await response.json();
            if (!usageStatus.allowed) {
              setUsageLimitReached(true);
              setCanStartSession(false);
              setLoading(false);
              return;
            }
          }
        } catch (error) {
          console.error("Error checking usage limits:", error);
          // Allow session to continue on error (fail open)
        }

        // Get user's target language from profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("target_language")
          .eq("id", user.id)
          .single();

        const language = (profile?.target_language ||
          "fr") as SupportedLanguage;
        setTargetLanguage(language);

        // Load vocabulary data for the target language
        const vocabularyData = getVocabularyData(language);
        const generatedWords = generateFoundationVocabulary(
          vocabularyData.words,
          language,
        );

        setAllWords(generatedWords);

        // Check if this is a dynamic SRS-based session (sessionIndex = -1)
        if (sessionIndex === -1) {
          setIsDynamicSession(true);

          // Get next session words based on SRS
          const { getNextSessionWords } =
            await import("@/lib/srs/foundation-srs");
          const sessionData = await getNextSessionWords(
            generatedWords,
            language,
            4,
          );

          // Create a single session with the dynamic words
          setSessions([sessionData.words]);
        } else {
          // Use fixed session system (backward compatibility)
          const generatedSessions = createLearningSessions(generatedWords, 4);
          setSessions(generatedSessions);
        }
      } catch (error) {
        console.error("Error loading vocabulary:", error);
      } finally {
        setLoading(false);
      }
    }

    loadLanguageAndVocabulary();
  }, [supabase, router, sessionIndex]);

  // Get current session words
  const currentSessionIndex = isDynamicSession ? 0 : sessionIndex;
  const currentSession = sessions[currentSessionIndex] || [];

  // Filter imageable words from learned words (for practice phase)
  // Use currentSession for initial setup, but learnedWords after introduction
  const imageableWords = getImageableWords(
    learnedWords.length > 0 ? learnedWords : currentSession,
  );

  console.log("Current session words:", currentSession.length);
  console.log("Learned words:", learnedWords.length);
  console.log("Imageable words for practice:", imageableWords.length);

  // Handle introduction complete
  const handleIntroductionComplete = (
    words: FoundationWord[],
    pronunciationData: PronunciationAttempt[],
  ) => {
    console.log("Introduction complete with words:", words.length);
    console.log("Pronunciation attempts:", pronunciationData.length);
    setLearnedWords(words);
    setPronunciationAttempts(pronunciationData);
    playAchieve();

    // Always go to practice phase for quizzes
    console.log("Moving to practice phase (quizzes)");
    setPhase("practice");
  };

  // Handle practice complete
  const handlePracticeComplete = async (results: ExerciseResult[]) => {
    setExerciseResults(results);
    playAchieve();

    // Move to shadowing phase
    setPhase("shadowing");
  };

  // Handle shadowing complete
  const handleShadowingComplete = async () => {
    playComplete();
    setPhase("results");
    setSessionCompleted(true);

    console.log("=== STARTING SESSION SAVE ===");
    console.log("Learned words:", learnedWords.length);
    console.log("Pronunciation attempts:", pronunciationAttempts.length);
    console.log("Exercise results:", exerciseResults.length);

    // Calculate word-level performance
    const wordPerformances = calculateWordPerformances(
      learnedWords,
      pronunciationAttempts,
      exerciseResults,
    );

    console.log("Calculated word performances:", wordPerformances);

    // Mark session as completed in Supabase
    const wordIds = learnedWords.map((w) => w.id);
    const sessionResults: SessionResults = {
      sessionId: isDynamicSession
        ? "dynamic-session"
        : `session-${sessionIndex}`,
      wordsIntroduced: learnedWords.length,
      exercisesCompleted: exerciseResults.length,
      correctAnswers: exerciseResults.filter((r) => r.correct).length,
      totalExercises: exerciseResults.length,
      accuracy:
        exerciseResults.length > 0
          ? Math.round(
              (exerciseResults.filter((r) => r.correct).length /
                exerciseResults.length) *
                100,
            )
          : 0,
      timeSpentSeconds: 0, // TODO: track actual time
      exerciseResults: exerciseResults,
      pronunciationAttempts: pronunciationAttempts,
      wordPerformances: wordPerformances,
    };

    try {
      console.log("Saving session with word performances:", wordPerformances);

      // Save to database with enhanced word performance tracking
      await saveSessionWithWordPerformances(
        isDynamicSession ? 0 : sessionIndex,
        wordIds,
        sessionResults,
        targetLanguage,
        learnedWords,
        wordPerformances,
      );

      console.log("=== SESSION SAVE COMPLETED SUCCESSFULLY ===");

      // Update profile metrics (streak, sessions_completed, total_practice_minutes)
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select(
              "last_lesson_date, streak, total_practice_minutes, sessions_completed",
            )
            .eq("id", user.id)
            .single();

          if (!profileError && profile) {
            const today = new Date().toISOString().split("T")[0];
            const lastLessonDate = profile?.last_lesson_date;
            const practicedMinutes = 5; // Default 5 minutes for foundation session

            // Calculate new streak
            let newStreak = 1;
            if (lastLessonDate) {
              const lastDate = new Date(lastLessonDate);
              const todayDate = new Date(today);
              const daysDiff = Math.floor(
                (todayDate.getTime() - lastDate.getTime()) /
                  (1000 * 60 * 60 * 24),
              );

              if (daysDiff === 0) {
                // Same day - maintain streak
                newStreak = profile?.streak || 1;
              } else if (daysDiff === 1) {
                // Consecutive day - increment streak
                newStreak = (profile?.streak || 0) + 1;
              }
              // daysDiff > 1 means streak resets to 1
            }

            const { error: updateError } = await supabase
              .from("profiles")
              .update({
                streak: newStreak,
                last_lesson_date: today,
                total_practice_minutes:
                  (profile?.total_practice_minutes || 0) + practicedMinutes,
                sessions_completed: (profile?.sessions_completed || 0) + 1,
              })
              .eq("id", user.id);

            if (updateError) {
              console.error("Error updating profile metrics:", updateError);
            } else {
              console.log("Profile metrics updated successfully:", {
                streak: newStreak,
                total_practice_minutes:
                  (profile?.total_practice_minutes || 0) + practicedMinutes,
                sessions_completed: (profile?.sessions_completed || 0) + 1,
              });
            }

            // Insert lesson record for average score tracking
            const lessonId = `foundation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const { error: lessonError } = await supabase
              .from("lessons")
              .insert({
                id: lessonId,
                user_id: user.id,
                title: isDynamicSession
                  ? "Foundation Session"
                  : `Foundation Session ${sessionIndex + 1}`,
                target_text: learnedWords.map((w) => w.word).join(", "),
                translation: learnedWords.map((w) => w.translation).join(", "),
                language: targetLanguage,
                level: "A1",
                completed: true,
                completed_at: new Date().toISOString(),
                final_comprehension_score: sessionResults.accuracy,
                total_words: learnedWords.length,
              });

            if (lessonError) {
              console.error("Error inserting lesson record:", lessonError);
            } else {
              console.log(
                "Lesson record inserted with score:",
                sessionResults.accuracy,
              );
            }
          }
        }
      } catch (err) {
        console.error("Failed to update profile metrics:", err);
      }

      // Track usage for free tier limits
      try {
        await fetch("/api/usage/increment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionType: "foundation" }),
        });
      } catch (err) {
        console.error("Failed to track foundation session usage:", err);
      }
    } catch (error) {
      console.error("=== ERROR COMPLETING SESSION ===", error);
      alert(
        `Failed to save session: ${error instanceof Error ? error.message : "Unknown error"}. Please check the console for details.`,
      );
    }
  };

  // Calculate performance for each word
  const calculateWordPerformances = (
    words: FoundationWord[],
    pronunciations: PronunciationAttempt[],
    exercises: ExerciseResult[],
  ): WordPerformance[] => {
    return words.map((word) => {
      // Find pronunciation attempt for this word
      const pronunciation = pronunciations.find((p) => p.wordId === word.id);

      // Find all exercise results for this word
      const wordExercises = exercises.filter((e) => e.wordId === word.id);
      const correctCount = wordExercises.filter((e) => e.correct).length;
      const accuracy =
        wordExercises.length > 0
          ? (correctCount / wordExercises.length) * 100
          : 0;

      return {
        wordId: word.id,
        word: word.word,
        pronunciationAttempts: pronunciation?.attempts || 0,
        pronunciationSuccess: pronunciation?.success || false,
        exerciseResults: wordExercises,
        correctCount,
        totalExercises: wordExercises.length,
        accuracy: Math.round(accuracy),
      };
    });
  };

  // Save session with enhanced word performance tracking
  const saveSessionWithWordPerformances = async (
    sessionIndex: number,
    wordIds: string[],
    sessionResults: SessionResults,
    language: string,
    words: FoundationWord[],
    wordPerformances: WordPerformance[],
  ) => {
    console.log("Starting saveSessionWithWordPerformances...");

    try {
      // Import the enhanced save function
      const { saveSessionWordsWithPerformance, completeSession } =
        await import("@/lib/srs/foundation-srs");

      console.log("Calling completeSession...");
      // Save progress to foundation_progress table
      const progress = await completeSession(
        sessionIndex,
        wordIds,
        sessionResults,
        language,
        words,
        true, // skipWordSave - we're using the enhanced method below
      );
      console.log("Foundation progress saved:", progress);

      console.log("Calling saveSessionWordsWithPerformance...");
      // Save word-level performance to user_words and word_interactions tables
      await saveSessionWordsWithPerformance(words, wordPerformances, language);
      console.log("Word performances saved successfully");
    } catch (error) {
      console.error("Error in saveSessionWithWordPerformances:", error);
      throw error; // Re-throw to be caught by the caller
    }
  };

  // Calculate session stats
  const correctCount = exerciseResults.filter((r) => r.correct).length;
  const accuracy =
    exerciseResults.length > 0
      ? Math.round((correctCount / exerciseResults.length) * 100)
      : 0;

  if (loading) {
    return <LoadingScreen />;
  }

  // Usage limit reached
  if (usageLimitReached) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-center">Daily Limit Reached</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              You've completed all your foundation vocabulary sessions for
              today. Come back tomorrow to continue learning, or upgrade to
              Diver for unlimited access.
            </p>
            <div className="flex flex-col gap-2">
              <Button
                onClick={() => router.push("/checkout?tier=diver")}
                className="w-full"
              >
                Upgrade to Diver
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/learn/foundation")}
                className="w-full"
              >
                Back to Foundation
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Results Phase
  if (phase === "results") {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b border-border bg-card">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/learn/foundation")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-medium">Session Complete</h1>
            <div className="w-10" />
          </div>
        </div>

        {/* Results Content */}
        <div className="max-w-2xl mx-auto px-4 py-8">
          <FadeIn>
            <div className="text-center mb-8">
              <CompletionCelebration
                show={sessionCompleted}
                percentage={accuracy}
              />

              <div className="mt-6">
                <CircularProgress
                  value={accuracy}
                  max={100}
                  size={160}
                  strokeWidth={12}
                  color={
                    accuracy >= 80
                      ? "#22c55e"
                      : accuracy >= 60
                        ? "#eab308"
                        : "#ef4444"
                  }
                />
              </div>

              <h2 className="text-2xl font-bold mt-6">
                {accuracy >= 90
                  ? "Excellent!"
                  : accuracy >= 70
                    ? "Great Job!"
                    : "Keep Practicing!"}
              </h2>
              <p className="text-muted-foreground">
                You scored {accuracy}% on this session
              </p>
            </div>
          </FadeIn>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <FadeIn delay={100}>
              <Card>
                <CardContent className="pt-6 text-center">
                  <BookOpen className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">{learnedWords.length}</p>
                  <p className="text-sm text-muted-foreground">Words Learned</p>
                </CardContent>
              </Card>
            </FadeIn>

            <FadeIn delay={200}>
              <Card>
                <CardContent className="pt-6 text-center">
                  <Target className="w-8 h-8 mx-auto mb-2 text-green-500" />
                  <p className="text-2xl font-bold">{correctCount}</p>
                  <p className="text-sm text-muted-foreground">Correct</p>
                </CardContent>
              </Card>
            </FadeIn>

            <FadeIn delay={300}>
              <Card>
                <CardContent className="pt-6 text-center">
                  <Brain className="w-8 h-8 mx-auto mb-2 text-amber-500" />
                  <p className="text-2xl font-bold">{exerciseResults.length}</p>
                  <p className="text-sm text-muted-foreground">Exercises</p>
                </CardContent>
              </Card>
            </FadeIn>
          </div>

          {/* Words Learned List */}
          <FadeIn delay={400}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-500" />
                  Words You've Learned
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {learnedWords.map((word) => (
                    <span
                      key={word.id}
                      className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium"
                    >
                      {word.word} - {word.translation}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          </FadeIn>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 mt-8">
            <FadeIn delay={500}>
              <Button
                size="lg"
                className="w-full"
                onClick={() => {
                  if (isDynamicSession) {
                    // Return to foundation page for next dynamic session
                    router.push("/learn/foundation");
                  } else {
                    // Continue to next numbered session
                    if (sessionIndex < sessions.length - 1) {
                      router.push(
                        `/learn/foundation/session/${sessionIndex + 1}`,
                      );
                    } else {
                      router.push("/learn/foundation");
                    }
                  }
                }}
              >
                {isDynamicSession || sessionIndex >= sessions.length - 1
                  ? "Back to Foundation"
                  : "Continue to Next Session"}
              </Button>
            </FadeIn>

            <FadeIn delay={600}>
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={() => {
                  setPhase("introduction");
                  setLearnedWords([]);
                  setExerciseResults([]);
                  setSessionCompleted(false);
                }}
              >
                Practice Again
              </Button>
            </FadeIn>
          </div>
        </div>
      </div>
    );
  }

  // Introduction, Practice, or Shadowing Phase
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/learn/foundation")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-medium">
            {isDynamicSession
              ? "Learning Session"
              : `Session ${sessionIndex + 1}`}{" "}
            -{" "}
            {phase === "introduction"
              ? "New Words"
              : phase === "practice"
                ? "Practice"
                : "Review"}
          </h1>
          <div className="w-10" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {phase === "introduction" ? (
          <MultimodalWordLearningSession
            words={currentSession}
            onComplete={handleIntroductionComplete}
            language={targetLanguage}
          />
        ) : phase === "practice" ? (
          <ExerciseSession
            words={learnedWords}
            allWords={allWords}
            onComplete={handlePracticeComplete}
            language={targetLanguage}
          />
        ) : phase === "shadowing" ? (
          <SequentialShadowing
            words={learnedWords}
            onComplete={handleShadowingComplete}
            language={targetLanguage}
          />
        ) : null}
      </div>
    </div>
  );
}
