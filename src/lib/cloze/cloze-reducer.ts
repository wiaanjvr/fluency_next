// Cloze session state management via useReducer

import type {
  ClozeItem,
  ClozeSessionState,
  ClozeAction,
  SessionEntry,
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
};

/**
 * Normalize answer for comparison:
 * - Lowercase, trim
 * - Accept umlaut substitutions (ue→ü, oe→ö, ae→ä, ss→ß)
 */
function normalizeAnswer(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/ue/g, "ü")
    .replace(/oe/g, "ö")
    .replace(/ae/g, "ä")
    .replace(/ss/g, "ß");
}

function checkAnswer(userAnswer: string, correctAnswer: string): boolean {
  const normUser = normalizeAnswer(userAnswer);
  const normCorrect = normalizeAnswer(correctAnswer);

  // Exact match after normalization
  if (normUser === normCorrect) return true;

  // Also check without umlaut normalization (in case user uses actual umlauts)
  if (userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase())
    return true;

  return false;
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

      const correct = checkAnswer(state.userAnswer, currentItem.answer);

      const entry: SessionEntry = {
        item: currentItem,
        userAnswer: state.userAnswer,
        correct,
      };

      return {
        ...state,
        answerState: correct ? "correct" : "incorrect",
        score: {
          correct: state.score.correct + (correct ? 1 : 0),
          incorrect: state.score.incorrect + (correct ? 0 : 1),
        },
        sessionHistory: [...state.sessionHistory, entry],
      };
    }

    case "NEXT_QUESTION": {
      const nextIndex = state.currentIndex + 1;
      if (nextIndex >= state.items.length) {
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
