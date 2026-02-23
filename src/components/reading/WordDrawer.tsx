"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Volume2, BookmarkPlus, Check, X } from "lucide-react";
import type { ReadingToken } from "@/lib/reading-utils";
import { cleanWord } from "@/lib/reading-utils";
import {
  captureWordToFlashcard,
  fetchUserDecks,
} from "@/lib/captureToFlashcards";

interface WordDefinition {
  definition: string;
  gender: string | null;
  part_of_speech: string | null;
}

interface WordDrawerProps {
  /** The selected word token */
  token: ReadingToken | null;
  /** The full content text (for finding example sentence) */
  contentText: string;
  /** Target language code */
  language: string;
  /** User ID for flashcard saving */
  userId: string;
  /** Reading text ID for interaction tracking */
  textId: string;
  /** Whether the drawer is open */
  isOpen: boolean;
  /** Close the drawer */
  onClose: () => void;
  /** Called when user marks a word as known */
  onMarkKnown: (word: string) => void;
  /** Called when user adds a word to flashcards */
  onAddToFlashcards: (word: string) => void;
}

/**
 * WordDrawer — slides up from bottom on mobile, appears as a centered
 * modal on desktop. Shows definition, example, and action buttons.
 */
export function WordDrawer({
  token,
  contentText,
  language,
  userId,
  textId,
  isOpen,
  onClose,
  onMarkKnown,
  onAddToFlashcards,
}: WordDrawerProps) {
  const [definition, setDefinition] = useState<WordDefinition | null>(null);
  const [isLoadingDef, setIsLoadingDef] = useState(false);
  const [markedKnown, setMarkedKnown] = useState(false);
  const [savedToFlashcards, setSavedToFlashcards] = useState(false);
  const [decks, setDecks] = useState<
    { id: string; name: string; language: string }[]
  >([]);
  const [showDeckPicker, setShowDeckPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const definitionCache = useRef<Map<string, WordDefinition>>(new Map());

  const word = token ? cleanWord(token.word) : "";

  // ─── Fetch definition when a word is selected ─────────────────────

  useEffect(() => {
    if (!word || !isOpen) return;

    // Reset state for new word
    setMarkedKnown(false);
    setSavedToFlashcards(false);
    setShowDeckPicker(false);

    // Check cache
    const cached = definitionCache.current.get(word.toLowerCase());
    if (cached) {
      setDefinition(cached);
      return;
    }

    setIsLoadingDef(true);
    setDefinition(null);

    // Find the sentence containing this word for context
    const sentences = contentText.match(/[^.!?]+[.!?]+/g) || [contentText];
    const contextSentence =
      sentences.find((s) => s.toLowerCase().includes(word.toLowerCase())) || "";

    fetch("/api/reading/define", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        word,
        language,
        context: contextSentence.trim(),
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.definition) {
          definitionCache.current.set(word.toLowerCase(), data);
          setDefinition(data);
        }
      })
      .catch(() => {
        // Fail silently
      })
      .finally(() => setIsLoadingDef(false));
  }, [word, isOpen, language, contentText]);

  // ─── Record lookup interaction ────────────────────────────────────

  useEffect(() => {
    if (!word || !isOpen || !textId) return;

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
  }, [word, isOpen, textId, language]);

  // ─── Example sentence from the text ───────────────────────────────

  const exampleSentence = (() => {
    if (!word) return "";
    const sentences = contentText.match(/[^.!?]+[.!?]+/g) || [];
    return (
      sentences
        .find((s) => s.toLowerCase().includes(word.toLowerCase()))
        ?.trim() || ""
    );
  })();

  // ─── Mark as Known ────────────────────────────────────────────────

  const handleMarkKnown = useCallback(() => {
    if (markedKnown || !word) return;
    setMarkedKnown(true);
    onMarkKnown(word);

    fetch("/api/reading/interact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text_id: textId,
        word,
        language,
        action: "marked_known",
      }),
    }).catch(() => {});

    // Close after a brief delay
    setTimeout(onClose, 600);
  }, [word, markedKnown, onMarkKnown, textId, language, onClose]);

  // ─── Add to Flashcards ────────────────────────────────────────────

  const handleShowDeckPicker = useCallback(async () => {
    if (savedToFlashcards) return;
    if (decks.length === 0) {
      const userDecks = await fetchUserDecks(userId);
      setDecks(userDecks);
    }
    setShowDeckPicker(true);
  }, [userId, decks.length, savedToFlashcards]);

  const handleSelectDeck = useCallback(
    async (deckId: string) => {
      if (!definition) return;
      setIsSaving(true);
      const result = await captureWordToFlashcard({
        front: word,
        back: definition.definition,
        example_sentence: exampleSentence,
        source: "reading",
        deckId,
        userId,
      });
      setIsSaving(false);
      if (result.success) {
        setSavedToFlashcards(true);
        setShowDeckPicker(false);
        onAddToFlashcards(word);

        fetch("/api/reading/interact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text_id: textId,
            word,
            language,
            action: "added_to_deck",
          }),
        }).catch(() => {});
      }
    },
    [
      word,
      definition,
      exampleSentence,
      userId,
      textId,
      language,
      onAddToFlashcards,
    ],
  );

  // ─── Hear it (TTS for single word) ───────────────────────────────

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

  // ─── Close on background click ────────────────────────────────────

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        onClose();
      }
    },
    [onClose],
  );

  // ─── Close on Escape ─────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !token) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end md:items-center justify-center"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div
        className={cn(
          "absolute inset-0 bg-black/60 backdrop-blur-sm",
          "transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0",
        )}
      />

      {/* Drawer / Modal */}
      <div
        ref={drawerRef}
        className={cn(
          "relative w-full md:max-w-md",
          "bg-[#0d2137] border-t md:border border-white/10",
          "md:rounded-2xl rounded-t-2xl",
          "p-6 space-y-5",
          "transform transition-transform duration-300 ease-out",
          isOpen
            ? "translate-y-0 md:scale-100"
            : "translate-y-full md:scale-95",
          "shadow-[0_-8px_40px_rgba(0,0,0,0.5)]",
        )}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-300 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Drag handle (mobile) */}
        <div className="md:hidden flex justify-center">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Word heading */}
        <div>
          <div className="flex items-baseline gap-2">
            <h2 className="font-display text-3xl text-teal-300 font-semibold">
              {word}
            </h2>
            {definition?.gender && (
              <span className="text-sm text-gray-500 font-body">
                {definition.gender}
              </span>
            )}
          </div>
          {definition?.part_of_speech && (
            <span className="text-xs text-gray-500 font-body italic">
              {definition.part_of_speech}
            </span>
          )}
        </div>

        {/* Definition */}
        <div className="min-h-[28px]">
          {isLoadingDef ? (
            <div className="h-5 w-48 bg-white/[0.06] rounded animate-pulse" />
          ) : definition ? (
            <p className="text-gray-200 font-body text-base">
              {definition.definition}
            </p>
          ) : (
            <p className="text-gray-500 font-body text-sm italic">
              Tap &quot;Hear it&quot; to listen
            </p>
          )}
        </div>

        {/* Example sentence */}
        {exampleSentence && (
          <div className="bg-white/[0.04] rounded-xl p-3 border border-white/5">
            <p className="text-sm text-gray-400 font-body leading-relaxed italic">
              &ldquo;
              {exampleSentence
                .split(new RegExp(`(${word})`, "gi"))
                .map((part, i) =>
                  part.toLowerCase() === word.toLowerCase() ? (
                    <span key={i} className="text-teal-400 font-medium">
                      {part}
                    </span>
                  ) : (
                    <span key={i}>{part}</span>
                  ),
                )}
              &rdquo;
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col md:flex-row gap-2 pt-1">
          {/* Mark as Known */}
          <button
            onClick={handleMarkKnown}
            disabled={markedKnown}
            className={cn(
              "flex items-center justify-center gap-2 w-full md:w-auto py-3 px-5 rounded-xl",
              "font-body text-sm font-medium transition-all duration-300",
              markedKnown
                ? "bg-teal-400/20 text-teal-400"
                : "bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white",
              "border border-white/10",
            )}
          >
            <Check className="w-4 h-4" />
            {markedKnown ? "Marked as Known" : "I know this"}
          </button>

          {/* Add to Flashcards */}
          <div className="relative">
            <button
              onClick={handleShowDeckPicker}
              disabled={savedToFlashcards || isSaving}
              className={cn(
                "flex items-center justify-center gap-2 w-full md:w-auto py-3 px-5 rounded-xl",
                "font-body text-sm font-medium transition-all duration-300",
                savedToFlashcards
                  ? "bg-teal-400/20 text-teal-400"
                  : "bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white",
                "border border-white/10",
                isSaving && "opacity-50 cursor-wait",
              )}
            >
              <BookmarkPlus className="w-4 h-4" />
              {savedToFlashcards
                ? "Added to Flashcards"
                : isSaving
                  ? "Saving..."
                  : "Add to Flashcards"}
            </button>

            {/* Deck picker dropdown */}
            {showDeckPicker && (
              <div
                className={cn(
                  "absolute bottom-full mb-1 left-0 right-0 z-50",
                  "rounded-xl border border-white/10 bg-[#0a1628] shadow-2xl",
                  "max-h-40 overflow-y-auto",
                )}
              >
                {decks.length === 0 ? (
                  <div className="px-3 py-4 text-center">
                    <p className="text-xs text-white/40">No decks yet.</p>
                    <p className="text-xs text-white/30 mt-1">
                      Create a deck in Flashcards first.
                    </p>
                  </div>
                ) : (
                  <div className="py-1">
                    {decks.map((deck) => (
                      <button
                        key={deck.id}
                        onClick={() => handleSelectDeck(deck.id)}
                        className={cn(
                          "w-full text-left px-3 py-2 text-sm text-white/70",
                          "hover:bg-white/5 hover:text-white transition",
                        )}
                      >
                        {deck.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Hear it */}
          <button
            onClick={handleHearIt}
            className={cn(
              "flex items-center justify-center gap-2 w-full md:w-auto py-3 px-5 rounded-xl",
              "font-body text-sm font-medium transition-all duration-300",
              "bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white",
              "border border-white/10",
            )}
          >
            <Volume2 className="w-4 h-4" />
            Hear it
          </button>
        </div>
      </div>
    </div>
  );
}
