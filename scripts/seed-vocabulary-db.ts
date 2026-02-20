/**
 * Seed Vocabulary Database
 *
 * Populates the `vocab` master word list from JSON frequency files.
 * Safe to re-run — uses upsert on (word, language, form) so re-runs are idempotent.
 *
 * Source word counts: FR=1000, DE=500, IT=500
 * To reach 1000 words per language for DE/IT, expand the source JSON files.
 *
 * Usage:
 *   $env:NODE_OPTIONS="--dns-result-order=ipv4first"
 *   npx tsx scripts/seed-vocabulary-db.ts
 */

// Load environment variables from .env.local
import dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

// Disable SSL certificate verification for development (Windows fix)
// Must be set BEFORE the Supabase client is created.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

import { createClient } from "@supabase/supabase-js";

// Import vocabulary JSON files
import frenchWords from "../src/data/common-french-words.json";
import germanWords from "../src/data/common-german-words.json";
import italianWords from "../src/data/common-italian-words.json";

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Error: Missing Supabase credentials");
  console.error(
    "Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface WordEntry {
  word: string;
  rank: number;
  pos: string;
  lemma: string;
}

interface VocabularyData {
  description: string;
  levelAllocation: Record<string, number>;
  words: WordEntry[];
}

/**
 * Use the part-of-speech tag directly as the form value.
 * This ensures (word="de", pos="preposition") and (word="de", pos="article")
 * are stored as two distinct rows rather than being collapsed.
 */
function deriveForm(pos: string): string {
  return pos.toLowerCase();
}

interface VocabRow {
  word: string;
  language: string;
  type: string; // vocab.type  — maps from pos
  form: string; // vocab.form  — derived from pos
  translation: string; // empty string; fill via enrichment script later
  frequency_rank: number;
}

const languageData: Array<{ code: string; data: VocabularyData }> = [
  { code: "fr", data: frenchWords as VocabularyData },
  { code: "de", data: germanWords as VocabularyData },
  { code: "it", data: italianWords as VocabularyData },
];

async function seedVocabulary() {
  console.log("🌱 Starting vocab table seeding...\n");

  try {
    let totalInserted = 0;

    // ── Insert words for each language ─────────────────────────────────────
    for (const { code, data } of languageData) {
      console.log(
        `\n📚 Processing ${code.toUpperCase()} (${data.words.length} words)...`,
      );

      const rows: VocabRow[] = data.words.map((w) => ({
        word: w.word,
        language: code,
        type: w.pos,
        form: deriveForm(w.pos),
        translation: "",
        frequency_rank: w.rank,
      }));

      // Upsert in batches of 100
      const batchSize = 100;
      let languageInserted = 0;

      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);

        const { error, data: upserted } = await supabase
          .from("vocab")
          .upsert(batch, {
            onConflict: "word,language,form",
            ignoreDuplicates: true, // ON CONFLICT DO NOTHING — skips same-word/form pairs in source data silently
          })
          .select("id");

        if (error) {
          console.error(
            `  ✗ Error on batch ${Math.floor(i / batchSize) + 1}:`,
            error.message,
            error.details ?? "",
            error.hint ?? "",
          );
        } else {
          const count = upserted?.length ?? 0;
          languageInserted += count;
          console.log(
            `  ✓ Batch ${Math.floor(i / batchSize) + 1}: ${count} upserted`,
          );
        }
      }

      totalInserted += languageInserted;
      console.log(
        `  ✅ ${code.toUpperCase()} done — ${languageInserted} new rows`,
      );
    }

    // ── Verify ──────────────────────────────────────────────────────────────
    console.log("\n🔍 Verifying...");
    const { count } = await supabase
      .from("vocab")
      .select("id", { count: "exact", head: true });

    console.log(`  ✓ vocab table total rows: ${count}`);

    console.log("\n✨ Seeding completed!");
    console.log(`   - Upserted this run : ${totalInserted}`);
    console.log(
      `   - Languages         : FR (1000 source), DE (500 source), IT (500 source)`,
    );
    console.log("\n⚠️  DE and IT source files only have 500 words each.");
    console.log(
      "   To reach 1000 per language, expand src/data/common-{de,it}-words.json.",
    );
  } catch (error) {
    console.error("❌ Error during seeding:", error);
    process.exit(1);
  }
}

// Run the seeding
seedVocabulary();
