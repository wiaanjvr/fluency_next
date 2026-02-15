/**
 * Lesson Types - Core types for the 10-phase comprehensible input lesson flow
 *
 * Lesson Flow:
 * 1. Spaced Retrieval Warmup - Quick recall of previous review items
 * 2. Prediction Stage - Keywords + predict story content
 * 3. Audio Text - Listen to the story (audio only)
 * 4. First Recall Prompt - Rough spoken summary without transcript
 * 5. Transcript with Highlights - See text with vocabulary marked
 * 6. Guided Noticing - Infer meaning of new words from context
 * 7. Micro Drills - Sentence reconstruction, paraphrase, constrained output
 * 8. Shadowing Stage - Repeat audio for pronunciation practice
 * 9. Second Recall Prompt - Retell story using target vocabulary
 * 10. Progress Reflection - Metacognitive reflection on improvement
 *
 * Pedagogical Principles:
 * - 95% comprehensible input (known/review vocabulary)
 * - 3-5 new words per lesson maximum
 * - Active recall + spaced repetition integration
 * - Measurable improvement tracking
 */

import { WordStatus, WordRating, ProficiencyLevel } from "./index";

// ===== LESSON PHASES =====

// New 10-phase lesson flow
export type NewLessonPhase =
  | "spaced-retrieval-warmup" // Phase 1: Quick recall prompts
  | "prediction-stage" // Phase 2: Keywords + prediction
  | "audio-text" // Phase 3: Listen to story
  | "first-recall" // Phase 4: Spoken summary without text
  | "transcript-reveal" // Phase 5: See text with highlights
  | "guided-noticing" // Phase 6: Infer word meanings
  | "micro-drills" // Phase 7: Practice exercises
  | "shadowing" // Phase 8: Pronunciation practice
  | "second-recall" // Phase 9: Retell with vocabulary
  | "progress-reflection"; // Phase 10: Metacognitive reflection

// Legacy 6-phase lesson flow
export type LegacyLessonPhase =
  | "audio-comprehension"
  | "verbal-check"
  | "conversation-feedback"
  | "text-reveal"
  | "interactive-exercises"
  | "final-assessment";

// Combined type for all phases
export type LessonPhase = NewLessonPhase | LegacyLessonPhase;

// ===== LESSON PHASES ORDER =====

export const LESSON_PHASE_ORDER: LessonPhase[] = [
  "spaced-retrieval-warmup",
  "prediction-stage",
  "audio-text",
  "first-recall",
  "transcript-reveal",
  "guided-noticing",
  "micro-drills",
  "shadowing",
  "second-recall",
  "progress-reflection",
];

// ===== VOCABULARY CONTEXT =====

export interface LessonVocabularyContext {
  targetLanguage: string;
  cefrLevel: ProficiencyLevel;
  knownVocabList: string[]; // Words learner reliably knows
  reviewVocabList: string[]; // Words due for spaced repetition
  newVocabTarget: string[]; // 3-5 new words for this lesson
  maxSentenceLength: number;
  previousReviewItems: string[]; // From prior lessons, due for warmup
}

// ===== PHASE 1: SPACED RETRIEVAL WARMUP =====

export interface RetrievalPrompt {
  id: string;
  type: "comprehension" | "production";
  prompt: string; // The question/cue
  targetWord: string; // Word being recalled
  expectedResponse?: string; // For production prompts
}

export interface SpacedRetrievalWarmup {
  prompts: RetrievalPrompt[]; // 3 ultra-short prompts
}

// ===== PHASE 2: PREDICTION STAGE =====

export interface PredictionStage {
  keywords: string[]; // 3 keywords, at least 1 new word
  predictionPrompt: string; // "What do you think the story will be about?"
}

// ===== PHASE 3: AUDIO TEXT =====

export interface AudioText {
  storyText: string; // Full story (1-5 sentences)
  audioUrl: string;
  sentenceCount: number;
  wordCount: number;
  knownWordPercentage: number; // Should be ~95%
}

// ===== PHASE 4: FIRST RECALL PROMPT =====

export interface FirstRecallPrompt {
  instruction: string;
  encouragement: string; // "It's okay if you only caught part of it"
}

