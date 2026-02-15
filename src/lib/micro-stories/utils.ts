/**
 * Micro-Stories Utilities
 * Utilities for story selection, word tracking, and session management
 */

import {
  MicroStory,
  StoryMatch,
  StorySelectionParams,
  WordClickEvent,
  ClickedWordStats,
  UserClickHistory,
  MicroStoryProgress,
  MicroStoryResult,
  StoryWord,
  ScaffoldingMode,
} from "@/types/micro-stories";

// Local storage keys
const MICRO_STORY_PROGRESS_KEY = "microStoryProgress";
const WORD_CLICK_HISTORY_KEY = "wordClickHistory";

// ============================================================================
// STORY SELECTION
// Select appropriate stories based on user's vocabulary
// ============================================================================

/**
 * Calculate how well a story matches the user's vocabulary
 */
export function calculateStoryMatch(
  story: MicroStory,
  userKnownWords: Set<string>,
  completedStoryIds: string[],
): StoryMatch {
  // Get all unique lemmas in the story
  const storyLemmas = new Set<string>();
  story.sentences.forEach((s) => {
    s.words.forEach((w) => {
      storyLemmas.add(w.lemma.toLowerCase());
    });
  });

  // Calculate known word percentage
  let knownCount = 0;
  let newWordCount = 0;

  storyLemmas.forEach((lemma) => {
    if (userKnownWords.has(lemma)) {
      knownCount++;
    } else {
      newWordCount++;
    }
  });

  const knownWordPercentage =
    storyLemmas.size > 0 ? (knownCount / storyLemmas.size) * 100 : 0;

  // Calculate match score
  // Prioritize: high known %, low new words, not completed
  let matchScore = knownWordPercentage;

  // Penalty for too many new words
  if (newWordCount > 2) {
    matchScore -= (newWordCount - 2) * 10;
  }

  // Penalty for already completed
  if (completedStoryIds.includes(story.id)) {
    matchScore -= 30;
  }

  // Bonus for exactly 1-2 new words (optimal learning)
  if (newWordCount >= 1 && newWordCount <= 2) {
    matchScore += 5;
  }

  return {
    story,
    matchScore: Math.max(0, Math.min(100, matchScore)),
    knownWordPercentage,
    newWordCount,
    isRecommended: knownWordPercentage >= 90 && newWordCount <= 2,
  };
}

/**
 * Select stories that match user's vocabulary level
 */
