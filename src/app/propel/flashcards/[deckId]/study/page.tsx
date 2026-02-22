"use client";

import {
  useState,
  useEffect,
  useCallback,
  useReducer,
  useRef,
  useMemo,
} from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import {
  OceanBackground,
  OceanNavigation,
  DepthSidebar,
} from "@/components/ocean";
import LoadingScreen from "@/components/ui/LoadingScreen";
import { useAmbientPlayer } from "@/contexts/AmbientPlayerContext";
import {
  scheduleCard,
  dbRowToFSRSCard,
  fsrsCardToDbFields,
  previewInterval,
  formatInterval,
  buildStudyQueue,
} from "@/lib/fsrs";
import { createFlashcardAdapter } from "@/lib/knowledge-graph";
import {
  ArrowLeft,
  RotateCcw,
  Layers,
  FlipHorizontal,
  Keyboard,
  LayoutGrid,
  Check,
  X,
  ChevronRight,
  Plus,
  Flame,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  Deck,
  ScheduledCard,
  StudyState,
  StudyAction,
  Rating,
  ReviewMode,
} from "@/types/flashcards";
import { RATING_TOOLTIPS } from "@/types/flashcards";
import type { FSRSCard } from "@/lib/fsrs";
import "@/styles/ocean-theme.css";

// ============================================================================
// Study reducer — manages the full session state machine
// ============================================================================
function studyReducer(state: StudyState, action: StudyAction): StudyState {
  switch (action.type) {
    case "SET_CARDS":
      return {
        ...state,
        cards: action.cards,
        currentIndex: 0,
        cardFace: "front",
        answerState: "idle",
        userInput: "",
        selectedChoice: null,
        choiceOptions: generateChoices(action.cards, 0),
        cardStartTime: Date.now(),
        sessionComplete: action.cards.length === 0,
        learningQueue: [],
        totalReviewed: 0,
      };

    case "SET_MODE":
      if (typeof window !== "undefined") {
        localStorage.setItem("flashcard-review-mode", action.mode);
      }
      return {
        ...state,
        reviewMode: action.mode,
        cardFace: "front",
        answerState: "idle",
        userInput: "",
        selectedChoice: null,
        choiceOptions: generateChoices(state.cards, state.currentIndex),
      };

    case "SHOW_ANSWER":
      return { ...state, cardFace: "back" };

    case "SET_USER_INPUT":
      return { ...state, userInput: action.value };

    case "CHECK_ANSWER": {
      const current = state.cards[state.currentIndex];
      if (!current) return state;
      const correct =
        state.userInput.trim().toLowerCase() ===
        current.flashcards.back.trim().toLowerCase();
      return {
        ...state,
        cardFace: "back",
        answerState: correct ? "correct" : "incorrect",
      };
    }

    case "SELECT_CHOICE": {
      const current = state.cards[state.currentIndex];
      if (!current) return state;
      const correct = action.choice === current.flashcards.back;
      return {
        ...state,
        selectedChoice: action.choice,
        cardFace: "back",
        answerState: correct ? "correct" : "incorrect",
      };
    }

    case "RATE_CARD": {
      const ratingKey =
        action.rating === 1
          ? "again"
          : action.rating === 2
            ? "hard"
            : action.rating === 3
              ? "good"
              : "easy";
      const elapsed = Date.now() - state.cardStartTime;
      return {
        ...state,
        sessionStats: {
          ...state.sessionStats,
          [ratingKey]: state.sessionStats[ratingKey] + 1,
          totalTimeMs: state.sessionStats.totalTimeMs + elapsed,
        },
        totalReviewed: state.totalReviewed + 1,
      };
    }

    case "ENQUEUE_LEARNING":
      return {
        ...state,
        learningQueue: [...state.learningQueue, action.card],
      };

    case "NEXT_CARD": {
      const nextIndex = state.currentIndex + 1;

      // If we've gone through all main cards, check learning queue
      if (nextIndex >= state.cards.length) {
        if (state.learningQueue.length > 0) {
          // Move learning queue cards into the main queue
          const newCards = [...state.learningQueue];
          return {
            ...state,
            cards: newCards,
            learningQueue: [],
            currentIndex: 0,
            cardFace: "front",
            answerState: "idle",
            userInput: "",
            selectedChoice: null,
            choiceOptions: generateChoices(newCards, 0),
            cardStartTime: Date.now(),
          };
        }
        return { ...state, sessionComplete: true };
      }

      return {
        ...state,
        currentIndex: nextIndex,
        cardFace: "front",
        answerState: "idle",
        userInput: "",
        selectedChoice: null,
        choiceOptions: generateChoices(state.cards, nextIndex),
        cardStartTime: Date.now(),
      };
    }

    default:
      return state;
  }
}

