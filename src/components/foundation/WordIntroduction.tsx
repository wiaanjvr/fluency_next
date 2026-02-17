"use client";

import React, { useState, useEffect, useRef } from "react";
import { Volume2, ChevronRight, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { FoundationWord } from "@/types/foundation-vocabulary";
import {
  getImageForWord,
  getPlaceholderImage,
} from "@/lib/content/image-service";
import { FadeIn, ScaleIn } from "@/components/ui/animations";
import { getLanguageConfig, type SupportedLanguage } from "@/lib/languages";

// Helper to get target text from exampleSentence
function getExampleSentenceText(exampleSentence: {
  french?: string;
  target?: string;
}): string {
  return exampleSentence.target || exampleSentence.french || "";
}

interface WordIntroductionProps {
  word: FoundationWord;
  onComplete: () => void;
  showNavigation?: boolean;
  language?: SupportedLanguage;
}

/**
 * Multi-Modal Word Introduction Component
 * Displays a new word with:
 * - Visual representation (image)
 * - Audio pronunciation (pre-generated OpenAI TTS)
 * - Simple example sentence
 * - L1 (English) translation
 */
export function WordIntroduction({
  word,
  onComplete,
  showNavigation = true,
  language = "fr",
}: WordIntroductionProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasPlayedAudio, setHasPlayedAudio] = useState(false);
  const [showEnglish, setShowEnglish] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const imageResult = getImageForWord(word.imageKeyword);
  const langConfig = getLanguageConfig(language);

  // Play audio using pre-generated audio file
  const playAudio = async () => {
    if (isPlaying || !word.audioUrl) return;

    setIsPlaying(true);

    try {
      // Create or reuse audio element
      if (!audioRef.current) {
        audioRef.current = new Audio(word.audioUrl);
      } else {
        audioRef.current.src = word.audioUrl;
      }

      audioRef.current.onended = () => {
        setIsPlaying(false);
        setHasPlayedAudio(true);
      };

      audioRef.current.onerror = () => {
        console.error("Error playing audio:", word.audioUrl);
        setIsPlaying(false);
      };

      await audioRef.current.play();
    } catch (error) {
      console.error("Error playing audio:", error);
      setIsPlaying(false);
    }
  };

  // Auto-play audio on mount (after a short delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      playAudio();
    }, 500);

    return () => {
      clearTimeout(timer);
      // Cleanup audio on unmount
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word.id]);

  return (
    <div className="flex flex-col items-center gap-6 p-6">
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
            </a>{" "}
            on{" "}
            <a
              href={imageResult.attribution.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              {imageResult.attribution.source}
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
              onClick={playAudio}
              disabled={isPlaying}
              className={cn(
                "rounded-full transition-all",
                isPlaying && "animate-pulse bg-primary/10",
              )}
            >
              <Volume2 className={cn("w-6 h-6", isPlaying && "text-primary")} />
            </Button>
          </div>

          {/* Phonetic (if available) */}
          {word.phonetic && (
            <p className="text-muted-foreground text-lg">[{word.phonetic}]</p>
          )}

          {/* Part of Speech Badge */}
          <span className="px-3 py-1 bg-secondary text-secondary-foreground text-sm rounded-full capitalize">
            {word.category}
          </span>
        </div>
      </FadeIn>

      {/* Translation Section */}
      <FadeIn delay={200}>
        <div className="text-center">
          {showEnglish ? (
            <p className="text-2xl md:text-3xl font-medium text-foreground">
              {word.translation}
            </p>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEnglish(true)}
              className="gap-2"
            >
              <Eye className="w-4 h-4" />
              Show Translation
            </Button>
          )}
        </div>
      </FadeIn>

      {/* Example Sentence Section */}
      <FadeIn delay={300}>
        <Card className="p-4 bg-muted/50 max-w-md">
          <p className="text-lg md:text-xl font-medium text-center mb-2">
            &ldquo;{getExampleSentenceText(word.exampleSentence)}&rdquo;
          </p>
          {showEnglish ? (
            <p className="text-muted-foreground text-center">
              {word.exampleSentence.english}
            </p>
          ) : (
            <div className="flex justify-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowEnglish(true)}
                className="gap-2 text-xs"
              >
                <Eye className="w-3 h-3" />
                Show English
              </Button>
            </div>
          )}
        </Card>
      </FadeIn>

      {/* Continue Button */}
      {showNavigation && (
        <FadeIn delay={400}>
          <Button
            onClick={onComplete}
            size="lg"
            className="mt-4 gap-2"
            disabled={!hasPlayedAudio && isPlaying}
          >
            Continue
            <ChevronRight className="w-5 h-5" />
          </Button>
        </FadeIn>
      )}
    </div>
  );
}

interface WordIntroductionSessionProps {
  words: FoundationWord[];
  onComplete: (wordsLearned: FoundationWord[]) => void;
  language?: SupportedLanguage;
}

/**
 * Session component that introduces multiple words
 */
export function WordIntroductionSession({
  words,
  onComplete,
  language = "fr",
}: WordIntroductionSessionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [learnedWords, setLearnedWords] = useState<FoundationWord[]>([]);

  const currentWord = words[currentIndex];
  const progress = ((currentIndex + 1) / words.length) * 100;

  const handleWordComplete = () => {
    setLearnedWords((prev) => [...prev, currentWord]);

    if (currentIndex < words.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Session complete
      onComplete([...learnedWords, currentWord]);
    }
  };

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

      {/* Word Introduction */}
      <div className="flex-1 overflow-auto">
        <WordIntroduction
          key={currentWord.id}
          word={currentWord}
          onComplete={handleWordComplete}
          language={language}
        />
      </div>
    </div>
  );
}
