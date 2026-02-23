// ==========================================================================
// Verb Conjugation Drill — Zustand Store
// ==========================================================================

import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";
import {
  buildQuestionQueue,
  validateAnswer,
  computeSessionResult,
} from "@/lib/conjugation/questionEngine";
import { useKnowledgeStore } from "@/lib/store/knowledgeStore";
import type {
  ConjugationVerb,
  ConjugationForm,
  ConjugationProgress,
  DrillAnswer,
  DrillPhase,
  DrillQuestion,
  Language,
  SessionConfig,
  SessionResult,
} from "@/types/conjugation";

interface ConjugationState {
  // ---- Config ----
  config: SessionConfig | null;

  // ---- Data ----
  verbs: ConjugationVerb[];
  forms: ConjugationForm[];

  // ---- Session ----
  queue: DrillQuestion[];
  currentIndex: number;
  answers: DrillAnswer[];
  sessionStartTime: number | null;
  questionStartTime: number | null;
  phase: DrillPhase;
  currentHintLevel: 0 | 1 | 2;
  lastAnswerCorrect: boolean | null;
  lastCorrectForm: string | null;
  lastUserAnswer: string | null;
  lastRuleExplanation: string | null;

  // ---- Results ----
  sessionResult: SessionResult | null;

  // ---- Timer ----
  remainingSeconds: number | null;

  // ---- UI ----
  isLoading: boolean;
  error: string | null;

  // ---- Actions ----
  loadVerbs: (language: Language) => Promise<void>;
  setConfig: (config: SessionConfig) => void;
  startSession: (config: SessionConfig) => Promise<void>;
  submitAnswer: (userAnswer: string) => void;
  advanceToNext: () => void;
  requestHint: () => void;
  skipQuestion: () => void;
  finishSession: () => Promise<void>;
  resetSession: () => void;
  setRemainingSeconds: (seconds: number) => void;
  setPhase: (phase: DrillPhase) => void;
}

const initialState = {
  config: null,
  verbs: [],
  forms: [],
  queue: [],
  currentIndex: 0,
  answers: [],
  sessionStartTime: null,
  questionStartTime: null,
  phase: "config" as DrillPhase,
  currentHintLevel: 0 as 0 | 1 | 2,
  lastAnswerCorrect: null,
  lastCorrectForm: null,
  lastUserAnswer: null,
  lastRuleExplanation: null,
  sessionResult: null,
  remainingSeconds: null,
  isLoading: false,
  error: null,
};

