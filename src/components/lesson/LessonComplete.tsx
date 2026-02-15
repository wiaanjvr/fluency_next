"use client";

import React from "react";
import {
  Lesson,
  VocabularyRating,
  ExerciseAttempt,
  ComprehensionResponse,
} from "@/types/lesson";
import {
  Trophy,
  BookOpen,
  Brain,
  ArrowRight,
  Home,
  Sparkles,
  Star,
  TrendingUp,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LessonCompleteProps {
  lesson: Lesson;
  vocabularyRatings: VocabularyRating[];
  exerciseAttempts: ExerciseAttempt[];
  initialResponse: ComprehensionResponse | null;
  finalResponse: ComprehensionResponse | null;
  onStartNewLesson: () => void;
  onExit: () => void;
}

export function LessonComplete({
  lesson,
  vocabularyRatings,
  exerciseAttempts,
  initialResponse,
  finalResponse,
  onStartNewLesson,
  onExit,
}: LessonCompleteProps) {
  // Calculate stats
  const wordsLearned = vocabularyRatings.length;
  const wordsKnownWell = vocabularyRatings.filter((r) => r.rating >= 3).length;

  const exerciseScore =
    exerciseAttempts.length > 0
      ? Math.round(
          (exerciseAttempts.filter((a) => a.isCorrect).length /
            exerciseAttempts.length) *
            100,
        )
      : 0;

  // Overall performance score
  const overallScore = Math.round(
    (wordsKnownWell / Math.max(wordsLearned, 1)) * 50 +
      (exerciseScore / 100) * 50,
  );

  const getScoreMessage = (score: number) => {
    if (score >= 90) return "Outstanding! You're a star! 🌟";
    if (score >= 80) return "Excellent work! Keep shining! ✨";
    if (score >= 70) return "Great progress! You're doing amazing! 💪";
    if (score >= 60) return "Good effort! Every step counts! 🚀";
    return "Keep practicing! You've got this! 📚";
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-2xl mx-auto px-6 py-16 space-y-12">
        {/* Celebration Header */}
        <div className="text-center space-y-8 animate-fade-in">
          <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-library-brass/20 to-library-gold/10 border border-library-brass/30 flex items-center justify-center animate-celebration shadow-soft-lg">
            <Trophy className="h-12 w-12 text-library-brass" />
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl font-light tracking-tight">
              Lesson{" "}
              <span className="font-serif italic text-library-brass">
                complete! 🎉
              </span>
            </h1>
            <p className="text-xl text-muted-foreground font-light">
              {getScoreMessage(overallScore)}
            </p>
          </div>
        </div>

        {/* Overall Score Card */}
        <div className="bg-card border-2 border-library-brass/30 rounded-3xl p-10 text-center relative overflow-hidden shadow-soft-lg animate-scale-bounce">
          {/* Ambient glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-library-brass/5 via-transparent to-luxury-bronze/5" />
          {/* Shimmer effect */}
          <div className="absolute inset-0 shimmer-gold" />

          <div className="relative space-y-3">
            <div className="text-8xl font-light text-library-brass">
              {overallScore}
              <span className="text-4xl">%</span>
            </div>
            <p className="text-lg text-muted-foreground font-light">
              Overall Performance ⭐
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-5">
          {/* Vocabulary Stats */}
          <div className="bg-card border border-border rounded-3xl p-7 card-hover-lift">
            <div className="flex items-center gap-2 text-muted-foreground mb-5">
              <div className="w-8 h-8 rounded-xl bg-library-brass/10 flex items-center justify-center">
                <BookOpen className="h-4 w-4 text-library-brass" />
              </div>
              <span className="text-sm font-medium">Vocabulary</span>
            </div>
            <div className="text-5xl font-light text-library-brass mb-2">
              {wordsLearned}
            </div>
            <p className="text-base text-muted-foreground font-light">
              words practiced 📚
            </p>
            <div className="mt-4 text-sm font-light">
              <span className="text-feedback-success font-medium">
                {wordsKnownWell}
              </span>
              <span className="text-muted-foreground"> marked as known ✅</span>
            </div>
          </div>

          {/* Exercises Stats */}
          <div className="bg-card border border-border rounded-3xl p-7 card-hover-lift">
            <div className="flex items-center gap-2 text-muted-foreground mb-5">
              <div className="w-8 h-8 rounded-xl bg-library-brass/10 flex items-center justify-center">
                <Brain className="h-4 w-4 text-library-brass" />
              </div>
              <span className="text-sm font-medium">Exercises</span>
            </div>
            <div className="text-5xl font-light text-library-brass mb-2">
              {exerciseScore}%
            </div>
            <p className="text-base text-muted-foreground font-light">
              accuracy score 🎯
            </p>
            <div className="mt-4 text-sm font-light">
              <span className="text-feedback-success font-medium">
                {exerciseAttempts.filter((a) => a.isCorrect).length}
              </span>
              <span className="text-muted-foreground">
                {" "}
                / {exerciseAttempts.length} correct 🏆
              </span>
            </div>
          </div>
        </div>

        {/* Words Learned Section */}
        {vocabularyRatings.length > 0 && (
          <div className="bg-card border border-border rounded-3xl p-7 shadow-soft">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                <Star className="h-6 w-6 text-amber-500" />
              </div>
              <h3 className="text-xl font-medium">Words You Practiced ✨</h3>
            </div>
            <div className="flex flex-wrap gap-3">
              {vocabularyRatings.map((rating, index) => (
                <span
                  key={index}
                  className={cn(
                    "px-4 py-2.5 rounded-2xl text-sm font-light transition-all duration-200 hover:scale-105 cursor-default",
                    rating.rating >= 4 &&
                      "bg-feedback-success/10 text-feedback-success border border-feedback-success/20",
                    rating.rating === 3 &&
                      "bg-lime-500/10 text-lime-400 border border-lime-500/20",
                    rating.rating === 2 &&
                      "bg-amber-500/10 text-amber-400 border border-amber-500/20",
                    rating.rating <= 1 &&
                      "bg-feedback-error/10 text-feedback-error border border-feedback-error/20",
                  )}
                >
                  {rating.word}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Next Steps */}
        <div className="bg-card border border-border rounded-3xl p-7 shadow-soft">
          <div className="flex items-start gap-5">
            <div className="w-12 h-12 rounded-2xl bg-library-brass/10 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="h-6 w-6 text-library-brass" />
            </div>
            <div>
              <h3 className="text-lg font-medium mb-2">
                Keep the momentum going! 🚀
              </h3>
              <p className="text-base text-muted-foreground font-light leading-relaxed">
                Your vocabulary is growing beautifully! New words will be
                reviewed using our smart spaced repetition system for optimal
                retention.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <button
            onClick={onStartNewLesson}
            className="w-full py-5 px-8 bg-library-brass hover:bg-library-brass/90 text-background font-medium rounded-2xl transition-all btn-bounce shadow-soft text-lg flex items-center justify-center gap-3"
          >
            <Sparkles className="h-6 w-6" />
            Start Another Lesson ✨
          </button>

          <button
            onClick={onExit}
            className="w-full py-5 px-8 bg-transparent border-2 border-border hover:bg-card hover:border-library-brass/50 text-foreground font-light rounded-2xl transition-all btn-bounce flex items-center justify-center gap-3 text-lg"
          >
            <Home className="h-6 w-6" />
            Return to Dashboard
          </button>
        </div>

        {/* Motivation Footer */}
        <div className="text-center text-base text-muted-foreground font-light pt-8 border-t border-border">
          <p className="flex items-center justify-center gap-3">
            <Calendar className="h-5 w-5 text-library-brass" />
            Consistency is key! Come back tomorrow to continue your journey 🌟
          </p>
        </div>
      </div>
    </div>
  );
}