// ===== PHASE 5: TRANSCRIPT WITH HIGHLIGHTS =====

export interface HighlightedWord {
  word: string;
  lemma: string;
  startIndex: number;
  endIndex: number;
  highlightType: "new" | "review";
  translation?: string;
}

export interface TranscriptWithHighlights {
  storyText: string;
  highlightedWords: HighlightedWord[];
}

// ===== PHASE 6: GUIDED NOTICING =====

export interface GuidedNoticingItem {
  word: string;
  contextSentence: string; // Sentence from story where word appears
  inferencePrompt: string; // "What do you think X means based on the sentence?"
  meaning: string; // Concise meaning
  microExample: string; // Additional example sentence
}

export interface GuidedNoticing {
  items: GuidedNoticingItem[]; // One per new word
}

// ===== PHASE 7: MICRO DRILLS =====

export interface SentenceReconstructionDrill {
  type: "reconstruction";
  originalSentence: string;
  scrambledWords: string[];
  hint?: string;
}

export interface ParaphraseDrill {
  type: "paraphrase";
  originalSentence: string;
  instruction: string;
  sampleAnswer?: string;
}

export interface ConstrainedOutputDrill {
  type: "constrained-output";
  instruction: string;
  requiredWords: string[]; // At least 2 new vocab words required
  context?: string;
  sampleAnswer?: string;
}

export type MicroDrill =
  | SentenceReconstructionDrill
  | ParaphraseDrill
  | ConstrainedOutputDrill;

export interface MicroDrills {
  drills: MicroDrill[];
}

// ===== PHASE 8: SHADOWING STAGE =====

export interface ShadowingStage {
  audioUrl: string;
  instruction: string;
  focusPoints: string[]; // Specific pronunciation points to focus on
}

// ===== PHASE 9: SECOND RECALL PROMPT =====

export interface SecondRecallPrompt {
  instruction: string;
  requiredNewWords: string[]; // At least 2 new vocab words
  requiredReviewWords: string[]; // At least 1 review word
}

// ===== PHASE 10: PROGRESS REFLECTION =====

export interface ProgressReflection {
  questions: string[];
  // "What did you understand better the second time?"
  // "Which word felt easier?"
  // "What was still difficult?"
}

// ===== COMPLETE LESSON STRUCTURE =====

export interface LessonContent {
  spacedRetrievalWarmup: SpacedRetrievalWarmup;
  predictionStage: PredictionStage;
  audioText: AudioText;
  firstRecallPrompt: FirstRecallPrompt;
  transcriptWithHighlights: TranscriptWithHighlights;
  guidedNoticing: GuidedNoticing;
  microDrills: MicroDrills;
  shadowingStage: ShadowingStage;
  secondRecallPrompt: SecondRecallPrompt;
  progressReflection: ProgressReflection;
}

// ===== LEGACY LESSON CONTENT (for migration) =====

export interface LessonWord {
  word: string;
  lemma: string;
  translation?: string;
  partOfSpeech?: string;
  isNew: boolean; // User hasn't seen before
  isDueForReview: boolean; // Due per SRS schedule
  userKnowledge?: WordStatus;
  frequencyRank?: number;
  position: number; // Position in text
}

export interface Lesson {
  id: string;
  userId: string;

  // New structured content (10-phase lesson)
  content?: LessonContent;
  vocabularyContext?: LessonVocabularyContext;

  // Legacy content (for backward compatibility)
  targetText: string; // The French (or target language) text
  translation: string; // English translation for reference
  audioUrl?: string; // TTS or recorded audio URL

  // Metadata
  language: string;
  level: ProficiencyLevel;
  topic?: string;
  title: string;

  // Word analysis
  words: LessonWord[];
  totalWords: number;
  newWordCount: number;
  reviewWordCount: number;
  knownWordCount: number;
  comprehensionPercentage: number; // Expected comprehension based on known words

  // Progress tracking
  currentPhase: LessonPhase;
  listenCount: number;
  completed: boolean;

  // Timestamps
  createdAt: string;
  startedAt?: string;
  completedAt?: string;

  // Generation metadata
  generationParams: LessonGenerationParams;
}