export const useConjugationStore = create<ConjugationState>((set, get) => ({
  ...initialState,

  // ---- Load verbs & forms for a language ----
  loadVerbs: async (language: Language) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`/api/conjugation/verbs?language=${language}`);
      if (!res.ok) throw new Error("Failed to load verbs");
      const data = await res.json();
      set({
        verbs: data.verbs ?? [],
        forms: data.forms ?? [],
        isLoading: false,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to load verbs",
        isLoading: false,
      });
    }
  },

  // ---- Set config without starting ----
  setConfig: (config: SessionConfig) => {
    set({ config });
  },

  // ---- Start a drill session ----
  startSession: async (config: SessionConfig) => {
    set({ isLoading: true, error: null, config });

    try {
      // Load verbs if not already loaded for this language
      const state = get();
      let verbs = state.verbs;
      let forms = state.forms;

      if (verbs.length === 0 || verbs[0]?.language !== config.language) {
        const res = await fetch(
          `/api/conjugation/verbs?language=${config.language}`,
        );
        if (!res.ok) throw new Error("Failed to load verbs");
        const data = await res.json();
        verbs = data.verbs ?? [];
        forms = data.forms ?? [];
        set({ verbs, forms });
      }

      // Fetch user progress (will return empty array for unauthenticated users)
      let progress: ConjugationProgress[] = [];
      try {
        const progressRes = await fetch(
          `/api/conjugation/progress?language=${config.language}`,
        );
        if (progressRes.ok) {
          const pData = await progressRes.json();
          progress = pData.progress ?? [];
        }
      } catch {
        // Progress fetch failing is non-fatal — just use empty progress
      }

      // Build question queue
      const targetCount =
        config.questionCount && config.questionCount > 0
          ? config.questionCount
          : 20;
      const queue = buildQuestionQueue(
        forms,
        verbs,
        progress,
        config,
        targetCount,
      );

      if (queue.length === 0) {
        throw new Error(
          "No questions available for the selected configuration. Try selecting more tenses or pronouns.",
        );
      }

      set({
        queue,
        currentIndex: 0,
        answers: [],
        sessionStartTime: Date.now(),
        questionStartTime: Date.now(),
        phase: "drilling",
        currentHintLevel: 0,
        lastAnswerCorrect: null,
        lastCorrectForm: null,
        lastUserAnswer: null,
        lastRuleExplanation: null,
        sessionResult: null,
        remainingSeconds: config.timed ? config.durationSeconds : null,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to start session",
        isLoading: false,
      });
    }
  },

  // ---- Submit an answer (validate, show feedback) ----
  submitAnswer: (userAnswer: string) => {
    const state = get();
    if (state.phase !== "drilling" || state.currentIndex >= state.queue.length)
      return;

    const question = state.queue[state.currentIndex];
    const { isCorrect } = validateAnswer(
      userAnswer,
      question.correctForm,
      state.config?.language ?? "de",
    );

    const timeSpentMs = state.questionStartTime
      ? Date.now() - state.questionStartTime
      : 0;

    const answer: DrillAnswer = {
      questionId: question.questionId,
      userAnswer: userAnswer.trim(),
      isCorrect,
      hintUsed: state.currentHintLevel > 0,
      timeSpentMs,
    };

    set({
      answers: [...state.answers, answer],
      phase: "feedback",
      lastAnswerCorrect: isCorrect,
      lastCorrectForm: question.correctForm,
      lastUserAnswer: userAnswer.trim(),
      lastRuleExplanation: question.ruleExplanation ?? null,
    });
  },

  // ---- Advance to next question ----
  advanceToNext: () => {
    const state = get();
    const nextIndex = state.currentIndex + 1;

    if (nextIndex >= state.queue.length) {
      // Session complete
      get().finishSession();
      return;
    }

    set({
      currentIndex: nextIndex,
      questionStartTime: Date.now(),
      phase: "drilling",
      currentHintLevel: 0,
      lastAnswerCorrect: null,
      lastCorrectForm: null,
      lastUserAnswer: null,
      lastRuleExplanation: null,
    });
  },

  // ---- Request a hint ----
  requestHint: () => {
    const state = get();
    const nextLevel = Math.min(2, state.currentHintLevel + 1) as 0 | 1 | 2;
    set({ currentHintLevel: nextLevel });
  },

  // ---- Skip question (counts as incorrect) ----
  skipQuestion: () => {
    const state = get();
    if (state.phase !== "drilling" || state.currentIndex >= state.queue.length)
      return;

    const question = state.queue[state.currentIndex];
    const timeSpentMs = state.questionStartTime
      ? Date.now() - state.questionStartTime
      : 0;

    const answer: DrillAnswer = {
      questionId: question.questionId,
      userAnswer: "",
      isCorrect: false,
      hintUsed: state.currentHintLevel > 0,
      timeSpentMs,
    };

    set({
      answers: [...state.answers, answer],
      phase: "feedback",
      lastAnswerCorrect: false,
      lastCorrectForm: question.correctForm,
      lastUserAnswer: "(skipped)",
      lastRuleExplanation: question.ruleExplanation ?? null,
    });
  },

  // ---- Finish session: compute results, save to API, update knowledge store ----
  finishSession: async () => {
    const state = get();
    if (!state.config) return;

    const timeTakenSeconds = state.sessionStartTime
      ? Math.round((Date.now() - state.sessionStartTime) / 1000)
      : 0;

    const result = computeSessionResult(
      state.answers,
      state.queue,
      state.config.timed,
      timeTakenSeconds,
      state.config.durationSeconds,
    );

    set({ sessionResult: result as SessionResult, phase: "results" });

    // Save session to API (non-blocking, fails silently for unauthenticated)
    try {
      const questionMap = new Map(state.queue.map((q) => [q.questionId, q]));
      const answerDetails = state.answers.map((a) => {
        const q = questionMap.get(a.questionId);
        return {
          verb_id: q?.verbId,
          tense: q?.tense,
          pronoun_key: q?.pronounKey,
          is_correct: a.isCorrect,
          hint_used: a.hintUsed,
        };
      });

      await fetch("/api/conjugation/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: state.config.language,
          config: state.config,
          total_questions: result.totalQuestions,
          correct_answers: result.correctAnswers,
          accuracy: result.accuracy,
          time_taken_seconds: result.timeTakenSeconds,
          xp_earned: result.xpEarned,
          answers: answerDetails,
        }),
      });
    } catch {
      // Session save failing is non-fatal
    }

    // Update knowledge store for each answered question
    const knowledgeStore = useKnowledgeStore.getState();
    const questionMap = new Map(state.queue.map((q) => [q.questionId, q]));

    const updates: {
      word: string;
      tense: string;
      pronoun: string;
      score: number;
    }[] = [];

    // Group answers by verb+tense+pronoun
    const grouped = new Map<string, { correct: number; total: number }>();
    for (const answer of state.answers) {
      const q = questionMap.get(answer.questionId);
      if (!q) continue;
      const key = `${q.infinitive}|${q.tense}|${q.pronounKey}`;
      const existing = grouped.get(key) ?? { correct: 0, total: 0 };
      existing.total++;
      if (answer.isCorrect) existing.correct++;
      grouped.set(key, existing);
    }

    for (const [key, stats] of grouped) {
      const [word, tense, pronoun] = key.split("|");
      const score = stats.total > 0 ? stats.correct / stats.total : 0;
      updates.push({ word, tense, pronoun, score });
    }

    knowledgeStore.batchUpdateScores(updates);
  },

  // ---- Reset to config phase ----
  resetSession: () => {
    const currentConfig = get().config;
    const currentVerbs = get().verbs;
    const currentForms = get().forms;
    set({
      ...initialState,
      config: currentConfig,
      verbs: currentVerbs,
      forms: currentForms,
    });
  },

  // ---- Timer control ----
  setRemainingSeconds: (seconds: number) => {
    set({ remainingSeconds: seconds });
    if (seconds <= 0) {
      // Time's up — finish session
      get().finishSession();
    }
  },

  setPhase: (phase: DrillPhase) => {
    set({ phase });
  },
}));
