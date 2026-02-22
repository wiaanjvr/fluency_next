/* =============================================================================
   Story Word Selector ML Service Client

   HTTP client for the Python Story Word Selector microservice (:8300).
   Used by Next.js API routes and server-side code (story generation)
   to get ML-informed word selections for stories.
============================================================================= */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SelectWordsRequest {
  userId: string;
  targetWordCount: number;
  storyComplexityLevel?: number;
  language?: string;
}

export interface SelectWordsResponse {
  dueWords: string[];
  knownFillWords: string[];
  thematicBias: string[];
  debug?: {
    totalUserWords: number;
    duePoolSize: number;
    knownPoolSize: number;
    dktCoverage: number;
    maxDueAllowed: number;
    selectedDueCount: number;
    selectedKnownCount: number;
    knownPercentage: number;
  };
}

export interface UpdatePreferencesRequest {
  userId: string;
  storyTopicTags: string[];
  timeOnSegmentMs: number;
  storyId?: string;
}

export interface InitPreferencesRequest {
  userId: string;
  selectedTopics: string[];
}

export interface InitPreferencesResponse {
  status: string;
  preferenceVector: number[];
  selectedTopics: string[];
}

export interface TopicInfo {
  tag: string;
  label: string;
}

export interface TopicTaxonomyResponse {
  topics: TopicInfo[];
}

export interface StoryHealthResponse {
  status: string;
  version: string;
  dktReachable: boolean;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const ML_SERVICE_URL =
  process.env.STORY_SELECTOR_SERVICE_URL || "http://localhost:8300";
const ML_API_KEY = process.env.STORY_SELECTOR_API_KEY || "";

const TIMEOUT_MS = 10_000; // 10s — can be slow due to DKT call

// ---------------------------------------------------------------------------
// Internal fetch helper
// ---------------------------------------------------------------------------

async function mlFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T | null> {
  const url = `${ML_SERVICE_URL}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const resp = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": ML_API_KEY,
        ...options.headers,
      },
    });

    if (!resp.ok) {
      console.warn(
        `[story-selector-client] ${options.method || "GET"} ${path} → ${resp.status}`,
      );
      return null;
    }

    return (await resp.json()) as T;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      console.warn(
        `[story-selector-client] ${path} timed out (${TIMEOUT_MS}ms)`,
      );
    } else {
      console.warn(`[story-selector-client] ${path} failed:`, err);
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Select words for story generation using ML-informed scoring.
 *
 * Falls back to null if the service is unavailable — the caller should
 * use the existing TypeScript word selector as a fallback.
 */
export async function selectStoryWordsML(
  req: SelectWordsRequest,
): Promise<SelectWordsResponse | null> {
  return mlFetch<SelectWordsResponse>("/ml/story/select-words", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

/**
 * Initialize topic preferences at signup.
 */
export async function initTopicPreferences(
  req: InitPreferencesRequest,
): Promise<InitPreferencesResponse | null> {
  return mlFetch<InitPreferencesResponse>("/ml/story/init-preferences", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

/**
 * Update topic preferences after a story session.
 */
export async function updateTopicPreferences(
  req: UpdatePreferencesRequest,
): Promise<{ status: string } | null> {
  return mlFetch<{ status: string }>("/ml/story/update-preferences", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

/**
 * Get the list of available topic tags for the signup UI.
 */
export async function getTopicTaxonomy(): Promise<TopicTaxonomyResponse | null> {
  return mlFetch<TopicTaxonomyResponse>("/ml/story/topics");
}

/**
 * Health check for the Story Word Selector service.
 */
export async function getStoryServiceHealth(): Promise<StoryHealthResponse | null> {
  return mlFetch<StoryHealthResponse>("/ml/story/health");
}
