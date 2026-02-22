/* =============================================================================
   LLM Feedback Generator ML Service Client

   HTTP client for the Python LLM Feedback Generator microservice (:8500).
   Used by Next.js API routes to proxy requests from the frontend.
============================================================================= */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExplainRequest {
  userId: string;
  wordId: string;
  sessionId: string;
  force?: boolean;
}

export interface ExplainResponse {
  explanation: string;
  exampleSentence: string;
  patternDetected: string;
  patternDescription: string;
  patternConfidence: number;
  triggerReason: string;
  triggered: boolean;
  cached: boolean;
  llmProvider: string;
  llmModel: string;
  latencyMs: number;
}

export interface GrammarExamplesRequest {
  userId: string;
  grammarConceptTag: string;
  knownWordIds?: string[];
}

export interface GrammarExamplesResponse {
  sentences: string[];
  grammarConcept: string;
  llmProvider: string;
  llmModel: string;
  latencyMs: number;
}

export interface FeedbackHealthResponse {
  status: string;
  service: string;
  llmProvider: string;
  llmModel: string;
  version: string;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const ML_SERVICE_URL =
  process.env.FEEDBACK_GENERATOR_SERVICE_URL || "http://localhost:8500";
const ML_API_KEY = process.env.FEEDBACK_GENERATOR_API_KEY || "";

const TIMEOUT_MS = 15_000; // 15s — LLM calls can be slow

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
        `[feedback-generator-client] ${options.method || "GET"} ${path} → ${resp.status}`,
      );
      return null;
    }

    return (await resp.json()) as T;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      console.warn(
        `[feedback-generator-client] ${path} timed out (${TIMEOUT_MS}ms)`,
      );
    } else {
      console.warn(`[feedback-generator-client] ${path} failed:`, err);
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
 * Generate a personalized micro-explanation for a word the learner
 * keeps getting wrong.
 *
 * Checks trigger conditions automatically. Returns null if the service
 * is unavailable — caller should handle gracefully.
 */
export async function getWordExplanation(
  req: ExplainRequest,
): Promise<ExplainResponse | null> {
  return mlFetch<ExplainResponse>("/ml/feedback/explain", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

/**
 * Generate 3 example sentences demonstrating a grammar concept
 * using only the user's known vocabulary.
 *
 * Called when a grammar lesson is completed.
 */
export async function getGrammarExamples(
  req: GrammarExamplesRequest,
): Promise<GrammarExamplesResponse | null> {
  return mlFetch<GrammarExamplesResponse>("/ml/feedback/grammar-examples", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

/**
 * Health check for the Feedback Generator service.
 */
export async function getFeedbackGeneratorHealth(): Promise<FeedbackHealthResponse | null> {
  return mlFetch<FeedbackHealthResponse>("/ml/feedback/health");
}
