// Translation and AI enrichment for the cloze pipeline

import type {
  ClozeLanguage,
  ProcessedSentence,
  EnrichedSentence,
} from "@/types/cloze";
import { delay } from "./language-utils";

// Translation cache to avoid re-translating
const translationCache = new Map<string, string>();

/**
 * Translate a sentence via the free Google Translate endpoint
 */
export async function translateSentence(
  text: string,
  fromLang: ClozeLanguage,
): Promise<string> {
  const cacheKey = `${fromLang}:${text}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)!;
  }

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${fromLang}&tl=en&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`Translation failed: ${res.status}`);
    }

    const data = await res.json();
    // Response format: [[["translated text","original text",null,null,x],...],...]
    const translation = (data[0] as Array<[string]>)
      .map((x: [string]) => x[0])
      .join("");

    translationCache.set(cacheKey, translation);
    await delay(300); // Rate limit
    return translation;
  } catch (error) {
    console.error("[translate]", error);
    return text; // Return original on failure
  }
}

/**
 * Batch translate sentences, skipping those with existing translations
 */
export async function batchTranslate(
  sentences: ProcessedSentence[],
): Promise<ProcessedSentence[]> {
  const results: ProcessedSentence[] = [];

  for (const s of sentences) {
    if (s.translation && s.translation !== s.originalText) {
      results.push(s);
      continue;
    }

    const translation = await translateSentence(s.originalText, s.language);
    results.push({ ...s, translation });
  }

  return results;
}

/**
 * Enrich sentences with explanations and distractors via Gemini, in batches
 */
export async function enrichWithGemini(
  sentences: ProcessedSentence[],
  language: ClozeLanguage,
): Promise<{ enriched: EnrichedSentence[]; geminiCalls: number }> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.warn(
      "[cloze-pipeline] No GEMINI_API_KEY or GOOGLE_API_KEY, generating placeholder enrichments",
    );
    return {
      enriched: sentences.map((s) => ({
        ...s,
        explanation: `The word "${s.answer}" is commonly used in ${langName(language)} at this level.`,
        distractors: generateFallbackDistractors(s.answer, language),
      })),
      geminiCalls: 0,
    };
  }

  const BATCH_SIZE = 20;
  const MAX_CONCURRENT = 3;
  const enriched: EnrichedSentence[] = [];
  let geminiCalls = 0;

  // Split into batches
  const batches: ProcessedSentence[][] = [];
  for (let i = 0; i < sentences.length; i += BATCH_SIZE) {
    batches.push(sentences.slice(i, i + BATCH_SIZE));
  }

  // Process batches with concurrency limit
  for (let i = 0; i < batches.length; i += MAX_CONCURRENT) {
    const batchGroup = batches.slice(i, i + MAX_CONCURRENT);
    const results = await Promise.all(
      batchGroup.map((batch) => processBatch(batch, language, apiKey)),
    );
    geminiCalls += batchGroup.length;

    for (const result of results) {
      enriched.push(...result);
    }

    // Delay between batch groups
    if (i + MAX_CONCURRENT < batches.length) {
      await delay(1000);
    }
  }

  return { enriched, geminiCalls };
}

async function processBatch(
  batch: ProcessedSentence[],
  language: ClozeLanguage,
  apiKey: string,
): Promise<EnrichedSentence[]> {
  const sentenceList = batch
    .map((s, i) => `${i + 1}. ${s.sentence} | answer: ${s.answer}`)
    .join("\n");

  const levelHint = batch[0]?.level || "B1";
  const prompt = `You are a language learning content generator. For each of the following cloze sentences in ${langName(language)}, return a JSON array. Each item must have:

"explanation": a concise 1-2 sentence grammar or vocabulary explanation of the blanked word, written in English, suitable for a ${levelHint} learner
"distractors": array of exactly 3 plausible but incorrect words that fit grammatically but are wrong

Sentences (the blanked word is shown after |):
${sentenceList}

Return ONLY a valid JSON array with ${batch.length} items. No explanation, no markdown.`;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 4096,
            },
          }),
        },
      );

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`[gemini] HTTP ${res.status}: ${errorText}`);
        continue;
      }

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

      // Parse JSON from response (may be wrapped in ```json ... ```)
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.error("[gemini] No JSON array found in response");
        continue;
      }

      const parsed = JSON.parse(jsonMatch[0]) as Array<{
        explanation: string;
        distractors: string[];
      }>;

      if (parsed.length !== batch.length) {
        console.warn(
          `[gemini] Expected ${batch.length} items, got ${parsed.length}`,
        );
      }

      return batch.map((s, i) => ({
        ...s,
        explanation:
          parsed[i]?.explanation ||
          `The word "${s.answer}" is commonly used in ${langName(language)}.`,
        distractors:
          parsed[i]?.distractors?.length === 3
            ? parsed[i].distractors
            : generateFallbackDistractors(s.answer, language),
      }));
    } catch (error) {
      console.error("[gemini] Parse error:", error);
    }
  }

  // Fallback: return with placeholder enrichments
  return batch.map((s) => ({
    ...s,
    explanation: `The word "${s.answer}" is commonly used in ${langName(language)} at this level.`,
    distractors: generateFallbackDistractors(s.answer, language),
  }));
}

function langName(code: ClozeLanguage): string {
  const names: Record<ClozeLanguage, string> = {
    de: "German",
    fr: "French",
    it: "Italian",
  };
  return names[code];
}

/**
 * Generate simple fallback distractors when Gemini is unavailable
 */
function generateFallbackDistractors(
  answer: string,
  language: ClozeLanguage,
): string[] {
  // Common words per language that make plausible distractors
  const pools: Record<ClozeLanguage, string[]> = {
    de: [
      "Haus",
      "Wasser",
      "Schule",
      "Arbeit",
      "Freund",
      "Zeit",
      "Leben",
      "Stadt",
      "Straße",
      "Morgen",
      "Abend",
      "Buch",
      "Kind",
      "Mensch",
      "Welt",
      "Sprache",
      "Familie",
      "Musik",
      "Reise",
      "Garten",
    ],
    fr: [
      "maison",
      "travail",
      "école",
      "temps",
      "famille",
      "ville",
      "monde",
      "ami",
      "livre",
      "jour",
      "nuit",
      "eau",
      "femme",
      "homme",
      "enfant",
      "route",
      "jardin",
      "musique",
      "voyage",
      "langue",
    ],
    it: [
      "casa",
      "lavoro",
      "scuola",
      "tempo",
      "famiglia",
      "città",
      "mondo",
      "amico",
      "libro",
      "giorno",
      "notte",
      "acqua",
      "donna",
      "uomo",
      "bambino",
      "strada",
      "giardino",
      "musica",
      "viaggio",
      "lingua",
    ],
  };

  const pool = pools[language].filter(
    (w) => w.toLowerCase() !== answer.toLowerCase(),
  );

  // Shuffle and pick 3
  const shuffled = pool.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}
