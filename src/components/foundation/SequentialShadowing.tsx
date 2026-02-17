"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Volume2,
  Mic,
  Square,
  Play,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { FoundationWord } from "@/types/foundation-vocabulary";
import { FadeIn, ScaleIn } from "@/components/ui/animations";
import { getLanguageConfig, type SupportedLanguage } from "@/lib/languages";
import { useSoundEffects } from "@/lib/sounds";

interface SequentialShadowingProps {
  words: FoundationWord[];
  onComplete: () => void;
  language?: SupportedLanguage;
}

/**
 * Sequential Shadowing Component
 *
 * Final phase where users:
 * 1. Listen to all 4 words played in sequence
 * 2. Record themselves saying all 4 words in one continuous recording
 * 3. Can compare their recording with the native audio
 */
export function SequentialShadowing({
  words,
  onComplete,
  language = "fr",
}: SequentialShadowingProps) {
  const [isPlayingNative, setIsPlayingNative] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [userAudioBlob, setUserAudioBlob] = useState<Blob | null>(null);
  const [userAudioUrl, setUserAudioUrl] = useState<string | null>(null);
  const [isPlayingUser, setIsPlayingUser] = useState(false);
  const [hasRecorded, setHasRecorded] = useState(false);
  const [currentlyPlayingIndex, setCurrentlyPlayingIndex] = useState<
    number | null
  >(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const userAudioRef = useRef<HTMLAudioElement | null>(null);
  const nativeAudioRefs = useRef<(HTMLAudioElement | null)[]>([]);

  const { playSuccess, playAchieve } = useSoundEffects();
  const langConfig = getLanguageConfig(language);

  // Auto-play all words when component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      playAllWordsSequentially();
    }, 500);
    return () => {
      clearTimeout(timer);
      // Cleanup all audio elements
      nativeAudioRefs.current.forEach((audio) => {
        if (audio) {
          audio.pause();
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Play all words in sequence using pre-generated audio files
  const playAllWordsSequentially = async () => {
    if (isPlayingNative) return;

    setIsPlayingNative(true);

    const playWord = (index: number): Promise<void> => {
      return new Promise((resolve) => {
        const word = words[index];
        if (!word.audioUrl) {
          resolve();
          return;
        }

        setCurrentlyPlayingIndex(index);

        // Create or reuse audio element for this word
        if (!nativeAudioRefs.current[index]) {
          nativeAudioRefs.current[index] = new Audio(word.audioUrl);
        } else {
          nativeAudioRefs.current[index]!.src = word.audioUrl;
        }

        const audio = nativeAudioRefs.current[index]!;

        audio.onended = () => {
          // Add pause between words
          setTimeout(() => {
            resolve();
          }, 600);
        };

        audio.onerror = () => {
          console.error("Error playing audio:", word.audioUrl);
          resolve();
        };

        audio.play().catch((error) => {
          console.error("Error playing audio:", error);
          resolve();
        });
      });
    };

    // Play all words in sequence
    for (let i = 0; i < words.length; i++) {
      await playWord(i);
    }

    setCurrentlyPlayingIndex(null);
    setIsPlayingNative(false);
  };

  // Start recording user's pronunciation of all words
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
        playSuccess();
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

  // Re-record
  const handleReRecord = () => {
    if (userAudioUrl) {
      URL.revokeObjectURL(userAudioUrl);
    }
    setUserAudioBlob(null);
    setUserAudioUrl(null);
    setHasRecorded(false);
    setIsPlayingUser(false);
  };

  // Complete the session
  const handleComplete = () => {
    playAchieve();
    onComplete();
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (userAudioUrl) {
        URL.revokeObjectURL(userAudioUrl);
      }
      if (userAudioRef.current) {
        userAudioRef.current.pause();
      }
      window.speechSynthesis.cancel();
    };
  }, [userAudioUrl]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <FadeIn>
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Final Review</h1>
            <p className="text-muted-foreground">
              Practice all {words.length} words together
            </p>
          </div>
        </FadeIn>

        {/* Main Card */}
        <ScaleIn>
          <Card className="border-2">
            <CardContent className="pt-8 pb-8 px-6">
              {/* Words Display */}
              <div className="mb-8">
                <p className="text-sm text-muted-foreground text-center mb-4">
                  Words to practice:
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {words.map((word, index) => (
                    <div
                      key={word.id}
                      className={cn(
                        "p-4 rounded-lg border-2 transition-all duration-300",
                        currentlyPlayingIndex === index
                          ? "border-primary bg-primary/10 scale-105"
                          : "border-border bg-muted/30",
                      )}
                    >
                      <p className="font-bold text-lg mb-1">{word.word}</p>
                      <p className="text-sm text-muted-foreground">
                        {word.translation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                <p className="text-sm text-center font-medium mb-2">
                  📝 Instructions
                </p>
                <ol className="text-sm space-y-1 text-muted-foreground">
                  <li>1. Listen to all {words.length} words in sequence</li>
                  <li>2. Record yourself saying all {words.length} words</li>
                  <li>3. Compare your pronunciation with the native audio</li>
                </ol>
              </div>

              {/* Audio Controls */}
              <div className="space-y-4">
                {/* Native Audio */}
                <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Volume2 className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Native Audio</p>
                      <p className="text-xs text-muted-foreground">
                        Listen to all {words.length} words
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={playAllWordsSequentially}
                    disabled={isPlayingNative}
                    size="lg"
                    className="gap-2"
                  >
                    {isPlayingNative ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Playing...
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5" />
                        Play All
                      </>
                    )}
                  </Button>
                </div>

                {/* User Recording */}
                <div className="flex items-center justify-between p-4 bg-secondary/5 rounded-lg border border-secondary/20">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center">
                      <Mic className="w-6 h-6 text-secondary" />
                    </div>
                    <div>
                      <p className="font-medium">Your Recording</p>
                      <p className="text-xs text-muted-foreground">
                        {hasRecorded
                          ? "Recording saved"
                          : `Say all ${words.length} words`}
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
                          size="lg"
                          className="gap-2"
                        >
                          {isPlayingUser ? (
                            <>
                              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                              Playing
                            </>
                          ) : (
                            <>
                              <Play className="w-5 h-5" />
                              Play
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={handleReRecord}
                          variant="ghost"
                          size="lg"
                          className="gap-2"
                        >
                          <RotateCcw className="w-5 h-5" />
                          Re-record
                        </Button>
                      </>
                    ) : (
                      <Button
                        onClick={isRecording ? stopRecording : startRecording}
                        variant={isRecording ? "destructive" : "default"}
                        size="lg"
                        className={cn("gap-2", isRecording && "animate-pulse")}
                      >
                        {isRecording ? (
                          <>
                            <Square className="w-5 h-5 fill-current" />
                            Stop Recording
                          </>
                        ) : (
                          <>
                            <Mic className="w-5 h-5" />
                            Record All
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Complete Button */}
              <div className="mt-8">
                <Button
                  onClick={handleComplete}
                  disabled={!hasRecorded}
                  size="lg"
                  className="w-full gap-2"
                >
                  {hasRecorded ? "Complete Session" : "Record to Continue"}
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </ScaleIn>

        {/* Tips */}
        <FadeIn delay={200}>
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              💡 Tip: Take a deep breath and speak clearly. Try to match the
              rhythm and pronunciation!
            </p>
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
