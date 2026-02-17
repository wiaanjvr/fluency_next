"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LoadingScreen from "@/components/ui/LoadingScreen";
import {
  ArrowLeft,
  BookOpen,
  Check,
  ArrowRight,
  Brain,
  RefreshCw,
  Clock,
  TrendingUp,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { FoundationWord } from "@/types/foundation-vocabulary";
import { generateFoundationVocabulary } from "@/data/foundation-vocabulary";
import { getVocabularyData } from "@/lib/languages/data-loader";
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
        const words = generateFoundationVocabulary(
          vocabularyData.words,
          language,
        );
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

    // Also reload when the page becomes visible (user returns from session)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadProgress();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [supabase]);

  // Calculate progress
  const totalWords = allWords.length;
  const learnedWords = nextSessionData?.totalLearned || 0;
  const progressPercentage =
    totalWords > 0 ? Math.round((learnedWords / totalWords) * 100) : 0;

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-8 py-4 flex items-center justify-between">
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

      <main className="max-w-5xl mx-auto p-8">
        {/* Hero Section */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2">Master the Fundamentals</h1>
          <p className="text-lg text-muted-foreground">
            Build a strong foundation with the 100 most essential words
          </p>
        </div>

        {/* Next Session Card - Primary CTA */}
        <div className="mb-8">
          <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/20 rounded-2xl p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32" />

            <div className="relative">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {nextSessionData?.allWordsLearned
                      ? "Review Session"
                      : nextSessionData?.reviewCount
                        ? "Review Session"
                        : "Next Lesson"}
                  </p>
                  <h2 className="text-3xl font-bold mb-2">
                    {nextSessionData?.allWordsLearned
                      ? "Foundation Complete"
                      : nextSessionData?.reviewCount
                        ? `Review ${nextSessionData.reviewCount} Word${nextSessionData.reviewCount > 1 ? "s" : ""}`
                        : `Learn ${nextSessionData?.newCount || 4} New Word${nextSessionData?.newCount !== 1 ? "s" : ""}`}
                  </h2>
                  <p className="text-muted-foreground">
                    {nextSessionData?.allWordsLearned
                      ? wordsDueCount > 0
                        ? `Keep ${wordsDueCount} words fresh with spaced repetition review`
                        : "All words mastered. No reviews needed right now."
                      : nextSessionData?.reviewCount &&
                          nextSessionData?.newCount
                        ? `Plus ${nextSessionData.newCount} new word${nextSessionData.newCount > 1 ? "s" : ""} to learn`
                        : "Build your vocabulary with spaced repetition"}
                  </p>
                </div>
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  {nextSessionData?.allWordsLearned ? (
                    <Check className="w-8 h-8 text-primary" />
                  ) : nextSessionData?.reviewCount ? (
                    <RefreshCw className="w-8 h-8 text-primary" />
                  ) : (
                    <Play className="w-8 h-8 text-primary" />
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>~10 min</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <BookOpen className="w-4 h-4" />
                  <span>
                    {learnedWords} / {totalWords} words learned
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <TrendingUp className="w-4 h-4" />
                  <span>{progressPercentage}% complete</span>
                </div>
              </div>

              <Link href="/learn/foundation/session/next">
                <Button
                  size="lg"
                  className="group"
                  disabled={
                    nextSessionData?.allWordsLearned && wordsDueCount === 0
                  }
                >
                  {nextSessionData?.allWordsLearned && wordsDueCount > 0
                    ? "Review Words"
                    : nextSessionData?.allWordsLearned
                      ? "All Complete"
                      : "Start Learning"}
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>

              {nextSessionData?.allWordsLearned && (
                <Link href="/learn/sentences" className="ml-3">
                  <Button size="lg" variant="outline" className="group">
                    Continue to Next Phase
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Progress Overview */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">Your Progress</h3>
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">
                  Overall Progress
                </span>
                <span className="text-sm font-medium">
                  {learnedWords} / {totalWords} words
                </span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
              <div>
                <div className="text-2xl font-bold">{totalWords}</div>
                <p className="text-sm text-muted-foreground">Total Words</p>
              </div>
              <div>
                <div className="text-2xl font-bold">{learnedWords}</div>
                <p className="text-sm text-muted-foreground">Learned</p>
              </div>
              <div>
                <div className="text-2xl font-bold">{wordsDueCount}</div>
                <p className="text-sm text-muted-foreground">Due for Review</p>
              </div>
            </div>
          </div>
        </div>

        {/* Learning Approach */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">
            How to Learn Effectively
          </h3>
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Brain className="w-5 h-5 text-primary" />
                  Think Before You Look
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  When you see a new word, pause and try to recall or guess its
                  meaning before revealing the translation. This active effort
                  strengthens memory formation and improves long-term retention.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <RefreshCw className="w-5 h-5 text-primary" />
                  Shadow Every Word and Sentence
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Immediately repeat each word and sentence out loud after
                  hearing the audio. This shadowing technique builds
                  pronunciation muscle memory and trains your ear to recognize
                  natural speech patterns.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BookOpen className="w-5 h-5 text-primary" />
                  Visualize Concrete Words
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  For nouns and action verbs, create vivid mental images of the
                  objects or actions. Visual associations help anchor words in
                  memory more effectively than text alone, especially when
                  combined with the audio.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Spaced Repetition Info */}
        <div className="bg-muted/50 border border-border rounded-xl p-6">
          <h3 className="font-semibold mb-3">About Spaced Repetition</h3>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              Words are reviewed at optimal intervals based on how well you know
              them. Words you struggle with appear more frequently, while words
              you know well have longer intervals between reviews.
            </p>
            <p>
              Each session adapts to your current needs - prioritizing reviews
              when words are due, and introducing new words when you're ready
              for them.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
