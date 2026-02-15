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
  Ear,
  Layers,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  SimpleSentence,
  SentencePattern,
  SentenceMiningResult,
  PatternRecognitionResult,
  ListeningFirstResult,
  SentenceTransitionSessionResult,
  ListeningImageOption,
} from "@/types/sentence-transition";
import { SentenceMiningExercise } from "./SentenceMining";
import { PatternRecognitionExercise } from "./PatternRecognition";
import {
  ListeningFirstExercise,
  createImageOptionsFromSentence,
} from "./ListeningFirst";
import {
  CircularProgress,
  CompletionCelebration,
  FadeIn,
} from "@/components/ui/animations";
import { useSoundEffects } from "@/lib/sounds";
import {
  SIMPLE_SENTENCES,
  SENTENCE_PATTERNS,
  getPatternById,
  getPatternsByDifficulty,
} from "@/data/sentence-patterns";

// ============================================================================
// SESSION TYPES
// ============================================================================

type ExerciseType =
  | "sentence-mining"
  | "pattern-recognition"
  | "listening-first";

interface SessionExercise {
  type: ExerciseType;
  sentence?: SimpleSentence;
  pattern?: SentencePattern;
  mode: string;
}

type SessionPhase = "warmup" | "exercises" | "results";

// ============================================================================
// SENTENCE TRANSITION SESSION
// Main session component that orchestrates all exercise types
// ============================================================================

interface SentenceTransitionSessionProps {
  sessionNumber: number;
  knownWordLemmas?: string[]; // Words user has already learned
  onComplete?: (results: SentenceTransitionSessionResult) => void;
}

