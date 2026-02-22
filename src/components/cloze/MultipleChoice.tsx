"use client";

import { useMemo } from "react";
import type { ClozeItem, AnswerState } from "@/types/cloze";
import { cn } from "@/lib/utils";

interface MultipleChoiceProps {
  item: ClozeItem;
  userAnswer: string;
  answerState: AnswerState;
  onSelect: (answer: string) => void;
}

export function MultipleChoice({
  item,
  userAnswer,
  answerState,
  onSelect,
}: MultipleChoiceProps) {
  const options = useMemo(() => {
    const all = [item.answer, ...item.distractors];
    // Deterministic shuffle based on item ID
    const seed = item.id.charCodeAt(0) + item.id.charCodeAt(1);
    return all.sort((a, b) => {
      const aHash = (a.charCodeAt(0) * 31 + seed) % 100;
      const bHash = (b.charCodeAt(0) * 31 + seed) % 100;
      return aHash - bHash;
    });
  }, [item.id, item.answer, item.distractors]);

  const tokens = item.sentence.split(/\s+/);

  return (
    <div className="space-y-8">
      <p className="text-2xl md:text-3xl font-serif leading-relaxed text-white text-center">
        {tokens.map((token, i) => {
          if (token.startsWith("___")) {
            const trailing = token.slice(3);
            return (
              <span key={i}>
                <span
                  className={cn(
                    "inline-block px-3 py-1 rounded-lg border-b-2 transition-all duration-300",
                    answerState === "idle" && "border-teal-400 border-dashed",
                    answerState === "correct" &&
                      "bg-teal-500/20 ring-2 ring-teal-400 border-teal-400 text-teal-300",
                    answerState === "close" &&
                      "bg-amber-500/20 ring-2 ring-amber-400 border-amber-400 text-amber-300",
                    answerState === "incorrect" &&
                      "bg-rose-500/20 ring-2 ring-rose-400 border-rose-400 text-rose-300",
                  )}
                >
                  {answerState !== "idle" ? item.answer : userAnswer || "..."}
                </span>
                {trailing && <span>{trailing}</span>}
                {i < tokens.length - 1 && " "}
              </span>
            );
          }
          return (
            <span key={i}>
              {token}
              {i < tokens.length - 1 && " "}
            </span>
          );
        })}
      </p>

      <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto">
        {options.map((option) => {
          const isSelected = userAnswer === option;
          const isCorrectAnswer = option === item.answer;
          const showCorrect = answerState !== "idle" && isCorrectAnswer;
          const showIncorrect =
            answerState === "incorrect" && isSelected && !isCorrectAnswer;

          return (
            <button
              key={option}
              onClick={() => {
                if (answerState === "idle") {
                  onSelect(option);
                }
              }}
              disabled={answerState !== "idle"}
              className={cn(
                "px-4 py-3 rounded-xl text-base font-medium transition-all duration-200",
                "border text-center",
                answerState === "idle" &&
                  "border-white/20 bg-white/5 text-white hover:border-teal-400/50 hover:bg-teal-500/10 active:scale-95",
                showCorrect &&
                  "border-teal-400 bg-teal-500/20 text-teal-300 ring-2 ring-teal-400/50",
                showIncorrect &&
                  "border-rose-400 bg-rose-500/20 text-rose-300 ring-2 ring-rose-400/50",
                answerState !== "idle" &&
                  !showCorrect &&
                  !showIncorrect &&
                  "border-white/10 bg-white/5 text-white/30",
              )}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
