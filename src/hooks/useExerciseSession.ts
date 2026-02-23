"use client";

import { create } from "zustand";
import type {
  GrammarExercise,
  ExerciseSessionState,
  ExerciseResult,
} from "@/types/grammar.types";
import {
  recordExerciseAttempt,
  markLessonComplete,
} from "@/lib/grammar/grammarApi";

interface ExerciseSessionStore {
  state: ExerciseSessionState;
  exercises: GrammarExercise[];
  currentIndex: number;
  results: ExerciseResult[];
  score: number;
  lessonId: string | null;
  grammarTag: string | null;

  // Actions
  startSession: (
    exercises: GrammarExercise[],
    lessonId: string,
    grammarTag?: string | null,
  ) => void;
  submitAnswer: (answer: string) => void;
  acknowledgeAndNext: () => void;
  reset: () => void;

  // Derived
  currentExercise: () => GrammarExercise | null;
  lastResult: () => ExerciseResult | null;
  isCorrect: () => boolean | null;
}

export const useExerciseSession = create<ExerciseSessionStore>((set, get) => ({
  state: "idle",
  exercises: [],
  currentIndex: 0,
  results: [],
  score: 0,
  lessonId: null,
  grammarTag: null,

  startSession: (exercises, lessonId, grammarTag) => {
    set({
      state: "in_progress",
      exercises,
      currentIndex: 0,
      results: [],
      score: 0,
      lessonId,
      grammarTag: grammarTag ?? null,
    });
  },

  submitAnswer: (answer: string) => {
    const { exercises, currentIndex, results, score, lessonId } = get();
    const exercise = exercises[currentIndex];
    if (!exercise) return;

    const normalizedAnswer = answer.trim().toLowerCase();
    const normalizedCorrect = exercise.correct_answer.trim().toLowerCase();
    const wasCorrect = normalizedAnswer === normalizedCorrect;

    const result: ExerciseResult = {
      exercise_id: exercise.id,
      was_correct: wasCorrect,
      user_answer: answer,
    };

    // Record to DB (fire and forget)
    // Pass word_id if the exercise has one linked, enabling KG integration
    recordExerciseAttempt(
      exercise.id,
      wasCorrect,
      answer,
      exercise.word_id ?? undefined,
    ).catch(console.error);

    set({
      state: "reviewing_answer",
      results: [...results, result],
      score: wasCorrect ? score + 1 : score,
    });
  },

  acknowledgeAndNext: () => {
    const { exercises, currentIndex, lessonId, score, results } = get();
    const nextIndex = currentIndex + 1;

    if (nextIndex >= exercises.length) {
      // Session complete — mark lesson if all done
      // Pass grammarTag so the KG can unlock grammar-gated words (#3+#4)
      const { grammarTag } = get();
      if (lessonId) {
        markLessonComplete(lessonId, grammarTag ?? undefined).catch(
          console.error,
        );
      }
      // Notify dashboard recommendation engine
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("fluensea:session-complete", {
            detail: { activityType: "grammar" },
          }),
        );
      }
      set({ state: "complete" });
    } else {
      set({
        state: "in_progress",
        currentIndex: nextIndex,
      });
    }
  },

  reset: () => {
    set({
      state: "idle",
      exercises: [],
      currentIndex: 0,
      results: [],
      score: 0,
      lessonId: null,
      grammarTag: null,
    });
  },

  currentExercise: () => {
    const { exercises, currentIndex } = get();
    return exercises[currentIndex] || null;
  },

  lastResult: () => {
    const { results } = get();
    return results.length > 0 ? results[results.length - 1] : null;
  },

  isCorrect: () => {
    const { results } = get();
    if (results.length === 0) return null;
    return results[results.length - 1].was_correct;
  },
}));
