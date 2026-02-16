"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { InteractiveStory } from "@/components/learning/InteractiveStory";
import { Button } from "@/components/ui/button";
import LoadingScreen from "@/components/ui/LoadingScreen";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { GeneratedStory, ProficiencyLevel, WordRating } from "@/types";
import { BookOpen, Brain, Home, BarChart3, Sparkles } from "lucide-react";

export default function SRSLearnPage() {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [currentStory, setCurrentStory] = useState<GeneratedStory | null>(null);
  const [userLevel, setUserLevel] = useState<ProficiencyLevel>("A1");
  const [stats, setStats] = useState<any>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login");
        return;
      }

      // Get user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("proficiency_level, target_language")
        .eq("id", user.id)
        .single();

      if (profile) {
        setUserLevel(profile.proficiency_level as ProficiencyLevel);
      }

      // Get vocabulary stats
      await loadStats();

      // Check for incomplete stories
      const { data: incompleteStories } = await supabase
        .from("generated_stories")
        .select("*")
        .eq("user_id", user.id)
        .eq("completed", false)
        .order("created_at", { ascending: false })
        .limit(1);

      if (incompleteStories && incompleteStories.length > 0) {
        setCurrentStory(incompleteStories[0] as GeneratedStory);
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch("/api/words/stats");
      const data = await response.json();
      setStats(data.stats);
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const handleGenerateStory = async () => {
    setGenerating(true);
    try {
      const response = await fetch("/api/stories/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          level: userLevel,
          prioritize_review: true,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate story");
      }

      const data = await response.json();
      setCurrentStory(data.story);
    } catch (error) {
      console.error("Error generating story:", error);
      alert("Failed to generate story. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleWordRated = async (word: string, rating: WordRating) => {
    try {
      const response = await fetch("/api/words/rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word,
          lemma: word.toLowerCase(),
          rating,
          language: "fr",
          story_id: currentStory?.id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to rate word");
      }

      // Reload stats
      await loadStats();
    } catch (error) {
      console.error("Error rating word:", error);
      alert("Failed to save rating. Please try again.");
    }
  };

  const handleStoryComplete = async () => {
    if (!currentStory) return;

    try {
      // Mark story as completed
      await supabase
        .from("generated_stories")
        .update({ completed: true, completed_at: new Date().toISOString() })
        .eq("id", currentStory.id);

      // Clear current story
      setCurrentStory(null);

      // Reload stats
      await loadStats();
    } catch (error) {
      console.error("Error completing story:", error);
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  // Show the story if there's one in progress
  if (currentStory) {
    return (
      <InteractiveStory
        story={currentStory}
        onComplete={handleStoryComplete}
        onWordRated={handleWordRated}
      />
    );
  }

  // Dashboard view
  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">Learn French</h1>
          <p className="text-muted-foreground">
            Comprehensible input with spaced repetition
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push("/dashboard")}>
          <Home className="w-4 h-4 mr-2" />
          Dashboard
        </Button>
      </div>

      {/* Vocabulary Stats */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Your Vocabulary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">
                  {stats.total}
                </div>
                <div className="text-sm text-muted-foreground">Total Words</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-600">
                  {stats.learning}
                </div>
                <div className="text-sm text-muted-foreground">Learning</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {stats.known}
                </div>
                <div className="text-sm text-muted-foreground">Known</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {stats.mastered}
                </div>
                <div className="text-sm text-muted-foreground">Mastered</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">
                  {stats.dueForReview}
                </div>
                <div className="text-sm text-muted-foreground">Due Today</div>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">Knowledge Progress</span>
                <span className="text-sm font-semibold">
                  {Math.round(stats.percentageKnown)}%
                </span>
              </div>
              <Progress value={stats.percentageKnown} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generate New Story */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Ready to Learn?
          </CardTitle>
          <CardDescription>
            Generate a personalized story at your level ({userLevel}). The story
            will use 95% words you know and introduce 5% new vocabulary, with
            priority given to words due for review.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleGenerateStory}
            disabled={generating}
            size="lg"
            className="w-full md:w-auto gap-2"
          >
            {generating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating story...
              </>
            ) : (
              <>
                <BookOpen className="w-5 h-5" />
                Generate New Story
              </>
            )}
          </Button>

          {stats && stats.total === 0 && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <Brain className="w-4 h-4 inline mr-2" />
                This is your first story! We'll introduce you to common French
                words and start building your vocabulary.
              </p>
            </div>
          )}

          {stats && stats.dueForReview > 0 && (
            <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-950 rounded-lg">
              <p className="text-sm text-orange-900 dark:text-orange-100">
                You have {stats.dueForReview} word
                {stats.dueForReview !== 1 ? "s" : ""} due for review. Your next
                story will prioritize these words!
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* How it Works */}
      <Card>
        <CardHeader>
          <CardTitle>How This Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
              1
            </div>
            <div>
              <h4 className="font-semibold mb-1">Listen First</h4>
              <p className="text-sm text-muted-foreground">
                Focus on comprehension through listening before reading.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
              2
            </div>
            <div>
              <h4 className="font-semibold mb-1">Read Along</h4>
              <p className="text-sm text-muted-foreground">
                New words are highlighted. Try to understand them from context.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
              3
            </div>
            <div>
              <h4 className="font-semibold mb-1">Rate Your Knowledge</h4>
              <p className="text-sm text-muted-foreground">
                Click on each word and honestly rate how well you know it. This
                helps the system show you the right content at the right time.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
