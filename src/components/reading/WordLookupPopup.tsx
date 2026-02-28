"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  X,
  Check,
  ChevronDown,
  Loader2,
  BookmarkPlus,
  Volume2,
} from "lucide-react";
import type { ReadingToken } from "@/lib/reading-utils";
import { cleanWord } from "@/lib/reading-utils";
import type { LookupResult } from "@/hooks/useReadingSession";

interface Deck {
  id: string;
  name: string;
}

interface WordLookupPopupProps {
  /** The selected word and its bounding rect for positioning */
  selectedWord: { token: ReadingToken; rect: DOMRect } | null;
  /** Full content text for context extraction */
  contentText: string;
  /** Target language code */
  language: string;
  /** Authenticated user id */
  userId: string;
  /** Current reading text id */
  textId: string;
  /** Called to close the popup */
  onClose: () => void;
  /** Called when user marks word as known */
  onMarkKnown: (word: string) => void;
  /** Called when user adds word to a deck */
  onAddToDeck: (word: string) => void;
  /** Async word lookup with session caching */
  lookupWord: (
    word: string,
    language: string,
    context: string,
  ) => Promise<LookupResult | null>;
  /** Notifies parent that a word was looked up (for session tracking) */
  onWordLookedUp?: (word: string) => void;
}

/**
 * Floating popup positioned above the clicked word.
 * Shows definition, phonetic, example sentence, and action buttons.
 */
