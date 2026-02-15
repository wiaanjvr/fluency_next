"use client";

import React, { useState, useCallback } from "react";
import { Volume2, ArrowRight, Lightbulb, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  SentencePattern,
  PatternExample,
  PatternColorScheme,
  PatternRecognitionResult,
  HighlightedPart,
} from "@/types/sentence-transition";
import {
  AnimatedCheckmark,
  AnimatedXMark,
  FadeIn,
  ScaleIn,
} from "@/components/ui/animations";
import { useSoundEffects } from "@/lib/sounds";
import { PATTERN_COLORS } from "@/data/sentence-patterns";
import {
  getLanguageConfig,
  getTTSVoice,
  type SupportedLanguage,
} from "@/lib/languages";

// Helper to get target text from PatternExample
function getExampleText(example: PatternExample): string {
  return example.target || example.french || "";
}

// ============================================================================
// PATTERN RECOGNITION EXERCISE
// Shows 3-5 sentences with same structure, user intuits grammar
// ============================================================================

interface PatternRecognitionExerciseProps {
  pattern: SentencePattern;
  mode: "observe" | "complete" | "generate";
  onResult: (result: PatternRecognitionResult) => void;
  language?: SupportedLanguage;
  // For complete mode
  incompleteSentence?: {
    french?: string;
    target?: string;
    missingPart: HighlightedPart;
    options: string[];
    correctIndex: number;
  };
}

