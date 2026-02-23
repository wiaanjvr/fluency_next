// ==========================================================================
// Unified Knowledge Store — Production Score Tracker
// ==========================================================================
// Shared across flashcard, cloze, and conjugation modules.
// Stores word-level production_score so all modules benefit from practice
// in any other module.

import { create } from "zustand";

interface WordKnowledge {
  word: string;
  production_score: number;
  last_updated: number; // timestamp
}

interface KnowledgeState {
  /** Map of "word|tense|pronoun" → production score */
  scores: Record<string, WordKnowledge>;

  /** Update the production score for a conjugation drill result */
  updateConjugationScore: (
    verbInfinitive: string,
    tense: string,
    pronoun: string,
    score: number,
  ) => void;

  /** Get the production score for a word (optionally with tense/pronoun context) */
  getScore: (word: string, tense?: string, pronoun?: string) => number;

  /** Batch update scores from a finished session */
  batchUpdateScores: (
    updates: { word: string; tense: string; pronoun: string; score: number }[],
  ) => void;
}

export const useKnowledgeStore = create<KnowledgeState>((set, get) => ({
  scores: {},

  updateConjugationScore: (verbInfinitive, tense, pronoun, score) => {
    const key = `${verbInfinitive}|${tense}|${pronoun}`;
    set((state) => ({
      scores: {
        ...state.scores,
        [key]: {
          word: verbInfinitive,
          production_score: Math.min(1.0, Math.max(0, score)),
          last_updated: Date.now(),
        },
      },
    }));
  },

  getScore: (word, tense, pronoun) => {
    const key = tense && pronoun ? `${word}|${tense}|${pronoun}` : word;
    return get().scores[key]?.production_score ?? 0;
  },

  batchUpdateScores: (updates) => {
    set((state) => {
      const newScores = { ...state.scores };
      for (const { word, tense, pronoun, score } of updates) {
        const key = `${word}|${tense}|${pronoun}`;
        newScores[key] = {
          word,
          production_score: Math.min(1.0, Math.max(0, score)),
          last_updated: Date.now(),
        };
      }
      return { scores: newScores };
    });
  },
}));
