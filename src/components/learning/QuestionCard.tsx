"use client";

import React, { useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RisingBubbles, Splash } from "@/components/ui/ocean-animations";
import { ComprehensionQuestion } from "@/types";
import { cn } from "@/lib/utils";

interface QuestionCardProps {
  question: ComprehensionQuestion;
  onAnswer: (correct: boolean) => void;
  showFeedback?: boolean;
}

export function QuestionCard({
  question,
  onAnswer,
  showFeedback = true,
}: QuestionCardProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [showCorrectBubbles, setShowCorrectBubbles] = useState(false);

  const handleSelect = (index: number) => {
    if (hasAnswered) return;

    setSelectedAnswer(index);
    setHasAnswered(true);
    const isCorrect = index === question.correct_answer;

    // Trigger bubbles for correct answer
    if (isCorrect) {
      setShowCorrectBubbles(true);
      setTimeout(() => setShowCorrectBubbles(false), 3000);
    }

    if (showFeedback) {
      setTimeout(() => {
        onAnswer(isCorrect);
      }, 1500);
    } else {
      onAnswer(isCorrect);
    }
  };

  return (
    <>
      <RisingBubbles show={showCorrectBubbles} count={8} variant="success" />
      <Card className="transition-all duration-300 hover:shadow-lg hover:shadow-ocean-turquoise/10">
        <CardContent className="pt-6">
          <p className="text-lg font-medium mb-6">{question.question}</p>

          <div className="space-y-3">
            {question.options.map((option, index) => {
              const isSelected = selectedAnswer === index;
              const isCorrect = index === question.correct_answer;
              const showCorrect = hasAnswered && isCorrect;
              const showIncorrect = hasAnswered && isSelected && !isCorrect;

              return (
                <button
                  key={index}
                  onClick={() => handleSelect(index)}
                  disabled={hasAnswered}
                  className={cn(
                    "w-full text-left p-4 rounded-lg border-2 transition-all duration-300",
                    "hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20",
                    "hover:scale-[1.01] active:scale-[0.99]",
                    {
                      "border-green-500 bg-green-50 dark:bg-green-950/20 animate-bounce-in":
                        showCorrect,
                      "border-red-500 bg-red-50 dark:bg-red-950/20 animate-shake-gentle":
                        showIncorrect,
                      "border-muted": !isSelected && !hasAnswered,
                      "cursor-not-allowed opacity-60":
                        hasAnswered && !isSelected,
                    },
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span>{option}</span>
                    {showCorrect && (
                      <Check className="h-5 w-5 text-green-600 animate-bounce-in" />
                    )}
                    {showIncorrect && (
                      <X className="h-5 w-5 text-red-600 animate-shake-gentle" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {hasAnswered && question.explanation && (
            <div className="mt-6 p-4 bg-muted/50 rounded-lg animate-slide-down-fade">
              <p className="text-sm text-muted-foreground">
                {question.explanation}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
