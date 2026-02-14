"use client";

import React, { useState, useEffect } from "react";
import {
  Lesson,
  Exercise,
  ExerciseAttempt,
  ExerciseType,
} from "@/types/lesson";
import {
  ArrowRight,
  CheckCircle2,
  XCircle,
  BookOpen,
  Brain,
  Zap,
  Trophy,
  RefreshCw,
  Lightbulb,
  Volume2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { generateExercisesForLesson } from "@/lib/lesson/engine";

interface InteractiveExercisesPhaseProps {
  lesson: Lesson;
  onExerciseAttempt: (attempt: ExerciseAttempt) => void;
  onPhaseComplete: () => void;
}

interface ExerciseResult {
  exerciseId: string;
  isCorrect: boolean;
  selectedAnswer: number;
  correctAnswer: number;
}

export function InteractiveExercisesPhase({
  lesson,
  onExerciseAttempt,
  onPhaseComplete,
}: InteractiveExercisesPhaseProps) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<ExerciseResult[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [loadError, setLoadError] = useState<string | null>(null);

  // Generate exercises on mount using OpenAI API
  useEffect(() => {
    const fetchExercises = async () => {
      try {
        const response = await fetch("/api/lesson/exercises", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lessonId: lesson.id,
            targetText: lesson.targetText,
            translation: lesson.translation,
            level: lesson.level,
            count: 6,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to generate exercises");
        }

        const data = await response.json();
        setExercises(data.exercises);
      } catch (error) {
        console.error("Error fetching exercises:", error);
        setLoadError("Failed to generate exercises. Using fallback...");
        // Fallback to local generation
        const generated = generateExercisesForLesson(lesson, 6);
        setExercises(generated);
      }
    };

    fetchExercises();
  }, [lesson]);

  const currentExercise = exercises[currentIndex];
  const isLastExercise = currentIndex === exercises.length - 1;
  const isComplete = currentIndex >= exercises.length;
  const score = results.filter((r) => r.isCorrect).length;
  const progress = (currentIndex / Math.max(exercises.length, 1)) * 100;

  const handleAnswer = (answerIndex: number) => {
    if (showFeedback) return;

    setSelectedAnswer(answerIndex);
    setShowFeedback(true);

    const isCorrect = answerIndex === currentExercise.correctAnswer;
    const timeSpent = Date.now() - startTime;

    const result: ExerciseResult = {
      exerciseId: currentExercise.id,
      isCorrect,
      selectedAnswer: answerIndex,
      correctAnswer: currentExercise.correctAnswer,
    };

    setResults((prev) => [...prev, result]);

    const attempt: ExerciseAttempt = {
      exerciseId: currentExercise.id,
      selectedAnswer: answerIndex,
      isCorrect,
      timeSpentMs: timeSpent,
    };

    onExerciseAttempt(attempt);
  };

  const handleNext = () => {
    if (isLastExercise) {
      setCurrentIndex(exercises.length); // Move to complete state
    } else {
      setCurrentIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setShowFeedback(false);
      setStartTime(Date.now());
    }
  };

  const getExerciseIcon = (type: ExerciseType) => {
    switch (type) {
      case "multiple-choice":
        return <Brain className="h-4 w-4 text-library-brass" />;
      case "word-definition":
        return <BookOpen className="h-4 w-4 text-library-brass" />;
      case "fill-blank":
        return <Zap className="h-4 w-4 text-library-brass" />;
      default:
        return <Brain className="h-4 w-4 text-library-brass" />;
    }
  };

  const getExerciseTypeLabel = (type: ExerciseType) => {
    switch (type) {
      case "multiple-choice":
        return "Comprehension";
      case "word-definition":
        return "Vocabulary";
      case "fill-blank":
        return "Fill in the Blank";
      case "grammar-choice":
        return "Grammar";
      case "word-match":
        return "Matching";
      case "sentence-order":
        return "Sentence Order";
      case "listening-select":
        return "Listening";
      default:
        return "Exercise";
    }
  };

  // Loading state
  if (exercises.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-library-brass" />
          <p className="text-muted-foreground font-light">
            Generating exercises...
          </p>
        </div>
      </div>
    );
  }

  // Complete state
  if (isComplete) {
    const percentage = Math.round((score / exercises.length) * 100);

    return (
      <div className="space-y-6">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-library-brass/10 text-library-brass">
            <Trophy className="h-4 w-4" />
            <span className="text-sm font-medium">Exercises Complete!</span>
          </div>
        </div>

        <div className="bg-card border border-library-brass/20 rounded-2xl p-8 text-center space-y-4">
          <div className="text-6xl font-light text-library-brass">
            {percentage}%
          </div>
          <div className="text-xl font-medium">
            {score} of {exercises.length} correct
          </div>
          <p className="text-muted-foreground font-light">
            {percentage >= 80
              ? "Excellent work! You've mastered this content."
              : percentage >= 60
                ? "Good job! Keep practicing to improve."
                : "Nice effort! Review the lesson to strengthen your understanding."}
          </p>
        </div>

        {/* Results Summary */}
        <div className="bg-card border border-border rounded-2xl">
          <div className="p-6 border-b border-border">
            <h2 className="text-lg font-light">Results Summary</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
              <div className="p-3 sm:p-4 bg-green-50 dark:bg-green-950/30 rounded-xl">
                <div className="text-xl sm:text-2xl font-bold text-green-600">
                  {score}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground font-light">
                  Correct
                </div>
              </div>
              <div className="p-3 sm:p-4 bg-red-50 dark:bg-red-950/30 rounded-xl">
                <div className="text-xl sm:text-2xl font-bold text-red-600">
                  {exercises.length - score}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground font-light">
                  Incorrect
                </div>
              </div>
              <div className="p-3 sm:p-4 bg-library-brass/10 rounded-xl">
                <div className="text-xl sm:text-2xl font-bold text-library-brass">
                  {exercises.length}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground font-light">
                  Total
                </div>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={onPhaseComplete}
          className="w-full py-4 px-8 rounded-xl font-medium flex items-center justify-center gap-2 bg-library-brass hover:bg-library-brass/90 text-background transition-colors"
        >
          Continue to Final Assessment
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    );
  }

  // Active exercise
  return (
    <div className="space-y-6">
      {/* Phase Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-library-brass/10 text-library-brass">
          <Brain className="h-4 w-4" />
          <span className="text-sm font-medium">
            Phase 5: Practice Exercises
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-light tracking-tight">
          Test Your{" "}
          <span className="font-serif italic text-library-brass">
            Understanding
          </span>
        </h1>
      </div>

      {/* Progress */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium">Progress</span>
          <span className="text-sm text-muted-foreground font-light">
            {currentIndex + 1} / {exercises.length}
          </span>
        </div>
        <div className="w-full bg-background rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-library-brass transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Score indicator */}
        <div className="flex items-center justify-end gap-4 mt-3 text-sm">
          <span className="flex items-center gap-1 text-green-600">
            <CheckCircle2 className="h-4 w-4" /> {score}
          </span>
          <span className="flex items-center gap-1 text-red-600">
            <XCircle className="h-4 w-4" /> {results.length - score}
          </span>
        </div>
      </div>

      {/* Current Exercise */}
      <div
        className={cn(
          "bg-card border rounded-2xl",
          showFeedback &&
            selectedAnswer !== null &&
            (selectedAnswer === currentExercise.correctAnswer
              ? "border-green-500/50"
              : "border-red-500/50"),
          !showFeedback && "border-border",
        )}
      >
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-library-brass/10 flex items-center justify-center">
                {getExerciseIcon(currentExercise.type)}
              </div>
              <span className="font-light">
                {getExerciseTypeLabel(currentExercise.type)}
              </span>
            </div>
            {currentExercise.targetWord && (
              <span className="px-3 py-1 bg-library-brass/10 rounded-full text-sm font-medium text-library-brass">
                {currentExercise.targetWord}
              </span>
            )}
          </div>
        </div>
        <div className="p-6 space-y-6">
          {/* Question */}
          <div className="text-lg font-medium text-center py-4">
            {currentExercise.question}
          </div>

          {/* Options */}
          <div className="space-y-3">
            {currentExercise.options.map((option, index) => {
              const isSelected = selectedAnswer === index;
              const isCorrect = index === currentExercise.correctAnswer;
              const showCorrect = showFeedback && isCorrect;
              const showIncorrect = showFeedback && isSelected && !isCorrect;

              return (
                <button
                  key={index}
                  className={cn(
                    "w-full py-4 px-4 rounded-xl border text-left whitespace-normal flex items-center gap-3 transition-colors",
                    isSelected &&
                      !showFeedback &&
                      "border-library-brass bg-library-brass/5",
                    showCorrect &&
                      "border-green-500 bg-green-50 dark:bg-green-950/30",
                    showIncorrect &&
                      "border-red-500 bg-red-50 dark:bg-red-950/30",
                    !isSelected &&
                      !showCorrect &&
                      !showIncorrect &&
                      "border-border hover:bg-card/80",
                    showFeedback && "cursor-default",
                  )}
                  onClick={() => handleAnswer(index)}
                  disabled={showFeedback}
                >
                  <span
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm",
                      isSelected &&
                        !showFeedback &&
                        "bg-library-brass text-background",
                      showCorrect && "bg-green-500 text-white",
                      showIncorrect && "bg-red-500 text-white",
                      !isSelected &&
                        !showCorrect &&
                        !showIncorrect &&
                        "bg-background border border-border",
                    )}
                  >
                    {showCorrect ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : showIncorrect ? (
                      <XCircle className="h-4 w-4" />
                    ) : (
                      String.fromCharCode(65 + index)
                    )}
                  </span>
                  <span className="font-light">{option}</span>
                </button>
              );
            })}
          </div>

          {/* Feedback */}
          {showFeedback && (
            <div
              className={cn(
                "p-4 rounded-xl border",
                selectedAnswer === currentExercise.correctAnswer
                  ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
                  : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800",
              )}
            >
              <div className="flex items-start gap-3">
                {selectedAnswer === currentExercise.correctAnswer ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <p
                    className={cn(
                      "font-medium",
                      selectedAnswer === currentExercise.correctAnswer
                        ? "text-green-800 dark:text-green-200"
                        : "text-red-800 dark:text-red-200",
                    )}
                  >
                    {selectedAnswer === currentExercise.correctAnswer
                      ? "Correct!"
                      : "Not quite right"}
                  </p>
                  {currentExercise.explanation && (
                    <p className="text-sm text-muted-foreground font-light mt-1">
                      {currentExercise.explanation}
                    </p>
                  )}
                  {currentExercise.grammarNote && (
                    <div className="mt-2 flex items-start gap-2 text-sm">
                      <Lightbulb className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      <span className="font-light">
                        {currentExercise.grammarNote}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Next Button */}
          {showFeedback && (
            <button
              onClick={handleNext}
              className="w-full py-4 px-8 rounded-xl font-medium flex items-center justify-center gap-2 bg-library-brass hover:bg-library-brass/90 text-background transition-colors"
            >
              {isLastExercise ? "See Results" : "Next Question"}
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
