/* =============================================================================
   MODULE ADAPTERS — Barrel Export
   
   All module adapters re-exported from a single entry point.
   Each adapter is a thin mapping layer with ZERO scoring logic.
============================================================================= */

export { AnkiAdapter } from "./anki";
export type { AnkiRating } from "./anki";

export { ClozeAdapter } from "./cloze";
export type { ClozeAnswerType } from "./cloze";

export { ConjugationAdapter } from "./conjugation";

export { PronunciationAdapter } from "./pronunciation";

export { StoryAdapter } from "./story";
export type { StoryInteractionType } from "./story";

export { GrammarAdapter } from "./grammar";