function generateChoices(cards: ScheduledCard[], index: number): string[] {
  if (!cards.length || index >= cards.length) return [];
  const correct = cards[index].flashcards.back;
  const allBacks = [...new Set(cards.map((c) => c.flashcards.back))].filter(
    (b) => b !== correct,
  );
  const shuffled = allBacks.sort(() => Math.random() - 0.5).slice(0, 3);
  const options = [...shuffled, correct].sort(() => Math.random() - 0.5);
  while (options.length < 4) options.push("—");
  return options;
}

const initialStudyState: StudyState = {
  cards: [],
  currentIndex: 0,
  reviewMode: "flip",
  cardFace: "front",
  answerState: "idle",
  userInput: "",
  choiceOptions: [],
  selectedChoice: null,
  sessionStats: { again: 0, hard: 0, good: 0, easy: 0, totalTimeMs: 0 },
  cardStartTime: Date.now(),
  sessionComplete: false,
  learningQueue: [],
  totalReviewed: 0,
};

// ============================================================================
// Rating Buttons — with tooltips
// ============================================================================
function RatingButtons({
  card,
  onRate,
}: {
  card: ScheduledCard;
  onRate: (rating: Rating) => void;
}) {
  const fsrsCard = dbRowToFSRSCard(card);
  const now = new Date();
  const [hoveredRating, setHoveredRating] = useState<Rating | null>(null);

  const ratings: {
    value: Rating;
    label: string;
    color: string;
    hoverColor: string;
  }[] = [
    {
      value: 1,
      label: "Again",
      color: "bg-rose-500/15 text-rose-300 border-rose-400/30",
      hoverColor: "hover:bg-rose-500/25",
    },
    {
      value: 2,
      label: "Hard",
      color: "bg-amber-500/15 text-amber-300 border-amber-400/30",
      hoverColor: "hover:bg-amber-500/25",
    },
    {
      value: 3,
      label: "Good",
      color: "bg-teal-500/15 text-teal-300 border-teal-400/30",
      hoverColor: "hover:bg-teal-500/25",
    },
    {
      value: 4,
      label: "Easy",
      color: "bg-blue-500/15 text-blue-300 border-blue-400/30",
      hoverColor: "hover:bg-blue-500/25",
    },
  ];

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {ratings.map((r) => {
          const interval = previewInterval(fsrsCard, r.value, now);
          return (
            <button
              key={r.value}
              onClick={() => onRate(r.value)}
              onMouseEnter={() => setHoveredRating(r.value)}
              onMouseLeave={() => setHoveredRating(null)}
              className={cn(
                "relative flex flex-col items-center gap-1 rounded-xl border py-3 px-3 transition",
                r.color,
                r.hoverColor,
              )}
            >
              <span className="font-medium text-sm">{r.label}</span>
              <span className="text-[10px] opacity-60">
                {formatInterval(interval)}
              </span>
            </button>
          );
        })}
      </div>
      {/* Tooltip */}
      <div className="flex items-center justify-center gap-1.5 min-h-[20px]">
        {hoveredRating && (
          <p className="text-[11px] text-white/40 animate-in fade-in duration-150 flex items-center gap-1">
            <Info className="h-3 w-3" />
            {RATING_TOOLTIPS[hoveredRating]}
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Mode Picker
// ============================================================================
function ModePicker({
  mode,
  onSelect,
}: {
  mode: ReviewMode;
  onSelect: (m: ReviewMode) => void;
}) {
  const modes: {
    key: ReviewMode;
    label: string;
    Icon: React.ElementType;
    desc: string;
  }[] = [
    {
      key: "flip",
      label: "Classic Flip",
      Icon: FlipHorizontal,
      desc: "Show front, flip, self-rate",
    },
    {
      key: "type",
      label: "Type Answer",
      Icon: Keyboard,
      desc: "Type the translation",
    },
    {
      key: "choice",
      label: "Multiple Choice",
      Icon: LayoutGrid,
      desc: "Pick from 4 options",
    },
  ];

  return (
    <div className="space-y-3">
      <p className="text-sm text-white/50 text-center">
        Choose your review mode
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {modes.map((m) => (
          <button
            key={m.key}
            onClick={() => onSelect(m.key)}
            className={cn(
              "flex flex-col items-center gap-2 rounded-2xl border p-5 transition",
              mode === m.key
                ? "border-teal-400/50 bg-teal-500/10"
                : "border-white/10 bg-white/[0.03] hover:border-white/20",
            )}
          >
            <m.Icon
              className={cn(
                "h-6 w-6",
                mode === m.key ? "text-teal-400" : "text-white/40",
              )}
            />
            <span
              className={cn(
                "font-medium text-sm",
                mode === m.key ? "text-teal-300" : "text-white/60",
              )}
            >
              {m.label}
            </span>
            <span className="text-[11px] text-white/30">{m.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Session Complete — with streak + CTAs
// ============================================================================
function SessionComplete({
  stats,
  deckId,
  deckName,
  streak,
  hasAgainCards,
  onStudyAgain,
}: {
  stats: StudyState["sessionStats"];
  deckId: string;
  deckName: string;
  streak: number;
  hasAgainCards: boolean;
  onStudyAgain: () => void;
}) {
  const total = stats.again + stats.hard + stats.good + stats.easy;
  const correctPct =
    total > 0 ? Math.round(((stats.good + stats.easy) / total) * 100) : 0;
  const avgMs = total > 0 ? Math.round(stats.totalTimeMs / total) : 0;
  const avgSec = (avgMs / 1000).toFixed(1);

  const breakdownItems = [
    { label: "Again", count: stats.again, color: "bg-rose-400" },
    { label: "Hard", count: stats.hard, color: "bg-amber-400" },
    { label: "Good", count: stats.good, color: "bg-teal-400" },
    { label: "Easy", count: stats.easy, color: "bg-blue-400" },
  ];

  return (
    <div className="max-w-md mx-auto text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Celebration */}
      <div className="space-y-3">
        <div className="w-16 h-16 rounded-full bg-teal-500/15 flex items-center justify-center mx-auto">
          <Check className="h-8 w-8 text-teal-400" />
        </div>
        <h2
          className="font-display text-3xl font-bold"
          style={{ color: "var(--sand)" }}
        >
          Session Complete
        </h2>
        <p className="text-white/50">
          You&apos;ve surfaced through today&apos;s review. The depths remember.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-white/10 bg-[#0d2137] p-4">
          <p className="text-2xl font-bold text-white">{total}</p>
          <p className="text-xs text-white/40">Reviewed</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#0d2137] p-4">
          <p className="text-2xl font-bold text-teal-300">{correctPct}%</p>
          <p className="text-xs text-white/40">Correct</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#0d2137] p-4">
          <p className="text-2xl font-bold text-white">{avgSec}s</p>
          <p className="text-xs text-white/40">Avg. time</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#0d2137] p-4">
          <div className="flex items-center justify-center gap-1">
            <Flame className="h-5 w-5 text-orange-400" />
            <p className="text-2xl font-bold text-orange-300">{streak}</p>
          </div>
          <p className="text-xs text-white/40">Day streak</p>
        </div>
      </div>

      {/* Breakdown */}
      <div className="rounded-2xl border border-white/10 bg-[#0d2137] p-5 space-y-3">
        <p className="text-sm font-medium text-white/60">Breakdown</p>
        <div className="space-y-2">
          {breakdownItems.map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <div className={cn("h-2 w-2 rounded-full", item.color)} />
              <span className="text-sm text-white/70 flex-1 text-left">
                {item.label}
              </span>
              <span className="text-sm font-medium text-white">
                {item.count}
              </span>
              {total > 0 && (
                <div className="w-20 h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full", item.color)}
                    style={{ width: `${(item.count / total) * 100}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {hasAgainCards && (
          <button
            onClick={onStudyAgain}
            className={cn(
              "flex items-center justify-center gap-2 rounded-xl py-3 px-6",
              "bg-teal-500 hover:bg-teal-400 text-[#0a1628] font-medium",
              "transition shadow-lg shadow-teal-500/20",
            )}
          >
            <RotateCcw className="h-4 w-4" />
            Study Again
          </button>
        )}
        <Link
          href={`/propel/flashcards/${deckId}`}
          className={cn(
            "flex items-center justify-center gap-2 rounded-xl py-3 px-6",
            "border border-white/10 text-white/60 hover:text-white hover:border-white/20",
            "font-medium transition",
          )}
        >
          <Plus className="h-4 w-4" />
          Add More Cards
        </Link>
        <Link
          href="/propel/flashcards"
          className={cn(
            "flex items-center justify-center gap-2 rounded-xl py-3 px-6",
            "border border-white/10 text-white/40 hover:text-white/60 hover:border-white/20",
            "font-medium transition text-sm",
          )}
        >
          Back to Decks
        </Link>
      </div>
    </div>
  );
}

// ============================================================================
// Swipe Hook — detect left/right/up swipe on touch devices
// ============================================================================
function useSwipe(
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  onSwipeUp?: () => void,
) {
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const touchEnd = useRef<{ x: number; y: number } | null>(null);
  const minSwipeDistance = 50;

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchEnd.current = null;
    touchStart.current = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    };
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    touchEnd.current = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    };
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!touchStart.current || !touchEnd.current) return;
    const distX = touchStart.current.x - touchEnd.current.x;
    const distY = touchStart.current.y - touchEnd.current.y;
    const isHorizontal = Math.abs(distX) > Math.abs(distY);

    if (isHorizontal && Math.abs(distX) > minSwipeDistance) {
      if (distX > 0) onSwipeLeft?.();
      else onSwipeRight?.();
    } else if (!isHorizontal && distY > minSwipeDistance) {
      onSwipeUp?.();
    }
  }, [onSwipeLeft, onSwipeRight, onSwipeUp, minSwipeDistance]);

  return { onTouchStart, onTouchMove, onTouchEnd };
}

// ============================================================================
// Classic Flip Card
// ============================================================================
function FlipCard({
  card,
  face,
  onShowAnswer,
  onRate,
}: {
  card: ScheduledCard;
  face: "front" | "back";
  onShowAnswer: () => void;
  onRate: (rating: Rating) => void;
}) {
  const swipe = useSwipe(
    undefined,
    undefined,
    face === "front" ? onShowAnswer : undefined,
  );

  return (
    <div className="space-y-6" {...swipe}>
      {/* Card with flip animation */}
      <div className="perspective-[1000px]">
        <div
          className={cn(
            "relative w-full min-h-[260px] transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]",
            "[transform-style:preserve-3d]",
            face === "back" && "[transform:rotateY(180deg)]",
          )}
        >
          {/* Front */}
          <div
            className={cn(
              "absolute inset-0 rounded-2xl border border-white/10 bg-[#0d2137]",
              "flex flex-col items-center justify-center p-8",
              "[backface-visibility:hidden]",
            )}
          >
            <p className="text-3xl font-bold text-white text-center leading-relaxed">
              {card.flashcards.front}
            </p>
            {card.flashcards.word_class && (
              <span className="mt-3 text-xs text-white/30 px-2 py-0.5 rounded-full bg-white/5">
                {card.flashcards.word_class}
              </span>
            )}
          </div>

          {/* Back */}
          <div
            className={cn(
              "absolute inset-0 rounded-2xl border border-white/10 bg-[#0d2137]",
              "flex flex-col items-center justify-center p-8",
              "[backface-visibility:hidden] [transform:rotateY(180deg)]",
            )}
          >
            <p className="text-2xl font-semibold text-teal-300 text-center">
              {card.flashcards.back}
            </p>
            {card.flashcards.example_sentence && (
              <div className="mt-4 rounded-xl bg-white/5 p-4 w-full">
                <p className="text-sm text-white/70 italic text-center">
                  {card.flashcards.example_sentence}
                </p>
                {card.flashcards.example_translation && (
                  <p className="text-xs text-white/40 mt-1 text-center">
                    {card.flashcards.example_translation}
                  </p>
                )}
              </div>
            )}
            {card.flashcards.grammar_notes && (
              <p className="mt-3 text-xs text-white/40 text-center max-w-sm">
                {card.flashcards.grammar_notes}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Show Answer / Rating */}
      {face === "front" ? (
        <button
          onClick={onShowAnswer}
          className={cn(
            "w-full rounded-xl py-3.5 font-medium text-[#0a1628]",
            "bg-teal-500 hover:bg-teal-400 transition",
            "shadow-lg shadow-teal-500/25",
          )}
        >
          Show Answer
        </button>
      ) : (
        <RatingButtons card={card} onRate={onRate} />
      )}
    </div>
  );
}

// ============================================================================
// Type Answer Card
// ============================================================================
function TypeCard({
  card,
  state,
  dispatch,
  onRate,
}: {
  card: ScheduledCard;
  state: StudyState;
  dispatch: React.Dispatch<StudyAction>;
  onRate: (rating: Rating) => void;
}) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (state.answerState === "idle") {
      dispatch({ type: "CHECK_ANSWER" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Card front */}
      <div
        className={cn(
          "rounded-2xl border border-white/10 bg-[#0d2137]",
          "flex flex-col items-center justify-center p-8 min-h-[200px]",
        )}
      >
        <p className="text-3xl font-bold text-white text-center">
          {card.flashcards.front}
        </p>
        {card.flashcards.word_class && (
          <span className="mt-3 text-xs text-white/30 px-2 py-0.5 rounded-full bg-white/5">
            {card.flashcards.word_class}
          </span>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          value={state.userInput}
          onChange={(e) =>
            dispatch({ type: "SET_USER_INPUT", value: e.target.value })
          }
          placeholder="Type the translation..."
          disabled={state.answerState !== "idle"}
          className={cn(
            "w-full rounded-xl border bg-white/5 px-4 py-3 text-center text-lg",
            "text-white placeholder:text-white/30",
            "focus:outline-none transition",
            state.answerState === "idle"
              ? "border-white/10 focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/30"
              : state.answerState === "correct"
                ? "border-teal-400/50 bg-teal-500/5"
                : "border-rose-400/50 bg-rose-500/5",
          )}
          autoFocus
        />

        {state.answerState === "idle" ? (
          <button
            type="submit"
            disabled={!state.userInput.trim()}
            className={cn(
              "w-full rounded-xl py-3 font-medium text-[#0a1628]",
              "bg-teal-500 hover:bg-teal-400 disabled:opacity-50 transition",
              "shadow-lg shadow-teal-500/25",
            )}
          >
            Check
          </button>
        ) : (
          <div className="space-y-4">
            {/* Result */}
            <div
              className={cn(
                "flex items-center justify-center gap-2 py-2 rounded-xl",
                state.answerState === "correct"
                  ? "bg-teal-500/10 text-teal-300"
                  : "bg-rose-500/10 text-rose-300",
              )}
            >
              {state.answerState === "correct" ? (
                <>
                  <Check className="h-5 w-5" />
                  <span className="font-medium">Correct!</span>
                </>
              ) : (
                <>
                  <X className="h-5 w-5" />
                  <span className="font-medium">
                    Correct answer: {card.flashcards.back}
                  </span>
                </>
              )}
            </div>

            {card.flashcards.example_sentence && (
              <div className="rounded-xl bg-white/5 p-3">
                <p className="text-sm text-white/60 italic text-center">
                  {card.flashcards.example_sentence}
                </p>
              </div>
            )}

            <RatingButtons card={card} onRate={onRate} />
          </div>
        )}
      </form>
    </div>
  );
}

// ============================================================================
// Multiple Choice Card
// ============================================================================
function ChoiceCard({
  card,
  state,
  dispatch,
  onRate,
}: {
  card: ScheduledCard;
  state: StudyState;
  dispatch: React.Dispatch<StudyAction>;
  onRate: (rating: Rating) => void;
}) {
  const answered = state.answerState !== "idle";
  const correct = card.flashcards.back;

  return (
    <div className="space-y-6">
      {/* Card front */}
      <div
        className={cn(
          "rounded-2xl border border-white/10 bg-[#0d2137]",
          "flex flex-col items-center justify-center p-8 min-h-[200px]",
        )}
      >
        <p className="text-3xl font-bold text-white text-center">
          {card.flashcards.front}
        </p>
        {card.flashcards.word_class && (
          <span className="mt-3 text-xs text-white/30 px-2 py-0.5 rounded-full bg-white/5">
            {card.flashcards.word_class}
          </span>
        )}
      </div>

      {/* Choice pills */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {state.choiceOptions.map((option, i) => {
          const isSelected = state.selectedChoice === option;
          const isCorrectOption = option === correct;

          let pillStyle =
            "border-white/10 bg-white/[0.03] hover:border-white/20";
          if (answered) {
            if (isCorrectOption) {
              pillStyle = "border-teal-400/50 bg-teal-500/10";
            } else if (isSelected && !isCorrectOption) {
              pillStyle = "border-rose-400/50 bg-rose-500/10";
            } else {
              pillStyle = "border-white/5 bg-white/[0.01] opacity-50";
            }
          }

          return (
            <button
              key={i}
              onClick={() => {
                if (!answered) {
                  dispatch({ type: "SELECT_CHOICE", choice: option });
                }
              }}
              disabled={answered}
              className={cn(
                "rounded-xl border py-3 px-4 text-left transition",
                pillStyle,
              )}
            >
              <span
                className={cn(
                  "font-medium",
                  answered && isCorrectOption
                    ? "text-teal-300"
                    : answered && isSelected && !isCorrectOption
                      ? "text-rose-300"
                      : "text-white/80",
                )}
              >
                {option}
              </span>
              {answered && isCorrectOption && (
                <Check className="inline-block ml-2 h-4 w-4 text-teal-400" />
              )}
              {answered && isSelected && !isCorrectOption && (
                <X className="inline-block ml-2 h-4 w-4 text-rose-400" />
              )}
            </button>
          );
        })}
      </div>

      {/* Example + Rating after answer */}
      {answered && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {card.flashcards.example_sentence && (
            <div className="rounded-xl bg-white/5 p-3">
              <p className="text-sm text-white/60 italic text-center">
                {card.flashcards.example_sentence}
              </p>
            </div>
          )}
          <RatingButtons card={card} onRate={onRate} />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// StudyContent — the main study session logic
// ============================================================================
function StudyContent({
  streak,
  avatarUrl,
  targetLanguage,
  isAdmin,
  wordsEncountered,
  userId,
}: {
  streak: number;
  avatarUrl?: string;
  targetLanguage: string;
  isAdmin: boolean;
  wordsEncountered: number;
  userId: string;
}) {
  const params = useParams();
  const router = useRouter();
  const deckId = params.deckId as string;
  const supabase = createClient();
  const { ambientView, setAmbientView } = useAmbientPlayer();

  const [deck, setDeck] = useState<Deck | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);
  const [showModePicker, setShowModePicker] = useState(true);
  const [currentStreak, setCurrentStreak] = useState(streak);
  const [state, dispatch] = useReducer(studyReducer, {
    ...initialStudyState,
    reviewMode:
      (typeof window !== "undefined"
        ? (localStorage.getItem("flashcard-review-mode") as ReviewMode)
        : null) || "flip",
  });

  // Track session results for knowledge graph sync
  const sessionResultsRef = useRef<
    Array<{
      wordId?: string;
      correct: boolean;
      responseTimeMs: number;
      rating: Rating;
    }>
  >([]);

  useEffect(() => {
    if (ambientView === "container") {
      setAmbientView("soundbar");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch deck and build study queue with daily limits
  const fetchStudyCards = useCallback(async () => {
    // Fetch deck
    const { data: deckData } = await supabase
      .from("decks")
      .select("*")
      .eq("id", deckId)
      .eq("user_id", userId)
      .single();

    if (!deckData) {
      router.replace("/propel/flashcards");
      return;
    }
    const deckObj = deckData as Deck;
    setDeck(deckObj);

    // Get card IDs for this deck
    const { data: deckCards } = await supabase
      .from("flashcards")
      .select("id")
      .eq("deck_id", deckId)
      .eq("user_id", userId);

    const cardIds = (deckCards || []).map((c) => c.id);
    if (!cardIds.length) {
      dispatch({ type: "SET_CARDS", cards: [] });
      setLoading(false);
      return;
    }

    // Fetch ALL schedules (not just due) so buildStudyQueue can filter
    const { data: schedules } = await supabase
      .from("card_schedules")
      .select("*, flashcards(*)")
      .eq("user_id", userId)
      .in("card_id", cardIds)
      .order("due", { ascending: true });

    const allSchedules = (schedules || []) as ScheduledCard[];

    // Count new cards studied today (for daily limit)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const { data: todayReviews } = await supabase
      .from("review_log")
      .select("card_id")
      .eq("user_id", userId)
      .eq("deck_id", deckId)
      .gte("reviewed_at", startOfDay.toISOString());

    const todayReviewedIds = new Set(
      (todayReviews || []).map((r) => r.card_id),
    );
    // Cards that were new and reviewed today
    const newCardsStudiedToday = allSchedules.filter(
      (s) =>
        todayReviewedIds.has(s.card_id) && s.reps <= 1 && s.state !== "new",
    ).length;

    // Build queue with daily limits and backlog spread
    const queue = buildStudyQueue(
      allSchedules,
      deckObj.new_per_day,
      deckObj.review_per_day,
      newCardsStudiedToday,
    );

    // Reset session results
    sessionResultsRef.current = [];

    dispatch({ type: "SET_CARDS", cards: queue });
    setLoading(false);
  }, [supabase, deckId, userId, router]);

  useEffect(() => {
    fetchStudyCards();
  }, [fetchStudyCards]);

  // Rate a card — schedule, log, sync knowledge graph
  const handleRate = async (rating: Rating) => {
    const current = state.cards[state.currentIndex];
    if (!current) return;

    const fsrsCard = dbRowToFSRSCard(current);
    const now = new Date();
    const result = scheduleCard(fsrsCard, rating, now);
    const dbFields = fsrsCardToDbFields(result.card);

    // Update card_schedules
    await supabase.from("card_schedules").update(dbFields).eq("id", current.id);

    // Log review
    const elapsed = Date.now() - state.cardStartTime;
    await supabase.from("review_log").insert({
      user_id: userId,
      card_id: current.card_id,
      deck_id: deckId,
      rating,
      review_time_ms: elapsed,
    });

    // Track for KG sync
    const isCorrect = rating >= 3;
    sessionResultsRef.current.push({
      correct: isCorrect,
      responseTimeMs: elapsed,
      rating,
    });

    // If FSRS says show card again in session (learning steps), enqueue it
    if (result.showAgainInSession) {
      // Clone the card with updated schedule fields for re-show
      const updatedCard: ScheduledCard = {
        ...current,
        stability: result.card.stability,
        difficulty: result.card.difficulty,
        elapsed_days: result.card.elapsed_days,
        scheduled_days: result.card.scheduled_days,
        reps: result.card.reps,
        lapses: result.card.lapses,
        state: result.card.state,
        due: result.card.due.toISOString(),
        last_review: result.card.last_review?.toISOString() || null,
      };
      dispatch({ type: "ENQUEUE_LEARNING", card: updatedCard });
    }

    dispatch({ type: "RATE_CARD", rating });
    dispatch({ type: "NEXT_CARD" });
  };

  // Sync session results with knowledge graph when session ends
  useEffect(() => {
    if (!state.sessionComplete || sessionResultsRef.current.length === 0)
      return;

    const syncKnowledgeGraph = async () => {
      try {
        // Try to find matching user_words entries for the flashcard words
        // This links flashcard reviews to the unified knowledge graph
        const adapter = createFlashcardAdapter(supabase, userId);

        // Get the flashcard fronts/backs from this session
        const uniqueWords = new Set<string>();
        state.cards.forEach((c) => {
          uniqueWords.add(c.flashcards.front.toLowerCase());
        });

        // Look up user_words that match these flashcard words
        if (uniqueWords.size > 0) {
          const { data: userWords } = await supabase
            .from("user_words")
            .select("id, word, lemma")
            .eq("user_id", userId)
            .in("word", Array.from(uniqueWords));

          if (userWords && userWords.length > 0) {
            const wordMap = new Map(
              userWords.map((w) => [w.word.toLowerCase(), w.id]),
            );
            const lemmaMap = new Map(
              userWords.map((w) => [w.lemma?.toLowerCase(), w.id]),
            );

            const kgResults = sessionResultsRef.current
              .map((result, idx) => {
                const card = state.cards[idx % state.cards.length];
                if (!card) return null;
                const front = card.flashcards.front.toLowerCase();
                const wordId = wordMap.get(front) || lemmaMap.get(front);
                if (!wordId) return null;
                return {
                  wordId,
                  correct: result.correct,
                  responseTimeMs: result.responseTimeMs,
                  rating: result.rating as 0 | 1 | 2 | 3 | 4 | 5,
                };
              })
              .filter(Boolean) as Array<{
              wordId: string;
              correct: boolean;
              responseTimeMs: number;
              rating: 0 | 1 | 2 | 3 | 4 | 5;
            }>;

            if (kgResults.length > 0) {
              await adapter.onSessionComplete(kgResults);
            }
          }
        }

        // Update streak
        const { data: profile } = await supabase
          .from("profiles")
          .select("streak, last_streak_date")
          .eq("id", userId)
          .single();

        if (profile) {
          const today = new Date().toISOString().split("T")[0];
          const lastDate = profile.last_streak_date;
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split("T")[0];

          let newStreak = profile.streak || 0;
          if (lastDate !== today) {
            if (lastDate === yesterdayStr) {
              newStreak += 1;
            } else if (!lastDate) {
              newStreak = 1;
            } else {
              newStreak = 1; // streak broken
            }
            await supabase
              .from("profiles")
              .update({ streak: newStreak, last_streak_date: today })
              .eq("id", userId);
            setCurrentStreak(newStreak);
          }
        }
      } catch (err) {
        console.warn("[Flashcards] KG sync failed:", err);
      }
    };

    syncKnowledgeGraph();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.sessionComplete]);

  const handleNavigation = useCallback(
    (href: string) => {
      setIsNavigating(true);
      router.push(href);
    },
    [router],
  );

  const startSession = (mode: ReviewMode) => {
    dispatch({ type: "SET_MODE", mode });
    setShowModePicker(false);
  };

  if (isNavigating) return <LoadingScreen />;

  const current = state.cards[state.currentIndex];
  const totalCards = state.cards.length;
  const totalWithLearning = totalCards + state.learningQueue.length;
  const progress =
    totalCards > 0
      ? (state.totalReviewed /
          (state.totalReviewed +
            totalCards -
            state.currentIndex +
            state.learningQueue.length || 1)) *
        100
      : 0;

  return (
    <OceanBackground>
      <DepthSidebar wordCount={wordsEncountered} scrollable={false} />
      <OceanNavigation
        streak={currentStreak}
        avatarUrl={avatarUrl}
        currentPath="/propel/flashcards"
        isAdmin={isAdmin}
        targetLanguage={targetLanguage}
        wordsEncountered={wordsEncountered}
        onBeforeNavigate={handleNavigation}
      />

      <div className="relative z-10 min-h-screen pt-28 pb-24 px-6 md:pl-[370px]">
        <div className="max-w-2xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 rounded-full border-2 border-teal-400 border-t-transparent animate-spin" />
            </div>
          ) : state.sessionComplete ? (
            <SessionComplete
              stats={state.sessionStats}
              deckId={deckId}
              deckName={deck?.name || "Deck"}
              streak={currentStreak}
              hasAgainCards={state.sessionStats.again > 0}
              onStudyAgain={() => fetchStudyCards()}
            />
          ) : totalCards === 0 ? (
            <div className="text-center py-20 space-y-4">
              <Layers className="h-16 w-16 text-white/10 mx-auto" />
              <p className="text-white/40 text-lg">No cards due</p>
              <p className="text-white/25 text-sm">
                All caught up! Check back later or add more cards.
              </p>
              <Link
                href={`/propel/flashcards/${deckId}`}
                className="inline-flex items-center gap-2 text-sm text-teal-400 hover:text-teal-300 transition"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to deck
              </Link>
            </div>
          ) : showModePicker ? (
            <div className="space-y-8">
              <div className="text-center space-y-2">
                <h1
                  className="font-display text-3xl font-bold"
                  style={{ color: "var(--sand)" }}
                >
                  {deck?.name || "Study"}
                </h1>
                <p className="text-white/50">
                  {totalCards} card{totalCards !== 1 ? "s" : ""} to review
                </p>
              </div>

              <ModePicker
                mode={state.reviewMode}
                onSelect={(m) => dispatch({ type: "SET_MODE", mode: m })}
              />

              <div className="flex justify-center">
                <button
                  onClick={() => startSession(state.reviewMode)}
                  className={cn(
                    "flex items-center gap-2 rounded-xl py-3 px-8",
                    "bg-teal-500 hover:bg-teal-400 text-[#0a1628] font-medium",
                    "transition shadow-lg shadow-teal-500/20",
                  )}
                >
                  Start Session
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          ) : current ? (
            <div className="space-y-6">
              {/* Progress bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-white/40">
                  <span>
                    Card {state.currentIndex + 1} of {totalCards}
                    {state.learningQueue.length > 0 && (
                      <span className="text-amber-300/60 ml-2">
                        +{state.learningQueue.length} learning
                      </span>
                    )}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-teal-400/70" />
                      {state.sessionStats.good + state.sessionStats.easy}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-400/70" />
                      {state.sessionStats.again}
                    </span>
                  </span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-400 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
              </div>

              {/* Card */}
              {state.reviewMode === "flip" && (
                <FlipCard
                  card={current}
                  face={state.cardFace}
                  onShowAnswer={() => dispatch({ type: "SHOW_ANSWER" })}
                  onRate={handleRate}
                />
              )}

              {state.reviewMode === "type" && (
                <TypeCard
                  card={current}
                  state={state}
                  dispatch={dispatch}
                  onRate={handleRate}
                />
              )}

              {state.reviewMode === "choice" && (
                <ChoiceCard
                  card={current}
                  state={state}
                  dispatch={dispatch}
                  onRate={handleRate}
                />
              )}
            </div>
          ) : null}
        </div>
      </div>
    </OceanBackground>
  );
}

// ============================================================================
// Page — fetches user data
// ============================================================================
export default function StudyPage() {
  const router = useRouter();
  const supabase = createClient();

  const [streak, setStreak] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>();
  const [targetLanguage, setTargetLanguage] = useState("fr");
  const [isAdmin, setIsAdmin] = useState(false);
  const [wordsEncountered, setWordsEncountered] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/auth/login");
        return;
      }

      setUserId(user.id);
      setAvatarUrl(
        user.user_metadata?.avatar_url || user.user_metadata?.picture,
      );

      const { data: profile } = await supabase
        .from("profiles")
        .select("streak, target_language, subscription_tier")
        .eq("id", user.id)
        .single();

      if (profile) {
        setStreak(profile.streak ?? 0);
        setTargetLanguage(profile.target_language ?? "fr");
      }

      const { data: allWords } = await supabase
        .from("learner_words_v2")
        .select("id")
        .eq("user_id", user.id)
        .eq("language", profile?.target_language ?? "fr");

      setWordsEncountered(allWords?.length ?? 0);

      const { data: adminRow } = await supabase
        .from("admin_users")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      setIsAdmin(!!adminRow);
      setLoading(false);
    };

    load();
  }, [supabase, router]);

  if (loading || !userId) {
    return <LoadingScreen />;
  }

  return (
    <ProtectedRoute>
      <StudyContent
        streak={streak}
        avatarUrl={avatarUrl}
        targetLanguage={targetLanguage}
        isAdmin={isAdmin}
        wordsEncountered={wordsEncountered}
        userId={userId}
      />
    </ProtectedRoute>
  );
}
