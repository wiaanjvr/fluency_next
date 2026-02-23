"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { OceanBackground } from "@/components/ocean";
import {
  ReadingTextArea,
  AudioPlayer,
  WordDrawer,
  ReadingSkeletonLoader,
  ReadingHeader,
  SessionCompleteOverlay,
} from "@/components/reading";
import { SelectionScreen } from "@/components/reading/SelectionScreen";
import type { SelectionAction } from "@/components/reading/SelectionScreen";
import {
  estimateWordTimestamps,
  detectSentences,
  findCurrentSentence,
  cacheAudio,
  getCachedAudioUrl,
  cleanGeneratedText,
} from "@/lib/reading-utils";
import type {
  ReadingToken,
  GenerateReadingResponse,
} from "@/lib/reading-utils";
import { cn } from "@/lib/utils";
import "@/styles/ocean-theme.css";

// ─── Font size steps ────────────────────────────────────────────────────────

const FONT_SIZES = [0.85, 1, 1.15, 1.3] as const;
const FONT_SIZE_STORAGE_KEY = "fluensea-reading-font-size";

// ─── View mode ──────────────────────────────────────────────────────────

type ViewMode = "selection" | "loading" | "reading";

// ============================================================================
// FreeReadingContent — main content (receives user data from parent)
// ============================================================================

