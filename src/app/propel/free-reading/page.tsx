"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { OceanBackground } from "@/components/ocean";
import {
  ReadingTextArea,
  AudioPlayer,
  ReadingSkeletonLoader,
  ReadingHeader,
  SessionCompleteOverlay,
  WordLookupPopup,
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
import { useReadingSession } from "@/hooks/useReadingSession";
import type {
  VocabEntry,
  ReadingSessionStats,
} from "@/hooks/useReadingSession";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  CheckCircle2,
  MousePointerClick,
  Languages,
  Mic2,
  RefreshCw,
  BookMarked,
} from "lucide-react";
import "@/styles/ocean-theme.css";

// ─── Caustic light particles ─────────────────────────────────────────────
const CAUSTIC_PARTICLES = Array.from({ length: 6 }, (_, i) => ({
  id: i,
  top: `${10 + Math.random() * 70}%`,
  left: `${10 + Math.random() * 80}%`,
  size: 2 + Math.random() * 2,
  duration: 8 + Math.random() * 8,
  delay: Math.random() * 6,
}));

// ─── Font size steps ────────────────────────────────────────────────────────

const FONT_SIZES = [0.85, 1, 1.15, 1.3] as const;
const FONT_SIZE_STORAGE_KEY = "fluensea-reading-font-size";

// ─── View mode ──────────────────────────────────────────────────────────

type ViewMode = "selection" | "loading" | "reading";

// ============================================================================
// ReadingInfoPanel — sidebar / below-text contextual panel
// Shows comprehension stats, vocabulary legend, and interaction tips
// ============================================================================

interface ReadingInfoPanelProps {
  tokens: ReadingToken[];
  markedKnownCount: number;
  knownWordsCount: number;
  audioUrl: string | null;
  onNewText: () => void;
  vocabMap: Map<string, VocabEntry>;
}

/** Categorise a token using the live vocabMap so the counts match what's on screen */
function getTokenCategory(
  token: ReadingToken,
  vocabMap: Map<string, VocabEntry>,
): "known" | "learning" | "new" {
  if (token.punctuation) return "known"; // not counted
  const entry = vocabMap.get(token.word.toLowerCase());
  if (entry?.status === "known") return "known";
  if (entry?.status === "learning") return "learning";
  // Not in vocabMap: blue if the API marked it as new, otherwise treat as known
  // (function / grammar words fall here)
  return token.is_new && !token.is_known ? "new" : "known";
}

