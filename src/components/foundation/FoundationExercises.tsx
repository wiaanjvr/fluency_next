"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Volume2, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  FoundationWord,
  FoundationExerciseType,
  ExerciseResult,
} from "@/types/foundation-vocabulary";
import {
  getImageForWord,
  getImagesForWords,
  getPlaceholderImage,
  preloadImages,
} from "@/lib/content/image-service";
import {
  AnimatedCheckmark,
  AnimatedXMark,
  ShakeHorizontal,
  FadeIn,
  ScaleIn,
} from "@/components/ui/animations";
import { useSoundEffects } from "@/lib/sounds";
import { getDistractorWords } from "@/data/foundation-vocabulary";
import { getLanguageConfig, type SupportedLanguage } from "@/lib/languages";

// Helper to get target text from exampleSentence based on language
function getExampleSentenceText(
  exampleSentence: {
    french?: string;
    german?: string;
    italian?: string;
    target?: string;
  },
  language: SupportedLanguage = "fr",
): string {
  // Prefer the specific language property
  if (language === "de" && exampleSentence.german) {
    return exampleSentence.german;
  }
  if (language === "it" && exampleSentence.italian) {
    return exampleSentence.italian;
  }
  if (language === "fr" && exampleSentence.french) {
    return exampleSentence.french;
  }
  // Fall back to target or french
  return exampleSentence.target || exampleSentence.french || "";
}

interface ExerciseProps {
  targetWord: FoundationWord;
  allWords: FoundationWord[];
  onResult: (result: ExerciseResult) => void;
  language?: SupportedLanguage;
}

// ============================================================================
// Word to Image Exercise
// See word → select correct image (4 options)
// ============================================================================
interface WordToImageExerciseProps extends ExerciseProps {}

