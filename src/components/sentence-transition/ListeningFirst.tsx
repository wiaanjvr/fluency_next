"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Volume2, Loader2, Eye, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  SimpleSentence,
  ListeningFirstResult,
  ListeningPhase,
  ListeningImageOption,
} from "@/types/sentence-transition";
import {
  AnimatedCheckmark,
  AnimatedXMark,
  ShakeHorizontal,
  FadeIn,
  ScaleIn,
} from "@/components/ui/animations";
import { useSoundEffects } from "@/lib/sounds";
import {
  getImageForWord,
  getPlaceholderImage,
  preloadImages,
} from "@/lib/content/image-service";
import {
  getLanguageConfig,
  getTTSVoice,
  type SupportedLanguage,
} from "@/lib/languages";

// Helper to get the target language text
function getTargetText(sentence: SimpleSentence): string {
  return sentence.target || sentence.french || "";
}

// ============================================================================
// LISTENING FIRST EXERCISE
// Audio-first: hear sentence → select image meaning → then see text
// ============================================================================

interface ListeningFirstExerciseProps {
  sentence: SimpleSentence;
  imageOptions: ListeningImageOption[];
  correctImageIndex: number;
  onResult: (result: ListeningFirstResult) => void;
  language?: SupportedLanguage;
}

export function ListeningFirstExercise({
  sentence,
  imageOptions,
  correctImageIndex,
  onResult,
  language = "fr",
}: ListeningFirstExerciseProps) {
  const [phase, setPhase] = useState<ListeningPhase>("audio-only");
  const [isPlaying, setIsPlaying] = useState(false);
  const [listenCount, setListenCount] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [startTime] = useState(Date.now());
  const { playSuccess, playError } = useSoundEffects();

  const langConfig = getLanguageConfig(language);
  const targetText = getTargetText(sentence);

  // Preload images on mount
  useEffect(() => {
    const urls = imageOptions.map((opt) => opt.imageUrl);
    preloadImages(urls).then(() => setImagesLoaded(true));
  }, [imageOptions]);

  // Play sentence audio using TTS
  const playAudio = useCallback(() => {
    if (isPlaying) return;

    setIsPlaying(true);
    setListenCount((prev) => prev + 1);

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(targetText);
      utterance.lang = langConfig.speechCode;
      utterance.rate = 0.7; // Slower for comprehension

      const selectedVoice = getTTSVoice(language);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      utterance.onend = () => {
        setIsPlaying(false);
        // Move to selection phase after first listen
        if (phase === "audio-only") {
          setTimeout(() => setPhase("select-meaning"), 500);
        }
      };

      utterance.onerror = () => {
        setIsPlaying(false);
        if (phase === "audio-only") {
          setPhase("select-meaning");
        }
      };

      window.speechSynthesis.speak(utterance);
    } else {
      setIsPlaying(false);
      if (phase === "audio-only") {
        setPhase("select-meaning");
      }
    }
  }, [isPlaying, targetText, langConfig.speechCode, language, phase]);

  // Auto-play audio on mount
  useEffect(() => {
    if (phase === "audio-only") {
      const timer = setTimeout(playAudio, 500);
      return () => clearTimeout(timer);
    }
  }, [phase, playAudio]);

  // Handle image selection
  const handleSelectImage = (index: number) => {
    if (showResult || phase !== "select-meaning") return;

    setSelectedIndex(index);
    setAttemptCount((prev) => prev + 1);
    const isCorrect = index === correctImageIndex;

    if (isCorrect) {
      setShowResult(true);
      playSuccess();

      // Move to reveal text phase after showing result
      setTimeout(() => {
        setPhase("reveal-text");
      }, 1500);
    } else {
      playError();
      // Reset selection after shake animation
      setTimeout(() => {
        setSelectedIndex(null);
      }, 600);
    }
  };

  // Handle completion
  const handleComplete = () => {
    onResult({
      sentenceId: sentence.id,
      correct: true,
      attemptsBeforeCorrect: attemptCount,
      listenCount,
      responseTimeMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });
  };

  // ===== PHASE 1: AUDIO ONLY =====
  if (phase === "audio-only") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 p-4">
        <FadeIn>
          <div className="text-center">
            <p className="text-muted-foreground mb-6 text-lg">
              Listen carefully to the French sentence
            </p>

            <Button
              onClick={playAudio}
              disabled={isPlaying}
              size="lg"
              className={cn(
                "gap-3 px-10 py-8 text-xl rounded-full shadow-lg",
                isPlaying && "animate-pulse bg-primary/90",
              )}
            >
              <Volume2
                className={cn("w-10 h-10", isPlaying && "animate-bounce")}
              />
              {isPlaying ? <span>Listening...</span> : <span>Play Audio</span>}
            </Button>
          </div>
        </FadeIn>

        {/* Visual audio wave indicator */}
        {isPlaying && (
          <FadeIn>
            <div className="flex gap-1 items-end h-8">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-2 bg-primary rounded-full animate-audio-wave"
                  style={{
                    animationDelay: `${i * 0.1}s`,
                    height: `${Math.random() * 24 + 8}px`,
                  }}
                />
              ))}
            </div>
          </FadeIn>
        )}
      </div>
    );
  }

  // ===== PHASE 2: SELECT MEANING =====
  if (phase === "select-meaning") {
    return (
      <div className="p-4">
        <FadeIn>
          <div className="text-center mb-6">
            <p className="text-muted-foreground mb-4">
              What does the sentence mean?
            </p>

            {/* Replay button */}
            <Button
              onClick={playAudio}
              disabled={isPlaying}
              variant="outline"
              size="sm"
              className={cn("gap-2 rounded-full", isPlaying && "animate-pulse")}
            >
              <Volume2
                className={cn("w-4 h-4", isPlaying && "animate-bounce")}
              />
              {isPlaying ? "Playing..." : `Listen Again (${listenCount})`}
            </Button>
          </div>
        </FadeIn>

        {/* Image options grid */}
        {!imagesLoaded ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 max-w-2xl mx-auto">
            {imageOptions.map((option, index) => {
              const isSelected = selectedIndex === index;
              const isCorrect = index === correctImageIndex;
              const showCorrectHighlight = showResult && isCorrect;
              const showIncorrectHighlight =
                isSelected && !isCorrect && !showResult;

              return (
                <ScaleIn key={option.id} delay={index * 50}>
                  <ShakeHorizontal trigger={showIncorrectHighlight}>
                    <button
                      onClick={() => handleSelectImage(index)}
                      disabled={showResult}
                      className={cn(
                        "relative w-full aspect-[4/3] rounded-2xl overflow-hidden",
                        "border-4 transition-all duration-200",
                        "hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20",
                        !showResult &&
                          !isSelected &&
                          "border-transparent hover:scale-105",
                        showCorrectHighlight &&
                          "border-green-500 ring-4 ring-green-500/20 scale-105",
                        showIncorrectHighlight &&
                          "border-red-500 ring-4 ring-red-500/20",
                      )}
                    >
                      <img
                        src={option.imageUrl}
                        alt={option.description}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            getPlaceholderImage();
                        }}
                      />

                      {/* Correct overlay */}
                      {showCorrectHighlight && (
                        <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                          <AnimatedCheckmark show size="lg" />
                        </div>
                      )}

                      {/* Incorrect flash */}
                      {showIncorrectHighlight && (
                        <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                          <AnimatedXMark show size="lg" />
                        </div>
                      )}
                    </button>
                  </ShakeHorizontal>
                </ScaleIn>
              );
            })}
          </div>
        )}

        {/* Hint after multiple wrong attempts */}
        {attemptCount >= 2 && !showResult && (
          <FadeIn delay={200}>
            <p className="text-center text-sm text-muted-foreground mt-6">
              💡 Listen again carefully to each word
            </p>
          </FadeIn>
        )}
      </div>
    );
  }

  // ===== PHASE 3: REVEAL TEXT =====
  if (phase === "reveal-text") {
    return (
      <div className="p-4">
        <FadeIn>
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400 mb-4">
              <AnimatedCheckmark show size="md" />
              <span className="font-medium">Correct!</span>
            </div>
          </div>
        </FadeIn>

        {/* Show the sentence text now */}
        <FadeIn delay={200}>
          <Card className="max-w-lg mx-auto mb-6">
            <CardContent className="pt-6">
              {/* Audio button */}
              <div className="flex justify-center mb-4">
                <Button
                  onClick={playAudio}
                  disabled={isPlaying}
                  variant="ghost"
                  size="sm"
                  className="gap-2"
                >
                  <Volume2
                    className={cn("w-4 h-4", isPlaying && "animate-bounce")}
                  />
                  Listen Again
                </Button>
              </div>

              {/* Target language sentence revealed */}
              <h2 className="text-2xl md:text-3xl font-serif text-primary text-center mb-4">
                {targetText}
              </h2>

              {/* English translation */}
              <p className="text-lg text-muted-foreground text-center italic">
                {sentence.english}
              </p>
            </CardContent>
          </Card>
        </FadeIn>

        {/* Word breakdown */}
        <FadeIn delay={400}>
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {sentence.words.map((word, index) => (
              <span
                key={index}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm",
                  word.isNew
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 font-medium"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {word.word}
                <span className="text-xs ml-1 opacity-70">
                  ({word.translation})
                </span>
              </span>
            ))}
          </div>
        </FadeIn>

        {/* New word highlight */}
        {sentence.newWord && (
          <FadeIn delay={500}>
            <Card className="max-w-md mx-auto mb-6 border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800">
              <CardContent className="pt-4">
                <div className="flex items-center justify-center gap-2 text-amber-700 dark:text-amber-300">
                  <span className="text-sm font-medium">
                    ✨ New Word Learned:
                  </span>
                  <span className="font-serif text-lg">
                    {sentence.newWord.word}
                  </span>
                  <span className="text-sm">= {sentence.newWord.meaning}</span>
                </div>
              </CardContent>
            </Card>
          </FadeIn>
        )}

        {/* Stats and continue */}
        <FadeIn delay={600}>
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Listened {listenCount} time{listenCount !== 1 ? "s" : ""} •{" "}
              {attemptCount === 1 ? "First try!" : `${attemptCount} attempts`}
            </p>

            <Button onClick={handleComplete} size="lg" className="gap-2">
              <Eye className="w-4 h-4" />
              Continue
            </Button>
          </div>
        </FadeIn>
      </div>
    );
  }

  return null;
}

