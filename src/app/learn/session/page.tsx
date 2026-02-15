"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LinguaLoadingAnimation } from "@/components/ui/LinguaLoadingAnimation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AudioPlayer } from "@/components/learning/AudioPlayer";
import { QuestionCard } from "@/components/learning/QuestionCard";
import { SpeakingRecorder } from "@/components/learning/SpeakingRecorder";
import { TeacherPrompt } from "@/components/learning/TeacherPrompt";
import { VocabularyPractice } from "@/components/learning/VocabularyPractice";
import { KeyboardShortcutsModal } from "@/components/learning/KeyboardShortcutsModal";
import { PhaseIndicator } from "@/components/learning/PhaseIndicator";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  BookOpen,
  Keyboard,
  Headphones,
  MessageCircle,
  Book,
  Target,
  Sparkles,
  GraduationCap,
  RotateCcw,
  Check,
} from "lucide-react";
import {
  selectNextSegment,
  fetchSegmentById,
  fetchVocabularyExercises,
  getQuestionsForSegment,
} from "@/lib/content/engine";
import { ContentSegment, ComprehensionQuestion } from "@/types";
import { ConversationFlow } from "@/components/learning/ConversationFlow";
import {
  SpeechEvaluation,
  evaluateSpeech,
} from "@/components/learning/SpeechEvaluation";

type SessionPhase =
  | "initial-listening"
  | "conversation"
  | "speech-feedback"
  | "vocabulary"
  | "reading"
  | "re-listening"
  | "final-speaking"
  | "complete";

