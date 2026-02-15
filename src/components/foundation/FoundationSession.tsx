"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Star,
  Trophy,
  BookOpen,
  Brain,
  Target,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  FoundationWord,
  SessionResults,
  ExerciseResult,
} from "@/types/foundation-vocabulary";
import { WordIntroductionSession } from "@/components/foundation/WordIntroduction";
import { ExerciseSession } from "@/components/foundation/FoundationExercises";
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

  // Session state
  const [phase, setPhase] = useState<SessionPhase>("introduction");
  const [learnedWords, setLearnedWords] = useState<FoundationWord[]>([]);
  const [exerciseResults, setExerciseResults] = useState<ExerciseResult[]>([]);
  const [sessionCompleted, setSessionCompleted] = useState(false);

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
        );
        const generatedSessions = createLearningSessions(generatedWords, 4);

        setAllWords(generatedWords);
        setSessions(generatedSessions);
      } catch (error) {
        console.error("Error loading vocabulary:", error);
      } finally {
        setLoading(false);
      }
    }

    loadLanguageAndVocabulary();
  }, [supabase, router]);

  // Get current session words
  const currentSession = sessions[sessionIndex] || [];
  const imageableWords = getImageableWords(currentSession);

  // Handle introduction complete
  const handleIntroductionComplete = (words: FoundationWord[]) => {
    setLearnedWords(words);
    playAchieve();
    setPhase("practice");
  };

  // Handle practice complete
  const handlePracticeComplete = (results: ExerciseResult[]) => {
    setExerciseResults(results);
    playComplete();
    setPhase("results");
    setSessionCompleted(true);

    // Save results to SRS system
    processSessionResults(currentSession, results);

    // Mark session as completed
    const wordIds = learnedWords.map((w) => w.id);
    const sessionResults: SessionResults = {
      sessionId: `session-${sessionIndex}`,
      wordsIntroduced: learnedWords.length,
      exercisesCompleted: results.length,
      correctAnswers: results.filter((r) => r.correct).length,
      totalExercises: results.length,
      accuracy:
        results.length > 0
          ? Math.round(
              (results.filter((r) => r.correct).length / results.length) * 100,
            )
          : 0,
      timeSpentSeconds: 0, // TODO: track actual time
      exerciseResults: results,
    };

    completeSession(sessionIndex, wordIds, sessionResults);
  };

  // Calculate session stats
  const correctCount = exerciseResults.filter((r) => r.correct).length;
  const accuracy =
    exerciseResults.length > 0
      ? Math.round((correctCount / exerciseResults.length) * 100)
      : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
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
              {sessionIndex < sessions.length - 1 ? (
                <Button
                  size="lg"
                  className="w-full"
                  onClick={() =>
                    router.push(`/learn/foundation/session/${sessionIndex + 1}`)
                  }
                >
                  Continue to Next Session
                </Button>
              ) : (
                <Button
                  size="lg"
                  className="w-full"
                  onClick={() => router.push("/learn/foundation")}
                >
                  Complete Foundation
                </Button>
              )}
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

  // Introduction or Practice Phase
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
            Session {sessionIndex + 1} -{" "}
            {phase === "introduction" ? "New Words" : "Practice"}
          </h1>
          <div className="w-10" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {phase === "introduction" ? (
          <WordIntroductionSession
            words={currentSession}
            onComplete={handleIntroductionComplete}
            language={targetLanguage}
          />
        ) : (
          <ExerciseSession
            words={imageableWords}
            allWords={allWords.filter((w) => w.imageability !== "low")}
            onComplete={handlePracticeComplete}
            language={targetLanguage}
          />
        )}
      </div>
    </div>
  );
}
