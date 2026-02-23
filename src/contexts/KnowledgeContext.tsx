"use client";

/**
 * KnowledgeContext — provides lightweight cross-activity vocabulary awareness.
 *
 * Wraps the app so that when a user finishes a Propel session (flashcards,
 * cloze, conjugation, etc.), subsequent activities can immediately see updated
 * vocabulary stats without requiring a full page reload.
 *
 * This does NOT replace per-activity SRS logic — each module still queries
 * user_words directly. Instead it provides:
 *   1. A cached summary (total words, words due, last updated timestamp)
 *   2. A `refresh()` function any module can call after writing to user_words
 *   3. An `invalidate()` for marking the cache stale without fetching
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface KnowledgeStats {
  /** Total words in user_words for the active language */
  totalWords: number;
  /** Words with next_review <= now */
  wordsDue: number;
  /** ISO timestamp of last refresh */
  lastRefreshed: string | null;
}

interface KnowledgeContextType {
  stats: KnowledgeStats;
  /** Re-fetch stats from Supabase */
  refresh: () => Promise<void>;
  /** Mark stats as stale (e.g. after a write); next consumer mount will refresh */
  invalidate: () => void;
  /** Whether a fetch is in progress */
  loading: boolean;
}

const defaultStats: KnowledgeStats = {
  totalWords: 0,
  wordsDue: 0,
  lastRefreshed: null,
};

const KnowledgeContext = createContext<KnowledgeContextType>({
  stats: defaultStats,
  refresh: async () => {},
  invalidate: () => {},
  loading: false,
});

// ─── Provider ───────────────────────────────────────────────────────────────

export function KnowledgeProvider({ children }: { children: ReactNode }) {
  const [stats, setStats] = useState<KnowledgeStats>(defaultStats);
  const [loading, setLoading] = useState(false);
  const [stale, setStale] = useState(true);
  const supabase = createClient();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setStats(defaultStats);
        return;
      }

      // Get the user's target language from profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("target_language")
        .eq("id", user.id)
        .single();

      const lang = profile?.target_language ?? "fr";

      // Count total words
      const { count: totalWords } = await supabase
        .from("user_words")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("language", lang);

      // Count due words
      const now = new Date().toISOString();
      const { count: wordsDue } = await supabase
        .from("user_words")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("language", lang)
        .lte("next_review", now);

      setStats({
        totalWords: totalWords ?? 0,
        wordsDue: wordsDue ?? 0,
        lastRefreshed: now,
      });
      setStale(false);
    } catch (err) {
      console.warn("[KnowledgeProvider] Failed to refresh stats:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const invalidate = useCallback(() => {
    setStale(true);
  }, []);

  // Auto-refresh on mount and when marked stale
  useEffect(() => {
    if (stale) {
      refresh();
    }
  }, [stale, refresh]);

  return (
    <KnowledgeContext.Provider value={{ stats, refresh, invalidate, loading }}>
      {children}
    </KnowledgeContext.Provider>
  );
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useKnowledge() {
  const ctx = useContext(KnowledgeContext);
  if (!ctx) {
    throw new Error("useKnowledge must be used within a KnowledgeProvider");
  }
  return ctx;
}
