/* =============================================================================
   useKnowledgeGraph — React hook for the knowledge graph integration layer
   
   Provides client-side access to the knowledge graph functions with
   Supabase auth integration. Used by Propel module UIs to:
   - Record session results
   - Get recommendations
   - View knowledge graph stats
============================================================================= */

"use client";

import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  ReviewResult,
  PropelRecommendation,
  PropelSessionResult,
  ModuleSource,
  KnowledgeGraphStats,
  StoryWordSelection,
} from "@/types/knowledge-graph";
import {
  recordReview,
  recordReviewBatch,
  getWordsForStory,
  getPropelRecommendation,
  getPropelRecommendations,
  onGrammarLessonComplete,
  getKnowledgeGraphStats,
  createModuleAdapter,
} from "@/lib/knowledge-graph";

interface UseKnowledgeGraphState {
  loading: boolean;
  error: string | null;
}

/**
 * React hook providing access to the knowledge graph integration layer.
 *
 * Must be used in an authenticated context (user must be signed in).
 */
export function useKnowledgeGraph() {
  const supabase = createClient();
  const [state, setState] = useState<UseKnowledgeGraphState>({
    loading: false,
    error: null,
  });

  // ── Helper: get current user ID ─────────────────────────────────────────
  const getUserId = useCallback(async (): Promise<string | null> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id ?? null;
  }, [supabase]);

  // ── Submit session results from any Propel module ───────────────────────
  const submitSessionResults = useCallback(
    async (
      moduleSource: ModuleSource,
      results: PropelSessionResult[],
    ): Promise<ReviewResult[]> => {
      setState({ loading: true, error: null });
      try {
        const userId = await getUserId();
        if (!userId) throw new Error("Not authenticated");

        const adapter = createModuleAdapter(supabase, userId, moduleSource);
        const reviewResults = await adapter.onSessionComplete(results);
        setState({ loading: false, error: null });
        return reviewResults;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setState({ loading: false, error: message });
        return [];
      }
    },
    [supabase, getUserId],
  );

  // ── Get top Propel recommendation ───────────────────────────────────────
  const getRecommendation = useCallback(
    async (language?: string): Promise<PropelRecommendation | null> => {
      setState({ loading: true, error: null });
      try {
        const userId = await getUserId();
        if (!userId) throw new Error("Not authenticated");

        const rec = await getPropelRecommendation(supabase, userId, language);
        setState({ loading: false, error: null });
        return rec;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setState({ loading: false, error: message });
        return null;
      }
    },
    [supabase, getUserId],
  );

  // ── Get ALL recommendations (ranked) ────────────────────────────────────
  const getAllRecommendations = useCallback(
    async (language?: string): Promise<PropelRecommendation[]> => {
      setState({ loading: true, error: null });
      try {
        const userId = await getUserId();
        if (!userId) throw new Error("Not authenticated");

        const recs = await getPropelRecommendations(supabase, userId, language);
        setState({ loading: false, error: null });
        return recs;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setState({ loading: false, error: message });
        return [];
      }
    },
    [supabase, getUserId],
  );

  // ── Get story words ─────────────────────────────────────────────────────
  const getStoryWords = useCallback(
    async (
      storyLength: number,
      language?: string,
    ): Promise<StoryWordSelection | null> => {
      setState({ loading: true, error: null });
      try {
        const userId = await getUserId();
        if (!userId) throw new Error("Not authenticated");

        const selection = await getWordsForStory(
          supabase,
          userId,
          storyLength,
          language,
        );
        setState({ loading: false, error: null });
        return selection;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setState({ loading: false, error: message });
        return null;
      }
    },
    [supabase, getUserId],
  );

  // ── Complete grammar lesson ─────────────────────────────────────────────
  const completeGrammarLesson = useCallback(
    async (grammarTag: string, lessonId?: string): Promise<boolean> => {
      setState({ loading: true, error: null });
      try {
        const userId = await getUserId();
        if (!userId) throw new Error("Not authenticated");

        const result = await onGrammarLessonComplete(
          supabase,
          userId,
          grammarTag,
          lessonId,
        );
        setState({ loading: false, error: null });
        return result !== null;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setState({ loading: false, error: message });
        return false;
      }
    },
    [supabase, getUserId],
  );

  // ── Get knowledge graph stats ───────────────────────────────────────────
  const getStats = useCallback(
    async (language?: string): Promise<KnowledgeGraphStats | null> => {
      setState({ loading: true, error: null });
      try {
        const userId = await getUserId();
        if (!userId) throw new Error("Not authenticated");

        const stats = await getKnowledgeGraphStats(supabase, userId, language);
        setState({ loading: false, error: null });
        return stats;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setState({ loading: false, error: message });
        return null;
      }
    },
    [supabase, getUserId],
  );

  return {
    ...state,
    submitSessionResults,
    getRecommendation,
    getAllRecommendations,
    getStoryWords,
    completeGrammarLesson,
    getStats,
  };
}
