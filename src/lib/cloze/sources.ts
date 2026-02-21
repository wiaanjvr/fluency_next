// Sentence source fetchers for the cloze pipeline

import type { ClozeLanguage, RawSentence } from "@/types/cloze";
import {
  cleanText,
  splitSentences,
  isValidSentence,
  GUTENBERG_BOOKS,
  REDDIT_SUBREDDITS,
  NEWS_QUERIES,
  delay,
} from "./language-utils";

/**
 * Fetch sentences from Wikipedia random articles
 */
export async function fetchWikipediaSentences(
  language: ClozeLanguage,
  target: number = 200,
): Promise<RawSentence[]> {
  const sentences: RawSentence[] = [];
  const seen = new Set<string>();
  let attempts = 0;
  const maxAttempts = target * 3;

  while (sentences.length < target && attempts < maxAttempts) {
    attempts++;
    try {
      const res = await fetch(
        `https://${language}.wikipedia.org/api/rest_v1/page/random/summary`,
        { headers: { "User-Agent": "Fluensea-ClozeBot/1.0" } },
      );
      if (!res.ok) continue;

      const data = await res.json();
      const extract = data.extract as string | undefined;
      if (!extract) continue;

      const pageUrl = data.content_urls?.desktop?.page || null;
      const cleaned = cleanText(extract);
      const parts = splitSentences(cleaned);

      for (const s of parts) {
        if (seen.has(s)) continue;
        if (!isValidSentence(s)) continue;
        seen.add(s);
        sentences.push({
          text: s,
          language,
          source: "wikipedia",
          sourceUrl: pageUrl,
        });
        if (sentences.length >= target) break;
      }

      // Small delay to be respectful
      await delay(200);
    } catch {
      await delay(500);
    }
  }

  return sentences;
}

/**
 * Fetch sentences from Project Gutenberg books
 */
export async function fetchGutenbergSentences(
  language: ClozeLanguage,
  target: number = 200,
): Promise<RawSentence[]> {
  const sentences: RawSentence[] = [];
  const seen = new Set<string>();
  const books = GUTENBERG_BOOKS[language] || [];
  const perBook = Math.ceil(target / books.length);

  for (const book of books) {
    // Try multiple URL patterns
    const urls = [
      `https://www.gutenberg.org/files/${book.id}/${book.id}-0.txt`,
      `https://www.gutenberg.org/cache/epub/${book.id}/pg${book.id}.txt`,
    ];

    let text: string | null = null;
    for (const url of urls) {
      try {
        const res = await fetch(url, {
          headers: { "User-Agent": "Fluensea-ClozeBot/1.0" },
        });
        if (res.ok) {
          text = await res.text();
          break;
        }
      } catch {
        continue;
      }
    }

    if (!text) continue;

    // Strip Gutenberg header/footer
    const startMatch = text.indexOf("*** START OF");
    const endMatch = text.indexOf("*** END OF");
    if (startMatch !== -1) {
      const headerEnd = text.indexOf("\n", startMatch);
      text = text.slice(headerEnd + 1);
    }
    if (endMatch !== -1) {
      text = text.slice(0, endMatch);
    }

    // Clean: remove chapter headers, roman numerals, short standalone lines
    const lines = text.split("\n").filter((line) => {
      const trimmed = line.trim();
      if (trimmed.length < 10) return false;
      if (/^[IVXLCDM]+\.?\s*$/.test(trimmed)) return false;
      if (/^(CHAPTER|CHAPITRE|CAPITOLO|KAPITEL)\s/i.test(trimmed)) return false;
      if (/^[-_=*]+$/.test(trimmed)) return false;
      return true;
    });

    const fullText = cleanText(lines.join(" "));
    const parts = splitSentences(fullText);
    let count = 0;

    for (const s of parts) {
      if (count >= perBook) break;
      if (seen.has(s)) continue;
      if (!isValidSentence(s)) continue;
      seen.add(s);
      sentences.push({
        text: s,
        language,
        source: "gutenberg",
        sourceUrl: `https://www.gutenberg.org/ebooks/${book.id}`,
      });
      count++;
    }

    await delay(1000); // Be respectful to Gutenberg
  }

  return sentences.slice(0, target);
}

/**
 * Fetch sentences from News API
 */
export async function fetchNewsSentences(
  language: ClozeLanguage,
  target: number = 200,
): Promise<RawSentence[]> {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) {
    console.warn("[cloze-pipeline] NEWS_API_KEY not set, skipping news source");
    return [];
  }

  const sentences: RawSentence[] = [];
  const seen = new Set<string>();
  const queries = NEWS_QUERIES[language] || [];

  for (const query of queries) {
    try {
      const res = await fetch(
        `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=${language}&pageSize=100&apiKey=${apiKey}`,
      );
      if (!res.ok) continue;

      const data = await res.json();
      const articles = data.articles || [];

      for (const article of articles) {
        const texts = [article.description, article.content].filter(Boolean);
        for (const text of texts) {
          const cleaned = cleanText(text);
          const parts = splitSentences(cleaned);
          for (const s of parts) {
            if (seen.has(s)) continue;
            if (!isValidSentence(s)) continue;
            seen.add(s);
            sentences.push({
              text: s,
              language,
              source: "newsapi",
              sourceUrl: article.url,
            });
          }
        }
      }

      await delay(500);
    } catch {
      continue;
    }
  }

  return sentences.slice(0, target);
}

