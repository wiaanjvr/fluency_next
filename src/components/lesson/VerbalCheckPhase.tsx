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
  Trash2,
  ArrowRight,
  MessageCircle,
  Lightbulb,
  CheckCircle2,
  Loader2,
  AlertCircle,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TranscriptionFeedback {
  isValid: boolean;
  isSilence: boolean;
  isRelevant: boolean;
  englishWords: Array<{ english: string; translation: string }>;
  message?: string;
}

interface VerbalCheckPhaseProps {
  lesson: Lesson;
  onResponse: (response: ComprehensionResponse) => void;
  onPhaseComplete: () => void;
}

export function VerbalCheckPhase({
  lesson,
  onResponse,
  onPhaseComplete,
}: VerbalCheckPhaseProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [feedback, setFeedback] = useState<TranscriptionFeedback | null>(null);
  const [acknowledgedFeedback, setAcknowledgedFeedback] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

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

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());

        // Transcribe and analyze audio
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
    setFeedback(null);
    setAcknowledgedFeedback(false);

    try {
      // Send to Whisper API for transcription and analysis
      const formData = new FormData();
      formData.append("audio", blob);
      formData.append("language", lesson.language || "fr");
      formData.append(
        "questionContext",
        "What is happening in the audio? Describe what you heard.",
      );

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Transcription failed");
      }

      const data = await response.json();
      setTranscript(data.text || "");
      setFeedback(data.feedback || null);
    } catch (error) {
      console.error("Transcription error:", error);
      setTranscript("[Transcription failed - please try again]");
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
    setFeedback(null);
    setAcknowledgedFeedback(false);
  };

  const handleSubmit = () => {
    if (!audioBlob) return;

    // Check if feedback requires re-recording
    if (feedback && !feedback.isValid && !acknowledgedFeedback) {
      setAcknowledgedFeedback(true);
      return;
    }

    const response: ComprehensionResponse = {
      id: `response-${Date.now()}`,
      lessonId: lesson.id,
      userId: lesson.userId,
      phase: "verbal-check",
      audioBlob,
      audioUrl: audioUrl || undefined,
      transcript,
      createdAt: new Date().toISOString(),
    };

    setHasSubmitted(true);
    onResponse(response);
  };

  // Check if we need to force re-recording
  const needsReRecord = feedback && !feedback.isValid && !acknowledgedFeedback;
  const canSubmit =
    audioBlob &&
    !isTranscribing &&
    !hasSubmitted &&
    (!feedback || feedback.isValid || acknowledgedFeedback);

  return (
    <div className="space-y-6">
      {/* Phase Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-library-brass/10 text-library-brass">
          <MessageCircle className="h-4 w-4" />
          <span className="text-sm font-medium">
            Phase 2: Comprehension Check
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-light tracking-tight">
          What did you{" "}
          <span className="font-serif italic text-library-brass">
            understand
          </span>
          ?
        </h1>
        <p className="text-muted-foreground font-light max-w-md mx-auto">
          Describe what's happening in the audio. Use any language you're
          comfortable with. French is encouraged but not required.
        </p>
      </div>

      {/* Question Prompt */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-library-brass/10 flex items-center justify-center shrink-0">
            <Lightbulb className="h-5 w-5 text-library-brass" />
          </div>
          <div className="space-y-2">
            <p className="text-lg font-medium">
              "What is happening in the audio?"
            </p>
            <p className="text-sm text-muted-foreground font-light">
              Try to describe the main idea, characters, or situation you heard.
              Any details you remember are valuable!
            </p>
          </div>
        </div>
      </div>

      {/* Recording Card */}
      <div className="bg-card border border-border rounded-2xl">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-light">Your Response</h2>
        </div>
        <div className="p-6 space-y-6">
          {/* Recording Controls */}
          <div className="flex flex-col items-center gap-4">
            {!isRecording && !audioBlob && (
              <button
                onClick={startRecording}
                className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-library-brass hover:bg-library-brass/90 text-background flex items-center justify-center transition-colors"
              >
                <Mic className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            )}

            {isRecording && (
              <div className="flex flex-col items-center gap-4">
                <button
                  onClick={stopRecording}
                  className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center animate-pulse transition-colors"
                >
                  <Square className="h-5 w-5 sm:h-6 sm:w-6" />
                </button>

                {/* Recording indicator */}
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-sm text-muted-foreground font-light">
                    Recording...
                  </span>
                </div>

                {/* Audio visualizer */}
                <div className="flex items-center gap-1">
                  {[...Array(12)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-red-500 rounded-full animate-pulse"
                      style={{
                        height: `${Math.random() * 30 + 10}px`,
                        animationDelay: `${i * 0.05}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {!isRecording && !audioBlob && (
              <p className="text-sm text-muted-foreground font-light">
                Tap to start recording
              </p>
            )}
          </div>

          {/* Audio Playback */}
          {audioBlob && audioUrl && (
            <div className="space-y-4">
              <div className="bg-background/50 rounded-xl p-4">
                <audio src={audioUrl} controls className="w-full" />
              </div>

              {/* Transcript */}
              {isTranscribing ? (
                <div className="flex items-center justify-center gap-2 py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-library-brass" />
                  <span className="text-sm text-muted-foreground font-light">
                    Analyzing your response...
                  </span>
                </div>
              ) : (
                transcript && (
                  <div className="bg-background/30 rounded-xl p-4">
                    <p className="text-sm text-muted-foreground font-light mb-1">
                      Transcript:
                    </p>
                    <p className="text-sm font-light">{transcript}</p>
                  </div>
                )
              )}

              {/* Feedback - Silence or Irrelevant */}
              {feedback && !feedback.isValid && (
                <div className="bg-card border border-orange-500/50 rounded-2xl p-6">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
                      <AlertCircle className="h-5 w-5 text-orange-500" />
                    </div>
                    <div className="space-y-2 flex-1">
                      <p className="font-medium text-orange-500">
                        {feedback.isSilence
                          ? "No Speech Detected"
                          : "Please Try Again"}
                      </p>
                      <p className="text-sm text-muted-foreground font-light">
                        {feedback.message}
                      </p>
                      <p className="text-sm text-muted-foreground font-light">
                        Remember: Try to answer completely in French, but it's
                        okay to use some English words if needed.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Feedback - English Words Detected */}
              {feedback &&
                feedback.isValid &&
                feedback.englishWords.length > 0 && (
                  <div className="bg-card border border-library-brass/50 rounded-2xl p-6">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-library-brass/10 flex items-center justify-center">
                          <BookOpen className="h-5 w-5 text-library-brass" />
                        </div>
                        <p className="font-medium text-library-brass">
                          {feedback.message ||
                            "Great effort! Here are some French words to help you:"}
                        </p>
                      </div>
                      <div className="space-y-2">
                        {feedback.englishWords.map((word, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between bg-background/50 rounded-xl px-4 py-3"
                          >
                            <span className="text-sm font-medium">
                              {word.english}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              →
                            </span>
                            <span className="text-sm font-medium text-library-brass">
                              {word.translation}
                            </span>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground font-light">
                        Try using these French words in your next response!
                      </p>
                    </div>
                  </div>
                )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={deleteRecording}
                  className="flex-1 bg-transparent border border-border hover:bg-card text-foreground font-light rounded-xl py-4 px-6 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  disabled={hasSubmitted}
                >
                  <Trash2 className="h-4 w-4" />
                  {needsReRecord ? "Try Again" : "Re-record"}
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex-1 bg-library-brass hover:bg-library-brass/90 text-background font-medium rounded-xl py-4 px-6 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  disabled={!canSubmit}
                >
                  {hasSubmitted ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Submitted
                    </>
                  ) : needsReRecord ? (
                    "Record Again"
                  ) : (
                    "Submit Response"
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tips */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="font-medium mb-3">Tips for your response:</h3>
        <ul className="text-sm text-muted-foreground font-light space-y-2">
          <li>• Try to answer completely in French</li>
          <li>
            • Using a few English words is okay - we'll help you learn them
          </li>
          <li>• Don't worry about perfect grammar or pronunciation</li>
          <li>• Describe the overall situation or feeling</li>
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
            Continue to Conversation
            <ArrowRight className="h-5 w-5" />
          </>
        ) : (
          "Record and submit your response first"
        )}
      </button>
    </div>
  );
}
