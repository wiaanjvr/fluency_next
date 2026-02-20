/**
 * GET /api/ambient/podcast
 *
 * Returns latest episodes from active podcast feeds matching the
 * authenticated user's target language.
 * Results are cached for 1 hour via next.fetch revalidate.
 */

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { parseRssFeed } from "@/lib/parse-rss";

export interface PodcastEpisode {
  feed_title: string;
  episode_title: string;
  audio_url: string;
  duration?: string;
  published_at?: string;
  difficulty: string;
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch target language from profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("target_language")
      .eq("id", user.id)
      .single();

    const languageCode = (profile?.target_language || "fr").toString();

    // Allow tolerant matching: users may have codes like "it" or "it-IT".
    // Match by the first two-letter ISO code (case-insensitive).
    const langPrefix = languageCode.slice(0, 2).toLowerCase();

    // Fetch active feeds for this language (case-insensitive prefix match)
    const { data: feeds, error: feedsError } = await supabase
      .from("podcast_feeds")
      .select("id, title, rss_url, difficulty")
      .ilike("language_code", `${langPrefix}%`)
      .eq("is_active", true);

    const url = new URL(request.url);
    const debug = url.searchParams.get("debug") === "1";

    if (feedsError || !feeds || feeds.length === 0) {
      if (debug) {
        return NextResponse.json({
          episodes: [],
          feeds: feeds ?? [],
          languageCode,
          langPrefix,
        });
      }
      return NextResponse.json({ episodes: [] });
    }

    // Parse each feed concurrently. When `debug` is set, also fetch the
    // raw XML and return the first <item> snippet so we can inspect feed
    // structure when parsing fails.
    const parsed = await Promise.all(
      feeds.map(async (feed) => {
        let rawItem: string | null = null;
        let rawFetchInfo: {
          status?: number;
          snippet?: string;
          error?: string;
        } | null = null;
        if (debug) {
          try {
            const resp = await fetch(feed.rss_url, {
              headers: {
                Accept: "application/rss+xml, application/xml, text/xml, */*",
              },
              next: { revalidate: 3600 },
            });
            const status = resp.status;
            let snippet: string | null = null;
            try {
              const text = await resp.text();
              snippet = text.slice(0, 2000); // include a short sample for inspection
              const itemMatch = text.match(/<item[\s>][\s\S]*?<\/item>/i);
              rawItem = itemMatch ? itemMatch[0] : null;
            } catch (e) {
              snippet = `READ_ERROR: ${String(e)}`;
            }
            rawFetchInfo = { status, snippet };
          } catch (e) {
            rawFetchInfo = { error: String(e) };
          }
        }

        const episode = await parseRssFeed(feed.rss_url);
        return { feed, episode, rawItem };
      }),
    );

    const episodes: PodcastEpisode[] = parsed
      .filter((p) => p.episode !== null)
      .map((p) => ({
        feed_title: p.feed.title,
        episode_title: p.episode!.episodeTitle,
        audio_url: p.episode!.audioUrl,
        duration: p.episode!.duration,
        published_at: p.episode!.publishedAt,
        difficulty: p.feed.difficulty ?? "intermediate",
      }));

    if (debug) {
      const parseResults = parsed.map((p) => {
        if (p.episode) {
          return {
            id: p.feed.id,
            title: p.feed.title,
            rss_url: p.feed.rss_url,
            status: "ok",
            episode: p.episode,
            rawItem: p.rawItem,
            rawFetchInfo: p.rawFetchInfo ?? null,
          };
        }
        return {
          id: p.feed.id,
          title: p.feed.title,
          rss_url: p.feed.rss_url,
          status: "no-episode",
          rawItem: p.rawItem,
          rawFetchInfo: p.rawFetchInfo ?? null,
        };
      });

      return NextResponse.json({
        episodes,
        debug: { languageCode, langPrefix, feeds, parseResults },
      });
    }

    return NextResponse.json({ episodes });
  } catch (err) {
    console.error("[ambient/podcast] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
