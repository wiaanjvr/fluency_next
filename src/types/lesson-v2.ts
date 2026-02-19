/**
 * Lesson V2 Types — Complete overhaul of the lesson system
 *
 * Two-phase lesson flow:
 *   Phase 1 — Word Introduction (isolated vocab introduction)
 *   Phase 2 — Story Lesson (micro-story with mixed-language scaffolding)
 *
 * Progression ladder tied to mastery count:
 *   0-29   → Comprehension only
 *   30-74  → Guided recall (fill-in-blank)
 *   75-149 → Constrained production
 *   150+   → Full target-language production
 */

// ═══════════════════════════════════════════════════════════════════
// LEARNER PROFILE
// ═══════════════════════════════════════════════════════════════════

export interface LearnerProfile {
  userId: string;
  targetLanguage: string;
  nativeLanguage: string; // "en" for now
  interests: [string, string, string]; // exactly 3
  knownWords: LearnerWord[]; // frequency-ranked with mastery status
  masteryCount: number; // words with demonstrated mastery
}

export interface LearnerWord {
  word: string;
  lemma: string;
  translation: string;
  partOfSpeech: string;
  frequencyRank: number;
  status: WordMasteryStatus;
  introducedAt: string; // ISO timestamp — when Phase 1 was completed
  lastReviewedAt?: string;
  correctStreak: number; // consecutive correct recalls
  totalReviews: number;
  totalCorrect: number;
}

export type WordMasteryStatus =
  | "introduced" // seen in Phase 1 but not yet recalled
  | "learning" // some successful recalls
  | "mastered"; // reliable recall — counts toward mastery_count

// ═══════════════════════════════════════════════════════════════════
// MASTERY STAGES — drive mixing ratio + exercise type
// ═══════════════════════════════════════════════════════════════════

export type MasteryStage =
  | "stage-1" // 0-29 mastered
  | "stage-2" // 30-49
  | "stage-3" // 50-74
  | "stage-4" // 75-149
  | "stage-5"; // 150+

export interface MasteryStageConfig {
  stage: MasteryStage;
  label: string;
  minMastery: number;
  maxMastery: number;
  englishRatio: number; // 0-100
  targetRatio: number; // 0-100
  exerciseType: ExerciseType;
}

export type ExerciseType =
  | "comprehension" // read story, answer meaning-check in English
  | "guided-recall" // fill-in-blank with known target word
  | "constrained-production" // build a sentence from key words
  | "full-production"; // write entirely in target language

export const MASTERY_STAGES: MasteryStageConfig[] = [
  {
    stage: "stage-1",
    label: "Comprehension",
    minMastery: 0,
    maxMastery: 29,
    englishRatio: 80,
    targetRatio: 20,
    exerciseType: "comprehension",
  },
  {
    stage: "stage-2",
    label: "Building Bridges",
    minMastery: 30,
    maxMastery: 49,
    englishRatio: 60,
    targetRatio: 40,
    exerciseType: "guided-recall",
  },
  {
    stage: "stage-3",
    label: "Gaining Ground",
    minMastery: 50,
    maxMastery: 74,
    englishRatio: 40,
    targetRatio: 60,
    exerciseType: "guided-recall",
  },
  {
    stage: "stage-4",
    label: "Emerging Fluency",
    minMastery: 75,
    maxMastery: 149,
    englishRatio: 20,
    targetRatio: 80,
    exerciseType: "constrained-production",
  },
  {
    stage: "stage-5",
    label: "Full Immersion",
    minMastery: 150,
    maxMastery: Infinity,
    englishRatio: 0,
    targetRatio: 100,
    exerciseType: "full-production",
  },
];

// ═══════════════════════════════════════════════════════════════════
// PHASE 1 — WORD INTRODUCTION
// ═══════════════════════════════════════════════════════════════════

