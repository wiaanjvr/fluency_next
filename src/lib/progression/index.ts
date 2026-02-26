/**
 * Progression Gateway
 * Manages user progression through learning phases and graduation to main app
 *
 * Key responsibilities:
 * - Track word count and retention
 * - Check graduation requirements
 * - Manage feature unlocks
 * - Calculate dynamic difficulty
 * - Provide progress visualization data
 */

// Re-export depth level system
export {
  DEPTH_LEVELS,
  getDepthLevel,
  getProgressToNextLevel,
  checkLevelUp,
  type DepthLevel,
  type DepthProgress,
} from "./depthLevels";

import {
  UserProgressionData,
  GraduationStatus,
  GraduationRequirement,
  ProgressMilestone,
  PROGRESS_MILESTONES,
  GRADUATION_THRESHOLDS,
  DifficultyLevel,
  DifficultySettings,
  DIFFICULTY_PRESETS,
  VOCABULARY_DIFFICULTY_THRESHOLDS,
  UnlockableFeature,
  ProgressPath,
  ProgressPathNode,
  LearningStats,
  PROGRESSION_STORAGE_KEYS,
} from "@/types/progression";
import { UserWord, WordStatus } from "@/types";

// ============================================================================
// STORAGE UTILITIES
// ============================================================================

/**
 * Get user progression data from localStorage
 */
export function getUserProgressionData(): UserProgressionData | null {
  if (typeof window === "undefined") return null;

  const stored = localStorage.getItem(PROGRESSION_STORAGE_KEYS.userProgression);
  if (!stored) return null;

  try {
    return JSON.parse(stored) as UserProgressionData;
  } catch {
    return null;
  }
}

/**
 * Save user progression data to localStorage
 */
export function saveUserProgressionData(data: UserProgressionData): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    PROGRESSION_STORAGE_KEYS.userProgression,
    JSON.stringify(data),
  );
}

/**
 * Initialize progression data for new user
 */
export function initializeProgressionData(userId: string): UserProgressionData {
  const initialGraduationStatus = calculateGraduationStatus({
    totalWordsLearned: 0,
    wordsWithHighRetention: 0,
    overallRetentionRate: 0,
    averageStoryComprehension: 0,
    averageListeningScore: 0,
  });

  const data: UserProgressionData = {
    userId,
    totalWordsLearned: 0,
    wordsWithHighRetention: 0,
    wordsByStatus: { new: 0, learning: 0, known: 0, mastered: 0 },
    overallRetentionRate: 0,
    recentRetentionRate: 0,
    storyComprehensionScores: [],
    averageStoryComprehension: 0,
    storiesCompletedWithoutHelp: 0,
    listeningComprehensionScores: [],
    averageListeningScore: 0,
    totalSessions: 0,
    totalPracticeMinutes: 0,
    currentStreak: 0,
    longestStreak: 0,
    milestonesAchieved: [],
    currentMilestoneTarget: 100,
    nextMilestone: PROGRESS_MILESTONES[0],
    unlockedFeatures: [],
    graduationStatus: initialGraduationStatus,
    startedLearningAt: new Date().toISOString(),
    lastSessionAt: new Date().toISOString(),
  };

  saveUserProgressionData(data);
  return data;
}

// ============================================================================
// GRADUATION STATUS CALCULATION
// ============================================================================

interface GraduationMetrics {
  totalWordsLearned: number;
  wordsWithHighRetention: number;
  overallRetentionRate: number;
  averageStoryComprehension: number;
  averageListeningScore: number;
}

/**
 * Calculate if user meets graduation requirements
 */