/**
 * Fetch sentences from Reddit
 */
export async function fetchRedditSentences(
  language: ClozeLanguage,
  target: number = 200,
): Promise<RawSentence[]> {
  const sentences: RawSentence[] = [];
  const seen = new Set<string>();
  const subreddits = REDDIT_SUBREDDITS[language] || [];

  for (const sub of subreddits) {
    try {
      // Fetch hot posts
      const res = await fetch(
        `https://www.reddit.com/r/${sub}/hot.json?limit=100`,
        {
          headers: {
            "User-Agent": "Fluensea-ClozeBot/1.0 (language-learning-app)",
          },
        },
      );
      if (!res.ok) continue;

      const data = await res.json();
      const posts = data?.data?.children || [];

      for (const post of posts) {
        const pd = post.data;
        if (!pd) continue;

        // Skip link-only posts
        if (pd.is_self === false && !pd.selftext) continue;

        // Extract title
        const title = pd.title || "";
        const selftext = pd.selftext || "";
        const permalink = `https://www.reddit.com${pd.permalink}`;

        // Process title
        if (title.length >= 40 && title.length <= 150) {
          const cleaned = cleanText(title);
          if (
            isValidSentence(cleaned) &&
            !seen.has(cleaned) &&
            !/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}]/u.test(
              cleaned,
            )
          ) {
            seen.add(cleaned);
            sentences.push({
              text: cleaned,
              language,
              source: "reddit",
              sourceUrl: permalink,
            });
          }
        }

        // Process selftext
        if (selftext) {
          const parts = splitSentences(cleanText(selftext));
          for (const s of parts) {
            if (seen.has(s)) continue;
            if (!isValidSentence(s)) continue;
            // Skip sentences with emoji
            if (
              /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}]/u.test(
                s,
              )
            )
              continue;
            seen.add(s);
            sentences.push({
              text: s,
              language,
              source: "reddit",
              sourceUrl: permalink,
            });
          }
        }
      }

      await delay(2000); // Reddit rate limits are strict
    } catch {
      continue;
    }
  }

  return sentences.slice(0, target);
}

/**
 * Fetch sentences from Tatoeba (includes translations)
 */
export async function fetchTatoebaSentences(
  language: ClozeLanguage,
  target: number = 200,
): Promise<RawSentence[]> {
  const sentences: RawSentence[] = [];
  const seen = new Set<string>();
  let page = 1;
  const maxPages = 20;

  while (sentences.length < target && page <= maxPages) {
    try {
      const res = await fetch(
        `https://tatoeba.org/en/api_v0/search?from=${language}&to=eng&orphans=no&unapproved=no&query=&page=${page}`,
        { headers: { "User-Agent": "Fluensea-ClozeBot/1.0" } },
      );
      if (!res.ok) break;

      const data = await res.json();
      const results = data.results || [];
      if (results.length === 0) break;

      for (const item of results) {
        const text = item.text as string;
        if (!text || seen.has(text)) continue;
        if (text.length < 40 || text.length > 150) continue;
        if (/https?:\/\//.test(text)) continue;

        // Find English translation
        const translations = item.translations || [];
        let engTranslation: string | undefined;
        for (const group of translations) {
          if (Array.isArray(group)) {
            for (const t of group) {
              if (t.lang === "eng" && t.text) {
                engTranslation = t.text;
                break;
              }
            }
          }
          if (engTranslation) break;
        }

        seen.add(text);
        sentences.push({
          text,
          language,
          source: "tatoeba",
          sourceUrl: `https://tatoeba.org/en/sentences/show/${item.id}`,
          translation: engTranslation,
        });

        if (sentences.length >= target) break;
      }

      page++;
      await delay(1000);
    } catch {
      break;
    }
  }

  return sentences;
}

/**
 * Fetch sentences from all sources for a language
 */
export async function fetchAllSentences(
  language: ClozeLanguage,
  source?: string,
  targetPerSource: number = 200,
): Promise<RawSentence[]> {
  if (source) {
    switch (source) {
      case "wikipedia":
        return fetchWikipediaSentences(language, targetPerSource);
      case "gutenberg":
        return fetchGutenbergSentences(language, targetPerSource);
      case "newsapi":
        return fetchNewsSentences(language, targetPerSource);
      case "reddit":
        return fetchRedditSentences(language, targetPerSource);
      case "tatoeba":
        return fetchTatoebaSentences(language, targetPerSource);
      default:
        return [];
    }
  }

  // Fetch from all sources in parallel (with some sequencing for rate limits)
  const [wikipedia, gutenberg, tatoeba] = await Promise.all([
    fetchWikipediaSentences(language, targetPerSource),
    fetchGutenbergSentences(language, targetPerSource),
    fetchTatoebaSentences(language, targetPerSource),
  ]);

  // Sequential for rate-limited sources
  const news = await fetchNewsSentences(language, targetPerSource);
  const reddit = await fetchRedditSentences(language, targetPerSource);

  return [...wikipedia, ...gutenberg, ...news, ...reddit, ...tatoeba];
}
