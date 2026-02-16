"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { SentenceTransitionSession } from "@/components/sentence-transition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import LoadingScreen from "@/components/ui/LoadingScreen";

// ============================================================================
// SENTENCE SESSION PAGE
// Individual session for sentence transition exercises
// ============================================================================

export default function SentenceSessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionNumber = parseInt(params.sessionId as string, 10) || 1;
  const [canStart, setCanStart] = useState(true);
  const [checking, setChecking] = useState(true);
  const [targetLanguage, setTargetLanguage] = useState<string>("fr");

  // Check usage limits and load target language before starting session
  useEffect(() => {
    async function checkLimitsAndLoadLanguage() {
      try {
        // Load target language from user profile
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("target_language")
            .eq("id", user.id)
            .single();

          const language = profile?.target_language || "fr";
          setTargetLanguage(language);
        }

        // Check usage limits
        const response = await fetch("/api/usage/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionType: "sentence" }),
        });

        if (response.ok) {
          const usageStatus = await response.json();
          setCanStart(usageStatus.allowed);
        }
      } catch (error) {
        console.error("Error checking usage limits:", error);
        // Allow session on error
        setCanStart(true);
      } finally {
        setChecking(false);
      }
    }

    checkLimitsAndLoadLanguage();
  }, []);

  const handleSessionComplete = async (results: any) => {
    // Save progress to localStorage
    try {
      const existing = localStorage.getItem("sentence-transition-progress");
      const progress = existing
        ? JSON.parse(existing)
        : { sessionsCompleted: 0 };

      progress.sessionsCompleted = Math.max(
        progress.sessionsCompleted,
        sessionNumber,
      );
      progress.lastSessionDate = new Date().toISOString();

      localStorage.setItem(
        "sentence-transition-progress",
        JSON.stringify(progress),
      );

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
            const practicedMinutes = 5; // Default 5 minutes for sentence session

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
            const accuracy = results?.accuracy || 0;
            const lessonId = `sentence-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const { error: lessonError } = await supabase
              .from("lessons")
              .insert({
                id: lessonId,
                user_id: user.id,
                title: `Sentence Session ${sessionNumber}`,
                target_text: "Sentence transition exercises",
                translation: "",
                language: targetLanguage, // Use actual target language
                level: "A2",
                completed: true,
                completed_at: new Date().toISOString(),
                final_comprehension_score: accuracy,
              });

            if (lessonError) {
              console.error("Error inserting lesson record:", lessonError);
            } else {
              console.log("Lesson record inserted with score:", accuracy);
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
          body: JSON.stringify({ sessionType: "sentence" }),
        });
      } catch (err) {
        console.error("Failed to track sentence session usage:", err);
      }
    } catch (e) {
      console.error("Failed to save session progress:", e);
    }
  };

  if (checking) {
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
              You've completed all your sentence sessions for today. Come back
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
                onClick={() => router.push("/learn/sentences")}
                className="w-full"
              >
                Back to Sentences
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <SentenceTransitionSession
      sessionNumber={sessionNumber}
      onComplete={handleSessionComplete}
    />
  );
}
