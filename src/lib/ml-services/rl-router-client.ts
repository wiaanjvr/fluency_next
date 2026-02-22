/* =============================================================================
   RL Module Router ML Service Client

   HTTP client for the Python RL Module Router microservice.
   Used by Next.js API routes to get next-activity recommendations and
   observe rewards for past decisions.
============================================================================= */

// ---------------------------------------------------------------------------
// Types (mirror the Python Pydantic schemas)
// ---------------------------------------------------------------------------

export interface NextActivityRequest {
  userId: string;
  lastCompletedModule?: string | null;
  availableMinutes?: number | null;
}

export interface NextActivityResponse {
  recommendedModule: string;
  targetWords: string[];
  targetConcept: string | null;
  reason: string;
  confidence: number;
  algorithm: string;
  decisionId: string | null;
}

export interface ObserveRewardRequest {
  decisionId: string;
  userId: string;
}

export interface ObserveRewardResponse {
  reward: number;
  components: Record<string, number>;
  observationId: string | null;
}

export interface RouterHealthResponse {
  status: string;
  version: string;
  banditLoaded: boolean;
  ppoLoaded: boolean;
  activeAlgorithm: string;
  banditStats: Record<string, unknown>;
  ppoStats: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const ML_SERVICE_URL =
  process.env.RL_ROUTER_SERVICE_URL || "http://localhost:8800";
const ML_API_KEY = process.env.RL_ROUTER_API_KEY || "";

const TIMEOUT_MS = 5_000; // 5s — state assembly may take a moment

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
        `[rl-router-client] ${options.method || "GET"} ${path} → ${resp.status}`,
      );
      return null;
    }

    return (await resp.json()) as T;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      console.warn(`[rl-router-client] ${path} timed out (${TIMEOUT_MS}ms)`);
    } else {
      console.warn(`[rl-router-client] ${path} failed:`, err);
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
 * Get the next recommended activity for a user.
 *
 * This is the primary endpoint called after a user completes an activity
 * to determine what they should do next.
 */
export async function getNextActivity(
  req: NextActivityRequest,
): Promise<NextActivityResponse | null> {
  return mlFetch<NextActivityResponse>("/ml/router/next-activity", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

/**
 * Observe the reward for a previous routing decision.
 *
 * Called after a user completes (or abandons) the recommended activity
 * to update the RL model with the observed outcome.
 */
export async function observeReward(
  req: ObserveRewardRequest,
): Promise<ObserveRewardResponse | null> {
  return mlFetch<ObserveRewardResponse>("/ml/router/observe-reward", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

/**
 * Health check for the router service.
 */
export async function getRouterHealth(): Promise<RouterHealthResponse | null> {
  return mlFetch<RouterHealthResponse>("/ml/router/health");
}
