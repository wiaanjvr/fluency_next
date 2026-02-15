// Language-specific data loaders and utilities
import { SupportedLanguage, isValidLanguage, DEFAULT_LANGUAGE } from "./config";

// Database loaders (preferred)
import {
  fetchVocabularyFromDB,
  getVocabularyForLevelFromDB,
} from "./vocabulary-db";

// Fallback JSON imports (kept for backward compatibility during migration)
import frenchWords from "@/data/common-french-words.json";
import germanWords from "@/data/common-german-words.json";
import italianWords from "@/data/common-italian-words.json";

// Import placement tests (will be migrated to DB later)
import frenchPlacement from "@/data/placement-test.json";
import germanPlacement from "@/data/placement-test-german.json";
import italianPlacement from "@/data/placement-test-italian.json";

// Fallback vocabulary data by language (JSON)
const vocabularyDataFallback: Record<SupportedLanguage, typeof frenchWords> = {
  fr: frenchWords,
  de: germanWords,
  it: italianWords,
};

// Placement tests by language
// Note: Type relaxed to accommodate both 'passage' and 'text' field names
const placementData: Record<
  SupportedLanguage,
  { language: string; audioItems: unknown[]; readingItems: unknown[] }
> = {
  fr: frenchPlacement,
  de: germanPlacement,
  it: italianPlacement,
};

/**
 * Get vocabulary data (uses database, falls back to JSON if DB fails)
 * @deprecated Use fetchVocabularyFromDB for async loading from database
 */
export function getVocabularyData(language: string) {
  const lang = isValidLanguage(language) ? language : DEFAULT_LANGUAGE;
  // Return fallback JSON data for synchronous access
  // TODO: Migrate all callers to use async fetchVocabularyFromDB
  return vocabularyDataFallback[lang];
}

/**
 * Get vocabulary data from database (async, preferred method)
 */
export async function getVocabularyDataAsync(language: string) {
  const lang = isValidLanguage(language) ? language : DEFAULT_LANGUAGE;
  const dbData = await fetchVocabularyFromDB(lang);

  // Fallback to JSON if database fails
  if (!dbData) {
    console.warn(
      `Failed to load vocabulary from DB for ${lang}, using JSON fallback`,
    );
    return vocabularyDataFallback[lang];
  }

  return dbData;
}

export function getPlacementTest(language: string) {
  const lang = isValidLanguage(language) ? language : DEFAULT_LANGUAGE;
  return placementData[lang];
}

/**
 * Helper to get vocabulary words for a specific level allocation
 * @deprecated Use getVocabularyForLevelAsync for database-backed loading
 */
export function getVocabularyForLevel(
  language: string,
  level: string,
): string[] {
  const data = getVocabularyData(language);
  const allocation = data.levelAllocation as Record<string, number>;
  const maxRank = allocation[level] || 50;

  return data.words
    .filter((w: { rank: number }) => w.rank <= maxRank)
    .map((w: { word: string }) => w.word);
}

/**
 * Get vocabulary words for a specific level from database (async, preferred)
 */
export async function getVocabularyForLevelAsync(
  language: string,
  level: string,
): Promise<string[]> {
  const lang = isValidLanguage(language) ? language : DEFAULT_LANGUAGE;
  const words = await getVocabularyForLevelFromDB(lang, level);

  // Fallback to JSON if database fails
  if (words.length === 0) {
    console.warn(
      `Failed to load vocabulary from DB for ${lang}, using JSON fallback`,
    );
    return getVocabularyForLevel(language, level);
  }

  return words;
}

/**
 * Get the total word count available for a language
 */
export async function getTotalVocabularyCountAsync(
  language: string,
): Promise<number> {
  const data = await getVocabularyDataAsync(language);
  return data.words.length;
}

/**
 * Get the total word count available for a language (synchronous, uses JSON fallback)
 * @deprecated Use getTotalVocabularyCountAsync for database-backed loading
 */
export function getTotalVocabularyCount(language: string): number {
  const data = getVocabularyData(language);
  return data.words.length;
}
