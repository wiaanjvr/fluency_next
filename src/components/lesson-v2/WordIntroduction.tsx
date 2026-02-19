"use client";

/**
 * WordIntroduction — Phase 1 Component
 *
 * For each new word:
 * 1. Display the target-language word + audio → learner shadows (repeats aloud)
 * 2. Ask learner to guess the meaning
 * 3. Reveal the correct meaning
 *
 * After all words are introduced, they're saved to the learner's known pool.
 */

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { WordIntroductionItem, WordIntroStep } from "@/types/lesson-v2";
import {
  Volume2,
  ArrowRight,
  CheckCircle2,
  Lightbulb,
  Mic,
} from "lucide-react";

interface Props {
  words: WordIntroductionItem[];
  language: string;
  onComplete: (guesses: Record<string, string>) => void;
}

export default function WordIntroduction({
  words,
  language,
  onComplete,
}: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [step, setStep] = useState<WordIntroStep>("listen-and-shadow");
  const [guess, setGuess] = useState("");
  const [guesses, setGuesses] = useState<Record<string, string>>({});
  const [hasPlayedAudio, setHasPlayedAudio] = useState(false);

  const currentWord = words[currentIndex];
  const progress = (currentIndex / words.length) * 100;
  const isLastWord = currentIndex === words.length - 1;

  const playAudio = useCallback(() => {
    if (!currentWord) return;

    // Use Web Speech API for TTS
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(currentWord.word);
      utterance.lang =
        language === "fr" ? "fr-FR" : language === "de" ? "de-DE" : "it-IT";
      utterance.rate = 0.8;
      window.speechSynthesis.speak(utterance);
    }
    setHasPlayedAudio(true);
  }, [currentWord, language]);

  const handleGuessSubmit = () => {
    if (!currentWord) return;
    setGuesses((prev) => ({ ...prev, [currentWord.word]: guess }));
    setStep("reveal-meaning");
  };

  const handleNext = () => {
    if (isLastWord) {
      // All words done — save and notify parent
      const finalGuesses = { ...guesses, [currentWord.word]: guess };
      onComplete(finalGuesses);
      return;
    }

    setCurrentIndex((i) => i + 1);
    setStep("listen-and-shadow");
    setGuess("");
    setHasPlayedAudio(false);
  };

  if (!currentWord) return null;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>
            Word {currentIndex + 1} of {words.length}
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} />
      </div>

      {/* Phase Label */}
      <div className="text-center">
        <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
          Phase 1 — Word Introduction
        </span>
      </div>

      {/* Step 1: Listen & Shadow */}
      {step === "listen-and-shadow" && (
        <Card>
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-lg text-muted-foreground">
              Listen & Repeat
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            {/* The word */}
            <div className="py-8">
              <p className="text-5xl font-bold text-primary">
                {currentWord.word}
              </p>
              <p className="text-sm text-muted-foreground mt-2 capitalize">
                {currentWord.partOfSpeech}
              </p>
            </div>

            {/* Audio button */}
            <Button
              variant="ocean"
              size="lg"
              onClick={playAudio}
              className="w-full max-w-xs mx-auto"
            >
              <Volume2 className="mr-2 h-5 w-5" />
              {hasPlayedAudio ? "Listen Again" : "Listen to Pronunciation"}
            </Button>

            {/* Shadow instruction */}
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Mic className="h-4 w-4" />
              <span>Say it aloud to shadow the pronunciation</span>
            </div>

            {/* Continue */}
            <Button
              onClick={() => setStep("guess-meaning")}
              disabled={!hasPlayedAudio}
              className="w-full"
              size="lg"
            >
              I've Shadowed It
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Guess Meaning */}
      {step === "guess-meaning" && (
        <Card>
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-lg text-muted-foreground">
              What do you think it means?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            {/* The word */}
            <div className="py-4">
              <p className="text-4xl font-bold text-primary">
                {currentWord.word}
              </p>
            </div>

            {/* Guess input */}
            <div className="space-y-3 max-w-xs mx-auto">
              <Input
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                placeholder="Type your guess in English..."
                className="text-center text-lg"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && guess.trim()) handleGuessSubmit();
                }}
                autoFocus
              />
              <Button
                onClick={handleGuessSubmit}
                disabled={!guess.trim()}
                className="w-full"
                size="lg"
              >
                <Lightbulb className="mr-2 h-4 w-4" />
                Check My Guess
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Reveal Meaning */}
      {step === "reveal-meaning" && (
        <Card>
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-lg text-muted-foreground">
              Here's the meaning
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            {/* Word + meaning */}
            <div className="py-4 space-y-3">
              <p className="text-4xl font-bold text-primary">
                {currentWord.word}
              </p>
              <div className="h-px bg-border w-20 mx-auto" />
              <p className="text-2xl font-semibold text-foreground">
                {currentWord.translation}
              </p>
            </div>

            {/* Show learner's guess */}
            {guess && (
              <div className="p-3 rounded-xl bg-muted/50 max-w-xs mx-auto">
                <p className="text-sm text-muted-foreground">Your guess:</p>
                <p className="font-medium">{guess}</p>
                {guess.toLowerCase().trim() ===
                  currentWord.translation.toLowerCase().trim() && (
                  <div className="flex items-center justify-center gap-1 text-green-600 mt-1">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm font-medium">Correct!</span>
                  </div>
                )}
              </div>
            )}

            {/* Listen again */}
            <Button variant="outline" onClick={playAudio} className="mx-auto">
              <Volume2 className="mr-2 h-4 w-4" />
              Listen Again
            </Button>

            {/* Next word */}
            <Button onClick={handleNext} className="w-full" size="lg">
              {isLastWord ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Complete Introduction
                </>
              ) : (
                <>
                  Next Word
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
