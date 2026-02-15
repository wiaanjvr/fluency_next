/**
 * Sentence Transition Types
 * Types for Phase 1: Transition to Sentences (100-300 words)
 *
 * This phase introduces sentence-based learning after users have mastered 100+ words.
 *
 * Pedagogical Principles:
 * - Sentences use ONLY words the user has learned (+ 0-1 new words)
 * - Pattern recognition through repeated structure exposure
 * - Listening comprehension leads reading (audio-first approach)
 * - No explicit grammar rules - grammar is absorbed through patterns
 */

import { FoundationWord } from "./foundation-vocabulary";

// ============================================================================
// SENTENCE MINING TYPES
// Generate ultra-simple sentences using only learned vocabulary
// ============================================================================

export interface SimpleSentence {
  id: string;
  /** Target language text (French, German, Italian, etc.) */
  target?: string;
  english: string;
  /** @deprecated Use 'target' instead */
  french?: string;
  audioUrl?: string;

  // Words breakdown
  words: SentenceWord[];

  // New word (0-1 per sentence)
  newWord?: {
    word: string;
    meaning: string;
    position: number; // Index in words array
  };

  // Pattern info
  patternId?: string;
  patternName?: string;
}

export interface SentenceWord {
  word: string;
  lemma: string;
  translation: string;
  isNew: boolean;
  isKnown: boolean;
}

export interface SentenceMiningExercise {
  type: "sentence-mining";
  sentence: SimpleSentence;
  exerciseMode:
    | "comprehension" // Listen, understand meaning
    | "word-identification" // Identify specific word in sentence
    | "translation"; // Translate sentence
}

export interface SentenceMiningResult {
  sentenceId: string;
  exerciseMode: SentenceMiningExercise["exerciseMode"];
  correct: boolean;
  responseTimeMs: number;
  timestamp: string;
  newWordLearned?: string;
}

// ============================================================================
// PATTERN RECOGNITION TYPES
// Show sentences with same structure, different vocabulary
// ============================================================================

export interface SentencePattern {
  id: string;
  name: string;
  description: string;

  // Template structure (e.g., "SUBJ + avoir + DET + NOUN")
  template: string;

  // Color coding for visual highlighting
  structureColors: PatternColorScheme[];

  // Example sentences following this pattern
  examples: PatternExample[];

  // Grammar point being demonstrated (not explicitly taught)
  implicitGrammar: string;
}

export interface PatternColorScheme {
  partOfSpeech:
    | "subject"
    | "verb"
    | "object"
    | "article"
    | "adjective"
    | "preposition";
  color: string; // Tailwind color class
  label: string;
}

export interface PatternExample {
  id: string;
  /** @deprecated Use 'target' instead */
  french?: string;
  /** Target language text (French, German, Italian, etc.) */
  target?: string;
  english: string;
  audioUrl?: string;

  // Highlighted parts with color coding
  highlightedParts: HighlightedPart[];
}

export interface HighlightedPart {
  text: string;
  type: PatternColorScheme["partOfSpeech"];
  startIndex: number;
  endIndex: number;
}

export interface PatternRecognitionExercise {
  type: "pattern-recognition";
  pattern: SentencePattern;

  // Exercise variants
  exerciseMode:
    | "observe" // View 3-5 sentences, identify pattern
    | "complete" // Fill in the blank following pattern
    | "generate"; // Create a sentence following pattern

  // For "complete" mode
  incompleteSentence?: {
    /** @deprecated Use 'target' instead */
    french?: string;
    /** Target language text */
    target?: string;
    missingPart: HighlightedPart;
    options: string[];
    correctIndex: number;
  };
}

export interface PatternRecognitionResult {
  patternId: string;
  exerciseMode: PatternRecognitionExercise["exerciseMode"];
  correct: boolean;
  responseTimeMs: number;
  timestamp: string;
}

// ============================================================================
// LISTENING FIRST TYPES
// Audio-first approach: hear sentence, select image, then see text
// ============================================================================

export interface ListeningFirstExercise {
  type: "listening-first";
  sentence: SimpleSentence;

  // Image options for meaning selection
  imageOptions: ListeningImageOption[];
  correctImageIndex: number;

  // Exercise phases
  phase: ListeningPhase;
}

export type ListeningPhase =
  | "audio-only" // Play audio, hide text
  | "select-meaning" // Show images, user selects
  | "reveal-text" // Show text after selection
  | "complete"; // Done

export interface ListeningImageOption {
  id: string;
  imageUrl: string;
  description: string; // For accessibility
  isCorrect: boolean;
}

export interface ListeningFirstResult {
  sentenceId: string;
  correct: boolean;
  attemptsBeforeCorrect: number;
  listenCount: number; // How many times user played audio
  responseTimeMs: number;
  timestamp: string;
}

// ============================================================================
// SESSION TYPES
// Track progress through sentence transition exercises
// ============================================================================

export interface SentenceTransitionSession {
  id: string;
  userId: string;

  // Session content
  exercises: SentenceTransitionExercise[];
  currentExerciseIndex: number;

  // Progress tracking
  completed: boolean;
  startedAt: string;
  completedAt?: string;

  // Results
  results: SentenceTransitionSessionResult;
}

export type SentenceTransitionExercise =
  | SentenceMiningExercise
  | PatternRecognitionExercise
  | ListeningFirstExercise;

export interface SentenceTransitionSessionResult {
  sentencesMastered: number;
  patternsRecognized: number;
  listeningAccuracy: number;
  overallAccuracy: number;

  // Detailed results
  sentenceMiningResults: SentenceMiningResult[];
  patternResults: PatternRecognitionResult[];
  listeningResults: ListeningFirstResult[];

  // New words learned
  newWordsLearned: string[];
}

// ============================================================================
// PROGRESS TYPES
// Track overall progress in Phase 1
// ============================================================================

export interface SentenceTransitionProgress {
  userId: string;

  // Phase status
  unlocked: boolean; // True when user has 100+ words
  totalWordsAtUnlock: number;

  // Progress metrics
  sentencesCompleted: number;
  patternsLearned: string[]; // Pattern IDs
  listeningExercisesCompleted: number;

  // Session history
  sessionsCompleted: number;
  lastSessionDate?: string;

  // Advancement criteria
  readyForPhase2: boolean; // e.g., 50+ sentences, 80%+ accuracy
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface SentenceGenerationParams {
  knownWords: FoundationWord[];
  maxNewWords: 0 | 1;
  targetLength: number; // Words per sentence
  patternId?: string; // Generate for specific pattern
}

export interface PatternMatchResult {
  matches: boolean;
  highlightedParts: HighlightedPart[];
}
