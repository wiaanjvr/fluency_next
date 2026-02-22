"use client";

import { useEffect, useRef } from "react";
import type { ClozeItem, AnswerState } from "@/types/cloze";
import { cn } from "@/lib/utils";

interface TypeInputProps {
  item: ClozeItem;
  userAnswer: string;
  answerState: AnswerState;
  onAnswerChange: (answer: string) => void;
  onSubmit: () => void;
}

export function TypeInput({
  item,
  userAnswer,
  answerState,
  onAnswerChange,
  onSubmit,
}: TypeInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (answerState === "idle") {
      inputRef.current?.focus();
    }
  }, [answerState, item.id]);

  const tokens = item.sentence.split(/\s+/);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (answerState === "idle" && userAnswer.trim()) {
        onSubmit();
      }
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-2xl md:text-3xl font-serif leading-relaxed text-white text-center">
        {tokens.map((token, i) => {
          if (token.startsWith("___")) {
            const trailing = token.slice(3);
            return (
              <span key={i} className="inline-flex items-baseline">
                <span className="relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={answerState !== "idle" ? item.answer : userAnswer}
                    onChange={(e) => onAnswerChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={answerState !== "idle"}
                    className={cn(
                      "bg-transparent text-center font-serif text-2xl md:text-3xl outline-none",
                      "border-b-2 transition-all duration-300",
                      answerState === "idle" &&
                        "border-teal-400 text-white caret-teal-400",
                      answerState === "correct" &&
                        "border-teal-400 text-teal-300 bg-teal-500/20 ring-2 ring-teal-400 rounded-lg px-2",
                      answerState === "close" &&
                        "border-amber-400 text-amber-300 bg-amber-500/20 ring-2 ring-amber-400 rounded-lg px-2",
                      answerState === "incorrect" &&
                        "border-rose-400 text-rose-300 bg-rose-500/20 ring-2 ring-rose-400 rounded-lg px-2",
                    )}
                    style={{
                      width: `${Math.max(item.answer.length, 4)}ch`,
                      minWidth: "4ch",
                    }}
                    placeholder="..."
                    autoComplete="off"
                    spellCheck={false}
                  />
                </span>
                {trailing && <span className="text-white">{trailing}</span>}
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

      {answerState === "idle" && (
        <div className="flex justify-center">
          <button
            onClick={onSubmit}
            disabled={!userAnswer.trim()}
            className={cn(
              "px-8 py-3 rounded-xl font-medium text-base transition-all duration-200",
              userAnswer.trim()
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
