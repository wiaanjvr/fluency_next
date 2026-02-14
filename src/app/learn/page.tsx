"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { InteractiveStory } from "@/components/learning/InteractiveStory";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { GeneratedStory, ProficiencyLevel, WordRating } from "@/types";
import {
  Loader2,
  Home,
  BarChart3,
  Trophy,
  Target,
  ChevronRight,
} from "lucide-react";

export default function LearnPage() {
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
        router.replace("/auth/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("proficiency_level, target_language")
        .eq("id", user.id)
        .single();

      if (profile) {
        setUserLevel(profile.proficiency_level as ProficiencyLevel);
      }

      await loadStats();

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

      await loadStats();
    } catch (error) {
      console.error("Error rating word:", error);
      alert("Failed to save rating. Please try again.");
    }
  };

  const handleStoryComplete = async () => {
    if (!currentStory) return;

    try {
      await supabase
        .from("generated_stories")
        .update({ completed: true, completed_at: new Date().toISOString() })
        .eq("id", currentStory.id);

      setCurrentStory(null);
      await loadStats();
    } catch (error) {
      console.error("Error completing story:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background px-6">
        <div className="text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-library-forest/10 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-library-forest" />
          </div>
          <p className="text-muted-foreground font-light">
            Preparing your session...
          </p>
        </div>
      </div>
    );
  }

  if (currentStory) {
    return (
      <InteractiveStory
        story={currentStory}
        onComplete={handleStoryComplete}
        onWordRated={handleWordRated}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="flex items-center justify-between mb-16">
          <div className="space-y-3">
            <h1 className="text-4xl sm:text-5xl font-light tracking-tight">
              Practice{" "}
              <span className="font-serif italic text-library-brass">
                session
              </span>
            </h1>
            <p className="text-muted-foreground font-light">
              Spaced repetition meets comprehensible input
            </p>
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className="h-10 px-5 rounded-xl border border-border hover:bg-card text-sm font-light transition-colors flex items-center gap-2"
          >
            <Home className="w-4 h-4" />
            Dashboard
          </button>
        </div>

        {/* Vocabulary Stats */}
        {stats && (
          <div className="mb-12">
            <div className="bg-card border border-border rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-library-forest/10 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-library-forest" />
                </div>
                <h2 className="text-xl font-medium">Vocabulary Progress</h2>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="p-5 rounded-xl bg-muted/30 border border-border/30">
                  <div className="text-3xl font-light text-library-brass mb-1">
                    {stats.total}
                  </div>
                  <div className="text-sm text-muted-foreground font-light">
                    Total Words
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-muted/30 border border-border/30">
                  <div className="text-3xl font-light text-library-brass mb-1">
                    {stats.learning}
                  </div>
                  <div className="text-sm text-muted-foreground font-light">
                    Learning
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-muted/30 border border-border/30">
                  <div className="text-3xl font-light text-library-brass mb-1">
                    {stats.known}
                  </div>
                  <div className="text-sm text-muted-foreground font-light">
                    Known
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-muted/30 border border-border/30">
                  <div className="text-3xl font-light text-library-brass mb-1">
                    {stats.mastered}
                  </div>
                  <div className="text-sm text-muted-foreground font-light flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5" />
                    Mastered
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-muted/30 border border-border/30">
                  <div className="text-3xl font-light text-library-brass mb-1">
                    {stats.ignored || 0}
                  </div>
                  <div className="text-sm text-muted-foreground font-light">
                    Familiar
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Generate New Story */}
        <div className="bg-card border border-border rounded-2xl p-10 relative overflow-hidden mb-12">
          {/* Ambient gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-library-brass/5 via-transparent to-luxury-bronze/5" />

          <div className="relative z-10 space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-library-forest/10 text-library-forest">
              <Target className="h-4 w-4" />
              <span className="text-sm font-medium">Ready to Learn</span>
            </div>

            <div className="space-y-3">
              <h2 className="text-3xl font-light tracking-tight">
                Begin your{" "}
                <span className="font-serif italic text-library-brass">
                  session
                </span>
              </h2>
              <p className="text-muted-foreground font-light max-w-2xl">
                Generate a personalized story at your level ({userLevel}).
                Curated with 95% familiar words and 5% new vocabulary,
                prioritizing words due for review.
              </p>
            </div>

            <button
              onClick={handleGenerateStory}
              disabled={generating}
              className="py-4 px-8 bg-library-brass hover:bg-library-brass/90 text-background font-medium rounded-xl transition-all duration-300 flex items-center gap-3 disabled:opacity-50"
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating your story...
                </>
              ) : (
                <>
                  Generate New Story
                  <ChevronRight className="h-5 w-5" />
                </>
              )}
            </button>

            {stats && stats.total === 0 && (
              <div className="p-5 rounded-xl bg-muted/50 border border-border">
                <p className="text-sm font-light text-muted-foreground">
                  Your first session. We'll introduce common words and begin
                  building your vocabulary foundation.
                </p>
              </div>
            )}

            {stats && stats.dueForReview > 0 && (
              <div className="p-5 rounded-xl bg-muted/50 border border-border">
                <p className="text-sm font-light text-muted-foreground">
                  You have{" "}
                  <span className="text-library-brass font-medium">
                    {stats.dueForReview}
                  </span>{" "}
                  word
                  {stats.dueForReview !== 1 ? "s" : ""} ready for review. Your
                  next story will prioritize these for optimal retention.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* How it Works */}
        <div className="bg-card border border-border rounded-2xl p-8">
          <h3 className="text-2xl font-light tracking-tight mb-10">
            The{" "}
            <span className="font-serif italic text-library-brass">method</span>
          </h3>

          <div className="space-y-10">
            <div className="flex gap-6">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-xl bg-library-forest/10 flex items-center justify-center">
                  <span className="text-lg font-light text-library-forest">
                    01
                  </span>
                </div>
              </div>
              <div className="pt-1">
                <h4 className="text-lg font-medium mb-2">
                  Listen First, Struggle
                </h4>
                <p className="text-muted-foreground font-light leading-relaxed">
                  Focus on comprehension through listening before seeing text.
                  The discomfort is the learning.
                </p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-xl bg-library-forest/10 flex items-center justify-center">
                  <span className="text-lg font-light text-library-forest">
                    02
                  </span>
                </div>
              </div>
              <div className="pt-1">
                <h4 className="text-lg font-medium mb-2">
                  Speak Before Reading
                </h4>
                <p className="text-muted-foreground font-light leading-relaxed">
                  Verbalize what you understood. Forced output builds real
                  fluency that silent reading cannot.
                </p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-xl bg-library-forest/10 flex items-center justify-center">
                  <span className="text-lg font-light text-library-forest">
                    03
                  </span>
                </div>
              </div>
              <div className="pt-1">
                <h4 className="text-lg font-medium mb-2">Rate & Reinforce</h4>
                <p className="text-muted-foreground font-light leading-relaxed">
                  Honestly rate your familiarity with each word. Spaced
                  repetition ensures words appear at optimal intervals.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
