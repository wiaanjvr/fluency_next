"use client";

import { useState, useEffect, useCallback } from "react";
import { getGrammarProgress } from "@/lib/grammar/grammarApi";
import type { GrammarProgressSummary } from "@/types/grammar.types";

export function useGrammarProgress(languageCode: string) {
  const [progress, setProgress] = useState<GrammarProgressSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getGrammarProgress(languageCode);
      setProgress(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load progress");
    } finally {
      setLoading(false);
    }
  }, [languageCode]);

  useEffect(() => {
    load();
  }, [load]);

  return { progress, loading, error, reload: load };
}