export function calculateGraduationStatus(
  metrics: GraduationMetrics,
): GraduationStatus {
  const requirements: GraduationRequirement[] = [
    {
      id: "vocabulary-count",
      name: "Vocabulary Size",
      description: `Learn ${GRADUATION_THRESHOLDS.minWords} words with 80%+ retention`,
      category: "vocabulary",
      targetValue: GRADUATION_THRESHOLDS.minWords,
      currentValue: metrics.wordsWithHighRetention,
      isMet: metrics.wordsWithHighRetention >= GRADUATION_THRESHOLDS.minWords,
      weight: 0.4,
    },
    {
      id: "retention-rate",
      name: "Retention Rate",
      description: `Maintain ${GRADUATION_THRESHOLDS.minRetention}%+ average retention`,
      category: "vocabulary",
      targetValue: GRADUATION_THRESHOLDS.minRetention,
      currentValue: metrics.overallRetentionRate,
      isMet: metrics.overallRetentionRate >= GRADUATION_THRESHOLDS.minRetention,
      weight: 0.2,
    },
    {
      id: "story-comprehension",
      name: "Story Comprehension",
      description: `Score ${GRADUATION_THRESHOLDS.minStoryComprehension}%+ on 5-sentence stories`,
      category: "comprehension",
      targetValue: GRADUATION_THRESHOLDS.minStoryComprehension,
      currentValue: metrics.averageStoryComprehension,
      isMet:
        metrics.averageStoryComprehension >=
        GRADUATION_THRESHOLDS.minStoryComprehension,
      weight: 0.25,
    },
    {
      id: "listening-score",
      name: "Listening Comprehension",
      description: `Score ${GRADUATION_THRESHOLDS.minListeningScore}%+ on listening exercises`,
      category: "listening",
      targetValue: GRADUATION_THRESHOLDS.minListeningScore,
      currentValue: metrics.averageListeningScore,
      isMet:
        metrics.averageListeningScore >=
        GRADUATION_THRESHOLDS.minListeningScore,
      weight: 0.15,
    },
  ];

  // Calculate overall progress (weighted average)
  const overallProgress = Math.min(
    100,
    requirements.reduce((sum, req) => {
      const progress = Math.min(
        100,
        (req.currentValue / req.targetValue) * 100,
      );
      return sum + progress * req.weight;
    }, 0),
  );

  // Check if all requirements are met
  const isReady = requirements.every((req) => req.isMet);

  // Estimate sessions to graduation
  const wordsNeeded = Math.max(
    0,
    GRADUATION_THRESHOLDS.minWords - metrics.wordsWithHighRetention,
  );
  const avgWordsPerSession = 10; // Estimate
  const estimatedSessionsToGraduation = Math.ceil(
    wordsNeeded / avgWordsPerSession,
  );

  // Generate recommendations
  const recommendedActions: string[] = [];
  if (!requirements[0].isMet) {
    recommendedActions.push(
      `Learn ${Math.max(0, GRADUATION_THRESHOLDS.minWords - metrics.wordsWithHighRetention)} more words`,
    );
  }
  if (!requirements[1].isMet) {
    recommendedActions.push("Review struggling words more frequently");
  }
  if (!requirements[2].isMet) {
    recommendedActions.push(
      "Practice with micro-stories to improve comprehension",
    );
  }
  if (!requirements[3].isMet) {
    recommendedActions.push(
      "Use audio playback more to strengthen listening skills",
    );
  }

  return {
    isReady,
    overallProgress: Math.round(overallProgress),
    requirements,
    estimatedSessionsToGraduation,
    recommendedActions,
  };
}

/**
 * Check if user is ready for graduation using vocabulary data
 */
export function checkGraduationReadiness(
  userWords: UserWord[],
): GraduationStatus {
  // Calculate metrics from user words
  const wordsByStatus = countWordsByStatus(userWords);
  const wordsWithHighRetention = wordsByStatus.known + wordsByStatus.mastered;
  const totalReviewed = userWords.filter((w) => w.last_rated_at).length;
  const successfulReviews = userWords.filter(
    (w) => w.status === "known" || w.status === "mastered",
  ).length;
  const overallRetentionRate =
    totalReviewed > 0 ? (successfulReviews / totalReviewed) * 100 : 0;

  // Get story and listening scores from localStorage
  const progressionData = getUserProgressionData();
  const averageStoryComprehension =
    progressionData?.averageStoryComprehension ?? 0;
  const averageListeningScore = progressionData?.averageListeningScore ?? 0;

  return calculateGraduationStatus({
    totalWordsLearned: userWords.length,
    wordsWithHighRetention,
    overallRetentionRate,
    averageStoryComprehension,
    averageListeningScore,
  });
}

