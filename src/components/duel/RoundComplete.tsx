"use client";

import { motion } from "framer-motion";
import { Star, ArrowRight } from "lucide-react";
import type { DuelQuestion, DuelCategory } from "@/types/duel";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "@/types/duel";

interface RoundCompleteProps {
  score: number;
  totalQuestions: number;
  questions: DuelQuestion[];
  results: boolean[];
  answers: Record<number, string>;
  onReturn: () => void;
}

export default function RoundComplete({
  score,
  totalQuestions,
  questions,
  results,
  answers,
  onReturn,
}: RoundCompleteProps) {
  const stars = score >= 5 ? 3 : score >= 3 ? 2 : 1;

  const subheading =
    score === totalQuestions
      ? "Flawless. You owned the deep."
      : score >= 5
        ? `You surfaced with ${score} correct answers.`
        : score >= 3
          ? `You surfaced with ${score} correct answers. Keep pushing.`
          : `You surfaced with ${score} correct answers. The deep demands more.`;

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="max-w-lg w-full text-center">
        {/* Animated depth gauge / score */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            type: "spring",
            stiffness: 200,
            damping: 20,
            delay: 0.2,
          }}
          className="mx-auto mb-6"
        >
          {/* Circular score display */}
          <div className="relative w-40 h-40 mx-auto">
            <svg viewBox="0 0 120 120" className="w-full h-full">
              {/* Background circle */}
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="6"
              />
              {/* Score arc */}
              <motion.circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke="#3dd6b5"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${(score / totalQuestions) * 327} 327`}
                strokeDashoffset="0"
                transform="rotate(-90 60 60)"
                initial={{ strokeDasharray: "0 327" }}
                animate={{
                  strokeDasharray: `${(score / totalQuestions) * 327} 327`,
                }}
                transition={{
                  duration: 1.5,
                  ease: [0.4, 0, 0.2, 1],
                  delay: 0.5,
                }}
                style={{
                  filter: "drop-shadow(0 0 8px rgba(61, 214, 181, 0.4))",
                }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span
                className="font-display text-5xl font-bold"
                style={{ color: "#f7fafc" }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
              >
                {score}
              </motion.span>
              <motion.span
                className="font-body text-sm"
                style={{ color: "#718096" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
              >
                / {totalQuestions}
              </motion.span>
            </div>
          </div>
        </motion.div>

        {/* Stars */}
        <div className="flex justify-center gap-2 mb-4">
          {[1, 2, 3].map((star) => (
            <motion.div
              key={star}
              initial={{ scale: 0, rotate: -180 }}
              animate={{
                scale: star <= stars ? 1 : 0.5,
                rotate: 0,
                opacity: star <= stars ? 1 : 0.2,
              }}
              transition={{
                type: "spring",
                stiffness: 250,
                damping: 15,
                delay: 1.0 + star * 0.2,
              }}
            >
              <Star
                className="w-8 h-8"
                fill={star <= stars ? "#F59E0B" : "transparent"}
                style={{
                  color: star <= stars ? "#F59E0B" : "#718096",
                  filter:
                    star <= stars
                      ? "drop-shadow(0 0 6px rgba(245, 158, 11, 0.5))"
                      : "none",
                }}
              />
            </motion.div>
          ))}
        </div>

        {/* Subheading */}
        <motion.p
          className="font-body text-base mb-8"
          style={{ color: "#e8d5b0" }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5 }}
        >
          {subheading}
        </motion.p>

        {/* Category breakdown */}
        <motion.div
          className="space-y-2 mb-8 text-left"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8 }}
        >
          {questions.map((q, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.8 + i * 0.06, ease: [0.4, 0, 0.2, 1] }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{
                background: results[i]
                  ? "rgba(16, 185, 129, 0.06)"
                  : "rgba(248, 113, 113, 0.06)",
                border: results[i]
                  ? "1px solid rgba(16, 185, 129, 0.1)"
                  : "1px solid rgba(248, 113, 113, 0.1)",
              }}
            >
              {/* Result icon */}
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: results[i]
                    ? "rgba(16, 185, 129, 0.2)"
                    : "rgba(248, 113, 113, 0.2)",
                }}
              >
                <span
                  className="text-xs font-bold"
                  style={{ color: results[i] ? "#10B981" : "#f87171" }}
                >
                  {results[i] ? "✓" : "✗"}
                </span>
              </div>

              {/* Category chip */}
              <span
                className="font-body text-[10px] px-2 py-0.5 rounded-full flex-shrink-0"
                style={{
                  color: CATEGORY_COLORS[q.category as DuelCategory],
                  background: `${CATEGORY_COLORS[q.category as DuelCategory]}15`,
                }}
              >
                {CATEGORY_LABELS[q.category as DuelCategory]}
              </span>

              {/* Question preview */}
              <span
                className="font-body text-xs truncate flex-1"
                style={{ color: "#e8d5b0" }}
              >
                {q.prompt}
              </span>

              {/* Incorrect: show correct answer */}
              {!results[i] && (
                <span
                  className="font-body text-[10px] flex-shrink-0"
                  style={{ color: "#3dd6b5" }}
                >
                  {q.correct_answer}
                </span>
              )}
            </motion.div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.button
          onClick={onReturn}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.2 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-body text-base font-semibold cursor-pointer transition-all duration-300"
          style={{
            background: "#3dd6b5",
            color: "#0a0f1e",
            boxShadow: "0 0 30px rgba(61, 214, 181, 0.2)",
          }}
        >
          Return to Duel
          <ArrowRight className="w-5 h-5" />
        </motion.button>
      </div>
    </div>
  );
}
