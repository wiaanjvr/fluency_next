"use client";

/**
 * LessonFlow — Orchestrator component for the v2 lesson system
 *
 * Flow:
 *   1. Fetch learner profile
 *   2. Phase 1: Word Introduction (if new words available)
 *   3. Phase 2: Story Lesson (AI-generated story)
 *   4. Exercise (mastery-stage appropriate)
 *   5. Mastery update + session complete
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  LearnerProfile,
  WordIntroductionItem,
  GeneratedStory,
  LessonExercise,
  MasteryStageConfig,
  StoryTone,
  LessonPhaseV2,
} from "@/types/lesson-v2";
import WordIntroduction from "./WordIntroduction";
import StoryLesson from "./StoryLesson";
import ExercisePanel from "./ExercisePanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Loader2,
  BookOpen,
  PartyPopper,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

interface ProfileResponse {
  profile: LearnerProfile;
  stage: MasteryStageConfig;
  mixingRatio: { english: number; target: number };
}

interface IntroWordsResponse {
  words: WordIntroductionItem[];
  totalKnown: number;
  batchSize: number;
}

interface StoryResponse {
  story: GeneratedStory;
  exercise: LessonExercise;
  tone: StoryTone;
  stage: MasteryStageConfig;
  interestTheme: string;
  interestIndex: number;
  masteryCount: number;
}

interface MasteryUpdateResponse {
  word: string;
  newStatus: string;
  correctStreak: number;
  masteryCount: number;
}

// ─── Sub-phase for more granular progress ────────────────────────
type SubPhase =
  | "loading-profile"
  | "loading-words"
  | "word-intro"
  | "saving-words"
  | "loading-story"
  | "story"
  | "exercise"
  | "updating-mastery"
  | "complete"
  | "error";

export default function LessonFlow() {
  const router = useRouter();

  // ─── State ──────────────────────────────────────────────────────
  const [subPhase, setSubPhase] = useState<SubPhase>("loading-profile");
  const [error, setError] = useState<string | null>(null);

  // Profile
  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [stage, setStage] = useState<MasteryStageConfig | null>(null);

  // Phase 1
  const [introWords, setIntroWords] = useState<WordIntroductionItem[]>([]);

  // Phase 2
  const [story, setStory] = useState<GeneratedStory | null>(null);
  const [exercise, setExercise] = useState<LessonExercise | null>(null);
  const [tone, setTone] = useState<StoryTone | undefined>();
  const [interestIndex, setInterestIndex] = useState<number | undefined>();

  // Exercise results
  const [exerciseResponse, setExerciseResponse] = useState<string>("");
  const [exerciseCorrect, setExerciseCorrect] = useState(false);

  // ─── API helpers ─────────────────────────────────────────────────

  const fetchProfile = useCallback(async () => {
    const res = await fetch("/api/lesson-v2/learner-profile");
    if (!res.ok) throw new Error("Failed to load profile");
    return (await res.json()) as ProfileResponse;
  }, []);

  const fetchIntroWords = useCallback(async () => {
    const res = await fetch("/api/lesson-v2/introduce-words");
    if (!res.ok) throw new Error("Failed to load words");
    return (await res.json()) as IntroWordsResponse;
  }, []);

  const saveIntroducedWords = useCallback(
    async (words: WordIntroductionItem[], guesses: Record<string, string>) => {
      const res = await fetch("/api/lesson-v2/introduce-words", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ words, guesses }),
      });
      if (!res.ok) throw new Error("Failed to save words");
      return res.json();
    },
    [],
  );

  const generateStory = useCallback(async () => {
    const res = await fetch("/api/lesson-v2/generate-story", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        previousTone: tone,
        previousInterestIndex: interestIndex,
      }),
    });
    if (!res.ok) throw new Error("Failed to generate story");
    return (await res.json()) as StoryResponse;
  }, [tone, interestIndex]);

  const updateMastery = useCallback(async (lemma: string, correct: boolean) => {
    const res = await fetch("/api/lesson-v2/update-mastery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lemma, correct }),
    });
    if (!res.ok) throw new Error("Failed to update mastery");
    return (await res.json()) as MasteryUpdateResponse;
  }, []);

  // ─── Flow control ──────────────────────────────────────────────

  // Step 1: Load profile on mount
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setSubPhase("loading-profile");
        const data = await fetchProfile();
        if (cancelled) return;

        setProfile(data.profile);
        setStage(data.stage);

        // Decide: do we need Phase 1?
        setSubPhase("loading-words");
        const wordsData = await fetchIntroWords();
        if (cancelled) return;

        if (wordsData.words.length > 0) {
          setIntroWords(wordsData.words);
          setSubPhase("word-intro");
        } else {
          // Skip Phase 1, go straight to story
          setSubPhase("loading-story");
          await loadStory();
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || "Something went wrong");
          setSubPhase("error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load story helper (used after word intro or directly)
  const loadStory = useCallback(async () => {
    try {
      setSubPhase("loading-story");
      const data = await generateStory();
      setStory(data.story);
      setExercise(data.exercise);
      setTone(data.tone);
      setStage(data.stage);
      setInterestIndex(data.interestIndex);
      setSubPhase("story");
    } catch (err: any) {
      setError(err.message || "Failed to generate story");
      setSubPhase("error");
    }
  }, [generateStory]);

  // ─── Phase callbacks ───────────────────────────────────────────

  const handleWordIntroComplete = useCallback(
    async (guesses: Record<string, string>) => {
      try {
        setSubPhase("saving-words");
        await saveIntroducedWords(introWords, guesses);
        await loadStory();
      } catch (err: any) {
        setError(err.message || "Failed to save words");
        setSubPhase("error");
      }
    },
    [introWords, saveIntroducedWords, loadStory],
  );

  const handleStoryComplete = useCallback(() => {
    setSubPhase("exercise");
  }, []);

  const handleExerciseComplete = useCallback(
    async (response: string, correct: boolean) => {
      setExerciseResponse(response);
      setExerciseCorrect(correct);

      try {
        setSubPhase("updating-mastery");

        // Update mastery for every new word introduced in the story
        if (story?.new_words_introduced) {
          for (const lemma of story.new_words_introduced) {
            await updateMastery(lemma, correct);
          }
        }

        // Also update mastery for known words used in the story (if correct)
        if (correct && story?.story) {
          const allTargetWords = new Set(
            story.story.flatMap((s) => s.target_words_used),
          );
          const newWordsSet = new Set(story.new_words_introduced || []);
          for (const word of allTargetWords) {
            if (!newWordsSet.has(word)) {
              await updateMastery(word, true);
            }
          }
        }

        setSubPhase("complete");
      } catch (err: any) {
        setError(err.message || "Failed to update mastery");
        setSubPhase("error");
      }
    },
    [story, updateMastery],
  );

  // ─── Render ────────────────────────────────────────────────────

  // Loading states
  if (
    subPhase === "loading-profile" ||
    subPhase === "loading-words" ||
    subPhase === "saving-words" ||
    subPhase === "loading-story" ||
    subPhase === "updating-mastery"
  ) {
    const messages: Record<string, string> = {
      "loading-profile": "Loading your profile...",
      "loading-words": "Preparing new words...",
      "saving-words": "Saving your progress...",
      "loading-story": "Generating your story...",
      "updating-mastery": "Updating your progress...",
    };

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">{messages[subPhase]}</p>
      </div>
    );
  }

  // Error state
  if (subPhase === "error") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
            <p className="text-destructive font-medium">{error}</p>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Phase 1: Word Introduction
  if (subPhase === "word-intro" && introWords.length > 0) {
    return (
      <div className="max-w-lg mx-auto space-y-4">
        <div className="text-center space-y-1">
          <h2 className="text-xl font-bold">New Words</h2>
          <p className="text-sm text-muted-foreground">
            Listen, shadow, and guess the meaning of each word
          </p>
        </div>
        <WordIntroduction
          words={introWords}
          language={profile?.targetLanguage || "fr"}
          onComplete={handleWordIntroComplete}
        />
      </div>
    );
  }

  // Phase 2: Story lesson
  if (subPhase === "story" && story && stage) {
    return (
      <div className="max-w-lg mx-auto space-y-4">
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold">Story Time</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            {story.interest_theme} — {stage.label}
          </p>
        </div>
        <StoryLesson
          story={story}
          stage={stage}
          language={profile?.targetLanguage || "fr"}
          onComplete={handleStoryComplete}
        />
      </div>
    );
  }

  // Exercise
  if (subPhase === "exercise" && exercise) {
    return (
      <div className="max-w-lg mx-auto space-y-4">
        <div className="text-center space-y-1">
          <h2 className="text-xl font-bold">Practice</h2>
          <p className="text-sm text-muted-foreground">
            {stage?.label} exercise
          </p>
        </div>
        <ExercisePanel
          exercise={exercise}
          onComplete={handleExerciseComplete}
        />
      </div>
    );
  }

  // Complete
  if (subPhase === "complete") {
    return (
      <div className="max-w-lg mx-auto">
        <Card>
          <CardContent className="pt-8 pb-8 text-center space-y-6">
            <PartyPopper className="h-12 w-12 text-yellow-500 mx-auto" />
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Lesson Complete!</h2>
              <p className="text-muted-foreground">
                {exerciseCorrect
                  ? "Great work — you nailed the exercise!"
                  : "Keep practicing — every lesson builds fluency!"}
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
              <div className="p-3 rounded-xl bg-muted/50 text-center">
                <p className="text-2xl font-bold text-primary">
                  {introWords.length || 0}
                </p>
                <p className="text-xs text-muted-foreground">New words</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/50 text-center">
                <p className="text-2xl font-bold text-primary">
                  {story?.story.length || 0}
                </p>
                <p className="text-xs text-muted-foreground">Sentences read</p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                size="lg"
                onClick={() => window.location.reload()}
                className="w-full"
              >
                Next Lesson
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => router.push("/dashboard")}
                className="w-full"
              >
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fallback
  return null;
}