export interface LessonGenerationParams {
  targetWordCount: number;
  newWordPercentage: number; // Target ~5%
  reviewWordPriority: boolean; // Prioritize words due for review
  topicPreference?: string;
  contentType?: ContentType; // narrative, dialogue, descriptive, opinion
  grammarFocus?: string[];
  // New parameters for enhanced lesson generation
  maxNewWords?: number; // Maximum 3-5 new words
  maxSentenceLength?: number; // CEFR-appropriate sentence length
}

// ===== COMPREHENSION EVALUATION =====

export interface ComprehensionResponse {
  id: string;
  lessonId: string;
  userId: string;
  phase: "first-recall" | "second-recall" | "verbal-check" | "final-assessment"; // New and legacy phase names

  // User's response
  audioBlob?: Blob;
  audioUrl?: string;
  transcript?: string; // Transcribed speech

  // Evaluation
  evaluation?: ComprehensionEvaluation;

  createdAt: string;
}

export interface ComprehensionEvaluation {
  // Core scores (0-100)
  comprehensionScore: number; // How well they understood the content
  detailScore: number; // How many details they captured
  languageUseScore: number; // Use of target language (bonus, not penalty)

  // Qualitative feedback
  understoodConcepts: string[]; // Key concepts they demonstrated understanding
  missedConcepts: string[]; // Important things they didn't mention
  vocabularyUsed: string[]; // Target words they used correctly
  suggestedVocabulary: string[]; // Words we want to teach based on their response

  // Follow-up for conversation phase
  followUpQuestions: string[]; // Questions to ask in conversational feedback
  vocabularyHints: VocabularyHint[]; // Hints for words they struggled with

  // Overall feedback message
  feedbackMessage: string;
  encouragement: string;
}

export interface VocabularyHint {
  word: string;
  translation: string;
  context: string; // How it appeared in the lesson
  hint: string; // Helpful hint for remembering
}

// ===== CONVERSATION FEEDBACK =====

export interface ConversationTurn {
  id: string;
  role: "assistant" | "user";

  // Content
  text: string;
  audioUrl?: string;

  // For assistant turns
  questionType?:
    | "comprehension"
    | "clarification"
    | "vocabulary"
    | "expansion"
    | "scenario"
    | "wrap-up";
  vocabularyFocus?: string[]; // Words we're trying to teach in this turn

  timestamp: string;
}

export interface ConversationSession {
  id: string;
  lessonId: string;
  userId: string;

  turns: ConversationTurn[];

  // Tracking
  comprehensionImproved: boolean;
  newWordsIntroduced: string[];

  createdAt: string;
  completedAt?: string;
}

// ===== INTERACTIVE EXERCISES =====

export type ExerciseType =
  | "multiple-choice" // Comprehension questions
  | "fill-blank" // Fill in the blank with vocabulary
  | "word-match" // Match word to translation
  | "sentence-order" // Put words in correct order
  | "listening-select" // Listen and select correct option
  | "word-definition" // Select correct definition
  | "grammar-choice"; // Choose grammatically correct option

export interface Exercise {
  id: string;
  lessonId: string;
  type: ExerciseType;

  // Question
  question: string;
  audioUrl?: string; // For listening exercises
  targetWord?: string; // Word being practiced

  // Answer options
  options: string[];
  correctAnswer: number; // Index of correct option

  // Feedback
  explanation?: string;
  grammarNote?: string;

  // For tracking
  focusArea: "comprehension" | "vocabulary" | "grammar";
  difficulty: "easy" | "medium" | "hard";
}

export interface ExerciseAttempt {
  exerciseId: string;
  selectedAnswer: number;
  isCorrect: boolean;
  timeSpentMs: number;
}

export interface ExerciseSession {
  id: string;
  lessonId: string;
  userId: string;

  exercises: Exercise[];
  attempts: ExerciseAttempt[];

  score: number; // Percentage correct
  completed: boolean;

  createdAt: string;
  completedAt?: string;
}

// ===== VOCABULARY RATING (Phase 4) =====

export interface VocabularyRating {
  lessonId: string;
  word: string;
  lemma: string;
  rating: WordRating; // 0-5 scale
  timeSpentMs?: number;
  context: string; // Sentence where word appeared
}

// ===== LESSON SESSION STATE =====

