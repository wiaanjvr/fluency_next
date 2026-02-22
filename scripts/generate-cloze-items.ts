/**
 * generate-cloze-items.ts — Background content pipeline for Cloze Activities.
 *
 * Fetches authentic sentences from 5 real-world sources, processes them into
 * cloze-deletion exercises via Gemini AI, and stores them in Supabase.
 *
 * Sources: Wikipedia, Gutenberg, News (RSS), Reddit, Tatoeba
 *
 * Run with: npx tsx scripts/generate-cloze-items.ts
 * Options:
 *   --language=de|fr|it       Target language (default: all three)
 *   --level=A1|A2|B1|B2|C1   Target level (default: all levels)
 *   --source=wikipedia|...    Single source (default: all five)
 *   --limit=200               Items per source per language (default: 200)
 *   --dry-run                 Don't write to Supabase, just log stats
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

// Load .env.local
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// ============================================================================
// Config & types
// ============================================================================

type ClozeLanguage = "de" | "fr" | "it";
type ClozeLevel = "A1" | "A2" | "B1" | "B2" | "C1";
type ClozeSource = "wikipedia" | "gutenberg" | "newsapi" | "reddit" | "tatoeba";

interface RawSentence {
  text: string;
  language: ClozeLanguage;
  source: ClozeSource;
  sourceUrl?: string;
}

interface ClozeItemRow {
  language: string;
  level: string;
  sentence: string;
  answer: string;
  answer_position: number;
  translation: string;
  explanation: string;
  distractors: string[];
  source: string;
  source_url: string | null;
}

interface PipelineStats {
  fetched: number;
  enriched: number;
  stored: number;
  errors: string[];
  geminiCalls: number;
}

const ALL_LANGUAGES: ClozeLanguage[] = ["de", "fr", "it"];
const ALL_LEVELS: ClozeLevel[] = ["A1", "A2", "B1", "B2", "C1"];
const ALL_SOURCES: ClozeSource[] = [
  "wikipedia",
  "gutenberg",
  "newsapi",
  "reddit",
  "tatoeba",
];

const LANGUAGE_NAMES: Record<ClozeLanguage, string> = {
  de: "German",
  fr: "French",
  it: "Italian",
};

const ITEMS_PER_SOURCE = 200;
const BATCH_SIZE = 10; // sentences per Gemini call
const GEMINI_DELAY_MS = 1500; // rate-limit courtesy

// ============================================================================
// Parse CLI args
// ============================================================================

const args = process.argv.slice(2);
function getArg(name: string): string | undefined {
  const arg = args.find((a) => a.startsWith(`--${name}=`));
  return arg?.split("=")[1];
}
const DRY_RUN = args.includes("--dry-run");
const TARGET_LANG = getArg("language") as ClozeLanguage | undefined;
const TARGET_LEVEL = getArg("level") as ClozeLevel | undefined;
const TARGET_SOURCE = getArg("source") as ClozeSource | undefined;
const LIMIT = parseInt(getArg("limit") || String(ITEMS_PER_SOURCE), 10);

const languages = TARGET_LANG ? [TARGET_LANG] : ALL_LANGUAGES;
const sources = TARGET_SOURCE ? [TARGET_SOURCE] : ALL_SOURCES;

// ============================================================================
// Supabase client
// ============================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const geminiKey = process.env.GOOGLE_API_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
  );
  process.exit(1);
}
if (!geminiKey) {
  console.error("Missing GOOGLE_API_KEY for Gemini");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ============================================================================
// Gemini API helper
// ============================================================================

async function callGemini(prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 4096,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// Source fetchers — each returns raw sentences
// ============================================================================

const WIKI_LANGUAGES: Record<ClozeLanguage, string> = {
  de: "de",
  fr: "fr",
  it: "it",
};

async function fetchWikipediaSentences(
  lang: ClozeLanguage,
  count: number,
): Promise<RawSentence[]> {
  console.log(`  [wikipedia] Fetching ${count} sentences for ${lang}...`);
  const sentences: RawSentence[] = [];
  const wikiLang = WIKI_LANGUAGES[lang];

  // Fetch random articles and extract sentences
  const batchSize = 10;
  const batches = Math.ceil(count / batchSize);

  for (let b = 0; b < batches && sentences.length < count; b++) {
    try {
      const url = `https://${wikiLang}.wikipedia.org/api/rest_v1/page/random/summary`;
      const res = await fetch(url);
      if (!res.ok) continue;

      const data = await res.json();
      const text: string = data.extract || "";
      const articleUrl = data.content_urls?.desktop?.page || "";

      // Split into sentences
      const rawSentences = text
        .split(/(?<=[.!?])\s+/)
        .filter((s: string) => s.length >= 30 && s.length <= 200)
        .filter((s: string) => /^[A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖÙÚÛÜÝ]/u.test(s));

      for (const s of rawSentences) {
        if (sentences.length >= count) break;
        sentences.push({
          text: s.trim(),
          language: lang,
          source: "wikipedia",
          sourceUrl: articleUrl,
        });
      }

      await sleep(200); // Respect rate limits
    } catch (err) {
      // Continue on individual fetch errors
    }
  }

  console.log(`  [wikipedia] Got ${sentences.length} sentences for ${lang}`);
  return sentences.slice(0, count);
}

async function fetchGutenbergSentences(
  lang: ClozeLanguage,
  count: number,
): Promise<RawSentence[]> {
  console.log(`  [gutenberg] Fetching ${count} sentences for ${lang}...`);
  const sentences: RawSentence[] = [];

  // Gutenberg language codes
  const gutenbergLangs: Record<ClozeLanguage, string> = {
    de: "de",
    fr: "fr",
    it: "it",
  };

  try {
    const searchUrl = `https://gutendex.com/books/?languages=${gutenbergLangs[lang]}&mime_type=text/plain&page=1`;
    const res = await fetch(searchUrl);
    if (!res.ok) return sentences;

    const data = await res.json();
    const books = (data.results || []).slice(0, 5);

    for (const book of books) {
      if (sentences.length >= count) break;

      // Find plain text URL
      const formats = book.formats || {};
      const textUrl =
        formats["text/plain; charset=utf-8"] || formats["text/plain"] || "";
      if (!textUrl) continue;

      try {
        const textRes = await fetch(textUrl);
        if (!textRes.ok) continue;

        const fullText = await textRes.text();
        // Take a middle section (skip header/footer)
        const lines = fullText.split("\n");
        const start = Math.floor(lines.length * 0.2);
        const end = Math.floor(lines.length * 0.8);
        const middleText = lines.slice(start, end).join(" ");

        const rawSentences = middleText
          .split(/(?<=[.!?])\s+/)
          .map((s) => s.replace(/\s+/g, " ").trim())
          .filter((s) => s.length >= 30 && s.length <= 200)
          .filter((s) => !/^[0-9]/.test(s));

        for (const s of rawSentences.slice(0, Math.ceil(count / 3))) {
          if (sentences.length >= count) break;
          sentences.push({
            text: s,
            language: lang,
            source: "gutenberg",
            sourceUrl: `https://www.gutenberg.org/ebooks/${book.id}`,
          });
        }
      } catch {
        // Skip failed book downloads
      }
    }
  } catch (err) {
    console.warn(`  [gutenberg] Error fetching for ${lang}:`, err);
  }

  console.log(`  [gutenberg] Got ${sentences.length} sentences for ${lang}`);
  return sentences.slice(0, count);
}

async function fetchNewsSentences(
  lang: ClozeLanguage,
  count: number,
): Promise<RawSentence[]> {
  console.log(`  [news] Fetching ${count} sentences for ${lang}...`);
  const sentences: RawSentence[] = [];

  // Use RSS feeds for multilingual news (free, no API key needed)
  const rssFeeds: Record<ClozeLanguage, string[]> = {
    de: [
      "https://www.tagesschau.de/xml/rss2/",
      "https://www.spiegel.de/schlagzeilen/tops/index.rss",
    ],
    fr: [
      "https://www.lemonde.fr/rss/une.xml",
      "https://www.france24.com/fr/rss",
    ],
    it: [
      "https://www.ansa.it/sito/ansait_rss.xml",
      "https://www.repubblica.it/rss/homepage/rss2.0.xml",
    ],
  };

  for (const feedUrl of rssFeeds[lang]) {
    if (sentences.length >= count) break;

    try {
      const res = await fetch(feedUrl);
      if (!res.ok) continue;

      const xml = await res.text();
      // Simple regex extraction of description/title from RSS
      const descriptions = [
        ...xml.matchAll(/<description><!\[CDATA\[(.*?)\]\]><\/description>/gs),
        ...xml.matchAll(/<description>(.*?)<\/description>/gs),
      ];

      for (const match of descriptions) {
        if (sentences.length >= count) break;
        const text = match[1]
          .replace(/<[^>]*>/g, "") // Strip HTML
          .replace(/&[a-z]+;/g, " ")
          .trim();

        const sents = text
          .split(/(?<=[.!?])\s+/)
          .filter((s) => s.length >= 30 && s.length <= 200);

        for (const s of sents) {
          if (sentences.length >= count) break;
          sentences.push({
            text: s.trim(),
            language: lang,
            source: "newsapi",
            sourceUrl: feedUrl,
          });
        }
      }
    } catch {
      // Skip failed feeds
    }
  }

  console.log(`  [news] Got ${sentences.length} sentences for ${lang}`);
  return sentences.slice(0, count);
}

async function fetchRedditSentences(
  lang: ClozeLanguage,
  count: number,
): Promise<RawSentence[]> {
  console.log(`  [reddit] Fetching ${count} sentences for ${lang}...`);
  const sentences: RawSentence[] = [];

  // Subreddits with native-language content
  const subreddits: Record<ClozeLanguage, string[]> = {
    de: ["de", "FragReddit", "ich_iel"],
    fr: ["france", "rance", "AskFrance"],
    it: ["italy", "Italia"],
  };

  for (const sub of subreddits[lang]) {
    if (sentences.length >= count) break;

    try {
      const url = `https://www.reddit.com/r/${sub}/hot.json?limit=50`;
      const res = await fetch(url, {
        headers: { "User-Agent": "fluensea-pipeline/1.0" },
      });
      if (!res.ok) continue;

      const data = await res.json();
      const posts = data?.data?.children || [];

      for (const post of posts) {
        if (sentences.length >= count) break;
        const selftext: string = post.data?.selftext || "";
        const title: string = post.data?.title || "";
        const permalink: string = post.data?.permalink || "";

        const combined = `${title}. ${selftext}`;
        const sents = combined
          .split(/(?<=[.!?])\s+/)
          .map((s) => s.replace(/\s+/g, " ").trim())
          .filter((s) => s.length >= 30 && s.length <= 200)
          .filter((s) => !/https?:\/\//.test(s)) // No URLs
          .filter((s) => !/^\[/.test(s)); // No [deleted] etc.

        for (const s of sents) {
          if (sentences.length >= count) break;
          sentences.push({
            text: s,
            language: lang,
            source: "reddit",
            sourceUrl: `https://reddit.com${permalink}`,
          });
        }
      }

      await sleep(500); // Reddit rate limit
    } catch {
      // Skip failed subreddits
    }
  }

  console.log(`  [reddit] Got ${sentences.length} sentences for ${lang}`);
  return sentences.slice(0, count);
}

async function fetchTatoebaSentences(
  lang: ClozeLanguage,
  count: number,
): Promise<RawSentence[]> {
  console.log(`  [tatoeba] Fetching ${count} sentences for ${lang}...`);
  const sentences: RawSentence[] = [];

  const tatoebaCodes: Record<ClozeLanguage, string> = {
    de: "deu",
    fr: "fra",
    it: "ita",
  };

  try {
    const url = `https://api.tatoeba.org/unstable/sentences?lang=${tatoebaCodes[lang]}&trans=eng&sort=relevance&limit=${Math.min(count, 100)}`;
    const res = await fetch(url);
    if (!res.ok) return sentences;

    const data = await res.json();
    const results = data.data || data.results || [];

    for (const item of results) {
      if (sentences.length >= count) break;
      const text: string = item.text || "";
      if (text.length < 15 || text.length > 200) continue;

      sentences.push({
        text,
        language: lang,
        source: "tatoeba",
        sourceUrl: `https://tatoeba.org/sentences/show/${item.id}`,
      });
    }
  } catch (err) {
    console.warn(`  [tatoeba] Error fetching for ${lang}:`, err);
  }

  console.log(`  [tatoeba] Got ${sentences.length} sentences for ${lang}`);
  return sentences.slice(0, count);
}

// Source fetcher map
const FETCHERS: Record<
  ClozeSource,
  (lang: ClozeLanguage, count: number) => Promise<RawSentence[]>
> = {
  wikipedia: fetchWikipediaSentences,
  gutenberg: fetchGutenbergSentences,
  newsapi: fetchNewsSentences,
  reddit: fetchRedditSentences,
  tatoeba: fetchTatoebaSentences,
};

// ============================================================================
// Gemini enrichment — convert raw sentences to cloze items
// ============================================================================

async function enrichBatch(
  sentences: RawSentence[],
  stats: PipelineStats,
): Promise<ClozeItemRow[]> {
  const items: ClozeItemRow[] = [];

  const prompt = `You are a language learning exercise generator. Given the following ${sentences[0].language === "de" ? "German" : sentences[0].language === "fr" ? "French" : "Italian"} sentences, create cloze-deletion exercises.

For EACH sentence:
1. Choose ONE pedagogically useful word to blank out (prefer: verbs, nouns, adjectives — NEVER articles, prepositions, or conjunctions). Choose high-frequency, commonly used words.
2. Replace that word with "___" in the sentence.
3. Determine the CEFR level (A1, A2, B1, B2, or C1).
4. Provide an English translation of the FULL sentence.
5. Provide a brief grammar or vocabulary explanation (1-2 sentences) about the blanked word — why it's that form, how it's used.
6. Provide exactly 3 plausible distractor words (same part of speech, similar difficulty).
7. Note the 0-based token index of the blank in the sentence.

IMPORTANT: The distractors must be real ${LANGUAGE_NAMES[sentences[0].language]} words, plausible in context but incorrect.

Respond ONLY with a JSON array. Each element:
{
  "sentence": "sentence with ___ blank",
  "answer": "the removed word",
  "answer_position": 0,
  "level": "B1",
  "translation": "English translation",
  "explanation": "Grammar/vocabulary note",
  "distractors": ["word1", "word2", "word3"]
}

Sentences to process:
${sentences.map((s, i) => `${i + 1}. "${s.text}"`).join("\n")}

Return ONLY the JSON array, no markdown fences, no extra text.`;

  try {
    stats.geminiCalls++;
    const response = await callGemini(prompt);

    // Parse JSON from response (handle potential markdown fences)
    let jsonStr = response.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) return items;

    for (let i = 0; i < parsed.length; i++) {
      const p = parsed[i];
      const raw = sentences[i];
      if (!raw) continue;

      // Validate the item
      if (
        !p.sentence ||
        !p.answer ||
        !p.translation ||
        !p.explanation ||
        !Array.isArray(p.distractors) ||
        p.distractors.length < 3
      ) {
        continue;
      }

      // Ensure sentence actually contains blank
      if (!p.sentence.includes("___")) continue;

      items.push({
        language: raw.language,
        level: p.level || "B1",
        sentence: p.sentence,
        answer: p.answer,
        answer_position: p.answer_position ?? 0,
        translation: p.translation,
        explanation: p.explanation,
        distractors: p.distractors.slice(0, 3),
        source: raw.source,
        source_url: raw.sourceUrl || null,
      });

      stats.enriched++;
    }
  } catch (err) {
    stats.errors.push(`Gemini enrichment error: ${err}`);
  }

  return items;
}

// ============================================================================
// Supabase storage
// ============================================================================

async function storeItems(
  supabase: SupabaseClient,
  items: ClozeItemRow[],
  stats: PipelineStats,
): Promise<void> {
  if (items.length === 0) return;

  // Insert in batches, ignoring duplicates (unique constraint on language+sentence)
  const batchSize = 50;
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);

    const { data, error } = await supabase
      .from("cloze_items")
      .upsert(batch, {
        onConflict: "language,sentence",
        ignoreDuplicates: true,
      })
      .select("id");

    if (error) {
      stats.errors.push(`Supabase insert error: ${error.message}`);
    } else {
      stats.stored += data?.length ?? 0;
    }
  }
}

// ============================================================================
// Main pipeline
// ============================================================================

async function runPipeline() {
  console.log("=".repeat(60));
  console.log("Fluensea Cloze Content Pipeline");
  console.log("=".repeat(60));
  console.log(`Languages: ${languages.join(", ")}`);
  console.log(`Sources:   ${sources.join(", ")}`);
  console.log(`Limit:     ${LIMIT} items per source per language`);
  console.log(`Dry run:   ${DRY_RUN}`);
  console.log();

  const globalStats: PipelineStats = {
    fetched: 0,
    enriched: 0,
    stored: 0,
    errors: [],
    geminiCalls: 0,
  };

  for (const lang of languages) {
    console.log(`\n${"─".repeat(50)}`);
    console.log(`Processing: ${LANGUAGE_NAMES[lang]} (${lang})`);
    console.log(`${"─".repeat(50)}`);

    for (const source of sources) {
      console.log(`\n  Source: ${source}`);

      // 1. Fetch raw sentences
      const fetcher = FETCHERS[source];
      let rawSentences: RawSentence[];
      try {
        rawSentences = await fetcher(lang, LIMIT);
      } catch (err) {
        console.warn(`  Error fetching from ${source}:`, err);
        globalStats.errors.push(`Fetch error (${source}/${lang}): ${err}`);
        continue;
      }

      globalStats.fetched += rawSentences.length;
      if (rawSentences.length === 0) continue;

      // 2. Enrich in batches via Gemini
      const enrichedItems: ClozeItemRow[] = [];

      for (let i = 0; i < rawSentences.length; i += BATCH_SIZE) {
        const batch = rawSentences.slice(i, i + BATCH_SIZE);
        console.log(
          `  Enriching batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(rawSentences.length / BATCH_SIZE)} (${batch.length} sentences)...`,
        );

        const items = await enrichBatch(batch, globalStats);
        enrichedItems.push(...items);

        // Rate limit
        if (i + BATCH_SIZE < rawSentences.length) {
          await sleep(GEMINI_DELAY_MS);
        }
      }

      console.log(`  Enriched: ${enrichedItems.length} items`);

      // 3. Filter to target level if specified
      const filtered = TARGET_LEVEL
        ? enrichedItems.filter((item) => item.level === TARGET_LEVEL)
        : enrichedItems;

      // 4. Store in Supabase
      if (!DRY_RUN && filtered.length > 0) {
        console.log(`  Storing ${filtered.length} items in Supabase...`);
        await storeItems(supabase, filtered, globalStats);
      } else if (DRY_RUN) {
        console.log(`  [dry-run] Would store ${filtered.length} items`);
        globalStats.stored += filtered.length;
      }
    }
  }

  // Summary
  console.log(`\n${"=".repeat(60)}`);
  console.log("Pipeline Summary");
  console.log(`${"=".repeat(60)}`);
  console.log(`Sentences fetched:  ${globalStats.fetched}`);
  console.log(`Items enriched:     ${globalStats.enriched}`);
  console.log(`Items stored:       ${globalStats.stored}`);
  console.log(`Gemini API calls:   ${globalStats.geminiCalls}`);
  console.log(`Errors:             ${globalStats.errors.length}`);

  if (globalStats.errors.length > 0) {
    console.log("\nErrors:");
    globalStats.errors.forEach((e, i) => console.log(`  ${i + 1}. ${e}`));
  }

  console.log(`\nDone! ✓`);
}

runPipeline().catch((err) => {
  console.error("Pipeline failed:", err);
  process.exit(1);
});
