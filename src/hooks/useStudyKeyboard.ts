"use client";

import { useEffect, useCallback, useRef } from "react";
import type { Rating, StudyAction, StudyState } from "@/types/flashcards";

interface UseStudyKeyboardOptions {
  /** Whether the session is active (not loading, not in mode picker, not complete). */
  active: boolean;
  state: StudyState;
  dispatch: React.Dispatch<StudyAction>;
  onRate: (rating: Rating) => void;
  onShowAnswer: () => void;
  /** Toggle the "More" menu */
  onToggleMore: () => void;
  /** Open card info overlay */
  onToggleInfo: () => void;
  /** Replay the card's audio */
  onReplayAudio: () => void;
  /** Flag the current card */
  onFlagCard: () => void;
  /** Mark the current card */
  onMarkCard: () => void;
  /** Open the inline edit dialog */
  onEditCard: () => void;
  /** Bury the current card */
  onBuryCard: () => void;
  /** Suspend the current card */
  onSuspendCard: () => void;
  /** Delete the current card */
  onDeleteCard: () => void;
}

/**
 * Keyboard shortcuts for the flashcard study session.
 *
 * Rating:      1 = Again, 2 = Hard, 3 = Good, 4 = Easy
 * Navigation:  Space / Enter = Show answer (front) or rate Good (back)
 * Actions:     E = Edit, F = Flag, M = Mark, B = Bury, S = Suspend,
 *              Del = Delete, I = Info, R = Replay audio, . = More menu
 */
export function useStudyKeyboard({
  active,
  state,
  dispatch,
  onRate,
  onShowAnswer,
  onToggleMore,
  onToggleInfo,
  onReplayAudio,
  onFlagCard,
  onMarkCard,
  onEditCard,
  onBuryCard,
  onSuspendCard,
  onDeleteCard,
}: UseStudyKeyboardOptions) {
  // Use refs to avoid stale closures in the keydown handler
  const stateRef = useRef(state);
  stateRef.current = state;

  const onRateRef = useRef(onRate);
  onRateRef.current = onRate;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!active) return;

      // Don't intercept when user is typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      // Don't intercept when ContentEditable is focused
      if ((e.target as HTMLElement)?.isContentEditable) return;

      const s = stateRef.current;
      const isFront = s.cardFace === "front";
      const isBack = s.cardFace === "back";

      switch (e.key) {
        // ── Rating shortcuts (only when answer is showing) ──────────
        case "1":
          if (isBack) {
            e.preventDefault();
            onRateRef.current(1);
          }
          break;
        case "2":
          if (isBack) {
            e.preventDefault();
            onRateRef.current(2);
          }
          break;
        case "3":
          if (isBack) {
            e.preventDefault();
            onRateRef.current(3);
          }
          break;
        case "4":
          if (isBack) {
            e.preventDefault();
            onRateRef.current(4);
          }
          break;

        // ── Space / Enter: show answer or rate Good ─────────────────
        case " ":
        case "Enter":
          // Only handle in flip mode to avoid conflicting with type/choice inputs
          if (s.reviewMode === "flip") {
            e.preventDefault();
            if (isFront) {
              onShowAnswer();
            } else {
              onRateRef.current(3); // Good
            }
          }
          break;

        // ── Card actions ────────────────────────────────────────────
        case "e":
        case "E":
          e.preventDefault();
          onEditCard();
          break;
        case "f":
        case "F":
          e.preventDefault();
          onFlagCard();
          break;
        case "m":
        case "M":
          // Skip if Ctrl/Cmd is pressed (browser shortcuts)
          if (e.ctrlKey || e.metaKey) return;
          e.preventDefault();
          onMarkCard();
          break;
        case "b":
        case "B":
          e.preventDefault();
          onBuryCard();
          break;
        case "s":
        case "S":
          if (e.ctrlKey || e.metaKey) return; // don't override Ctrl+S
          e.preventDefault();
          onSuspendCard();
          break;
        case "Delete":
          e.preventDefault();
          onDeleteCard();
          break;
        case "i":
        case "I":
          e.preventDefault();
          onToggleInfo();
          break;
        case "r":
        case "R":
          e.preventDefault();
          onReplayAudio();
          break;
        case ".":
          e.preventDefault();
          onToggleMore();
          break;
      }
    },
    [
      active,
      onShowAnswer,
      onToggleMore,
      onToggleInfo,
      onReplayAudio,
      onFlagCard,
      onMarkCard,
      onEditCard,
      onBuryCard,
      onSuspendCard,
      onDeleteCard,
    ],
  );

  useEffect(() => {
    if (!active) return;
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [active, handleKeyDown]);
}
