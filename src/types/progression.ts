/**
 * Progression Gateway Types
 * Types for tracking user progress and determining readiness to advance
 *
 * PROGRESSION MILESTONES:
 * - 100 words: First milestone, basic features unlocked
 * - 200 words: Audio speed control unlocked
 * - 300 words: Micro-stories unlocked
 * - 500 words: Ready to graduate to main comprehensible input mode
 * - 1000 words: Advanced story mode with complex narratives
 *
 * GRADUATION REQUIREMENTS (500 word gateway):
 * - ✅ 500 words with 80%+ retention
 * - ✅ Can understand simple 5-sentence stories without translation
 * - ✅ Scoring 80%+ on listening comprehension exercises
 */

// ============================================================================
// MILESTONE TYPES
// Progress markers along the learning journey
// ============================================================================

export interface ProgressMilestone {
  id: string;
  wordTarget: number;
  title: string;
  description: string;
  unlockedFeatures: UnlockableFeature[];
  badge?: string; // Emoji or icon identifier
  celebrationMessage: string;
}

export type UnlockableFeature =
  | "audio-speed-control" // 200 words: Adjust playback speed
  | "micro-stories" // 300 words: Access to short stories
  | "story-themes" // 350 words: Choose story themes
  | "comprehension-challenges" // 400 words: Comprehension games
  | "acquisition-mode" // 500 words: Main story mode
  | "advanced-stories" // 1000 words: Complex narratives
  | "sentence-mining" // 500 words: Save sentences
  | "custom-vocabulary"; // 300 words: Add custom words

export const PROGRESS_MILESTONES: ProgressMilestone[] = [
  {
    id: "milestone-100",
    wordTarget: 100,
    title: "First Steps",
    description: "You've learned 100 words!",
    unlockedFeatures: [],
    badge: "🌱",
    celebrationMessage:
      "Amazing start! You've built a foundation of 100 words. Keep going!",
  },
  {
    id: "milestone-200",
    wordTarget: 200,
    title: "Growing Vocabulary",
    description: "200 words mastered!",
    unlockedFeatures: ["audio-speed-control"],
    badge: "🌿",
    celebrationMessage:
      "Fantastic! You can now control audio playback speed. Try slowing down difficult content!",
  },
  {
    id: "milestone-300",
    wordTarget: 300,
    title: "Story Time",
    description: "300 words - Stories unlocked!",
    unlockedFeatures: ["micro-stories", "custom-vocabulary"],
    badge: "📖",
    celebrationMessage:
      "Incredible! You're ready for micro-stories. Short, engaging tales await you!",
  },
  {
    id: "milestone-350",
    wordTarget: 350,
    title: "Finding Your Voice",
    description: "350 words - Choose your themes!",
    unlockedFeatures: ["story-themes"],
    badge: "🎯",
    celebrationMessage: "You can now pick story themes that interest you most!",
  },
  {
    id: "milestone-400",
    wordTarget: 400,
    title: "Challenge Mode",
    description: "400 words - Comprehension challenges!",
    unlockedFeatures: ["comprehension-challenges"],
    badge: "🎮",
    celebrationMessage:
      "New challenge modes unlocked! Test your comprehension skills.",
  },
  {
    id: "milestone-500",
    wordTarget: 500,
    title: "Graduation Ready",
    description: "500 words - Ready for acquisition mode!",
    unlockedFeatures: ["acquisition-mode", "sentence-mining"],
    badge: "🎓",
    celebrationMessage:
      "Congratulations! You've mastered 500 words and are ready for the main learning experience. Your language journey truly begins now!",
  },
  {
    id: "milestone-1000",
    wordTarget: 1000,
    title: "Advanced Learner",
    description: "1000 words - Advanced stories!",
    unlockedFeatures: ["advanced-stories"],
    badge: "⭐",
    celebrationMessage:
      "Outstanding achievement! You're now ready for complex, engaging narratives.",
  },
];

// ============================================================================
// GRADUATION GATEWAY TYPES
// Requirements for transitioning to main acquisition mode
// ============================================================================

export interface GraduationRequirement {
  id: string;
  name: string;
  description: string;
  category: "vocabulary" | "comprehension" | "listening";
  targetValue: number;
  currentValue: number;
  isMet: boolean;
  weight: number; // Importance (0-1, totals to 1)
}

