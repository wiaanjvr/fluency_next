"use client";

import React, { useState, useRef } from "react";
import {
  Lesson,
  ComprehensionResponse,
  ComprehensionEvaluation,
} from "@/types/lesson";
import {
  Mic,
  Square,
  Play,
  Pause,
  Trash2,
  ArrowRight,
  GraduationCap,
  CheckCircle2,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FinalAssessmentPhaseProps {
  lesson: Lesson;
  onResponse: (response: ComprehensionResponse) => void;
  onPhaseComplete: () => void;
}

export function FinalAssessmentPhase({
  lesson,
  onResponse,
  onPhaseComplete,
}: FinalAssessmentPhaseProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasListened, setHasListened] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const lessonAudioRef = useRef<HTMLAudioElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Audio playback handlers
  const toggleLessonAudio = () => {
    const audio = lessonAudioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
      setHasListened(true);
    }
    setIsPlaying(!isPlaying);
  };

  // Recording handlers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);

        stream.getTracks().forEach((track) => track.stop());
        await transcribeAudio(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const transcribeAudio = async (blob: Blob) => {
    setIsTranscribing(true);
    try {
      // In production, send to Whisper API
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setTranscript("[Your final summary will be transcribed here]");
    } catch (error) {
      console.error("Transcription error:", error);
    } finally {
      setIsTranscribing(false);
    }
  };

  const deleteRecording = () => {
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setTranscript("");
    setHasSubmitted(false);
  };

  const handleSubmit = () => {
    if (!audioBlob) return;

    const response: ComprehensionResponse = {
      id: `final-${Date.now()}`,
      lessonId: lesson.id,
      userId: lesson.userId,
      phase: "final-assessment",
      audioBlob,
      audioUrl: audioUrl || undefined,
      transcript,
      createdAt: new Date().toISOString(),
    };

    setHasSubmitted(true);
    onResponse(response);
  };

  return (
    <div className="space-y-6">
      {/* Phase Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-library-brass/10 text-library-brass">
          <GraduationCap className="h-4 w-4" />
          <span className="text-sm font-medium">Phase 6: Final Assessment</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-light tracking-tight">
          Show What You{" "}
          <span className="font-serif italic text-library-brass">Learned</span>
        </h1>
        <p className="text-muted-foreground font-light max-w-md mx-auto">
          Listen to the audio one more time, then summarize everything you
          learned: the content, the new vocabulary, and key ideas.
        </p>
      </div>

      {/* Listen Again Card */}
      <div className="bg-card border border-library-brass/20 rounded-2xl">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-light">Step 1: Listen Again</h2>
        </div>
        <div className="p-6 space-y-4">
          <audio
            ref={lessonAudioRef}
            src={lesson.audioUrl}
            onEnded={() => setIsPlaying(false)}
          />

          <div className="flex items-center gap-4">
            <button
              onClick={toggleLessonAudio}
              className={cn(
                "h-14 px-8 rounded-xl flex items-center justify-center gap-2 transition-colors",
                hasListened
                  ? "bg-transparent border border-border hover:bg-card text-foreground font-light"
                  : "bg-library-brass hover:bg-library-brass/90 text-background font-medium",
              )}
            >
              {isPlaying ? (
                <>
                  <Pause className="h-5 w-5" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="h-5 w-5" />
                  {hasListened ? "Play Again" : "Play Audio"}
                </>
              )}
            </button>

            {hasListened && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-sm font-light">Listened</span>
              </div>
            )}
          </div>

          <p className="text-sm text-muted-foreground font-light">
            Notice how much more you understand now compared to the beginning!
          </p>
        </div>
      </div>

      {/* Question Prompt */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="text-center space-y-2">
          <p className="text-lg font-medium">
            "What is happening in this audio? What did we learn and discuss?"
          </p>
          <p className="text-sm text-muted-foreground font-light">
            Try to include: main topic, key vocabulary, and important details.
            Use French as much as you can!
          </p>
        </div>
      </div>

      {/* Recording Card */}
      <div className="bg-card border border-border rounded-2xl">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-light">Step 2: Record Your Summary</h2>
        </div>
        <div className="p-6 space-y-6">
          {/* Recording Controls */}
          <div className="flex flex-col items-center gap-4">
            {!isRecording && !audioBlob && (
              <>
                <button
                  onClick={startRecording}
                  disabled={!hasListened}
                  className={cn(
                    "h-16 w-16 sm:h-20 sm:w-20 rounded-full flex items-center justify-center transition-colors",
                    hasListened
                      ? "bg-library-brass hover:bg-library-brass/90 text-background"
                      : "bg-card border border-border text-muted-foreground opacity-50 cursor-not-allowed",
                  )}
                >
                  <Mic className="h-6 w-6 sm:h-8 sm:w-8" />
                </button>
                {!hasListened && (
                  <p className="text-sm text-muted-foreground font-light">
                    Listen to the audio first
                  </p>
                )}
              </>
            )}

            {isRecording && (
              <div className="flex flex-col items-center gap-4">
                <button
                  onClick={stopRecording}
                  className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center animate-pulse transition-colors"
                >
                  <Square className="h-6 w-6 sm:h-8 sm:w-8" />
                </button>

                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-sm font-medium">
                    Recording your summary...
                  </span>
                </div>

                {/* Audio visualizer */}
                <div className="flex items-center gap-1">
                  {[...Array(16)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-red-500 rounded-full animate-pulse"
                      style={{
                        height: `${Math.random() * 40 + 10}px`,
                        animationDelay: `${i * 0.05}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Audio Playback */}
          {audioBlob && audioUrl && (
            <div className="space-y-4">
              <div className="bg-background/50 rounded-xl p-4">
                <p className="text-sm text-muted-foreground font-light mb-2">
                  Your recording:
                </p>
                <audio src={audioUrl} controls className="w-full" />
              </div>

              {/* Transcript */}
              {isTranscribing && (
                <div className="flex items-center justify-center gap-2 py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-library-brass" />
                  <span className="text-sm text-muted-foreground font-light">
                    Processing...
                  </span>
                </div>
              )}

              {!isTranscribing && transcript && (
                <div className="bg-background/30 rounded-xl p-4">
                  <p className="text-sm text-muted-foreground font-light mb-1">
                    Your summary:
                  </p>
                  <p className="text-sm font-light">{transcript}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={deleteRecording}
                  disabled={hasSubmitted}
                  className="flex-1 bg-transparent border border-border hover:bg-card text-foreground font-light rounded-xl py-4 px-6 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <RotateCcw className="h-4 w-4" />
                  Re-record
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={hasSubmitted || isTranscribing}
                  className="flex-1 bg-library-brass hover:bg-library-brass/90 text-background font-medium rounded-xl py-4 px-6 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {hasSubmitted ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Submitted
                    </>
                  ) : (
                    "Submit Final Summary"
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tips */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="font-medium mb-3">For your summary, try to include:</h3>
        <ul className="text-sm text-muted-foreground font-light space-y-2">
          <li>• The main topic or situation from the audio</li>
          <li>
            • New vocabulary words you learned:{" "}
            <span className="font-medium text-library-brass">
              {lesson.words
                .filter((w) => w.isNew)
                .slice(0, 3)
                .map((w) => w.word)
                .join(", ")}
            </span>
          </li>
          <li>• Key details or ideas discussed during the lesson</li>
          <li>• Your overall understanding (it's okay to mix languages!)</li>
        </ul>
      </div>

      {/* Continue Button */}
      <button
        onClick={onPhaseComplete}
        disabled={!hasSubmitted}
        className={cn(
          "w-full py-4 px-8 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors",
          hasSubmitted
            ? "bg-library-brass hover:bg-library-brass/90 text-background"
            : "bg-card border border-border text-muted-foreground cursor-not-allowed",
        )}
      >
        {hasSubmitted ? (
          <>
            Complete Lesson
            <ArrowRight className="h-5 w-5" />
          </>
        ) : (
          "Record and submit your summary first"
        )}
      </button>
    </div>
  );
}
