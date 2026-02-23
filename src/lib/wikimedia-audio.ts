/**
 * Wikimedia Commons pronunciation audio lookup.
 *
 * Wikipedia/Wiktionary stores free-license pronunciation recordings under
 * predictable filenames on Wikimedia Commons. This module resolves the
 * direct download URL for a spoken word before falling back to TTS.
 *
 * File naming conventions on Commons:
 *   German  →  De-{word}.ogg   (e.g. De-Bach.ogg)
 *   French  →  Fr-{word}.ogg
 *   Italian →  It-{word}.ogg
 *
 * The Commons imageinfo API resolves whether a file exists and returns its
 * canonical URL without requiring authentication.
 */

const COMMONS_API = "https://commons.wikimedia.org/w/api.php";

/** Language code → ordered list of filename prefixes to try. */
const LANG_PREFIXES: Record<string, string[]> = {
  de: ["De", "de", "De-at", "De-ch"],
  fr: ["Fr", "fr", "Fr-Paris"],
  it: ["It", "it"],
};

/** Simple in-process cache: { cacheKey → url|null } */
const _cache = new Map<string, string | null>();

/**
 * Ask Commons whether a specific File:{name} exists.
 * Returns the direct media URL or null.
 */
async function resolveCommonsFile(filename: string): Promise<string | null> {
  const params = new URLSearchParams({
    action: "query",
    titles: `File:${filename}`,
    prop: "imageinfo",
    iiprop: "url",
    format: "json",
    origin: "*",
  });

  const res = await fetch(`${COMMONS_API}?${params}`, {
    signal: AbortSignal.timeout(8_000),
    headers: { "User-Agent": "Lingua2.0 pronunciation lookup (educational)" },
  });
  if (!res.ok) return null;

  const json = await res.json();
  const pages = json?.query?.pages as Record<string, any> | undefined;
  if (!pages) return null;

  const page = Object.values(pages)[0];
  // Commons sets page.missing = "" when the file doesn't exist
  if ("missing" in page) return null;

  return (page.imageinfo?.[0]?.url as string) ?? null;
}

/**
 * Search Commons for pronunciation files matching a word.
 * Used as a second-chance lookup when the predictable name pattern fails.
 * Returns the URL of the best result or null.
 */
async function searchCommonsAudio(
  word: string,
  language: string,
): Promise<string | null> {
  const langName: Record<string, string> = {
    de: "German",
    fr: "French",
    it: "Italian",
  };
  const query = `${word} pronunciation ${langName[language] ?? language}`;

  const params = new URLSearchParams({
    action: "query",
    list: "search",
    srsearch: query,
    srnamespace: "6", // File namespace
    srlimit: "5",
    format: "json",
    origin: "*",
  });

  const res = await fetch(`${COMMONS_API}?${params}`, {
    signal: AbortSignal.timeout(8_000),
    headers: { "User-Agent": "Lingua2.0 pronunciation lookup (educational)" },
  });
  if (!res.ok) return null;

  const json = await res.json();
  const results: Array<{ title: string }> = json?.query?.search ?? [];

  // Filter to audio files only
  const audioResults = results.filter((r) =>
    /\.(ogg|mp3|wav|flac)$/i.test(r.title),
  );
  if (!audioResults.length) return null;

  // Prefer results where the word appears near the start of the filename
  const lowerWord = word.toLowerCase();
  const preferred =
    audioResults.find((r) =>
      r.title.toLowerCase().includes(`-${lowerWord}.`),
    ) ?? audioResults[0];

  return resolveCommonsFile(preferred.title.replace(/^File:/, ""));
}

/**
 * Fetch a Wikimedia Commons pronunciation URL for a single word.
 *
 * Tries predictable filename patterns first, then falls back to a search.
 * Results are cached in-process for the lifetime of the server worker.
 *
 * @returns Direct media URL (e.g. https://upload.wikimedia.org/…) or null.
 */
export async function fetchWikimediaAudio(
  word: string,
  language: string,
): Promise<string | null> {
  const cacheKey = `${language}:${word.toLowerCase().trim()}`;
  if (_cache.has(cacheKey)) return _cache.get(cacheKey)!;

  const prefixes = LANG_PREFIXES[language] ?? [
    language.charAt(0).toUpperCase() + language.slice(1),
  ];

  const normalized = word.trim();
  const titleCase =
    normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
  const lower = normalized.toLowerCase();

  // Build a deduplicated candidate list
  const candidates = [
    ...new Set(
      prefixes.flatMap((prefix) => [
        `${prefix}-${titleCase}.ogg`,
        `${prefix}-${lower}.ogg`,
        `${prefix}-${normalized}.ogg`,
        `${prefix}-${titleCase}.mp3`,
        `${prefix}-${lower}.mp3`,
      ]),
    ),
  ];

  for (const filename of candidates) {
    const url = await resolveCommonsFile(filename);
    if (url) {
      _cache.set(cacheKey, url);
      return url;
    }
  }

  // Second-chance: full-text search
  const searchUrl = await searchCommonsAudio(normalized, language);
  _cache.set(cacheKey, searchUrl);
  return searchUrl;
}

/**
 * Returns true when the text looks like a single word
 * (used to decide whether to attempt a Commons lookup).
 */
export function isSingleWord(text: string): boolean {
  return text.trim().split(/\s+/).length === 1;
}