export function PatternRecognitionExercise({
  pattern,
  mode,
  onResult,
  incompleteSentence,
  language = "fr",
}: PatternRecognitionExerciseProps) {
  const [currentExampleIndex, setCurrentExampleIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [observedCount, setObservedCount] = useState(0);
  const [startTime] = useState(Date.now());
  const { playSuccess, playError, playAchieve } = useSoundEffects();

  const langConfig = getLanguageConfig(language);

  // Play example audio using TTS
  const playAudio = useCallback(
    (text: string) => {
      if (isPlaying) return;

      setIsPlaying(true);

      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = langConfig.speechCode;
        utterance.rate = 0.75;

        const selectedVoice = getTTSVoice(language);
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }

        utterance.onend = () => setIsPlaying(false);
        utterance.onerror = () => setIsPlaying(false);

        window.speechSynthesis.speak(utterance);
      } else {
        setIsPlaying(false);
      }
    },
    [isPlaying, langConfig.speechCode, language],
  );

  // Handle moving to next example
  const handleNextExample = () => {
    if (currentExampleIndex < pattern.examples.length - 1) {
      setCurrentExampleIndex(currentExampleIndex + 1);
      setObservedCount(observedCount + 1);
    }
  };

  // Handle completing observe mode
  const handleObserveComplete = () => {
    playAchieve();
    onResult({
      patternId: pattern.id,
      exerciseMode: "observe",
      correct: true, // Observation always "passes"
      responseTimeMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });
  };

  // Handle answer selection in complete mode
  const handleSelectAnswer = (index: number) => {
    if (showResult || !incompleteSentence) return;

    setSelectedAnswer(index);
    setShowResult(true);

    const isCorrect = index === incompleteSentence.correctIndex;
    isCorrect ? playSuccess() : playError();

    setTimeout(() => {
      onResult({
        patternId: pattern.id,
        exerciseMode: "complete",
        correct: isCorrect,
        responseTimeMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      });
    }, 1500);
  };

  // Render OBSERVE mode - show examples with color-coded structure
  const renderObserveMode = () => {
    const currentExample = pattern.examples[currentExampleIndex];
    const isLastExample = currentExampleIndex === pattern.examples.length - 1;
    const hasSeenAll = currentExampleIndex >= pattern.examples.length - 1;

    return (
      <div className="space-y-6">
        {/* Pattern header */}
        <FadeIn>
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              <span className="text-sm font-medium text-muted-foreground">
                Pattern: {pattern.name}
              </span>
            </div>
            <p className="text-muted-foreground">
              Notice how these sentences follow the same structure
            </p>
          </div>
        </FadeIn>

        {/* Color legend */}
        <FadeIn delay={100}>
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {pattern.structureColors.map((color, index) => (
              <span
                key={index}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium",
                  color.color,
                )}
              >
                {color.label}
              </span>
            ))}
          </div>
        </FadeIn>

        {/* Progress indicator */}
        <div className="flex justify-center gap-2 mb-4">
          {pattern.examples.map((_, index) => (
            <div
              key={index}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                index <= currentExampleIndex ? "bg-primary" : "bg-muted",
              )}
            />
          ))}
        </div>

        {/* Current example */}
        <FadeIn key={currentExample.id}>
          <Card className="max-w-lg mx-auto">
            <CardContent className="pt-6">
              {/* Audio button */}
              <div className="flex justify-end mb-4">
                <Button
                  onClick={() => playAudio(getExampleText(currentExample))}
                  disabled={isPlaying}
                  variant="ghost"
                  size="sm"
                  className="gap-2"
                >
                  <Volume2
                    className={cn(
                      "w-4 h-4",
                      isPlaying && "text-primary animate-bounce",
                    )}
                  />
                </Button>
              </div>

              {/* Highlighted sentence */}
              <div className="text-center mb-4">
                <p className="text-xl md:text-2xl font-serif leading-relaxed">
                  <HighlightedSentence
                    text={getExampleText(currentExample)}
                    highlights={currentExample.highlightedParts}
                    structureColors={pattern.structureColors}
                  />
                </p>
              </div>

              {/* English translation */}
              <p className="text-center text-muted-foreground italic">
                {currentExample.english}
              </p>
            </CardContent>
          </Card>
        </FadeIn>

        {/* Navigation */}
        <FadeIn delay={200}>
          <div className="flex justify-center gap-4 mt-6">
            {!isLastExample ? (
              <Button onClick={handleNextExample} size="lg" className="gap-2">
                Next Example
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={handleObserveComplete}
                size="lg"
                className="gap-2 bg-green-600 hover:bg-green-700"
              >
                I See the Pattern
                <Check className="w-4 h-4" />
              </Button>
            )}
          </div>
        </FadeIn>

        {/* Pattern hint */}
        {hasSeenAll && (
          <FadeIn delay={300}>
            <Card className="max-w-lg mx-auto mt-6 border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <Lightbulb className="w-5 h-5 text-amber-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-700 dark:text-amber-300">
                      Pattern Template
                    </p>
                    <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                      {pattern.template}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </FadeIn>
        )}
      </div>
    );
  };

  // Render COMPLETE mode - fill in the blank
  const renderCompleteMode = () => {
    if (!incompleteSentence) return null;

    return (
      <div className="space-y-6">
        <FadeIn>
          <div className="text-center mb-6">
            <p className="text-muted-foreground">
              Complete the sentence following the pattern:
            </p>
            <p className="text-sm text-primary mt-1">{pattern.name}</p>
          </div>
        </FadeIn>

        {/* Incomplete sentence with blank */}
        <FadeIn delay={100}>
          <Card className="max-w-lg mx-auto">
            <CardContent className="pt-6">
              <div className="text-center mb-6">
                <p className="text-xl md:text-2xl font-serif">
                  <IncompleteSentence
                    text={
                      incompleteSentence.target ||
                      incompleteSentence.french ||
                      ""
                    }
                    missingPart={incompleteSentence.missingPart}
                    selectedOption={
                      selectedAnswer !== null
                        ? incompleteSentence.options[selectedAnswer]
                        : undefined
                    }
                    showResult={showResult}
                    isCorrect={
                      selectedAnswer === incompleteSentence.correctIndex
                    }
                  />
                </p>
              </div>

              {/* Options */}
              <div className="grid grid-cols-2 gap-3">
                {incompleteSentence.options.map((option, index) => {
                  const isSelected = selectedAnswer === index;
                  const isCorrectAnswer =
                    index === incompleteSentence.correctIndex;
                  const showCorrect = showResult && isCorrectAnswer;
                  const showIncorrect =
                    showResult && isSelected && !isCorrectAnswer;

                  return (
                    <ScaleIn key={index} delay={index * 50}>
                      <button
                        onClick={() => handleSelectAnswer(index)}
                        disabled={showResult}
                        className={cn(
                          "p-4 rounded-xl text-center font-serif text-lg",
                          "border-2 transition-all duration-200",
                          "hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20",
                          !showResult && "border-border hover:scale-105",
                          showCorrect &&
                            "border-green-500 bg-green-50 dark:bg-green-900/20",
                          showIncorrect &&
                            "border-red-500 bg-red-50 dark:bg-red-900/20",
                        )}
                      >
                        {option}
                        {showCorrect && (
                          <div className="mt-2 flex justify-center">
                            <AnimatedCheckmark show size="sm" />
                          </div>
                        )}
                        {showIncorrect && (
                          <div className="mt-2 flex justify-center">
                            <AnimatedXMark show size="sm" />
                          </div>
                        )}
                      </button>
                    </ScaleIn>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </FadeIn>

        {/* Show pattern examples for reference */}
        <FadeIn delay={200}>
          <div className="max-w-lg mx-auto">
            <p className="text-sm text-muted-foreground text-center mb-3">
              Reference examples:
            </p>
            <div className="space-y-2">
              {pattern.examples.slice(0, 2).map((example) => (
                <p
                  key={example.id}
                  className="text-sm text-muted-foreground text-center italic"
                >
                  {getExampleText(example)} = {example.english}
                </p>
              ))}
            </div>
          </div>
        </FadeIn>
      </div>
    );
  };

  // Render appropriate mode
  return (
    <div className="p-4">
      {mode === "observe" && renderObserveMode()}
      {mode === "complete" && renderCompleteMode()}
      {mode === "generate" && (
        <div className="text-center text-muted-foreground">
          Generate mode coming soon...
        </div>
      )}
    </div>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface HighlightedSentenceProps {
  text: string;
  highlights: HighlightedPart[];
  structureColors: PatternColorScheme[];
}

function HighlightedSentence({
  text,
  highlights,
  structureColors,
}: HighlightedSentenceProps) {
  // Sort highlights by start index
  const sortedHighlights = [...highlights].sort(
    (a, b) => a.startIndex - b.startIndex,
  );

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  sortedHighlights.forEach((highlight, index) => {
    // Add non-highlighted text before this highlight
    if (highlight.startIndex > lastIndex) {
      parts.push(
        <span key={`text-${index}`}>
          {text.slice(lastIndex, highlight.startIndex)}
        </span>,
      );
    }

    // Find the color for this part type
    const colorScheme =
      structureColors.find((c) => c.partOfSpeech === highlight.type) ||
      PATTERN_COLORS[highlight.type];

    // Add highlighted part
    parts.push(
      <span
        key={`highlight-${index}`}
        className={cn(
          "px-1.5 py-0.5 rounded mx-0.5",
          colorScheme?.color || "bg-muted",
        )}
      >
        {highlight.text}
      </span>,
    );

    lastIndex = highlight.endIndex;
  });

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(<span key="text-end">{text.slice(lastIndex)}</span>);
  }

  return <>{parts}</>;
}

interface IncompleteSentenceProps {
  text: string;
  missingPart: HighlightedPart;
  selectedOption?: string;
  showResult: boolean;
  isCorrect: boolean;
}

function IncompleteSentence({
  text,
  missingPart,
  selectedOption,
  showResult,
  isCorrect,
}: IncompleteSentenceProps) {
  const before = text.slice(0, missingPart.startIndex);
  const after = text.slice(missingPart.endIndex);

  return (
    <>
      {before}
      <span
        className={cn(
          "px-4 py-1 mx-1 rounded-lg inline-block min-w-[80px] text-center",
          !selectedOption &&
            "bg-muted border-2 border-dashed border-primary/30",
          selectedOption && !showResult && "bg-primary/20",
          showResult && isCorrect && "bg-green-100 dark:bg-green-900/30",
          showResult && !isCorrect && "bg-red-100 dark:bg-red-900/30",
        )}
      >
        {selectedOption || "_____"}
      </span>
      {after}
    </>
  );
}
