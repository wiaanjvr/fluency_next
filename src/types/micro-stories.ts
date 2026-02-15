/**
 * Micro-Stories Types
 * Types for Phase 2: Micro-Stories (300-500 words known)
 *
 * This phase introduces short narrative stories after users have mastered 300+ words.
 *
 * Pedagogical Principles:
 * - Stories use 100% known words OR introduce max 1-2 new words with heavy context
 * - Start with 3-sentence stories, gradually increase to 5 sentences
 * - Click any word for instant translation/audio
 * - Track clicked words for additional review
 * - Scaffolded mode: new words pre-highlighted with inline translation
 */

import { FoundationWord } from "./foundation-vocabulary";

// ============================================================================
// MICRO-STORY TYPES
// Short narrative stories using known vocabulary
// ============================================================================

export interface MicroStory {
  id: string;
  title: string;
  titleTranslation: string;

  // Story content
  sentences: StorySentence[];

  // Difficulty metadata
  difficulty: StoryDifficulty;
  sentenceCount: 3 | 4 | 5;
  totalWordCount: number;

  // Vocabulary requirements
  requiredKnownWords: number; // Minimum known words to attempt this story
  vocabularyLevel: "300-350" | "350-400" | "400-450" | "450-500";

  // New words (0-2 max)
  newWords?: StoryNewWord[];

  // Audio
  audioUrl?: string;
  audioDurationSeconds?: number;

  // Theme/topic
  theme: StoryTheme;
  tags: string[];
}

export interface StorySentence {
  id: string;
  order: number;
  french: string;
  english: string;
  audioUrl?: string;

  // Words breakdown for interactive features
  words: StoryWord[];
}

export interface StoryWord {
  text: string; // The word as it appears in the sentence (with punctuation attached if any)
  cleanText: string; // Word without punctuation
  lemma: string;
  translation: string;
  partOfSpeech: string;
  isNew: boolean; // Is this a new word being introduced?
  isKnown: boolean; // Is this in user's known vocabulary?
  position: number; // Position in sentence
}

export interface StoryNewWord {
  word: string;
  lemma: string;
  translation: string;
  partOfSpeech: string;
  contextClue: string; // Hint from context to infer meaning
  sentenceIndex: number; // Which sentence contains this word
  firstAppearanceIndex: number; // Position in that sentence
}

export type StoryDifficulty = "beginner" | "easy" | "medium" | "challenging";

export type StoryTheme =
  | "daily-life"
  | "family"
  | "food"
  | "animals"
  | "work"
  | "travel"
  | "hobbies"
  | "weather"
  | "shopping"
  | "health";

// ============================================================================
// INTERACTIVE READING TYPES
// Tracking user interactions with story words
// ============================================================================

export interface WordClickEvent {
  id: string;
  userId: string;
  storyId: string;
  sentenceId: string;
  wordText: string;
  wordLemma: string;
  wordPosition: number;
  timestamp: string;
  timeInStoryMs: number; // How long into reading the story
}

export interface ClickedWordStats {
  lemma: string;
  word: string;
  clickCount: number;
  lastClicked: string;
  storiesAppearedIn: string[];
  needsReview: boolean; // True if clicked multiple times
}

export interface UserClickHistory {
  userId: string;
  totalClicks: number;
  uniqueWordsClicked: number;
  wordStats: Map<string, ClickedWordStats>;
  wordsNeedingReview: string[]; // Lemmas that need extra review
}

// ============================================================================
// SCAFFOLDED MODE TYPES
// Pre-highlighted new words with inline translations
// ============================================================================

export interface ScaffoldedWord extends StoryWord {
  showInlineTranslation: boolean;
  highlightColor: "yellow" | "orange" | "blue";
  tooltipContent: {
    translation: string;
    partOfSpeech: string;
    contextClue?: string;
  };
}

export interface ScaffoldedSentence extends Omit<StorySentence, "words"> {
  words: ScaffoldedWord[];
  hasNewWords: boolean;
  newWordCount: number;
}

export interface ScaffoldedStory extends Omit<MicroStory, "sentences"> {
  sentences: ScaffoldedSentence[];
  scaffoldingEnabled: boolean;
  totalNewWords: number;
}

export type ScaffoldingMode =
  | "full" // All new words highlighted with visible translations
  | "hints" // New words highlighted, translation on hover
  | "minimal" // No highlighting, click to reveal
  | "off"; // Standard reading mode

// ============================================================================
// READING SESSION TYPES
// Track progress through a micro-story
// ============================================================================

export interface MicroStorySession {
  id: string;
  userId: string;
  storyId: string;

