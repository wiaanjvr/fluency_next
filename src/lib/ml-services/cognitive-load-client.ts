/* =============================================================================
   Cognitive Load ML Service Client

   HTTP client for the Python Cognitive Load Estimator microservice.
   Used by Next.js API routes to proxy requests from the frontend and
   by server-side code (e.g. story engine) to query session load.
============================================================================= */

import type {
  CognitiveLoadSnapshot,
  InitCognitiveLoadRequest,
  InitCognitiveLoadResponse,
  RecordCognitiveLoadEventRequest,
  RecordCognitiveLoadEventResponse,
  EndCognitiveLoadRequest,
  EndCognitiveLoadResponse,
} from "@/types/cognitive-load";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const ML_SERVICE_URL =
  process.env.COGNITIVE_LOAD_SERVICE_URL || "http://localhost:8200";
const ML_API_KEY = process.env.COGNITIVE_LOAD_API_KEY || "";

const TIMEOUT_MS = 3_000; // 3s — must be fast for real-time use

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
        `[cognitive-load-client] ${options.method || "GET"} ${path} → ${resp.status}`,
      );
      return null;
    }

    return (await resp.json()) as T;
  } catch (err) {
    // Service down or timeout — degrade gracefully
    if (err instanceof DOMException && err.name === "AbortError") {
      console.warn(
        `[cognitive-load-client] ${path} timed out (${TIMEOUT_MS}ms)`,
      );
    } else {
      console.warn(`[cognitive-load-client] ${path} failed:`, err);
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
 * Initialise cognitive load tracking for a session.
 * Called from the session/start API route.
 */
export async function initCognitiveLoadSession(
  req: InitCognitiveLoadRequest,
): Promise<InitCognitiveLoadResponse | null> {
  return mlFetch<InitCognitiveLoadResponse>("/ml/cognitive-load/session/init", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

/**
 * Record a single event's response time for cognitive load tracking.
 * Called after each interaction event is logged.
 */
export async function recordCognitiveLoadEvent(
  req: RecordCognitiveLoadEventRequest,
): Promise<RecordCognitiveLoadEventResponse | null> {
  return mlFetch<RecordCognitiveLoadEventResponse>(
    "/ml/cognitive-load/session/event",
    {
      method: "POST",
      body: JSON.stringify(req),
    },
  );
}

/**
 * Get the current cognitive load snapshot for a session.
 *
 * This is the **primary integration point** for:
 * - Story engine (before generating each new segment)
 * - Frontend (cognitive load indicator)
 */
export async function getSessionCognitiveLoad(
  sessionId: string,
): Promise<CognitiveLoadSnapshot | null> {
  return mlFetch<CognitiveLoadSnapshot>(
    `/ml/cognitive-load/session/${sessionId}`,
  );
}

/**
 * End cognitive load tracking and persist the final score.
 * Called from the session/end API route.
 */
export async function endCognitiveLoadSession(
  req: EndCognitiveLoadRequest,
): Promise<EndCognitiveLoadResponse | null> {
  return mlFetch<EndCognitiveLoadResponse>("/ml/cognitive-load/session/end", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

/**
 * Check if the cognitive load service is healthy.
 */
export async function checkCognitiveLoadHealth(): Promise<boolean> {
  const resp = await mlFetch<{ status: string }>("/ml/cognitive-load/health");
  return resp?.status === "ok";
}
