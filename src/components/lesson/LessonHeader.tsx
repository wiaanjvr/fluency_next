"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lesson, LessonPhase, LESSON_PHASE_ORDER } from "@/types/lesson";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Headphones,
  MessageCircle,
  MessagesSquare,
  Eye,
  Brain,
  GraduationCap,
  RefreshCw,
  Sparkles,
  FileText,
  Lightbulb,
  Target,
  Mic,
  TrendingUp,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LessonHeaderProps {
  lesson: Lesson;
  currentPhase: LessonPhase;
  progress: number;
  onExit: () => void;
}

// Extended type to include both new and legacy phases
type PhaseConfig = { icon: React.ElementType; label: string; color: string };

const PHASE_CONFIG: Record<LessonPhase, PhaseConfig> = {
  // New 10-phase structure
  "spaced-retrieval-warmup": {
    icon: RefreshCw,
    label: "Warmup",
    color: "text-cyan-500",
  },
  "prediction-stage": {
    icon: Sparkles,
    label: "Predict",
    color: "text-yellow-500",
  },
  "audio-text": {
    icon: Headphones,
    label: "Listen",
    color: "text-ocean-turquoise",
  },
  "first-recall": {
    icon: MessageCircle,
    label: "Recall",
    color: "text-ocean-teal",
  },
  "transcript-reveal": {
    icon: FileText,
    label: "Read",
    color: "text-emerald-500",
  },
  "guided-noticing": {
    icon: Lightbulb,
    label: "Notice",
    color: "text-orange-500",
  },
  "micro-drills": {
    icon: Target,
    label: "Drills",
    color: "text-red-500",
  },
  shadowing: {
    icon: Mic,
    label: "Shadow",
    color: "text-ocean-turquoise",
  },
  "second-recall": {
    icon: MessagesSquare,
    label: "Retell",
    color: "text-indigo-500",
  },
  "progress-reflection": {
    icon: TrendingUp,
    label: "Reflect",
    color: "text-purple-500",
  },
  // Legacy 6-phase structure
  "audio-comprehension": {
    icon: Headphones,
    label: "Listen",
    color: "text-ocean-turquoise",
  },
  "verbal-check": {
    icon: MessageCircle,
    label: "Speak",
    color: "text-ocean-teal",
  },
  "conversation-feedback": {
    icon: MessagesSquare,
    label: "Converse",
    color: "text-violet-500",
  },
  "text-reveal": {
    icon: Eye,
    label: "Read",
    color: "text-emerald-500",
  },
  "interactive-exercises": {
    icon: Brain,
    label: "Practice",
    color: "text-amber-500",
  },
  "final-assessment": {
    icon: GraduationCap,
    label: "Assess",
    color: "text-purple-500",
  },
};

// Legacy phase order
const LEGACY_PHASE_ORDER: LessonPhase[] = [
  "audio-comprehension",
  "verbal-check",
  "conversation-feedback",
  "text-reveal",
  "interactive-exercises",
  "final-assessment",
];

export function LessonHeader({
  lesson,
  currentPhase,
  progress,
  onExit,
}: LessonHeaderProps) {
  const phaseOrder: LessonPhase[] = lesson.content
    ? [...LESSON_PHASE_ORDER]
    : LEGACY_PHASE_ORDER;
  const currentIndex = phaseOrder.indexOf(currentPhase);
  const config = PHASE_CONFIG[currentPhase];
  const Icon = config?.icon || Brain;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/50">
      <div className="max-w-4xl mx-auto px-6">
        {/* Top Row */}
        <div className="flex items-center justify-between h-16">
          {/* Exit Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onExit}
            className="gap-2 text-muted-foreground hover:text-foreground -ml-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline font-light">Exit</span>
          </Button>

          {/* Current Phase Indicator */}
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center bg-ocean-turquoise/10",
              )}
            >
              <Icon
                className={cn("h-4 w-4", config?.color || "text-ocean-turquoise")}
              />
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium">{config?.label}</p>
              <p className="text-xs text-muted-foreground font-light">
                Step {currentIndex + 1} of {phaseOrder.length}
              </p>
            </div>
          </div>

          {/* Level Badge */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-ocean-turquoise font-light px-3 py-1 rounded-full bg-ocean-turquoise/10">
              {lesson.level}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="pb-4">
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-ocean-turquoise rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Phase Steps - Minimal */}
        <div className="flex items-center justify-between gap-1 pb-4 overflow-x-auto scrollbar-hide">
          {phaseOrder.map((phase, index) => {
            const phaseConfig = PHASE_CONFIG[phase];
            const isActive = index === currentIndex;
            const isCompleted = index < currentIndex;

            return (
              <div
                key={phase}
                className={cn(
                  "flex-1 h-1 rounded-full transition-all duration-300",
                  isCompleted && "bg-ocean-turquoise",
                  isActive && "bg-ocean-turquoise/50",
                  !isActive && !isCompleted && "bg-muted",
                )}
              />
            );
          })}
        </div>
      </div>
    </header>
  );
}
