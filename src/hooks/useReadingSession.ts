"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ReadingToken } from "@/lib/reading-utils";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface VocabEntry {
  word: string;
  status: "new" | "learning" | "known";
  confidence: number; // 0.0 – 1.0
}

export interface LookupResult {
  definition: string;
  partOfSpeech: string;
  phonetic?: string;
  exampleSentence: string;
  baseForm?: string;
  gender?: string | null;
}

export interface WordTimestamp {
  word_index: number;
  start: number;
  end: number;
}

/** Session stats exposed for the completion screen */
export interface ReadingSessionStats {
  wordsRead: number;
  newWordsEncountered: number;
  wordsMarkedKnown: number;
  wordsAddedToDeck: number;
  wordsLookedUp: number;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

interface UseReadingSessionProps {
  userId: string;
  targetLanguage: string;
}

const AUTOSAVE_INTERVAL_MS = 60_000; // 60 seconds

export function useReadingSession({
  userId,
  targetLanguage,
}: UseReadingSessionProps) {
  const [vocabMap, setVocabMap] = useState<Map<string, VocabEntry>>(new Map());
  const [knownWordsCount, setKnownWordsCount] = useState(0);
  const [karaokeEnabled, setKaraokeEnabled] = useState(true);
  const [sentenceTranslations, setSentenceTranslations] = useState<
    Map<number, string>
  >(new Map());
  const [translatingIndices, setTranslatingIndices] = useState<Set<number>>(
    new Set(),
  );
  const [selectedWord, setSelectedWord] = useState<{
    token: ReadingToken;
    rect: DOMRect;
  } | null>(null);
  const wordCacheRef = useRef<Map<string, LookupResult>>(new Map());

  // ─── Session tracking state (Fix 8) ─────────────────────────────────

  const sessionTextIdRef = useRef<string | null>(null);
  const sessionStartedAtRef = useRef<Date | null>(null);
  const sessionLookedUpRef = useRef<Set<string>>(new Set());
  const sessionMarkedKnownRef = useRef<Set<string>>(new Set());
  const sessionAddedCardIdsRef = useRef<Set<string>>(new Set());
  const sessionContentTokensRef = useRef<ReadingToken[]>([]);
  const [isSessionComplete, setIsSessionComplete] = useState(false);
  const isFlushing = useRef(false);
  const lastFlushRef = useRef<number>(0);

  // ─── Fetch vocabulary on mount ──────────────────────────────────────

  useEffect(() => {
    if (!userId || !targetLanguage) return;

    async function fetchVocab() {
      const supabase = createClient();

      const [{ data: userWords }, { data: learnerWords }] = await Promise.all([
        supabase
          .from("user_words")
          .select("word, lemma, status, repetitions")
          .eq("user_id", userId)
          .eq("language", targetLanguage),
        supabase
          .from("learner_words_v2")
          .select("word, lemma, status, correct_streak")
          .eq("user_id", userId)
          .eq("language", targetLanguage),
      ]);

      const map = new Map<string, VocabEntry>();

      // Process learner_words_v2
      for (const row of learnerWords || []) {
        const key = (row.lemma || row.word).toLowerCase();
        const isKnown = row.status === "mastered";
        map.set(key, {
          word: key,
          status: isKnown ? "known" : "learning",
          confidence: isKnown
            ? 1.0
            : Math.min(1, (row.correct_streak || 0) / 5),
        });
      }

      // Process user_words (takes precedence)
      for (const row of userWords || []) {
        const key = (row.lemma || row.word).toLowerCase();
        const isKnown = row.status === "known" || row.status === "mastered";
        map.set(key, {
          word: key,
          status: isKnown ? "known" : "learning",
          confidence: isKnown ? 1.0 : Math.min(1, (row.repetitions || 0) / 10),
        });
      }

      setVocabMap(map);

      // Global known‑word count
      const { count } = await supabase
        .from("user_words")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("language", targetLanguage)
        .in("status", ["known", "mastered"]);

      setKnownWordsCount(count || 0);
    }

    fetchVocab();
  }, [userId, targetLanguage]);

  // ─── Session lifecycle ───────────────────────────────────────────────

  /** Start a new reading session — call when text is loaded */
  const startSession = useCallback((textId: string, tokens: ReadingToken[]) => {
    sessionTextIdRef.current = textId;
    sessionStartedAtRef.current = new Date();
    sessionLookedUpRef.current = new Set();
    sessionMarkedKnownRef.current = new Set();
    sessionAddedCardIdsRef.current = new Set();
    sessionContentTokensRef.current = tokens;
    setIsSessionComplete(false);
    lastFlushRef.current = Date.now();
  }, []);

  /** Get current session stats */
  const getSessionStats = useCallback((): ReadingSessionStats => {
    const tokens = sessionContentTokensRef.current;
    const wordTokens = tokens.filter((t) => !t.punctuation);
    const newWordsInText = wordTokens.filter(
      (t) => t.is_new && !t.is_known,
    ).length;
    return {
      wordsRead: wordTokens.length,
      newWordsEncountered: newWordsInText,
      wordsMarkedKnown: sessionMarkedKnownRef.current.size,
      wordsAddedToDeck: sessionAddedCardIdsRef.current.size,
      wordsLookedUp: sessionLookedUpRef.current.size,
    };
  }, []);

  // ─── Session flush (Fix 5) ──────────────────────────────────────────

  /**
   * Flush all session vocabulary changes to Supabase.
   * Safe to call multiple times — uses Set deduplication and isFlushing guard.
   * Designed to work in beforeunload (uses sendBeacon fallback) and
   * normal async contexts.
   */
  const flushSession = useCallback(
    async (options?: { useSendBeacon?: boolean }) => {
      if (isFlushing.current) return;
      isFlushing.current = true;

      try {
        const supabase = createClient();
        const lookedUp = [...sessionLookedUpRef.current];
        const markedKnown = [...sessionMarkedKnownRef.current];
        const tokens = sessionContentTokensRef.current;

        // ── 1. Upsert looked-up words as 'learning' ──
        // Don't downgrade words already marked as known
        const wordsToLearn = lookedUp.filter(
          (w) => !sessionMarkedKnownRef.current.has(w),
        );
        if (wordsToLearn.length > 0) {
          await supabase.from("user_words").upsert(
            wordsToLearn.map((w) => ({
              user_id: userId,
              word: w,
              lemma: w,
              language: targetLanguage,
              status: "learning",
              rating: 0,
              ease_factor: 2.5,
              interval: 0,
              repetitions: 0,
              last_seen: new Date().toISOString(),
            })),
            { onConflict: "user_id,word,language", ignoreDuplicates: true },
          );
        }

        // ── 2. Upsert marked-known words with 'known' status ──
        if (markedKnown.length > 0) {
          await supabase.from("user_words").upsert(
            markedKnown.map((w) => ({
              user_id: userId,
              word: w,
              lemma: w,
              language: targetLanguage,
              status: "known",
              rating: 4,
              ease_factor: 2.5,
              interval: 30,
              repetitions: 3,
              last_seen: new Date().toISOString(),
            })),
            { onConflict: "user_id,word,language", ignoreDuplicates: false },
          );
        }

        // ── 3. Increment times_seen for all text words in user_words ──
        // Only for words that ALREADY exist — we don't create entries just for
        // passively seeing a word.
        if (tokens.length > 0) {
          const allTextWords = [
            ...new Set(
              tokens
                .filter((t) => !t.punctuation)
                .map((t) => t.word.toLowerCase()),
            ),
          ];

          // Batch update last_seen for existing entries
          if (allTextWords.length > 0) {
            await supabase
              .from("user_words")
              .update({ last_seen: new Date().toISOString() })
              .eq("user_id", userId)
              .eq("language", targetLanguage)
              .in("word", allTextWords);
          }
        }

        lastFlushRef.current = Date.now();
      } catch (err) {
        console.warn("[useReadingSession] Flush failed:", err);
      } finally {
        isFlushing.current = false;
      }
    },
    [userId, targetLanguage],
  );

  /** Complete the session — triggers final flush */
  const completeSession = useCallback(async () => {
    setIsSessionComplete(true);
    await flushSession();
  }, [flushSession]);

  // ─── Periodic autosave (every 60s) ─────────────────────────────────

  useEffect(() => {
    const interval = setInterval(() => {
      // Only autosave if there's an active session with interactions
      if (
        sessionTextIdRef.current &&
        !isSessionComplete &&
        (sessionLookedUpRef.current.size > 0 ||
          sessionMarkedKnownRef.current.size > 0)
      ) {
        const timeSinceLastFlush = Date.now() - lastFlushRef.current;
        if (timeSinceLastFlush >= AUTOSAVE_INTERVAL_MS - 1000) {
          flushSession();
        }
      }
    }, AUTOSAVE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [flushSession, isSessionComplete]);

  // ─── beforeunload handler ──────────────────────────────────────────

  useEffect(() => {
    const handleBeforeUnload = () => {
      // Use sendBeacon as a last resort for unreliable unload
      if (
        sessionLookedUpRef.current.size > 0 ||
        sessionMarkedKnownRef.current.size > 0
      ) {
        // Fire-and-forget flush via sendBeacon
        const payload = JSON.stringify({
          userId,
          language: targetLanguage,
          lookedUp: [...sessionLookedUpRef.current],
          markedKnown: [...sessionMarkedKnownRef.current],
          textWords: [
            ...new Set(
              sessionContentTokensRef.current
                .filter((t) => !t.punctuation)
                .map((t) => t.word.toLowerCase()),
            ),
          ],
        });
        navigator.sendBeacon("/api/reading/flush-session", payload);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [userId, targetLanguage]);

  // ─── Flush on visibilitychange (tab switch / minimise) ─────────────

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && sessionTextIdRef.current) {
        flushSession();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [flushSession]);

  // ─── Flush on unmount ──────────────────────────────────────────────

  useEffect(() => {
    return () => {
      flushSession();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Get colour class for a token ─────────────────────────────────

  const getWordClass = useCallback(
    (token: ReadingToken): string => {
      if (token.punctuation) return "text-[var(--seafoam)]/40";

      const key = token.word.toLowerCase();
      const entry = vocabMap.get(key);

      if (entry) {
        if (entry.status === "known")
          return "text-[var(--sand)] cursor-pointer hover:border-b hover:border-current hover:border-dotted";
        if (entry.status === "learning")
          return "text-[#fcd34d] cursor-pointer hover:border-b hover:border-current hover:border-dotted";
      }

      // Not in vocabMap — fall back to token flags
      if (token.is_new && !token.is_known) {
        return "text-[#7dd3fc] cursor-pointer hover:border-b hover:border-current hover:border-dotted";
      }

      // Function word or otherwise known
      return "text-[var(--sand)] cursor-pointer hover:border-b hover:border-current hover:border-dotted";
    },
    [vocabMap],
  );

  // ─── Get opacity for learning words ───────────────────────────────

  const getWordOpacity = useCallback(
    (token: ReadingToken): number | undefined => {
      if (token.punctuation) return undefined;
      const key = token.word.toLowerCase();
      const entry = vocabMap.get(key);
      if (entry?.status === "learning") {
        return 0.5 + entry.confidence * 0.5;
      }
      return undefined;
    },
    [vocabMap],
  );

  // ─── Classify tokens against live vocab map ──────────────────────

  const classifyTokens = useCallback(
    (tokens: ReadingToken[]): ReadingToken[] => {
      return tokens.map((token) => {
        if (token.punctuation) return token;
        const key = token.word.toLowerCase();
        const entry = vocabMap.get(key);
        if (!entry) return { ...token, is_known: false, is_new: true };
        if (entry.status === "known")
          return { ...token, is_known: true, is_new: false };
        // learning
        return { ...token, is_known: false, is_new: false };
      });
    },
    [vocabMap],
  );

  // ─── Handle mark known (local state + session tracking) ────────────

  const handleMarkKnown = useCallback((word: string) => {
    const key = word.toLowerCase();
    sessionMarkedKnownRef.current.add(key);
    setVocabMap((prev) => {
      const next = new Map(prev);
      next.set(key, { word: key, status: "known", confidence: 1.0 });
      return next;
    });
    setKnownWordsCount((prev) => prev + 1);
  }, []);

  // ─── Handle add to deck (local state + session tracking) ──────────

  const handleAddToDeck = useCallback((word: string, cardId?: string) => {
    const key = word.toLowerCase();
    if (cardId) {
      sessionAddedCardIdsRef.current.add(cardId);
    }
    setVocabMap((prev) => {
      const next = new Map(prev);
      if (!next.has(key) || next.get(key)!.status !== "known") {
        next.set(key, { word: key, status: "learning", confidence: 0.1 });
      }
      return next;
    });
  }, []);

  // ─── Handle word looked up (session tracking) ─────────────────────

  const handleWordLookedUp = useCallback((word: string) => {
    sessionLookedUpRef.current.add(word.toLowerCase());
  }, []);

  // ─── Handle sentence translation ─────────────────────────────────

  const handleSentenceTranslate = useCallback(
    async (sentenceIndex: number, text: string) => {
      // Already cached
      if (sentenceTranslations.has(sentenceIndex)) return;

      setTranslatingIndices((prev) => {
        const next = new Set(prev);
        next.add(sentenceIndex);
        return next;
      });

      try {
        const res = await fetch("/api/reading/translate-sentence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, targetLanguage }),
        });

        if (res.ok) {
          const data = await res.json();
          setSentenceTranslations((prev) => {
            const next = new Map(prev);
            next.set(sentenceIndex, data.translation);
            return next;
          });
        }
      } catch (err) {
        console.warn("[useReadingSession] Translation failed:", err);
      } finally {
        setTranslatingIndices((prev) => {
          const next = new Set(prev);
          next.delete(sentenceIndex);
          return next;
        });
      }
    },
    [sentenceTranslations, targetLanguage],
  );

  // ─── Toggle karaoke ──────────────────────────────────────────────

  const toggleKaraoke = useCallback(() => {
    setKaraokeEnabled((prev) => !prev);
  }, []);

  // ─── Look up word (with session cache) ────────────────────────────

  const lookupWord = useCallback(
    async (
      word: string,
      language: string,
      context: string,
    ): Promise<LookupResult | null> => {
      const key = word.toLowerCase();
      const cached = wordCacheRef.current.get(key);
      if (cached) return cached;

      try {
        const res = await fetch("/api/reading/lookup-word", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ word, language, context }),
        });

        if (res.ok) {
          const result: LookupResult = await res.json();
          wordCacheRef.current.set(key, result);
          return result;
        }
      } catch (err) {
        console.warn("[useReadingSession] Lookup failed:", err);
      }
      return null;
    },
    [],
  );

  // ─── Reset for new text ───────────────────────────────────────────

  const resetTranslations = useCallback(() => {
    setSentenceTranslations(new Map());
    setTranslatingIndices(new Set());
    wordCacheRef.current = new Map();
    setSelectedWord(null);
  }, []);

  return {
    // State
    vocabMap,
    knownWordsCount,
    karaokeEnabled,
    sentenceTranslations,
    translatingIndices,
    selectedWord,
    isSessionComplete,

    // Session lifecycle
    startSession,
    completeSession,
    flushSession,
    getSessionStats,
    handleWordLookedUp,

    // Session tracking refs (for external access)
    sessionLookedUpRef,
    sessionMarkedKnownRef,
    sessionAddedCardIdsRef,

    // Actions
    classifyTokens,
    getWordClass,
    getWordOpacity,
    handleMarkKnown,
    handleAddToDeck,
    handleSentenceTranslate,
    toggleKaraoke,
    lookupWord,
    setSelectedWord,
    setKnownWordsCount,
    resetTranslations,
  };
}
