// ============================================================================
// Lyric Processing Utility
//
// Parses LRC-format lyrics and performs rule-based German lemmatisation.
// ============================================================================

import type {
  ParsedLyricLine,
  ParsedSongWord,
  ProcessedLyrics,
} from "@/types/songs";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse an LRC-formatted lyrics string into structured lines and words.
 *
 * LRC format: `[mm:ss.xx] Lyric line here`
 *
 * @param lrc  Raw LRC string (newline-separated)
 * @returns    Structured lines and lemmatised word list
 */
export function processLyrics(lrc: string): ProcessedLyrics {
  const rawLines = lrc.split("\n").filter((l) => l.trim().length > 0);

  const lines: ParsedLyricLine[] = [];
  const words: ParsedSongWord[] = [];

  for (let i = 0; i < rawLines.length; i++) {
    const parsed = parseLrcLine(rawLines[i]);
    if (!parsed) continue;

    const lineIndex = lines.length;

    // Compute end_time_ms from the next line's start (if available)
    const nextParsed =
      i + 1 < rawLines.length ? parseLrcLine(rawLines[i + 1]) : null;

    lines.push({
      text: parsed.text,
      start_time_ms: parsed.start_time_ms,
      end_time_ms: nextParsed ? nextParsed.start_time_ms : null,
      line_index: lineIndex,
    });

    // Tokenise & lemmatise every word in the line
    const tokens = tokenizeLine(parsed.text);
    for (let wi = 0; wi < tokens.length; wi++) {
      words.push({
        raw_word: tokens[wi],
        lemma: lemmatizeGerman(tokens[wi]),
        line_index: lineIndex,
        word_index_in_line: wi,
      });
    }
  }

  return { lines, words };
}

/**
 * Tokenise a single lyric line: strip punctuation, lowercase, split on whitespace.
 */
export function tokenizeLine(line: string): string[] {
  return line
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'-]/gu, "") // keep letters, numbers, spaces, apostrophes, hyphens
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

// ---------------------------------------------------------------------------
// LRC parsing
// ---------------------------------------------------------------------------

const LRC_REGEX = /^\[(\d{1,3}):(\d{2})(?:\.(\d{1,3}))?\]\s*(.*)$/;

function parseLrcLine(
  raw: string,
): { text: string; start_time_ms: number } | null {
  const match = raw.trim().match(LRC_REGEX);
  if (!match) return null;

  const minutes = parseInt(match[1], 10);
  const seconds = parseInt(match[2], 10);
  const centiseconds = match[3]
    ? parseInt(match[3].padEnd(3, "0").slice(0, 3), 10) // normalise to ms
    : 0;

  const text = match[4].trim();
  if (!text) return null; // skip empty lines

  const start_time_ms = minutes * 60_000 + seconds * 1_000 + centiseconds;

  return { text, start_time_ms };
}

// ---------------------------------------------------------------------------
// Rule-based German lemmatiser
// ---------------------------------------------------------------------------
// TODO: Replace with a proper NLP library (e.g. `compromise`, `nlp-js`,
//       or a language-specific lemmatiser API such as Spacy/Stanza) for
//       production-quality lemmatisation. The rules below handle the most
//       common inflectional suffixes but will miss irregular forms.
// ---------------------------------------------------------------------------

/**
 * Simple rule-based German lemmatiser.
 *
 * Handles common suffixes for:
 * - Verb inflections: -en, -est, -et, -st, -te, -ten, -tet, -test, -t, -e
 * - Adjective inflections: -er, -es, -em, -en, -e
 * - Noun plural / case endings: -en, -er, -es, -e, -n, -s
 *
 * The heuristic keeps the word if stripping would make it shorter than 3 chars.
 */
export function lemmatizeGerman(word: string): string {
  let w = word.toLowerCase().trim();

  // Very short words are returned as-is
  if (w.length <= 3) return w;

  // Try suffixes from longest to shortest to avoid partial matches
  const suffixes = [
    "ungen", // Nominalisierung → ?
    "test", // du arbeit-est (past)
    "tet", // ihr arbei-tet
    "ten", // sie arbei-ten (past)
    "est", // du arbeit-est
    "end", // present participle: laufend
    "ern", // plural: Kinder-n (dative)
    "ste", // superlative: schön-ste
    "en", // infinitive / plural
    "er", // comparative / noun plural
    "es", // adjective neuter / genitive
    "em", // adjective dative
    "et", // ihr arbeit-et
    "te", // past tense: mach-te
    "st", // du mach-st
    "ig", // adjective suffix (keep — it's part of stem for many words)
    "e", // adjective / noun plural
    "t", // er mach-t
    "n", // plural -n
    "s", // genitive -s
  ];

  for (const suffix of suffixes) {
    if (w.endsWith(suffix) && w.length - suffix.length >= 3) {
      return w.slice(0, w.length - suffix.length);
    }
  }

  return w;
}
