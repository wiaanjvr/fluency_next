"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, Send, Keyboard } from "lucide-react";
import type { DuelQuestion, DuelCategory } from "@/types/duel";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "@/types/duel";

interface QuizQuestionProps {
  question: DuelQuestion;
  questionNumber: number;
  totalQuestions: number;
  onSubmit: (answer: string) => void;
  onFeedback?: (isCorrect: boolean) => void;
  disabled?: boolean;
  soundEnabled?: boolean;
}

// ─── Sound synthesis ─────────────────────────────────────────────────
function playTone(frequency: number, duration: number) {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = frequency;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      ctx.currentTime + duration / 1000,
    );
    osc.start();
    osc.stop(ctx.currentTime + duration / 1000);
  } catch {
    // Silently fail
  }
}

// ─── Category icons ──────────────────────────────────────────────────
const CATEGORY_ICONS: Record<string, string> = {
  vocabulary: "📘",
  cloze: "🖊️",
  conjugation: "🔄",
  grammar: "📐",
  listening: "🎧",
  translation: "🌐",
};

export default function QuizQuestion({
  question,
  questionNumber,
  totalQuestions,
  onSubmit,
  onFeedback,
  disabled,
  soundEnabled = false,
}: QuizQuestionProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [isCorrectResult, setIsCorrectResult] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [shakeWrongIndex, setShakeWrongIndex] = useState<number | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  const categoryColor = CATEGORY_COLORS[question.category];
  const categoryLabel = CATEGORY_LABELS[question.category];
  const categoryIcon = CATEGORY_ICONS[question.category] || "📝";

  const isMultipleChoice =
    question.options !== null && question.options.length > 0;
  const isTranslation = question.category === "translation";
  const isListening = question.category === "listening";

  // Reset state when question changes
  useEffect(() => {
    setSelectedOption(null);
    setTextAnswer("");
    setIsSubmitted(false);
    setShowResult(false);
    setIsCorrectResult(false);
    setShakeWrongIndex(null);
  }, [question]);

  // ─── TTS for listening questions ───────────────────────────────────
  const speak = useCallback(() => {
    if (!question.audio_text || typeof window === "undefined") return;
    if (!synthRef.current) synthRef.current = window.speechSynthesis;
    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(question.audio_text);
    const langMap: Record<string, string> = {
      de: "de-DE",
      fr: "fr-FR",
      it: "it-IT",
    };
    const voices = synthRef.current.getVoices();
    for (const [code, bcp] of Object.entries(langMap)) {
      const match = voices.find((v) => v.lang.startsWith(code));
      if (match) {
        utterance.voice = match;
        utterance.lang = bcp;
        break;
      }
    }
    utterance.rate = 0.85;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    synthRef.current.speak(utterance);
  }, [question.audio_text]);

  // ─── Submit handler ────────────────────────────────────────────────
  const handleSubmit = useCallback(() => {
    if (isSubmitted || disabled) return;
    const answer = isMultipleChoice ? selectedOption : textAnswer.trim();
    if (!answer) return;

    setIsSubmitted(true);

    // Check correctness
    const correct =
      answer.trim().toLowerCase() ===
      question.correct_answer.trim().toLowerCase();

    setIsCorrectResult(correct);
    setShowResult(true);

    if (correct) {
      if (soundEnabled) playTone(880, 80);
    } else {
      if (soundEnabled) playTone(220, 150);
      // Shake the wrong option
      if (isMultipleChoice) {
        const wrongIdx = question.options!.findIndex((o) => o === answer);
        setShakeWrongIndex(wrongIdx);
        setTimeout(() => setShakeWrongIndex(null), 500);
      }
    }

    onFeedback?.(correct);
    onSubmit(answer);
  }, [
    isSubmitted,
    disabled,
    isMultipleChoice,
    selectedOption,
    textAnswer,
    question,
    soundEnabled,
    onFeedback,
    onSubmit,
  ]);

  // ─── Keyboard shortcuts ────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isSubmitted) return;

      // MC: 1-4 keys select
      if (isMultipleChoice && question.options) {
        const num = parseInt(e.key);
        if (num >= 1 && num <= question.options.length) {
          e.preventDefault();
          setSelectedOption(question.options[num - 1]);
          return;
        }
      }

      // Enter to submit
      if (e.key === "Enter" && !e.shiftKey) {
        const answer = isMultipleChoice ? selectedOption : textAnswer.trim();
        if (answer) {
          e.preventDefault();
          handleSubmit();
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    isMultipleChoice,
    selectedOption,
    textAnswer,
    isSubmitted,
    question,
    handleSubmit,
  ]);

  // Auto-focus text input
  useEffect(() => {
    if (!isMultipleChoice && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isMultipleChoice, question]);

  const progress = (questionNumber / totalQuestions) * 100;
  const correctAnswerIndex = isMultipleChoice
    ? question.options!.findIndex(
        (o) =>
          o.trim().toLowerCase() ===
          question.correct_answer.trim().toLowerCase(),
      )
    : -1;

  return (
    <motion.div
      key={`q-${questionNumber}`}
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -60 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className="space-y-6"
    >
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-body text-xs" style={{ color: "#718096" }}>
            Question {questionNumber} of {totalQuestions}
          </span>
          <span
            className="font-body text-[11px] px-2.5 py-1 rounded-full flex items-center gap-1.5"
            style={{
              color: categoryColor,
              backgroundColor: `${categoryColor}12`,
              border: `1px solid ${categoryColor}25`,
            }}
          >
            <span>{categoryIcon}</span>
            {categoryLabel}
          </span>
        </div>
        <div
          className="h-1 w-full rounded-full overflow-hidden"
          style={{ background: "rgba(255, 255, 255, 0.05)" }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{
              background: `linear-gradient(90deg, ${categoryColor}80, ${categoryColor})`,
            }}
            initial={{
              width: `${((questionNumber - 1) / totalQuestions) * 100}%`,
            }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          />
        </div>
      </div>

      {/* Question card */}
      <motion.div
        className="rounded-3xl p-6 md:p-8 relative"
        style={{
          background: "rgba(13, 27, 42, 0.7)",
          backdropFilter: "blur(20px)",
          border: `1px solid ${categoryColor}18`,
          boxShadow:
            "0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
        }}
        animate={
          showResult && isCorrectResult
            ? {
                boxShadow: [
                  "0 8px 32px rgba(0, 0, 0, 0.4)",
                  "0 0 40px rgba(16, 185, 129, 0.2)",
                  "0 8px 32px rgba(0, 0, 0, 0.4)",
                ],
              }
            : {}
        }
        transition={{ duration: 0.6 }}
      >
        {/* Question number */}
        <div className="absolute top-4 right-5">
          <span className="font-body text-[10px]" style={{ color: "#718096" }}>
            {questionNumber} / {totalQuestions}
          </span>
        </div>

        {/* Category color bar */}
        <div
          className="h-1 w-10 rounded-full mb-5"
          style={{ backgroundColor: categoryColor, opacity: 0.6 }}
        />

        {/* Listening: play button */}
        {isListening && question.audio_text && (
          <motion.button
            onClick={speak}
            disabled={isSpeaking}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-3 mb-6 px-6 py-4 rounded-2xl cursor-pointer transition-all duration-300"
            style={{
              background: "rgba(61, 214, 181, 0.06)",
              border: "1px solid rgba(61, 214, 181, 0.15)",
            }}
          >
            <motion.div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{
                background: "rgba(61, 214, 181, 0.1)",
                border: "1px solid rgba(61, 214, 181, 0.2)",
              }}
              animate={
                isSpeaking
                  ? {
                      scale: [1, 1.1, 1],
                      boxShadow: [
                        "0 0 0 0 rgba(61,214,181,0)",
                        "0 0 20px 4px rgba(61,214,181,0.2)",
                        "0 0 0 0 rgba(61,214,181,0)",
                      ],
                    }
                  : { scale: [1, 1.05, 1] }
              }
              transition={{ duration: isSpeaking ? 0.8 : 2, repeat: Infinity }}
            >
              <Volume2 className="w-6 h-6" style={{ color: "#3dd6b5" }} />
            </motion.div>
            <span
              className="font-body text-sm font-medium"
              style={{ color: "#3dd6b5" }}
            >
              {isSpeaking ? "Playing…" : "Tap to listen"}
            </span>
          </motion.button>
        )}

        {/* Prompt */}
        <h3
          className="font-body text-xl md:text-2xl font-medium leading-relaxed mb-6"
          style={{ color: "#f7fafc" }}
        >
          {question.prompt}
        </h3>

        {/* Answer area */}
        {isMultipleChoice ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {question.options!.map((option, i) => {
              const isSelected = selectedOption === option;
              const isCorrectOption = i === correctAnswerIndex;
              const isShaking = shakeWrongIndex === i;

              let optionBg = "rgba(255, 255, 255, 0.02)";
              let optionBorder = "rgba(255, 255, 255, 0.08)";
              let optionColor = "#e8d5b0";

              if (showResult) {
                if (isCorrectOption) {
                  optionBg = "rgba(16, 185, 129, 0.12)";
                  optionBorder = "rgba(16, 185, 129, 0.3)";
                  optionColor = "#10B981";
                } else if (isSelected && !isCorrectResult) {
                  optionBg = "rgba(248, 113, 113, 0.1)";
                  optionBorder = "rgba(248, 113, 113, 0.25)";
                  optionColor = "#f87171";
                }
              } else if (isSelected) {
                optionBg = "rgba(61, 214, 181, 0.08)";
                optionBorder = "rgba(61, 214, 181, 0.3)";
                optionColor = "#3dd6b5";
              }

              return (
                <motion.button
                  key={i}
                  onClick={() => {
                    if (!isSubmitted && !disabled) setSelectedOption(option);
                  }}
                  disabled={isSubmitted || disabled}
                  animate={isShaking ? { x: [-6, 6, -4, 4, -2, 2, 0] } : {}}
                  transition={isShaking ? { duration: 0.4 } : {}}
                  whileHover={
                    !isSubmitted ? { y: -2, transition: { duration: 0.2 } } : {}
                  }
                  className="w-full text-left px-5 py-4 rounded-2xl transition-all duration-200 cursor-pointer relative"
                  style={{
                    background: optionBg,
                    border: `1px solid ${optionBorder}`,
                    color: optionColor,
                    opacity:
                      isSubmitted && !isSelected && !isCorrectOption ? 0.4 : 1,
                  }}
                >
                  <span className="flex items-center gap-3 font-body text-sm md:text-base">
                    <span
                      className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                      style={{
                        background: isSelected
                          ? `${optionBorder}`
                          : "rgba(255, 255, 255, 0.05)",
                        color: isSelected ? optionColor : "#718096",
                        border: `1px solid ${isSelected ? optionBorder : "rgba(255,255,255,0.1)"}`,
                      }}
                    >
                      {i + 1}
                    </span>
                    {option}

                    {/* Correctness icons */}
                    {showResult && isCorrectOption && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="ml-auto text-sm"
                      >
                        ✓
                      </motion.span>
                    )}
                    {showResult && isSelected && !isCorrectResult && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="ml-auto text-sm"
                      >
                        ✗
                      </motion.span>
                    )}
                  </span>
                </motion.button>
              );
            })}
          </div>
        ) : (
          /* Free text input */
          <div className="space-y-3">
            {isTranslation ? (
              <textarea
                ref={inputRef as React.Ref<HTMLTextAreaElement>}
                value={textAnswer}
                onChange={(e) => setTextAnswer(e.target.value)}
                disabled={isSubmitted || disabled}
                placeholder="Type your translation…"
                rows={3}
                className="w-full px-5 py-4 rounded-2xl bg-transparent outline-none transition-all duration-300 resize-none font-body text-sm"
                style={{
                  color: "#e8d5b0",
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  boxShadow: "none",
                }}
                onFocus={(e) => {
                  (e.target as HTMLTextAreaElement).style.borderColor =
                    "rgba(61, 214, 181, 0.3)";
                  (e.target as HTMLTextAreaElement).style.boxShadow =
                    "0 0 20px rgba(61, 214, 181, 0.06)";
                }}
                onBlur={(e) => {
                  (e.target as HTMLTextAreaElement).style.borderColor =
                    "rgba(255, 255, 255, 0.08)";
                  (e.target as HTMLTextAreaElement).style.boxShadow = "none";
                }}
              />
            ) : (
              <div className="relative">
                <input
                  ref={inputRef as React.Ref<HTMLInputElement>}
                  type="text"
                  value={textAnswer}
                  onChange={(e) => setTextAnswer(e.target.value)}
                  disabled={isSubmitted || disabled}
                  placeholder="Type your answer…"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && textAnswer.trim()) handleSubmit();
                  }}
                  className="w-full px-0 py-3 bg-transparent outline-none font-body text-lg text-center"
                  style={{
                    color: showResult
                      ? isCorrectResult
                        ? "#10B981"
                        : "#f87171"
                      : "#f7fafc",
                    borderBottom: "2px solid rgba(61, 214, 181, 0.3)",
                  }}
                />
                {/* Animated underline glow */}
                <motion.div
                  className="absolute bottom-0 left-1/2 h-0.5 rounded-full"
                  style={{ background: "#3dd6b5", x: "-50%" }}
                  initial={{ width: 0 }}
                  animate={{ width: textAnswer ? "100%" : "0%" }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            )}

            {/* Show correct answer for wrong text input */}
            {showResult && !isCorrectResult && (
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-body text-sm text-center"
                style={{ color: "#3dd6b5" }}
              >
                Correct: {question.correct_answer}
              </motion.p>
            )}
          </div>
        )}
      </motion.div>

      {/* Submit button */}
      {!isSubmitted && (
        <motion.button
          onClick={handleSubmit}
          disabled={
            disabled ||
            (isMultipleChoice ? !selectedOption : !textAnswer.trim())
          }
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="w-full py-4 rounded-2xl font-body text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all duration-300"
          style={{
            background:
              selectedOption || textAnswer.trim()
                ? "#3dd6b5"
                : "rgba(255, 255, 255, 0.05)",
            color:
              selectedOption || textAnswer.trim()
                ? "#0a0f1e"
                : "rgba(255,255,255,0.3)",
            boxShadow:
              selectedOption || textAnswer.trim()
                ? "0 0 25px rgba(61, 214, 181, 0.2)"
                : "none",
          }}
        >
          <Send className="w-4 h-4" />
          Lock In Answer
        </motion.button>
      )}

      {/* Keyboard hints */}
      {isMultipleChoice && !isSubmitted && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ delay: 1 }}
          className="text-center font-body text-[10px] flex items-center justify-center gap-1.5"
          style={{ color: "#718096" }}
        >
          <Keyboard className="w-3 h-3" />
          1–{question.options!.length} to select, Enter to confirm
        </motion.p>
      )}
    </motion.div>
  );
}