function ReadingInfoPanel({
  tokens,
  markedKnownCount,
  knownWordsCount,
  audioUrl,
  onNewText,
  vocabMap,
}: ReadingInfoPanelProps) {
  const words = tokens.filter((t) => !t.punctuation);
  const totalWords = words.length;
  const knownInText = words.filter(
    (t) => getTokenCategory(t, vocabMap) === "known",
  ).length;
  const learningInText = words.filter(
    (t) => getTokenCategory(t, vocabMap) === "learning",
  ).length;
  const newInText = words.filter(
    (t) => getTokenCategory(t, vocabMap) === "new",
  ).length;
  const comprehension =
    totalWords > 0 ? Math.round((knownInText / totalWords) * 100) : 0;

  if (totalWords === 0) return null;

  return (
    <div className="space-y-4">
      {/* ── Comprehension ── */}
      <div
        className={cn(
          "rounded-2xl border border-white/[0.07]",
          "bg-[#0d1b2a]/70 backdrop-blur-md px-5 py-4",
        )}
      >
        <p className="text-[10px] uppercase tracking-widest text-[var(--seafoam)]/40 mb-3 font-body">
          Comprehension
        </p>
        <div className="flex items-end gap-3 mb-3">
          <span
            className="text-3xl font-display font-semibold leading-none"
            style={{ color: "var(--bioluminescent)" }}
          >
            {comprehension}%
          </span>
          <span className="text-xs text-[var(--seafoam)]/50 font-body pb-0.5">
            of this text
          </span>
        </div>
        {/* Progress bar */}
        <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full rounded-full transition-[width] duration-700"
            style={{
              width: `${comprehension}%`,
              background: `linear-gradient(90deg, #1e6b72, #3dd6b5)`,
            }}
          />
        </div>
      </div>

      {/* ── Word breakdown ── */}
      <div
        className={cn(
          "rounded-2xl border border-white/[0.07]",
          "bg-[#0d1b2a]/70 backdrop-blur-md px-5 py-4",
        )}
      >
        <p className="text-[10px] uppercase tracking-widest text-[var(--seafoam)]/40 mb-3 font-body">
          Words in this text
        </p>
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#7dd3fc] shrink-0" />
              <span className="text-xs text-[var(--seafoam)]/70 font-body">
                New words
              </span>
            </div>
            <span className="text-xs font-body text-[var(--sand)]/80 tabular-nums">
              {newInText}
            </span>
          </div>
          {learningInText > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#fcd34d]/70 shrink-0" />
                <span className="text-xs text-[var(--seafoam)]/70 font-body">
                  Encountered
                </span>
              </div>
              <span className="text-xs font-body text-[var(--sand)]/80 tabular-nums">
                {learningInText}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-white/30 shrink-0" />
              <span className="text-xs text-[var(--seafoam)]/70 font-body">
                Known
              </span>
            </div>
            <span className="text-xs font-body text-[var(--sand)]/80 tabular-nums">
              {knownInText}
            </span>
          </div>
        </div>

        {/* Stacked bar */}
        <div className="mt-3 h-1.5 rounded-full bg-white/[0.06] overflow-hidden flex">
          {knownInText > 0 && (
            <div
              className="h-full bg-white/25 transition-[width] duration-700"
              style={{ width: `${(knownInText / totalWords) * 100}%` }}
            />
          )}
          {learningInText > 0 && (
            <div
              className="h-full bg-[#fcd34d]/50 transition-[width] duration-700"
              style={{ width: `${(learningInText / totalWords) * 100}%` }}
            />
          )}
          {newInText > 0 && (
            <div
              className="h-full bg-[#7dd3fc]/70 transition-[width] duration-700"
              style={{ width: `${(newInText / totalWords) * 100}%` }}
            />
          )}
        </div>
      </div>

      {/* ── Global vocab ── */}
      {knownWordsCount > 0 && (
        <div
          className={cn(
            "rounded-2xl border border-white/[0.07]",
            "bg-[#0d1b2a]/70 backdrop-blur-md px-5 py-4",
            "flex items-center gap-3",
          )}
        >
          <BookOpen className="w-4 h-4 text-[#3dd6b5]/60 shrink-0" />
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[var(--seafoam)]/40 font-body">
              Your vocabulary
            </p>
            <p className="text-sm font-body text-[var(--sand)]/80 mt-0.5">
              <span className="text-[#3dd6b5] font-semibold">
                {knownWordsCount.toLocaleString()}
              </span>{" "}
              known words
            </p>
          </div>
        </div>
      )}

      {/* ── Audio status ── */}
      <div
        className={cn(
          "rounded-2xl border border-white/[0.07]",
          "bg-[#0d1b2a]/70 backdrop-blur-md px-5 py-4",
          "flex items-center gap-3",
        )}
      >
        <Mic2
          className={cn(
            "w-4 h-4 shrink-0",
            audioUrl ? "text-[#3dd6b5]/70" : "text-[var(--seafoam)]/30",
          )}
        />
        <div>
          <p className="text-[10px] uppercase tracking-widest text-[var(--seafoam)]/40 font-body">
            Audio narration
          </p>
          <p className="text-xs font-body text-[var(--seafoam)]/60 mt-0.5">
            {audioUrl ? "Ready — player below" : "Audio unavailable"}
          </p>
        </div>
      </div>

      {/* ── Tips ── */}
      <div
        className={cn(
          "rounded-2xl border border-white/[0.07]",
          "bg-[#0d1b2a]/70 backdrop-blur-md px-5 py-4",
        )}
      >
        <p className="text-[10px] uppercase tracking-widest text-[var(--seafoam)]/40 mb-3 font-body">
          How to read
        </p>
        <ul className="space-y-2.5">
          {[
            { icon: MousePointerClick, text: "Tap any word to look it up" },
            { icon: Languages, text: "Tap ⇔ after a sentence to translate" },
            { icon: Mic2, text: "Audio syncs highlights as it plays" },
            { icon: BookMarked, text: "Mark words as known to track progress" },
          ].map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-2.5">
              <Icon className="w-3.5 h-3.5 text-[#3dd6b5]/50 shrink-0 mt-0.5" />
              <span className="text-xs text-[var(--seafoam)]/60 font-body leading-relaxed">
                {text}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* ── Session progress ── */}
      {markedKnownCount > 0 && (
        <div
          className={cn(
            "rounded-2xl border border-[#3dd6b5]/20",
            "bg-[#3dd6b5]/5 backdrop-blur-md px-5 py-4",
            "flex items-center gap-3",
          )}
        >
          <CheckCircle2 className="w-4 h-4 text-[#3dd6b5]/70 shrink-0" />
          <p className="text-xs font-body text-[#3dd6b5]/80">
            <span className="font-semibold">{markedKnownCount}</span> word
            {markedKnownCount !== 1 ? "s" : ""} marked known this session
          </p>
        </div>
      )}

      {/* ── New text ── */}
      <button
        onClick={onNewText}
        className={cn(
          "w-full flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5",
          "border border-white/[0.07] bg-[#0d1b2a]/70 backdrop-blur-md",
          "text-xs font-body text-[var(--seafoam)]/50 hover:text-[var(--seafoam)]/80",
          "hover:bg-[#0d1b2a]/90 transition-all duration-200",
        )}
      >
        <RefreshCw className="w-3.5 h-3.5" />
        New text
      </button>
    </div>
  );
}

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
  const [showSessionComplete, setShowSessionComplete] = useState(false);
  const [markedKnownCount, setMarkedKnownCount] = useState(0);

  // ─── Refs ───────────────────────────────────────────────────────

  const sentencesRef = useRef<{ startIndex: number; endIndex: number }[]>([]);
  const tokensRef = useRef<ReadingToken[]>([]);
  const resolvedAudioRef = useRef<string>("");

  // ─── Interactive reading session hook ──────────────────────────

  const readingSession = useReadingSession({ userId, targetLanguage });

  // ─── Generate / fetch a reading text ──────────────────────────

  const generateReading = useCallback(
    async (topic?: string) => {
      setIsLoading(true);
      setError(null);
      setIsPlaying(false);
      setHighlightedWordIndex(null);
      setHighlightedSentence(null);
      readingSession.setSelectedWord(null);
      readingSession.resetTranslations();
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

        // Start session tracking with the new text
        readingSession.startSession(data.id, cleanedTokens);

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
    [targetLanguage, level, readingSession],
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
    readingSession.completeSession();

    // Notify dashboard recommendation engine
    window.dispatchEvent(
      new CustomEvent("fluensea:session-complete", {
        detail: { activityType: "reading" },
      }),
    );
  }, [readingSession]);

  // ─── Finish Reading button handler ─────────────────────────────

  const handleFinishReading = useCallback(() => {
    setShowSessionComplete(true);
    readingSession.completeSession();

    window.dispatchEvent(
      new CustomEvent("fluensea:session-complete", {
        detail: { activityType: "reading" },
      }),
    );
  }, [readingSession]);

  // ─── Word tap handler ─────────────────────────────────────────

  const handleWordClick = useCallback(
    (token: ReadingToken, rect?: DOMRect) => {
      if (rect) {
        readingSession.setSelectedWord({ token, rect });
      }
    },
    [readingSession],
  );

  // ─── Word actions ─────────────────────────────────────────────

  const handleMarkKnown = useCallback(
    (word: string) => {
      // Optimistic UI: update token styling immediately
      setContentTokens((prev) =>
        prev.map((t) =>
          t.word.toLowerCase() === word.toLowerCase()
            ? { ...t, is_known: true, is_new: false }
            : t,
        ),
      );
      setMarkedKnownCount((prev) => prev + 1);
      // Update vocabMap + global counter + session tracking in the hook
      readingSession.handleMarkKnown(word);
    },
    [readingSession],
  );

  const handleAddToFlashcards = useCallback(
    (word: string) => {
      readingSession.handleAddToDeck(word);
    },
    [readingSession],
  );

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
    readingSession.flushSession();
    readingSession.resetTranslations();
    setMode("selection");
  }, [readingSession]);

  // ─── Session complete actions ─────────────────────────────────

  const handleDiveAgain = useCallback(() => {
    readingSession.flushSession();
    readingSession.resetTranslations();
    setShowSessionComplete(false);
    setMode("selection");
  }, [readingSession]);

  const handleReturnToPropel = useCallback(() => {
    readingSession.flushSession();
    router.push("/propel");
  }, [router, readingSession]);

  // ─── Computed stats ───────────────────────────────────────────

  const newWordsCount = contentTokens.filter(
    (t) => t.is_new && !t.is_known && !t.punctuation,
  ).length;

  // ─── Session stats for completion screen ──────────────────────

  const sessionStats = readingSession.getSessionStats();

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

          // Start session tracking with the curated text
          readingSession.startSession(data.id, crossReferencedTokens);

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
          // Start session tracking with pasted text
          readingSession.startSession(data.id, cleanedTokens);
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

  // ─── Scroll-based depth gradient ─────────────────────────────

  const depthRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mode !== "reading") return;
    const el = depthRef.current;
    if (!el) return;

    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const ratio = docHeight > 0 ? Math.min(1, scrollTop / docHeight) : 0;
      el.style.setProperty("--depth", String(ratio));
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [mode]);

  // ─── Render ───────────────────────────────────────────────────

  return (
    <div
      ref={depthRef}
      className="relative min-h-screen"
      style={{
        background:
          "radial-gradient(ellipse at 50% 0%, #0d2535 0%, #0a0f1e 60%)",
        ["--depth" as string]: "0",
      }}
    >
      {/* ── Layer 1: Surface shimmer (fades with scroll depth) ── */}
      <div
        className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-500"
        style={{
          background:
            "radial-gradient(ellipse at 50% -20%, rgba(30,107,114,0.15) 0%, transparent 60%)",
          opacity: "calc(1 - var(--depth, 0))",
        }}
        aria-hidden
      />

      {/* ── Layer 2: Mid-ocean glow ── */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse at 30% 50%, rgba(61,214,181,0.04) 0%, transparent 50%)",
        }}
        aria-hidden
      />

      {/* ── Layer 3: Caustic light particles ── */}
      {/* Hidden on mobile and when prefers-reduced-motion is set */}
      <div
        className="pointer-events-none fixed inset-0 z-0 hidden md:block motion-reduce:hidden"
        aria-hidden
      >
        {CAUSTIC_PARTICLES.map((p) => (
          <div
            key={p.id}
            className="absolute rounded-full bg-[#3dd6b5] blur-sm animate-[drift_var(--dur)_ease-in-out_infinite]"
            style={{
              top: p.top,
              left: p.left,
              width: `${p.size}px`,
              height: `${p.size}px`,
              opacity: 0.04,
              ["--dur" as string]: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
              animationName: "drift",
            }}
          />
        ))}
      </div>

      {/* ── Content layer ── */}
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

        {/* ═══ Loading Screen — Immersive ocean "Surfacing" ═══ */}
        {mode === "loading" && (
          <div className="flex flex-col items-center justify-center min-h-screen gap-6 animate-fade-in">
            <p className="font-display text-2xl text-[var(--sand)] tracking-wide animate-pulse">
              Surfacing your text…
            </p>
            {/* Three rising bubble dots */}
            <div className="flex items-end gap-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-[#3dd6b5]/40 animate-[bubbleUp_1.4s_ease-in-out_infinite]"
                  style={{ animationDelay: `${i * 0.25}s` }}
                />
              ))}
            </div>
            {loadingTopic && (
              <p className="text-[var(--seafoam)]/50 text-sm font-body">
                Generating a story about {loadingTopic}…
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
              knownWordsCount={readingSession.knownWordsCount}
            />

            {/* Content Area — two-column on large screens */}
            <div className="flex-1 overflow-y-auto">
              <div className="flex">
                {/* ── Main text column ── */}
                <div className="flex-1 min-w-0">
                  {isLoading ? (
                    <ReadingSkeletonLoader />
                  ) : error ? (
                    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6">
                      <p className="text-red-400 font-body text-center">
                        {error}
                      </p>
                      <button
                        onClick={() => generateReading()}
                        className={cn(
                          "px-6 py-3 rounded-xl font-body text-sm font-medium",
                          "bg-[#3dd6b5]/10 text-[#3dd6b5] border border-[#3dd6b5]/20 hover:bg-[#3dd6b5]/20",
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
                      selectedWordIndex={
                        readingSession.selectedWord?.token.index ?? null
                      }
                      getWordClass={readingSession.getWordClass}
                      getWordOpacity={readingSession.getWordOpacity}
                      sentenceTranslations={readingSession.sentenceTranslations}
                      translatingIndices={readingSession.translatingIndices}
                      onSentenceTranslate={
                        readingSession.handleSentenceTranslate
                      }
                      karaokeEnabled={readingSession.karaokeEnabled}
                    />
                  )}

                  {/* Mobile info panel — shown below text */}
                  {!isLoading && !error && contentTokens.length > 0 && (
                    <div className="lg:hidden px-6 pb-40">
                      <ReadingInfoPanel
                        tokens={contentTokens}
                        markedKnownCount={markedKnownCount}
                        knownWordsCount={readingSession.knownWordsCount}
                        audioUrl={audioUrl}
                        onNewText={handleNewText}
                        vocabMap={readingSession.vocabMap}
                      />
                    </div>
                  )}
                </div>

                {/* ── Sticky sidebar (lg+ only) ── */}
                {!isLoading && !error && contentTokens.length > 0 && (
                  <aside className="hidden lg:block w-72 xl:w-80 shrink-0">
                    <div className="sticky top-20 pt-10 pr-8 pb-32">
                      <ReadingInfoPanel
                        tokens={contentTokens}
                        markedKnownCount={markedKnownCount}
                        knownWordsCount={readingSession.knownWordsCount}
                        audioUrl={audioUrl}
                        onNewText={handleNewText}
                        vocabMap={readingSession.vocabMap}
                      />
                    </div>
                  </aside>
                )}
              </div>
            </div>

            {/* Finish Reading button */}
            {!isLoading &&
              !error &&
              contentTokens.length > 0 &&
              !showSessionComplete && (
                <div className="flex justify-center pb-4">
                  <button
                    onClick={handleFinishReading}
                    className={cn(
                      "px-6 py-3 rounded-xl font-body text-sm font-medium",
                      "bg-[#3dd6b5]/10 text-[#3dd6b5] hover:bg-[#3dd6b5]/20",
                      "border border-[#3dd6b5]/20",
                      "transition-all duration-300 active:scale-[0.98]",
                    )}
                  >
                    Finish Reading
                  </button>
                </div>
              )}

            {/* Audio Player — always visible once text is loaded */}
            {!isLoading && (
              <AudioPlayer
                audioUrl={audioUrl}
                isPlaying={isPlaying}
                playbackRate={playbackRate}
                onTimeUpdate={handleTimeUpdate}
                onPlayStateChange={setIsPlaying}
                onDurationReady={handleDurationReady}
                onPlaybackRateChange={setPlaybackRate}
                onEnded={handleAudioEnded}
                karaokeEnabled={readingSession.karaokeEnabled}
                onToggleKaraoke={readingSession.toggleKaraoke}
              />
            )}

            {/* Word Lookup Popup */}
            <WordLookupPopup
              selectedWord={readingSession.selectedWord}
              contentText={contentText}
              language={targetLanguage}
              userId={userId}
              textId={textId || ""}
              onClose={() => readingSession.setSelectedWord(null)}
              onMarkKnown={handleMarkKnown}
              onAddToDeck={handleAddToFlashcards}
              lookupWord={readingSession.lookupWord}
              onWordLookedUp={readingSession.handleWordLookedUp}
            />

            {/* Session Complete Overlay */}
            <SessionCompleteOverlay
              isVisible={showSessionComplete}
              wordsRead={sessionStats.wordsRead}
              newWordsCount={newWordsCount}
              markedKnownCount={markedKnownCount}
              wordsLookedUp={sessionStats.wordsLookedUp}
              wordsAddedToDeck={sessionStats.wordsAddedToDeck}
              onDiveAgain={handleDiveAgain}
              onReturnToPropel={handleReturnToPropel}
            />
          </div>
        )}
      </div>
    </div>
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
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, #0d2535 0%, #0a0f1e 60%)",
        }}
      >
        <p className="font-display text-2xl text-[var(--sand)] animate-pulse tracking-wide">
          Surfacing your text…
        </p>
      </div>
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
