/**
 * AI content generation — builds lean prompts and calls the shared Gemini
 * client to produce 3-word sentences or short paragraphs.
 *
 * Uses the existing `generateJSON` helper from `@/lib/ai-client` so we get
 * the singleton GoogleGenAI instance, timeout guard, and JSON parsing for free.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { generateJSON } from "@/lib/ai-client";
import { getLearnerStage, stageToContentType } from "@/lib/learner-stage";
import {
  getDueWords,
  getKnownWords,
  getKnownWordCount,
  getLatestGeneratedContent,
  insertGeneratedContent,
  type GeneratedContentRow,
  type UserVocabWithWord,
} from "@/lib/vocab";

// ─── Types ───────────────────────────────────────────────────────────────────

/** Shape returned by Gemini (matches the prompt contract). */
interface GeminiGenerationResponse {
  content: string;
  words_used: string[];
}

/** The full result handed back to the caller / API route. */
export interface GenerationResult {
  generated: GeneratedContentRow;
  stage: "3_word" | "paragraph";
  knownWordCount: number;
  dueWordsUsed: string[];
  isExisting: boolean;
}

// ─── Prompt builder ──────────────────────────────────────────────────────────

function buildPrompt(
  knownWords: string[],
  dueWords: string[],
  stage: "3_word" | "paragraph",
  language: string,
): string {
  const stageLabel =
    stage === "3_word" ? "3-word sentence" : "25-50 word paragraph";

  return [
    `Generate a ${stageLabel} in ${language}.`,
    "",
    "The learner knows these words (use freely):",
    knownWords.join(", "),
    "",
    "These words MUST appear (due for review):",
    dueWords.join(", "),
    "",
    "Rules:",
    "- Only use words from the known list and the review words",
    "- Keep it natural and meaningful",
    '- Return JSON only: { "content": string, "words_used": string[] }',
  ].join("\n");
}

// ─── Main orchestrator ───────────────────────────────────────────────────────

/**
 * Generate content for a user. Orchestrates the full pipeline:
 *
 *  1. Count known words → determine learner stage
 *  2. If stage 1 (boot camp), return null — no AI generation
 *  3. Fetch due words — if none, return the latest existing content (idempotent)
 *  4. Fetch known words
 *  5. Build a lean prompt (< 300 tokens)
 *  6. Call Gemini
 *  7. Parse response, store in generated_content
 *  8. Return the stored row + metadata
 */
export async function generateContent(
  supabase: SupabaseClient,
  userId: string,
  language: string,
): Promise<GenerationResult | null> {
  // ── 1. Determine stage ──────────────────────────────────────────────────
  const knownWordCount = await getKnownWordCount(supabase, userId);
  const stage = getLearnerStage(knownWordCount);
  const contentType = stageToContentType(stage);

  // ── 2. Boot camp — no AI generation ─────────────────────────────────────
  if (contentType === null) {
    return null;
  }

  // ── 3. Fetch due words ──────────────────────────────────────────────────
  const dueRows = await getDueWords(supabase, userId, 3);

  // If no words are due, return the latest generated content (idempotent)
  if (dueRows.length === 0) {
    const existing = await getLatestGeneratedContent(supabase, userId);
    if (existing) {
      return {
        generated: existing,
        stage: contentType,
        knownWordCount,
        dueWordsUsed: [],
        isExisting: true,
      };
    }
    // Nothing generated yet and nothing due — nothing to return
    return null;
  }

  // ── 4. Fetch known words (the 95%) ─────────────────────────────────────
  const knownRows = await getKnownWords(supabase, userId, 30);

  // ── 5. Build prompt ─────────────────────────────────────────────────────
  const dueWordStrings = dueRows.map(extractWord);
  const knownWordStrings = knownRows.map(extractWord);

  const prompt = buildPrompt(
    knownWordStrings,
    dueWordStrings,
    contentType,
    language,
  );

  // ── 6. Call Gemini ──────────────────────────────────────────────────────
  const response = await generateJSON<GeminiGenerationResponse>({
    contents: prompt,
    temperature: 0.8,
    maxOutputTokens: 256,
    timeoutMs: 15_000,
  });

  // ── 7. Store in generated_content ───────────────────────────────────────
  const allVocabIds = collectVocabIds(dueRows, knownRows, response.words_used);

  const generated = await insertGeneratedContent(
    supabase,
    userId,
    response.content,
    contentType,
    allVocabIds,
  );

  // ── 8. Return ───────────────────────────────────────────────────────────
  return {
    generated,
    stage: contentType,
    knownWordCount,
    dueWordsUsed: dueWordStrings,
    isExisting: false,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Extract the display word from a joined user_vocab + vocab row. */
function extractWord(row: UserVocabWithWord): string {
  return row.vocab.word;
}

/**
 * Build the vocab_ids array for the generated_content row by matching
 * `words_used` from Gemini back to vocab IDs from the due + known pools.
 */
function collectVocabIds(
  dueRows: UserVocabWithWord[],
  knownRows: UserVocabWithWord[],
  wordsUsed: string[],
): string[] {
  const wordToVocabId = new Map<string, string>();

  for (const row of [...dueRows, ...knownRows]) {
    wordToVocabId.set(row.vocab.word.toLowerCase(), row.vocab.id);
  }

  const ids = new Set<string>();
  for (const w of wordsUsed) {
    const vocabId = wordToVocabId.get(w.toLowerCase());
    if (vocabId) {
      ids.add(vocabId);
    }
  }

  return [...ids];
}