// ============================================================================
// MILESTONE TRACKING
// ============================================================================

/**
 * Get the current milestone based on word count
 */
export function getCurrentMilestone(
  wordCount: number,
): ProgressMilestone | null {
  // Find the highest achieved milestone
  for (let i = PROGRESS_MILESTONES.length - 1; i >= 0; i--) {
    if (wordCount >= PROGRESS_MILESTONES[i].wordTarget) {
      return PROGRESS_MILESTONES[i];
    }
  }
  return null;
}

/**
 * Get the next milestone to achieve
 */
export function getNextMilestone(wordCount: number): ProgressMilestone | null {
  for (const milestone of PROGRESS_MILESTONES) {
    if (wordCount < milestone.wordTarget) {
      return milestone;
    }
  }
  return null;
}

/**
 * Check if a new milestone was achieved
 */
export function checkMilestoneAchievement(
  previousWordCount: number,
  currentWordCount: number,
): ProgressMilestone | null {
  for (const milestone of PROGRESS_MILESTONES) {
    if (
      previousWordCount < milestone.wordTarget &&
      currentWordCount >= milestone.wordTarget
    ) {
      return milestone;
    }
  }
  return null;
}

/**
 * Get all achieved milestones
 */
export function getAchievedMilestones(wordCount: number): ProgressMilestone[] {
  return PROGRESS_MILESTONES.filter((m) => wordCount >= m.wordTarget);
}

// ============================================================================
// FEATURE UNLOCKS
// ============================================================================

/**
 * Get all unlocked features based on word count
 */
export function getUnlockedFeatures(wordCount: number): UnlockableFeature[] {
  const achievedMilestones = getAchievedMilestones(wordCount);
  const features: UnlockableFeature[] = [];

  for (const milestone of achievedMilestones) {
    features.push(...milestone.unlockedFeatures);
  }

  return Array.from(new Set(features)); // Remove duplicates
}

/**
 * Check if a specific feature is unlocked
 */
export function isFeatureUnlocked(
  feature: UnlockableFeature,
  wordCount: number,
): boolean {
  return getUnlockedFeatures(wordCount).includes(feature);
}

/**
 * Get the word count required to unlock a feature
 */
export function getFeatureUnlockRequirement(
  feature: UnlockableFeature,
): number | null {
  for (const milestone of PROGRESS_MILESTONES) {
    if (milestone.unlockedFeatures.includes(feature)) {
      return milestone.wordTarget;
    }
  }
  return null;
}

/**
 * Get features that will be unlocked next
 */
export function getUpcomingFeatures(
  wordCount: number,
): { feature: UnlockableFeature; wordsNeeded: number }[] {
  const upcoming: { feature: UnlockableFeature; wordsNeeded: number }[] = [];
  const unlockedFeatures = getUnlockedFeatures(wordCount);

  for (const milestone of PROGRESS_MILESTONES) {
    if (wordCount < milestone.wordTarget) {
      const newFeatures = milestone.unlockedFeatures.filter(
        (f) => !unlockedFeatures.includes(f),
      );
      for (const feature of newFeatures) {
        upcoming.push({
          feature,
          wordsNeeded: milestone.wordTarget - wordCount,
        });
      }
    }
  }

  return upcoming;
}

// ============================================================================
// DYNAMIC DIFFICULTY
// ============================================================================

/**
 * Calculate difficulty level based on vocabulary size
 */
