"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Lesson,
  LessonPhase,
  LessonSessionState,
  ComprehensionResponse,
  VocabularyRating,
  Exercise,
  ExerciseAttempt,
  LESSON_PHASE_ORDER,
} from "@/types/lesson";
import { WordRating } from "@/types";

// Phase Components - Import from index
import {
  // New 10-phase components
  SpacedRetrievalWarmupPhase,
  PredictionStagePhase,
  AudioTextPhase,
  FirstRecallPhase,
  TranscriptRevealPhase,
  GuidedNoticingPhase,
  MicroDrillsPhase,
  ShadowingPhase,
  SecondRecallPhase,
  ProgressReflectionPhase,
  // Legacy components
  AudioComprehensionPhase,
  VerbalCheckPhase,
  ConversationFeedbackPhase,
  TextRevealPhase,
  InteractiveExercisesPhase,
  FinalAssessmentPhase,
  // Shared components
  LessonComplete,
  LessonHeader,
  LessonLoading,
} from "@/components/lesson";

import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";

// Legacy phase order (for old lessons without content structure)
const LEGACY_PHASE_ORDER: LessonPhase[] = [
  "audio-comprehension" as LessonPhase,
  "verbal-check" as LessonPhase,
  "conversation-feedback" as LessonPhase,
  "text-reveal" as LessonPhase,
  "interactive-exercises" as LessonPhase,
  "final-assessment" as LessonPhase,
];

// Check if lesson uses new 10-phase structure
const isNewLessonStructure = (lesson: Lesson | null): boolean => {
  return !!lesson?.content;
};

