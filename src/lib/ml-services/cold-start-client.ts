/* =============================================================================
   Cold Start Collaborative Filtering ML Service Client

   HTTP client for the Python Cold Start microservice (:8600).
   Used by Next.js API routes to proxy requests from the frontend.
============================================================================= */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AssignClusterRequest {
  nativeLanguage: string;
  targetLanguage: string;
  cefrLevel: string;
  goals: string[];
  userId?: string;
}

export interface AssignClusterResponse {
  clusterId: number;
  recommendedPath: string[];
  defaultComplexityLevel: number;
  estimatedVocabStart: string;
  confidence: number;
  recommendedModuleWeights: Record<string, number>;
  assignmentId: string | null;
  usingModel: boolean;
}

export interface CheckGraduationRequest {
  userId: string;
}

export interface CheckGraduationResponse {
  userId: string;
  eventCount: number;
  threshold: number;
  shouldGraduate: boolean;
  currentClusterId: number | null;
  graduated: boolean;
}

export interface ColdStartTrainRequest {
  force?: boolean;
}

export interface ColdStartTrainResponse {
  status: string;
  nUsers?: number;
  nFeatures?: number;
  nClusters?: number;
  inertia?: number;
  clusterSizes?: Record<string, number>;
  trainingTimeSeconds?: number;
}

export interface ColdStartHealthResponse {
  status: string;
  service: string;
  modelLoaded: boolean;
  nClusters: number;
  version: string;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const ML_SERVICE_URL =
  process.env.COLD_START_SERVICE_URL || "http://localhost:8600";
const ML_API_KEY = process.env.COLD_START_API_KEY || "";

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
        `[cold-start-client] ${options.method || "GET"} ${path} → ${resp.status}`,
      );
      return null;
    }

    return (await resp.json()) as T;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      console.warn(`[cold-start-client] ${path} timed out (${TIMEOUT_MS}ms)`);
    } else {
      console.warn(`[cold-start-client] ${path} failed:`, err);
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
 * Assign a new/cold-start user to the nearest learner cluster.
 *
 * Called during onboarding to get initial recommendations.
 * Returns null if the service is unavailable — caller should use
 * sensible defaults.
 */
export async function assignCluster(
  req: AssignClusterRequest,
): Promise<AssignClusterResponse | null> {
  return mlFetch<AssignClusterResponse>("/ml/coldstart/assign-cluster", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

/**
 * Check if a user has enough events to graduate from cold start.
 *
 * At 50 events the user transitions to their personal model.
 */
export async function checkGraduation(
  req: CheckGraduationRequest,
): Promise<CheckGraduationResponse | null> {
  return mlFetch<CheckGraduationResponse>("/ml/coldstart/check-graduation", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

/**
 * Trigger a K-Means training run (admin only).
 */
export async function trainColdStart(
  req: ColdStartTrainRequest = {},
): Promise<ColdStartTrainResponse | null> {
  return mlFetch<ColdStartTrainResponse>("/ml/coldstart/train", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

/**
 * Health check for the Cold Start service.
 */
export async function getColdStartHealth(): Promise<ColdStartHealthResponse | null> {
  return mlFetch<ColdStartHealthResponse>("/ml/coldstart/health");
}