  // Session state
  phase: StoryReadingPhase;
  scaffoldingMode: ScaffoldingMode;

  // Progress
  currentSentenceIndex: number;
  sentencesCompleted: number[];
  audioPlayed: boolean;
  audioPlayCount: number;

  // Word interactions
  wordClicks: WordClickEvent[];
  wordsViewed: Set<string>; // Lemmas of words user has seen translations for

  // Timing
  startedAt: string;
  completedAt?: string;
  totalReadingTimeMs: number;

  // Results
  comprehensionScore?: number;
  result?: MicroStoryResult;
}

export type StoryReadingPhase =
  | "intro" // Show title, prepare to read
  | "scaffolded-read" // First read with scaffolding
  | "audio-listen" // Listen to story audio
  | "free-read" // Read without scaffolding
  | "comprehension-check" // Quick comprehension questions
  | "word-review" // Review clicked/new words
  | "completed"; // Done

export interface MicroStoryResult {
  storyId: string;
  completedAt: string;

  // Reading metrics
  totalReadingTimeMs: number;
  audioListenCount: number;
  sentenceRereadCount: number;

  // Word interaction metrics
  totalWordClicks: number;
  uniqueWordsClicked: number;
  newWordsEncountered: number;
  wordsNeedingReview: string[];

  // Comprehension
  comprehensionScore: number; // 0-100
  comprehensionQuestionResults?: ComprehensionQuestionResult[];

  // Learning outcomes
  newWordsLearned: string[];
  wordsForExtraReview: string[];
}

// ============================================================================
// COMPREHENSION CHECK TYPES
// Simple questions to verify understanding
// ============================================================================

export interface StoryComprehensionQuestion {
  id: string;
  storyId: string;
  questionType: "true-false" | "multiple-choice" | "word-meaning";

  // Question content (in native language for true comprehension check)
  questionText: string;
  questionLanguage: "english" | "french";

  // For multiple choice
  options?: string[];
  correctOptionIndex?: number;

  // For true/false
  correctAnswer?: boolean;

  // For word-meaning
  targetWord?: string;
  meaningOptions?: string[];
  correctMeaningIndex?: number;

  // Explanation shown after answering
  explanation?: string;
}

export interface ComprehensionQuestionResult {
  questionId: string;
  correct: boolean;
  selectedAnswer: number | boolean;
  responseTimeMs: number;
  timestamp: string;
}

// ============================================================================
// PROGRESS TRACKING TYPES
// Track overall progress in Phase 2
// ============================================================================

export interface MicroStoryProgress {
  userId: string;

  // Phase status
  unlocked: boolean; // True when user has 300+ words
  totalWordsAtUnlock: number;

  // Progress metrics
  storiesCompleted: number;
  storiesAttempted: number;
  totalReadingTimeMinutes: number;

  // Story history
  completedStoryIds: string[];
  storyResults: Map<string, MicroStoryResult>;

  // Word learning through stories
  wordsLearnedFromStories: string[];
  wordsClickedOften: string[]; // Words clicked 3+ times across stories

  // Advancement tracking
  currentLevel: "300-350" | "350-400" | "400-450" | "450-500";
  readyForPhase3: boolean; // Ready for longer passages
}

// ============================================================================
// STORY GENERATION/SELECTION TYPES
// Parameters for selecting appropriate stories
// ============================================================================

export interface StorySelectionParams {
  userId: string;
  knownWordCount: number;
  knownWordLemmas: Set<string>;

  // Preferences
  preferredThemes?: StoryTheme[];
  avoidThemes?: StoryTheme[];
  maxNewWords: 0 | 1 | 2;

  // Difficulty preferences
  preferredDifficulty?: StoryDifficulty;
  preferredSentenceCount?: 3 | 4 | 5;

  // History (to avoid repetition)
  completedStoryIds: string[];
  recentlyViewedStoryIds: string[];
}

export interface StoryMatch {
  story: MicroStory;
  matchScore: number; // 0-100, how well the story fits user's vocabulary
  knownWordPercentage: number;
  newWordCount: number;
  isRecommended: boolean;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface StoryGenerationConfig {
  minKnownWordPercentage: number; // e.g., 95% known words
  maxNewWords: number; // e.g., 2
  targetSentenceCount: 3 | 4 | 5;
  theme?: StoryTheme;
}

export interface WordLookupResult {
  word: string;
  lemma: string;
  translation: string;
  partOfSpeech: string;
  audioUrl?: string;
  exampleSentence?: {
    french: string;
    english: string;
  };
}
