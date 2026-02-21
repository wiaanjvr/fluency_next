"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import type { GrammarExercise } from "@/types/grammar.types";

interface FeedbackPanelProps {
  show: boolean;
  wasCorrect: boolean;
  userAnswer: string;
  exercise: GrammarExercise;
  onContinue: () => void;
}

export function FeedbackPanel({
  show,
  wasCorrect,
  userAnswer,
  exercise,
  onContinue,
}: FeedbackPanelProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className={cn(
            "rounded-2xl border-2 p-6 space-y-4",
            wasCorrect
              ? "border-feedback-success/40 bg-feedback-success/5"
              : "border-feedback-error/40 bg-feedback-error/5",
          )}
        >
          {/* Header */}
          <div className="flex items-center gap-3">
            {wasCorrect ? (
              <>
                <div className="w-10 h-10 rounded-full bg-feedback-success flex items-center justify-center">
                  <span className="text-white text-lg">✓</span>
                </div>
                <div>
                  <p className="font-semibold text-feedback-success">
                    Correct!
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Great work — keep it up!
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-10 h-10 rounded-full bg-feedback-error flex items-center justify-center">
                  <X className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-feedback-error">Incorrect</p>
                  <p className="text-sm text-muted-foreground">
                    Don&apos;t worry — learning from mistakes is key.
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Answer comparison (wrong answers only) */}
          {!wasCorrect && (
            <div className="space-y-3 pl-[52px]">
              <div className="flex items-start gap-2">
                <span className="text-sm text-muted-foreground shrink-0 w-24">
                  Your answer:
                </span>
                <span className="text-sm line-through text-feedback-error">
                  {userAnswer}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-sm text-muted-foreground shrink-0 w-24">
                  Correct answer:
                </span>
                <mark className="text-sm bg-[#F4A261]/30 text-foreground px-1.5 py-0.5 rounded font-semibold">
                  {exercise.correct_answer}
                </mark>
              </div>
            </div>
          )}

          {/* Explanation */}
          <div
            className={cn(
              "rounded-xl p-4",
              wasCorrect ? "bg-feedback-success/10" : "bg-feedback-error/10",
            )}
          >
            <p className="text-sm font-medium mb-1">
              {wasCorrect ? "Why this is correct:" : "Explanation:"}
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {exercise.explanation}
            </p>
          </div>

          {/* Continue button */}
          <Button
            onClick={onContinue}
            className={cn(
              "w-full rounded-xl text-white",
              wasCorrect
                ? "bg-feedback-success hover:bg-feedback-success-dark"
                : "bg-feedback-error hover:bg-feedback-error-dark",
            )}
          >
            Continue
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
