// ============================================================================
// Reading utilities — tokenization, timestamp parsing, vocabulary helpers
// ============================================================================

// ─── Markdown / AI-output cleanup ──────────────────────────────────────────

/**
 * Strip markdown formatting artefacts from AI-generated text.
 * Handles bold (**), italic (_), headings (#), backticks, and stray whitespace.
 */
export function cleanGeneratedText(raw: string): string {
  return (
    raw
      // Remove markdown bold markers (** word **)
      .replace(/\*\*\s*/g, "")
      .replace(/\s*\*\*/g, "")
      .replace(/\*/g, "")
      // Remove markdown headings (# Title)
      .replace(/^#{1,6}\s+/gm, "")
      // Remove italic underscores (_word_)
      .replace(/(?<!\w)_([^_]+)_(?!\w)/g, "$1")
      // Remove backticks
      .replace(/`/g, "")
      // Collapse multiple spaces / leading-trailing whitespace
      .replace(/ {2,}/g, " ")
      .trim()
  );
}

/** A single token in the reading text */
export interface ReadingToken {
  /** The raw word or punctuation string */
  word: string;
  /** Position index in the token array */
  index: number;
  /** Whether this word is in the user's known vocabulary */
  is_known: boolean;
  /** Whether this is a new/unknown word introduced by the generator */
  is_new: boolean;
  /** True if this token is just punctuation (not a real word) */
  punctuation?: boolean;
  /** Whether a space should be rendered before this token */
  spaceBefore?: boolean;
  /** Optional cached definition */
  definition?: string;
  /** Audio timestamp: when the word starts being spoken (ms) */
  start_time_ms?: number;
  /** Audio timestamp: when the word finishes being spoken (ms) */
  end_time_ms?: number;
}

/** The reading text record from the database */
export interface ReadingText {
  id: string;
  user_id: string;
  language: string;
  title: string;
  content: string;
  content_tokens: ReadingToken[];
  audio_url: string | null;
  cefr_level: string;
  topic: string | null;
  word_count: number;
  created_at: string;
}

/** Payload sent to the generate-reading-text API */
export interface GenerateReadingRequest {
  language: string;
  cefrLevel: string;
  topic?: string;
}

/** Response from the generate-reading-text API */
export interface GenerateReadingResponse {
  id: string;
  title: string;
  content: string;
  content_tokens: ReadingToken[];
  audio_url: string | null;
  cefr_level: string;
  topic: string;
  word_count: number;
}

// ─── Punctuation regex ─────────────────────────────────────────────────────

const PUNCTUATION_REGEX = /^[.,!?;:""''"\-–—…()[\]{}/\\<>«»„"‹›]+$/;

/** Characters that should NOT have a space before them */
const NO_SPACE_BEFORE = new Set([
  ".",
  ",",
  "!",
  "?",
  ";",
  ":",
  ")",
  "]",
  "»",
  "'",
]);
/** Characters that should NOT have a space after them */
const NO_SPACE_AFTER = new Set(["(", "[", "«", "'"]);

/** Check if a string is purely punctuation */
export function isPunctuation(str: string): boolean {
  return PUNCTUATION_REGEX.test(str.trim());
}

// ─── Tokenizer ─────────────────────────────────────────────────────────────

/**
 * Split raw text into tokens, preserving whitespace attachment.
 * Each word and punctuation mark becomes a separate token.
 * Contractions (j'aime) and hyphenated words (grands-parents) are kept as one token.
 *
 * @param text      The full reading text
 * @param knownSet  Set of known words (lowercased) for is_known marking
 * @param newWords  Set of new words (lowercased) flagged by the generator
 */
export function tokenizeText(
  text: string,
  knownSet: Set<string>,
  newWords: Set<string>,
): ReadingToken[] {
  // Match words (including contractions with ' and hyphenated) OR individual punctuation
  const rawTokens =
    text.match(
      /[\p{L}\p{N}]+(?:['\u2019][\p{L}\p{N}]+)*(?:-[\p{L}\p{N}]+(?:['\u2019][\p{L}\p{N}]+)*)*|[^\s\p{L}\p{N}]/gu,
    ) || [];

  return rawTokens
    .map((word, index) => {
      const trimmed = word.trim();
      if (!trimmed) return null;
      const punct = isPunctuation(trimmed);
      const lower = trimmed.toLowerCase();
      return {
        word: trimmed,
        index,
        is_known: punct ? true : knownSet.has(lower),
        is_new: punct ? false : newWords.has(lower),
        punctuation: punct || undefined,
        /** Whether a space should be rendered BEFORE this token */
        spaceBefore: !punct || !NO_SPACE_BEFORE.has(trimmed),
      };
    })
    .filter(Boolean) as ReadingToken[];
}

// ─── Timestamp estimation ──────────────────────────────────────────────────

/**
 * Estimate word-level timestamps based on audio duration.
 * Uses a simple proportional model: each word gets time proportional
 * to its character length relative to the total text length.
 *
 * Falls back to sentence-level highlighting when real timestamps
 * are unavailable.
 *
 * @param tokens       The token array
 * @param durationMs   Total audio duration in milliseconds
 */
export function estimateWordTimestamps(
  tokens: ReadingToken[],
  durationMs: number,
): ReadingToken[] {
  // Filter to only real words (not punctuation) for timing
  const wordTokens = tokens.filter((t) => !t.punctuation);
  const totalChars = wordTokens.reduce((sum, t) => sum + t.word.length, 0);

  if (totalChars === 0 || durationMs === 0) return tokens;

  let currentMs = 0;
  const wordTimings = new Map<number, { start: number; end: number }>();

  for (const token of wordTokens) {
    const proportion = token.word.length / totalChars;
    const wordDuration = proportion * durationMs;
    wordTimings.set(token.index, {
      start: Math.round(currentMs),
      end: Math.round(currentMs + wordDuration),
    });
    currentMs += wordDuration;
  }

  return tokens.map((token) => {
    const timing = wordTimings.get(token.index);
    if (timing) {
      return {
        ...token,
        start_time_ms: timing.start,
        end_time_ms: timing.end,
      };
    }
    return token;
  });
}

// ─── Sentence detection ────────────────────────────────────────────────────

/**
 * Group token indices into sentences for sentence-level highlighting.
 * Returns an array of { startIndex, endIndex } for each sentence.
 */
export function detectSentences(
  tokens: ReadingToken[],
): { startIndex: number; endIndex: number }[] {
  const sentences: { startIndex: number; endIndex: number }[] = [];
  let sentenceStart = 0;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    // Sentence ends at period, exclamation, or question mark
    if (token.punctuation && /[.!?]/.test(token.word)) {
      sentences.push({ startIndex: sentenceStart, endIndex: i });
      // Next sentence starts after this punctuation
      sentenceStart = i + 1;
    }
  }

  // Last sentence might not end with punctuation
  if (sentenceStart < tokens.length) {
    sentences.push({
      startIndex: sentenceStart,
      endIndex: tokens.length - 1,
    });
  }

  return sentences;
}

/**
 * Find which sentence a given word timestamp falls into,
 * for sentence-level audio highlighting.
 */
export function findCurrentSentence(
  tokens: ReadingToken[],
  sentences: { startIndex: number; endIndex: number }[],
  currentTimeMs: number,
): { startIndex: number; endIndex: number } | null {
  for (const sentence of sentences) {
    const startToken = tokens[sentence.startIndex];
    const endToken = tokens[sentence.endIndex];

    const sentenceStart = startToken?.start_time_ms ?? 0;
    const sentenceEnd = endToken?.end_time_ms ?? 0;

    if (currentTimeMs >= sentenceStart && currentTimeMs <= sentenceEnd) {
      return sentence;
    }
  }
  return null;
}

// ─── Audio cache ───────────────────────────────────────────────────────────

const AUDIO_CACHE_NAME = "fluensea-reading-audio";

/** Cache an audio URL in the browser for offline playback */
export async function cacheAudio(url: string): Promise<void> {
  if (!("caches" in window)) return;
  try {
    const cache = await caches.open(AUDIO_CACHE_NAME);
    await cache.add(url);
  } catch {
    // Silently fail — caching is best-effort
  }
}

/** Try to get a cached audio response, falling back to network */
export async function getCachedAudioUrl(url: string): Promise<string> {
  if (!("caches" in window)) return url;
  try {
    const cache = await caches.open(AUDIO_CACHE_NAME);
    const response = await cache.match(url);
    if (response) {
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    }
  } catch {
    // Fall through to original URL
  }
  return url;
}

// ─── Format helpers ────────────────────────────────────────────────────────

/** Format milliseconds as m:ss */
export function formatTimeMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/** Extract the clean word (strip leading/trailing punctuation) for lookups */
export function cleanWord(word: string): string {
  return word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
}

// ─── Topics ────────────────────────────────────────────────────────────────

export const READING_TOPICS = [
  "daily life",
  "travel",
  "food and cooking",
  "nature",
  "city life",
  "friendship",
  "family",
  "shopping",
  "seasons and weather",
  "hobbies",
  "work and school",
  "animals",
  "celebrations",
  "morning routine",
  "an unexpected encounter",
] as const;

/** Pick a random topic from the list */
export function randomTopic(): string {
  return READING_TOPICS[Math.floor(Math.random() * READING_TOPICS.length)];
}
