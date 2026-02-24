// Cloze session state management via useReducer

import type {
  ClozeItem,
  ClozeSessionState,
  ClozeAction,
  SessionEntry,
  AnswerState,
} from "@/types/cloze";

export const initialState: ClozeSessionState = {
  items: [],
  currentIndex: 0,
  inputMode: "type",
  answerState: "idle",
  userAnswer: "",
  score: { correct: 0, incorrect: 0 },
  sessionHistory: [],
  sessionComplete: false,
  streak: 0,
  maxStreak: 0,
};

/**
 * Compute Levenshtein distance between two strings.
 */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0),
  );
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

/**
 * Normalize answer for comparison:
 * - Lowercase, trim
 * - Accept diacritical variants:
 *   German:  ue→ü, oe→ö, ae→ä, ss→ß
 *   French:  strip accents (é→e, è→e, ê→e, à→a, ù→u, ç→c)
 *   Italian: strip accents (à→a, è→e, ì→i, ò→o, ù→u)
 */
function normalizeAnswer(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/ue/g, "ü")
    .replace(/oe/g, "ö")
    .replace(/ae/g, "ä")
    .replace(/ss/g, "ß")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Check answer with three outcomes: 'correct', 'close', or 'incorrect'.
 * - Exact match (after normalization) → correct
 * - Levenshtein distance 1 → close (amber encouragement)
 * - Otherwise → incorrect
 */
function checkAnswer(userAnswer: string, correctAnswer: string): AnswerState {
  const normUser = normalizeAnswer(userAnswer);
  const normCorrect = normalizeAnswer(correctAnswer);

  // Exact match after normalization
  if (normUser === normCorrect) return "correct";

  // Also check raw lowercase (user typed correct accents)
  if (userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase())
    return "correct";

  // Close: Levenshtein distance of 1
  if (levenshtein(normUser, normCorrect) <= 1) return "close";

  return "incorrect";
}

export function clozeReducer(
  state: ClozeSessionState,
  action: ClozeAction,
): ClozeSessionState {
  switch (action.type) {
    case "SET_ITEMS":
      return {
        ...initialState,
        items: action.items,
      };

    case "SET_INPUT_MODE":
      return {
        ...state,
        inputMode: action.mode,
      };

    case "SET_USER_ANSWER":
      return {
        ...state,
        userAnswer: action.answer,
      };

    case "SUBMIT_ANSWER": {
      if (state.answerState !== "idle") return state;

      const currentItem = state.items[state.currentIndex];
      if (!currentItem) return state;

      const answerResult = checkAnswer(state.userAnswer, currentItem.answer);
      const isCorrect = answerResult === "correct";

      const entry: SessionEntry = {
        item: currentItem,
        userAnswer: state.userAnswer,
        correct: isCorrect,
        modeUsed: state.inputMode,
      };

      const newStreak = isCorrect ? state.streak + 1 : 0;
      const newMaxStreak = Math.max(state.maxStreak, newStreak);

      return {
        ...state,
        answerState: answerResult,
        score: {
          correct: state.score.correct + (isCorrect ? 1 : 0),
          incorrect: state.score.incorrect + (isCorrect ? 0 : 1),
        },
        sessionHistory: [...state.sessionHistory, entry],
        streak: newStreak,
        maxStreak: newMaxStreak,
      };
    }

    case "NEXT_QUESTION": {
      const nextIndex = state.currentIndex + 1;
      if (nextIndex >= state.items.length) {
        // Notify dashboard recommendation engine
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("fluensea:session-complete", {
              detail: { activityType: "cloze" },
            }),
          );

          // --- Goal tracking: cloze exercises completed ---
          // Log the total number of exercises completed in this session
          fetch("/api/goals/log-event", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              eventType: "cloze_completed",
              value: state.items.length,
            }),
          }).catch(() => {});
          // Also track daily activity (server deduplicates)
          fetch("/api/goals/log-event", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ eventType: "daily_activity", value: 1 }),
          }).catch(() => {});
        }
        return {
          ...state,
          sessionComplete: true,
        };
      }
      return {
        ...state,
        currentIndex: nextIndex,
        answerState: "idle",
        userAnswer: "",
      };
    }

    case "RESET_SESSION":
      return {
        ...initialState,
        items: action.items,
        inputMode: state.inputMode,
      };

    default:
      return state;
  }
}