export default function LearningSessionPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<SessionPhase>("initial-listening");
  const [segment, setSegment] = useState<ContentSegment | null>(null);
  const [questions, setQuestions] = useState<ComprehensionQuestion[]>([]);
  const [vocabularyExercises, setVocabularyExercises] = useState<any[]>([]);
  const [showTranscript, setShowTranscript] = useState(false);
  const [listenCount, setListenCount] = useState(0);
  const [conversationRecordings, setConversationRecordings] = useState<Blob[]>(
    [],
  );
  const [speechFeedback, setSpeechFeedback] = useState<any>(null);
  const [firstRecording, setFirstRecording] = useState<Blob | null>(null);
  const [secondRecording, setSecondRecording] = useState<Blob | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [sessionStartTime] = useState(new Date());

  // Save session state to localStorage
  useEffect(() => {
    if (!segment) return;

    const sessionState = {
      phase,
      segmentId: segment.id,
      listenCount,
      showTranscript,
      timestamp: new Date().toISOString(),
    };

    localStorage.setItem("currentSession", JSON.stringify(sessionState));
  }, [phase, segment, listenCount, showTranscript]);

  // Load saved session on mount
  useEffect(() => {
    const savedSession = localStorage.getItem("currentSession");
    if (savedSession) {
      try {
        const state = JSON.parse(savedSession);
        const savedTime = new Date(state.timestamp);
        const hoursSince =
          (new Date().getTime() - savedTime.getTime()) / (1000 * 60 * 60);

        // Only restore if less than 24 hours old
        if (hoursSince < 24) {
          // Restore the segment from API
          fetchSegmentById(state.segmentId).then((savedSegment) => {
            if (savedSegment) {
              setSegment(savedSegment);
              setPhase(state.phase);
              setListenCount(state.listenCount);
              setShowTranscript(state.showTranscript);
              setQuestions(getQuestionsForSegment(savedSegment.id));

              // Load vocabulary exercises
              fetchVocabularyExercises(savedSegment.id).then(
                setVocabularyExercises,
              );
            }
          });
        }
      } catch (e) {
        console.error("Failed to restore session:", e);
      }
    }
  }, []);

  useEffect(() => {
    // Load segment based on user profile
    // For MVP, using API-based content fetching
    const loadContent = async () => {
      try {
        const nextSegment = await selectNextSegment(
          "A1",
          ["philosophy", "fitness", "science"],
          [],
        );
        if (nextSegment) {
          setSegment(nextSegment);
          setQuestions(getQuestionsForSegment(nextSegment.id));
          const vocab = await fetchVocabularyExercises(nextSegment.id);
          setVocabularyExercises(vocab);
        }
      } catch (error) {
        console.error("Failed to load content:", error);
      }
    };

    loadContent();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case "?":
          setShowShortcuts((prev) => !prev);
          break;
        case "escape":
          setShowShortcuts(false);
          break;
        case "t":
          if (phase === "re-listening") {
            setShowTranscript((prev) => !prev);
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [phase]);

  const handlePlaybackComplete = () => {
    setListenCount((prev) => prev + 1);
  };

  const handleStartConversation = () => {
    setPhase("conversation");
  };

  const handleConversationComplete = (recordings: Blob[]) => {
    setConversationRecordings(recordings);
    // Evaluate the last recording as the main response
    const feedback = evaluateSpeech(recordings[recordings.length - 1], 30);
    setSpeechFeedback(feedback);
    setPhase("speech-feedback");
  };

  const handleContinueAfterFeedback = () => {
    setPhase("vocabulary");
  };

  const handleFirstRecordingComplete = (blob: Blob) => {
    setFirstRecording(blob);
  };

  const handleStartVocabulary = () => {
    setPhase("vocabulary");
  };

  const handleVocabularyComplete = () => {
    setPhase("reading");
  };

  const handleStartReListening = () => {
    setPhase("re-listening");
  };

  const handleStartFinalSpeaking = () => {
    setPhase("final-speaking");
  };

  const handleFinalRecordingComplete = (blob: Blob) => {
    setSecondRecording(blob);
  };

  const handleCompleteSession = () => {
    setPhase("complete");
    localStorage.removeItem("currentSession"); // Clear saved progress
  };

  const handleFinish = () => {
    localStorage.removeItem("currentSession"); // Clear saved progress
    router.push("/dashboard");
  };

  if (!segment) {
    return <LinguaLoadingAnimation message="Loading session..." />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background z-40">
        <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              onClick={() => router.push("/dashboard")}
              className="gap-1 sm:gap-2 h-8 sm:h-10 px-2 sm:px-4 text-xs sm:text-sm"
            >
              <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Exit</span>
            </Button>
            <div className="flex-1 mx-2 sm:mx-8">
              <Progress
                value={
                  phase === "initial-listening"
                    ? 10
                    : phase === "conversation"
                      ? 20
                      : phase === "speech-feedback"
                        ? 30
                        : phase === "vocabulary"
                          ? 50
                          : phase === "reading"
                            ? 65
                            : phase === "re-listening"
                              ? 80
                              : phase === "final-speaking"
                                ? 90
                                : 100
                }
                className="h-2"
              />
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowShortcuts(true)}
                className="h-7 w-7 sm:h-8 sm:w-8"
                title="Keyboard shortcuts (?)"
              >
                <Keyboard className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
              <span className="text-xs sm:text-sm text-muted-foreground capitalize hidden sm:inline">
                {phase.replace("-", " ")}
              </span>
            </div>
          </div>
        </div>
      </header>

      <KeyboardShortcutsModal
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
      />

      {/* Phase Indicator */}
      {phase !== "complete" && <PhaseIndicator currentPhase={phase} />}

      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 pb-20 sm:pb-8">
        <div className="max-w-3xl mx-auto">
          {/* Phase 1: Initial Listening (No Text) */}
          {phase === "initial-listening" && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Listening Practice</CardTitle>
                      <CardDescription className="capitalize">
                        Topic: {segment.topic} • Level: {segment.level}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                      <Headphones className="h-4 w-4" /> Listen to the audio 2-3
                      times. Focus on understanding the main ideas.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Don't worry about understanding every word. Just get a
                      sense of what's being discussed.
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Times listened: <strong>{listenCount}</strong>
                    </p>
                  </div>

                  <AudioPlayer
                    audioUrl={segment.audio_url}
                    transcript={""}
                    showTranscript={false}
                    onPlaybackComplete={handlePlaybackComplete}
                  />

                  <Button
                    size="lg"
                    onClick={handleStartConversation}
                    disabled={listenCount < 1}
                    className="w-full gap-2"
                  >
                    Continue to Conversation
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Phase 2: Conversation Flow */}
          {phase === "conversation" && (
            <div className="space-y-6">
              <ConversationFlow
                segmentId={segment.id}
                onComplete={handleConversationComplete}
              />
            </div>
          )}

          {/* Phase 3: Speech Feedback */}
          {phase === "speech-feedback" && speechFeedback && (
            <div className="space-y-6">
              <SpeechEvaluation feedback={speechFeedback} showDetailed={true} />

              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground text-center mb-4">
                  Great work! Now let's expand your vocabulary with the key
                  words from this segment.
                </p>
                <Button
                  size="lg"
                  onClick={handleContinueAfterFeedback}
                  className="w-full gap-2"
                >
                  Continue to Vocabulary
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Phase 3: Vocabulary Practice */}
          {phase === "vocabulary" && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Vocabulary Practice</CardTitle>
                  <CardDescription>
                    Learn the key words from this segment
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <VocabularyPractice
                    vocabulary={vocabularyExercises}
                    onComplete={handleVocabularyComplete}
                  />
                </CardContent>
              </Card>
            </div>
          )}

          {/* Phase 4: Reading */}
          {phase === "reading" && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    <CardTitle>Read the Full Text</CardTitle>
                  </div>
                  <CardDescription>
                    Now read the transcript with the translation
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="p-6 bg-muted/50 rounded-lg space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2 text-primary">
                        French:
                      </h4>
                      <p className="leading-relaxed">{segment.transcript}</p>
                    </div>
                    <div className="border-t pt-4">
                      <h4 className="font-semibold mb-2 text-muted-foreground">
                        English:
                      </h4>
                      <p className="leading-relaxed text-muted-foreground">
                        {segment.translations.en}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-accent/20 rounded-lg">
                    <h4 className="font-semibold mb-2">Key Vocabulary:</h4>
                    <div className="flex flex-wrap gap-2">
                      {segment.key_vocabulary.map((word) => (
                        <span
                          key={word}
                          className="px-3 py-1 bg-background rounded-full text-sm"
                        >
                          {word}
                        </span>
                      ))}
                    </div>
                  </div>

                  <Button
                    size="lg"
                    onClick={handleStartReListening}
                    className="w-full gap-2"
                  >
                    Continue to Re-listen
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Phase 5: Re-listening */}
          {phase === "re-listening" && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Listen Again</CardTitle>
                  <CardDescription>
                    Now that you understand, listen one more time
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      🎧 Listen again with full comprehension. Notice how much
                      clearer it sounds now!
                    </p>
                  </div>

                  <AudioPlayer
                    audioUrl={segment.audio_url}
                    transcript={segment.transcript}
                    showTranscript={showTranscript}
                    onPlaybackComplete={handlePlaybackComplete}
                  />

                  <Button
                    variant="outline"
                    onClick={() => setShowTranscript(!showTranscript)}
                    className="gap-2"
                  >
                    {showTranscript ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                    {showTranscript ? "Hide" : "Show"} Transcript
                  </Button>

                  <Button
                    size="lg"
                    onClick={handleStartFinalSpeaking}
                    className="w-full gap-2"
                  >
                    Continue to Final Speaking
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Phase 6: Final Speaking */}
          {phase === "final-speaking" && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Speaking Practice - Retelling</CardTitle>
                  <CardDescription>
                    Retell what was discussed in the passage
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <TeacherPrompt
                    text="Racontez-moi ce qu'on a discuté. Tell me what was discussed."
                    autoPlay={true}
                  />

                  <SpeakingRecorder
                    prompt="Retell the main ideas from the passage. Try to use the new vocabulary you learned."
                    onRecordingComplete={handleFinalRecordingComplete}
                  />

                  <Button
                    size="lg"
                    onClick={handleCompleteSession}
                    disabled={!secondRecording}
                    className="w-full gap-2"
                  >
                    Complete Session
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Phase 7: Complete Phase */}
          {phase === "complete" && (
            <Card className="border-2 border-primary/20">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center text-4xl animate-in zoom-in duration-500">
                  🎉
                </div>
                <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  Session Complete!
                </CardTitle>
                <CardDescription className="text-base mt-2">
                  Outstanding work! You completed all 6 phases of immersive
                  learning.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Achievements */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                  <div className="p-3 bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-lg text-center border border-blue-500/20">
                    <Headphones className="h-6 w-6 mx-auto mb-1 text-blue-700 dark:text-blue-300" />
                    <div className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                      Active Listener
                    </div>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-green-500/10 to-green-500/5 rounded-lg text-center border border-green-500/20">
                    <MessageCircle className="h-6 w-6 mx-auto mb-1 text-green-700 dark:text-green-300" />
                    <div className="text-xs font-semibold text-green-700 dark:text-green-300">
                      Brave Speaker
                    </div>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-purple-500/10 to-purple-500/5 rounded-lg text-center border border-purple-500/20">
                    <BookOpen className="h-6 w-6 mx-auto mb-1 text-purple-700 dark:text-purple-300" />
                    <div className="text-xs font-semibold text-purple-700 dark:text-purple-300">
                      Word Master
                    </div>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-orange-500/10 to-orange-500/5 rounded-lg text-center border border-orange-500/20">
                    <Target className="h-6 w-6 mx-auto mb-1 text-orange-700 dark:text-orange-300" />
                    <div className="text-xs font-semibold text-orange-700 dark:text-orange-300">
                      Completionist
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  <div className="p-4 bg-muted/50 rounded-lg text-center hover:bg-muted/70 transition-colors">
                    <div className="text-4xl font-bold text-primary">
                      {listenCount}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Times Listened
                    </p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg text-center hover:bg-muted/70 transition-colors">
                    <div className="text-4xl font-bold text-primary">
                      {vocabularyExercises.length}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Words Learned
                    </p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg text-center hover:bg-muted/70 transition-colors">
                    <div className="text-4xl font-bold text-primary">2</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Speaking Attempts
                    </p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg text-center hover:bg-muted/70 transition-colors">
                    <div className="text-4xl font-bold text-primary">
                      {Math.round(segment.duration_seconds / 60)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Minutes Practiced
                    </p>
                  </div>
                </div>

                {/* What You Practiced */}
                <div className="p-5 bg-gradient-to-br from-accent/30 to-accent/10 rounded-lg border border-accent/50">
                  <h4 className="font-semibold mb-4 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <span>What You Accomplished</span>
                  </h4>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="flex items-start gap-3 p-2 rounded bg-background/50">
                      <Headphones className="text-primary h-5 w-5 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">
                          Comprehensible Input
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Listened multiple times before reading
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-2 rounded bg-background/50">
                      <MessageCircle className="text-primary h-5 w-5 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">
                          Demonstrated Understanding
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Spoke about what you comprehended
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-2 rounded bg-background/50">
                      <Book className="text-primary h-5 w-5 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">
                          Vocabulary Expansion
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Learned {vocabularyExercises.length} words with
                          context
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-2 rounded bg-background/50">
                      <RotateCcw className="text-primary h-5 w-5 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">
                          Meaning-Sound Connection
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Read then re-listened with comprehension
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Vocabulary Learned */}
                <div className="p-4 bg-muted/30 rounded-lg border border-border">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-primary" />
                    <span>Your New Vocabulary</span>
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {segment.key_vocabulary.map((word, index) => (
                      <span
                        key={word}
                        className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary font-medium rounded-full text-sm border border-primary/30 transition-colors cursor-default animate-in fade-in slide-in-from-bottom-2"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        {word}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Motivational Message */}
                <div className="p-4 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-lg border-l-4 border-primary">
                  <p className="text-sm leading-relaxed">
                    <strong className="text-primary">Keep going!</strong>{" "}
                    Language acquisition happens through consistent exposure and
                    practice. You're building neural pathways with each session.
                    The more you immerse yourself, the more natural French will
                    become.
                    <span className="font-semibold">
                      {" "}
                      Your brain is working even when you're not actively
                      studying!
                    </span>
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <Button
                    size="lg"
                    onClick={handleFinish}
                    className="flex-1"
                    variant="default"
                  >
                    Return to Dashboard
                  </Button>
                  <Button
                    size="lg"
                    onClick={() => router.push("/learn/session")}
                    className="flex-1"
                    variant="outline"
                  >
                    Start Another Session
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
