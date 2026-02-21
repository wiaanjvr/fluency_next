"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, ArrowRight, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import type { ExerciseResult } from "@/types/grammar.types";

interface ExerciseCompleteProps {
  lessonTitle: string;
  results: ExerciseResult[];
  score: number;
  total: number;
  languageCode: string;
  onRetry?: () => void;
}

export function ExerciseComplete({
  lessonTitle,
  results,
  score,
  total,
  languageCode,
  onRetry,
}: ExerciseCompleteProps) {
  const percentage = Math.round((score / total) * 100);
  const isPerfect = score === total;
  const isGood = percentage >= 70;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
      {/* Bubbles animation */}
      <div className="relative w-full max-w-md h-40 overflow-hidden">
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-ocean-turquoise/20"
            style={{
              width: 8 + Math.random() * 16,
              height: 8 + Math.random() * 16,
              left: `${10 + Math.random() * 80}%`,
              bottom: 0,
            }}
            animate={{
              y: [-10, -160],
              opacity: [0.6, 0],
              scale: [1, 0.5],
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
              ease: "easeOut",
            }}
          />
        ))}

        {/* Score circle */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.2, bounce: 0.5 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div
            className={cn(
              "w-28 h-28 rounded-full flex flex-col items-center justify-center",
              isPerfect
                ? "bg-feedback-success/20 border-4 border-feedback-success"
                : isGood
                  ? "bg-ocean-turquoise/20 border-4 border-ocean-turquoise"
                  : "bg-feedback-error/20 border-4 border-feedback-error",
            )}
          >
            <span className="text-3xl font-bold">
              {score}/{total}
            </span>
            <span className="text-xs text-muted-foreground">correct</span>
          </div>
        </motion.div>
      </div>

      {/* Completion message */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-center space-y-2"
      >
        <div className="flex items-center justify-center gap-2">
          <CheckCircle2 className="w-6 h-6 text-feedback-success" />
          <h2 className="text-xl font-medium">Lesson Complete!</h2>
        </div>
        <p className="text-muted-foreground font-light">
          You&apos;ve completed:{" "}
          <span className="font-medium text-foreground">{lessonTitle}</span>
        </p>
        {isPerfect && (
          <p className="text-feedback-success font-medium">🎉 Perfect score!</p>
        )}
      </motion.div>

      {/* Result summary cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="w-full max-w-md"
      >
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-feedback-success">
                  {score}
                </p>
                <p className="text-xs text-muted-foreground">Correct</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-feedback-error">
                  {total - score}
                </p>
                <p className="text-xs text-muted-foreground">Incorrect</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{percentage}%</p>
                <p className="text-xs text-muted-foreground">Score</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Action buttons */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="flex items-center gap-4"
      >
        {onRetry && !isPerfect && (
          <Button variant="outline" onClick={onRetry} className="rounded-xl">
            <RotateCcw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        )}
        <Link href={`/grammar/${languageCode}`}>
          <Button className="rounded-xl bg-ocean-turquoise hover:bg-ocean-turquoise-dark text-white">
            Back to Grammar Hub
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </motion.div>
    </div>
  );
}