export function calculateDifficultyLevel(wordCount: number): DifficultyLevel {
  for (let i = VOCABULARY_DIFFICULTY_THRESHOLDS.length - 1; i >= 0; i--) {
    if (wordCount >= VOCABULARY_DIFFICULTY_THRESHOLDS[i].minWords) {
      return VOCABULARY_DIFFICULTY_THRESHOLDS[i].level;
    }
  }
  return "beginner";
}

/**
 * Get difficulty settings for vocabulary size
 */
export function getDifficultySettings(wordCount: number): DifficultySettings {
  const level = calculateDifficultyLevel(wordCount);
  return DIFFICULTY_PRESETS[level];
}

/**
 * Calculate sentence complexity parameters
 */
export function getSentenceComplexity(wordCount: number): {
  maxWords: number;
  maxSentences: number;
  allowCompound: boolean;
  allowSubordinate: boolean;
} {
  const settings = getDifficultySettings(wordCount);
  return {
    maxWords: settings.maxWordsPerSentence,
    maxSentences: settings.maxSentencesPerStory,
    allowCompound: settings.allowCompoundSentences,
    allowSubordinate: settings.allowSubordinateClauses,
  };
}

/**
 * Calculate comprehensibility rate target (95% default)
 */
export function getTargetComprehensibility(wordCount: number): number {
  const settings = getDifficultySettings(wordCount);
  return settings.targetComprehensibilityRate;
}

/**
 * Calculate max new words per story/session
 */
export function getMaxNewWords(wordCount: number): number {
  const settings = getDifficultySettings(wordCount);
  return settings.maxNewWordsPerStory;
}

// ============================================================================
// PROGRESS PATH VISUALIZATION
// ============================================================================

/**
 * Generate progress path nodes for visualization
 */
export function generateProgressPath(wordCount: number): ProgressPath {
  const nodes: ProgressPathNode[] = [
    { wordCount: 0, label: "Start", isCompleted: true, isCurrent: false },
  ];

  // Add milestone nodes
  for (const milestone of PROGRESS_MILESTONES) {
    nodes.push({
      wordCount: milestone.wordTarget,
      label: milestone.wordTarget.toString(),
      isCompleted: wordCount >= milestone.wordTarget,
      isCurrent:
        wordCount >= milestone.wordTarget &&
        (getNextMilestone(wordCount)?.wordTarget === milestone.wordTarget ||
          !getNextMilestone(wordCount)),
      milestone,
    });
  }

  // Find current position
  const currentIndex = nodes.findIndex((n) => n.wordCount > wordCount);
  if (currentIndex > 0) {
    nodes[currentIndex - 1].isCurrent = true;
  }

  const nextMilestone = getNextMilestone(wordCount);
  const currentMilestone = getCurrentMilestone(wordCount);
  const targetWordCount = nextMilestone?.wordTarget ?? 1000;
  const baseWordCount = currentMilestone?.wordTarget ?? 0;
  const progressToNext =
    targetWordCount === baseWordCount
      ? 100
      : Math.round(
          ((wordCount - baseWordCount) / (targetWordCount - baseWordCount)) *
            100,
        );

  return {
    nodes,
    currentWordCount: wordCount,
    targetWordCount,
    progressToNext: Math.min(100, Math.max(0, progressToNext)),
  };
}

// ============================================================================
// LEARNING STATS
// ============================================================================

/**
 * Count words by status
 */
export function countWordsByStatus(
  userWords: UserWord[],
): Record<WordStatus, number> {
  const counts: Record<WordStatus, number> = {
    new: 0,
    learning: 0,
    known: 0,
    mastered: 0,
  };

  for (const word of userWords) {
    counts[word.status]++;
  }

  return counts;
}

/**
 * Calculate retention rate from user words
 */
export function calculateRetentionRate(userWords: UserWord[]): number {
  const reviewedWords = userWords.filter((w) => w.last_rated_at);
  if (reviewedWords.length === 0) return 0;

  const highRetentionWords = reviewedWords.filter(
    (w) => w.status === "known" || w.status === "mastered",
  );

  return Math.round((highRetentionWords.length / reviewedWords.length) * 100);
}