export function SentenceTransitionSession({
  sessionNumber,
  knownWordLemmas = [],
  onComplete,
}: SentenceTransitionSessionProps) {
  const router = useRouter();
  const { playAchieve, playComplete } = useSoundEffects();

  // Session state
  const [phase, setPhase] = useState<SessionPhase>("warmup");
  const [exercises, setExercises] = useState<SessionExercise[]>([]);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // Results tracking
  const [sentenceMiningResults, setSentenceMiningResults] = useState<
    SentenceMiningResult[]
  >([]);
  const [patternResults, setPatternResults] = useState<
    PatternRecognitionResult[]
  >([]);
  const [listeningResults, setListeningResults] = useState<
    ListeningFirstResult[]
  >([]);
  const [newWordsLearned, setNewWordsLearned] = useState<string[]>([]);

  // Image options for listening exercises
  const [currentImageOptions, setCurrentImageOptions] = useState<{
    options: ListeningImageOption[];
    correctIndex: number;
  } | null>(null);

  // Generate session exercises on mount
  useEffect(() => {
    const sessionExercises = generateSessionExercises(sessionNumber);
    setExercises(sessionExercises);
    setLoading(false);
  }, [sessionNumber]);

  // Prepare image options when entering a listening exercise
  useEffect(() => {
    const currentExercise = exercises[currentExerciseIndex];
    if (
      currentExercise?.type === "listening-first" &&
      currentExercise.sentence
    ) {
      const imageData = createImageOptionsFromSentence(
        currentExercise.sentence,
        SIMPLE_SENTENCES,
      );
      setCurrentImageOptions(imageData);
    }
  }, [currentExerciseIndex, exercises]);

  // Handle exercise completion
  const handleSentenceMiningResult = (result: SentenceMiningResult) => {
    setSentenceMiningResults((prev) => [...prev, result]);
    if (result.newWordLearned) {
      setNewWordsLearned((prev) => [...prev, result.newWordLearned!]);
    }
    goToNextExercise();
  };

  const handlePatternResult = (result: PatternRecognitionResult) => {
    setPatternResults((prev) => [...prev, result]);
    goToNextExercise();
  };

  const handleListeningResult = (result: ListeningFirstResult) => {
    setListeningResults((prev) => [...prev, result]);
    goToNextExercise();
  };

  // Move to next exercise or complete
  const goToNextExercise = () => {
    if (currentExerciseIndex < exercises.length - 1) {
      playAchieve();
      setCurrentExerciseIndex(currentExerciseIndex + 1);
    } else {
      playComplete();
      setPhase("results");
    }
  };

  // Skip warmup
  const handleStartExercises = () => {
    setPhase("exercises");
  };

  // Calculate final results
  const calculateResults = (): SentenceTransitionSessionResult => {
    const totalSentenceMining = sentenceMiningResults.length;
    const correctSentenceMining = sentenceMiningResults.filter(
      (r) => r.correct,
    ).length;

    const totalPatterns = patternResults.length;
    const correctPatterns = patternResults.filter((r) => r.correct).length;

    const totalListening = listeningResults.length;
    const correctListening = listeningResults.filter((r) => r.correct).length;

    const total = totalSentenceMining + totalPatterns + totalListening;
    const correct = correctSentenceMining + correctPatterns + correctListening;

    return {
      sentencesMastered: correctSentenceMining,
      patternsRecognized: correctPatterns,
      listeningAccuracy:
        totalListening > 0
          ? Math.round((correctListening / totalListening) * 100)
          : 0,
      overallAccuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
      sentenceMiningResults,
      patternResults,
      listeningResults,
      newWordsLearned,
    };
  };

  const results = phase === "results" ? calculateResults() : null;
  const progressPercent =
    exercises.length > 0
      ? Math.round((currentExerciseIndex / exercises.length) * 100)
      : 0;

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ===== WARMUP PHASE =====
  if (phase === "warmup") {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b border-border bg-card">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/learn")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-medium">Sentence Session {sessionNumber}</h1>
            <div className="w-10" />
          </div>
        </div>

        {/* Warmup Content */}
        <div className="max-w-2xl mx-auto px-4 py-12">
          <FadeIn>
            <div className="text-center mb-8">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Layers className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">
                Time to Build Sentences!
              </h2>
              <p className="text-muted-foreground">
                You've mastered 100+ words. Now let's combine them into
                sentences!
              </p>
            </div>
          </FadeIn>

          {/* Session overview cards */}
          <div className="grid gap-4 mb-8">
            <FadeIn delay={100}>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <Ear className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-medium mb-1">Listen First</h3>
                      <p className="text-sm text-muted-foreground">
                        Hear sentences before reading them to build natural
                        comprehension
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </FadeIn>

            <FadeIn delay={200}>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                      <Layers className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <h3 className="font-medium mb-1">Spot Patterns</h3>
                      <p className="text-sm text-muted-foreground">
                        Recognize grammar patterns naturally through repeated
                        exposure
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </FadeIn>

            <FadeIn delay={300}>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h3 className="font-medium mb-1">Learn in Context</h3>
                      <p className="text-sm text-muted-foreground">
                        Each sentence uses words you know + 0-1 new words
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </FadeIn>
          </div>

          {/* Start button */}
          <FadeIn delay={400}>
            <Button onClick={handleStartExercises} size="lg" className="w-full">
              Start Session ({exercises.length} exercises)
            </Button>
          </FadeIn>
        </div>
      </div>
    );
  }

  // ===== RESULTS PHASE =====
  if (phase === "results" && results) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b border-border bg-card">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/learn")}
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
                show={true}
                percentage={results.overallAccuracy}
              />

              <div className="mt-6">
                <CircularProgress
                  value={results.overallAccuracy}
                  max={100}
                  size={160}
                  strokeWidth={12}
                  color={
                    results.overallAccuracy >= 80
                      ? "#22c55e"
                      : results.overallAccuracy >= 60
                        ? "#eab308"
                        : "#ef4444"
                  }
                />
              </div>

              <h2 className="text-2xl font-bold mt-6">
                {results.overallAccuracy >= 90
                  ? "Excellent!"
                  : results.overallAccuracy >= 70
                    ? "Great Job!"
                    : "Keep Practicing!"}
              </h2>
              <p className="text-muted-foreground">
                You scored {results.overallAccuracy}% overall
              </p>
            </div>
          </FadeIn>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <FadeIn delay={100}>
              <Card>
                <CardContent className="pt-6 text-center">
                  <BookOpen className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">
                    {results.sentencesMastered}
                  </p>
                  <p className="text-sm text-muted-foreground">Sentences</p>
                </CardContent>
              </Card>
            </FadeIn>

            <FadeIn delay={200}>
              <Card>
                <CardContent className="pt-6 text-center">
                  <Layers className="w-8 h-8 mx-auto mb-2 text-amber-500" />
                  <p className="text-2xl font-bold">
                    {results.patternsRecognized}
                  </p>
                  <p className="text-sm text-muted-foreground">Patterns</p>
                </CardContent>
              </Card>
            </FadeIn>

            <FadeIn delay={300}>
              <Card>
                <CardContent className="pt-6 text-center">
                  <Ear className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                  <p className="text-2xl font-bold">
                    {results.listeningAccuracy}%
                  </p>
                  <p className="text-sm text-muted-foreground">Listening</p>
                </CardContent>
              </Card>
            </FadeIn>
          </div>

          {/* New Words Learned */}
          {results.newWordsLearned.length > 0 && (
            <FadeIn delay={400}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-amber-500" />
                    New Words Learned
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {results.newWordsLearned.map((word, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 rounded-full text-sm font-medium"
                      >
                        {word}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </FadeIn>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 mt-8">
            <FadeIn delay={500}>
              <Button
                size="lg"
                className="w-full"
                onClick={() => {
                  onComplete?.(results);
                  router.push(`/learn/sentences/session/${sessionNumber + 1}`);
                }}
              >
                Continue to Next Session
              </Button>
            </FadeIn>

            <FadeIn delay={600}>
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={() => router.push("/learn")}
              >
                Back to Learning
              </Button>
            </FadeIn>
          </div>
        </div>
      </div>
    );
  }

  // ===== EXERCISES PHASE =====
  const currentExercise = exercises[currentExerciseIndex];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header with progress */}
      <div className="border-b border-border bg-card">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/learn")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <span className="text-sm text-muted-foreground">
              {currentExerciseIndex + 1} of {exercises.length}
            </span>
            <div className="w-10" />
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>
      </div>

      {/* Exercise content */}
      <div className="flex-1 max-w-2xl mx-auto w-full">
        {currentExercise.type === "sentence-mining" &&
          currentExercise.sentence && (
            <SentenceMiningExercise
              key={currentExercise.sentence.id}
              sentence={currentExercise.sentence}
              mode={
                currentExercise.mode as
                  | "comprehension"
                  | "word-identification"
                  | "translation"
              }
              onResult={handleSentenceMiningResult}
            />
          )}

        {currentExercise.type === "pattern-recognition" &&
          currentExercise.pattern && (
            <PatternRecognitionExercise
              key={currentExercise.pattern.id}
              pattern={currentExercise.pattern}
              mode={currentExercise.mode as "observe" | "complete" | "generate"}
              onResult={handlePatternResult}
            />
          )}

        {currentExercise.type === "listening-first" &&
          currentExercise.sentence &&
          currentImageOptions && (
            <ListeningFirstExercise
              key={currentExercise.sentence.id}
              sentence={currentExercise.sentence}
              imageOptions={currentImageOptions.options}
              correctImageIndex={currentImageOptions.correctIndex}
              onResult={handleListeningResult}
            />
          )}
      </div>
    </div>
  );
}

