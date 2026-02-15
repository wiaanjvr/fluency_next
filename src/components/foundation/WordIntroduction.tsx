"use client";

import React, { useState, useEffect } from "react";
import { Volume2, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { FoundationWord } from "@/types/foundation-vocabulary";
import {
  getImageForWord,
  getPlaceholderImage,
} from "@/lib/content/image-service";
import { FadeIn, ScaleIn } from "@/components/ui/animations";

interface WordIntroductionProps {
  word: FoundationWord;
  onComplete: () => void;
  showNavigation?: boolean;
}

/**
 * Multi-Modal Word Introduction Component
 * Displays a new word with:
 * - Visual representation (image)
 * - Audio pronunciation (TTS)
 * - Simple example sentence
 * - L1 (English) translation
 */
export function WordIntroduction({
  word,
  onComplete,
  showNavigation = true,
}: WordIntroductionProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasPlayedAudio, setHasPlayedAudio] = useState(false);

  const imageResult = getImageForWord(word.imageKeyword);

  // Play audio using Web Speech API (free, no API needed)
  const playAudio = async () => {
    if (isPlaying) return;

    setIsPlaying(true);

    // Use Web Speech API for TTS
    if ("speechSynthesis" in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(word.word);
      utterance.lang = "fr-FR";
      utterance.rate = 0.8; // Slightly slower for learning

      // Try to find a French voice
      const voices = window.speechSynthesis.getVoices();
      const frenchVoice =
        voices.find(
          (voice) =>
            voice.lang.startsWith("fr") && voice.name.includes("Google"),
        ) || voices.find((voice) => voice.lang.startsWith("fr"));

      if (frenchVoice) {
        utterance.voice = frenchVoice;
      }

      utterance.onend = () => {
        setIsPlaying(false);
        setHasPlayedAudio(true);
      };

      utterance.onerror = () => {
        setIsPlaying(false);
      };

      window.speechSynthesis.speak(utterance);
    } else {
      setIsPlaying(false);
    }
  };

  // Auto-play audio on mount (after a short delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      playAudio();
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word.id]);

  // Preload voices
  useEffect(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
    }
  }, []);

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
          <p className="text-2xl md:text-3xl font-medium text-foreground">
            {word.translation}
          </p>
        </div>
      </FadeIn>

      {/* Example Sentence Section */}
      <FadeIn delay={300}>
        <Card className="p-4 bg-muted/50 max-w-md">
          <p className="text-lg md:text-xl font-medium text-center mb-2">
            &ldquo;{word.exampleSentence.french}&rdquo;
          </p>
          <p className="text-muted-foreground text-center">
            {word.exampleSentence.english}
          </p>
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
}

/**
 * Session component that introduces multiple words
 */
export function WordIntroductionSession({
  words,
  onComplete,
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
        />
      </div>
    </div>
  );
}