/**
 * Calculate recent retention rate (last N reviews)
 */
export function calculateRecentRetentionRate(
  userWords: UserWord[],
  lastN: number = 50,
): number {
  // Sort by updated_at and take the most recent
  const sorted = [...userWords]
    .filter((w) => w.updated_at)
    .sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    )
    .slice(0, lastN);

  if (sorted.length === 0) return 0;

  const highRetention = sorted.filter(
    (w) => w.status === "known" || w.status === "mastered",
  );

  return Math.round((highRetention.length / sorted.length) * 100);
}

/**
 * Calculate learning stats from user data
 */
export function calculateLearningStats(
  userWords: UserWord[],
  progressionData?: UserProgressionData | null,
): LearningStats {
  const wordsByStatus = countWordsByStatus(userWords);
  const totalWordsLearned = wordsByStatus.known + wordsByStatus.mastered;
  const avgRetention = calculateRetentionRate(userWords);

  // Calculate words learned today
  const today = new Date().toDateString();
  const wordsLearnedToday = userWords.filter(
    (w) => new Date(w.created_at).toDateString() === today,
  ).length;
  const wordsReviewedToday = userWords.filter(
    (w) => w.updated_at && new Date(w.updated_at).toDateString() === today,
  ).length;

  // Get from progression data or calculate defaults
  const totalPracticeMinutes = progressionData?.totalPracticeMinutes ?? 0;
  const currentStreak = progressionData?.currentStreak ?? 0;
  const longestStreak = progressionData?.longestStreak ?? 0;
  const startDate = progressionData?.startedLearningAt
    ? new Date(progressionData.startedLearningAt)
    : new Date();
  const daysSinceStart = Math.max(
    1,
    Math.ceil((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
  );

  // Calculate averages
  const averageWordsPerDay = Math.round(totalWordsLearned / daysSinceStart);
  const averageMinutesPerDay = Math.round(
    totalPracticeMinutes / daysSinceStart,
  );

  // Estimate days to milestones
  const nextMilestone = getNextMilestone(userWords.length);
  const wordsToNextMilestone = nextMilestone
    ? nextMilestone.wordTarget - userWords.length
    : 0;
  const estimatedDaysToNextMilestone =
    averageWordsPerDay > 0
      ? Math.ceil(wordsToNextMilestone / averageWordsPerDay)
      : 999;

  const wordsToGraduation = Math.max(
    0,
    GRADUATION_THRESHOLDS.minWords - totalWordsLearned,
  );
  const estimatedDaysToGraduation =
    averageWordsPerDay > 0
      ? Math.ceil(wordsToGraduation / averageWordsPerDay)
      : 999;

  return {
    wordsLearnedToday,
    wordsReviewedToday,
    sentencesMasteredToday: 0, // To be implemented
    practiceMinutesToday: 0, // To be tracked separately
    totalWordsLearned,
    totalSentencesMastered: 0, // To be implemented
    totalPracticeMinutes,
    averageWordsPerDay,
    averageMinutesPerDay,
    averageRetentionRate: avgRetention,
    currentStreak,
    longestStreak,
    estimatedDaysToNextMilestone,
    estimatedDaysToGraduation,
  };
}

// ============================================================================
// UPDATE PROGRESSION DATA
// ============================================================================

/**
 * Update progression data with current user words
 */
export function updateProgressionData(
  userId: string,
  userWords: UserWord[],
  additionalMetrics?: {
    storyComprehensionScore?: number;
    listeningScore?: number;
    practiceMinutes?: number;
  },
): UserProgressionData {
  const existing =
    getUserProgressionData() || initializeProgressionData(userId);

  // Update word counts
  const wordsByStatus = countWordsByStatus(userWords);
  const wordsWithHighRetention = wordsByStatus.known + wordsByStatus.mastered;
  const overallRetentionRate = calculateRetentionRate(userWords);
  const recentRetentionRate = calculateRecentRetentionRate(userWords);

  // Update story comprehension scores
  if (additionalMetrics?.storyComprehensionScore !== undefined) {
    existing.storyComprehensionScores.push(
      additionalMetrics.storyComprehensionScore,
    );
    // Keep last 20 scores
    if (existing.storyComprehensionScores.length > 20) {
      existing.storyComprehensionScores =
        existing.storyComprehensionScores.slice(-20);
    }
    existing.averageStoryComprehension = Math.round(
      existing.storyComprehensionScores.reduce((a, b) => a + b, 0) /
        existing.storyComprehensionScores.length,
    );
  }

  // Update listening scores
  if (additionalMetrics?.listeningScore !== undefined) {
    existing.listeningComprehensionScores.push(
      additionalMetrics.listeningScore,
    );
    if (existing.listeningComprehensionScores.length > 20) {
      existing.listeningComprehensionScores =
        existing.listeningComprehensionScores.slice(-20);
    }
    existing.averageListeningScore = Math.round(
      existing.listeningComprehensionScores.reduce((a, b) => a + b, 0) /
        existing.listeningComprehensionScores.length,
    );
  }

  // Update practice minutes
  if (additionalMetrics?.practiceMinutes !== undefined) {
    existing.totalPracticeMinutes += additionalMetrics.practiceMinutes;
  }

  // Check for new milestones
  const previousMilestonesCount = existing.milestonesAchieved.length;
  const achievedMilestones = getAchievedMilestones(userWords.length);
  existing.milestonesAchieved = achievedMilestones.map((m) => m.id);

  // Update unlocked features
  existing.unlockedFeatures = getUnlockedFeatures(userWords.length);

  // Update next milestone
  existing.nextMilestone = getNextMilestone(userWords.length);
  existing.currentMilestoneTarget = existing.nextMilestone?.wordTarget ?? 1000;

  // Update graduation status
  existing.graduationStatus = calculateGraduationStatus({
    totalWordsLearned: userWords.length,
    wordsWithHighRetention,
    overallRetentionRate,
    averageStoryComprehension: existing.averageStoryComprehension,
    averageListeningScore: existing.averageListeningScore,
  });

  // Update remaining fields
  existing.totalWordsLearned = userWords.length;
  existing.wordsWithHighRetention = wordsWithHighRetention;
  existing.wordsByStatus = wordsByStatus;
  existing.overallRetentionRate = overallRetentionRate;
  existing.recentRetentionRate = recentRetentionRate;
  existing.lastSessionAt = new Date().toISOString();

  // Check if graduated
  if (existing.graduationStatus.isReady && !existing.graduatedAt) {
    existing.graduatedAt = new Date().toISOString();
  }

  saveUserProgressionData(existing);
  return existing;
}

// ============================================================================
// AUDIO SPEED CONTROL
// ============================================================================

/**
 * Get available audio speed options based on word count
 */
export function getAudioSpeedOptions(wordCount: number): {
  min: number;
  max: number;
  default: number;
  isUnlocked: boolean;
} {
  const isUnlocked = isFeatureUnlocked("audio-speed-control", wordCount);
  const settings = getDifficultySettings(wordCount);

  if (!isUnlocked) {
    return {
      min: settings.defaultAudioSpeed,
      max: settings.defaultAudioSpeed,
      default: settings.defaultAudioSpeed,
      isUnlocked: false,
    };
  }

  return {
    min: settings.minAudioSpeed,
    max: 1.5,
    default: settings.defaultAudioSpeed,
    isUnlocked: true,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  PROGRESS_MILESTONES,
  GRADUATION_THRESHOLDS,
  DIFFICULTY_PRESETS,
  VOCABULARY_DIFFICULTY_THRESHOLDS,
};

// Re-export hooks
export {
  useProgression,
  useFeatureUnlock,
  useGraduationStatus,
} from "./useProgression";
