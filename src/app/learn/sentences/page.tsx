"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Layers,
  Ear,
  Star,
  ChevronRight,
  Lock,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { FadeIn } from "@/components/ui/animations";
import { getFoundationProgress } from "@/lib/srs/foundation-srs";

// ============================================================================
// SENTENCE LEARNING HUB
// Main page for Phase 1: Transition to Sentences (100-300 words)
// ============================================================================

export default function SentenceLearningPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [foundationProgress, setFoundationProgress] = useState<{
    totalWordsLearned: number;
    completedSessions: number[];
  } | null>(null);
  const [sentenceProgress, setSentenceProgress] = useState<{
    sessionsCompleted: number;
    lastSessionDate?: string;
  }>({ sessionsCompleted: 0 });

  // Load progress on mount
  useEffect(() => {
    const progress = getFoundationProgress();
    if (progress) {
      setFoundationProgress({
        totalWordsLearned: progress.totalWordsLearned,
        completedSessions: progress.completedSessions,
      });
    }

    // Load sentence progress from localStorage
    try {
      const saved = localStorage.getItem("sentence-transition-progress");
      if (saved) {
        setSentenceProgress(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load sentence progress:", e);
    }

    setLoading(false);
  }, []);

  // Check if user has unlocked sentence learning (100+ words)
  const isUnlocked = (foundationProgress?.totalWordsLearned || 0) >= 100;
  const wordsNeeded = Math.max(
    0,
    100 - (foundationProgress?.totalWordsLearned || 0),
  );

  // Generate session cards
  const totalSessions = 25; // Phase 1 has ~25 sessions
  const sessions = Array.from({ length: totalSessions }, (_, i) => ({
    number: i + 1,
    completed: sentenceProgress.sessionsCompleted >= i + 1,
    current: sentenceProgress.sessionsCompleted === i,
    locked: !isUnlocked,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/learn")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="ml-3 text-lg font-medium">Sentence Building</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <FadeIn>
          <div className="text-center mb-10">
            <div
              className={cn(
                "w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6",
                isUnlocked
                  ? "bg-gradient-to-br from-blue-500 to-purple-600"
                  : "bg-muted",
              )}
            >
              <Layers
                className={cn(
                  "w-12 h-12",
                  isUnlocked ? "text-white" : "text-muted-foreground",
                )}
              />
            </div>
            <h2 className="text-3xl font-bold mb-3">
              {isUnlocked ? "Build Sentences!" : "Unlock Sentence Learning"}
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              {isUnlocked
                ? "Combine your vocabulary into real French sentences. Learn grammar naturally through patterns."
                : `Learn ${wordsNeeded} more words in Foundation to unlock sentence building.`}
            </p>
          </div>
        </FadeIn>

        {/* Locked state */}
        {!isUnlocked && (
          <FadeIn delay={100}>
            <Card className="max-w-lg mx-auto">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4 mb-4">
                  <Lock className="w-8 h-8 text-muted-foreground" />
                  <div>
                    <h3 className="font-medium">Not Yet Unlocked</h3>
                    <p className="text-sm text-muted-foreground">
                      Complete Foundation vocabulary first
                    </p>
                  </div>
                </div>
                <Progress
                  value={foundationProgress?.totalWordsLearned || 0}
                  max={100}
                  className="h-3 mb-2"
                />
                <p className="text-sm text-muted-foreground text-center">
                  {foundationProgress?.totalWordsLearned || 0} / 100 words
                  learned
                </p>
                <Button
                  className="w-full mt-4"
                  onClick={() => router.push("/learn/foundation")}
                >
                  Continue Foundation
                </Button>
              </CardContent>
            </Card>
          </FadeIn>
        )}

        {/* Unlocked content */}
        {isUnlocked && (
          <>
            {/* Progress overview */}
            <FadeIn delay={100}>
              <div className="grid grid-cols-3 gap-4 mb-10">
                <Card>
                  <CardContent className="pt-6 text-center">
                    <Ear className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                    <p className="text-2xl font-bold">
                      {sentenceProgress.sessionsCompleted * 5}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Sentences Heard
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <Layers className="w-8 h-8 mx-auto mb-2 text-amber-500" />
                    <p className="text-2xl font-bold">
                      {Math.min(sentenceProgress.sessionsCompleted, 8)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Patterns Learned
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <Star className="w-8 h-8 mx-auto mb-2 text-green-500" />
                    <p className="text-2xl font-bold">
                      {sentenceProgress.sessionsCompleted}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Sessions Done
                    </p>
                  </CardContent>
                </Card>
              </div>
            </FadeIn>

            {/* What you'll learn */}
            <FadeIn delay={200}>
              <h3 className="text-lg font-medium mb-4">What You'll Learn</h3>
              <div className="grid md:grid-cols-3 gap-4 mb-10">
                <Card className="border-blue-200 dark:border-blue-800">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <Ear className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <h4 className="font-medium">Listening First</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Build sound-meaning connections before text. Hear
                      naturally, then read.
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-amber-200 dark:border-amber-800">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                        <Layers className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <h4 className="font-medium">Pattern Recognition</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Absorb grammar through patterns, not rules. See the same
                      structure repeatedly.
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-green-200 dark:border-green-800">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                      <h4 className="font-medium">Sentence Mining</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Ultra-simple sentences using only words you know. Max 1
                      new word per sentence.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </FadeIn>

            {/* Session List */}
            <FadeIn delay={300}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Sessions</h3>
                <span className="text-sm text-muted-foreground">
                  {sentenceProgress.sessionsCompleted} / {totalSessions}{" "}
                  complete
                </span>
              </div>

              <div className="space-y-2">
                {sessions.slice(0, 10).map((session) => (
                  <Link
                    key={session.number}
                    href={
                      session.locked
                        ? "#"
                        : `/learn/sentences/session/${session.number}`
                    }
                  >
                    <Card
                      className={cn(
                        "transition-all hover:shadow-md",
                        session.current &&
                          "border-primary ring-2 ring-primary/20",
                        session.completed &&
                          "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800",
                      )}
                    >
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div
                              className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center",
                                session.completed
                                  ? "bg-green-100 dark:bg-green-900/30"
                                  : session.current
                                    ? "bg-primary/10"
                                    : "bg-muted",
                              )}
                            >
                              {session.completed ? (
                                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                              ) : (
                                <span
                                  className={cn(
                                    "font-medium",
                                    session.current
                                      ? "text-primary"
                                      : "text-muted-foreground",
                                  )}
                                >
                                  {session.number}
                                </span>
                              )}
                            </div>
                            <div>
                              <h4 className="font-medium">
                                Session {session.number}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {session.completed
                                  ? "Completed"
                                  : session.current
                                    ? "Continue learning"
                                    : "10 exercises"}
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}

                {sessions.length > 10 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    + {sessions.length - 10} more sessions
                  </p>
                )}
              </div>
            </FadeIn>

            {/* Continue button */}
            <FadeIn delay={400}>
              <div className="mt-8">
                <Button
                  size="lg"
                  className="w-full"
                  onClick={() =>
                    router.push(
                      `/learn/sentences/session/${sentenceProgress.sessionsCompleted + 1}`,
                    )
                  }
                >
                  {sentenceProgress.sessionsCompleted === 0
                    ? "Start Session 1"
                    : `Continue Session ${sentenceProgress.sessionsCompleted + 1}`}
                </Button>
              </div>
            </FadeIn>
          </>
        )}
      </div>
    </div>
  );
}