function FreeReadingContent({
  userId,
  targetLanguage,
  cefrLevel,
}: {
  userId: string;
  targetLanguage: string;
  cefrLevel: string;
}) {
  const router = useRouter();

  // ─── Mode state ─────────────────────────────────────────────────

  const [mode, setMode] = useState<ViewMode>("selection");
  const [loadingTopic, setLoadingTopic] = useState<string | null>(null);

  // ─── Core state ─────────────────────────────────────────────────

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [textId, setTextId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [contentText, setContentText] = useState("");
  const [contentTokens, setContentTokens] = useState<ReadingToken[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [level, setLevel] = useState(cefrLevel);
  const [wordCount, setWordCount] = useState(0);

  // ─── Audio state ────────────────────────────────────────────────

  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [highlightedWordIndex, setHighlightedWordIndex] = useState<
    number | null
  >(null);
  const [highlightedSentence, setHighlightedSentence] = useState<{
    startIndex: number;
    endIndex: number;
  } | null>(null);

  // ─── UI state ───────────────────────────────────────────────────

  const [fontSizeIndex, setFontSizeIndex] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(FONT_SIZE_STORAGE_KEY);
      return saved !== null ? Number(saved) : 1;
    }
    return 1;
  });
  const [selectedWord, setSelectedWord] = useState<ReadingToken | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showSessionComplete, setShowSessionComplete] = useState(false);
  const [markedKnownCount, setMarkedKnownCount] = useState(0);

  // ─── Refs ───────────────────────────────────────────────────────

  const sentencesRef = useRef<{ startIndex: number; endIndex: number }[]>([]);
  const tokensRef = useRef<ReadingToken[]>([]);
  const resolvedAudioRef = useRef<string>("");

  // ─── Session vocabulary tracking (Change 8) ───────────────────

  const lookedUpWordsRef = useRef<Set<string>>(new Set());
  const knownWordsRef = useRef<Set<string>>(new Set());

  /** Flush all looked-up words to user_words as 'learning' on session end */
  const flushSessionVocab = useCallback(async () => {
    const wordsToWrite = [...lookedUpWordsRef.current].filter(
      (w) => !knownWordsRef.current.has(w),
    );
    if (wordsToWrite.length === 0) return;

    try {
      const supabase = createClient();
      // Batch upsert looked-up words as 'learning' (ignoreDuplicates so we
      // don't downgrade words the user already marked as 'known')
      await supabase.from("user_words").upsert(
        wordsToWrite.map((w) => ({
          user_id: userId,
          word: w,
          lemma: w,
          language: targetLanguage,
          status: "learning",
          rating: 0,
          ease_factor: 2.5,
          interval: 0,
          repetitions: 0,
        })),
        { onConflict: "user_id,word,language", ignoreDuplicates: true },
      );
    } catch {
      // Best-effort — don't block navigation
    }
  }, [userId, targetLanguage]);

  // Flush on unmount
  useEffect(() => {
    return () => {
      flushSessionVocab();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Flush vocab when user switches tabs / minimises (Fix #15)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushSessionVocab();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [flushSessionVocab]);

  /** Called by WordDrawer when a word is opened */
  const handleWordLookedUp = useCallback((word: string) => {
    lookedUpWordsRef.current.add(word.toLowerCase());
  }, []);

  // ─── Generate / fetch a reading text ──────────────────────────

  const generateReading = useCallback(
    async (topic?: string) => {
      setIsLoading(true);
      setError(null);
      setIsPlaying(false);
      setHighlightedWordIndex(null);
      setHighlightedSentence(null);
      setSelectedWord(null);
      setIsDrawerOpen(false);
      setShowSessionComplete(false);
      setMarkedKnownCount(0);

      try {
        const res = await fetch("/api/reading/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            language: targetLanguage,
            cefrLevel: level,
            ...(topic ? { topic } : {}),
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Generation failed (${res.status})`);
        }

        const data: GenerateReadingResponse = await res.json();

        setTextId(data.id);
        setTitle(data.title);
        // Clean markdown artefacts
        setContentText(cleanGeneratedText(data.content));
        setLevel(data.cefr_level);
        setWordCount(data.word_count);

        // Clean each token word as safeguard
        const cleanedTokens = data.content_tokens.map((t) => ({
          ...t,
          word: cleanGeneratedText(t.word),
        }));

        // Tokens will get timestamps once audio duration is known
        tokensRef.current = cleanedTokens;
        setContentTokens(cleanedTokens);
        sentencesRef.current = detectSentences(cleanedTokens);

        if (data.audio_url) {
          // Cache audio for offline use
          cacheAudio(data.audio_url);
          const resolved = await getCachedAudioUrl(data.audio_url);
          resolvedAudioRef.current = resolved;
          setAudioUrl(resolved);
        }

        // Transition to reading view
        setMode("reading");
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to generate reading text",
        );
        setMode("selection");
      } finally {
        setIsLoading(false);
      }
    },
    [targetLanguage, level],
  );

  // No auto-generate on mount — user picks from selection screen

  // ─── Audio duration callback: compute timestamps ──────────────

  const handleDurationReady = useCallback((durationMs: number) => {
    if (durationMs <= 0) return;
    const withTimestamps = estimateWordTimestamps(
      tokensRef.current,
      durationMs,
    );
    tokensRef.current = withTimestamps;
    setContentTokens(withTimestamps);
    sentencesRef.current = detectSentences(withTimestamps);

    // Auto-play once ready
    setIsPlaying(true);
  }, []);

  // ─── Audio time update → word/sentence highlighting ───────────

  const handleTimeUpdate = useCallback((currentTimeMs: number) => {
    const tokens = tokensRef.current;
    const sentences = sentencesRef.current;

    // Find the word whose time range contains currentTimeMs
    let foundIndex: number | null = null;
    for (const token of tokens) {
      if (
        token.start_time_ms !== undefined &&
        token.end_time_ms !== undefined &&
        currentTimeMs >= token.start_time_ms &&
        currentTimeMs < token.end_time_ms
      ) {
        foundIndex = token.index;
        break;
      }
    }

    setHighlightedWordIndex(foundIndex);

    // Sentence-level highlighting
    const sentence = findCurrentSentence(tokens, sentences, currentTimeMs);
    setHighlightedSentence(sentence);
  }, []);

  // ─── Audio ended → show session complete ──────────────────────

  const handleAudioEnded = useCallback(() => {
    setShowSessionComplete(true);

    // Notify dashboard recommendation engine
    window.dispatchEvent(
      new CustomEvent("fluensea:session-complete", {
        detail: { activityType: "reading" },
      }),
    );
  }, []);

  // ─── Word tap handler ─────────────────────────────────────────

  const handleWordClick = useCallback((token: ReadingToken) => {
    setSelectedWord(token);
    setIsDrawerOpen(true);
  }, []);

  // ─── Word actions ─────────────────────────────────────────────

  const handleMarkKnown = useCallback((word: string) => {
    // Optimistic UI: update token styling immediately
    setContentTokens((prev) =>
      prev.map((t) =>
        t.word.toLowerCase() === word.toLowerCase()
          ? { ...t, is_known: true, is_new: false }
          : t,
      ),
    );
    setMarkedKnownCount((prev) => prev + 1);
    // Track as known so session flush doesn't downgrade it
    knownWordsRef.current.add(word.toLowerCase());
  }, []);

  const handleAddToFlashcards = useCallback((_word: string) => {
    // The API route handles everything; nothing extra needed here
  }, []);

  // ─── Font size cycling (persisted to localStorage) ────────────

  const cycleFontSize = useCallback(() => {
    setFontSizeIndex((prev) => {
      const next = (prev + 1) % FONT_SIZES.length;
      localStorage.setItem(FONT_SIZE_STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  // ─── New text ─────────────────────────────────────────────────

  const handleNewText = useCallback(() => {
    flushSessionVocab();
    lookedUpWordsRef.current = new Set();
    knownWordsRef.current = new Set();
    setMode("selection");
  }, [flushSessionVocab]);

  // ─── Session complete actions ─────────────────────────────────

  const handleDiveAgain = useCallback(() => {
    flushSessionVocab();
    lookedUpWordsRef.current = new Set();
    knownWordsRef.current = new Set();
    setShowSessionComplete(false);
    setMode("selection");
  }, [flushSessionVocab]);

  const handleReturnToPropel = useCallback(() => {
    flushSessionVocab();
    router.push("/propel");
  }, [router, flushSessionVocab]);

  // ─── Computed stats ───────────────────────────────────────────

  const newWordsCount = contentTokens.filter(
    (t) => t.is_new && !t.is_known && !t.punctuation,
  ).length;

  // ─── Selection handler ─────────────────────────────────────────

  const handleSelection = useCallback(
    async (action: SelectionAction) => {
      if (action.type === "generate") {
        setLoadingTopic(action.topic);
        setMode("loading");
        await generateReading(action.topic);
      } else if (action.type === "curated") {
        // Load curated text from DB
        setLoadingTopic(null);
        setMode("loading");
        try {
          const supabase = createClient();
          const { data, error: fetchError } = await supabase
            .from("reading_texts")
            .select(
              "id, title, content, content_tokens, audio_url, cefr_level, topic, word_count, language",
            )
            .eq("id", action.textId)
            .single();

          if (fetchError || !data) throw new Error("Text not found");

          setTextId(data.id);
          setTitle(data.title);
          setContentText(cleanGeneratedText(data.content));
          setLevel(data.cefr_level);
          setWordCount(data.word_count);

          const cleanedTokens = (data.content_tokens as ReadingToken[]).map(
            (t) => ({
              ...t,
              word: cleanGeneratedText(t.word),
            }),
          );

          // Cross-reference tokens against the user's known vocabulary
          // (curated texts have is_known: false for all words since they
          // were created without user context)
          const textLang = data.language || targetLanguage;
          const [{ data: learnerWords }, { data: propelWords }] =
            await Promise.all([
              supabase
                .from("learner_words_v2")
                .select("word, lemma")
                .eq("user_id", userId)
                .eq("language", textLang),
              supabase
                .from("user_words")
                .select("word, lemma")
                .eq("user_id", userId)
                .eq("language", textLang)
                .in("status", ["learning", "known", "mastered"]),
            ]);

          const userKnownSet = new Set<string>();
          for (const row of [...(learnerWords || []), ...(propelWords || [])]) {
            userKnownSet.add((row.lemma || row.word).toLowerCase());
          }

          const crossReferencedTokens = cleanedTokens.map((token) => {
            if (token.punctuation) return token;
            const isKnown = userKnownSet.has(token.word.toLowerCase());
            return {
              ...token,
              is_known: isKnown,
              is_new: !isKnown,
            };
          });

          tokensRef.current = crossReferencedTokens;
          setContentTokens(crossReferencedTokens);
          sentencesRef.current = detectSentences(crossReferencedTokens);

          if (data.audio_url) {
            cacheAudio(data.audio_url);
            const resolved = await getCachedAudioUrl(data.audio_url);
            resolvedAudioRef.current = resolved;
            setAudioUrl(resolved);
          }

          setMode("reading");
          setIsLoading(false);
        } catch {
          setError("Failed to load curated text");
          setMode("selection");
          setIsLoading(false);
        }
      } else if (action.type === "paste") {
        // User pasted text — tokenize client-side and go straight to reading
        setLoadingTopic(null);
        setMode("loading");
        try {
          const res = await fetch("/api/reading/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              language: targetLanguage,
              cefrLevel: level,
              customText: action.text,
            }),
          });
          if (!res.ok) {
            const d = await res.json().catch(() => ({}));
            throw new Error(d.error || "Processing failed");
          }
          const data: GenerateReadingResponse = await res.json();
          setTextId(data.id);
          setTitle(data.title);
          setContentText(cleanGeneratedText(data.content));
          setLevel(data.cefr_level);
          setWordCount(data.word_count);
          const cleanedTokens = data.content_tokens.map((t) => ({
            ...t,
            word: cleanGeneratedText(t.word),
          }));
          tokensRef.current = cleanedTokens;
          setContentTokens(cleanedTokens);
          sentencesRef.current = detectSentences(cleanedTokens);
          if (data.audio_url) {
            cacheAudio(data.audio_url);
            const resolved = await getCachedAudioUrl(data.audio_url);
            resolvedAudioRef.current = resolved;
            setAudioUrl(resolved);
          }
          setMode("reading");
          setIsLoading(false);
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "Failed to process text",
          );
          setMode("selection");
          setIsLoading(false);
        }
      } else if (action.type === "url") {
        // URL import — placeholder; falls back to selection for now
        setError("URL import is coming soon!");
        setMode("selection");
      }
    },
    [generateReading, targetLanguage, level],
  );

  // ─── Render ───────────────────────────────────────────────────

  return (
    <OceanBackground>
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* ═══ Selection Screen ═══ */}
        {mode === "selection" && (
          <div className="animate-fade-in">
            <ReadingHeader
              title=""
              cefrLevel={level}
              wordCount={0}
              isLoading={false}
              fontSizeIndex={fontSizeIndex}
              onCycleFontSize={cycleFontSize}
              onNewText={() => {}}
            />
            {error && (
              <div className="max-w-2xl mx-auto px-6 pt-4">
                <p className="text-red-400 text-sm text-center">{error}</p>
              </div>
            )}
            <SelectionScreen
              targetLanguage={targetLanguage}
              cefrLevel={cefrLevel}
              onSelect={handleSelection}
            />
          </div>
        )}

        {/* ═══ Loading Screen ═══ */}
        {mode === "loading" && (
          <div className="flex flex-col items-center justify-center min-h-screen gap-4 animate-fade-in">
            {/* Pulsing depth ring */}
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 rounded-full border-2 border-teal-400/30 animate-ping" />
              <div className="absolute inset-2 rounded-full border border-teal-400/20 animate-pulse" />
              <div className="absolute inset-4 rounded-full bg-teal-400/10 animate-pulse" />
              <div className="absolute inset-[38%] rounded-full bg-teal-400/40" />
            </div>
            <p className="font-display text-2xl text-gray-300 tracking-wide">
              Preparing your dive...
            </p>
            {loadingTopic && (
              <p className="text-gray-500 text-sm">
                Generating a story about {loadingTopic}...
              </p>
            )}
          </div>
        )}

        {/* ═══ Reading View ═══ */}
        {mode === "reading" && (
          <div className="animate-fade-in flex flex-col flex-1">
            {/* Reading Header (with progress bar) */}
            <ReadingHeader
              title={title}
              cefrLevel={level}
              wordCount={wordCount}
              isLoading={isLoading}
              fontSizeIndex={fontSizeIndex}
              onCycleFontSize={cycleFontSize}
              onNewText={handleNewText}
            />

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <ReadingSkeletonLoader />
              ) : error ? (
                <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6">
                  <p className="text-red-400 font-body text-center">{error}</p>
                  <button
                    onClick={() => generateReading()}
                    className={cn(
                      "px-6 py-3 rounded-xl font-body text-sm font-medium",
                      "bg-teal-400/20 text-teal-400 hover:bg-teal-400/30",
                      "transition-all duration-300",
                    )}
                  >
                    Try again
                  </button>
                </div>
              ) : (
                <ReadingTextArea
                  tokens={contentTokens}
                  highlightedWordIndex={highlightedWordIndex}
                  highlightedSentence={highlightedSentence}
                  onWordClick={handleWordClick}
                  fontSize={FONT_SIZES[fontSizeIndex]}
                  selectedWordIndex={selectedWord?.index ?? null}
                />
              )}
            </div>

            {/* Audio Player (only when ready) */}
            {!isLoading && audioUrl && (
              <AudioPlayer
                audioUrl={audioUrl}
                isPlaying={isPlaying}
                playbackRate={playbackRate}
                onTimeUpdate={handleTimeUpdate}
                onPlayStateChange={setIsPlaying}
                onDurationReady={handleDurationReady}
                onPlaybackRateChange={setPlaybackRate}
                onEnded={handleAudioEnded}
              />
            )}

            {/* Word Drawer */}
            <WordDrawer
              token={selectedWord}
              contentText={contentText}
              language={targetLanguage}
              userId={userId}
              textId={textId || ""}
              isOpen={isDrawerOpen}
              onClose={() => {
                setIsDrawerOpen(false);
                setSelectedWord(null);
              }}
              onMarkKnown={handleMarkKnown}
              onAddToFlashcards={handleAddToFlashcards}
              onWordLookedUp={handleWordLookedUp}
            />

            {/* Session Complete Overlay */}
            <SessionCompleteOverlay
              isVisible={showSessionComplete}
              newWordsCount={newWordsCount}
              markedKnownCount={markedKnownCount}
              onDiveAgain={handleDiveAgain}
              onReturnToPropel={handleReturnToPropel}
            />
          </div>
        )}
      </div>
    </OceanBackground>
  );
}

// ============================================================================
// Page — auth guard + data fetching
// ============================================================================

export default function FreeReadingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [targetLanguage, setTargetLanguage] = useState("fr");
  const [cefrLevel, setCefrLevel] = useState("A2");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/auth/login");
        return;
      }

      setUserId(user.id);

      // Fetch profile for language and level
      const { data: profile } = await supabase
        .from("profiles")
        .select("target_language, current_level")
        .eq("id", user.id)
        .single();

      if (profile) {
        setTargetLanguage(profile.target_language ?? "fr");
        setCefrLevel(profile.current_level ?? "A2");
      }

      setLoading(false);
    };

    load();
  }, [supabase, router]);

  if (loading || !userId) {
    return (
      <OceanBackground>
        <ReadingSkeletonLoader />
      </OceanBackground>
    );
  }

  return (
    <ProtectedRoute>
      <FreeReadingContent
        userId={userId}
        targetLanguage={targetLanguage}
        cefrLevel={cefrLevel}
      />
    </ProtectedRoute>
  );
}