export interface WordIntroductionItem {
  word: string;
  lemma: string;
  translation: string;
  partOfSpeech: string;
  frequencyRank: number;
  audioUrl?: string; // TTS url for shadowing
  phonetic?: string;
}

/** The state machine for a single word introduction */
export type WordIntroStep =
  | "listen-and-shadow" // display word + audio, learner repeats
  | "guess-meaning" // learner types/selects meaning guess
  | "reveal-meaning"; // show correct meaning

export interface WordIntroductionSession {
  words: WordIntroductionItem[];
  currentIndex: number;
  currentStep: WordIntroStep;
  guesses: Record<string, string>; // word → learner guess
  completed: boolean;
}

// ═══════════════════════════════════════════════════════════════════
// PHASE 2 — STORY LESSON
// ═══════════════════════════════════════════════════════════════════

/** A single sentence in the story */
export interface StorySentence {
  sentence_number: number;
  text: string; // mixed or full target language sentence
  target_words_used: string[]; // target language words in this sentence
  english_translation: string;
}

/** The full AI story output */
export interface GeneratedStory {
  interest_theme: string;
  new_words_introduced: string[];
  story: StorySentence[];
}

/** Emotional tone to vary across sessions */
export type StoryTone = "curiosity" | "humor" | "mild-tension" | "warmth";

/** Request parameters for story generation */
export interface StoryGenerationRequest {
  userId: string;
  targetLanguage: string;
  interests: [string, string, string];
  knownWords: LearnerWord[];
  masteryCount: number;
  previousTone?: StoryTone;
  previousInterestIndex?: number;
}

/** Full story lesson including the exercise */
export interface StoryLesson {
  story: GeneratedStory;
  stage: MasteryStageConfig;
  exercise: LessonExercise;
  tone: StoryTone;
}

// ═══════════════════════════════════════════════════════════════════
// EXERCISES
// ═══════════════════════════════════════════════════════════════════

export interface ComprehensionExercise {
  type: "comprehension";
  question: string; // in English
  options: string[]; // 4 options
  correctIndex: number;
}

export interface GuidedRecallExercise {
  type: "guided-recall";
  sentenceWithBlank: string; // sentence with ___ for the removed word
  removedWord: string; // the target language word that was removed
  hint?: string; // optional English hint
  options?: string[]; // optional multiple choice
}

export interface ConstrainedProductionExercise {
  type: "constrained-production";
  prompt: string; // simple instruction
  keyWords: string[]; // words to use
  mixingFormat: string; // e.g. "Use 80% French and 20% English"
  sampleAnswer?: string;
}

export interface FullProductionExercise {
  type: "full-production";
  prompt: string;
  keyWords: string[];
  sampleAnswer?: string;
}

export type LessonExercise =
  | ComprehensionExercise
  | GuidedRecallExercise
  | ConstrainedProductionExercise
  | FullProductionExercise;

// ═══════════════════════════════════════════════════════════════════
// SESSION STATE
// ═══════════════════════════════════════════════════════════════════

export type LessonPhaseV2 =
  | "word-introduction"
  | "story-lesson"
  | "exercise"
  | "complete";

export interface LessonSessionV2 {
  id: string;
  userId: string;
  phase: LessonPhaseV2;
  wordIntroduction?: WordIntroductionSession;
  storyLesson?: StoryLesson;
  exerciseResponse?: string;
  exerciseCorrect?: boolean;
  startedAt: string;
  completedAt?: string;
}

// ═══════════════════════════════════════════════════════════════════
// FREQUENCY CORPUS ENTRY
// ═══════════════════════════════════════════════════════════════════

export interface FrequencyCorpusWord {
  rank: number;
  word: string;
  lemma: string;
  pos: string; // "verb" | "noun" | "adjective" | etc.
  translation: string;
  isInitialWord?: boolean; // one of the first 10 special words
}

export interface FrequencyCorpus {
  language: string;
  words: FrequencyCorpusWord[];
}