// ============================================================================
// UTILITY: Create image options from sentence
// ============================================================================

export function createImageOptionsFromSentence(
  sentence: SimpleSentence,
  allSentences: SimpleSentence[],
  optionCount: number = 3,
): { options: ListeningImageOption[]; correctIndex: number } {
  // Get main noun/verb from sentence for the correct image
  const mainWord = sentence.words.find(
    (w) =>
      ![
        "le",
        "la",
        "les",
        "un",
        "une",
        "des",
        "je",
        "tu",
        "il",
        "elle",
        "nous",
        "vous",
        "ils",
        "elles",
        "est",
        "sont",
        "a",
        "ont",
      ].includes(w.word.toLowerCase()),
  );

  const imageKeyword = mainWord?.lemma || sentence.words[0]?.lemma || "french";
  const correctImage: ListeningImageOption = {
    id: `correct-${sentence.id}`,
    imageUrl: getImageForWord(imageKeyword).imageUrl,
    description: sentence.english,
    isCorrect: true,
  };

  // Get distractor images from other sentences
  const distractorSentences = allSentences
    .filter((s) => s.id !== sentence.id)
    .sort(() => Math.random() - 0.5)
    .slice(0, optionCount - 1);

  const distractorImages: ListeningImageOption[] = distractorSentences.map(
    (s) => {
      const word = s.words.find(
        (w) =>
          ![
            "le",
            "la",
            "les",
            "un",
            "une",
            "des",
            "je",
            "tu",
            "il",
            "elle",
            "nous",
            "vous",
            "ils",
            "elles",
            "est",
            "sont",
            "a",
            "ont",
          ].includes(w.word.toLowerCase()),
      );
      return {
        id: `distractor-${s.id}`,
        imageUrl: getImageForWord(word?.lemma || "object").imageUrl,
        description: s.english,
        isCorrect: false,
      };
    },
  );

  // Combine and shuffle
  const allOptions = [correctImage, ...distractorImages];
  const shuffled = allOptions.sort(() => Math.random() - 0.5);
  const correctIndex = shuffled.findIndex((opt) => opt.isCorrect);

  return {
    options: shuffled,
    correctIndex,
  };
}
