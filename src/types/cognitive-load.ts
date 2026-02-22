/* =============================================================================
   Cognitive Load Types

   TypeScript types for the Cognitive Load Estimator ML service.
   These mirror the Python Pydantic schemas and provide the client-side
   contracts for the Next.js ↔ ML service integration.
============================================================================= */

// ---------------------------------------------------------------------------
// Core types
// ---------------------------------------------------------------------------

export type CognitiveLoadTrend = "increasing" | "stable" | "decreasing";

export type CognitiveLoadAction = "continue" | "simplify" | "end-session";

// ---------------------------------------------------------------------------
// Session load snapshot — the primary response type
// ---------------------------------------------------------------------------

export interface CognitiveLoadSnapshot {
  /** Current instantaneous cognitive load (0.0 – 1.0) */
  currentLoad: number;
  /** Recent trend direction */
  trend: CognitiveLoadTrend;
  /** Recommended action based on current + sustained load */
  recommendedAction: CognitiveLoadAction;
  /** Number of events recorded in this session */
  eventCount: number;
  /** Consecutive events above the simplify threshold */
  consecutiveHighLoad: number;
  /** Session-wide rolling average cognitive load */
  avgLoad: number;
  /** Recent per-event load values (last window) */
  recentLoads: number[];
}

// ---------------------------------------------------------------------------
// API request / response shapes
// ---------------------------------------------------------------------------

/** POST /api/ml/cognitive-load/session/init */
export interface InitCognitiveLoadRequest {
  sessionId: string;
  userId: string;
  moduleSource: string;
}

export interface InitCognitiveLoadResponse {
  status: string;
  sessionId: string;
}

/** POST /api/ml/cognitive-load/session/event */
export interface RecordCognitiveLoadEventRequest {
  sessionId: string;
  wordId?: string | null;
  wordStatus?: string | null;
  responseTimeMs?: number | null;
  sequence?: number;
}

export interface RecordCognitiveLoadEventResponse {
  cognitiveLoad: number | null;
}

/** POST /api/ml/cognitive-load/session/end */
export interface EndCognitiveLoadRequest {
  sessionId: string;
}

export interface EndCognitiveLoadResponse {
  status: string;
  sessionId: string;
  finalCognitiveLoad: number | null;
}

// ---------------------------------------------------------------------------
// Thresholds — kept in sync with Python config
// ---------------------------------------------------------------------------

export const COGNITIVE_LOAD_THRESHOLDS = {
  /** Values above this are considered "high" cognitive load */
  HIGH: 0.5,
  /** Sustained load above this → reduce story complexity */
  SIMPLIFY: 0.6,
  /** Load above this → surface "take a break?" prompt */
  BREAK: 0.8,
  /** Number of consecutive high-load words to trigger simplification */
  CONSECUTIVE_WORDS_FOR_SIMPLIFY: 3,
} as const;
