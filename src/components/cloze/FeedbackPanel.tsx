"use client";

import type { ClozeItem, AnswerState } from "@/types/cloze";
import { cn } from "@/lib/utils";
import { Check, X, Lightbulb, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { SaveToFlashcardsButton } from "@/components/flashcards";

interface FeedbackPanelProps {
  item: ClozeItem;
  answerState: AnswerState;
  userAnswer: string;
  onNext: () => void;
}

export function FeedbackPanel({
  item,
  answerState,
  userAnswer,
  onNext,
}: FeedbackPanelProps) {
  const { user } = useAuth();
  if (answerState === "idle") return null;

  const isCorrect = answerState === "correct";

  // Build sentenced with answer highlighted
  const sentenceWithAnswer = item.sentence.replace("___", item.answer);

  return (
    <div
      className={cn(
        "mt-6 space-y-4 rounded-2xl border p-6 transition-all duration-500",
        "animate-in slide-in-from-bottom-4 fade-in",
        isCorrect
          ? "border-teal-400/30 bg-teal-500/5"
          : "border-rose-400/30 bg-rose-500/5",
      )}
    >
      {/* Result header */}
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full",
            isCorrect ? "bg-teal-500/20" : "bg-rose-500/20",
          )}
        >
          {isCorrect ? (
            <Check className="h-5 w-5 text-teal-400" />
          ) : (
            <X className="h-5 w-5 text-rose-400" />
          )}
        </div>
        <span
          className={cn(
            "text-lg font-semibold",
            isCorrect ? "text-teal-400" : "text-rose-400",
          )}
        >
          {isCorrect
            ? "Correct!"
            : `Not quite — the answer was: ${item.answer}`}
        </span>
      </div>

      {/* Full sentence with answer highlighted */}
      <p className="text-base text-white/80 font-serif leading-relaxed">
        {sentenceWithAnswer.split(item.answer).map((part, i, arr) => (
          <span key={i}>
            {part}
            {i < arr.length - 1 && (
              <span className="font-bold text-teal-300">{item.answer}</span>
            )}
          </span>
        ))}
      </p>

      {/* Translation */}
      <div className="rounded-xl bg-white/5 p-4 border border-white/5">
        <p className="text-sm text-white/50 italic">{item.translation}</p>
      </div>

      {/* Explanation */}
      <div className="rounded-xl bg-white/5 p-4 border border-white/5 flex gap-3">
        <Lightbulb className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-white/70 leading-relaxed">
          {item.explanation}
        </p>
      </div>

      {/* Save to Flashcards (on incorrect answers) */}
      {!isCorrect && user && (
        <div className="pt-1">
          <SaveToFlashcardsButton
            userId={user.id}
            front={item.answer}
            back={item.translation}
            exampleSentence={item.sentence.replace("___", item.answer)}
            source="cloze"
          />
        </div>
      )}

      {/* Next button */}
      <div className="flex justify-end pt-2">
        <button
          onClick={onNext}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-[#0a1628] font-medium text-base transition-all duration-200 shadow-lg shadow-teal-500/25"
        >
          Next
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