export interface GraduationStatus {
  isReady: boolean;
  overallProgress: number; // 0-100
  requirements: GraduationRequirement[];
  estimatedSessionsToGraduation: number;
  recommendedActions: string[];
}

// Graduation thresholds
export const GRADUATION_THRESHOLDS = {
  minWords: 500,
  minRetention: 80,
  minStoryComprehension: 80, // % understanding 5-sentence stories without translation
  minListeningScore: 80,
} as const;

// ============================================================================
// USER PROGRESS TRACKING TYPES
// Comprehensive progress data structure
// ============================================================================

export interface UserProgressionData {
  userId: string;

  // Word counts by status
  totalWordsLearned: number;
  wordsWithHighRetention: number; // 80%+ retention (known + mastered)
  wordsByStatus: {
    new: number;
    learning: number;
    known: number;
    mastered: number;
  };

  // Retention metrics
  overallRetentionRate: number; // 0-100
  recentRetentionRate: number; // Last 50 reviews

  // Comprehension metrics
  storyComprehensionScores: number[]; // Recent story scores
  averageStoryComprehension: number;
  storiesCompletedWithoutHelp: number; // Stories with <3 word lookups

  // Listening metrics
  listeningComprehensionScores: number[];
  averageListeningScore: number;

  // Session data
  totalSessions: number;
  totalPracticeMinutes: number;
  currentStreak: number;
  longestStreak: number;

  // Milestone tracking
  milestonesAchieved: string[];
  currentMilestoneTarget: number;
  nextMilestone: ProgressMilestone | null;

  // Unlocked features
  unlockedFeatures: UnlockableFeature[];

  // Graduation status
  graduationStatus: GraduationStatus;

  // Timestamps
  startedLearningAt: string;
  lastSessionAt: string;
  graduatedAt?: string;
}

// ============================================================================
// DYNAMIC DIFFICULTY TYPES
// Auto-adjusted learning based on vocabulary size
// ============================================================================

export type DifficultyLevel =
  | "beginner"
  | "elementary"
  | "intermediate"
  | "upper-intermediate"
  | "advanced";

export interface DifficultySettings {
  level: DifficultyLevel;

  // Sentence complexity
  maxWordsPerSentence: number;
  maxSentencesPerStory: number;
  allowCompoundSentences: boolean;
  allowSubordinateClauses: boolean;

  // Vocabulary constraints
  maxNewWordsPerStory: number;
  targetComprehensibilityRate: number; // e.g., 0.95 for 95%

  // Grammar complexity
  allowedTenses: string[];
  allowPassiveVoice: boolean;
  allowComplexPronouns: boolean;

  // Audio settings
  defaultAudioSpeed: number; // 0.5 to 1.5
  minAudioSpeed: number;

  // Scaffolding
  showInlineTranslations: boolean;
  highlightNewWords: boolean;
  autoPlayAudio: boolean;
}