// ============================================================================
// HELPER: Generate exercises for a session
// ============================================================================

function generateSessionExercises(sessionNumber: number): SessionExercise[] {
  const exercises: SessionExercise[] = [];

  // Get available content
  const sentences = [...SIMPLE_SENTENCES].sort(() => Math.random() - 0.5);
  const patterns = getPatternsByDifficulty();

  // Session structure:
  // 1. Start with 2-3 listening-first exercises (build audio comprehension)
  // 2. Pattern recognition for 1 pattern
  // 3. Sentence mining for related sentences
  // 4. More listening exercises
  // 5. Maybe another pattern

  // 1. Listening exercises (3)
  const listeningSentences = sentences.slice(0, 3);
  listeningSentences.forEach((sentence) => {
    exercises.push({
      type: "listening-first",
      sentence,
      mode: "listen",
    });
  });

  // 2. Pattern recognition (observe mode)
  const patternIndex = (sessionNumber - 1) % patterns.length;
  const pattern = patterns[patternIndex];
  exercises.push({
    type: "pattern-recognition",
    pattern,
    mode: "observe",
  });

  // 3. Sentence mining (comprehension mode) - 3 sentences
  const miningSentences = sentences.slice(3, 6);
  miningSentences.forEach((sentence) => {
    exercises.push({
      type: "sentence-mining",
      sentence,
      mode: "comprehension",
    });
  });

  // 4. More listening (2)
  const moreListening = sentences.slice(6, 8);
  moreListening.forEach((sentence) => {
    exercises.push({
      type: "listening-first",
      sentence,
      mode: "listen",
    });
  });

  // 5. Translation exercise (1)
  if (sentences[8]) {
    exercises.push({
      type: "sentence-mining",
      sentence: sentences[8],
      mode: "translation",
    });
  }

  return exercises;
}
