/**
 * Seed Vocabulary Database
 *
 * This script migrates vocabulary data from JSON files to Supabase database.
 * Run this script once to populate the vocabulary and vocabulary_level_allocation tables.
 *
 * Usage:
 *   npx tsx scripts/seed-vocabulary-db.ts
 */

// Load environment variables from .env.local
import dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

// Disable SSL certificate verification for development (Windows fix)
if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === "0") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";

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

interface VocabularyData {
  description: string;
  levelAllocation: Record<string, number>;
  words: Array<{
    word: string;
    rank: number;
    pos: string;
    lemma: string;
  }>;
}

interface VocabularyRow {
  word: string;
  lemma: string;
  language: string;
  part_of_speech: string;
  frequency_rank: number;
}

interface LevelAllocationRow {
  language: string;
  level: string;
  max_rank: number;
}

const languageData: Array<{ code: string; data: VocabularyData }> = [
  { code: "fr", data: frenchWords as VocabularyData },
  { code: "de", data: germanWords as VocabularyData },
  { code: "it", data: italianWords as VocabularyData },
];

async function seedVocabulary() {
  console.log("🌱 Starting vocabulary database seeding...\n");

  try {
    // Step 1: Clear existing data
    console.log("🗑️  Clearing existing vocabulary data...");
    const { error: deleteVocabError } = await supabase
      .from("vocabulary")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all

    const { error: deleteAllocError } = await supabase
      .from("vocabulary_level_allocation")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all

    if (deleteVocabError) {
      console.error("Error clearing vocabulary:", deleteVocabError);
    }
    if (deleteAllocError) {
      console.error("Error clearing level allocations:", deleteAllocError);
    }

    // Step 2: Insert vocabulary words for each language
    let totalWords = 0;
    for (const { code, data } of languageData) {
      console.log(`\n📚 Processing ${code.toUpperCase()} vocabulary...`);

      const vocabularyRows: VocabularyRow[] = data.words.map((word) => ({
        word: word.word,
        lemma: word.lemma,
        language: code,
        part_of_speech: word.pos,
        frequency_rank: word.rank,
      }));

      // Insert in batches of 100 to avoid timeout
      const batchSize = 100;
      for (let i = 0; i < vocabularyRows.length; i += batchSize) {
        const batch = vocabularyRows.slice(i, i + batchSize);
        const { error } = await supabase.from("vocabulary").insert(batch);

        if (error) {
          console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
        } else {
          console.log(
            `  ✓ Inserted ${i + batch.length}/${vocabularyRows.length} words`,
          );
        }
      }

      totalWords += vocabularyRows.length;
      console.log(
        `  ✅ Completed ${code.toUpperCase()}: ${vocabularyRows.length} words`,
      );
    }

    // Step 3: Insert level allocations
    console.log("\n📊 Inserting level allocations...");
    const allocationRows: LevelAllocationRow[] = [];

    for (const { code, data } of languageData) {
      for (const [level, maxRank] of Object.entries(data.levelAllocation)) {
        allocationRows.push({
          language: code,
          level,
          max_rank: maxRank,
        });
      }
    }

    const { error: allocError } = await supabase
      .from("vocabulary_level_allocation")
      .insert(allocationRows);

    if (allocError) {
      console.error("Error inserting level allocations:", allocError);
    } else {
      console.log(`  ✅ Inserted ${allocationRows.length} level allocations`);
    }

    // Step 4: Verify data
    console.log("\n🔍 Verifying data...");
    const { count: vocabCount } = await supabase
      .from("vocabulary")
      .select("*", { count: "exact", head: true });

    const { count: allocCount } = await supabase
      .from("vocabulary_level_allocation")
      .select("*", { count: "exact", head: true });

    console.log(`  ✓ Vocabulary words: ${vocabCount}`);
    console.log(`  ✓ Level allocations: ${allocCount}`);

    console.log("\n✨ Vocabulary seeding completed successfully!");
    console.log(`\n📈 Summary:`);
    console.log(`   - Total words inserted: ${totalWords}`);
    console.log(`   - Languages: FR, DE, IT`);
    console.log(`   - Level allocations: ${allocationRows.length}`);
  } catch (error) {
    console.error("❌ Error during seeding:", error);
    process.exit(1);
  }
}

// Run the seeding
seedVocabulary();