export function selectStoriesForUser(
  allStories: MicroStory[],
  params: StorySelectionParams,
): StoryMatch[] {
  const {
    knownWordLemmas,
    completedStoryIds,
    preferredThemes,
    avoidThemes,
    maxNewWords,
  } = params;

  // Filter stories by vocabulary requirements
  const eligibleStories = allStories.filter(
    (story) => story.requiredKnownWords <= params.knownWordCount,
  );

  // Calculate match for each story
  const matches = eligibleStories.map((story) =>
    calculateStoryMatch(story, knownWordLemmas, completedStoryIds),
  );

  // Filter by max new words
  const filteredMatches = matches.filter((m) => m.newWordCount <= maxNewWords);

  // Apply theme preferences
  let themedMatches = filteredMatches;
  if (preferredThemes && preferredThemes.length > 0) {
    const preferred = filteredMatches.filter((m) =>
      preferredThemes.includes(m.story.theme),
    );
    if (preferred.length > 0) {
      themedMatches = preferred;
    }
  }
  if (avoidThemes && avoidThemes.length > 0) {
    themedMatches = themedMatches.filter(
      (m) => !avoidThemes.includes(m.story.theme),
    );
  }

  // Sort by match score (highest first)
  return themedMatches.sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Get the next recommended story for the user
 */
export function getNextRecommendedStory(
  allStories: MicroStory[],
  params: StorySelectionParams,
): MicroStory | null {
  const matches = selectStoriesForUser(allStories, params);

  // Return the best match that hasn't been completed
  const uncompletedMatch = matches.find(
    (m) => !params.completedStoryIds.includes(m.story.id) && m.isRecommended,
  );

  if (uncompletedMatch) {
    return uncompletedMatch.story;
  }

  // If no perfect match, return best available
  const bestMatch = matches.find(
    (m) => !params.completedStoryIds.includes(m.story.id),
  );

  return bestMatch?.story || null;
}

// ============================================================================
// WORD CLICK TRACKING
// Track which words users click for additional review
// ============================================================================

/**
 * Get word click history from localStorage
 */
export function getWordClickHistory(): UserClickHistory | null {
  if (typeof window === "undefined") return null;

  const stored = localStorage.getItem(WORD_CLICK_HISTORY_KEY);
  if (!stored) return null;

  try {
    const data = JSON.parse(stored);
    // Reconstruct Map from array
    data.wordStats = new Map(data.wordStats);
    return data as UserClickHistory;
  } catch {
    return null;
  }
}

/**
 * Save word click history to localStorage
 */
export function saveWordClickHistory(history: UserClickHistory): void {
  if (typeof window === "undefined") return;

  // Convert Map to array for JSON serialization
  const toStore = {
    ...history,
    wordStats: Array.from(history.wordStats.entries()),
  };

  localStorage.setItem(WORD_CLICK_HISTORY_KEY, JSON.stringify(toStore));
}

/**
 * Initialize word click history for a user
 */
export function initializeWordClickHistory(userId: string): UserClickHistory {
  return {
    userId,
    totalClicks: 0,
    uniqueWordsClicked: 0,
    wordStats: new Map(),
    wordsNeedingReview: [],
  };
}

/**
 * Record a word click event
 */
export function recordWordClick(
  event: WordClickEvent,
  history: UserClickHistory | null,
): UserClickHistory {
  const current = history || initializeWordClickHistory(event.userId);

  const lemma = event.wordLemma.toLowerCase();
  const existingStats = current.wordStats.get(lemma);

  if (existingStats) {
    // Update existing word stats
    existingStats.clickCount++;
    existingStats.lastClicked = event.timestamp;
    if (!existingStats.storiesAppearedIn.includes(event.storyId)) {
      existingStats.storiesAppearedIn.push(event.storyId);
    }
    // Mark for review if clicked 3+ times
    existingStats.needsReview = existingStats.clickCount >= 3;
  } else {
    // Add new word stats
    current.wordStats.set(lemma, {
      lemma,
      word: event.wordText,
      clickCount: 1,
      lastClicked: event.timestamp,
      storiesAppearedIn: [event.storyId],
      needsReview: false,
    });
    current.uniqueWordsClicked++;
  }

  current.totalClicks++;

  // Update words needing review list
  current.wordsNeedingReview = Array.from(current.wordStats.values())
    .filter((w) => w.needsReview)
    .map((w) => w.lemma);

  saveWordClickHistory(current);
  return current;
}

/**
 * Get words that need additional review (clicked 3+ times)
 */
export function getWordsNeedingReview(
  history: UserClickHistory,
): ClickedWordStats[] {
  return Array.from(history.wordStats.values()).filter((w) => w.needsReview);
}

/**
 * Clear review status for a word (after it's been reviewed)
 */
export function markWordReviewed(
  lemma: string,
  history: UserClickHistory,
): UserClickHistory {
  const stats = history.wordStats.get(lemma);
  if (stats) {
    stats.needsReview = false;
    stats.clickCount = 0; // Reset click count after review
  }

  history.wordsNeedingReview = history.wordsNeedingReview.filter(
    (w) => w !== lemma,
  );

  saveWordClickHistory(history);
  return history;
}

// ============================================================================
// PROGRESS TRACKING
// Track overall progress in Phase 2 micro-stories
// ============================================================================

/**
 * Get micro-story progress from localStorage
 */
export function getMicroStoryProgress(): MicroStoryProgress | null {
  if (typeof window === "undefined") return null;

  const stored = localStorage.getItem(MICRO_STORY_PROGRESS_KEY);
  if (!stored) return null;

  try {
    const data = JSON.parse(stored);
    // Reconstruct Map from array
    data.storyResults = new Map(data.storyResults);
    return data as MicroStoryProgress;
  } catch {
    return null;
  }
}

/**
 * Save micro-story progress to localStorage
 */
export function saveMicroStoryProgress(progress: MicroStoryProgress): void {
  if (typeof window === "undefined") return;

  // Convert Map to array for JSON serialization
  const toStore = {
    ...progress,
    storyResults: Array.from(progress.storyResults.entries()),
  };

  localStorage.setItem(MICRO_STORY_PROGRESS_KEY, JSON.stringify(toStore));
}

/**
 * Initialize progress for a new user entering Phase 2
 */
export function initializeMicroStoryProgress(
  userId: string,
  totalWordsAtUnlock: number,
): MicroStoryProgress {
  const progress: MicroStoryProgress = {
    userId,
    unlocked: true,
    totalWordsAtUnlock,
    storiesCompleted: 0,
    storiesAttempted: 0,
    totalReadingTimeMinutes: 0,
    completedStoryIds: [],
    storyResults: new Map(),
    wordsLearnedFromStories: [],
    wordsClickedOften: [],
    currentLevel: "300-350",
    readyForPhase3: false,
  };

  saveMicroStoryProgress(progress);
  return progress;
}

/**
 * Check if user is ready to unlock micro-stories (needs 300+ known words)
 */
export function checkMicroStoriesUnlock(knownWordCount: number): boolean {
  return knownWordCount >= 300;
}

/**
 * Record completion of a micro-story
 */
export function recordStoryCompletion(
  result: MicroStoryResult,
  progress: MicroStoryProgress | null,
  knownWordCount: number,
): MicroStoryProgress {
  const current =
    progress || initializeMicroStoryProgress("local", knownWordCount);

  // Update completion stats
  current.storiesCompleted++;
  current.completedStoryIds.push(result.storyId);
  current.storyResults.set(result.storyId, result);

  // Update reading time
  current.totalReadingTimeMinutes += result.totalReadingTimeMs / 60000;

  // Track words learned from stories
  result.newWordsLearned.forEach((word) => {
    if (!current.wordsLearnedFromStories.includes(word)) {
      current.wordsLearnedFromStories.push(word);
    }
  });

  // Track words clicked often
  result.wordsForExtraReview.forEach((word) => {
    if (!current.wordsClickedOften.includes(word)) {
      current.wordsClickedOften.push(word);
    }
  });

  // Update vocabulary level based on known words
  if (knownWordCount >= 450) {
    current.currentLevel = "450-500";
  } else if (knownWordCount >= 400) {
    current.currentLevel = "400-450";
  } else if (knownWordCount >= 350) {
    current.currentLevel = "350-400";
  } else {
    current.currentLevel = "300-350";
  }

  // Check if ready for Phase 3 (longer passages)
  // Criteria: 20+ stories completed, 85%+ average comprehension, 500+ words
  const avgComprehension =
    Array.from(current.storyResults.values()).reduce(
      (sum, r) => sum + r.comprehensionScore,
      0,
    ) / current.storiesCompleted;

  current.readyForPhase3 =
    current.storiesCompleted >= 20 &&
    avgComprehension >= 85 &&
    knownWordCount >= 500;

  saveMicroStoryProgress(current);
  return current;
}

// ============================================================================
// SCAFFOLDING UTILITIES
// Helpers for the scaffolded reading mode
// ============================================================================

/**
 * Determine the recommended scaffolding mode based on user progress
 */
export function getRecommendedScaffoldingMode(
  progress: MicroStoryProgress | null,
  storyNewWordCount: number,
): ScaffoldingMode {
  // First few stories: full scaffolding
  if (!progress || progress.storiesCompleted < 3) {
    return "full";
  }

  // Stories with 2 new words: hints mode
  if (storyNewWordCount >= 2) {
    return "hints";
  }

  // After 10 stories with good performance: minimal mode
  if (progress.storiesCompleted >= 10) {
    const avgComprehension =
      Array.from(progress.storyResults.values()).reduce(
        (sum, r) => sum + r.comprehensionScore,
        0,
      ) / progress.storiesCompleted;

    if (avgComprehension >= 90) {
      return "minimal";
    }
  }

  // Default: hints mode
  return "hints";
}

/**
 * Convert a story to scaffolded format with highlighted new words
 */
export function prepareScaffoldedStory(
  story: MicroStory,
  userKnownWords: Set<string>,
): MicroStory {
  // Update isKnown status for each word based on user's vocabulary
  const updatedSentences = story.sentences.map((sentence) => ({
    ...sentence,
    words: sentence.words.map((word) => ({
      ...word,
      isKnown:
        userKnownWords.has(word.lemma.toLowerCase()) || word.isNew === false,
      // Mark as new if not in user's vocabulary and not explicitly marked
      isNew: word.isNew || !userKnownWords.has(word.lemma.toLowerCase()),
    })),
  }));

  return {
    ...story,
    sentences: updatedSentences,
  };
}