export function WordToImageExercise({
  targetWord,
  allWords,
  onResult,
}: WordToImageExerciseProps) {
  const [options, setOptions] = useState<FoundationWord[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [startTime] = useState(Date.now());
  const { playSuccess, playError } = useSoundEffects();

  // Generate options on mount
  useEffect(() => {
    const distractors = getDistractorWords(targetWord, allWords, 3);
    const allOptions = [targetWord, ...distractors];
    // Shuffle options
    const shuffled = allOptions.sort(() => Math.random() - 0.5);
    setOptions(shuffled);

    // Preload images
    const imageUrls = shuffled.map(
      (w) => getImageForWord(w.imageKeyword).imageUrl,
    );
    preloadImages(imageUrls).then(() => setImagesLoaded(true));
  }, [targetWord, allWords]);

  const handleSelect = (index: number) => {
    if (showResult) return;

    setSelectedIndex(index);
    setShowResult(true);

    const isCorrect = options[index].id === targetWord.id;
    isCorrect ? playSuccess() : playError();

    // Report result after animation
    setTimeout(() => {
      onResult({
        wordId: targetWord.id,
        exerciseType: "word-to-image",
        correct: isCorrect,
        responseTimeMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      });
    }, 1500);
  };

  const correctIndex = options.findIndex((o) => o.id === targetWord.id);

  return (
    <div className="flex flex-col items-center gap-6 p-4">
      {/* Prompt */}
      <FadeIn>
        <div className="text-center">
          <p className="text-muted-foreground mb-2">Select the image for:</p>
          <h2 className="text-3xl md:text-4xl font-bold font-serif text-primary">
            {targetWord.word}
          </h2>
          <p className="text-lg text-muted-foreground mt-1">
            ({targetWord.translation})
          </p>
        </div>
      </FadeIn>

      {/* Image Grid */}
      {!imagesLoaded ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 max-w-md">
          {options.map((option, index) => {
            const imageResult = getImageForWord(option.imageKeyword);
            const isSelected = selectedIndex === index;
            const isCorrect = option.id === targetWord.id;
            const showCorrectHighlight = showResult && isCorrect;
            const showIncorrectHighlight =
              showResult && isSelected && !isCorrect;

            return (
              <ScaleIn key={option.id} delay={index * 50}>
                <button
                  onClick={() => handleSelect(index)}
                  disabled={showResult}
                  className={cn(
                    "relative w-36 h-28 md:w-44 md:h-36 rounded-xl overflow-hidden",
                    "border-4 transition-all duration-200",
                    "hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20",
                    !showResult && "border-transparent hover:scale-105",
                    showCorrectHighlight &&
                      "border-green-500 ring-4 ring-green-500/20",
                    showIncorrectHighlight &&
                      "border-red-500 ring-4 ring-red-500/20",
                    showResult && !isCorrect && !isSelected && "opacity-50",
                  )}
                >
                  <img
                    src={imageResult.imageUrl}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        getPlaceholderImage();
                    }}
                  />
                  {/* Result indicators */}
                  {showCorrectHighlight && (
                    <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                      <AnimatedCheckmark show size="lg" />
                    </div>
                  )}
                  {showIncorrectHighlight && (
                    <ShakeHorizontal trigger>
                      <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                        <AnimatedXMark show size="lg" />
                      </div>
                    </ShakeHorizontal>
                  )}
                </button>
              </ScaleIn>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Audio to Image Exercise
// Hear word → select correct image (4 options)
// ============================================================================
interface AudioToImageExerciseProps extends ExerciseProps {}

export function AudioToImageExercise({
  targetWord,
  allWords,
  onResult,
  language = "fr",
}: AudioToImageExerciseProps) {
  const [options, setOptions] = useState<FoundationWord[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [startTime] = useState(Date.now());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { playSuccess, playError } = useSoundEffects();

  const langConfig = getLanguageConfig(language);

  // Generate options on mount
  useEffect(() => {
    const distractors = getDistractorWords(targetWord, allWords, 3);
    const allOptions = [targetWord, ...distractors];
    const shuffled = allOptions.sort(() => Math.random() - 0.5);
    setOptions(shuffled);

    const imageUrls = shuffled.map(
      (w) => getImageForWord(w.imageKeyword).imageUrl,
    );
    preloadImages(imageUrls).then(() => setImagesLoaded(true));
  }, [targetWord, allWords]);

  // Play audio using pre-generated audio file
  const playAudio = useCallback(() => {
    if (isPlaying || !targetWord.audioUrl) return;

    setIsPlaying(true);

    try {
      // Create or reuse audio element
      if (!audioRef.current) {
        audioRef.current = new Audio(targetWord.audioUrl);
      } else {
        audioRef.current.src = targetWord.audioUrl;
      }

      audioRef.current.onended = () => {
        setIsPlaying(false);
        setHasPlayed(true);
      };

      audioRef.current.onerror = () => {
        console.error("Error playing audio:", targetWord.audioUrl);
        setIsPlaying(false);
        setHasPlayed(true);
      };

      audioRef.current.play().catch((error) => {
        console.error("Error playing audio:", error);
        setIsPlaying(false);
        setHasPlayed(true);
      });
    } catch (error) {
      console.error("Error playing audio:", error);
      setIsPlaying(false);
      setHasPlayed(true);
    }
  }, [isPlaying, targetWord.audioUrl]);

  // Auto-play audio on mount
  useEffect(() => {
    if (imagesLoaded && !hasPlayed) {
      const timer = setTimeout(playAudio, 300);
      return () => {
        clearTimeout(timer);
        // Cleanup audio on unmount
        if (audioRef.current) {
          audioRef.current.pause();
        }
      };
    }
  }, [imagesLoaded, hasPlayed, playAudio]);

  const handleSelect = (index: number) => {
    if (showResult) return;

    setSelectedIndex(index);
    setShowResult(true);

    const isCorrect = options[index].id === targetWord.id;
    isCorrect ? playSuccess() : playError();

    setTimeout(() => {
      onResult({
        wordId: targetWord.id,
        exerciseType: "audio-to-image",
        correct: isCorrect,
        responseTimeMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      });
    }, 1500);
  };

  return (
    <div className="flex flex-col items-center gap-6 p-4">
      {/* Audio Prompt */}
      <FadeIn>
        <div className="text-center">
          <p className="text-muted-foreground mb-4">
            Listen and select the correct image:
          </p>
          <Button
            onClick={playAudio}
            disabled={isPlaying}
            size="lg"
            variant="outline"
            className={cn(
              "gap-2 px-8 py-6 text-xl rounded-full",
              isPlaying && "animate-pulse bg-primary/10",
            )}
          >
            <Volume2
              className={cn(
                "w-8 h-8",
                isPlaying && "text-primary animate-bounce",
              )}
            />
            {isPlaying ? "Playing..." : "Play Sound"}
          </Button>
        </div>
      </FadeIn>

      {/* Image Grid - same as WordToImage */}
      {!imagesLoaded ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 max-w-md">
          {options.map((option, index) => {
            const imageResult = getImageForWord(option.imageKeyword);
            const isSelected = selectedIndex === index;
            const isCorrect = option.id === targetWord.id;
            const showCorrectHighlight = showResult && isCorrect;
            const showIncorrectHighlight =
              showResult && isSelected && !isCorrect;

            return (
              <ScaleIn key={option.id} delay={index * 50}>
                <button
                  onClick={() => handleSelect(index)}
                  disabled={showResult || !hasPlayed}
                  className={cn(
                    "relative w-36 h-28 md:w-44 md:h-36 rounded-xl overflow-hidden",
                    "border-4 transition-all duration-200",
                    "hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20",
                    !showResult &&
                      hasPlayed &&
                      "border-transparent hover:scale-105",
                    !hasPlayed && "opacity-50 cursor-not-allowed",
                    showCorrectHighlight &&
                      "border-green-500 ring-4 ring-green-500/20",
                    showIncorrectHighlight &&
                      "border-red-500 ring-4 ring-red-500/20",
                    showResult && !isCorrect && !isSelected && "opacity-50",
                  )}
                >
                  <img
                    src={imageResult.imageUrl}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        getPlaceholderImage();
                    }}
                  />
                  {showCorrectHighlight && (
                    <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                      <AnimatedCheckmark show size="lg" />
                    </div>
                  )}
                  {showIncorrectHighlight && (
                    <ShakeHorizontal trigger>
                      <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                        <AnimatedXMark show size="lg" />
                      </div>
                    </ShakeHorizontal>
                  )}
                </button>
              </ScaleIn>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Image to Word Exercise
// See image → select/type word (4 options multiple choice)
// ============================================================================
interface ImageToWordExerciseProps extends ExerciseProps {}

export function ImageToWordExercise({
  targetWord,
  allWords,
  onResult,
}: ImageToWordExerciseProps) {
  const [options, setOptions] = useState<FoundationWord[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [startTime] = useState(Date.now());
  const { playSuccess, playError } = useSoundEffects();

  const imageResult = getImageForWord(targetWord.imageKeyword);

  // Generate options
  useEffect(() => {
    const distractors = getDistractorWords(targetWord, allWords, 3);
    const allOptions = [targetWord, ...distractors];
    const shuffled = allOptions.sort(() => Math.random() - 0.5);
    setOptions(shuffled);
  }, [targetWord, allWords]);

  const handleSelect = (index: number) => {
    if (showResult) return;

    setSelectedIndex(index);
    setShowResult(true);

    const isCorrect = options[index].id === targetWord.id;
    isCorrect ? playSuccess() : playError();

    setTimeout(() => {
      onResult({
        wordId: targetWord.id,
        exerciseType: "image-to-word",
        correct: isCorrect,
        responseTimeMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      });
    }, 1500);
  };

  return (
    <div className="flex flex-col items-center gap-6 p-4">
      {/* Prompt */}
      <FadeIn>
        <p className="text-muted-foreground text-center">
          What word does this image represent?
        </p>
      </FadeIn>

      {/* Target Image */}
      <ScaleIn>
        <div className="relative w-64 h-48 md:w-80 md:h-60 rounded-xl overflow-hidden bg-muted shadow-lg">
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted animate-pulse">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          )}
          <img
            src={imageResult.imageUrl}
            alt=""
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
        </div>
      </ScaleIn>

      {/* Word Options */}
      <div className="grid grid-cols-2 gap-3 max-w-md">
        {options.map((option, index) => {
          const isSelected = selectedIndex === index;
          const isCorrect = option.id === targetWord.id;
          const showCorrectHighlight = showResult && isCorrect;
          const showIncorrectHighlight = showResult && isSelected && !isCorrect;

          return (
            <FadeIn key={option.id} delay={index * 50}>
              <button
                onClick={() => handleSelect(index)}
                disabled={showResult}
                className={cn(
                  "px-6 py-4 rounded-xl border-2 text-lg font-medium transition-all",
                  "hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20",
                  !showResult && "border-border hover:bg-muted",
                  showCorrectHighlight &&
                    "border-green-500 bg-green-50 text-green-700",
                  showIncorrectHighlight &&
                    "border-red-500 bg-red-50 text-red-700",
                  showResult && !isCorrect && !isSelected && "opacity-50",
                )}
              >
                <div className="flex items-center justify-center gap-2">
                  <span className="font-serif">{option.word}</span>
                  {showCorrectHighlight && (
                    <Check className="w-5 h-5 text-green-600" />
                  )}
                  {showIncorrectHighlight && (
                    <X className="w-5 h-5 text-red-600" />
                  )}
                </div>
                <span className="text-sm text-muted-foreground">
                  ({option.translation})
                </span>
              </button>
            </FadeIn>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Audio to Word Exercise (Text Options)
// Hear word → select correct word from text options (works for all words)
// ============================================================================
interface AudioToWordTextExerciseProps extends ExerciseProps {}

export function AudioToWordTextExercise({
  targetWord,
  allWords,
  onResult,
  language = "fr",
}: AudioToWordTextExerciseProps) {
  const [options, setOptions] = useState<FoundationWord[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [startTime] = useState(Date.now());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { playSuccess, playError } = useSoundEffects();

  const langConfig = getLanguageConfig(language);

  // Generate options on mount
  useEffect(() => {
    const distractors = getDistractorWords(targetWord, allWords, 3);
    const allOptions = [targetWord, ...distractors];
    const shuffled = allOptions.sort(() => Math.random() - 0.5);
    setOptions(shuffled);
  }, [targetWord, allWords]);

  // Play audio using pre-generated audio file
  const playAudio = useCallback(() => {
    if (isPlaying || !targetWord.audioUrl) return;

    setIsPlaying(true);

    try {
      // Create or reuse audio element
      if (!audioRef.current) {
        audioRef.current = new Audio(targetWord.audioUrl);
      } else {
        audioRef.current.src = targetWord.audioUrl;
      }

      audioRef.current.onended = () => {
        setIsPlaying(false);
        setHasPlayed(true);
      };

      audioRef.current.onerror = () => {
        console.error("Error playing audio:", targetWord.audioUrl);
        setIsPlaying(false);
        setHasPlayed(true);
      };

      audioRef.current.play().catch((error) => {
        console.error("Error playing audio:", error);
        setIsPlaying(false);
        setHasPlayed(true);
      });
    } catch (error) {
      console.error("Error playing audio:", error);
      setIsPlaying(false);
      setHasPlayed(true);
    }
  }, [isPlaying, targetWord.audioUrl]);

  // Auto-play audio on mount
  useEffect(() => {
    if (!hasPlayed) {
      const timer = setTimeout(playAudio, 300);
      return () => {
        clearTimeout(timer);
        // Cleanup audio on unmount
        if (audioRef.current) {
          audioRef.current.pause();
        }
      };
    }
  }, [hasPlayed, playAudio]);

  const handleSelect = (index: number) => {
    if (showResult) return;

    setSelectedIndex(index);
    setShowResult(true);

    const isCorrect = options[index].id === targetWord.id;
    isCorrect ? playSuccess() : playError();

    setTimeout(() => {
      onResult({
        wordId: targetWord.id,
        exerciseType: "audio-to-word",
        correct: isCorrect,
        responseTimeMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      });
    }, 1500);
  };

  return (
    <div className="flex flex-col items-center gap-6 p-4">
      {/* Audio Prompt */}
      <FadeIn>
        <div className="text-center">
          <p className="text-muted-foreground mb-4">
            Listen and select the word you hear:
          </p>
          <Button
            onClick={playAudio}
            disabled={isPlaying}
            size="lg"
            variant="outline"
            className={cn(
              "gap-2 px-8 py-6 text-xl rounded-full",
              isPlaying && "animate-pulse bg-primary/10",
            )}
          >
            <Volume2
              className={cn(
                "w-8 h-8",
                isPlaying && "text-primary animate-bounce",
              )}
            />
            {isPlaying ? "Playing..." : "Play Sound"}
          </Button>
        </div>
      </FadeIn>

      {/* Word Options */}
      <div className="grid grid-cols-2 gap-3 max-w-md w-full">
        {options.map((option, index) => {
          const isSelected = selectedIndex === index;
          const isCorrect = option.id === targetWord.id;
          const showCorrectHighlight = showResult && isCorrect;
          const showIncorrectHighlight = showResult && isSelected && !isCorrect;

          return (
            <FadeIn key={option.id} delay={index * 50}>
              <button
                onClick={() => handleSelect(index)}
                disabled={showResult || !hasPlayed}
                className={cn(
                  "px-6 py-4 rounded-xl border-2 text-lg font-medium transition-all",
                  "hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20",
                  !showResult && hasPlayed && "border-border hover:bg-muted",
                  !hasPlayed && "opacity-50 cursor-not-allowed",
                  showCorrectHighlight &&
                    "border-green-500 bg-green-50 text-green-700",
                  showIncorrectHighlight &&
                    "border-red-500 bg-red-50 text-red-700",
                  showResult && !isCorrect && !isSelected && "opacity-50",
                )}
              >
                <div className="flex items-center justify-center gap-2">
                  <span className="font-serif">{option.word}</span>
                  {showCorrectHighlight && <AnimatedCheckmark show size="md" />}
                  {showIncorrectHighlight && <AnimatedXMark show size="md" />}
                </div>
              </button>
            </FadeIn>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Sentence Identify Exercise
// Hear sentence → identify which word is being used
// ============================================================================
interface SentenceIdentifyExerciseProps extends ExerciseProps {}

export function SentenceIdentifyExercise({
  targetWord,
  allWords,
  onResult,
  language = "fr",
}: SentenceIdentifyExerciseProps) {
  const [options, setOptions] = useState<FoundationWord[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [startTime] = useState(Date.now());
  const { playSuccess, playError } = useSoundEffects();

  const langConfig = getLanguageConfig(language);
  const sentenceText = getExampleSentenceText(
    targetWord.exampleSentence,
    language,
  );

  // Generate options
  useEffect(() => {
    const distractors = getDistractorWords(targetWord, allWords, 3);
    const allOptions = [targetWord, ...distractors];
    const shuffled = allOptions.sort(() => Math.random() - 0.5);
    setOptions(shuffled);
  }, [targetWord, allWords]);

  // Play sentence audio
  const playAudio = useCallback(() => {
    if (isPlaying) return;

    setIsPlaying(true);

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(sentenceText);
      utterance.lang = langConfig.speechCode;
      utterance.rate = 0.75; // Slower for sentence comprehension

      const selectedVoice = getTTSVoice(language);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      utterance.onend = () => {
        setIsPlaying(false);
        setHasPlayed(true);
      };

      utterance.onerror = () => {
        setIsPlaying(false);
        setHasPlayed(true);
      };

      window.speechSynthesis.speak(utterance);
    } else {
      setIsPlaying(false);
      setHasPlayed(true);
    }
  }, [isPlaying, sentenceText, langConfig.speechCode, language]);

  // Auto-play on mount
  useEffect(() => {
    const timer = setTimeout(playAudio, 300);
    return () => clearTimeout(timer);
  }, [playAudio]);

  const handleSelect = (index: number) => {
    if (showResult) return;

    setSelectedIndex(index);
    setShowResult(true);

    const isCorrect = options[index].id === targetWord.id;
    isCorrect ? playSuccess() : playError();

    setTimeout(() => {
      onResult({
        wordId: targetWord.id,
        exerciseType: "sentence-identify",
        correct: isCorrect,
        responseTimeMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      });
    }, 1500);
  };

  return (
    <div className="flex flex-col items-center gap-6 p-4">
      {/* Prompt */}
      <FadeIn>
        <div className="text-center">
          <p className="text-muted-foreground mb-4">
            Listen to the sentence. Which word do you hear?
          </p>
          <Button
            onClick={playAudio}
            disabled={isPlaying}
            size="lg"
            variant="outline"
            className={cn(
              "gap-2 px-8 py-6 text-xl rounded-full",
              isPlaying && "animate-pulse bg-primary/10",
            )}
          >
            <Volume2
              className={cn(
                "w-8 h-8",
                isPlaying && "text-primary animate-bounce",
              )}
            />
            {isPlaying ? "Playing..." : "Play Sentence"}
          </Button>
        </div>
      </FadeIn>

      {/* Show sentence text after attempt */}
      {showResult && (
        <FadeIn>
          <Card className="p-4 bg-muted/50 max-w-md">
            <p className="text-lg font-medium text-center mb-1">
              &ldquo;{sentenceText}&rdquo;
            </p>
            <p className="text-muted-foreground text-center text-sm">
              {targetWord.exampleSentence.english}
            </p>
          </Card>
        </FadeIn>
      )}

      {/* Word Options */}
      <div className="grid grid-cols-2 gap-3 max-w-md">
        {options.map((option, index) => {
          const isSelected = selectedIndex === index;
          const isCorrect = option.id === targetWord.id;
          const showCorrectHighlight = showResult && isCorrect;
          const showIncorrectHighlight = showResult && isSelected && !isCorrect;

          return (
            <FadeIn key={option.id} delay={index * 50}>
              <button
                onClick={() => handleSelect(index)}
                disabled={showResult || !hasPlayed}
                className={cn(
                  "px-6 py-4 rounded-xl border-2 text-lg font-medium transition-all",
                  "hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20",
                  !showResult && hasPlayed && "border-border hover:bg-muted",
                  !hasPlayed && "opacity-50 cursor-not-allowed",
                  showCorrectHighlight &&
                    "border-green-500 bg-green-50 text-green-700",
                  showIncorrectHighlight &&
                    "border-red-500 bg-red-50 text-red-700",
                  showResult && !isCorrect && !isSelected && "opacity-50",
                )}
              >
                <div className="flex items-center justify-center gap-2">
                  <span className="font-serif">{option.word}</span>
                  {showCorrectHighlight && (
                    <Check className="w-5 h-5 text-green-600" />
                  )}
                  {showIncorrectHighlight && (
                    <X className="w-5 h-5 text-red-600" />
                  )}
                </div>
              </button>
            </FadeIn>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Exercise Session
// Runs through multiple exercises for a set of words
// ============================================================================
interface ExerciseSessionProps {
  words: FoundationWord[];
  allWords: FoundationWord[];
  onComplete: (results: ExerciseResult[]) => void;
  language?: SupportedLanguage;
}

export function ExerciseSession({
  words,
  allWords,
  onComplete,
  language = "fr",
}: ExerciseSessionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<ExerciseResult[]>([]);
  const [exercises, setExercises] = useState<
    Array<{
      type: FoundationExerciseType;
      word: FoundationWord;
    }>
  >([]);

  // Generate exercise sequence
  useEffect(() => {
    const exerciseSequence: Array<{
      type: FoundationExerciseType;
      word: FoundationWord;
    }> = [];

    // For each word, create exercises based on imageability
    words.forEach((word) => {
      // Audio-to-word works for ALL words (no images needed)
      exerciseSequence.push({ type: "audio-to-word", word });

      // Only use imageable words for image-based exercises
      if (word.imageability !== "low") {
        // Word-to-image (easiest - recognition)
        exerciseSequence.push({ type: "word-to-image", word });

        // Audio-to-image
        exerciseSequence.push({ type: "audio-to-image", word });

        // Image-to-word (harder - recall)
        exerciseSequence.push({ type: "image-to-word", word });
      }

      // Sentence identify (works for all words)
      exerciseSequence.push({ type: "sentence-identify", word });
    });

    // Shuffle to mix exercise types and words
    const shuffled = exerciseSequence.sort(() => Math.random() - 0.5);
    setExercises(shuffled);
  }, [words]);

  const handleResult = (result: ExerciseResult) => {
    setResults((prev) => [...prev, result]);

    if (currentIndex < exercises.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Session complete
      onComplete([...results, result]);
    }
  };

  if (exercises.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const currentExercise = exercises[currentIndex];
  const progress = ((currentIndex + 1) / exercises.length) * 100;
  const correctCount = results.filter((r) => r.correct).length;

  // Render appropriate exercise component
  const renderExercise = () => {
    const reactKey = `${currentExercise.type}-${currentExercise.word.id}-${currentIndex}`;
    const props = {
      targetWord: currentExercise.word,
      allWords,
      onResult: handleResult,
      language,
    };

    switch (currentExercise.type) {
      case "word-to-image":
        return <WordToImageExercise key={reactKey} {...props} />;
      case "audio-to-image":
        return <AudioToImageExercise key={reactKey} {...props} />;
      case "audio-to-word":
        return <AudioToWordTextExercise key={reactKey} {...props} />;
      case "image-to-word":
        return <ImageToWordExercise key={reactKey} {...props} />;
      case "sentence-identify":
        return <SentenceIdentifyExercise key={reactKey} {...props} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Progress Bar */}
      <div className="px-4 pt-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-muted-foreground">
            Exercise {currentIndex + 1} of {exercises.length}
          </p>
          <p className="text-sm font-medium">
            <span className="text-green-600">{correctCount}</span>
            <span className="text-muted-foreground">
              {" "}
              / {results.length} correct
            </span>
          </p>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Exercise Content */}
      <div className="flex-1 overflow-auto">{renderExercise()}</div>
    </div>
  );
}