export const DIFFICULTY_PRESETS: Record<DifficultyLevel, DifficultySettings> = {
  beginner: {
    level: "beginner",
    maxWordsPerSentence: 6,
    maxSentencesPerStory: 3,
    allowCompoundSentences: false,
    allowSubordinateClauses: false,
    maxNewWordsPerStory: 1,
    targetComprehensibilityRate: 0.98,
    allowedTenses: ["present"],
    allowPassiveVoice: false,
    allowComplexPronouns: false,
    defaultAudioSpeed: 0.7,
    minAudioSpeed: 0.5,
    showInlineTranslations: true,
    highlightNewWords: true,
    autoPlayAudio: true,
  },
  elementary: {
    level: "elementary",
    maxWordsPerSentence: 8,
    maxSentencesPerStory: 4,
    allowCompoundSentences: true,
    allowSubordinateClauses: false,
    maxNewWordsPerStory: 2,
    targetComprehensibilityRate: 0.96,
    allowedTenses: ["present", "passé composé"],
    allowPassiveVoice: false,
    allowComplexPronouns: false,
    defaultAudioSpeed: 0.8,
    minAudioSpeed: 0.6,
    showInlineTranslations: true,
    highlightNewWords: true,
    autoPlayAudio: true,
  },
  intermediate: {
    level: "intermediate",
    maxWordsPerSentence: 12,
    maxSentencesPerStory: 5,
    allowCompoundSentences: true,
    allowSubordinateClauses: true,
    maxNewWordsPerStory: 2,
    targetComprehensibilityRate: 0.95,
    allowedTenses: ["present", "passé composé", "imparfait", "futur proche"],
    allowPassiveVoice: true,
    allowComplexPronouns: true,
    defaultAudioSpeed: 0.9,
    minAudioSpeed: 0.7,
    showInlineTranslations: false,
    highlightNewWords: true,
    autoPlayAudio: false,
  },
  "upper-intermediate": {
    level: "upper-intermediate",
    maxWordsPerSentence: 16,
    maxSentencesPerStory: 7,
    allowCompoundSentences: true,
    allowSubordinateClauses: true,
    maxNewWordsPerStory: 3,
    targetComprehensibilityRate: 0.93,
    allowedTenses: [
      "present",
      "passé composé",
      "imparfait",
      "futur proche",
      "conditionnel",
      "subjonctif",
    ],
    allowPassiveVoice: true,
    allowComplexPronouns: true,
    defaultAudioSpeed: 1.0,
    minAudioSpeed: 0.8,
    showInlineTranslations: false,
    highlightNewWords: false,
    autoPlayAudio: false,
  },
  advanced: {
    level: "advanced",
    maxWordsPerSentence: 20,
    maxSentencesPerStory: 10,
    allowCompoundSentences: true,
    allowSubordinateClauses: true,
    maxNewWordsPerStory: 4,
    targetComprehensibilityRate: 0.9,
    allowedTenses: [
      "present",
      "passé composé",
      "imparfait",
      "futur proche",
      "conditionnel",
      "subjonctif",
      "plus-que-parfait",
      "futur simple",
    ],
    allowPassiveVoice: true,
    allowComplexPronouns: true,
    defaultAudioSpeed: 1.0,
    minAudioSpeed: 0.9,
    showInlineTranslations: false,
    highlightNewWords: false,
    autoPlayAudio: false,
  },
};

// Word count thresholds for difficulty levels
export const VOCABULARY_DIFFICULTY_THRESHOLDS: {
  minWords: number;
  level: DifficultyLevel;
}[] = [
  { minWords: 0, level: "beginner" },
  { minWords: 150, level: "elementary" },
  { minWords: 350, level: "intermediate" },
  { minWords: 600, level: "upper-intermediate" },
  { minWords: 1000, level: "advanced" },
];

// ============================================================================
// MOTIVATION & GAMIFICATION TYPES
// Progress visualization and rewards
// ============================================================================

export interface ProgressPathNode {
  wordCount: number;
  label: string;
  isCompleted: boolean;
  isCurrent: boolean;
  milestone?: ProgressMilestone;
}

export interface ProgressPath {
  nodes: ProgressPathNode[];
  currentWordCount: number;
  targetWordCount: number; // Next milestone
  progressToNext: number; // 0-100
}

export interface LearningStats {
  // Today's stats
  wordsLearnedToday: number;
  wordsReviewedToday: number;
  sentencesMasteredToday: number;
  practiceMinutesToday: number;

  // All-time stats
  totalWordsLearned: number;
  totalSentencesMastered: number;
  totalPracticeMinutes: number;

  // Averages
  averageWordsPerDay: number;
  averageMinutesPerDay: number;
  averageRetentionRate: number;

  // Streaks
  currentStreak: number;
  longestStreak: number;

  // Velocity
  estimatedDaysToNextMilestone: number;
  estimatedDaysToGraduation: number;
}

export interface AchievementBadge {
  id: string;
  name: string;
  description: string;
  icon: string; // Emoji or icon name
  earnedAt?: string;
  isEarned: boolean;
  progress?: number; // 0-100 if partially complete
  requirement: string;
}

// ============================================================================
// LOCAL STORAGE KEYS
// ============================================================================

export const PROGRESSION_STORAGE_KEYS = {
  userProgression: "userProgressionData",
  milestonesAchieved: "milestonesAchieved",
  unlockedFeatures: "unlockedFeatures",
  learningStats: "learningStats",
  graduationStatus: "graduationStatus",
} as const;
