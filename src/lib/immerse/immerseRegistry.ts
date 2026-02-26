/**
 * immerseRegistry.ts
 *
 * Central registry of available immersion streams.
 * TODO: Replace static data with a dynamic API feed from Supabase or a CMS.
 * TODO: Add user preference-based recommendations.
 * TODO: Fetch trending/new content periodically.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type ImmerseContentType = "radio" | "podcast" | "youtube";

export type ImmerseDifficulty = "beginner" | "intermediate" | "advanced";

export interface ImmerseStream {
  id: string;
  title: string;
  description: string;
  type: ImmerseContentType;
  language_code: string;
  thumbnailUrl: string;
  streamUrl?: string; // for audio streams (radio / podcast)
  youtubeVideoId?: string; // for youtube type
  youtubePlaylistId?: string;
  difficulty: ImmerseDifficulty;
  tags: string[];
}

// ── Static registry — German streams ─────────────────────────────────────────

export const IMMERSE_STREAMS: ImmerseStream[] = [
  // ── YouTube — Beginner ─────────────────────────────────────────────────────
  {
    id: "yt-easy-german-1",
    title: "Easy German — Street Interviews",
    description:
      "Native speakers answer everyday questions on the street with German and English subtitles. Perfect for beginners building listening comprehension.",
    type: "youtube",
    language_code: "de",
    thumbnailUrl: "https://img.youtube.com/vi/ch_P5cDMBr4/hqdefault.jpg",
    youtubeVideoId: "ch_P5cDMBr4", // Easy German episode
    youtubePlaylistId: "PLk1fjOl39-51Z3sHMRfSMTmRvfQmQ6LoS",
    difficulty: "beginner",
    tags: ["conversation", "subtitled", "street-interviews"],
  },
  {
    id: "yt-learn-german-kurzgesagt",
    title: "Kurzgesagt — Auf Deutsch",
    description:
      "The famous science animation channel in German. Clear narration, engaging visuals, and fascinating topics help you absorb German naturally.",
    type: "youtube",
    language_code: "de",
    thumbnailUrl: "https://img.youtube.com/vi/NxVOIj7mvWI/hqdefault.jpg",
    youtubeVideoId: "NxVOIj7mvWI", // Kurzgesagt DE
    difficulty: "intermediate",
    tags: ["science", "animation", "narrated"],
  },

  // ── YouTube — Intermediate ─────────────────────────────────────────────────
  {
    id: "yt-dw-nachrichten",
    title: "DW Langsam gesprochene Nachrichten",
    description:
      "Deutsche Welle's slowly spoken news — real news stories read at a reduced pace, ideal for intermediate learners who want to understand current events.",
    type: "youtube",
    language_code: "de",
    thumbnailUrl: "https://img.youtube.com/vi/QHGOO73Bpg4/hqdefault.jpg",
    youtubeVideoId: "QHGOO73Bpg4", // DW slowly spoken news
    difficulty: "intermediate",
    tags: ["news", "slow-spoken", "current-events"],
  },

  // ── Podcast — Beginner ─────────────────────────────────────────────────────
  {
    id: "pod-coffee-break",
    title: "Coffee Break German",
    description:
      "Structured German lessons in 15–20 minute episodes. Each episode builds vocabulary and grammar through conversation.",
    type: "podcast",
    language_code: "de",
    // TODO: Replace with a dynamic feed URL from the podcast API
    streamUrl:
      "https://anchor.fm/s/1a3e2b08/podcast/play/87654321/https%3A%2F%2Fd3ctxlq1ktw2nl.cloudfront.net%2Fstaging%2F2024-1-1%2Fcoffee-break-german.mp3",
    thumbnailUrl: "/audio/thumbnails/coffee-break-german.jpg",
    difficulty: "beginner",
    tags: ["structured", "lessons", "conversation"],
  },

  // ── Podcast — Advanced ─────────────────────────────────────────────────────
  {
    id: "pod-deutsch-warum-nicht",
    title: "Deutsch — Warum nicht?",
    description:
      "A classic Deutsche Welle series following a journalism student through daily life in Germany. Rich vocabulary with transcripts available.",
    type: "podcast",
    language_code: "de",
    // TODO: Replace with a real feed URL
    streamUrl:
      "https://www.dw.com/overlay/media/de/deutsch-warum-nicht/episode-01/audio.mp3",
    thumbnailUrl: "/audio/thumbnails/deutsch-warum-nicht.jpg",
    difficulty: "advanced",
    tags: ["narrative", "daily-life", "transcripts"],
  },

  // ── Radio — Beginner ───────────────────────────────────────────────────────
  {
    id: "radio-deutschlandfunk-kultur",
    title: "Deutschlandfunk Kultur",
    description:
      "Germany's premier cultural radio station — music, arts, and cultural discussions. Great ambient listening for picking up natural speech patterns.",
    type: "radio",
    language_code: "de",
    streamUrl: "https://st01.dlf.de/dlf/01/128/mp3/stream.mp3",
    thumbnailUrl: "/audio/thumbnails/dlf-kultur.jpg",
    difficulty: "advanced",
    tags: ["culture", "arts", "live-radio"],
  },

  // ── Radio — Intermediate ───────────────────────────────────────────────────
  {
    id: "radio-wdr-cosmo",
    title: "WDR COSMO",
    description:
      "German public radio with a global music mix and clear spoken segments. Comfortable pace for intermediate listeners.",
    type: "radio",
    language_code: "de",
    streamUrl:
      "https://wdr-cosmo-live.icecast.wdr.de/wdr/cosmo/live/mp3/128/stream.mp3",
    thumbnailUrl: "/audio/thumbnails/wdr-cosmo.jpg",
    difficulty: "intermediate",
    tags: ["music", "global", "live-radio"],
  },

  // ── YouTube — Advanced ─────────────────────────────────────────────────────
  {
    id: "yt-tagesschau",
    title: "Tagesschau — Daily News",
    description:
      "Germany's flagship evening news broadcast. Full-speed native German with complex vocabulary — the ultimate listening challenge.",
    type: "youtube",
    language_code: "de",
    thumbnailUrl: "https://img.youtube.com/vi/u4Q4gOH2gag/hqdefault.jpg",
    youtubeVideoId: "u4Q4gOH2gag", // Tagesschau
    difficulty: "advanced",
    tags: ["news", "native-speed", "formal"],
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Filter streams by content type */
export function filterByType(
  streams: ImmerseStream[],
  type: ImmerseContentType | "all",
): ImmerseStream[] {
  if (type === "all") return streams;
  return streams.filter((s) => s.type === type);
}

/** Filter streams by difficulty */
export function filterByDifficulty(
  streams: ImmerseStream[],
  difficulty: ImmerseDifficulty | "all",
): ImmerseStream[] {
  if (difficulty === "all") return streams;
  return streams.filter((s) => s.difficulty === difficulty);
}

/** Get a single stream by ID */
export function getStreamById(id: string): ImmerseStream | undefined {
  return IMMERSE_STREAMS.find((s) => s.id === id);
}
