"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { GrammarExercise } from "@/types/grammar.types";

interface ExerciseCardProps {
  exercise: GrammarExercise;
  onSubmit: (answer: string) => void;
  disabled?: boolean;
}

export function ExerciseCard({
  exercise,
  onSubmit,
  disabled = false,
}: ExerciseCardProps) {
  switch (exercise.type) {
    case "fill_blank":
      return (
        <FillBlankCard
          exercise={exercise}
          onSubmit={onSubmit}
          disabled={disabled}
        />
      );
    case "multiple_choice":
      return (
        <MultipleChoiceCard
          exercise={exercise}
          onSubmit={onSubmit}
          disabled={disabled}
        />
      );
    case "sentence_transform":
      return (
        <SentenceTransformCard
          exercise={exercise}
          onSubmit={onSubmit}
          disabled={disabled}
        />
      );
    case "error_correction":
      return (
        <ErrorCorrectionCard
          exercise={exercise}
          onSubmit={onSubmit}
          disabled={disabled}
        />
      );
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Fill-in-the-blank
// ---------------------------------------------------------------------------
function FillBlankCard({ exercise, onSubmit, disabled }: ExerciseCardProps) {
  const [answer, setAnswer] = useState("");

  const handleSubmit = () => {
    if (answer.trim()) onSubmit(answer.trim());
  };

  // Split prompt on ___ to render inline input
  const parts = exercise.prompt.split("___");

  return (
    <Card>
      <CardContent className="pt-6 space-y-6">
        <div className="text-sm font-medium text-ocean-turquoise uppercase tracking-wide">
          Fill in the blank
        </div>
        <div className="text-lg leading-relaxed flex items-center flex-wrap gap-1">
          {parts.map((part, i) => (
            <React.Fragment key={i}>
              <span>{part}</span>
              {i < parts.length - 1 && (
                <Input
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  placeholder="..."
                  disabled={disabled}
                  className="inline-flex w-40 h-9 text-base text-center border-b-2 border-ocean-turquoise/50 bg-ocean-turquoise/5 rounded-lg font-medium focus:border-ocean-turquoise"
                  autoFocus
                />
              )}
            </React.Fragment>
          ))}
        </div>
        <Button
          onClick={handleSubmit}
          disabled={disabled || !answer.trim()}
          className="w-full rounded-xl bg-ocean-turquoise hover:bg-ocean-turquoise-dark text-white"
        >
          Check Answer
        </Button>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Multiple choice
// ---------------------------------------------------------------------------
function MultipleChoiceCard({
  exercise,
  onSubmit,
  disabled,
}: ExerciseCardProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const labels = ["A", "B", "C", "D", "E", "F"];

  return (
    <Card>
      <CardContent className="pt-6 space-y-6">
        <div className="text-sm font-medium text-ocean-turquoise uppercase tracking-wide">
          Multiple Choice
        </div>
        <p className="text-lg">{exercise.prompt}</p>
        <div className="grid gap-3">
          {(exercise.options || []).map((opt, i) => (
            <button
              key={i}
              onClick={() => !disabled && setSelected(opt.text)}
              disabled={disabled}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all duration-200",
                selected === opt.text
                  ? "border-ocean-turquoise bg-ocean-turquoise/10"
                  : "border-border/50 hover:border-ocean-turquoise/40 hover:bg-muted/30",
                disabled && "opacity-60 cursor-not-allowed",
              )}
            >
              <span
                className={cn(
                  "w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold shrink-0",
                  selected === opt.text
                    ? "bg-ocean-turquoise text-white"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {labels[i]}
              </span>
              <span className="text-base">{opt.text}</span>
            </button>
          ))}
        </div>
        <Button
          onClick={() => selected && onSubmit(selected)}
          disabled={disabled || !selected}
          className="w-full rounded-xl bg-ocean-turquoise hover:bg-ocean-turquoise-dark text-white"
        >
          Check Answer
        </Button>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Sentence transform
// ---------------------------------------------------------------------------
function SentenceTransformCard({
  exercise,
  onSubmit,
  disabled,
}: ExerciseCardProps) {
  const [answer, setAnswer] = useState("");

  const handleSubmit = () => {
    if (answer.trim()) onSubmit(answer.trim());
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-6">
        <div className="text-sm font-medium text-ocean-turquoise uppercase tracking-wide">
          Sentence Transformation
        </div>
        <p className="text-lg">{exercise.prompt}</p>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          disabled={disabled}
          placeholder="Type your answer..."
          className={cn(
            "w-full min-h-[80px] px-4 py-3 rounded-xl border-2 border-border/50 bg-background text-base resize-none",
            "focus:outline-none focus:border-ocean-turquoise/50",
            "placeholder:text-muted-foreground/50",
          )}
          autoFocus
        />
        <Button
          onClick={handleSubmit}
          disabled={disabled || !answer.trim()}
          className="w-full rounded-xl bg-ocean-turquoise hover:bg-ocean-turquoise-dark text-white"
        >
          Check Answer
        </Button>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Error correction
// ---------------------------------------------------------------------------
function ErrorCorrectionCard({
  exercise,
  onSubmit,
  disabled,
}: ExerciseCardProps) {
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const words = exercise.prompt.split(/\s+/);

  return (
    <Card>
      <CardContent className="pt-6 space-y-6">
        <div className="text-sm font-medium text-ocean-turquoise uppercase tracking-wide">
          Error Correction
        </div>
        <p className="text-sm text-muted-foreground">
          Tap the incorrect word in the sentence:
        </p>
        <div className="flex flex-wrap gap-2 text-lg">
          {words.map((word, i) => (
            <button
              key={i}
              onClick={() => !disabled && setSelectedWord(word)}
              disabled={disabled}
              className={cn(
                "px-3 py-1.5 rounded-lg border-2 transition-all duration-200 cursor-pointer",
                selectedWord === word
                  ? "border-destructive bg-destructive/10 text-destructive font-medium"
                  : "border-transparent hover:border-ocean-turquoise/30 hover:bg-muted/30",
              )}
            >
              {word}
            </button>
          ))}
        </div>
        <Button
          onClick={() => selectedWord && onSubmit(selectedWord)}
          disabled={disabled || !selectedWord}
          className="w-full rounded-xl bg-ocean-turquoise hover:bg-ocean-turquoise-dark text-white"
        >
          Check Answer
        </Button>
      </CardContent>
    </Card>
  );
}
