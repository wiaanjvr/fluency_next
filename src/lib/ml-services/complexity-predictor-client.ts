/* =============================================================================
   Complexity Level Predictor ML Service Client

   HTTP client for the Python Complexity Level Predictor microservice (:8400).
   Used by Next.js API routes to proxy requests from the frontend.
============================================================================= */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SessionPlanRequest {
  userId: string;
}

export interface SessionPlanResponse {
  complexityLevel: number;
  recommendedWordCount: number;
  recommendedDurationMinutes: number;
  confidence: number;
  usingModel: boolean;
  features: Record<string, number>;
  planId: string | null;
  reason?: string;
}

export interface ComplexityTrainRequest {
  force?: boolean;
}

export interface ComplexityTrainResponse {
  status: string;
  totalSamples?: number;
  trainSamples?: number;
  valSamples?: number;
  complexityAccuracy?: number;
  complexityWithin1?: number;
  wordCountRmse?: number;
  trainingTimeSeconds?: number;
}

export interface ComplexityHealthResponse {
  status: string;
  service: string;
  modelLoaded: boolean;
  version: string;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const ML_SERVICE_URL =
  process.env.COMPLEXITY_PREDICTOR_SERVICE_URL || "http://localhost:8400";
const ML_API_KEY = process.env.COMPLEXITY_PREDICTOR_API_KEY || "";

const TIMEOUT_MS = 5_000; // 5s

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
        `[complexity-predictor-client] ${options.method || "GET"} ${path} → ${resp.status}`,
      );
      return null;
    }

    return (await resp.json()) as T;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      console.warn(
        `[complexity-predictor-client] ${path} timed out (${TIMEOUT_MS}ms)`,
      );
    } else {
      console.warn(`[complexity-predictor-client] ${path} failed:`, err);
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
 * Predict the optimal session plan for a user.
 *
 * Called before starting a story session to determine:
 *   - Complexity level (1-5)
 *   - Recommended word count
 *   - Recommended duration in minutes
 *
 * Returns null if the service is unavailable — caller should use
 * sensible defaults.
 */
export async function getSessionPlan(
  req: SessionPlanRequest,
): Promise<SessionPlanResponse | null> {
  return mlFetch<SessionPlanResponse>("/ml/session/plan", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

/**
 * Trigger a training run (admin only).
 */
export async function trainComplexityPredictor(
  req: ComplexityTrainRequest = {},
): Promise<ComplexityTrainResponse | null> {
  return mlFetch<ComplexityTrainResponse>("/ml/session/train", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

/**
 * Health check for the Complexity Predictor service.
 */
export async function getComplexityPredictorHealth(): Promise<ComplexityHealthResponse | null> {
  return mlFetch<ComplexityHealthResponse>("/ml/session/health");
}
