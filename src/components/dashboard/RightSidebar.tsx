"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Circle,
  Lock,
  Star,
  TrendingUp,
  Target,
} from "lucide-react";
import { generateProgressPath, getNextMilestone } from "@/lib/progression";

interface RightSidebarProps {
  wordCount: number;
  className?: string;
}

export function RightSidebar({ wordCount, className }: RightSidebarProps) {
  const progressPath = useMemo(
    () => generateProgressPath(wordCount),
    [wordCount],
  );
  const nextMilestone = getNextMilestone(wordCount);

  const milestones = [
    { count: 0, label: "Start", phase: "Begin", icon: Circle },
    { count: 100, label: "Foundation", phase: "Phase 0", icon: CheckCircle2 },
    { count: 300, label: "Sentences", phase: "Phase 1", icon: CheckCircle2 },
    { count: 500, label: "Stories", phase: "Phase 2", icon: CheckCircle2 },
    { count: 1000, label: "Mastery", phase: "Phase 3", icon: Star },
  ];

  return (
    <aside
      className={cn(
        "w-80 bg-card border-l border-border/30 flex flex-col h-screen sticky top-0",
        className,
      )}
    >
      {/* Header */}
      <div className="p-6 relative after:absolute after:bottom-0 after:left-4 after:right-4 after:h-px after:bg-gradient-to-r after:from-transparent after:via-border/50 after:to-transparent">
        <div className="flex items-center gap-2 mb-2">
          <Target className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Learning Roadmap</h2>
        </div>
        <p className="text-sm text-muted-foreground">Your journey to fluency</p>
      </div>

      {/* Current Progress */}
      <div className="p-6 bg-primary/5 relative after:absolute after:bottom-0 after:left-4 after:right-4 after:h-px after:bg-gradient-to-r after:from-transparent after:via-border/50 after:to-transparent">
        <div className="text-center">
          <div className="text-4xl font-bold text-primary mb-1">
            {wordCount}
          </div>
          <div className="text-sm text-muted-foreground mb-4">
            Words Learned
          </div>
          {nextMilestone && (
            <div className="flex items-center justify-center gap-2 text-sm">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span>
                <strong>{nextMilestone.wordTarget - wordCount}</strong> to{" "}
                {nextMilestone.title}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Roadmap Visualization */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="space-y-6">
          {milestones.map((milestone, index) => {
            const isCompleted = wordCount >= milestone.count;
            const isCurrent =
              wordCount >= milestone.count &&
              (index === milestones.length - 1 ||
                wordCount < milestones[index + 1].count);
            const isLocked = wordCount < milestone.count;

            const Icon = milestone.icon;

            return (
              <div key={milestone.count} className="relative">
                {/* Connecting line */}
                {index < milestones.length - 1 && (
                  <div
                    className={cn(
                      "absolute left-[19px] top-10 w-0.5 h-[calc(100%+8px)]",
                      isCompleted ? "bg-primary" : "bg-border",
                    )}
                  />
                )}

                {/* Milestone Node */}
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center relative z-10 transition-all duration-300 shrink-0",
                      isCompleted
                        ? "bg-primary text-primary-foreground"
                        : isLocked
                          ? "bg-muted text-muted-foreground"
                          : "bg-card border-2 border-primary text-primary",
                      isCurrent && "ring-4 ring-primary/30 scale-110",
                    )}
                  >
                    {isLocked ? (
                      <Lock className="w-5 h-5" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 pt-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3
                        className={cn(
                          "font-semibold",
                          isCompleted
                            ? "text-foreground"
                            : "text-muted-foreground",
                        )}
                      >
                        {milestone.label}
                      </h3>
                      {isCurrent && (
                        <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full font-medium">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mb-2">
                      {milestone.phase} • {milestone.count} words
                    </div>

                    {/* Progress bar for current milestone */}
                    {isCurrent &&
                      nextMilestone &&
                      index < milestones.length - 1 && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                            <span>Progress</span>
                            <span>{progressPath.progressToNext}%</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all duration-500"
                              style={{
                                width: `${progressPath.progressToNext}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}

                    {/* Completion indicator */}
                    {isCompleted && !isCurrent && (
                      <div className="flex items-center gap-1.5 text-xs text-primary mt-2">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Completed</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Motivational message */}
        <div className="mt-8 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground text-center italic">
            {wordCount === 0
              ? "Begin your journey to fluency today!"
              : wordCount < 100
                ? "Great start! Keep building your foundation."
                : wordCount < 300
                  ? "You're making excellent progress!"
                  : wordCount < 500
                    ? "Halfway there! Keep up the momentum."
                    : wordCount < 1000
                      ? "Almost at mastery level. You're doing amazing!"
                      : "Congratulations! You've achieved mastery! 🎉"}
          </p>
        </div>
      </div>
    </aside>
  );
}