export function WordLookupPopup({
  selectedWord,
  contentText,
  language,
  userId,
  textId,
  onClose,
  onMarkKnown,
  onAddToDeck,
  lookupWord,
  onWordLookedUp,
}: WordLookupPopupProps) {
  const [definition, setDefinition] = useState<LookupResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [markedKnown, setMarkedKnown] = useState(false);
  const [addedToDeck, setAddedToDeck] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeckDropdown, setShowDeckDropdown] = useState(false);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [popupPosition, setPopupPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const word = selectedWord?.token ? cleanWord(selectedWord.token.word) : "";

  // ─── Position the popup above the clicked word ─────────────────────

  useEffect(() => {
    if (!selectedWord?.rect) {
      setPopupPosition(null);
      return;
    }

    const rect = selectedWord.rect;
    const popupWidth = 288; // w-72
    const estimatedHeight = 340;
    const margin = 8;

    let left = rect.left + rect.width / 2 - popupWidth / 2;
    left = Math.max(
      margin,
      Math.min(left, window.innerWidth - popupWidth - margin),
    );

    let top = rect.top - estimatedHeight - margin + window.scrollY;
    // If not enough space above, position below the word
    if (rect.top - estimatedHeight - margin < 0) {
      top = rect.bottom + margin + window.scrollY;
    }

    setPopupPosition({ top, left });
  }, [selectedWord]);

  // ─── Fetch definition when word changes ────────────────────────────

  useEffect(() => {
    if (!word || !selectedWord) return;

    setMarkedKnown(false);
    setAddedToDeck(false);
    setShowDeckDropdown(false);
    setIsLoading(true);
    setDefinition(null);

    // Find the sentence containing this word for context
    const sentences = contentText.match(/[^.!?]+[.!?]+/g) || [contentText];
    const context =
      sentences
        .find((s) => s.toLowerCase().includes(word.toLowerCase()))
        ?.trim() || "";

    // Session tracking
    onWordLookedUp?.(word);

    lookupWord(word, language, context).then((result) => {
      setDefinition(result);
      setIsLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word, selectedWord?.token.index]);

  // ─── Fetch user's decks ────────────────────────────────────────────

  useEffect(() => {
    if (!userId || !language || !selectedWord) return;

    (async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data } = await supabase
          .from("decks")
          .select("id, name")
          .eq("user_id", userId)
          .eq("language", language)
          .order("name");
        setDecks(data || []);
      } catch {
        /* best‑effort */
      }
    })();
  }, [userId, language, selectedWord]);

  // ─── Log lookup interaction ────────────────────────────────────────

  useEffect(() => {
    if (!word || !selectedWord || !textId) return;

    fetch("/api/reading/interact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text_id: textId,
        word,
        language,
        action: "looked_up",
      }),
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word, selectedWord?.token.index]);

  // ─── Context sentence ──────────────────────────────────────────────

  const exampleSentence = (() => {
    if (!word) return "";
    const sentences = contentText.match(/[^.!?]+[.!?]+/g) || [];
    return (
      sentences
        .find((s) => s.toLowerCase().includes(word.toLowerCase()))
        ?.trim() || ""
    );
  })();

  // ─── Mark Known ────────────────────────────────────────────────────

  const handleMarkKnown = useCallback(() => {
    if (markedKnown || !word) return;
    setMarkedKnown(true);
    onMarkKnown(word);

    fetch("/api/reading/mark-known", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ word, language, textId }),
    }).catch(() => {});

    setTimeout(onClose, 400);
  }, [word, markedKnown, onMarkKnown, textId, language, onClose]);

  // ─── Add to Deck ──────────────────────────────────────────────────

  const handleAddToDeck = useCallback(
    async (deckId?: string) => {
      if (addedToDeck || isSaving || !word || !definition) return;
      setIsSaving(true);

      try {
        const res = await fetch("/api/reading/add-flashcard", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            word,
            definition: definition.definition,
            language,
            exampleSentence: definition.exampleSentence || exampleSentence,
            textId,
            ...(deckId ? { deckId } : {}),
          }),
        });

        if (res.ok) {
          setAddedToDeck(true);
          setShowDeckDropdown(false);
          onAddToDeck(word);
          setTimeout(() => setAddedToDeck(false), 2000);
        }
      } catch {
        /* fail silently */
      } finally {
        setIsSaving(false);
      }
    },
    [
      word,
      definition,
      exampleSentence,
      language,
      textId,
      addedToDeck,
      isSaving,
      onAddToDeck,
    ],
  );

  // ─── Hear it (browser TTS) ────────────────────────────────────────

  const handleHearIt = useCallback(() => {
    if (!word) return;
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang =
      language === "de"
        ? "de-DE"
        : language === "fr"
          ? "fr-FR"
          : language === "it"
            ? "it-IT"
            : language === "es"
              ? "es-ES"
              : "en-US";
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  }, [word, language]);

  // ─── Close on outside click ────────────────────────────────────────

  useEffect(() => {
    if (!selectedWord) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Small delay to avoid the originating word‑click from closing immediately
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 50);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [selectedWord, onClose]);

  // ─── Close on Escape ──────────────────────────────────────────────

  useEffect(() => {
    if (!selectedWord) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedWord, onClose]);

  // ─── Render ────────────────────────────────────────────────────────

  if (!selectedWord || !popupPosition) return null;

  return (
    <div
      ref={popupRef}
      className={cn(
        "absolute z-[65] w-72 p-5",
        "bg-[#0d1b2a] border border-white/[0.08] rounded-2xl",
        "shadow-[0_8px_40px_rgba(0,0,0,0.6),0_0_0_1px_rgba(61,214,181,0.06)]",
        "backdrop-blur-xl",
        "animate-in fade-in zoom-in-95 duration-200",
      )}
      style={{ top: popupPosition.top, left: popupPosition.left }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-[var(--seafoam)]/50 hover:text-[var(--seafoam)] transition-colors"
        aria-label="Close"
      >
        <X className="w-4 h-4" />
      </button>

      {/* ── Word heading ── */}
      <div className="mb-1">
        <div className="flex items-baseline gap-2 pr-6">
          <h3 className="font-display text-2xl text-[var(--sand)]">{word}</h3>
          {definition?.gender && (
            <span className="text-xs text-[var(--seafoam)]/50 font-body">
              {definition.gender}
            </span>
          )}
        </div>
        {definition?.phonetic && (
          <p className="text-xs text-[var(--seafoam)]/50 font-body mt-0.5">
            {definition.phonetic}
          </p>
        )}
        {definition?.partOfSpeech && (
          <span className="text-xs uppercase tracking-widest text-[var(--seafoam)]/50 font-body">
            {definition.partOfSpeech}
          </span>
        )}
        {definition?.baseForm &&
          definition.baseForm.toLowerCase() !== word.toLowerCase() && (
            <span className="ml-2 text-xs text-[var(--seafoam)]/30 font-body">
              → {definition.baseForm}
            </span>
          )}
      </div>

      {/* Divider */}
      <div className="border-t border-white/[0.06] my-3" />

      {/* ── Definition ── */}
      <div className="mb-3">
        {isLoading ? (
          <div className="flex items-center gap-2 text-[var(--seafoam)]/50">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span className="text-sm font-body">Looking up…</span>
          </div>
        ) : definition ? (
          <p className="text-sm text-[var(--seafoam)] font-body leading-relaxed">
            {definition.definition}
          </p>
        ) : (
          <p className="text-sm text-[var(--seafoam)]/50 font-body">
            Definition unavailable
          </p>
        )}
      </div>

      {/* ── Context sentence ── */}
      {exampleSentence && (
        <p className="text-xs text-[var(--seafoam)]/50 mt-2 mb-3 font-body leading-relaxed">
          &ldquo;
          {exampleSentence
            .split(new RegExp(`(${word})`, "gi"))
            .map((part, i) =>
              part.toLowerCase() === word.toLowerCase() ? (
                <span key={i} className="text-[#3dd6b5] font-medium not-italic">
                  {part}
                </span>
              ) : (
                <span key={i}>{part}</span>
              ),
            )}
          &rdquo;
        </p>
      )}

      {/* ── Action buttons ── */}
      <div className="flex items-center justify-between gap-2 pt-1">
        {/* Mark Known */}
        <button
          onClick={handleMarkKnown}
          disabled={markedKnown}
          className={cn(
            "flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-body transition-all duration-300",
            markedKnown
              ? "border border-[#3dd6b5]/30 text-[var(--sand)]"
              : "border border-white/10 text-[var(--seafoam)] hover:border-[#3dd6b5]/30 hover:text-[var(--sand)]",
          )}
        >
          <Check className="w-3.5 h-3.5" />
          {markedKnown ? "Known" : "Mark Known"}
        </button>

        {/* Add to Deck */}
        <div className="relative">
          <button
            onClick={() => handleAddToDeck()}
            disabled={addedToDeck || isSaving || !definition}
            className={cn(
              "flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-body transition-all duration-300",
              addedToDeck
                ? "bg-[#3dd6b5]/20 border border-[#3dd6b5]/30 text-[#3dd6b5]"
                : "bg-[#3dd6b5]/10 border border-[#3dd6b5]/20 text-[#3dd6b5] hover:bg-[#3dd6b5]/20",
              (isSaving || !definition) && "opacity-50",
            )}
          >
            {addedToDeck ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <BookmarkPlus className="w-3.5 h-3.5" />
            )}
            {addedToDeck ? "Added" : isSaving ? "…" : "+ Add to Deck"}
            {!addedToDeck && decks.length > 0 && (
              <ChevronDown
                className="w-3 h-3 ml-0.5 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeckDropdown((prev) => !prev);
                }}
              />
            )}
          </button>

          {/* Deck picker */}
          {showDeckDropdown && (
            <div className="absolute bottom-full left-0 mb-1 w-48 bg-[#0d1b2a] border border-white/[0.08] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden z-10">
              {decks.map((deck) => (
                <button
                  key={deck.id}
                  onClick={() => handleAddToDeck(deck.id)}
                  className="w-full text-left px-3 py-2 text-xs font-body text-[var(--seafoam)] hover:bg-white/[0.04] transition-colors truncate"
                >
                  {deck.name}
                </button>
              ))}
              {decks.length === 0 && (
                <p className="px-3 py-2 text-xs text-[var(--seafoam)]/50 font-body">
                  No decks yet
                </p>
              )}
            </div>
          )}
        </div>

        {/* Hear it */}
        <button
          onClick={handleHearIt}
          className="p-2 rounded-xl border border-white/10 text-[var(--seafoam)]/60 hover:text-[var(--seafoam)] hover:border-white/20 transition-all"
          title="Hear pronunciation"
        >
          <Volume2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
