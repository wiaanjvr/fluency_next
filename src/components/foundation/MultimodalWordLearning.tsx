"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Volume2,
  Mic,
  Square,
  Play,
  ChevronRight,
  Loader2,
  Check,
  X,
  RotateCcw,
  Sparkles,
  Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { FoundationWord } from "@/types/foundation-vocabulary";
import {
  getImageForWord,
  getPlaceholderImage,
} from "@/lib/content/image-service";
import {
  FadeIn,
  ScaleIn,
  AnimatedCheckmark,
  AnimatedXMark,
  ShakeHorizontal,
} from "@/components/ui/animations";
import { getLanguageConfig, type SupportedLanguage } from "@/lib/languages";
import { useSoundEffects } from "@/lib/sounds";
import type { PronunciationAttempt } from "@/types/foundation-vocabulary";

// Learning phases for the multimodal flow
type LearningPhase =
  | "introduction" // Show image, word, play audio
  | "pronunciation" // Record user saying the word
  | "meaning" // User types what they think it means
  | "reveal" // Show correct meaning
  | "already-know-test"; // Test for "I already know this" option

interface MultimodalWordLearningProps {
  word: FoundationWord;
  onComplete: (pronunciationData: PronunciationAttempt) => void;
  onAlreadyKnown?: (wordId: string, passed: boolean) => void; // Callback for when user claims to know the word
  language?: SupportedLanguage;
}

const MAX_PRONUNCIATION_ATTEMPTS = 2;

/**
 * Multimodal Word Learning Component
 *
 * Flow:
 * 1. Introduction: Show image + word + audio (with "I already know this" option)
 * 2. Pronunciation: User records themselves, STT validates
 * 3. Meaning: User types what they think the word means
 * 4. Reveal: Show correct meaning
 *
 * Alternative flow (I already know this):
 * 1. Introduction: User clicks "I already know this"
 * 2. Already-know-test: User speaks the word (STT check) + answers multiple choice
 * 3. If both correct: mark as mastered and complete
 */
