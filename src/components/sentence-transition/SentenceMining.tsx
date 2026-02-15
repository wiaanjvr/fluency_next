"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Volume2,
  Loader2,
  Check,
  X,
  ArrowRight,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  SimpleSentence,
  SentenceMiningResult,
  SentenceWord,
} from "@/types/sentence-transition";
import {
  AnimatedCheckmark,
  AnimatedXMark,
  ShakeHorizontal,
  FadeIn,
  ScaleIn,
} from "@/components/ui/animations";
import { useSoundEffects } from "@/lib/sounds";
import { getLanguageConfig, getTTSVoice } from "@/lib/languages";

// Helper to get the target language text (supports both old 'french' and new 'target' fields)
function getTargetText(sentence: SimpleSentence): string {
  return sentence.target || sentence.french || "";
}

// ============================================================================
// SENTENCE MINING EXERCISE
// Display ultra-simple sentences for comprehension
// ============================================================================

interface SentenceMiningExerciseProps {
  sentence: SimpleSentence;
  mode: "comprehension" | "word-identification" | "translation";
  onResult: (result: SentenceMiningResult) => void;
  showAudioFirst?: boolean;
  language?: string; // Optional language code (fr, de, it)
}

export function SentenceMiningExercise({
  sentence,
  mode,
  onResult,
  showAudioFirst = true,
  language = "fr",
}: SentenceMiningExerciseProps) {
  const [phase, setPhase] = useState<"audio" | "interact" | "result">(
    showAudioFirst ? "audio" : "interact",
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [startTime] = useState(Date.now());
  const { playSuccess, playError } = useSoundEffects();

  // Get language configuration for TTS
  const langConfig = getLanguageConfig(language as "fr" | "de" | "it");
  const targetText = getTargetText(sentence);

  // Play sentence audio using TTS
  const playAudio = useCallback(() => {
    if (isPlaying) return;

    setIsPlaying(true);

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(targetText);
      utterance.lang = langConfig.speechCode;
      utterance.rate = 0.75; // Slower for learners

      // Find best voice for the target language
      const selectedVoice = getTTSVoice(language as "fr" | "de" | "it");
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      utterance.onend = () => {
        setIsPlaying(false);
        if (phase === "audio") {
          setPhase("interact");
        }
      };

      utterance.onerror = () => {
        setIsPlaying(false);
        if (phase === "audio") {
          setPhase("interact");
        }
      };

      window.speechSynthesis.speak(utterance);
    } else {
      setIsPlaying(false);
      if (phase === "audio") {
        setPhase("interact");
      }
    }
  }, [isPlaying, targetText, langConfig.speechCode, language, phase]);

  // Auto-play audio on mount if audio-first mode
  useEffect(() => {
    if (showAudioFirst && phase === "audio") {
      const timer = setTimeout(playAudio, 300);
      return () => clearTimeout(timer);
    }
  }, [showAudioFirst, phase, playAudio]);

  // Report result and move forward
  const handleComplete = (correct: boolean) => {
    setIsCorrect(correct);
    setPhase("result");
    correct ? playSuccess() : playError();

    setTimeout(() => {
      onResult({
        sentenceId: sentence.id,
        exerciseMode: mode,
        correct,
        responseTimeMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        newWordLearned: sentence.newWord?.word,
      });
    }, 1500);
  };

  // Comprehension mode - user confirms understanding
  const renderComprehensionMode = () => (
    <div className="space-y-6">
      {/* French Sentence */}
      <div className="text-center">
        <FadeIn>
          <div className="mb-4">
            <Button
              onClick={playAudio}
              disabled={isPlaying}
              variant="outline"
              size="lg"
              className={cn(
                "gap-2 px-6 py-4 rounded-full",
                isPlaying && "animate-pulse bg-primary/10",
              )}
            >
              <Volume2
                className={cn(
                  "w-5 h-5",
                  isPlaying && "text-primary animate-bounce",
                )}
              />
              {isPlaying ? "Playing..." : "Listen Again"}
            </Button>
          </div>
        </FadeIn>

        <FadeIn delay={100}>
          <h2 className="text-2xl md:text-3xl font-serif text-primary mb-2">
            {targetText}
          </h2>
        </FadeIn>

        {/* Word breakdown with highlighting */}
        <FadeIn delay={200}>
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {sentence.words.map((word, index) => (
              <WordChip
                key={index}
                word={word}
                showTranslation={showTranslation}
              />
            ))}
          </div>
        </FadeIn>

        {/* Translation toggle */}
        <FadeIn delay={300}>
          <div className="mt-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTranslation(!showTranslation)}
              className="gap-2"
            >
              {showTranslation ? (
                <>
                  <EyeOff className="w-4 h-4" />
                  Hide Translation
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  Show Translation
                </>
              )}
            </Button>
          </div>
        </FadeIn>

        {showTranslation && (
          <FadeIn delay={100}>
            <p className="text-lg text-muted-foreground mt-4 italic">
              {sentence.english}
            </p>
          </FadeIn>
        )}
      </div>

      {/* New word highlight */}
      {sentence.newWord && (
        <FadeIn delay={400}>
          <Card className="border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                <span className="text-sm font-medium">✨ New Word:</span>
                <span className="font-serif text-lg">
                  {sentence.newWord.word}
                </span>
                <span className="text-sm">= {sentence.newWord.meaning}</span>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      )}

      {/* Continue button */}
      <FadeIn delay={500}>
        <div className="flex justify-center gap-4">
          <Button
            onClick={() => handleComplete(true)}
            size="lg"
            className="gap-2 min-w-[200px]"
          >
            I Understand
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </FadeIn>
    </div>
  );

  // Word identification mode - find specific word
  const renderWordIdentificationMode = () => {
    const targetWord =
      sentence.newWord ||
      sentence.words[Math.floor(Math.random() * sentence.words.length)];
    const options = generateWordOptions(targetWord.word, sentence.words);

    return (
      <div className="space-y-6">
        <FadeIn>
          <div className="text-center mb-4">
            <p className="text-muted-foreground mb-4">
              Listen and find the word that means:
            </p>
            <h3 className="text-xl font-medium text-primary">
              "{sentence.newWord?.meaning || targetWord.word}"
            </h3>
          </div>
        </FadeIn>

        {/* Audio button */}
        <FadeIn delay={100}>
          <div className="flex justify-center mb-6">
            <Button
              onClick={playAudio}
              disabled={isPlaying}
              variant="outline"
              size="lg"
              className={cn(
                "gap-2 px-6 py-4 rounded-full",
                isPlaying && "animate-pulse bg-primary/10",
              )}
            >
              <Volume2
                className={cn(
                  "w-5 h-5",
                  isPlaying && "text-primary animate-bounce",
                )}
              />
              {isPlaying ? "Playing..." : "Listen"}
            </Button>
          </div>
        </FadeIn>

        {/* Sentence display */}
        <FadeIn delay={200}>
          <p className="text-xl md:text-2xl font-serif text-center mb-6">
            {targetText}
          </p>
        </FadeIn>

        {/* Word options */}
        <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
          {options.map((option, index) => {
            const isSelected = selectedAnswer === index;
            const isTarget =
              option === (sentence.newWord?.word || targetWord.word);
            const showCorrect = phase === "result" && isTarget;
            const showIncorrect = phase === "result" && isSelected && !isTarget;

            return (
              <ScaleIn key={index} delay={index * 50}>
                <button
                  onClick={() => {
                    if (phase !== "result") {
                      setSelectedAnswer(index);
                      handleComplete(isTarget);
                    }
                  }}
                  disabled={phase === "result"}
                  className={cn(
                    "p-4 rounded-xl text-center font-serif text-lg",
                    "border-2 transition-all duration-200",
                    "hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20",
                    phase !== "result" && "border-border hover:scale-105",
                    showCorrect &&
                      "border-green-500 bg-green-50 dark:bg-green-900/20",
                    showIncorrect &&
                      "border-red-500 bg-red-50 dark:bg-red-900/20",
                  )}
                >
                  {option}
                  {showCorrect && (
                    <div className="mt-2">
                      <AnimatedCheckmark show size="sm" />
                    </div>
                  )}
                  {showIncorrect && (
                    <div className="mt-2">
                      <AnimatedXMark show size="sm" />
                    </div>
                  )}
                </button>
              </ScaleIn>
            );
          })}
        </div>
      </div>
    );
  };

  // Translation mode - match French to English
  const renderTranslationMode = () => {
    const translations = generateTranslationOptions(sentence.english);

    return (
      <div className="space-y-6">
        <FadeIn>
          <div className="text-center mb-4">
            <p className="text-muted-foreground mb-4">
              What does this sentence mean?
            </p>
          </div>
        </FadeIn>

        {/* Audio button */}
        <FadeIn delay={100}>
          <div className="flex justify-center mb-6">
            <Button
              onClick={playAudio}
              disabled={isPlaying}
              variant="outline"
              size="lg"
              className={cn(
                "gap-2 px-6 py-4 rounded-full",
                isPlaying && "animate-pulse bg-primary/10",
              )}
            >
              <Volume2
                className={cn(
                  "w-5 h-5",
                  isPlaying && "text-primary animate-bounce",
                )}
              />
              {isPlaying ? "Playing..." : "Listen"}
            </Button>
          </div>
        </FadeIn>

        {/* Target language sentence */}
        <FadeIn delay={200}>
          <h2 className="text-2xl md:text-3xl font-serif text-primary text-center mb-6">
            {targetText}
          </h2>
        </FadeIn>

        {/* Translation options */}
        <div className="space-y-3 max-w-lg mx-auto">
          {translations.map((translation, index) => {
            const isSelected = selectedAnswer === index;
            const isCorrectAnswer = translation === sentence.english;
            const showCorrect = phase === "result" && isCorrectAnswer;
            const showIncorrect =
              phase === "result" && isSelected && !isCorrectAnswer;

            return (
              <FadeIn key={index} delay={300 + index * 100}>
                <button
                  onClick={() => {
                    if (phase !== "result") {
                      setSelectedAnswer(index);
                      handleComplete(isCorrectAnswer);
                    }
                  }}
                  disabled={phase === "result"}
                  className={cn(
                    "w-full p-4 rounded-xl text-left",
                    "border-2 transition-all duration-200",
                    "hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20",
                    phase !== "result" && "border-border hover:bg-muted/50",
                    showCorrect &&
                      "border-green-500 bg-green-50 dark:bg-green-900/20",
                    showIncorrect &&
                      "border-red-500 bg-red-50 dark:bg-red-900/20",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span>{translation}</span>
                    {showCorrect && <AnimatedCheckmark show size="sm" />}
                    {showIncorrect && <AnimatedXMark show size="sm" />}
                  </div>
                </button>
              </FadeIn>
            );
          })}
        </div>
      </div>
    );
  };

  // Audio-only phase
  if (phase === "audio") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-6">
        <FadeIn>
          <p className="text-muted-foreground text-center mb-4">
            Listen to the sentence
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
            {isPlaying ? "Listening..." : "Play Audio"}
          </Button>
        </FadeIn>
      </div>
    );
  }

  return (
    <div className="p-4">
      {mode === "comprehension" && renderComprehensionMode()}
      {mode === "word-identification" && renderWordIdentificationMode()}
      {mode === "translation" && renderTranslationMode()}
    </div>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface WordChipProps {
  word: SentenceWord;
  showTranslation: boolean;
}

function WordChip({ word, showTranslation }: WordChipProps) {
  return (
    <span
      className={cn(
        "px-3 py-1.5 rounded-lg text-sm transition-all",
        word.isNew
          ? "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 font-medium"
          : "bg-muted text-muted-foreground",
      )}
    >
      {word.word}
      {showTranslation && (
        <span className="text-xs ml-1 opacity-70">({word.translation})</span>
      )}
    </span>
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateWordOptions(
  targetWord: string,
  allWords: SentenceWord[],
): string[] {
  // Get unique words excluding the target
  const otherWords = allWords
    .filter((w) => w.word !== targetWord)
    .map((w) => w.word);

  // Add some common French words as distractors
  const distractors = [
    "je",
    "tu",
    "il",
    "elle",
    "nous",
    "vous",
    "le",
    "la",
    "un",
    "une",
    "est",
    "sont",
    "fait",
  ];
  const combinedWords = [...otherWords, ...distractors];
  const available = Array.from(new Set(combinedWords))
    .filter((w) => w !== targetWord)
    .slice(0, 10);

  // Shuffle and take 3 distractors
  const shuffled = available.sort(() => Math.random() - 0.5).slice(0, 3);

  // Add target and shuffle
  return [...shuffled, targetWord].sort(() => Math.random() - 0.5);
}

function generateTranslationOptions(correctTranslation: string): string[] {
  // Some plausible incorrect translations
  const distractors = [
    "I eat an apple.",
    "She runs fast.",
    "The cat is black.",
    "He sees the man.",
    "We go to the house.",
    "They have a book.",
    "You are tall.",
    "It is beautiful.",
    "There is water.",
    "I want a friend.",
    "She speaks French.",
    "He is young.",
  ].filter((t) => t !== correctTranslation);

  // Shuffle and take 3 distractors
  const shuffled = distractors.sort(() => Math.random() - 0.5).slice(0, 3);

  // Add correct and shuffle
  return [...shuffled, correctTranslation].sort(() => Math.random() - 0.5);
}
