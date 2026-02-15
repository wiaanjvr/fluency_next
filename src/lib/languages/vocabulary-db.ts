/**
 * Vocabulary Database Loader
 *
 * Fetches vocabulary data from Supabase with caching support.
 * This replaces the static JSON imports for common-*-words.json files.
 */

import { createClient } from "@/lib/supabase/client";
import { SupportedLanguage } from "./config";

interface VocabularyWord {
  word: string;
  rank: number;
  pos: string;
  lemma: string;
}

interface VocabularyData {
  description: string;
  levelAllocation: Record<string, number>;
  words: VocabularyWord[];
}

// In-memory cache for vocabulary data
const vocabularyCache: Map<SupportedLanguage, VocabularyData> = new Map();

/**
 * Fetch vocabulary data from Supabase database
 */
export async function fetchVocabularyFromDB(
  language: SupportedLanguage,
): Promise<VocabularyData | null> {
  // Check cache first
  if (vocabularyCache.has(language)) {
    return vocabularyCache.get(language)!;
  }

  try {
    const supabase = createClient();

    // Fetch level allocation
    const { data: allocData, error: allocError } = await supabase
      .from("vocabulary_level_allocation")
      .select("level, max_rank")
      .eq("language", language)
      .order("max_rank", { ascending: true });

    if (allocError) {
      console.error("Error fetching level allocation:", allocError);
      return null;
    }

    const levelAllocation =
      allocData?.reduce(
        (acc, item) => {
          acc[item.level] = item.max_rank;
          return acc;
        },
        {} as Record<string, number>,
      ) || {};

    // Fetch vocabulary words
    const { data: wordsData, error: wordsError } = await supabase
      .from("vocabulary")
      .select("word, lemma, part_of_speech, frequency_rank")
      .eq("language", language)
      .order("frequency_rank", { ascending: true });

    if (wordsError) {
      console.error("Error fetching vocabulary words:", wordsError);
      return null;
    }

    const vocabularyData: VocabularyData = {
      description: `Common ${language.toUpperCase()} words organized by frequency`,
      levelAllocation,
      words:
        wordsData?.map((w) => ({
          word: w.word,
          rank: w.frequency_rank,
          pos: w.part_of_speech || "",
          lemma: w.lemma,
        })) || [],
    };

    // Cache the result
    vocabularyCache.set(language, vocabularyData);

    return vocabularyData;
  } catch (error) {
    console.error("Error fetching vocabulary from database:", error);
    return null;
  }
}

/**
 * Get vocabulary words for a specific level
 */
export async function getVocabularyForLevelFromDB(
  language: SupportedLanguage,
  level: string,
): Promise<string[]> {
  const data = await fetchVocabularyFromDB(language);
  if (!data) return [];

  const maxRank = data.levelAllocation[level] || 50;
  return data.words.filter((w) => w.rank <= maxRank).map((w) => w.word);
}

/**
 * Clear the vocabulary cache (useful for testing or forced refresh)
 */
export function clearVocabularyCache() {
  vocabularyCache.clear();
}