export default function LessonPage() {
  const router = useRouter();
  const supabase = createClient();

  // Main state
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [currentPhase, setCurrentPhase] = useState<LessonPhase>(
    "spaced-retrieval-warmup",
  );
  const [completed, setCompleted] = useState(false);

  // Phase-specific state (legacy)
  const [listenCount, setListenCount] = useState(0);
  const [initialResponse, setInitialResponse] =
    useState<ComprehensionResponse | null>(null);
  const [vocabularyRatings, setVocabularyRatings] = useState<
    VocabularyRating[]
  >([]);
  const [exerciseAttempts, setExerciseAttempts] = useState<ExerciseAttempt[]>(
    [],
  );
  const [finalResponse, setFinalResponse] =
    useState<ComprehensionResponse | null>(null);

  // New 10-phase state
  const [warmupResponses, setWarmupResponses] = useState<
    Record<string, string>
  >({});
  const [prediction, setPrediction] = useState("");
  const [firstRecallResponse, setFirstRecallResponse] = useState<{
    text?: string;
    audioUrl?: string;
  }>({});
  const [noticingInferences, setNoticingInferences] = useState<
    Record<string, string>
  >({});
  const [drillResults, setDrillResults] = useState<
    Record<number, { response: string; correct: boolean }>
  >({});
  const [shadowingCount, setShadowingCount] = useState(0);
  const [secondRecallResponse, setSecondRecallResponse] = useState<{
    text?: string;
    audioUrl?: string;
  }>({});
  const [reflectionResponses, setReflectionResponses] = useState<
    Record<string, string>
  >({});

  // Progress tracking
  const [overallProgress, setOverallProgress] = useState(0);
  const [lessonStartTime, setLessonStartTime] = useState<number | null>(null);

  // Get the appropriate phase order based on lesson structure
  const getPhaseOrder = useCallback(() => {
    return isNewLessonStructure(lesson)
      ? LESSON_PHASE_ORDER
      : LEGACY_PHASE_ORDER;
  }, [lesson]);

  // Get initial phase for lesson type
  const getInitialPhase = useCallback(() => {
    return isNewLessonStructure(lesson)
      ? "spaced-retrieval-warmup"
      : ("audio-comprehension" as LessonPhase);
  }, [lesson]);

  // Load user and check for existing lesson
  useEffect(() => {
    loadUserAndLesson();
  }, []);

  const loadUserAndLesson = async () => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace("/auth/login");
        return;
      }

      // Check for incomplete lesson
      const { data: incompleteLessons } = await supabase
        .from("lessons")
        .select("*")
        .eq("user_id", user.id)
        .eq("completed", false)
        .order("created_at", { ascending: false })
        .limit(1);

      if (incompleteLessons && incompleteLessons.length > 0) {
        const existingLesson = incompleteLessons[0] as Lesson;
        setLesson(existingLesson);
        // Use appropriate initial phase based on lesson structure
        const defaultPhase = existingLesson.content
          ? "spaced-retrieval-warmup"
          : ("audio-comprehension" as LessonPhase);
        setCurrentPhase(existingLesson.currentPhase || defaultPhase);
        setListenCount(existingLesson.listenCount || 0);
        setLessonStartTime(Date.now()); // Track session time from resume
      }
    } catch (error) {
      console.error("Error loading lesson:", error);
    } finally {
      setLoading(false);
    }
  };

  // Generate a new lesson
  const handleGenerateLesson = async () => {
    setGenerating(true);
    try {
      const response = await fetch("/api/lesson/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prioritizeReview: true,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate lesson");
      }

      const data = await response.json();
      setLesson(data.lesson);

      // Use appropriate initial phase based on lesson structure
      const initialPhase = data.lesson.content
        ? "spaced-retrieval-warmup"
        : ("audio-comprehension" as LessonPhase);
      setCurrentPhase(initialPhase);
      setListenCount(0);
      setOverallProgress(0);
      setLessonStartTime(Date.now());

      // Reset new phase state
      setWarmupResponses({});
      setPrediction("");
      setFirstRecallResponse({});
      setNoticingInferences({});
      setDrillResults({});
      setShadowingCount(0);
      setSecondRecallResponse({});
      setReflectionResponses({});

      // Debug: Log lesson data
      console.log("Lesson generated:", {
        id: data.lesson.id,
        totalWords: data.lesson.words?.length || 0,
        newWords: data.lesson.words?.filter((w: any) => w.isNew).length || 0,
        reviewWords:
          data.lesson.words?.filter((w: any) => w.isDueForReview).length || 0,
        hasWords: !!data.lesson.words,
        wordSample: data.lesson.words?.slice(0, 5),
      });
    } catch (error) {
      console.error("Error generating lesson:", error);
      alert("Failed to generate lesson. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  // Phase navigation
  const handlePhaseComplete = useCallback(
    (phase: LessonPhase) => {
      const phaseOrder = getPhaseOrder();
      const currentIndex = phaseOrder.indexOf(phase);
      const progress = ((currentIndex + 1) / phaseOrder.length) * 100;
      setOverallProgress(progress);

      if (currentIndex < phaseOrder.length - 1) {
        const nextPhase = phaseOrder[currentIndex + 1];
        setCurrentPhase(nextPhase);

        // Save progress to database
        if (lesson) {
          updateLessonProgress(nextPhase);
        }
      } else {
        // Lesson complete!
        setCompleted(true);
        if (lesson) {
          completeLessonInDatabase();
        }
      }
    },
    [lesson, getPhaseOrder],
  );

  const updateLessonProgress = async (phase: LessonPhase) => {
    if (!lesson) return;

    try {
      await supabase
        .from("lessons")
        .update({
          current_phase: phase,
          listen_count: listenCount,
        })
        .eq("id", lesson.id);
    } catch (error) {
      console.error("Error updating lesson progress:", error);
    }
  };

  const completeLessonInDatabase = async () => {
    if (!lesson) return;

    try {
      // Mark lesson as completed
      const { error: lessonError } = await supabase
        .from("lessons")
        .update({
          completed: true,
          completed_at: new Date().toISOString(),
        })
        .eq("id", lesson.id);

      if (lessonError) {
        console.error("Error updating lesson completion:", lessonError);
      }

      // Update user metrics
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error("Error getting user:", userError);
        return;
      }

      if (user) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select(
            "streak, last_lesson_date, total_practice_minutes, sessions_completed",
          )
          .eq("id", user.id)
          .single();

        if (profileError) {
          console.error("Error fetching profile:", profileError);
          // If columns don't exist, this will fail - show user-friendly message
          if (
            profileError.message?.includes("column") ||
            profileError.code === "PGRST204"
          ) {
            console.error(
              "Profile metrics columns may not exist. Run the add_lesson_metrics.sql migration.",
            );
          }
          return;
        }

        const today = new Date().toISOString().split("T")[0];
        const lastLessonDate = profile?.last_lesson_date;
        const practicedMinutes = lessonStartTime
          ? Math.round((Date.now() - lessonStartTime) / 60000)
          : 5; // Default 5 minutes if no start time

        // Calculate new streak
        let newStreak = 1;
        if (lastLessonDate) {
          const lastDate = new Date(lastLessonDate);
          const todayDate = new Date(today);
          const daysDiff = Math.floor(
            (todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24),
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
      }
    } catch (error) {
      console.error("Error completing lesson:", error);
    }
  };

  // Phase 1: Audio comprehension handlers
  const handleListenComplete = useCallback(() => {
    setListenCount((prev) => prev + 1);
  }, []);

  const handleAudioPhaseComplete = useCallback(() => {
    handlePhaseComplete("audio-comprehension" as LessonPhase);
  }, [handlePhaseComplete]);

  // Phase 2: Verbal check handlers
  const handleVerbalResponse = useCallback(
    async (response: ComprehensionResponse) => {
      setInitialResponse(response);

      // Save to database
      try {
        await fetch("/api/lesson/evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lessonId: lesson?.id,
            phase: "verbal-check",
            transcript: response.transcript,
            audioUrl: response.audioUrl,
          }),
        });
      } catch (error) {
        console.error("Error saving verbal response:", error);
      }

      handlePhaseComplete("verbal-check");
    },
    [lesson, handlePhaseComplete],
  );

  // Phase 3: Conversation feedback - handled by component

  // Phase 4: Vocabulary rating handlers
  const handleWordRating = useCallback(
    async (rating: VocabularyRating) => {
      setVocabularyRatings((prev) => [...prev, rating]);

      // Update SRS
      try {
        console.log("Saving word rating:", rating);
        const response = await fetch("/api/words/rate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            word: rating.word,
            lemma: rating.lemma,
            rating: rating.rating,
            language: lesson?.language || "fr",
            context_sentence: rating.context,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error("Error response from /api/words/rate:", errorData);
          throw new Error(
            `Failed to save word rating: ${errorData.error || response.statusText}`,
          );
        }

        const result = await response.json();
        console.log("Word rating saved successfully:", result);
      } catch (error) {
        console.error("Error rating word:", error);
        // Show user-friendly error
        alert(
          `Failed to save word "${rating.word}". Your progress may not be saved.`,
        );
      }
    },
    [lesson],
  );

  // Phase 5: Exercise handlers
  const handleExerciseAttempt = useCallback((attempt: ExerciseAttempt) => {
    setExerciseAttempts((prev) => [...prev, attempt]);
  }, []);

  // Phase 6: Final assessment
  const handleFinalResponse = useCallback(
    async (response: ComprehensionResponse) => {
      setFinalResponse(response);

      try {
        await fetch("/api/lesson/evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lessonId: lesson?.id,
            phase: "final-assessment",
            transcript: response.transcript,
            audioUrl: response.audioUrl,
          }),
        });
      } catch (error) {
        console.error("Error saving final response:", error);
      }

      handlePhaseComplete("final-assessment");
    },
    [lesson, handlePhaseComplete],
  );

  // Handle exit
  const handleExit = () => {
    router.push("/dashboard");
  };

  // Handle new lesson after completion
  const handleStartNewLesson = () => {
    setLesson(null);
    setCompleted(false);
    setCurrentPhase("spaced-retrieval-warmup");
    setListenCount(0);
    setInitialResponse(null);
    setVocabularyRatings([]);
    setExerciseAttempts([]);
    setFinalResponse(null);
    setOverallProgress(0);
    // Reset new phase state
    setWarmupResponses({});
    setPrediction("");
    setFirstRecallResponse({});
    setNoticingInferences({});
    setDrillResults({});
    setShadowingCount(0);
    setSecondRecallResponse({});
    setReflectionResponses({});
    handleGenerateLesson();
  };

  // Loading state
  if (loading) {
    return <LessonLoading />;
  }

  // No lesson - show generation screen
  if (!lesson && !completed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="max-w-lg w-full text-center space-y-10">
          {/* Icon */}
          <div className="w-20 h-20 mx-auto rounded-2xl bg-library-brass/10 flex items-center justify-center">
            <RefreshCw className="h-10 w-10 text-library-brass" />
          </div>

          {/* Heading */}
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl font-light tracking-tight">
              Ready to{" "}
              <span className="font-serif italic text-library-brass">
                learn
              </span>
              ?
            </h1>
            <p className="text-lg text-muted-foreground font-light max-w-sm mx-auto">
              Generate a personalized lesson based on your vocabulary and
              progress.
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-4">
            <button
              onClick={handleGenerateLesson}
              disabled={generating}
              className="w-full py-4 px-8 bg-library-brass hover:bg-library-brass/90 text-background font-medium rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? (
                <span className="flex items-center justify-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Generating Your Lesson...
                </span>
              ) : (
                "Start New Lesson"
              )}
            </button>

            <button
              onClick={handleExit}
              className="w-full py-4 px-8 bg-transparent border border-border hover:bg-card text-foreground font-light rounded-xl transition-all duration-300"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Lesson complete
  if (completed) {
    return (
      <LessonComplete
        lesson={lesson!}
        vocabularyRatings={vocabularyRatings}
        exerciseAttempts={exerciseAttempts}
        initialResponse={initialResponse}
        finalResponse={finalResponse}
        onStartNewLesson={handleStartNewLesson}
        onExit={handleExit}
      />
    );
  }

  // Main lesson phases
  return (
    <div className="min-h-screen bg-background">
      <LessonHeader
        lesson={lesson!}
        currentPhase={currentPhase}
        progress={overallProgress}
        onExit={handleExit}
      />

      <main className="container max-w-3xl mx-auto px-6 pt-32 pb-12">
        {/* ===== NEW 10-PHASE LESSON FLOW ===== */}

        {/* Phase 1: Spaced Retrieval Warmup */}
        {currentPhase === "spaced-retrieval-warmup" && lesson?.content && (
          <SpacedRetrievalWarmupPhase
            warmup={lesson.content.spacedRetrievalWarmup}
            onComplete={(responses) => {
              setWarmupResponses(responses);
              handlePhaseComplete("spaced-retrieval-warmup");
            }}
          />
        )}

        {/* Phase 2: Prediction Stage */}
        {currentPhase === "prediction-stage" && lesson?.content && (
          <PredictionStagePhase
            stage={lesson.content.predictionStage}
            onComplete={(pred) => {
              setPrediction(pred);
              handlePhaseComplete("prediction-stage");
            }}
          />
        )}

        {/* Phase 3: Audio Text (Listen to Story) */}
        {currentPhase === "audio-text" && lesson?.content && (
          <AudioTextPhase
            audioText={lesson.content.audioText}
            listenCount={listenCount}
            onListenComplete={() => setListenCount((prev) => prev + 1)}
            onPhaseComplete={() => handlePhaseComplete("audio-text")}
          />
        )}

        {/* Phase 4: First Recall Prompt */}
        {currentPhase === "first-recall" && lesson?.content && (
          <FirstRecallPhase
            prompt={lesson.content.firstRecallPrompt}
            onComplete={(response) => {
              setFirstRecallResponse(response);
              handlePhaseComplete("first-recall");
            }}
          />
        )}

        {/* Phase 5: Transcript with Highlights */}
        {currentPhase === "transcript-reveal" && lesson?.content && (
          <TranscriptRevealPhase
            transcript={lesson.content.transcriptWithHighlights}
            onComplete={() => handlePhaseComplete("transcript-reveal")}
          />
        )}

        {/* Phase 6: Guided Noticing */}
        {currentPhase === "guided-noticing" && lesson?.content && (
          <GuidedNoticingPhase
            noticing={lesson.content.guidedNoticing}
            onComplete={(inferences) => {
              setNoticingInferences(inferences);
              handlePhaseComplete("guided-noticing");
            }}
          />
        )}

        {/* Phase 7: Micro Drills */}
        {currentPhase === "micro-drills" && lesson?.content && (
          <MicroDrillsPhase
            drills={lesson.content.microDrills}
            onComplete={(results) => {
              setDrillResults(results);
              handlePhaseComplete("micro-drills");
            }}
          />
        )}

        {/* Phase 8: Shadowing Stage */}
        {currentPhase === "shadowing" && lesson?.content && (
          <ShadowingPhase
            stage={lesson.content.shadowingStage}
            onComplete={(count) => {
              setShadowingCount(count);
              handlePhaseComplete("shadowing");
            }}
          />
        )}

        {/* Phase 9: Second Recall Prompt */}
        {currentPhase === "second-recall" && lesson?.content && (
          <SecondRecallPhase
            prompt={lesson.content.secondRecallPrompt}
            onComplete={(response) => {
              setSecondRecallResponse(response);
              handlePhaseComplete("second-recall");
            }}
          />
        )}

        {/* Phase 10: Progress Reflection */}
        {currentPhase === "progress-reflection" && lesson?.content && (
          <ProgressReflectionPhase
            reflection={lesson.content.progressReflection}
            onComplete={(responses) => {
              setReflectionResponses(responses);
              handlePhaseComplete("progress-reflection");
            }}
          />
        )}

        {/* ===== LEGACY 6-PHASE LESSON FLOW ===== */}

        {/* Legacy Phase 1: Audio-Only Comprehension */}
        {currentPhase === ("audio-comprehension" as LessonPhase) &&
          !lesson?.content && (
            <AudioComprehensionPhase
              lesson={lesson!}
              listenCount={listenCount}
              onListenComplete={handleListenComplete}
              onPhaseComplete={handleAudioPhaseComplete}
            />
          )}

        {/* Legacy Phase 2: Verbal Comprehension Check */}
        {currentPhase === ("verbal-check" as LessonPhase) &&
          !lesson?.content && (
            <VerbalCheckPhase
              lesson={lesson!}
              onResponse={handleVerbalResponse}
              onPhaseComplete={() =>
                handlePhaseComplete("verbal-check" as LessonPhase)
              }
            />
          )}

        {/* Legacy Phase 3: Conversational Feedback Loop */}
        {currentPhase === ("conversation-feedback" as LessonPhase) &&
          !lesson?.content && (
            <ConversationFeedbackPhase
              lesson={lesson!}
              initialEvaluation={initialResponse?.evaluation}
              onPhaseComplete={() =>
                handlePhaseComplete("conversation-feedback" as LessonPhase)
              }
            />
          )}

        {/* Legacy Phase 4: Text Reveal + Vocabulary Marking */}
        {currentPhase === ("text-reveal" as LessonPhase) &&
          !lesson?.content && (
            <TextRevealPhase
              lesson={lesson!}
              onWordRating={handleWordRating}
              vocabularyRatings={vocabularyRatings}
              onPhaseComplete={() =>
                handlePhaseComplete("text-reveal" as LessonPhase)
              }
            />
          )}

        {/* Legacy Phase 5: Interactive Exercises */}
        {currentPhase === ("interactive-exercises" as LessonPhase) &&
          !lesson?.content && (
            <InteractiveExercisesPhase
              lesson={lesson!}
              onExerciseAttempt={handleExerciseAttempt}
              onPhaseComplete={() =>
                handlePhaseComplete("interactive-exercises" as LessonPhase)
              }
            />
          )}

        {/* Legacy Phase 6: Final Verbal Assessment */}
        {currentPhase === ("final-assessment" as LessonPhase) &&
          !lesson?.content && (
            <FinalAssessmentPhase
              lesson={lesson!}
              onResponse={handleFinalResponse}
              onPhaseComplete={() =>
                handlePhaseComplete("final-assessment" as LessonPhase)
              }
            />
          )}
      </main>
    </div>
  );
}
