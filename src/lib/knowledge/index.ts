/* =============================================================================
   UNIFIED KNOWLEDGE SYSTEM — Barrel Export
   
   Everything needed to interact with the unified word knowledge base.
   
   Import from "@/lib/knowledge" for:
   - processReview (central review engine)
   - getWordStateForModule (cross-module state reader)
   - Grammar mastery functions
   - Session deduplication guard
   - All module adapters
   - Event bus for downstream consumers
   - Types
============================================================================= */

// ── Core review engine ────────────────────────────────────────────────────
export { processReview } from "./process-review";

// ── Cross-module state reader ─────────────────────────────────────────────
export { getWordStateForModule, buildPresentationContext } from "./word-state";

// ── Grammar concept mastery ───────────────────────────────────────────────
export {
  updateGrammarConceptMastery,
  getGrammarConceptMastery,
  getConceptMastery,
} from "./grammar-mastery";

// ── Session deduplication guard ───────────────────────────────────────────
export { deduplicationGuard } from "./deduplication-guard";

// ── Event bus ─────────────────────────────────────────────────────────────
export { eventBus } from "./event-bus";

// ── Module adapters ───────────────────────────────────────────────────────
export {
  AnkiAdapter,
  ClozeAdapter,
  ConjugationAdapter,
  PronunciationAdapter,
  StoryAdapter,
  GrammarAdapter,
} from "./adapters";

// ── Types ─────────────────────────────────────────────────────────────────
export type {
  ModuleSource,
  InputMode,
  WordKnowledgeRecord,
  ModuleReviewEvent,
  GrammarConceptMastery,
  ProcessReviewParams,
  WordPresentationContext,
  WordReviewedEvent,
  EventHandler,
} from "./types";

export {
  MODULE_SOURCES,
  INPUT_MODES,
  INTERVAL_CREDIT_WEIGHTS,
  CORRECT_SCORE_DELTAS,
  INCORRECT_SCORE_DELTAS,
  GRAMMAR_MASTERY_WEIGHTS,
  dbRowToWordRecord,
  wordRecordToDbUpdate,
} from "./types";
