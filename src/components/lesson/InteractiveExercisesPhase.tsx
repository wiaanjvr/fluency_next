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
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { generateExercisesForLesson } from "@/lib/lesson/engine";

// Encouraging messages
const SUCCESS_MESSAGES = [
  "Great work! 🎉",
  "Excellent! ⭐",
  "Amazing job! 🌟",
  "You're on fire! 🔥",
  "Fantastic! 💪",
  "Well done! 👏",
  "Perfect! ✨",
  "Superb! 🎯",
];

const ENCOURAGEMENT_MESSAGES = [
  "Almost there! Keep going! 💪",
  "So close! Try again! 🎯",
  "Don't give up! You've got this! 🌟",
  "Good effort! Let's try once more! ⭐",
  "Learning is a journey! 🚀",
  "Every mistake is progress! 📚",
];

const getRandomMessage = (messages: string[]) =>
  messages[Math.floor(Math.random() * messages.length)];

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
    const celebrationEmojis =
      percentage >= 80 ? "🎉✨🌟" : percentage >= 60 ? "👏⭐" : "💪📚";

    return (
      <div className="space-y-8 animate-fade-in">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-feedback-success/10 text-feedback-success border border-feedback-success/30">
            <Trophy className="h-5 w-5" />
            <span className="text-sm font-medium">Exercises Complete!</span>
          </div>
        </div>

        <div className="bg-card border-2 border-library-brass/30 rounded-3xl p-10 text-center space-y-6 shadow-soft-lg">
          <div className="text-7xl font-light text-library-brass animate-scale-bounce">
            {percentage}%
          </div>
          <div className="text-2xl font-medium">
            {score} of {exercises.length} correct {celebrationEmojis}
          </div>
          <p className="text-lg text-muted-foreground font-light max-w-md mx-auto">
            {percentage >= 80
              ? "Outstanding work! You've truly mastered this content! 🌟"
              : percentage >= 60
                ? "Great progress! You're getting the hang of it! Keep it up! 💪"
                : "Good effort! Practice makes perfect. Every step forward counts! 📚"}
          </p>
        </div>

        {/* Results Summary */}
        <div className="bg-card border border-border rounded-3xl shadow-soft">
          <div className="p-7 border-b border-border">
            <h2 className="text-xl font-light">Your Results ✨</h2>
          </div>
          <div className="p-7">
            <div className="grid grid-cols-3 gap-3 sm:gap-6 text-center">
              <div className="p-4 sm:p-6 bg-feedback-success/10 border border-feedback-success/20 rounded-2xl">
                <div className="text-2xl sm:text-3xl font-bold text-feedback-success">
                  {score}
                </div>
                <div className="text-sm sm:text-base text-muted-foreground font-light mt-1">
                  Correct 🎯
                </div>
              </div>
              <div className="p-4 sm:p-6 bg-feedback-error/10 border border-feedback-error/20 rounded-2xl">
                <div className="text-2xl sm:text-3xl font-bold text-feedback-error">
                  {exercises.length - score}
                </div>
                <div className="text-sm sm:text-base text-muted-foreground font-light mt-1">
                  To Review 📖
                </div>
              </div>
              <div className="p-4 sm:p-6 bg-library-brass/10 border border-library-brass/20 rounded-2xl">
                <div className="text-2xl sm:text-3xl font-bold text-library-brass">
                  {exercises.length}
                </div>
                <div className="text-sm sm:text-base text-muted-foreground font-light mt-1">
                  Total ✅
                </div>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={onPhaseComplete}
          className="w-full py-5 px-8 rounded-2xl font-medium flex items-center justify-center gap-3 bg-library-brass hover:bg-library-brass/90 text-background transition-all btn-bounce shadow-soft text-lg"
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
      <div className="bg-card border border-border rounded-3xl p-7 shadow-soft">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium">Progress</span>
          <span className="text-sm text-muted-foreground font-light">
            {currentIndex + 1} / {exercises.length}
          </span>
        </div>
        <div className="w-full bg-background rounded-full h-3 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-library-brass to-library-gold rounded-full transition-all duration-700 ease-out relative overflow-hidden"
            style={{ width: `${progress}%` }}
          >
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
                animation: "progressShine 2s ease-in-out infinite",
              }}
            />
          </div>
        </div>

        {/* Score indicator */}
        <div className="flex items-center justify-end gap-6 mt-4 text-sm">
          <span className="flex items-center gap-2 text-feedback-success font-medium">
            <CheckCircle2 className="h-5 w-5" /> {score} correct
          </span>
          <span className="flex items-center gap-2 text-feedback-error font-medium">
            <XCircle className="h-5 w-5" /> {results.length - score} to review
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
                    "w-full py-5 px-5 rounded-2xl border-2 text-left whitespace-normal flex items-center gap-4 transition-all duration-200 min-h-touch tap-squish",
                    isSelected &&
                      !showFeedback &&
                      "border-library-brass bg-library-brass/10 shadow-soft",
                    showCorrect &&
                      "border-feedback-success bg-feedback-success/10 glow-success",
                    showIncorrect &&
                      "border-feedback-error bg-feedback-error/10 animate-shake-gentle",
                    !isSelected &&
                      !showCorrect &&
                      !showIncorrect &&
                      "border-border hover:bg-card/80 hover:border-library-brass/50 hover:shadow-soft",
                    showFeedback && "cursor-default",
                  )}
                  onClick={() => handleAnswer(index)}
                  disabled={showFeedback}
                >
                  <span
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-medium transition-all duration-200",
                      isSelected &&
                        !showFeedback &&
                        "bg-library-brass text-background",
                      showCorrect &&
                        "bg-feedback-success text-white animate-bounce-in",
                      showIncorrect && "bg-feedback-error text-white",
                      !isSelected &&
                        !showCorrect &&
                        !showIncorrect &&
                        "bg-background border-2 border-border",
                    )}
                  >
                    {showCorrect ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : showIncorrect ? (
                      <XCircle className="h-5 w-5" />
                    ) : (
                      String.fromCharCode(65 + index)
                    )}
                  </span>
                  <span className="font-light text-base">{option}</span>
                </button>
              );
            })}
          </div>

          {/* Feedback */}
          {showFeedback && (
            <div
              className={cn(
                "p-5 rounded-2xl border-2 transition-all duration-300",
                selectedAnswer === currentExercise.correctAnswer
                  ? "bg-feedback-success/10 border-feedback-success/30 glow-success"
                  : "bg-feedback-error/10 border-feedback-error/30 animate-shake-gentle",
              )}
            >
              <div className="flex items-start gap-4">
                {selectedAnswer === currentExercise.correctAnswer ? (
                  <div className="w-8 h-8 rounded-full bg-feedback-success flex items-center justify-center shrink-0 animate-bounce-in">
                    <CheckCircle2 className="h-5 w-5 text-white" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-feedback-error flex items-center justify-center shrink-0">
                    <XCircle className="h-5 w-5 text-white" />
                  </div>
                )}
                <div className="flex-1">
                  <p
                    className={cn(
                      "font-medium text-lg",
                      selectedAnswer === currentExercise.correctAnswer
                        ? "text-feedback-success-dark"
                        : "text-feedback-error-dark",
                    )}
                  >
                    {selectedAnswer === currentExercise.correctAnswer
                      ? getRandomMessage(SUCCESS_MESSAGES)
                      : getRandomMessage(ENCOURAGEMENT_MESSAGES)}
                  </p>
                  {currentExercise.explanation && (
                    <p className="text-sm text-muted-foreground font-light mt-2">
                      {currentExercise.explanation}
                    </p>
                  )}
                  {currentExercise.grammarNote && (
                    <div className="mt-3 flex items-start gap-2 text-sm bg-feedback-info/10 p-3 rounded-xl">
                      <Lightbulb className="h-4 w-4 text-feedback-info shrink-0 mt-0.5" />
                      <span className="font-light text-feedback-info-dark">
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
