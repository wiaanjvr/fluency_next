"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import LoadingScreen from "@/components/ui/LoadingScreen";
import { MicroStorySession } from "@/components/micro-stories";
import {
  getFoundationProgress,
  getLearnedWords,
} from "@/lib/srs/foundation-srs";
import { MicroStoryProgress } from "@/types/micro-stories";
import { checkMicroStoriesUnlock } from "@/lib/micro-stories/utils";

// ============================================================================
// MICRO-STORIES SESSION PAGE
// Active reading session for Phase 2: Micro-Stories
// ============================================================================

export default function MicroStoriesSessionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [knownWordCount, setKnownWordCount] = useState(0);
  const [knownWordLemmas, setKnownWordLemmas] = useState<Set<string>>(
    new Set(),
  );
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [canStart, setCanStart] = useState(true);
  const [checkingLimits, setCheckingLimits] = useState(true);

  // Load user vocabulary on mount
  useEffect(() => {
    const loadVocabulary = async () => {
      try {
        // Check usage limits first
        try {
          const response = await fetch("/api/usage/check", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionType: "microstory" }),
          });

          if (response.ok) {
            const usageStatus = await response.json();
            setCanStart(usageStatus.allowed);
          }
        } catch (error) {
          console.error("Error checking usage limits:", error);
          setCanStart(true); // Allow on error
        } finally {
          setCheckingLimits(false);
        }

        // Get foundation progress
        const progress = await getFoundationProgress();
        const wordCount = progress?.totalWordsLearned || 0;

        // Check unlock status
        const unlocked = checkMicroStoriesUnlock(wordCount);
        setIsUnlocked(unlocked);

        if (!unlocked) {
          router.replace("/learn/stories");
          return;
        }

        // Get learned words for vocabulary matching
        const learnedWords = getLearnedWords();
        const lemmas = new Set<string>();

        learnedWords.forEach((word, key) => {
          lemmas.add(word.lemma.toLowerCase());
        });

        // Add common function words that are always "known"
        const commonWords = [
          "le",
          "la",
          "les",
          "un",
          "une",
          "des",
          "de",
          "du",
          "à",
          "au",
          "aux",
          "et",
          "ou",
          "mais",
          "donc",
          "car",
          "ni",
          "je",
          "tu",
          "il",
          "elle",
          "nous",
          "vous",
          "ils",
          "elles",
          "on",
          "ce",
          "cette",
          "ces",
          "mon",
          "ma",
          "mes",
          "ton",
          "ta",
          "tes",
          "son",
          "sa",
          "ses",
          "notre",
          "votre",
          "leur",
          "qui",
          "que",
          "quoi",
          "dont",
          "où",
          "être",
          "avoir",
          "faire",
          "aller",
          "venir",
          "voir",
          "pouvoir",
          "vouloir",
          "devoir",
          "savoir",
          "ne",
          "pas",
          "plus",
          "très",
          "bien",
          "aussi",
          "encore",
          "toujours",
        ];
        commonWords.forEach((w) => lemmas.add(w));

        setKnownWordCount(wordCount);
        setKnownWordLemmas(lemmas);
        setLoading(false);
      } catch (error) {
        console.error("Error loading vocabulary:", error);
        setLoading(false);
      }
    };

    loadVocabulary();
  }, [router]);

  // Handle session completion
  const handleSessionComplete = async (progress: MicroStoryProgress) => {
    console.log("Session completed:", progress);

    // Update profile metrics (streak, sessions_completed, total_practice_minutes)
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select(
            "last_lesson_date, streak, total_practice_minutes, sessions_completed",
          )
          .eq("id", user.id)
          .single();

        if (!profileError && profile) {
          const today = new Date().toISOString().split("T")[0];
          const lastLessonDate = profile?.last_lesson_date;
          const practicedMinutes = 5; // Default 5 minutes for microstory session

          // Calculate new streak
          let newStreak = 1;
          if (lastLessonDate) {
            const lastDate = new Date(lastLessonDate);
            const todayDate = new Date(today);
            const daysDiff = Math.floor(
              (todayDate.getTime() - lastDate.getTime()) /
                (1000 * 60 * 60 * 24),
            );

            if (daysDiff === 0) {
              // Same day - maintain streak
              newStreak = profile?.streak || 1;
            } else if (daysDiff === 1) {
              // Consecutive day - increment streak
              newStreak = (profile?.streak || 0) + 1;
            }
            // daysDiff > 1 means streak resets to 1
          }

          const { error: updateError } = await supabase
            .from("profiles")
            .update({
              streak: newStreak,
              last_lesson_date: today,
              total_practice_minutes:
                (profile?.total_practice_minutes || 0) + practicedMinutes,
              sessions_completed: (profile?.sessions_completed || 0) + 1,
            })
            .eq("id", user.id);

          if (updateError) {
            console.error("Error updating profile metrics:", updateError);
          } else {
            console.log("Profile metrics updated successfully:", {
              streak: newStreak,
              total_practice_minutes:
                (profile?.total_practice_minutes || 0) + practicedMinutes,
              sessions_completed: (profile?.sessions_completed || 0) + 1,
            });
          }

          // Insert lesson record for average score tracking
          // Calculate comprehension based on stories completed
          const comprehensionScore = progress?.storiesCompleted
            ? Math.min(100, 70 + progress.storiesCompleted * 5)
            : 75;
          const lessonId = `microstory-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const { error: lessonError } = await supabase.from("lessons").insert({
            id: lessonId,
            user_id: user.id,
            title: "Micro-Story Reading Session",
            target_text: "Reading comprehension practice",
            translation: "",
            language: "fr",
            level: "B1",
            completed: true,
            completed_at: new Date().toISOString(),
            final_comprehension_score: comprehensionScore,
          });

          if (lessonError) {
            console.error("Error inserting lesson record:", lessonError);
          } else {
            console.log(
              "Lesson record inserted with score:",
              comprehensionScore,
            );
          }
        }
      }
    } catch (err) {
      console.error("Failed to update profile metrics:", err);
    }

    // Track usage for free tier limits
    try {
      await fetch("/api/usage/increment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionType: "microstory" }),
      });
    } catch (err) {
      console.error("Failed to track microstory session usage:", err);
    }

    router.push("/learn/stories");
  };

  // Handle exit
  const handleExit = () => {
    router.push("/learn/stories");
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (!isUnlocked) {
    return null; // Will redirect
  }

  if (checkingLimits) {
    return <LoadingScreen />;
  }

  if (!canStart) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-center">Daily Limit Reached</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              You've completed your microstory session for today. Come back
              tomorrow to continue learning, or upgrade to Premium for unlimited
              access.
            </p>
            <div className="flex flex-col gap-2">
              <Button
                onClick={() => router.push("/pricing")}
                className="w-full"
              >
                Upgrade to Premium
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/learn/stories")}
                className="w-full"
              >
                Back to Stories
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/learn/stories">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Exit
            </Button>
          </Link>
          <h1 className="font-serif text-xl">Reading Session</h1>
          <div className="w-20" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <MicroStorySession
          knownWordCount={knownWordCount}
          knownWordLemmas={knownWordLemmas}
          onSessionComplete={handleSessionComplete}
          onExit={handleExit}
        />
      </main>
    </div>
  );
}
