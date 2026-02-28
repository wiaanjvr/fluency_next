"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DuplicateMatch } from "@/types/card-editor";

// ── Simple similarity score (Dice coefficient on bigrams) ──────────────────
function bigrams(str: string): Set<string> {
  const s = str.toLowerCase().trim();
  const result = new Set<string>();
  for (let i = 0; i < s.length - 1; i++) {
    result.add(s.slice(i, i + 2));
  }
  return result;
}

function diceCoefficient(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const bigramsA = bigrams(a);
  const bigramsB = bigrams(b);
  let intersection = 0;
  bigramsA.forEach((bg) => {
    if (bigramsB.has(bg)) intersection++;
  });
  return (2 * intersection) / (bigramsA.size + bigramsB.size);
}

// Strip HTML tags for comparison
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

// ── useDuplicateDetection ──────────────────────────────────────────────────
interface UseDuplicateDetectionOptions {
  userId: string;
  /** Content of the first/front field to check */
  frontContent: string;
  /** If editing, exclude this card from matches */
  excludeCardId?: string;
  /** Minimum similarity threshold (0-1) to flag as duplicate */
  threshold?: number;
  /** Debounce delay in ms */
  debounce?: number;
  /** Enable/disable the check */
  enabled?: boolean;
}

interface UseDuplicateDetectionReturn {
  duplicates: DuplicateMatch[];
  checking: boolean;
}

export function useDuplicateDetection({
  userId,
  frontContent,
  excludeCardId,
  threshold = 0.6,
  debounce = 500,
  enabled = true,
}: UseDuplicateDetectionOptions): UseDuplicateDetectionReturn {
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);
  const [checking, setChecking] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const abortController = useRef<AbortController>();

  useEffect(() => {
    if (!enabled || !frontContent || stripHtml(frontContent).length < 2) {
      setDuplicates([]);
      return;
    }

    // Clear previous timer
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      // Cancel previous in-flight request
      if (abortController.current) abortController.current.abort();
      abortController.current = new AbortController();

      setChecking(true);
      try {
        const supabase = createClient();
        const cleanFront = stripHtml(frontContent).toLowerCase();

        // Fetch all user's cards (front and back fields only for efficiency)
        // In a production system with many cards, use a server-side search/trigram index
        const { data: cards } = await supabase
          .from("flashcards")
          .select("id, front, back, deck_id")
          .eq("user_id", userId)
          .limit(2000);

        if (!cards) {
          setDuplicates([]);
          return;
        }

        // Fetch deck names for display
        const deckIds = [...new Set(cards.map((c) => c.deck_id))];
        const { data: decks } = await supabase
          .from("decks")
          .select("id, name")
          .in("id", deckIds);

        const deckMap = new Map(
          (decks || []).map((d) => [d.id, d.name as string]),
        );

        // Score each card against the front content
        const matches: DuplicateMatch[] = [];
        for (const card of cards) {
          if (card.id === excludeCardId) continue;
          const cardFront = stripHtml(card.front).toLowerCase();
          const similarity = diceCoefficient(cleanFront, cardFront);
          if (similarity >= threshold) {
            matches.push({
              id: card.id,
              front: card.front,
              back: card.back,
              deck_name: deckMap.get(card.deck_id) || "Unknown deck",
              similarity,
            });
          }
        }

        // Sort by similarity descending, limit to 5
        matches.sort((a, b) => b.similarity - a.similarity);
        setDuplicates(matches.slice(0, 5));
      } catch {
        // Silently ignore — likely aborted
      } finally {
        setChecking(false);
      }
    }, debounce);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [frontContent, userId, excludeCardId, threshold, debounce, enabled]);

  return { duplicates, checking };
}
