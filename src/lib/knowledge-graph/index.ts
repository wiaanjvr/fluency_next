/* =============================================================================
   KNOWLEDGE GRAPH — Barrel Export
   
   Unified knowledge graph and integration layer connecting the main story
   engine with the Propel page modules. All cross-module communication flows
   through this module.
   
   Usage:
     import { recordReview, getWordsForStory, ... } from "@/lib/knowledge-graph";
============================================================================= */

// ── Core review system ────────────────────────────────────────────────────
export { recordReview, recordReviewBatch } from "./record-review";

// ── Story engine word selection ───────────────────────────────────────────
export { getWordsForStory } from "./story-word-selector";

// ── Propel recommendation engine ─────────────────────────────────────────
export {
  getPropelRecommendation,
  getPropelRecommendations,
} from "./propel-recommendation";

// ── Grammar lesson unlock trigger ────────────────────────────────────────
export { onGrammarLessonComplete, tagWordsWithGrammar } from "./grammar-unlock";

// ── Module adapters (one per Propel module) ──────────────────────────────
export {
  createModuleAdapter,
  createFlashcardAdapter,
  createClozeAdapter,
  createConjugationAdapter,
  createPronunciationAdapter,
  createGrammarAdapter,
  createFreeReadingAdapter,
  createFoundationAdapter,
  createStoryEngineAdapter,
} from "./module-adapter";

// ── Analytics & stats ────────────────────────────────────────────────────
export {
  getKnowledgeGraphStats,
  getRecentModuleActivity,
  getWordsNeedingAttention,
} from "./analytics";

// ── Re-export types for convenience ──────────────────────────────────────
export type {
  UnifiedWord,
  ReviewEvent,
  ReviewResult,
  ModuleSource,
  PropelModule,
  PropelRecommendation,
  PropelModuleAdapter,
  PropelSessionResult,
  StoryWordSelection,
  GrammarUnlockEvent,
  KnowledgeGraphStats,
  ModuleReviewHistoryRow,
} from "@/types/knowledge-graph";
