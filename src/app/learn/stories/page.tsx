"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  ChevronRight,
  Lock,
  Loader2,
  Clock,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { FadeIn, ScaleIn } from "@/components/ui/animations";
import { getFoundationProgress } from "@/lib/srs/foundation-srs";
import {
  getMicroStoryProgress,
  checkMicroStoriesUnlock,
} from "@/lib/micro-stories/utils";
import { MicroStoryProgress, StoryTheme } from "@/types/micro-stories";

// ============================================================================
// MICRO-STORIES HUB
// Main page for Phase 2: Micro-Stories (300-500 words)
// ============================================================================

const VOCABULARY_THRESHOLD = 300;

export default function MicroStoriesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [foundationProgress, setFoundationProgress] = useState<{
    totalWordsLearned: number;
    completedSessions: number[];
  } | null>(null);
  const [microStoryProgress, setMicroStoryProgress] =
    useState<MicroStoryProgress | null>(null);

  // Load progress on mount
  useEffect(() => {
    const progress = getFoundationProgress();
    if (progress) {
      setFoundationProgress({
        totalWordsLearned: progress.totalWordsLearned,
        completedSessions: progress.completedSessions,
      });
    }

    const storyProgress = getMicroStoryProgress();
    setMicroStoryProgress(storyProgress);

    setLoading(false);
  }, []);

  // Check if user has unlocked micro-stories (300+ words)
  const isUnlocked = checkMicroStoriesUnlock(
    foundationProgress?.totalWordsLearned || 0,
  );
  const wordsNeeded = Math.max(
    0,
    VOCABULARY_THRESHOLD - (foundationProgress?.totalWordsLearned || 0),
  );

  // Stats
  const storiesCompleted = microStoryProgress?.storiesCompleted || 0;
  const totalReadingTime = microStoryProgress?.totalReadingTimeMinutes || 0;
  const wordsLearned = microStoryProgress?.wordsLearnedFromStories.length || 0;
  const currentLevel = microStoryProgress?.currentLevel || "300-350";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Dashboard
            </Button>
          </Link>
          <h1 className="font-serif text-xl">Micro-Stories</h1>
          <div className="w-20" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Hero Section */}
        <FadeIn>
          <Card className="mb-8 overflow-hidden">
            <div className="bg-gradient-to-br from-primary/10 via-amber-50 to-orange-50 p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-serif">
                    Phase 2: Micro-Stories
                  </h2>
                  <p className="text-muted-foreground">300-500 known words</p>
                </div>
              </div>

              <p className="text-muted-foreground mb-6 max-w-2xl">
                Read short 3-5 sentence stories that use your known vocabulary.
                Click any word for instant translation and audio. Build reading
                fluency with comprehensible input.
              </p>

              {isUnlocked ? (
                <div className="flex items-center gap-4">
                  <Link href="/learn/stories/session">
                    <Button size="lg" className="gap-2">
                      <Sparkles className="w-4 h-4" />
                      Start Reading
                    </Button>
                  </Link>
                  {microStoryProgress?.readyForPhase3 && (
                    <span className="px-3 py-1 bg-amber-100 text-amber-700 text-sm rounded-full flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      Ready for Phase 3!
                    </span>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Lock className="w-5 h-5" />
                    <span>
                      Learn <strong>{wordsNeeded}</strong> more words to unlock
                    </span>
                  </div>
                  <Progress
                    value={
                      ((foundationProgress?.totalWordsLearned || 0) /
                        VOCABULARY_THRESHOLD) *
                      100
                    }
                    className="h-2 max-w-md"
                  />
                  <Link href="/learn/foundation">
                    <Button variant="outline" className="gap-2">
                      Continue Foundation Learning
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </Card>
        </FadeIn>

        {/* Stats Grid */}
        {isUnlocked && (
          <FadeIn delay={100}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-primary">
                    {storiesCompleted}
                  </p>
                  <p className="text-sm text-muted-foreground">Stories Read</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-primary">
                    {Math.round(totalReadingTime)}
                  </p>
                  <p className="text-sm text-muted-foreground">Minutes Read</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-primary">
                    {wordsLearned}
                  </p>
                  <p className="text-sm text-muted-foreground">New Words</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-primary">
                    {currentLevel}
                  </p>
                  <p className="text-sm text-muted-foreground">Current Level</p>
                </CardContent>
              </Card>
            </div>
          </FadeIn>
        )}

        {/* Features */}
        <FadeIn delay={200}>
          <h3 className="text-lg font-medium mb-4">How It Works</h3>
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardContent className="p-5">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center mb-3">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                </div>
                <h4 className="font-medium mb-1">Graduated Stories</h4>
                <p className="text-sm text-muted-foreground">
                  Start with 3-sentence stories and progress to 5 sentences as
                  you improve.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center mb-3">
                  <Target className="w-5 h-5 text-amber-600" />
                </div>
                <h4 className="font-medium mb-1">Click to Learn</h4>
                <p className="text-sm text-muted-foreground">
                  Click any word for instant translation and audio. We track
                  words you click for review.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center mb-3">
                  <Sparkles className="w-5 h-5 text-green-600" />
                </div>
                <h4 className="font-medium mb-1">Scaffolded Mode</h4>
                <p className="text-sm text-muted-foreground">
                  New words are highlighted with inline translations to help you
                  understand context.
                </p>
              </CardContent>
            </Card>
          </div>
        </FadeIn>

        {/* Recent Stories */}
        {isUnlocked && microStoryProgress && storiesCompleted > 0 && (
          <FadeIn delay={300}>
            <h3 className="text-lg font-medium mb-4">Recent Stories</h3>
            <div className="space-y-3">
              {Array.from(microStoryProgress.storyResults.entries())
                .slice(-5)
                .reverse()
                .map(([storyId, result]) => (
                  <Card key={storyId}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                        <div>
                          <p className="font-medium">
                            Story #{storyId.split("-")[1]}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {result.comprehensionScore}% comprehension •
                            {result.uniqueWordsClicked} words looked up
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        {Math.round(result.totalReadingTimeMs / 1000)}s
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </FadeIn>
        )}

        {/* Tips */}
        <FadeIn delay={400}>
          <Card className="mt-8 bg-muted/50">
            <CardContent className="p-5">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Reading Tips
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  • Try to understand meaning from context before clicking words
                </li>
                <li>• Listen to the audio to improve your pronunciation</li>
                <li>
                  • Don't worry about perfection — reading more is the key!
                </li>
                <li>
                  • Words you click often will be added to your review queue
                </li>
              </ul>
            </CardContent>
          </Card>
        </FadeIn>
      </main>
    </div>
  );
}
