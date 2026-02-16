"use client";

import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ProgressBar } from "@/components/ui/premium-components";
import {
  ProgressMilestone,
  GraduationStatus,
  UnlockableFeature,
  LearningStats,
  ProgressPath,
} from "@/types/progression";
import {
  generateProgressPath,
  getNextMilestone,
  getCurrentMilestone,
  getUpcomingFeatures,
  getUnlockedFeatures,
  GRADUATION_THRESHOLDS,
} from "@/lib/progression";
import {
  Lock,
  Unlock,
  Trophy,
  Star,
  Sparkles,
  Volume2,
  BookOpen,
  Target,
  Gamepad2,
  GraduationCap,
  Zap,
  BookMarked,
  Edit3,
  CheckCircle2,
  Circle,
  ChevronRight,
  TrendingUp,
  Clock,
  Flame,
} from "lucide-react";

// ============================================================================
// PROGRESS PATH COMPONENT
// Visual journey from 0 → 100 → 300 → 500 → 1000+ words
// ============================================================================

interface ProgressPathVisualizerProps {
  wordCount: number;
  className?: string;
}

export function ProgressPathVisualizer({
  wordCount,
  className,
}: ProgressPathVisualizerProps) {
  const progressPath = useMemo(
    () => generateProgressPath(wordCount),
    [wordCount],
  );
  const nextMilestone = getNextMilestone(wordCount);
  const currentMilestone = getCurrentMilestone(wordCount);

  // Compact milestone display
  const displayNodes = progressPath.nodes.filter(
    (n) => n.wordCount === 0 || n.milestone,
  );

  return (
    <div
      className={cn("bg-card border border-border rounded-3xl p-6", className)}
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-medium">Your Learning Journey</h3>
          <p className="text-sm text-muted-foreground">
            {nextMilestone
              ? `${nextMilestone.wordTarget - wordCount} words to ${nextMilestone.title}`
              : "All milestones achieved!"}
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-light text-ocean-turquoise">
            {wordCount}
          </div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider">
            words learned
          </div>
        </div>
      </div>

      {/* Progress Path */}
      <div className="relative">
        {/* Connection line */}
        <div className="absolute top-4 left-4 right-4 h-0.5 bg-border" />
        <div
          className="absolute top-4 left-4 h-0.5 bg-ocean-turquoise transition-all duration-500"
          style={{
            width: `${Math.min(100, (wordCount / 1000) * 100)}%`,
            maxWidth: "calc(100% - 2rem)",
          }}
        />

        {/* Nodes */}
        <div className="relative flex justify-between">
          {displayNodes.map((node, index) => {
            const isActive = node.isCompleted;
            const isCurrent =
              wordCount >= node.wordCount &&
              (index === displayNodes.length - 1 ||
                wordCount < displayNodes[index + 1].wordCount);

            return (
              <div
                key={node.wordCount}
                className="flex flex-col items-center"
                style={{
                  flex:
                    index === 0 || index === displayNodes.length - 1
                      ? "0 0 auto"
                      : "1",
                }}
              >
                {/* Node circle */}
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center relative z-10 transition-all duration-300",
                    isActive
                      ? "bg-ocean-turquoise text-background"
                      : "bg-card border-2 border-border text-muted-foreground",
                    isCurrent && "ring-4 ring-ocean-turquoise/30 scale-110",
                  )}
                >
                  {node.milestone?.badge ? (
                    <span className="text-sm">{node.milestone.badge}</span>
                  ) : isActive ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <Circle className="w-4 h-4" />
                  )}
                </div>

                {/* Label */}
                <div className="mt-2 text-center">
                  <div
                    className={cn(
                      "text-xs font-medium",
                      isActive ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {node.wordCount}
                  </div>
                  {node.milestone && (
                    <div className="text-[10px] text-muted-foreground mt-0.5 max-w-[60px] truncate">
                      {node.milestone.title}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Progress to next milestone */}
      {nextMilestone && (
        <div className="mt-6">
          <ProgressBar
            value={progressPath.progressToNext}
            max={100}
            label={`Progress to ${nextMilestone.title}`}
            valueLabel={`${progressPath.progressToNext}%`}
            size="sm"
          />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// FEATURE UNLOCK COMPONENT
// Shows locked/unlocked features based on progress
// ============================================================================

const FEATURE_ICONS: Record<UnlockableFeature, typeof Lock> = {
  "audio-speed-control": Volume2,
  "micro-stories": BookOpen,
  "story-themes": Target,
  "comprehension-challenges": Gamepad2,
  "acquisition-mode": GraduationCap,
  "advanced-stories": Zap,
  "sentence-mining": BookMarked,
  "custom-vocabulary": Edit3,
};

const FEATURE_LABELS: Record<UnlockableFeature, string> = {
  "audio-speed-control": "Audio Speed Control",
  "micro-stories": "Micro Stories",
  "story-themes": "Story Themes",
  "comprehension-challenges": "Comprehension Challenges",
  "acquisition-mode": "Acquisition Mode",
  "advanced-stories": "Advanced Stories",
  "sentence-mining": "Sentence Mining",
  "custom-vocabulary": "Custom Vocabulary",
};

const FEATURE_DESCRIPTIONS: Record<UnlockableFeature, string> = {
  "audio-speed-control": "Adjust playback speed to match your comfort level",
  "micro-stories": "Short, engaging stories using your known vocabulary",
  "story-themes": "Choose themes that interest you for personalized content",
  "comprehension-challenges": "Test your understanding with interactive games",
  "acquisition-mode": "The main learning experience with comprehensible input",
  "advanced-stories": "Complex narratives for deeper immersion",
  "sentence-mining": "Save and review sentences you encounter",
  "custom-vocabulary": "Add your own words to track",
};

interface FeatureUnlockCardProps {
  feature: UnlockableFeature;
  isUnlocked: boolean;
  wordsNeeded?: number;
  className?: string;
}

function FeatureUnlockCard({
  feature,
  isUnlocked,
  wordsNeeded,
  className,
}: FeatureUnlockCardProps) {
  const Icon = FEATURE_ICONS[feature];

  return (
    <div
      className={cn(
        "flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300",
        isUnlocked
          ? "bg-ocean-turquoise/5 border-ocean-turquoise/30"
          : "bg-card border-border opacity-60",
        className,
      )}
    >
      <div
        className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center",
          isUnlocked
            ? "bg-ocean-turquoise/20 text-ocean-turquoise"
            : "bg-muted text-muted-foreground",
        )}
      >
        {isUnlocked ? (
          <Icon className="w-5 h-5" />
        ) : (
          <Lock className="w-4 h-4" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "font-medium text-sm",
              isUnlocked ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {FEATURE_LABELS[feature]}
          </span>
          {isUnlocked && <Unlock className="w-3 h-3 text-ocean-turquoise" />}
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {isUnlocked
            ? FEATURE_DESCRIPTIONS[feature]
            : `${wordsNeeded} more words to unlock`}
        </p>
      </div>
    </div>
  );
}

interface FeatureUnlocksGridProps {
  wordCount: number;
  className?: string;
}

export function FeatureUnlocksGrid({
  wordCount,
  className,
}: FeatureUnlocksGridProps) {
  const unlockedFeatures = getUnlockedFeatures(wordCount);
  const upcomingFeatures = getUpcomingFeatures(wordCount);

  // Get all unique features
  const allFeatures: UnlockableFeature[] = [
    "audio-speed-control",
    "micro-stories",
    "custom-vocabulary",
    "story-themes",
    "comprehension-challenges",
    "acquisition-mode",
    "sentence-mining",
    "advanced-stories",
  ];

  return (
    <div
      className={cn("bg-card border border-border rounded-3xl p-6", className)}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">Features</h3>
        <span className="text-xs text-muted-foreground">
          {unlockedFeatures.length} / {allFeatures.length} unlocked
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {allFeatures.map((feature) => {
          const isUnlocked = unlockedFeatures.includes(feature);
          const upcoming = upcomingFeatures.find((u) => u.feature === feature);

          return (
            <FeatureUnlockCard
              key={feature}
              feature={feature}
              isUnlocked={isUnlocked}
              wordsNeeded={upcoming?.wordsNeeded}
            />
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// GRADUATION STATUS COMPONENT
// Shows progress toward main app graduation
// ============================================================================

interface GraduationStatusCardProps {
  graduationStatus: GraduationStatus;
  className?: string;
}

export function GraduationStatusCard({
  graduationStatus,
  className,
}: GraduationStatusCardProps) {
  const { isReady, overallProgress, requirements, recommendedActions } =
    graduationStatus;

  return (
    <div
      className={cn(
        "bg-card border rounded-3xl p-6 transition-all duration-300",
        isReady ? "border-ocean-turquoise bg-ocean-turquoise/5" : "border-border",
        className,
      )}
    >
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <GraduationCap
              className={cn(
                "w-5 h-5",
                isReady ? "text-ocean-turquoise" : "text-muted-foreground",
              )}
            />
            <h3 className="text-lg font-medium">
              {isReady ? "Ready to Graduate!" : "Graduation Progress"}
            </h3>
          </div>
          <p className="text-sm text-muted-foreground">
            {isReady
              ? "You've met all requirements for the main learning experience"
              : `Complete all requirements to unlock acquisition mode`}
          </p>
        </div>
        <div
          className={cn(
            "text-2xl font-light",
            isReady ? "text-ocean-turquoise" : "text-foreground",
          )}
        >
          {overallProgress}%
        </div>
      </div>

      {/* Requirements grid */}
      <div className="space-y-4 mb-6">
        {requirements.map((req) => (
          <div key={req.id} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                {req.isMet ? (
                  <CheckCircle2 className="w-4 h-4 text-ocean-turquoise" />
                ) : (
                  <Circle className="w-4 h-4 text-muted-foreground" />
                )}
                <span
                  className={cn(
                    req.isMet ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {req.name}
                </span>
              </div>
              <span
                className={cn(
                  "font-medium",
                  req.isMet ? "text-ocean-turquoise" : "text-muted-foreground",
                )}
              >
                {Math.round(req.currentValue)} / {req.targetValue}
                {req.category !== "vocabulary" && "%"}
              </span>
            </div>
            <ProgressBar
              value={req.currentValue}
              max={req.targetValue}
              size="sm"
              accent={req.isMet}
              showShine={false}
            />
          </div>
        ))}
      </div>

      {/* Recommendations */}
      {!isReady && recommendedActions.length > 0 && (
        <div className="pt-4 border-t border-border">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            RECOMMENDED ACTIONS
          </p>
          <ul className="space-y-1">
            {recommendedActions.slice(0, 2).map((action, i) => (
              <li
                key={i}
                className="text-sm text-muted-foreground flex items-center gap-2"
              >
                <ChevronRight className="w-3 h-3" />
                {action}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Ready to graduate button */}
      {isReady && (
        <button className="w-full mt-4 py-3 bg-ocean-turquoise text-background font-medium rounded-xl hover:bg-ocean-turquoise/90 transition-colors flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4" />
          Start Acquisition Mode
        </button>
      )}
    </div>
  );
}

// ============================================================================
// LEARNING STATS COMPONENT
// Explicit progress metrics display
// ============================================================================

interface LearningStatsCardProps {
  stats: LearningStats;
  className?: string;
}

export function LearningStatsCard({
  stats,
  className,
}: LearningStatsCardProps) {
  return (
    <div
      className={cn("bg-card border border-border rounded-3xl p-6", className)}
    >
      <h3 className="text-lg font-medium mb-4">Today's Progress</h3>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-muted/50 rounded-xl p-4 text-center">
          <div className="text-2xl font-light text-ocean-turquoise">
            {stats.wordsLearnedToday}
          </div>
          <div className="text-xs text-muted-foreground">Words Learned</div>
        </div>
        <div className="bg-muted/50 rounded-xl p-4 text-center">
          <div className="text-2xl font-light text-ocean-turquoise">
            {stats.wordsReviewedToday}
          </div>
          <div className="text-xs text-muted-foreground">Words Reviewed</div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Average Retention
          </span>
          <span className="font-medium">{stats.averageRetentionRate}%</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Days to Next Milestone
          </span>
          <span className="font-medium">
            {stats.estimatedDaysToNextMilestone < 999
              ? `~${stats.estimatedDaysToNextMilestone} days`
              : "—"}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground flex items-center gap-2">
            <Flame className="w-4 h-4" />
            Current Streak
          </span>
          <span className="font-medium">{stats.currentStreak} days</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MILESTONE CELEBRATION COMPONENT
// Toast/modal for celebrating new milestones
// ============================================================================

interface MilestoneCelebrationProps {
  milestone: ProgressMilestone;
  onClose: () => void;
  className?: string;
}

export function MilestoneCelebration({
  milestone,
  onClose,
  className,
}: MilestoneCelebrationProps) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in",
        className,
      )}
      onClick={onClose}
    >
      <div
        className="bg-card border border-ocean-turquoise/30 rounded-3xl p-8 max-w-md mx-4 text-center shadow-2xl animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Badge */}
        <div className="w-20 h-20 mx-auto mb-4 bg-ocean-turquoise/20 rounded-full flex items-center justify-center">
          <span className="text-4xl">{milestone.badge}</span>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-medium mb-2">{milestone.title}</h2>
        <p className="text-lg text-ocean-turquoise mb-4">
          {milestone.wordTarget} words mastered!
        </p>

        {/* Message */}
        <p className="text-muted-foreground mb-6">
          {milestone.celebrationMessage}
        </p>

        {/* Unlocked features */}
        {milestone.unlockedFeatures.length > 0 && (
          <div className="bg-muted/50 rounded-xl p-4 mb-6">
            <p className="text-xs font-medium text-muted-foreground mb-3">
              NEW FEATURES UNLOCKED
            </p>
            <div className="space-y-2">
              {milestone.unlockedFeatures.map((feature) => (
                <div
                  key={feature}
                  className="flex items-center gap-2 text-sm text-foreground"
                >
                  <Unlock className="w-4 h-4 text-ocean-turquoise" />
                  {FEATURE_LABELS[feature]}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Close button */}
        <button
          onClick={onClose}
          className="w-full py-3 bg-ocean-turquoise text-background font-medium rounded-xl hover:bg-ocean-turquoise/90 transition-colors"
        >
          Continue Learning
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN PROGRESSION DASHBOARD COMPONENT
// Combines all progression visualizations
// ============================================================================

interface ProgressionDashboardProps {
  wordCount: number;
  graduationStatus: GraduationStatus;
  stats: LearningStats;
  className?: string;
}

export function ProgressionDashboard({
  wordCount,
  graduationStatus,
  stats,
  className,
}: ProgressionDashboardProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Progress Path */}
      <ProgressPathVisualizer wordCount={wordCount} />

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graduation Status */}
        <GraduationStatusCard graduationStatus={graduationStatus} />

        {/* Daily Stats */}
        <LearningStatsCard stats={stats} />
      </div>

      {/* Feature Unlocks */}
      <FeatureUnlocksGrid wordCount={wordCount} />
    </div>
  );
}
