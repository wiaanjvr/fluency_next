"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getCategoryTree,
  getUserCompletedLessonIds,
} from "@/lib/grammar/grammarApi";
import type { CategoryWithTopics } from "@/types/grammar.types";

export function useGrammarNavigation(languageCode: string) {
  const [categories, setCategories] = useState<CategoryWithTopics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const completed = await getUserCompletedLessonIds();
      const tree = await getCategoryTree(languageCode, completed);
      setCategories(tree);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load grammar");
    } finally {
      setLoading(false);
    }
  }, [languageCode]);

  useEffect(() => {
    load();
  }, [load]);

  return { categories, loading, error, reload: load };
}
