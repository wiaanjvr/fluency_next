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
    if (score >= 90) return "Outstanding performance";
    if (score >= 80) return "Excellent work";
    if (score >= 70) return "Great progress";
    if (score >= 60) return "Good effort";
    return "Keep practicing";
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-2xl mx-auto px-6 py-16 space-y-10">
        {/* Celebration Header */}
        <div className="text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-library-brass/10 flex items-center justify-center">
            <Trophy className="h-10 w-10 text-library-brass" />
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl sm:text-5xl font-light tracking-tight">
              Lesson{" "}
              <span className="font-serif italic text-library-brass">
                complete
              </span>
            </h1>
            <p className="text-xl text-muted-foreground font-light">
              {getScoreMessage(overallScore)}
            </p>
          </div>
        </div>

        {/* Overall Score Card */}
        <div className="bg-card border border-border rounded-2xl p-8 text-center relative overflow-hidden">
          {/* Ambient glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-library-brass/5 via-transparent to-luxury-bronze/5" />

          <div className="relative space-y-2">
            <div className="text-7xl font-light text-library-brass">
              {overallScore}
              <span className="text-3xl">%</span>
            </div>
            <p className="text-lg text-muted-foreground font-light">
              Overall Performance
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Vocabulary Stats */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-4">
              <BookOpen className="h-4 w-4" />
              <span className="text-sm">Vocabulary</span>
            </div>
            <div className="text-4xl font-light text-library-brass mb-1">
              {wordsLearned}
            </div>
            <p className="text-sm text-muted-foreground font-light">
              words practiced
            </p>
            <div className="mt-3 text-sm font-light">
              <span className="text-green-500">{wordsKnownWell}</span>
              <span className="text-muted-foreground"> marked as known</span>
            </div>
          </div>

          {/* Exercises Stats */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-4">
              <Brain className="h-4 w-4" />
              <span className="text-sm">Exercises</span>
            </div>
            <div className="text-4xl font-light text-library-brass mb-1">
              {exerciseScore}%
            </div>
            <p className="text-sm text-muted-foreground font-light">
              accuracy score
            </p>
            <div className="mt-3 text-sm font-light">
              <span className="text-green-500">
                {exerciseAttempts.filter((a) => a.isCorrect).length}
              </span>
              <span className="text-muted-foreground">
                {" "}
                / {exerciseAttempts.length} correct
              </span>
            </div>
          </div>
        </div>

        {/* Words Learned Section */}
        {vocabularyRatings.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Star className="h-5 w-5 text-amber-500" />
              </div>
              <h3 className="text-lg font-medium">Words Practiced</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {vocabularyRatings.map((rating, index) => (
                <span
                  key={index}
                  className={cn(
                    "px-4 py-2 rounded-xl text-sm font-light",
                    rating.rating >= 4 && "bg-green-500/10 text-green-400",
                    rating.rating === 3 && "bg-lime-500/10 text-lime-400",
                    rating.rating === 2 && "bg-amber-500/10 text-amber-400",
                    rating.rating <= 1 && "bg-red-500/10 text-red-400",
                  )}
                >
                  {rating.word}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Next Steps */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-library-brass/10 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="h-5 w-5 text-library-brass" />
            </div>
            <div>
              <h3 className="font-medium mb-2">Keep the momentum</h3>
              <p className="text-sm text-muted-foreground font-light">
                Your vocabulary is growing. New words will be reviewed according
                to the spaced repetition schedule for optimal retention.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <button
            onClick={onStartNewLesson}
            className="w-full py-4 px-8 bg-library-brass hover:bg-library-brass/90 text-background font-medium rounded-xl transition-all duration-300 flex items-center justify-center gap-3"
          >
            <Sparkles className="h-5 w-5" />
            Start Another Lesson
          </button>

          <button
            onClick={onExit}
            className="w-full py-4 px-8 bg-transparent border border-border hover:bg-card text-foreground font-light rounded-xl transition-all duration-300 flex items-center justify-center gap-3"
          >
            <Home className="h-5 w-5" />
            Return to Dashboard
          </button>
        </div>

        {/* Motivation Footer */}
        <div className="text-center text-sm text-muted-foreground font-light pt-6 border-t border-border">
          <p className="flex items-center justify-center gap-2">
            <Calendar className="h-4 w-4" />
            Consistency is key. Come back tomorrow to continue learning.
          </p>
        </div>
      </div>
    </div>
  );
}