export function MultimodalWordLearning({
  word,
  onComplete,
  onAlreadyKnown,
  language = "fr",
}: MultimodalWordLearningProps) {
  const [phase, setPhase] = useState<LearningPhase>("introduction");
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isPlayingNative, setIsPlayingNative] = useState(false);
  const [hasHeardNative, setHasHeardNative] = useState(false);

  // Pronunciation phase state
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userAudioBlob, setUserAudioBlob] = useState<Blob | null>(null);
  const [userAudioUrl, setUserAudioUrl] = useState<string | null>(null);
  const [isPlayingUser, setIsPlayingUser] = useState(false);
  const [pronunciationAttempts, setPronunciationAttempts] = useState(0);
  const [pronunciationMatch, setPronunciationMatch] = useState<boolean | null>(
    null,
  );
  const [transcribedText, setTranscribedText] = useState<string>("");

  // Meaning phase state
  const [userMeaning, setUserMeaning] = useState("");

  // "Already know" test state
  const [alreadyKnowStep, setAlreadyKnowStep] = useState<
    "pronunciation" | "meaning"
  >("pronunciation");
  const [alreadyKnowPronunciationPassed, setAlreadyKnowPronunciationPassed] =
    useState(false);
  const [multipleChoiceOptions, setMultipleChoiceOptions] = useState<string[]>(
    [],
  );
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answerCorrect, setAnswerCorrect] = useState<boolean | null>(null);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const userAudioRef = useRef<HTMLAudioElement | null>(null);
  const nativeAudioRef = useRef<HTMLAudioElement | null>(null);

  const { playSuccess, playError, playAchieve } = useSoundEffects();
  const imageResult = getImageForWord(word.imageKeyword);
  const langConfig = getLanguageConfig(language);

  // Play native audio using pre-generated audio file
  const playNativeAudio = async () => {
    if (isPlayingNative || !word.audioUrl) return;

    setIsPlayingNative(true);

    try {
      // Create or reuse native audio element
      if (!nativeAudioRef.current) {
        nativeAudioRef.current = new Audio(word.audioUrl);
      } else {
        nativeAudioRef.current.src = word.audioUrl;
      }

      nativeAudioRef.current.onended = () => {
        setIsPlayingNative(false);
        setHasHeardNative(true);
      };

      nativeAudioRef.current.onerror = () => {
        console.error("Error playing audio:", word.audioUrl);
        setIsPlayingNative(false);
      };

      await nativeAudioRef.current.play();
    } catch (error) {
      console.error("Error playing audio:", error);
      setIsPlayingNative(false);
    }
  };

  // Auto-play audio on introduction phase
  useEffect(() => {
    if (phase === "introduction") {
      const timer = setTimeout(() => {
        playNativeAudio();
      }, 500);

      return () => {
        clearTimeout(timer);
        // Cleanup audio on unmount
        if (nativeAudioRef.current) {
          nativeAudioRef.current.pause();
        }
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

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

        // Process the recording
        await processRecording(blob);
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

  // Process the recorded audio
  const processRecording = async (audioBlob: Blob) => {
    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append("audio", audioBlob);
      formData.append("language", language);
      formData.append("expectedWord", word.word);

      const response = await fetch("/api/transcribe/match", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setTranscribedText(data.transcribed || "");
        const matches = data.matches || false;

        setPronunciationMatch(matches);
        setPronunciationAttempts((prev) => prev + 1);

        if (matches) {
          playSuccess();
        } else {
          playError();
        }
      } else {
        throw new Error("Transcription failed");
      }
    } catch (error) {
      console.error("Error processing recording:", error);
      alert("Failed to process your recording. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Play user's recording
  const playUserAudio = () => {
    if (userAudioUrl && !isPlayingUser) {
      if (userAudioRef.current) {
        userAudioRef.current.pause();
        userAudioRef.current.currentTime = 0;
      }

      const audio = new Audio(userAudioUrl);
      userAudioRef.current = audio;

      audio.onended = () => {
        setIsPlayingUser(false);
      };

      audio.onerror = () => {
        setIsPlayingUser(false);
      };

      setIsPlayingUser(true);
      audio.play();
    }
  };

  // Handle pronunciation retry
  const handleRetry = () => {
    setPronunciationMatch(null);
    setUserAudioBlob(null);
    if (userAudioUrl) {
      URL.revokeObjectURL(userAudioUrl);
    }
    setUserAudioUrl(null);
    setTranscribedText("");
  };

  // Handle moving to meaning phase
  const handlePronunciationComplete = () => {
    setPhase("meaning");
  };

  // Handle skip after max attempts
  const handleSkipPronunciation = () => {
    playAchieve();
    setPhase("meaning");
  };

  // Handle meaning submission
  const handleMeaningSubmit = () => {
    if (userMeaning.trim()) {
      setPhase("reveal");
    }
  };

  // Handle completion
  const handleComplete = () => {
    playAchieve();

    // Gather pronunciation data
    const pronunciationData: PronunciationAttempt = {
      wordId: word.id,
      attempts: pronunciationAttempts,
      success: pronunciationMatch === true,
      timestamp: new Date().toISOString(),
    };

    onComplete(pronunciationData);
  };

  // Handle "I already know this" button click
  const handleAlreadyKnowClick = () => {
    // Generate multiple choice options (3 distractors + correct answer)
    const distractorWords = getDistractorWords(word, [], 3);
    const allOptions = [
      word.translation,
      ...distractorWords.map((w) => w.translation),
    ];
    // Shuffle options
    const shuffled = allOptions.sort(() => Math.random() - 0.5);
    setMultipleChoiceOptions(shuffled);

    // Reset state
    setAlreadyKnowStep("pronunciation");
    setAlreadyKnowPronunciationPassed(false);
    setPronunciationMatch(null);
    setUserAudioBlob(null);
    setSelectedAnswer(null);
    setAnswerCorrect(null);

    setPhase("already-know-test");
  };

  // Handle pronunciation success in "already know" test
  const handleAlreadyKnowPronunciationSuccess = () => {
    setAlreadyKnowPronunciationPassed(true);
    setAlreadyKnowStep("meaning");
    playSuccess();
  };

  // Handle multiple choice answer selection
  const handleAnswerSelect = (index: number) => {
    if (answerCorrect !== null) return; // Already answered

    setSelectedAnswer(index);
    const correct = multipleChoiceOptions[index] === word.translation;
    setAnswerCorrect(correct);

    if (correct) {
      playSuccess();
      // Both tests passed - mark as mastered
      setTimeout(() => {
        if (onAlreadyKnown) {
          onAlreadyKnown(word.id, true);
        }
        // Complete with perfect pronunciation data
        const pronunciationData: PronunciationAttempt = {
          wordId: word.id,
          attempts: 1,
          success: true,
          timestamp: new Date().toISOString(),
        };
        onComplete(pronunciationData);
      }, 1500);
    } else {
      playError();
      // Failed the test - go through normal learning flow
      setTimeout(() => {
        if (onAlreadyKnown) {
          onAlreadyKnown(word.id, false);
        }
        setPhase("introduction");
        // Reset state
        setPronunciationMatch(null);
        setUserAudioBlob(null);
        setUserAudioUrl(null);
      }, 2000);
    }
  };

  // Helper function to get distractor words (fallback if not imported)
  const getDistractorWords = (
    targetWord: FoundationWord,
    allWords: FoundationWord[],
    count: number,
  ): FoundationWord[] => {
    // This is a simple fallback - uses placeholder translations
    // In practice, this should pull from actual word list
    const distractors: FoundationWord[] = [];
    const placeholderTranslations = [
      "hello",
      "goodbye",
      "thank you",
      "please",
      "water",
      "food",
      "house",
      "car",
      "book",
      "tree",
      "cat",
      "dog",
      "sun",
      "moon",
      "star",
      "day",
      "night",
      "love",
      "happy",
      "sad",
      "big",
      "small",
      "fast",
      "slow",
      "good",
      "bad",
    ];

    for (let i = 0; i < count && distractors.length < count; i++) {
      const translation =
        placeholderTranslations[
          Math.floor(Math.random() * placeholderTranslations.length)
        ];
      if (
        translation !== targetWord.translation &&
        !distractors.some((d) => d.translation === translation)
      ) {
        distractors.push({
          ...targetWord,
          id: `distractor-${i}`,
          translation: translation,
        });
      }
    }

    return distractors;
  };

  // Cleanup audio URLs on unmount
  useEffect(() => {
    return () => {
      if (userAudioUrl) {
        URL.revokeObjectURL(userAudioUrl);
      }
      if (userAudioRef.current) {
        userAudioRef.current.pause();
      }
    };
  }, [userAudioUrl]);

  return (
    <div className="flex flex-col items-center gap-6 p-6 max-w-2xl mx-auto">
      {/* Introduction Phase */}
      {phase === "introduction" && (
        <>
          {/* Image Section */}
          <ScaleIn delay={0}>
            <div className="relative w-64 h-48 md:w-80 md:h-60 rounded-xl overflow-hidden bg-muted shadow-lg">
              {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted animate-pulse">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              )}
              <img
                src={imageResult.imageUrl}
                alt={word.translation}
                className={cn(
                  "w-full h-full object-cover transition-opacity duration-300",
                  imageLoaded ? "opacity-100" : "opacity-0",
                )}
                onLoad={() => setImageLoaded(true)}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = getPlaceholderImage();
                  setImageLoaded(true);
                }}
              />
              {/* Attribution */}
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1 text-[10px] text-white/70">
                Photo by{" "}
                <a
                  href={imageResult.attribution.photographerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  {imageResult.attribution.photographerName}
                </a>
              </div>
            </div>
          </ScaleIn>

          {/* Word and Audio Section */}
          <FadeIn delay={100}>
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-3">
                <h2 className="text-4xl md:text-5xl font-bold font-serif text-primary">
                  {word.word}
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={playNativeAudio}
                  disabled={isPlayingNative}
                  className={cn(
                    "rounded-full transition-all",
                    isPlayingNative && "animate-pulse bg-primary/10",
                  )}
                >
                  <Volume2
                    className={cn("w-6 h-6", isPlayingNative && "text-primary")}
                  />
                </Button>
              </div>

              {word.phonetic && (
                <p className="text-muted-foreground text-lg">
                  [{word.phonetic}]
                </p>
              )}

              <span className="px-3 py-1 bg-secondary text-secondary-foreground text-sm rounded-full capitalize">
                {word.category}
              </span>
            </div>
          </FadeIn>

          {/* Instructions */}
          <FadeIn delay={200}>
            <Card className="p-4 bg-muted/50 max-w-md text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Listen to how the word is pronounced, then you'll practice
                saying it yourself.
              </p>
            </Card>
          </FadeIn>

          {/* Continue Button */}
          <FadeIn delay={300}>
            <div className="flex flex-col items-center gap-3 mt-4">
              <Button
                onClick={() => setPhase("pronunciation")}
                size="lg"
                className="gap-2"
                disabled={!hasHeardNative}
              >
                I'm Ready to Practice
                <ChevronRight className="w-5 h-5" />
              </Button>

              {/* "I already know this" button */}
              <Button
                onClick={handleAlreadyKnowClick}
                variant="outline"
                size="sm"
                className="text-muted-foreground hover:text-primary"
                disabled={!hasHeardNative}
              >
                I already know this word
              </Button>
            </div>
          </FadeIn>
        </>
      )}

      {/* Already Know Test Phase */}
      {phase === "already-know-test" && (
        <>
          {alreadyKnowStep === "pronunciation" ? (
            <>
              {/* Pronunciation Test */}
              <div className="flex flex-col items-center gap-4 w-full max-w-md">
                <h3 className="text-2xl font-semibold text-center">
                  Prove you know this word
                </h3>

                <Card className="p-4 bg-blue-50 border-blue-200 w-full">
                  <p className="text-sm text-center text-blue-900">
                    <strong>Step 1 of 2:</strong> Say the word "{word.word}" out
                    loud
                  </p>
                </Card>

                <div className="flex flex-col items-center gap-2">
                  <h2 className="text-4xl font-bold font-serif text-primary">
                    {word.word}
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={playNativeAudio}
                    disabled={isPlayingNative}
                    className="gap-2 text-muted-foreground"
                  >
                    <Volume2 className="w-4 h-4" />
                    Hear pronunciation
                  </Button>
                </div>

                {/* Recording Interface */}
                {!userAudioBlob && !isProcessing && (
                  <div className="flex flex-col items-center gap-4 mt-4">
                    <Button
                      size="lg"
                      onClick={isRecording ? stopRecording : startRecording}
                      className={cn(
                        "w-20 h-20 rounded-full",
                        isRecording &&
                          "bg-red-500 hover:bg-red-600 animate-pulse",
                      )}
                    >
                      {isRecording ? (
                        <Square className="w-8 h-8" />
                      ) : (
                        <Mic className="w-8 h-8" />
                      )}
                    </Button>
                    <p className="text-sm text-muted-foreground">
                      {isRecording
                        ? "Recording... Tap to stop"
                        : "Tap to record"}
                    </p>
                  </div>
                )}

                {/* Processing */}
                {isProcessing && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <p>Checking pronunciation...</p>
                  </div>
                )}

                {/* Result */}
                {!isProcessing && pronunciationMatch !== null && (
                  <Card
                    className={cn(
                      "p-6 text-center w-full",
                      pronunciationMatch
                        ? "bg-green-50 border-green-200"
                        : "bg-red-50 border-red-200",
                    )}
                  >
                    <div className="flex items-center justify-center gap-2 mb-2">
                      {pronunciationMatch ? (
                        <>
                          <Check className="w-6 h-6 text-green-600" />
                          <h3 className="text-lg font-semibold text-green-800">
                            Perfect!
                          </h3>
                        </>
                      ) : (
                        <>
                          <X className="w-6 h-6 text-red-600" />
                          <h3 className="text-lg font-semibold text-red-800">
                            Not quite right
                          </h3>
                        </>
                      )}
                    </div>
                    {pronunciationMatch ? (
                      <Button
                        onClick={handleAlreadyKnowPronunciationSuccess}
                        className="mt-4"
                      >
                        Continue to Step 2
                      </Button>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-sm text-red-700">
                          Let's learn this word properly instead
                        </p>
                        <Button
                          onClick={handleRetry}
                          variant="outline"
                          size="sm"
                        >
                          Try Again
                        </Button>
                      </div>
                    )}
                  </Card>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Multiple Choice Test */}
              <div className="flex flex-col items-center gap-4 w-full max-w-md">
                <h3 className="text-2xl font-semibold text-center">
                  Almost there!
                </h3>

                <Card className="p-4 bg-blue-50 border-blue-200 w-full">
                  <p className="text-sm text-center text-blue-900">
                    <strong>Step 2 of 2:</strong> What does "{word.word}" mean?
                  </p>
                </Card>

                <div className="grid grid-cols-1 gap-3 w-full mt-4">
                  {multipleChoiceOptions.map((option, index) => {
                    const isSelected = selectedAnswer === index;
                    const isCorrect = option === word.translation;
                    const showResult = answerCorrect !== null;

                    return (
                      <Button
                        key={index}
                        onClick={() => handleAnswerSelect(index)}
                        disabled={showResult}
                        variant="outline"
                        className={cn(
                          "h-auto py-4 px-6 text-left justify-start text-base",
                          isSelected &&
                            showResult &&
                            isCorrect &&
                            "bg-green-50 border-green-500",
                          isSelected &&
                            showResult &&
                            !isCorrect &&
                            "bg-red-50 border-red-500",
                          !isSelected &&
                            showResult &&
                            isCorrect &&
                            "bg-green-50 border-green-300",
                        )}
                      >
                        <span className="flex items-center gap-2 w-full">
                          <span className="flex-1">{option}</span>
                          {showResult && isSelected && isCorrect && (
                            <Check className="w-5 h-5 text-green-600" />
                          )}
                          {showResult && isSelected && !isCorrect && (
                            <X className="w-5 h-5 text-red-600" />
                          )}
                        </span>
                      </Button>
                    );
                  })}
                </div>

                {answerCorrect !== null && (
                  <Card
                    className={cn(
                      "p-4 text-center w-full mt-4",
                      answerCorrect
                        ? "bg-green-50 border-green-200"
                        : "bg-orange-50 border-orange-200",
                    )}
                  >
                    <p className="text-sm font-medium">
                      {answerCorrect
                        ? "Excellent! This word will be marked as mastered."
                        : "Let's learn this word properly through the lesson."}
                    </p>
                  </Card>
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* Pronunciation Phase */}
      {phase === "pronunciation" && (
        <>
          {/* Word Display */}
          <div className="flex flex-col items-center gap-2">
            <h2 className="text-4xl md:text-5xl font-bold font-serif text-primary">
              {word.word}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={playNativeAudio}
              disabled={isPlayingNative}
              className="gap-2 text-muted-foreground hover:text-primary"
            >
              <Volume2 className="w-4 h-4" />
              Hear again
            </Button>
          </div>

          {/* Instructions */}
          <Card className="p-4 bg-muted/50 max-w-md text-center">
            <p className="font-medium mb-1">Say the word out loud</p>
            <p className="text-sm text-muted-foreground">
              Try to match the pronunciation you heard
            </p>
            {pronunciationAttempts > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                Attempt {pronunciationAttempts} of {MAX_PRONUNCIATION_ATTEMPTS}
              </p>
            )}
          </Card>

          {/* Recording Interface */}
          {!userAudioBlob && (
            <div className="flex flex-col items-center gap-4">
              <Button
                size="lg"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isProcessing}
                className={cn(
                  "w-20 h-20 rounded-full transition-all",
                  isRecording && "bg-red-500 hover:bg-red-600 animate-pulse",
                )}
              >
                {isRecording ? (
                  <Square className="w-8 h-8" />
                ) : (
                  <Mic className="w-8 h-8" />
                )}
              </Button>
              <p className="text-sm text-muted-foreground">
                {isRecording ? "Recording... Tap to stop" : "Tap to record"}
              </p>
            </div>
          )}

          {/* Processing Indicator */}
          {isProcessing && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              <p>Checking your pronunciation...</p>
            </div>
          )}

          {/* Result Display */}
          {!isProcessing && pronunciationMatch !== null && (
            <div className="flex flex-col items-center gap-4 w-full max-w-md">
              {/* Match Result */}
              <ShakeHorizontal
                trigger={pronunciationMatch === false}
                className="w-full"
              >
                <Card
                  className={cn(
                    "p-6 text-center transition-all",
                    pronunciationMatch
                      ? "bg-green-50 border-green-200"
                      : "bg-orange-50 border-orange-200",
                  )}
                >
                  <div className="flex items-center justify-center gap-2 mb-2">
                    {pronunciationMatch ? (
                      <>
                        <AnimatedCheckmark
                          show={true}
                          className="w-8 h-8 text-green-600"
                        />
                        <h3 className="text-lg font-semibold text-green-800">
                          Great pronunciation!
                        </h3>
                      </>
                    ) : (
                      <>
                        <AnimatedXMark
                          show={true}
                          className="w-8 h-8 text-orange-600"
                        />
                        <h3 className="text-lg font-semibold text-orange-800">
                          Not quite right
                        </h3>
                      </>
                    )}
                  </div>

                  {transcribedText && !pronunciationMatch && (
                    <p className="text-sm text-muted-foreground mb-2">
                      We heard: "{transcribedText}"
                    </p>
                  )}

                  {!pronunciationMatch && (
                    <p className="text-sm text-orange-700">
                      Listen carefully and try again
                    </p>
                  )}
                </Card>
              </ShakeHorizontal>

              {/* Playback Controls */}
              <div className="flex gap-2">
                {/* Play user's recording */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={playUserAudio}
                  disabled={isPlayingUser}
                  className="gap-2"
                >
                  <Play className="w-4 h-4" />
                  {pronunciationMatch ? "Hear yourself" : "Hear your attempt"}
                </Button>

                {/* Play native audio */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={playNativeAudio}
                  disabled={isPlayingNative}
                  className="gap-2"
                >
                  <Volume2 className="w-4 h-4" />
                  Native audio
                </Button>
              </div>

              {/* Action Buttons */}
              {pronunciationMatch ? (
                <Button
                  onClick={handlePronunciationComplete}
                  size="lg"
                  className="gap-2 w-full"
                >
                  Continue
                  <ChevronRight className="w-5 h-5" />
                </Button>
              ) : pronunciationAttempts >= MAX_PRONUNCIATION_ATTEMPTS ? (
                <div className="flex flex-col gap-2 w-full">
                  <Card className="p-4 bg-blue-50 border-blue-200 text-center">
                    <Heart className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                    <p className="text-sm font-medium text-blue-800 mb-1">
                      Keep practicing!
                    </p>
                    <p className="text-xs text-blue-700">
                      Pronunciation takes time. You'll get more chances to
                      practice this word.
                    </p>
                  </Card>
                  <Button
                    onClick={handleSkipPronunciation}
                    size="lg"
                    className="gap-2 w-full"
                  >
                    Continue Learning
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={handleRetry}
                  variant="outline"
                  size="lg"
                  className="gap-2 w-full"
                >
                  <RotateCcw className="w-5 h-5" />
                  Try Again
                </Button>
              )}
            </div>
          )}
        </>
      )}

      {/* Meaning Phase */}
      {phase === "meaning" && (
        <>
          <div className="flex flex-col items-center gap-2">
            <h2 className="text-4xl md:text-5xl font-bold font-serif text-primary">
              {word.word}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={playNativeAudio}
              disabled={isPlayingNative}
              className="gap-2 text-muted-foreground hover:text-primary"
            >
              <Volume2 className="w-4 h-4" />
              Hear pronunciation
            </Button>
          </div>

          <Card className="p-4 bg-muted/50 max-w-md text-center">
            <Sparkles className="w-6 h-6 mx-auto mb-2 text-primary" />
            <p className="font-medium mb-1">What does this word mean?</p>
            <p className="text-sm text-muted-foreground">
              Type your guess in English
            </p>
          </Card>

          <div className="w-full max-w-md space-y-4">
            <Input
              type="text"
              placeholder="Type what you think it means..."
              value={userMeaning}
              onChange={(e) => setUserMeaning(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && userMeaning.trim()) {
                  handleMeaningSubmit();
                }
              }}
              className="text-lg p-6"
              autoFocus
            />

            <Button
              onClick={handleMeaningSubmit}
              disabled={!userMeaning.trim()}
              size="lg"
              className="w-full gap-2"
            >
              Check Answer
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </>
      )}

      {/* Reveal Phase */}
      {phase === "reveal" && (
        <>
          <div className="flex flex-col items-center gap-2">
            <h2 className="text-4xl md:text-5xl font-bold font-serif text-primary">
              {word.word}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={playNativeAudio}
              disabled={isPlayingNative}
              className="gap-2 text-muted-foreground hover:text-primary"
            >
              <Volume2 className="w-4 h-4" />
              Hear pronunciation
            </Button>
          </div>

          <div className="w-full max-w-md space-y-4">
            {/* User's Guess */}
            {userMeaning && (
              <Card className="p-4 bg-muted/50">
                <p className="text-sm text-muted-foreground mb-1">
                  Your guess:
                </p>
                <p className="text-lg font-medium">{userMeaning}</p>
              </Card>
            )}

            {/* Correct Meaning */}
            <ScaleIn>
              <Card className="p-6 bg-green-50 border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <Check className="w-6 h-6 text-green-600" />
                  <h3 className="text-lg font-semibold text-green-800">
                    Correct Meaning
                  </h3>
                </div>
                <p className="text-2xl font-bold text-green-900 mb-2">
                  {word.translation}
                </p>
              </Card>
            </ScaleIn>

            {/* Audio Comparison */}
            {userAudioUrl && (
              <Card className="p-4 bg-muted/50">
                <p className="text-sm font-medium mb-3 text-center">
                  Compare your pronunciation
                </p>
                <div className="flex gap-2 justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={playNativeAudio}
                    disabled={isPlayingNative}
                    className="gap-2"
                  >
                    <Volume2 className="w-4 h-4" />
                    Native
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={playUserAudio}
                    disabled={isPlayingUser}
                    className="gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Yours
                  </Button>
                </div>
              </Card>
            )}
          </div>

          <Button
            onClick={handleComplete}
            size="lg"
            className="w-full max-w-md gap-2"
          >
            Continue
            <ChevronRight className="w-5 h-5" />
          </Button>
        </>
      )}
    </div>
  );
}

/**
 * Session component for multiple words using multimodal learning
 */
interface MultimodalWordLearningSessionProps {
  words: FoundationWord[];
  onComplete: (
    wordsLearned: FoundationWord[],
    pronunciationAttempts: PronunciationAttempt[],
  ) => void;
  language?: SupportedLanguage;
}

export function MultimodalWordLearningSession({
  words,
  onComplete,
  language = "fr",
}: MultimodalWordLearningSessionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [learnedWords, setLearnedWords] = useState<FoundationWord[]>([]);
  const [pronunciationAttempts, setPronunciationAttempts] = useState<
    PronunciationAttempt[]
  >([]);
  const [alreadyKnownWords, setAlreadyKnownWords] = useState<string[]>([]);

  const currentWord = words[currentIndex];
  const progress = ((currentIndex + 1) / words.length) * 100;

  const handleWordComplete = (pronunciationData: PronunciationAttempt) => {
    const updatedLearnedWords = [...learnedWords, currentWord];
    const updatedPronunciationAttempts = [
      ...pronunciationAttempts,
      pronunciationData,
    ];

    setLearnedWords(updatedLearnedWords);
    setPronunciationAttempts(updatedPronunciationAttempts);

    console.log(
      `Completed word ${currentIndex + 1}/${words.length}: ${currentWord.word}`,
    );
    console.log("Total learned words:", updatedLearnedWords.length);
    console.log("Pronunciation success:", pronunciationData.success);

    if (currentIndex < words.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Session complete - use the updated arrays to ensure all data is included
      console.log(
        "Session complete! Calling onComplete with",
        updatedLearnedWords.length,
        "words and",
        updatedPronunciationAttempts.length,
        "pronunciation attempts",
      );
      onComplete(updatedLearnedWords, updatedPronunciationAttempts);
    }
  };

  const handleAlreadyKnown = (wordId: string, passed: boolean) => {
    console.log(
      `Word ${wordId} marked as ${passed ? "already known (passed test)" : "not actually known (failed test)"}`,
    );
    if (passed) {
      setAlreadyKnownWords((prev) => [...prev, wordId]);
      // Note: The word completion is handled by the MultimodalWordLearning component
      // which calls handleWordComplete with perfect pronunciation data
    }
  };

  // Safety check: if no words or invalid index
  if (!words || words.length === 0 || !currentWord) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No words available</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Progress Bar */}
      <div className="px-4 pt-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-muted-foreground">
            Learning new words: {currentIndex + 1} of {words.length}
          </p>
          <p className="text-sm font-medium text-primary">
            {Math.round(progress)}%
          </p>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Word Learning */}
      <div className="flex-1 overflow-auto">
        <MultimodalWordLearning
          key={currentWord.id}
          word={currentWord}
          onComplete={handleWordComplete}
          onAlreadyKnown={handleAlreadyKnown}
          language={language}
        />
      </div>
    </div>
  );
}
