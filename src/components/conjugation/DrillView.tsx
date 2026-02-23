"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useConjugationStore } from "@/lib/store/conjugationStore";
import { generateHint } from "@/lib/conjugation/questionEngine";
import { getTenseLabel } from "@/lib/conjugation/languageConfig";
import { AccentToolbar } from "./AccentToolbar";
import { RuleExplanationCard } from "./RuleExplanationCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  Check,
  X,
  Lightbulb,
  SkipForward,
  Pause,
  Play,
  RotateCcw,
  Square,
  ChevronRight,
} from "lucide-react";
import type { Language } from "@/types/conjugation";

export function DrillView() {
  const config = useConjugationStore((s) => s.config);
  const queue = useConjugationStore((s) => s.queue);
  const currentIndex = useConjugationStore((s) => s.currentIndex);
  const phase = useConjugationStore((s) => s.phase);
  const currentHintLevel = useConjugationStore((s) => s.currentHintLevel);
  const lastAnswerCorrect = useConjugationStore((s) => s.lastAnswerCorrect);
  const lastCorrectForm = useConjugationStore((s) => s.lastCorrectForm);
  const lastUserAnswer = useConjugationStore((s) => s.lastUserAnswer);
  const lastRuleExplanation = useConjugationStore((s) => s.lastRuleExplanation);
  const answers = useConjugationStore((s) => s.answers);
  const remainingSeconds = useConjugationStore((s) => s.remainingSeconds);

  const submitAnswer = useConjugationStore((s) => s.submitAnswer);
  const advanceToNext = useConjugationStore((s) => s.advanceToNext);
  const requestHint = useConjugationStore((s) => s.requestHint);
  const skipQuestion = useConjugationStore((s) => s.skipQuestion);
  const finishSession = useConjugationStore((s) => s.finishSession);
  const resetSession = useConjugationStore((s) => s.resetSession);
  const setRemainingSeconds = useConjugationStore((s) => s.setRemainingSeconds);

  const [userInput, setUserInput] = useState("");
  const [showPauseMenu, setShowPauseMenu] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);

  const language = (config?.language ?? "de") as Language;
  const question = queue[currentIndex];
  const isFeedback = phase === "feedback";
  const progressPercent =
    queue.length > 0
      ? ((currentIndex + (isFeedback ? 1 : 0)) / queue.length) * 100
      : 0;

  // ---- Timer using requestAnimationFrame ----
  const tick = useCallback(
    (timestamp: number) => {
      if (lastTimestampRef.current === null) {
        lastTimestampRef.current = timestamp;
      }

      const elapsed = (timestamp - lastTimestampRef.current) / 1000;
      if (elapsed >= 1) {
        lastTimestampRef.current = timestamp;
        const currentRemaining =
          useConjugationStore.getState().remainingSeconds;
        if (currentRemaining !== null && currentRemaining > 0) {
          setRemainingSeconds(currentRemaining - 1);
        }
      }

      const currentPhase = useConjugationStore.getState().phase;
      if (currentPhase === "drilling" || currentPhase === "feedback") {
        timerRef.current = requestAnimationFrame(tick);
      }
    },
    [setRemainingSeconds],
  );

  useEffect(() => {
    if (config?.timed && remainingSeconds !== null && remainingSeconds > 0) {
      lastTimestampRef.current = null;
      timerRef.current = requestAnimationFrame(tick);
      return () => {
        if (timerRef.current !== null) cancelAnimationFrame(timerRef.current);
      };
    }
  }, [config?.timed, tick]);

  // ---- Auto-focus input on each new question ----
  useEffect(() => {
    if (phase === "drilling") {
      setUserInput("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [phase, currentIndex]);

  // ---- Auto-advance after correct answer (no hint) ----
  useEffect(() => {
    if (isFeedback && lastAnswerCorrect && currentHintLevel === 0) {
      autoAdvanceRef.current = setTimeout(() => {
        advanceToNext();
      }, 1500);

      return () => {
        if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
      };
    }
  }, [isFeedback, lastAnswerCorrect, currentHintLevel, advanceToNext]);

  // ---- Cancel auto-advance on any keypress ----
  useEffect(() => {
    if (!isFeedback) return;

    const handleKey = () => {
      if (autoAdvanceRef.current) {
        clearTimeout(autoAdvanceRef.current);
        autoAdvanceRef.current = null;
      }
    };

    window.addEventListener("keydown", handleKey, { once: true });
    return () => window.removeEventListener("keydown", handleKey);
  }, [isFeedback]);

  // ---- Keyboard shortcuts ----
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showPauseMenu) return;

      if (e.key === "Escape") {
        e.preventDefault();
        setShowPauseMenu(true);
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        if (isFeedback) {
          if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
          advanceToNext();
        } else if (phase === "drilling" && userInput.trim()) {
          submitAnswer(userInput);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isFeedback,
    phase,
    userInput,
    submitAnswer,
    advanceToNext,
    showPauseMenu,
  ]);

  // ---- Insert accent at cursor position ----
  const handleAccentInsert = useCallback(
    (char: string) => {
      const input = inputRef.current;
      if (!input) return;

      const start = input.selectionStart ?? userInput.length;
      const end = input.selectionEnd ?? userInput.length;
      const newValue = userInput.slice(0, start) + char + userInput.slice(end);
      setUserInput(newValue);

      // Restore cursor after React re-render
      requestAnimationFrame(() => {
        input.focus();
        input.setSelectionRange(start + char.length, start + char.length);
      });
    },
    [userInput],
  );

  // ---- Format timer ----
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const timerColor =
    remainingSeconds !== null && remainingSeconds <= 20
      ? "text-red-400"
      : remainingSeconds !== null && remainingSeconds <= 60
        ? "text-amber-400"
        : "text-muted-foreground";

  if (!question && !isFeedback) {
    return null;
  }

  const correctSoFar = answers.filter((a) => a.isCorrect).length;

  return (
    <div className="space-y-6">
      {/* ---- Progress bar + timer ---- */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Progress value={progressPercent} className="h-2" />
        </div>
        <span className="text-xs text-muted-foreground font-light tabular-nums">
          {currentIndex + (isFeedback ? 1 : 0)}/{queue.length}
        </span>
        {config?.timed && remainingSeconds !== null && (
          <span className={cn("text-sm font-mono tabular-nums", timerColor)}>
            {formatTime(remainingSeconds)}
          </span>
        )}
      </div>

      {/* ---- Verb display card ---- */}
      {question && (
        <div
          className={cn(
            "rounded-3xl border-[1.5px] bg-white/[0.02] p-8 text-center",
            "transition-all duration-300",
            isFeedback && lastAnswerCorrect
              ? "border-ocean-turquoise/40 bg-ocean-turquoise/5"
              : isFeedback && !lastAnswerCorrect
                ? "border-red-500/30 bg-red-500/5"
                : "border-white/5",
          )}
        >
          {/* Tense & mood badges */}
          <div className="mb-4 flex items-center justify-center gap-2">
            <Badge variant="outline" className="text-xs">
              {getTenseLabel(language, question.tense)}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {question.mood}
            </Badge>
          </div>

          {/* Infinitive */}
          <p className="text-3xl font-light text-foreground mb-1">
            {question.infinitive}
          </p>
          <p className="text-sm text-muted-foreground font-light mb-8">
            &ldquo;{question.englishMeaning}&rdquo;
          </p>

          {/* Pronoun + input field */}
          <div className="flex items-center justify-center gap-4">
            <span className="text-xl font-light text-ocean-turquoise min-w-[5rem] text-right">
              {question.pronoun}
            </span>

            {!isFeedback ? (
              <input
                ref={inputRef}
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                placeholder="Type conjugation…"
                className={cn(
                  "w-52 rounded-2xl border-[1.5px] border-white/10 bg-white/[0.03]",
                  "px-4 py-3 text-lg font-light text-foreground text-center",
                  "placeholder:text-white/20",
                  "transition-all duration-200",
                  "focus:border-ocean-turquoise focus:outline-none",
                  "focus:shadow-[0_0_0_4px_rgba(42,169,160,0.15)]",
                )}
              />
            ) : (
              <div className="w-52 text-center">
                {lastAnswerCorrect ? (
                  <span className="text-lg font-light text-ocean-turquoise">
                    {lastCorrectForm}
                  </span>
                ) : (
                  <div className="space-y-1">
                    <span className="text-lg font-light text-red-400 line-through">
                      {lastUserAnswer}
                    </span>
                    <p className="text-lg font-light text-ocean-turquoise">
                      {lastCorrectForm}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Hint display */}
          {!isFeedback && currentHintLevel > 0 && (
            <p className="mt-4 text-sm text-amber-400/80 font-mono tracking-wider">
              {generateHint(question.correctForm, currentHintLevel)}
            </p>
          )}
        </div>
      )}

      {/* ---- Accent toolbar ---- */}
      {!isFeedback && (
        <AccentToolbar language={language} onInsert={handleAccentInsert} />
      )}

      {/* ---- Action row ---- */}
      {!isFeedback ? (
        <div className="flex items-center gap-3">
          <Button
            variant="accent"
            size="lg"
            className="flex-1"
            disabled={!userInput.trim()}
            onClick={() => submitAnswer(userInput)}
          >
            <Check className="mr-2 h-4 w-4" />
            Check
          </Button>
          <Button
            variant="ghost"
            size="lg"
            onClick={requestHint}
            disabled={currentHintLevel >= 2}
          >
            <Lightbulb className="mr-2 h-4 w-4" />
            Hint
            {currentHintLevel > 0 && (
              <span className="ml-1.5 text-xs text-amber-400">
                {currentHintLevel}/2
              </span>
            )}
          </Button>
          <Button
            variant="ghost"
            size="lg"
            className="text-muted-foreground"
            onClick={skipQuestion}
          >
            <SkipForward className="mr-2 h-4 w-4" />
            Skip
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Feedback icons */}
          <div className="flex items-center justify-center gap-2">
            {lastAnswerCorrect ? (
              <div className="flex items-center gap-2 text-ocean-turquoise">
                <Check className="h-5 w-5" />
                <span className="text-sm font-light">Correct!</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-400">
                <X className="h-5 w-5" />
                <span className="text-sm font-light">Not quite</span>
              </div>
            )}
          </div>

          {/* Rule explanation */}
          {lastRuleExplanation && (
            <RuleExplanationCard
              explanation={lastRuleExplanation}
              defaultExpanded={!lastAnswerCorrect}
            />
          )}

          {/* Next button */}
          <Button
            variant="accent"
            size="lg"
            className="w-full"
            onClick={() => {
              if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
              advanceToNext();
            }}
          >
            Next
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}

      {/* ---- Score ticker ---- */}
      <div className="flex justify-center">
        <span className="text-xs text-muted-foreground font-light tabular-nums">
          {correctSoFar} correct · {answers.length - correctSoFar} wrong
        </span>
      </div>

      {/* ---- Pause menu overlay ---- */}
      {showPauseMenu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div
            className={cn(
              "w-full max-w-sm rounded-3xl border-[1.5px] border-white/10",
              "bg-[var(--midnight)] p-8 space-y-6",
            )}
          >
            <h2 className="text-xl font-light text-center text-foreground">
              Session Paused
            </h2>
            <p className="text-center text-sm text-muted-foreground font-light">
              {correctSoFar}/{answers.length + (isFeedback ? 0 : 0)} correct so
              far
            </p>
            <div className="space-y-3">
              <Button
                variant="accent"
                size="lg"
                className="w-full"
                onClick={() => {
                  setShowPauseMenu(false);
                  inputRef.current?.focus();
                }}
              >
                <Play className="mr-2 h-4 w-4" />
                Resume
              </Button>
              <Button
                variant="ghost"
                size="lg"
                className="w-full"
                onClick={() => {
                  setShowPauseMenu(false);
                  resetSession();
                }}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Restart
              </Button>
              <Button
                variant="ghost"
                size="lg"
                className="w-full text-red-400 hover:text-red-300"
                onClick={() => {
                  setShowPauseMenu(false);
                  finishSession();
                }}
              >
                <Square className="mr-2 h-4 w-4" />
                End Session
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
