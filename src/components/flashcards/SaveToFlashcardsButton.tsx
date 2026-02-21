"use client";

import { useState, useEffect } from "react";
import { Plus, Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  captureWordToFlashcard,
  fetchUserDecks,
} from "@/lib/captureToFlashcards";
import type { CardSource } from "@/types/flashcards";

interface SaveToFlashcardsButtonProps {
  userId: string;
  front: string;
  back: string;
  exampleSentence?: string;
  exampleTranslation?: string;
  grammarNotes?: string;
  source: CardSource;
}

export function SaveToFlashcardsButton({
  userId,
  front,
  back,
  exampleSentence,
  exampleTranslation,
  grammarNotes,
  source,
}: SaveToFlashcardsButtonProps) {
  const [decks, setDecks] = useState<
    { id: string; name: string; language: string }[]
  >([]);
  const [showPicker, setShowPicker] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadedDecks, setLoadedDecks] = useState(false);

  const handleOpen = async () => {
    if (saved) return;
    if (!loadedDecks) {
      const userDecks = await fetchUserDecks(userId);
      setDecks(userDecks);
      setLoadedDecks(true);
    }
    setShowPicker(!showPicker);
  };

  const handleSelectDeck = async (deckId: string) => {
    setSaving(true);
    const result = await captureWordToFlashcard({
      front,
      back,
      example_sentence: exampleSentence,
      example_translation: exampleTranslation,
      grammar_notes: grammarNotes,
      source,
      deckId,
      userId,
    });
    setSaving(false);
    if (result.success) {
      setSaved(true);
      setShowPicker(false);
      // Reset after 3 seconds
      setTimeout(() => setSaved(false), 3000);
    }
  };

  if (saved) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-teal-400 animate-in fade-in duration-300">
        <Check className="h-4 w-4" />
        Saved! ✓
      </span>
    );
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={handleOpen}
        disabled={saving}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg",
          "border border-teal-400/30 text-teal-300 text-sm",
          "hover:bg-teal-500/10 transition",
          saving && "opacity-50 cursor-wait",
        )}
      >
        <Plus className="h-3.5 w-3.5" />
        Save to Flashcards
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 transition-transform",
            showPicker && "rotate-180",
          )}
        />
      </button>

      {/* Deck picker dropdown */}
      {showPicker && (
        <div
          className={cn(
            "absolute bottom-full mb-1 left-0 z-50 w-56",
            "rounded-xl border border-white/10 bg-[#0d2137] shadow-2xl",
            "animate-in fade-in slide-in-from-bottom-2 duration-200",
            "max-h-48 overflow-y-auto",
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
                    "flex items-center gap-2",
                  )}
                >
                  <span className="text-base">
                    {deck.language === "de"
                      ? "🇩🇪"
                      : deck.language === "fr"
                        ? "🇫🇷"
                        : deck.language === "it"
                          ? "🇮🇹"
                          : "🌐"}
                  </span>
                  <span className="truncate">{deck.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
