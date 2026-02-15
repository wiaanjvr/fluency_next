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
  RefreshCw,
  Sparkles,
  Trophy,
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
import { getNextSessionWords, getUserWords } from "@/lib/srs/foundation-srs";

export default function FoundationPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [allWords, setAllWords] = useState<FoundationWord[]>([]);
  const [nextSessionData, setNextSessionData] = useState<{
    reviewCount: number;
    newCount: number;
    totalLearned: number;
    allWordsLearned: boolean;
  } | null>(null);
  const [targetLanguage, setTargetLanguage] = useState<SupportedLanguage>("fr");
  const [wordsDueCount, setWordsDueCount] = useState(0);

  // Load progress and next session
  useEffect(() => {
    async function loadProgress() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setLoading(false);
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

        // Generate vocabulary for the user's language
        const vocabularyData = getVocabularyData(language);
        const words = generateFoundationVocabulary(vocabularyData.words);
        setAllWords(words);

        // Get next session data
        const sessionData = await getNextSessionWords(words, language, 4);
        setNextSessionData({
          reviewCount: sessionData.reviewCount,
          newCount: sessionData.newCount,
          totalLearned: sessionData.totalLearned,
          allWordsLearned: sessionData.allWordsLearned,
        });

        // Count words due for review
        const userWords = await getUserWords(language);
        const now = new Date();
        const dueCount = userWords.filter(
          (w) => new Date(w.next_review) <= now,
        ).length;
        setWordsDueCount(dueCount);
      } catch (error) {
        console.error("Error loading foundation progress:", error);
      }

      setLoading(false);
    }

    loadProgress();
  }, [supabase]);

  // Calculate progress
  const totalWords = allWords.length; // 100 words
  const learnedWords = nextSessionData?.totalLearned || 0;
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

      {/* Already Completed Banner */}
      {nextSessionData?.allWordsLearned && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-b border-green-200 dark:border-green-900">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-green-900 dark:text-green-100 mb-1">
                  Foundation Complete! 🎉
                </h3>
                <p className="text-sm text-green-700 dark:text-green-300 mb-3">
                  You've learned all {totalWords} foundational words! Keep
                  reviewing them to maintain your knowledge, or move on to more
                  advanced content.
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
                  Build your foundation with the most frequent words. Each
                  session adapts to your learning using spaced repetition for
                  optimal retention.
                </p>

                <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-primary" />
                    <span className="text-sm">
                      <strong>{learnedWords}</strong> / {totalWords} words
                      learned
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 text-orange-500" />
                    <span className="text-sm">
                      <strong>{wordsDueCount}</strong> due for review
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </div>

      {/* Next Session Card */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-2">Your Next Session</h3>
          <p className="text-muted-foreground">
            Sessions dynamically adapt based on spaced repetition. Review words
            when they're due, or learn new ones when you're ready.
          </p>
        </div>

        <FadeIn>
          <Card
            className={cn(
              "transition-all ring-2 ring-primary ring-offset-2",
              nextSessionData?.allWordsLearned &&
                "bg-green-50/50 dark:bg-green-950/20",
            )}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                {/* Icon */}
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  {nextSessionData?.allWordsLearned ? (
                    <Trophy className="w-8 h-8 text-green-600" />
                  ) : nextSessionData?.reviewCount ? (
                    <RefreshCw className="w-7 h-7 text-primary" />
                  ) : (
                    <Sparkles className="w-7 h-7 text-primary" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {nextSessionData?.allWordsLearned ? (
                    <>
                      <h4 className="font-semibold text-lg mb-1">
                        All Words Learned!
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {wordsDueCount > 0
                          ? `You have ${wordsDueCount} words ready for review to keep your knowledge fresh.`
                          : "No reviews needed right now. Great work!"}
                      </p>
                    </>
                  ) : (
                    <>
                      <h4 className="font-semibold text-lg mb-1">
                        {nextSessionData?.reviewCount
                          ? "Review Session"
                          : "New Words Session"}
                      </h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        {nextSessionData?.reviewCount
                          ? `${nextSessionData.reviewCount} word${nextSessionData.reviewCount > 1 ? "s" : ""} ready for review`
                          : `Learn ${nextSessionData?.newCount || 4} new word${nextSessionData?.newCount !== 1 ? "s" : ""}`}
                        {nextSessionData?.reviewCount &&
                        nextSessionData?.newCount
                          ? ` + ${nextSessionData.newCount} new word${nextSessionData.newCount > 1 ? "s" : ""}`
                          : ""}
                      </p>
                      <div className="flex gap-2">
                        {nextSessionData?.reviewCount ? (
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 text-xs rounded-full flex items-center gap-1">
                            <RefreshCw className="w-3 h-3" />
                            Review Priority
                          </span>
                        ) : null}
                        {nextSessionData?.newCount ? (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs rounded-full flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            New Content
                          </span>
                        ) : null}
                      </div>
                    </>
                  )}
                </div>

                {/* Action */}
                <Button
                  variant="default"
                  size="lg"
                  onClick={() => router.push("/learn/foundation/session/next")}
                  className="shrink-0"
                  disabled={
                    nextSessionData?.allWordsLearned && wordsDueCount === 0
                  }
                >
                  {nextSessionData?.allWordsLearned && wordsDueCount > 0
                    ? "Review"
                    : "Start Session"}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      </div>

      {/* Learning Tips */}
      <div className="max-w-4xl mx-auto px-4 pb-12">
        <FadeIn delay={200}>
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Brain className="w-5 h-5 text-primary" />
                How Spaced Repetition Works
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-3">
                <Star className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Adaptive learning</p>
                  <p className="text-sm text-muted-foreground">
                    Words you struggle with appear more frequently, while words
                    you know well have longer intervals between reviews.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Star className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Optimal timing</p>
                  <p className="text-sm text-muted-foreground">
                    Each session prioritizes words that are due for review,
                    ensuring you practice at the perfect moment for long-term
                    retention.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Star className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Steady progress</p>
                  <p className="text-sm text-muted-foreground">
                    New words are introduced when you're ready, balancing review
                    and learning to maximize efficiency.
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
