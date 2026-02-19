"use client";

import React from "react";
import { Lesson, LessonPhase, LESSON_PHASE_ORDER } from "@/types/lesson";
import { ArrowLeft, X } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// Session Header — Minimal, immersive
// No step counters. No phase labels. Just a tide line and depth indicator.
// ============================================================================

interface LessonHeaderProps {
  lesson: Lesson;
  currentPhase: LessonPhase;
  progress: number;
  onExit: () => void;
}

export function LessonHeader({
  lesson,
  currentPhase,
  progress,
  onExit,
}: LessonHeaderProps) {
  return (
    <header
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        background: "rgba(10, 15, 30, 0.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
    >
      <div className="max-w-3xl mx-auto px-6">
        <div className="flex items-center justify-between h-14">
          {/* Exit */}
          <button
            onClick={onExit}
            className="flex items-center gap-2 transition-opacity hover:opacity-100 opacity-60"
            style={{ color: "var(--seafoam)" }}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-body hidden sm:inline">Surface</span>
          </button>

          {/* Depth indicator */}
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{
                background: "var(--turquoise)",
                boxShadow: "0 0 6px rgba(61, 214, 181, 0.4)",
              }}
            />
            <span
              className="text-sm font-body"
              style={{ color: "var(--sand)", opacity: 0.7 }}
            >
              {lesson.level}
            </span>
          </div>

          {/* Close */}
          <button
            onClick={onExit}
            className="transition-opacity hover:opacity-100 opacity-40"
            style={{ color: "var(--seafoam)" }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tide line progress */}
        <div
          className="h-px w-full"
          style={{ background: "rgba(255, 255, 255, 0.05)" }}
        >
          <div
            className="h-full transition-all duration-700 ease-out"
            style={{
              width: `${progress}%`,
              background:
                "linear-gradient(90deg, var(--surface-teal), var(--turquoise))",
            }}
          />
        </div>
      </div>
    </header>
  );
}
