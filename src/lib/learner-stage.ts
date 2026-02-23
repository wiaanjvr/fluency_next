/**
 * Learner-stage classification helpers.
 *
 * These pure functions determine the learner's current stage based on their
 * known-word count and map stages to content-generation types.
 *
 * Extracted from the legacy `srs.ts` (SM-2 v1) module so that callers like
 * `generate.ts` no longer depend on the deprecated SRS v1 system.
 */

/** Determine the learner stage based on how many words they know. */
export function getLearnerStage(knownWordCount: number): 1 | 2 | 3 {
  if (knownWordCount < 50) return 1;
  if (knownWordCount < 500) return 2;
  return 3;
}

/** Map a numeric stage to the content-generation stage label. */
export function stageToContentType(
  stage: 1 | 2 | 3,
): "3_word" | "paragraph" | null {
  switch (stage) {
    case 1:
      return null; // Boot camp — no AI generation
    case 2:
      return "3_word";
    case 3:
      return "paragraph";
  }
}
