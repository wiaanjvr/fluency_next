"use client";

import { useState, useEffect, useCallback } from "react";
import { UserWord } from "@/types";
import {
  UserProgressionData,
  GraduationStatus,
  ProgressMilestone,
  LearningStats,
  UnlockableFeature,
  DifficultySettings,
} from "@/types/progression";
import {
  getUserProgressionData,
  updateProgressionData,
  initializeProgressionData,
  checkGraduationReadiness,
  getCurrentMilestone,
  getNextMilestone,
  checkMilestoneAchievement,
  getUnlockedFeatures,
  isFeatureUnlocked,
  getDifficultySettings,
  calculateLearningStats,
  getAudioSpeedOptions,
} from "@/lib/progression";

interface UseProgressionReturn {
  // State
  progressionData: UserProgressionData | null;
  isLoading: boolean;
  error: string | null;

  // Derived data
  graduationStatus: GraduationStatus | null;
  currentMilestone: ProgressMilestone | null;
  nextMilestone: ProgressMilestone | null;
  unlockedFeatures: UnlockableFeature[];
  difficultySettings: DifficultySettings | null;
  learningStats: LearningStats | null;

  // Milestone celebration
  newMilestone: ProgressMilestone | null;
  dismissMilestone: () => void;

  // Actions
  updateProgression: (
    userWords: UserWord[],
    additionalMetrics?: {
      storyComprehensionScore?: number;
      listeningScore?: number;
      practiceMinutes?: number;
    },
  ) => void;
  checkFeature: (feature: UnlockableFeature) => boolean;
  getAudioSpeed: () => ReturnType<typeof getAudioSpeedOptions>;

  // Refresh
  refresh: () => void;
}

/**
 * Hook for managing user progression through the learning journey
 */
export function useProgression(
  userId: string,
  userWords: UserWord[],
): UseProgressionReturn {
  const [progressionData, setProgressionData] =
    useState<UserProgressionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newMilestone, setNewMilestone] = useState<ProgressMilestone | null>(
    null,
  );

  // Load progression data on mount
  useEffect(() => {
    try {
      let data = getUserProgressionData();
      if (!data) {
        data = initializeProgressionData(userId);
      }
      setProgressionData(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load progression",
      );
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Update progression when user words change
  useEffect(() => {
    if (!userId || userWords.length === 0) return;

    const previousWordCount = progressionData?.totalWordsLearned ?? 0;
    const currentWordCount = userWords.length;

    // Check for new milestone
    const milestone = checkMilestoneAchievement(
      previousWordCount,
      currentWordCount,
    );
    if (milestone) {
      setNewMilestone(milestone);
    }

    // Update progression data
    const updated = updateProgressionData(userId, userWords);
    setProgressionData(updated);
  }, [userId, userWords, progressionData?.totalWordsLearned]);

  // Derived values
  const wordCount = userWords.length;
  const graduationStatus = progressionData?.graduationStatus ?? null;
  const currentMilestone = getCurrentMilestone(wordCount);
  const nextMilestone = getNextMilestone(wordCount);
  const unlockedFeatures = getUnlockedFeatures(wordCount);
  const difficultySettings = getDifficultySettings(wordCount);
  const learningStats = calculateLearningStats(userWords, progressionData);

  // Actions
  const updateProgression = useCallback(
    (
      words: UserWord[],
      additionalMetrics?: {
        storyComprehensionScore?: number;
        listeningScore?: number;
        practiceMinutes?: number;
      },
    ) => {
      const updated = updateProgressionData(userId, words, additionalMetrics);
      setProgressionData(updated);
    },
    [userId],
  );

  const checkFeature = useCallback(
    (feature: UnlockableFeature) => {
      return isFeatureUnlocked(feature, wordCount);
    },
    [wordCount],
  );

  const getAudioSpeed = useCallback(() => {
    return getAudioSpeedOptions(wordCount);
  }, [wordCount]);

  const dismissMilestone = useCallback(() => {
    setNewMilestone(null);
  }, []);

  const refresh = useCallback(() => {
    const data = getUserProgressionData();
    if (data) {
      setProgressionData(data);
    }
  }, []);

  return {
    progressionData,
    isLoading,
    error,
    graduationStatus,
    currentMilestone,
    nextMilestone,
    unlockedFeatures,
    difficultySettings,
    learningStats,
    newMilestone,
    dismissMilestone,
    updateProgression,
    checkFeature,
    getAudioSpeed,
    refresh,
  };
}

/**
 * Simplified hook for checking if features are available
 */
export function useFeatureUnlock(wordCount: number) {
  const unlockedFeatures = getUnlockedFeatures(wordCount);

  return {
    unlockedFeatures,
    isUnlocked: (feature: UnlockableFeature) =>
      isFeatureUnlocked(feature, wordCount),
    audioSpeedControl: isFeatureUnlocked("audio-speed-control", wordCount),
    microStories: isFeatureUnlocked("micro-stories", wordCount),
    storyThemes: isFeatureUnlocked("story-themes", wordCount),
    comprehensionChallenges: isFeatureUnlocked(
      "comprehension-challenges",
      wordCount,
    ),
    acquisitionMode: isFeatureUnlocked("acquisition-mode", wordCount),
    advancedStories: isFeatureUnlocked("advanced-stories", wordCount),
    sentenceMining: isFeatureUnlocked("sentence-mining", wordCount),
    customVocabulary: isFeatureUnlocked("custom-vocabulary", wordCount),
  };
}

/**
 * Hook for graduation status checking
 */
export function useGraduationStatus(userWords: UserWord[]) {
  const [status, setStatus] = useState<GraduationStatus | null>(null);

  useEffect(() => {
    if (userWords.length > 0) {
      const graduationStatus = checkGraduationReadiness(userWords);
      setStatus(graduationStatus);
    }
  }, [userWords]);

  return {
    status,
    isReady: status?.isReady ?? false,
    progress: status?.overallProgress ?? 0,
    requirements: status?.requirements ?? [],
    recommendations: status?.recommendedActions ?? [],
  };
}
