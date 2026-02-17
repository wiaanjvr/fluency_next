/**
 * Foundation Vocabulary Service
 *
 * Fetches foundation vocabulary words and sentences from Supabase database
 * with pre-generated audio URLs.
 */

import { createClient } from "@/lib/supabase/client";
import type { FoundationWord } from "@/types/foundation-vocabulary";

export interface FoundationWordDB {
  id: string;
  word: string;
  lemma: string;
  language: string;
  rank: number;
  pos: string;
  translation: string;
  image_keyword: string;
  imageability: "high" | "medium" | "low";
  category: string;
  phonetic?: string;
  audio_url?: string;
  foundation_sentences?: {
    target_language_text: string;
    english_translation: string;
    audio_url?: string;
  }[];
}

/**
 * Fetch foundation vocabulary from database for a specific language
 */
export async function getFoundationVocabularyFromDB(
  language: "fr" | "de" | "it",
  limit: number = 100,
): Promise<FoundationWord[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("foundation_words")
    .select(
      `
      *,
      foundation_sentences (
        target_language_text,
        english_translation,
        audio_url
      )
    `,
    )
    .eq("language", language)
    .order("rank", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("Error fetching foundation vocabulary:", error);
    return [];
  }

  // Transform database records to FoundationWord type
  return (data as FoundationWordDB[]).map((dbWord) => {
    const sentence = dbWord.foundation_sentences?.[0];

    // Determine which property to use for target language text
    const targetLangKey =
      language === "fr" ? "french" : language === "de" ? "german" : "italian";

    return {
      id: `foundation-${dbWord.rank}`,
      word: dbWord.word,
      lemma: dbWord.lemma,
      rank: dbWord.rank,
      pos: dbWord.pos,
      translation: dbWord.translation,
      exampleSentence: {
        target: sentence?.target_language_text || "",
        english: sentence?.english_translation || "",
        // For backwards compatibility
        [targetLangKey]: sentence?.target_language_text || "",
      },
      imageKeyword: dbWord.image_keyword,
      audioUrl: dbWord.audio_url,
      sentenceAudioUrl: sentence?.audio_url, // Add sentence audio URL
      phonetic: dbWord.phonetic,
      imageability: dbWord.imageability,
      category: dbWord.category as any,
    };
  });
}

/**
 * Fetch a specific foundation word by rank and language
 */
export async function getFoundationWordByRank(
  language: "fr" | "de" | "it",
  rank: number,
): Promise<FoundationWord | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("foundation_words")
    .select(
      `
      *,
      foundation_sentences (
        target_language_text,
        english_translation,
        audio_url
      )
    `,
    )
    .eq("language", language)
    .eq("rank", rank)
    .single();

  if (error || !data) {
    console.error("Error fetching foundation word:", error);
    return null;
  }

  const dbWord = data as FoundationWordDB;
  const sentence = dbWord.foundation_sentences?.[0];
  const targetLangKey =
    language === "fr" ? "french" : language === "de" ? "german" : "italian";

  return {
    id: `foundation-${dbWord.rank}`,
    word: dbWord.word,
    lemma: dbWord.lemma,
    rank: dbWord.rank,
    pos: dbWord.pos,
    translation: dbWord.translation,
    exampleSentence: {
      target: sentence?.target_language_text || "",
      english: sentence?.english_translation || "",
      [targetLangKey]: sentence?.target_language_text || "",
    },
    imageKeyword: dbWord.image_keyword,
    audioUrl: dbWord.audio_url,
    sentenceAudioUrl: sentence?.audio_url,
    phonetic: dbWord.phonetic,
    imageability: dbWord.imageability,
    category: dbWord.category as any,
  };
}

/**
 * Check if foundation vocabulary has been seeded for a language
 */
export async function isFoundationVocabularySeeded(
  language: "fr" | "de" | "it",
): Promise<boolean> {
  const supabase = createClient();

  const { count, error } = await supabase
    .from("foundation_words")
    .select("*", { count: "exact", head: true })
    .eq("language", language);

  if (error) {
    console.error("Error checking foundation vocabulary:", error);
    return false;
  }

  return (count ?? 0) > 0;
}