export interface RetrievalWarmupState {
  completedPrompts: string[]; // IDs of completed prompts
  responses: Record<string, string>; // promptId -> user response
}

export interface PredictionStageState {
  userPrediction?: string;
}

export interface AudioTextState {
  listenCount: number;
  totalListenTime: number; // In seconds
}

export interface RecallState {
  audioUrl?: string;
  transcript?: string;
  attemptCount: number;
}

export interface GuidedNoticingState {
  completedWords: string[];
  inferences: Record<string, string>; // word -> user's inference
}

export interface MicroDrillsState {
  completedDrills: number[];
  attempts: Record<number, { response: string; correct: boolean }>;
}

export interface ShadowingState {
  repeatCount: number;
}

export interface ReflectionState {
  responses: Record<string, string>; // question -> response
}

export interface LessonSessionState {
  lesson: Lesson;
  currentPhase: LessonPhase;

  // Phase states for new 10-phase flow
  retrievalWarmup: RetrievalWarmupState;
  predictionStage: PredictionStageState;
  audioText: AudioTextState;
  firstRecall: RecallState;
  guidedNoticing: GuidedNoticingState;
  microDrills: MicroDrillsState;
  shadowing: ShadowingState;
  secondRecall: RecallState;
  reflection: ReflectionState;

  // Legacy phase states (for backward compatibility)
  listenCount: number;
  initialResponse?: ComprehensionResponse;
  conversation?: ConversationSession;
  vocabularyRatings: VocabularyRating[];
  revealedText: boolean;
  exerciseSession?: ExerciseSession;
  finalResponse?: ComprehensionResponse;

  // Overall progress
  phaseProgress: Record<LessonPhase, number>; // 0-100 for each phase
  overallProgress: number;

  startedAt: string;
  lastActivityAt: string;
}

// ===== CONTENT TYPES FOR ADVANCED USERS =====

export const CONTENT_TYPES = [
  "narrative",
  "dialogue",
  "descriptive",
  "opinion",
] as const;

export type ContentType = (typeof CONTENT_TYPES)[number];

// ===== API REQUEST/RESPONSE TYPES =====

export interface GenerateLessonRequest {
  language?: string;
  level?: ProficiencyLevel;
  topic?: string;
  contentType?: ContentType;
  wordCountTarget?: number;
  prioritizeReview?: boolean;
  // New parameters
  knownVocab?: string[];
  reviewVocab?: string[];
  previousReviewItems?: string[];
}

export interface GenerateLessonResponse {
  lesson: Lesson;
  wordStats: {
    newWords: string[];
    reviewWords: string[];
    knownWords: string[];
  };
}

export interface EvaluateComprehensionRequest {
  lessonId: string;
  phase: "first-recall" | "second-recall";
  audioUrl?: string;
  transcript?: string;
}

export interface EvaluateComprehensionResponse {
  evaluation: ComprehensionEvaluation;
  nextAction: "continue" | "retry" | "get-help";
}

export interface ConversationRequest {
  lessonId: string;
  sessionId?: string;
  userMessage: string;
  userAudioUrl?: string;
}

export interface ConversationResponse {
  assistantMessage: string;
  assistantAudioUrl?: string;
  vocabularyHints?: VocabularyHint[];
  sessionId: string;
  shouldContinue: boolean;
}

export interface GenerateExercisesRequest {
  lessonId: string;
  focusAreas?: ("comprehension" | "vocabulary" | "grammar")[];
  count?: number;
}

export interface GenerateExercisesResponse {
  exercises: Exercise[];
  sessionId: string;
}

// Simplified evaluation request/response for the evaluation API route
export interface EvaluationRequest {
  lessonId: string;
  phase: LessonPhase;
  targetText: string;
  userResponse?: string;
  language?: string;
  conversationHistory?: ConversationTurn[];
  vocabularyRatings?: VocabularyRating[];
  exerciseResults?: ExerciseAttempt[];
}

export interface EvaluationResponse {
  transcription: string;
  evaluation: ComprehensionEvaluation;
  conversationTurn?: {
    message: string;
    vocabularyHint?: VocabularyHint;
    questionType:
      | "comprehension"
      | "clarification"
      | "vocabulary"
      | "expansion";
  };
}
