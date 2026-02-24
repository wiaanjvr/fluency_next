"use client";

import { motion } from "framer-motion";
import { Check, X, ArrowRight } from "lucide-react";

interface FeedbackPanelProps {
  isCorrect: boolean;
  correctAnswer: string;
  explanation?: string;
  onContinue: () => void;
}

export default function FeedbackPanel({
  isCorrect,
  correctAnswer,
  explanation,
  onContinue,
}: FeedbackPanelProps) {
  return (
    <motion.div
      initial={{ y: "100%", opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: "100%", opacity: 0 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      className="fixed bottom-0 left-0 right-0 z-50"
    >
      {/* Top edge tint */}
      <div
        className="h-1 w-full"
        style={{
          background: isCorrect
            ? "linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.5), transparent)"
            : "linear-gradient(90deg, transparent, rgba(248, 113, 113, 0.5), transparent)",
        }}
      />

      <div
        className="px-6 py-6 md:px-12 md:py-8"
        style={{
          background: "rgba(13, 27, 42, 0.95)",
          backdropFilter: "blur(30px)",
          borderTop: isCorrect
            ? "1px solid rgba(16, 185, 129, 0.15)"
            : "1px solid rgba(248, 113, 113, 0.15)",
        }}
      >
        <div className="max-w-xl mx-auto flex flex-col gap-3">
          {/* Icon + status */}
          <div className="flex items-center gap-3">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 20,
                delay: 0.1,
              }}
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background: isCorrect
                  ? "rgba(16, 185, 129, 0.15)"
                  : "rgba(248, 113, 113, 0.15)",
                border: isCorrect
                  ? "1px solid rgba(16, 185, 129, 0.3)"
                  : "1px solid rgba(248, 113, 113, 0.3)",
              }}
            >
              {isCorrect ? (
                <Check className="w-5 h-5" style={{ color: "#10B981" }} />
              ) : (
                <X className="w-5 h-5" style={{ color: "#f87171" }} />
              )}
            </motion.div>

            <div className="flex-1">
              <h3
                className="font-display text-2xl font-bold"
                style={{
                  color: isCorrect ? "#10B981" : "#f87171",
                }}
              >
                {isCorrect ? "Correct!" : "Not quite."}
              </h3>
            </div>
          </div>

          {/* Correct answer if wrong */}
          {!isCorrect && (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="font-body text-sm"
              style={{ color: "#3dd6b5" }}
            >
              Correct answer: {correctAnswer}
            </motion.p>
          )}

          {/* Explanation */}
          {explanation && (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="font-body text-sm leading-relaxed"
              style={{ color: "#e8d5b0" }}
            >
              {explanation}
            </motion.p>
          )}

          {/* Continue button */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            onClick={onContinue}
            className="self-end flex items-center gap-2 px-6 py-3 rounded-full font-body text-sm font-semibold cursor-pointer transition-all duration-300 mt-1"
            style={{
              background: isCorrect
                ? "rgba(16, 185, 129, 0.15)"
                : "rgba(248, 113, 113, 0.15)",
              color: isCorrect ? "#10B981" : "#f87171",
              border: isCorrect
                ? "1px solid rgba(16, 185, 129, 0.25)"
                : "1px solid rgba(248, 113, 113, 0.25)",
            }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            Continue
            <ArrowRight className="w-4 h-4" />
          </motion.button>

          <p
            className="text-center font-body text-[10px] mt-1"
            style={{ color: "#718096" }}
          >
            Press Enter or Space to continue
          </p>
        </div>
      </div>
    </motion.div>
  );
}
