"use client";

import React, { useState, useRef } from "react";
import {
  Volume2,
  Mic,
  Square,
  Play,
  ChevronRight,
  Check,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { FoundationWord } from "@/types/foundation-vocabulary";
import { FadeIn, ScaleIn } from "@/components/ui/animations";
import { getLanguageConfig, type SupportedLanguage } from "@/lib/languages";
import { useSoundEffects } from "@/lib/sounds";

interface ShadowingReviewProps {
  words: FoundationWord[];
  onComplete: () => void;
  language?: SupportedLanguage;
}

/**
 * Shadowing Review Component
 *
 * Final phase of a foundation session where users practice all learned words
 * by listening, reading, and recording themselves speaking each word.
 */
export function ShadowingReview({
  words,
  onComplete,
  language = "fr",
}: ShadowingReviewProps) {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isPlayingNative, setIsPlayingNative] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [userAudioBlob, setUserAudioBlob] = useState<Blob | null>(null);
  const [userAudioUrl, setUserAudioUrl] = useState<string | null>(null);
  const [isPlayingUser, setIsPlayingUser] = useState(false);
  const [hasRecorded, setHasRecorded] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const userAudioRef = useRef<HTMLAudioElement | null>(null);
  const nativeAudioRef = useRef<HTMLAudioElement | null>(null);

  const { playSuccess } = useSoundEffects();
  const langConfig = getLanguageConfig(language);
  const currentWord = words[currentWordIndex];
  const isLastWord = currentWordIndex === words.length - 1;

  // Play native audio using pre-generated audio file
  const playNativeAudio = async () => {
    if (isPlayingNative || !currentWord.audioUrl) return;

    setIsPlayingNative(true);

    try {
      // Create or reuse native audio element
      if (!nativeAudioRef.current) {
        nativeAudioRef.current = new Audio(currentWord.audioUrl);
      } else {
        nativeAudioRef.current.src = currentWord.audioUrl;
      }

      nativeAudioRef.current.onended = () => {
        setIsPlayingNative(false);
      };

      nativeAudioRef.current.onerror = () => {
        console.error("Error playing audio:", currentWord.audioUrl);
        setIsPlayingNative(false);
      };

      await nativeAudioRef.current.play();
    } catch (error) {
      console.error("Error playing audio:", error);
      setIsPlayingNative(false);
    }
  };

  // Start recording user's pronunciation
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
        stream.getTracks().forEach((track) => track.stop());

        // Save the recording
        setUserAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setUserAudioUrl(url);
        setHasRecorded(true);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Could not access microphone. Please check your permissions.");
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Play user's recording
  const playUserAudio = () => {
    if (!userAudioUrl || isPlayingUser) return;

    const audio = new Audio(userAudioUrl);
    userAudioRef.current = audio;
    setIsPlayingUser(true);

    audio.onended = () => {
      setIsPlayingUser(false);
    };

    audio.onerror = () => {
      setIsPlayingUser(false);
    };

    audio.play();
  };

  // Move to next word
  const handleNext = () => {
    if (isLastWord) {
      playSuccess();
      onComplete();
    } else {
      playSuccess();
      setCurrentWordIndex(currentWordIndex + 1);
      // Reset state for next word
      setUserAudioBlob(null);
      setUserAudioUrl(null);
      setHasRecorded(false);
      setIsPlayingUser(false);
      setIsPlayingNative(false);
    }
  };

  // Re-record
  const handleReRecord = () => {
    setUserAudioBlob(null);
    setUserAudioUrl(null);
    setHasRecorded(false);
    setIsPlayingUser(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress */}
        <FadeIn>
          <div className="mb-8 text-center">
            <p className="text-sm text-muted-foreground mb-2">
              Review Progress
            </p>
            <div className="flex items-center justify-center gap-2">
              {words.map((_, index) => (
                <div
                  key={index}
                  className={cn(
                    "h-2 rounded-full transition-all duration-300",
                    index < currentWordIndex
                      ? "w-8 bg-green-500"
                      : index === currentWordIndex
                        ? "w-12 bg-primary"
                        : "w-8 bg-muted",
                  )}
                />
              ))}
            </div>
          </div>
        </FadeIn>

        {/* Main Card */}
        <ScaleIn>
          <Card className="border-2">
            <CardContent className="pt-12 pb-8 px-8">
              {/* Header */}
              <div className="text-center mb-8">
                <h2 className="text-sm font-medium text-muted-foreground mb-2">
                  Practice Word {currentWordIndex + 1} of {words.length}
                </h2>
                <p className="text-4xl font-bold mb-2">{currentWord.word}</p>
                <p className="text-xl text-muted-foreground">
                  {currentWord.translation}
                </p>
              </div>

              {/* Instructions */}
              <div className="bg-muted/50 rounded-lg p-4 mb-8">
                <p className="text-sm text-center">
                  Listen to the word, then record yourself saying it.
                  <br />
                  Compare your pronunciation with the native audio.
                </p>
              </div>

              {/* Audio Controls */}
              <div className="space-y-6">
                {/* Native Audio */}
                <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Volume2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Native Audio</p>
                      <p className="text-xs text-muted-foreground">
                        Listen to pronunciation
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={playNativeAudio}
                    disabled={isPlayingNative}
                    variant="outline"
                    size="sm"
                  >
                    {isPlayingNative ? (
                      <>
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
                        Playing
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Play
                      </>
                    )}
                  </Button>
                </div>

                {/* User Recording */}
                <div className="flex items-center justify-between p-4 bg-secondary/5 rounded-lg border border-secondary/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
                      <Mic className="w-5 h-5 text-secondary" />
                    </div>
                    <div>
                      <p className="font-medium">Your Recording</p>
                      <p className="text-xs text-muted-foreground">
                        {hasRecorded
                          ? "Recording saved"
                          : "Record yourself speaking"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasRecorded ? (
                      <>
                        <Button
                          onClick={playUserAudio}
                          disabled={isPlayingUser}
                          variant="outline"
                          size="sm"
                        >
                          {isPlayingUser ? (
                            <>
                              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
                              Playing
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4 mr-2" />
                              Play
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={handleReRecord}
                          variant="ghost"
                          size="sm"
                        >
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Re-record
                        </Button>
                      </>
                    ) : (
                      <Button
                        onClick={isRecording ? stopRecording : startRecording}
                        variant={isRecording ? "destructive" : "default"}
                        size="sm"
                      >
                        {isRecording ? (
                          <>
                            <Square className="w-4 h-4 mr-2 fill-current" />
                            Stop
                          </>
                        ) : (
                          <>
                            <Mic className="w-4 h-4 mr-2" />
                            Record
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Continue Button */}
              <div className="mt-8">
                <Button
                  onClick={handleNext}
                  disabled={!hasRecorded}
                  size="lg"
                  className="w-full"
                >
                  {hasRecorded && <Check className="w-5 h-5 mr-2" />}
                  {isLastWord ? "Complete Review" : "Next Word"}
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </ScaleIn>

        {/* Tips */}
        <FadeIn delay={200}>
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              💡 Tip: Try to match the pronunciation, rhythm, and intonation of
              the native speaker
            </p>
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
