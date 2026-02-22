/* =============================================================================
   LLM Feedback Generator — TypeScript Types

   Types for the feedback explanation and grammar examples system.
============================================================================= */

// ---------------------------------------------------------------------------
// Error patterns detected by the ML system
// ---------------------------------------------------------------------------

export type ErrorPattern =
  | "production_gap"
  | "contextualization"
  | "slow_recognition"
  | "general_difficulty"
  | "early_learning"
  | "none";

// ---------------------------------------------------------------------------
// Feedback explanation (per word)
// ---------------------------------------------------------------------------

export interface WordFeedback {
  /** Personalized 2-3 sentence explanation */
  explanation: string;
  /** Example sentence at the learner's level */
  exampleSentence: string;
  /** Detected error pattern */
  patternDetected: ErrorPattern;
  /** Human-readable pattern description */
  patternDescription: string;
  /** Confidence in pattern detection (0-1) */
  patternConfidence: number;
  /** Why feedback was or wasn't triggered */
  triggerReason: string;
  /** Whether trigger conditions were met */
  triggered: boolean;
  /** Whether this came from cache */
  cached: boolean;
  /** LLM provider used */
  llmProvider: string;
  /** Specific model used */
  llmModel: string;
  /** LLM call latency in ms */
  latencyMs: number;
}

// ---------------------------------------------------------------------------
// Grammar examples (per grammar concept)
// ---------------------------------------------------------------------------

export interface GrammarExamples {
  /** 3 example sentences with translations */
  sentences: string[];
  /** Grammar concept tag */
  grammarConcept: string;
  /** LLM provider used */
  llmProvider: string;
  /** Specific model used */
  llmModel: string;
  /** LLM call latency in ms */
  latencyMs: number;
}

// ---------------------------------------------------------------------------
// Pattern descriptions for UI display
// ---------------------------------------------------------------------------

export const ERROR_PATTERN_LABELS: Record<ErrorPattern, string> = {
  production_gap: "Production Gap",
  contextualization: "Context Transfer",
  slow_recognition: "Slow Recognition",
  general_difficulty: "General Difficulty",
  early_learning: "Still Learning",
  none: "No Pattern",
};

export const ERROR_PATTERN_ICONS: Record<ErrorPattern, string> = {
  production_gap: "✍️",
  contextualization: "📖",
  slow_recognition: "⏱️",
  general_difficulty: "📚",
  early_learning: "🌱",
  none: "",
};
