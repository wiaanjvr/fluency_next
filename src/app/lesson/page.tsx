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
import { DiveIn } from "@/components/ui/ocean-animations";
import { Loader2, RefreshCw, Sparkles, MessageSquare } from "lucide-react";

// Content types for variety (users with 100+ words)
const CONTENT_TYPES = [
  { id: "narrative", label: "Narrative", description: "A short story or tale" },
  {
    id: "dialogue",
    label: "Dialogue",
    description: "A conversation between people",
  },
  {
    id: "descriptive",
    label: "Descriptive",
    description: "A vivid description of a place or scene",
  },
  {
    id: "opinion",
    label: "Opinion Piece",
    description: "Thoughts and perspectives on a topic",
  },
] as const;

type ContentType = (typeof CONTENT_TYPES)[number]["id"];

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

  // Custom prompt and content type (for users with 100+ vocabulary)
  const [vocabularyCount, setVocabularyCount] = useState(0);
  const [customPrompt, setCustomPrompt] = useState("");
  const [selectedContentType, setSelectedContentType] = useState<
    ContentType | ""
  >("");
  const [showCustomOptions, setShowCustomOptions] = useState(false);
  const VOCABULARY_THRESHOLD = 100;

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

      // Fetch vocabulary stats to determine if custom prompt is available
      try {
        const statsResponse = await fetch("/api/words/stats");
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setVocabularyCount(statsData.stats?.total || 0);
        }
      } catch (statsError) {
        console.error("Error fetching vocabulary stats:", statsError);
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
  const handleGenerateLesson = async (customTopicOverride?: string) => {
    setGenerating(true);
    try {
      // Prepare request body with optional custom topic and content type
      const requestBody: Record<string, unknown> = {
        prioritizeReview: true,
      };

      // Add custom topic if user has enough vocabulary (100+ words)
      const topicToUse = customTopicOverride || customPrompt;
      if (vocabularyCount >= VOCABULARY_THRESHOLD && topicToUse.trim()) {
        requestBody.topic = topicToUse.trim();
      }

      // Add content type variation if selected
      if (vocabularyCount >= VOCABULARY_THRESHOLD && selectedContentType) {
        requestBody.contentType = selectedContentType;
      }

      const response = await fetch("/api/lesson/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();

        // Handle usage limit reached
        if (response.status === 429 && errorData.limitReached) {
          alert(
            errorData.message ||
              "You've reached your daily lesson limit. Upgrade to Premium for unlimited access.",
          );
          // Optionally redirect to pricing page
          // router.push("/pricing");
          return;
        }

        throw new Error(errorData.error || "Failed to generate lesson");
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

      // Reset custom prompt for next time
      setCustomPrompt("");
      setSelectedContentType("");
      setShowCustomOptions(false);

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

        // Track usage for free tier limits
        try {
          await fetch("/api/usage/increment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionType: "main" }),
          });
        } catch (err) {
          console.error("Failed to track main lesson usage:", err);
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
    const canCustomize = vocabularyCount >= VOCABULARY_THRESHOLD;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="max-w-lg w-full text-center space-y-10">
          {/* Icon */}
          <div className="w-20 h-20 mx-auto rounded-2xl bg-ocean-turquoise/10 flex items-center justify-center">
            <RefreshCw className="h-10 w-10 text-ocean-turquoise" />
          </div>

          {/* Heading */}
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl font-light tracking-tight">
              Ready to{" "}
              <span className="font-serif italic text-ocean-turquoise">
                learn
              </span>
              ?
            </h1>
            <p className="text-lg text-muted-foreground font-light max-w-sm mx-auto">
              Generate a personalized lesson based on your vocabulary and
              progress.
            </p>
            {canCustomize && (
              <p className="text-sm text-ocean-turquoise/80 font-medium">
                🎉 {vocabularyCount} words learned — custom topics unlocked!
              </p>
            )}
          </div>

          {/* Custom Options for Advanced Users (100+ words) */}
          {canCustomize && (
            <div className="space-y-4">
              <button
                onClick={() => setShowCustomOptions(!showCustomOptions)}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Sparkles className="h-4 w-4" />
                {showCustomOptions ? "Hide" : "Customize"} your lesson
              </button>

              {showCustomOptions && (
                <div className="bg-card border border-border rounded-2xl p-6 space-y-5 text-left">
                  {/* Custom Topic Input */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-ocean-turquoise" />
                      What&apos;s on your mind?
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Tell us a topic and we&apos;ll create a lesson about it
                    </p>
                    <textarea
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      placeholder="e.g., ordering at a café, my trip to Paris, discussing the weather..."
                      className="w-full p-3 rounded-xl bg-muted/50 border border-border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ocean-turquoise/50 min-h-[80px]"
                      maxLength={200}
                    />
                    <div className="text-xs text-muted-foreground text-right">
                      {customPrompt.length}/200
                    </div>
                  </div>

                  {/* Content Type Selection */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Content Style</label>
                    <p className="text-xs text-muted-foreground">
                      Choose how the lesson should be structured
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {CONTENT_TYPES.map((type) => (
                        <button
                          key={type.id}
                          onClick={() =>
                            setSelectedContentType(
                              selectedContentType === type.id ? "" : type.id,
                            )
                          }
                          className={`p-3 rounded-xl border text-left transition-all ${
                            selectedContentType === type.id
                              ? "border-ocean-turquoise bg-ocean-turquoise/10"
                              : "border-border hover:border-ocean-turquoise/50"
                          }`}
                        >
                          <div className="text-sm font-medium">
                            {type.label}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {type.description}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="space-y-4">
            <button
              onClick={() => handleGenerateLesson()}
              disabled={generating}
              className="w-full py-4 px-8 bg-ocean-turquoise hover:bg-ocean-turquoise/90 text-ocean-midnight font-medium rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
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
          <DiveIn key="spaced-retrieval-warmup">
            <SpacedRetrievalWarmupPhase
              warmup={lesson.content.spacedRetrievalWarmup}
              onComplete={(responses) => {
                setWarmupResponses(responses);
                handlePhaseComplete("spaced-retrieval-warmup");
              }}
            />
          </DiveIn>
        )}

        {/* Phase 2: Prediction Stage */}
        {currentPhase === "prediction-stage" && lesson?.content && (
          <DiveIn key="prediction-stage">
            <PredictionStagePhase
              stage={lesson.content.predictionStage}
              onComplete={(pred) => {
                setPrediction(pred);
                handlePhaseComplete("prediction-stage");
              }}
            />
          </DiveIn>
        )}

        {/* Phase 3: Audio Text (Listen to Story) */}
        {currentPhase === "audio-text" && lesson?.content && (
          <DiveIn key="audio-text">
            <AudioTextPhase
              audioText={lesson.content.audioText}
              listenCount={listenCount}
              onListenComplete={() => setListenCount((prev) => prev + 1)}
              onPhaseComplete={() => handlePhaseComplete("audio-text")}
            />
          </DiveIn>
        )}

        {/* Phase 4: First Recall Prompt */}
        {currentPhase === "first-recall" && lesson?.content && (
          <DiveIn key="first-recall">
            <FirstRecallPhase
              prompt={lesson.content.firstRecallPrompt}
              onComplete={(response) => {
                setFirstRecallResponse(response);
                handlePhaseComplete("first-recall");
              }}
            />
          </DiveIn>
        )}

        {/* Phase 5: Transcript with Highlights */}
        {currentPhase === "transcript-reveal" && lesson?.content && (
          <DiveIn key="transcript-reveal">
            <TranscriptRevealPhase
              transcript={lesson.content.transcriptWithHighlights}
              onComplete={() => handlePhaseComplete("transcript-reveal")}
            />
          </DiveIn>
        )}

        {/* Phase 6: Guided Noticing */}
        {currentPhase === "guided-noticing" && lesson?.content && (
          <DiveIn key="guided-noticing">
            <GuidedNoticingPhase
              noticing={lesson.content.guidedNoticing}
              onComplete={(inferences) => {
                setNoticingInferences(inferences);
                handlePhaseComplete("guided-noticing");
              }}
            />
          </DiveIn>
        )}

        {/* Phase 7: Micro Drills */}
        {currentPhase === "micro-drills" && lesson?.content && (
          <DiveIn key="micro-drills">
            <MicroDrillsPhase
              drills={lesson.content.microDrills}
              onComplete={(results) => {
                setDrillResults(results);
                handlePhaseComplete("micro-drills");
              }}
            />
          </DiveIn>
        )}

        {/* Phase 8: Shadowing Stage */}
        {currentPhase === "shadowing" && lesson?.content && (
          <DiveIn key="shadowing">
            <ShadowingPhase
              stage={lesson.content.shadowingStage}
              onComplete={(count) => {
                setShadowingCount(count);
                handlePhaseComplete("shadowing");
              }}
            />
          </DiveIn>
        )}

        {/* Phase 9: Second Recall Prompt */}
        {currentPhase === "second-recall" && lesson?.content && (
          <DiveIn key="second-recall">
            <SecondRecallPhase
              prompt={lesson.content.secondRecallPrompt}
              onComplete={(response) => {
                setSecondRecallResponse(response);
                handlePhaseComplete("second-recall");
              }}
            />
          </DiveIn>
        )}

        {/* Phase 10: Progress Reflection */}
        {currentPhase === "progress-reflection" && lesson?.content && (
          <DiveIn key="progress-reflection">
            <ProgressReflectionPhase
              reflection={lesson.content.progressReflection}
              onComplete={(responses) => {
                setReflectionResponses(responses);
                handlePhaseComplete("progress-reflection");
              }}
            />
          </DiveIn>
        )}

        {/* ===== LEGACY 6-PHASE LESSON FLOW ===== */}

        {/* Legacy Phase 1: Audio-Only Comprehension */}
        {currentPhase === ("audio-comprehension" as LessonPhase) &&
          !lesson?.content && (
            <DiveIn key="audio-comprehension">
              <AudioComprehensionPhase
                lesson={lesson!}
                listenCount={listenCount}
                onListenComplete={handleListenComplete}
                onPhaseComplete={handleAudioPhaseComplete}
              />
            </DiveIn>
          )}

        {/* Legacy Phase 2: Verbal Comprehension Check */}
        {currentPhase === ("verbal-check" as LessonPhase) &&
          !lesson?.content && (
            <DiveIn key="verbal-check">
              <VerbalCheckPhase
                lesson={lesson!}
                onResponse={handleVerbalResponse}
                onPhaseComplete={() =>
                  handlePhaseComplete("verbal-check" as LessonPhase)
                }
              />
            </DiveIn>
          )}

        {/* Legacy Phase 3: Conversational Feedback Loop */}
        {currentPhase === ("conversation-feedback" as LessonPhase) &&
          !lesson?.content && (
            <DiveIn key="conversation-feedback">
              <ConversationFeedbackPhase
                lesson={lesson!}
                initialEvaluation={initialResponse?.evaluation}
                onPhaseComplete={() =>
                  handlePhaseComplete("conversation-feedback" as LessonPhase)
                }
              />
            </DiveIn>
          )}

        {/* Legacy Phase 4: Text Reveal + Vocabulary Marking */}
        {currentPhase === ("text-reveal" as LessonPhase) &&
          !lesson?.content && (
            <DiveIn key="text-reveal">
              <TextRevealPhase
                lesson={lesson!}
                onWordRating={handleWordRating}
                vocabularyRatings={vocabularyRatings}
                onPhaseComplete={() =>
                  handlePhaseComplete("text-reveal" as LessonPhase)
                }
              />
            </DiveIn>
          )}

        {/* Legacy Phase 5: Interactive Exercises */}
        {currentPhase === ("interactive-exercises" as LessonPhase) &&
          !lesson?.content && (
            <DiveIn key="interactive-exercises">
              <InteractiveExercisesPhase
                lesson={lesson!}
                onExerciseAttempt={handleExerciseAttempt}
                onPhaseComplete={() =>
                  handlePhaseComplete("interactive-exercises" as LessonPhase)
                }
              />
            </DiveIn>
          )}

        {/* Legacy Phase 6: Final Verbal Assessment */}
        {currentPhase === ("final-assessment" as LessonPhase) &&
          !lesson?.content && (
            <DiveIn key="final-assessment">
              <FinalAssessmentPhase
                lesson={lesson!}
                onResponse={handleFinalResponse}
                onPhaseComplete={() =>
                  handlePhaseComplete("final-assessment" as LessonPhase)
                }
              />
            </DiveIn>
          )}
      </main>
    </div>
  );
}
