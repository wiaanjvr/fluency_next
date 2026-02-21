// Main pipeline orchestrator for cloze item generation

import { createClient } from "@supabase/supabase-js";
import type {
  ClozeLanguage,
  RawSentence,
  ProcessedSentence,
  EnrichedSentence,
  PipelineStats,
} from "@/types/cloze";
import { selectBlankWord, assignLevel } from "./language-utils";
import { fetchAllSentences } from "./sources";
import { batchTranslate, enrichWithGemini } from "./enrichment";

/**
 * Create a Supabase admin client for pipeline writes using the service role key
 */
function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/**
 * Run the full cloze generation pipeline for a language
 */
export async function runClozeGenerationPipeline(
  language: ClozeLanguage,
  source?: string,
  count: number = 1000,
): Promise<PipelineStats> {
  const stats: PipelineStats = {
    fetched: 0,
    passedFilter: 0,
    translated: 0,
    enriched: 0,
    stored: 0,
    geminiCalls: 0,
    translateCalls: 0,
    errors: [],
  };

  const supabase = createAdminClient();

  console.log(
    `[cloze-pipeline] Starting pipeline for ${language}, target: ${count}, source: ${source || "all"}`,
  );

  // Step 1: Fetch raw sentences
  const targetPerSource = source ? count : Math.ceil(count / 5);
  let rawSentences: RawSentence[];
  try {
    rawSentences = await fetchAllSentences(language, source, targetPerSource);
    stats.fetched = rawSentences.length;
    console.log(
      `[cloze-pipeline] Fetched ${rawSentences.length} raw sentences`,
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    stats.errors.push(`Fetch error: ${msg}`);
    return stats;
  }

  // Step 2: Process sentences (clean, tokenize, select blank)
  const processed: ProcessedSentence[] = [];

  for (const raw of rawSentences) {
    const result = selectBlankWord(raw.text, raw.language);
    if (!result) continue;

    const level = assignLevel(raw.text, raw.language);

    processed.push({
      sentence: result.blankedSentence,
      answer: result.answer,
      answerPosition: result.position,
      originalText: raw.text,
      language: raw.language,
      source: raw.source,
      sourceUrl: raw.sourceUrl,
      translation: raw.translation || "",
      level: level as ProcessedSentence["level"],
    });
  }

  stats.passedFilter = processed.length;
  console.log(
    `[cloze-pipeline] ${processed.length} sentences passed filter/processing`,
  );

  if (processed.length === 0) {
    stats.errors.push("No sentences passed processing");
    return stats;
  }

  // Limit to target count
  const toProcess = processed.slice(0, count);

  // Step 3: Translate (skip Tatoeba sentences that already have translations)
  let translated: ProcessedSentence[];
  try {
    translated = await batchTranslate(toProcess);
    stats.translated = translated.length;
    stats.translateCalls = translated.filter(
      (s) => s.source !== "tatoeba",
    ).length;
    console.log(`[cloze-pipeline] Translated ${translated.length} sentences`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    stats.errors.push(`Translation error: ${msg}`);
    translated = toProcess; // Continue with untranslated
  }

  // Step 4: Enrich with Gemini (explanations + distractors)
  let enriched: EnrichedSentence[];
  try {
    const result = await enrichWithGemini(translated, language);
    enriched = result.enriched;
    stats.geminiCalls = result.geminiCalls;
    stats.enriched = enriched.length;
    console.log(
      `[cloze-pipeline] Enriched ${enriched.length} sentences (${result.geminiCalls} Gemini calls)`,
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    stats.errors.push(`Enrichment error: ${msg}`);
    return stats;
  }

  // Step 5: Store in Supabase
  let storedCount = 0;
  const UPSERT_BATCH = 50;

  for (let i = 0; i < enriched.length; i += UPSERT_BATCH) {
    const batch = enriched.slice(i, i + UPSERT_BATCH);
    const rows = batch.map((s) => ({
      language: s.language,
      level: s.level,
      sentence: s.sentence,
      answer: s.answer,
      answer_position: s.answerPosition,
      translation: s.translation || "Translation unavailable",
      explanation: s.explanation,
      distractors: s.distractors,
      source: s.source,
      source_url: s.sourceUrl || null,
      used_count: 0,
    }));

    try {
      // Use upsert with conflict on unique sentence per language
      const { data, error } = await supabase
        .from("cloze_items")
        .upsert(rows, {
          onConflict: "language,sentence",
          ignoreDuplicates: true,
        })
        .select("id");

      if (error) {
        console.error(`[cloze-pipeline] Upsert batch error:`, error);
        stats.errors.push(`Store error: ${error.message}`);
      } else {
        storedCount += data?.length || 0;
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      stats.errors.push(`Store error: ${msg}`);
    }
  }

  stats.stored = storedCount;
  console.log(`[cloze-pipeline] Stored ${storedCount} items in Supabase`);
  console.log(`[cloze-pipeline] Pipeline complete:`, stats);

  return stats;
}
