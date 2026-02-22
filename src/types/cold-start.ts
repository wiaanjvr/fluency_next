/**
 * Type definitions for the Cold Start Collaborative Filtering system.
 */

// ── Cluster assignment ─────────────────────────────────────────────────────

export interface ClusterAssignment {
  clusterId: number;
  recommendedPath: string[];
  defaultComplexityLevel: number;
  estimatedVocabStart: string;
  confidence: number;
  recommendedModuleWeights: Record<string, number>;
  assignmentId: string | null;
  usingModel: boolean;
}

// ── Graduation status ──────────────────────────────────────────────────────

export interface GraduationStatus {
  userId: string;
  eventCount: number;
  threshold: number;
  shouldGraduate: boolean;
  currentClusterId: number | null;
  graduated: boolean;
}

// ── Learning goals ─────────────────────────────────────────────────────────

export type LearningGoal = "conversational" | "formal" | "travel" | "business";

export const LEARNING_GOAL_LABELS: Record<LearningGoal, string> = {
  conversational: "Conversational",
  formal: "Formal / Academic",
  travel: "Travel",
  business: "Business",
};

export const LEARNING_GOAL_ICONS: Record<LearningGoal, string> = {
  conversational: "💬",
  formal: "📚",
  travel: "✈️",
  business: "💼",
};

// ── Frequency bands ────────────────────────────────────────────────────────

export type FrequencyBand =
  | "top_500"
  | "top_1000"
  | "top_2000"
  | "top_3000"
  | "top_5000"
  | "top_8000";

export const FREQUENCY_BAND_LABELS: Record<FrequencyBand, string> = {
  top_500: "Most Common 500 Words",
  top_1000: "Top 1,000 Words",
  top_2000: "Top 2,000 Words",
  top_3000: "Top 3,000 Words",
  top_5000: "Top 5,000 Words",
  top_8000: "Top 8,000 Words",
};
