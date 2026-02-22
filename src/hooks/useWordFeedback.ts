/* =============================================================================
   useWordFeedback — React hook for LLM-powered word error explanations

   Fetches a personalized micro-explanation when a learner repeatedly
   struggles with a word. Handles loading, errors, and auto-dismiss.

   Usage:
   ```tsx
   const { feedback, isLoading, requestFeedback } = useWordFeedback(sessionId);

   // Call when user gets a word wrong
   requestFeedback(wordId);

   // Display feedback if triggered
   {feedback?.triggered && (
     <FeedbackCard
       explanation={feedback.explanation}
       pattern={feedback.patternDetected}
     />
   )}
   ```
============================================================================= */

"use client";

import { useCallback, useRef, useState } from "react";
import type { WordFeedback, GrammarExamples } from "@/types/feedback";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Auto-dismiss feedback after this duration (ms) */
const AUTO_DISMISS_MS = 30_000; // 30s

/** Maximum concurrent feedback requests per session */
const MAX_REQUESTS_PER_SESSION = 3;

// ---------------------------------------------------------------------------
// useWordFeedback hook
// ---------------------------------------------------------------------------

interface UseWordFeedbackOptions {
  /** User ID */
  userId: string;
  /** Current session ID */
  sessionId: string;
  /** Auto-dismiss after timeout (default: true) */
  autoDismiss?: boolean;
  /** Auto-dismiss timeout in ms (default: 30000) */
  dismissTimeout?: number;
  /** Force generation regardless of trigger conditions */
  force?: boolean;
}

interface UseWordFeedbackResult {
  /** Latest feedback result (null until first request) */
  feedback: WordFeedback | null;
  /** Whether a request is in progress */
  isLoading: boolean;
  /** Error message if the request failed */
  error: string | null;
  /** Request feedback for a specific word */
  requestFeedback: (wordId: string) => Promise<void>;
  /** Manually dismiss the current feedback */
  dismiss: () => void;
  /** Number of feedback requests made this session */
  requestCount: number;
}

export function useWordFeedback({
  userId,
  sessionId,
  autoDismiss = true,
  dismissTimeout = AUTO_DISMISS_MS,
  force = false,
}: UseWordFeedbackOptions): UseWordFeedbackResult {
  const [feedback, setFeedback] = useState<WordFeedback | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestCountRef = useRef(0);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    setFeedback(null);
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  }, []);

  const requestFeedback = useCallback(
    async (wordId: string) => {
      // Rate limit
      if (requestCountRef.current >= MAX_REQUESTS_PER_SESSION) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const resp = await fetch("/api/ml/feedback/explain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            wordId,
            sessionId,
            force,
          }),
        });

        if (!resp.ok) {
          throw new Error(`Feedback request failed: ${resp.status}`);
        }

        const data: WordFeedback = await resp.json();
        requestCountRef.current += 1;

        if (data.triggered) {
          setFeedback(data);

          // Auto-dismiss
          if (autoDismiss) {
            if (dismissTimerRef.current) {
              clearTimeout(dismissTimerRef.current);
            }
            dismissTimerRef.current = setTimeout(dismiss, dismissTimeout);
          }
        } else {
          setFeedback(data);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        console.warn("[useWordFeedback]", message);
      } finally {
        setIsLoading(false);
      }
    },
    [userId, sessionId, force, autoDismiss, dismissTimeout, dismiss],
  );

  return {
    feedback,
    isLoading,
    error,
    requestFeedback,
    dismiss,
    requestCount: requestCountRef.current,
  };
}

// ---------------------------------------------------------------------------
// useGrammarExamples hook
// ---------------------------------------------------------------------------

interface UseGrammarExamplesOptions {
  /** User ID */
  userId: string;
}

interface UseGrammarExamplesResult {
  /** Latest grammar examples result */
  examples: GrammarExamples | null;
  /** Whether a request is in progress */
  isLoading: boolean;
  /** Error message if the request failed */
  error: string | null;
  /** Request grammar examples for a concept */
  requestExamples: (
    grammarConceptTag: string,
    knownWordIds?: string[],
  ) => Promise<void>;
}

export function useGrammarExamples({
  userId,
}: UseGrammarExamplesOptions): UseGrammarExamplesResult {
  const [examples, setExamples] = useState<GrammarExamples | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestExamples = useCallback(
    async (grammarConceptTag: string, knownWordIds?: string[]) => {
      setIsLoading(true);
      setError(null);

      try {
        const resp = await fetch("/api/ml/feedback/grammar-examples", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            grammarConceptTag,
            knownWordIds: knownWordIds || [],
          }),
        });

        if (!resp.ok) {
          throw new Error(`Grammar examples request failed: ${resp.status}`);
        }

        const data: GrammarExamples = await resp.json();
        setExamples(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        console.warn("[useGrammarExamples]", message);
      } finally {
        setIsLoading(false);
      }
    },
    [userId],
  );

  return {
    examples,
    isLoading,
    error,
    requestExamples,
  };
}
