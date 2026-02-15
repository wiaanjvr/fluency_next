"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Check,
  Lock,
  ChevronRight,
  Loader2,
  Star,
  Target,
  Brain,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { FoundationWord } from "@/types/foundation-vocabulary";
import {
  generateFoundationVocabulary,
  createLearningSessions,
} from "@/data/foundation-vocabulary";
import { getVocabularyData } from "@/lib/languages/data-loader";
import { FadeIn, CircularProgress } from "@/components/ui/animations";
import { createClient } from "@/lib/supabase/client";
import type { SupportedLanguage } from "@/lib/languages";

export default function FoundationPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<FoundationWord[][]>([]);
  const [completedSessions, setCompletedSessions] = useState<number[]>([]);
  const [userWordCount, setUserWordCount] = useState(0);
  const [alreadyKnowsFoundation, setAlreadyKnowsFoundation] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState<SupportedLanguage>("fr");

  // Load completed sessions from localStorage and check user's word count
  useEffect(() => {
    async function loadProgress() {
      // Check user's word count from database
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          // Get user's target language from profile
          const { data: profile } = await supabase
            .from("profiles")
            .select("target_language")
            .eq("id", user.id)
            .single();

          const language = (profile?.target_language ||
            "fr") as SupportedLanguage;
          setTargetLanguage(language);

          // Generate vocabulary sessions for the user's language
          const vocabularyData = getVocabularyData(language);
          const words = generateFoundationVocabulary(vocabularyData.words);
          const generatedSessions = createLearningSessions(words, 4);
          setSessions(generatedSessions);

          const { count } = await supabase
            .from("user_words")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("language", language);

          const wordCount = count || 0;
          setUserWordCount(wordCount);

          // If user has 100+ words (A1 or above from placement test),
          // they already know foundation vocabulary
          if (wordCount >= 100) {
            setAlreadyKnowsFoundation(true);
            // Auto-complete all foundation sessions
            const allSessionIndices = generatedSessions.map((_, i) => i);
            const stored = localStorage.getItem("foundationProgress");
            let existingProgress = { completedSessions: [] };

            if (stored) {
              try {
                existingProgress = JSON.parse(stored);
              } catch (e) {
                // Ignore parse errors
              }
            }

            // Merge and save
            const mergedCompleted = Array.from(
              new Set([
                ...(existingProgress.completedSessions || []),
                ...allSessionIndices,
              ]),
            );

            localStorage.setItem(
              "foundationProgress",
              JSON.stringify({
                ...existingProgress,
                completedSessions: mergedCompleted,
                totalWordsLearned: 100,
                lastSessionDate: new Date().toISOString(),
              }),
            );

            setCompletedSessions(mergedCompleted);
          } else {
            // Load from localStorage as normal
            const stored = localStorage.getItem("foundationProgress");
            if (stored) {
              try {
                const progress = JSON.parse(stored);
                setCompletedSessions(progress.completedSessions || []);
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
        }
      } catch (error) {
        console.error("Error loading foundation progress:", error);
        // Fallback to localStorage only
        const stored = localStorage.getItem("foundationProgress");
        if (stored) {
          try {
            const progress = JSON.parse(stored);
            setCompletedSessions(progress.completedSessions || []);
          } catch (e) {
            // Ignore parse errors
          }
        }
      }

      setLoading(false);
    }

    loadProgress();
  }, [supabase]);

  // Calculate progress
  const totalWords = sessions.reduce((sum, s) => sum + s.length, 0);
  const learnedWords = completedSessions.reduce(
    (sum, idx) => sum + (sessions[idx]?.length || 0),
    0,
  );
  const progressPercentage =
    totalWords > 0 ? Math.round((learnedWords / totalWords) * 100) : 0;

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
      <div className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-semibold text-lg">Foundation Vocabulary</h1>
          <div className="w-10" />
        </div>
      </div>

      {/* Already Knows Foundation Banner */}
      {alreadyKnowsFoundation && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-b border-green-200 dark:border-green-900">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-green-900 dark:text-green-100 mb-1">
                  Foundation Already Mastered! 🎉
                </h3>
                <p className="text-sm text-green-700 dark:text-green-300 mb-3">
                  Based on your placement test results (A1 or above), you
                  already know these {totalWords} foundational words. All
                  sessions have been automatically marked as complete. You can
                  review them anytime or move on to more advanced content.
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => router.push("/learn/sentences")}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Continue to Next Phase
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push("/dashboard")}
                  >
                    Back to Dashboard
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="bg-gradient-to-b from-primary/10 to-background">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <FadeIn>
            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* Progress Circle */}
              <div className="relative">
                <CircularProgress
                  value={progressPercentage}
                  max={100}
                  size={140}
                  strokeWidth={12}
                  showPercentage
                />
              </div>

              {/* Info */}
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-2xl md:text-3xl font-bold mb-2">
                  Master the First 100 Words
                </h2>
                <p className="text-muted-foreground mb-4">
                  Build your foundation with the most frequent French words.
                  Each session introduces 4 new words with images, audio, and
                  practice exercises.
                </p>

                <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-primary" />
                    <span className="text-sm">
                      <strong>{learnedWords}</strong> / {totalWords} words
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-green-500" />
                    <span className="text-sm">
                      <strong>{completedSessions.length}</strong> /{" "}
                      {sessions.length} sessions
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </div>

      {/* Sessions List */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-2">Learning Sessions</h3>
          <p className="text-muted-foreground">
            Complete sessions in order. Each session builds on the previous one.
          </p>
        </div>

        <div className="grid gap-4">
          {sessions.map((session, index) => {
            const isCompleted = completedSessions.includes(index);
            const isLocked =
              index > 0 &&
              !completedSessions.includes(index - 1) &&
              !isCompleted;
            const isNext = !isLocked && !isCompleted;

            // Get representative words for this session
            const previewWords = session
              .slice(0, 4)
              .map((w) => w.word)
              .join(", ");

            return (
              <FadeIn key={index} delay={index * 50}>
                <Card
                  className={cn(
                    "transition-all",
                    isLocked && "opacity-60",
                    isNext && "ring-2 ring-primary ring-offset-2",
                    isCompleted && "bg-green-50/50 dark:bg-green-950/20",
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Status Icon */}
                      <div
                        className={cn(
                          "w-12 h-12 rounded-full flex items-center justify-center shrink-0",
                          isCompleted && "bg-green-100 dark:bg-green-900",
                          isLocked && "bg-muted",
                          isNext && "bg-primary/10",
                        )}
                      >
                        {isCompleted ? (
                          <Check className="w-6 h-6 text-green-600" />
                        ) : isLocked ? (
                          <Lock className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <span className="text-lg font-bold text-primary">
                            {index + 1}
                          </span>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">Session {index + 1}</h4>
                          {isCompleted && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                              Completed
                            </span>
                          )}
                          {isNext && (
                            <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs rounded-full animate-pulse">
                              Next
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {session.length} words: {previewWords}...
                        </p>
                      </div>

                      {/* Action */}
                      <Button
                        variant={
                          isCompleted ? "outline" : isNext ? "default" : "ghost"
                        }
                        size="sm"
                        disabled={isLocked}
                        onClick={() =>
                          router.push(`/learn/foundation/session/${index}`)
                        }
                      >
                        {isCompleted ? "Review" : isNext ? "Start" : "Locked"}
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </FadeIn>
            );
          })}
        </div>
      </div>

      {/* Learning Tips */}
      <div className="max-w-4xl mx-auto px-4 pb-12">
        <FadeIn delay={200}>
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Brain className="w-5 h-5 text-primary" />
                Learning Tips
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-3">
                <Star className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Multi-modal learning</p>
                  <p className="text-sm text-muted-foreground">
                    Each word is presented with images, audio, and sentences to
                    help it stick.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Star className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Spaced repetition</p>
                  <p className="text-sm text-muted-foreground">
                    Words you learn will be reviewed at optimal intervals for
                    long-term retention.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Star className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Active practice</p>
                  <p className="text-sm text-muted-foreground">
                    Different exercise types keep you engaged and test various
                    aspects of word knowledge.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </div>
  );
}
