"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useExerciseSession } from "@/hooks/useExerciseSession";
import { ExerciseCard } from "./ExerciseCard";
import { FeedbackPanel } from "./FeedbackPanel";
import { ExerciseComplete } from "./ExerciseComplete";
import type { GrammarExercise } from "@/types/grammar.types";

interface ExerciseSessionProps {
  exercises: GrammarExercise[];
  lessonId: string;
  lessonTitle: string;
  languageCode: string;
  grammarTag?: string | null;
  onDone?: () => void;
}

export function ExerciseSession({
  exercises,
  lessonId,
  lessonTitle,
  languageCode,
  grammarTag,
  onDone,
}: ExerciseSessionProps) {
  const store = useExerciseSession();

  // Auto-start if idle
  React.useEffect(() => {
    if (store.state === "idle" && exercises.length > 0) {
      store.startSession(exercises, lessonId, grammarTag);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = store.currentExercise();
  const lastResult = store.lastResult();

  // Complete state
  if (store.state === "complete") {
    return (
      <ExerciseComplete
        lessonTitle={lessonTitle}
        results={store.results}
        score={store.score}
        total={store.exercises.length}
        languageCode={languageCode}
        onRetry={() => store.startSession(exercises, lessonId, grammarTag)}
      />
    );
  }

  if (!current) return null;

  const total = store.exercises.length;
  const currentNum = store.currentIndex + 1;
  const progressPercent = (store.currentIndex / total) * 100;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground font-light">
            Exercise {currentNum} of {total}
          </span>
          <span className="font-medium">
            Score: {store.score}/{store.results.length}
          </span>
        </div>
        <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-ocean-turquoise rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Difficulty indicator */}
      <div className="flex items-center gap-1">
        {[1, 2, 3].map((level) => (
          <div
            key={level}
            className={cn(
              "w-2 h-2 rounded-full",
              level <= current.difficulty
                ? "bg-ocean-turquoise"
                : "bg-muted/30",
            )}
          />
        ))}
        <span className="text-xs text-muted-foreground ml-2">
          {current.difficulty === 1
            ? "Easy"
            : current.difficulty === 2
              ? "Medium"
              : "Hard"}
        </span>
      </div>

      {/* Exercise card with animation */}
      <AnimatePresence mode="wait">
        {store.state === "in_progress" && (
          <motion.div
            key={`exercise-${store.currentIndex}`}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
          >
            <ExerciseCard
              exercise={current}
              onSubmit={(answer) => store.submitAnswer(answer)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feedback panel */}
      {store.state === "reviewing_answer" && lastResult && (
        <motion.div
          key={`feedback-${store.currentIndex}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={cn(lastResult.was_correct ? "" : "animate-shake")}
        >
          <FeedbackPanel
            show
            wasCorrect={lastResult.was_correct}
            userAnswer={lastResult.user_answer}
            exercise={current}
            onContinue={() => store.acknowledgeAndNext()}
          />
        </motion.div>
      )}
    </div>
  );
}
