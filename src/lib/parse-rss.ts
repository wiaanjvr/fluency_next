/**
 * parse-rss.ts
 *
 * Lightweight server-side RSS parser — no npm XML libraries.
 * Uses regex / string extraction on the raw XML text.
 */

export interface EpisodeData {
  episodeTitle: string;
  audioUrl: string;
  enclosureLength?: string;
  duration?: string;
  publishedAt?: string;
}

/**
 * Extract the text content between two XML-style tags.
 * Returns null if the tag is not found.
 */
function extractTag(xml: string, tag: string): string | null {
  // Handle optional namespace prefix, e.g. <itunes:duration>
  const open = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`<${open}[^>]*>([\\s\\S]*?)<\\/${open}>`, "i");
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

/**
 * Extract an attribute value from the first matching self-closing or opening tag.
 * e.g. extractAttr(xml, "enclosure", "url") => "https://..."
 */
function extractAttr(xml: string, tag: string, attr: string): string | null {
  const tagEsc = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const attrEsc = attr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(
    `<${tagEsc}[^>]*\\s${attrEsc}=["']([^"']+)["'][^>]*>`,
    "i",
  );
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

/**
 * Strip CDATA wrappers if present.
 */
function stripCdata(value: string): string {
  return value.replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/, "$1").trim();
}

/**
 * Parse an RSS feed URL and return data for the latest episode.
 * Returns null on any fetch or parse error — never throws.
 */
export async function parseRssFeed(url: string): Promise<EpisodeData | null> {
  try {
    const response = await fetch(url, {
      next: { revalidate: 3600 },
      headers: {
        Accept: "application/rss+xml, application/xml, text/xml, */*",
      },
    });

    if (!response.ok) return null;

    const xml = await response.text();

    // Grab the first <item> block
    const itemMatch = xml.match(/<item[\s>]([\s\S]*?)<\/item>/i);
    if (!itemMatch) return null;

    const item = itemMatch[1];

    const rawTitle = extractTag(item, "title");
    if (!rawTitle) return null;

    const episodeTitle = stripCdata(rawTitle);

    // Audio URL: try multiple common patterns used by podcast feeds.
    // 1) <enclosure url="..." />
    // 2) <media:content url="..." />
    // 3) <link href="..." /> (Atom/Podcast hosted on Buzzsprout etc)
    // 4) <link>https://...mp3</link>
    // 5) <guid>https://...mp3</guid>
    // 6) fallback: first https URL that looks like an audio file inside the item
    let audioUrl =
      extractAttr(item, "enclosure", "url") ||
      extractAttr(item, "media:content", "url") ||
      extractAttr(item, "link", "href") ||
      undefined;

    // If <link> is present as text content, prefer it when it looks like a media URL
    if (!audioUrl) {
      const linkText = extractTag(item, "link");
      if (linkText) {
        const linkVal = stripCdata(linkText);
        if (
          /^https?:\/\//i.test(linkVal) &&
          /\.(mp3|m4a|m4b|aac|ogg|wav|m4v)(?:\?|$)/i.test(linkVal)
        ) {
          audioUrl = linkVal;
        }
      }
    }

    // GUID sometimes contains a direct media URL
    if (!audioUrl) {
      const guid = extractTag(item, "guid");
      if (guid) {
        const g = stripCdata(guid);
        if (
          /^https?:\/\//i.test(g) &&
          /\.(mp3|m4a|m4b|aac|ogg|wav|m4v)(?:\?|$)/i.test(g)
        ) {
          audioUrl = g;
        }
      }
    }

    // Final fallback: search for any http(s) URL in the item that looks like audio
    if (!audioUrl) {
      const urlMatch = item.match(
        /https?:\/\/[^"'<>\s]+\.(mp3|m4a|m4b|aac|ogg|wav|m4v)/i,
      );
      if (urlMatch) audioUrl = urlMatch[0];
    }

    if (!audioUrl) return null;

    const enclosureLength =
      extractAttr(item, "enclosure", "length") ?? undefined;

    const rawDuration =
      extractTag(item, "itunes:duration") ?? extractTag(item, "duration");
    const duration = rawDuration ? stripCdata(rawDuration) : undefined;

    const rawPubDate = extractTag(item, "pubDate");
    const publishedAt = rawPubDate ? stripCdata(rawPubDate) : undefined;

    return { episodeTitle, audioUrl, enclosureLength, duration, publishedAt };
  } catch {
    return null;
  }
}
