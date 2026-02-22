"use client";

import { useMemo, useState } from "react";
import type { ClozeItem, AnswerState } from "@/types/cloze";
import { cn } from "@/lib/utils";

interface WordBankProps {
  item: ClozeItem;
  userAnswer: string;
  answerState: AnswerState;
  onSelect: (answer: string) => void;
  onSubmit: () => void;
}

export function WordBank({
  item,
  userAnswer,
  answerState,
  onSelect,
  onSubmit,
}: WordBankProps) {
  const [selectedChip, setSelectedChip] = useState<string | null>(null);

  const chips = useMemo(() => {
    const all = [item.answer, ...item.distractors];
    const seed = item.id.charCodeAt(0) + item.id.charCodeAt(2);
    return all.sort((a, b) => {
      const aHash = (a.charCodeAt(0) * 37 + seed) % 100;
      const bHash = (b.charCodeAt(0) * 37 + seed) % 100;
      return aHash - bHash;
    });
  }, [item.id, item.answer, item.distractors]);

  const tokens = item.sentence.split(/\s+/);

  function handleChipClick(chip: string) {
    if (answerState !== "idle") return;

    if (selectedChip === chip) {
      // Deselect
      setSelectedChip(null);
      onSelect("");
    } else {
      setSelectedChip(chip);
      onSelect(chip);
    }
  }

  // Reset selection when item changes
  useMemo(() => {
    setSelectedChip(null);
  }, [item.id]);

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
                    "inline-block px-3 py-1 min-w-[4ch] rounded-lg border-b-2 transition-all duration-300",
                    answerState === "idle" &&
                      !selectedChip &&
                      "border-teal-400 border-dashed",
                    answerState === "idle" &&
                      selectedChip &&
                      "border-teal-400 bg-teal-500/10 text-teal-300",
                    answerState === "correct" &&
                      "bg-teal-500/20 ring-2 ring-teal-400 border-teal-400 text-teal-300",
                    answerState === "close" &&
                      "bg-amber-500/20 ring-2 ring-amber-400 border-amber-400 text-amber-300",
                    answerState === "incorrect" &&
                      "bg-rose-500/20 ring-2 ring-rose-400 border-rose-400 text-rose-300",
                  )}
                >
                  {answerState !== "idle"
                    ? item.answer
                    : selectedChip || "\u00A0\u00A0\u00A0"}
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

      <div className="flex flex-wrap justify-center gap-3">
        {chips.map((chip) => {
          const isSelected = selectedChip === chip;
          const isCorrectAnswer = chip === item.answer;
          const showCorrect = answerState !== "idle" && isCorrectAnswer;
          const showIncorrect =
            answerState === "incorrect" && isSelected && !isCorrectAnswer;

          return (
            <button
              key={chip}
              onClick={() => handleChipClick(chip)}
              disabled={answerState !== "idle"}
              className={cn(
                "px-5 py-2.5 rounded-xl text-base font-medium transition-all duration-200",
                "border",
                answerState === "idle" &&
                  !isSelected &&
                  "border-white/20 bg-white/5 text-white hover:border-teal-400/50 hover:bg-teal-500/10",
                answerState === "idle" &&
                  isSelected &&
                  "border-teal-400 bg-teal-500/20 text-teal-300 scale-95",
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
              {chip}
            </button>
          );
        })}
      </div>

      {answerState === "idle" && (
        <div className="flex justify-center">
          <button
            onClick={onSubmit}
            disabled={!selectedChip}
            className={cn(
              "px-8 py-3 rounded-xl font-medium text-base transition-all duration-200",
              selectedChip
                ? "bg-teal-500 hover:bg-teal-400 text-[#0a1628] shadow-lg shadow-teal-500/25"
                : "bg-white/10 text-white/30 cursor-not-allowed",
            )}
          >
            Check
          </button>
        </div>
      )}
    </div>
  );
}
