"use client";

import { useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ScheduledCard, Rating } from "@/types/flashcards";
import { getBuriedUntil } from "@/lib/fsrs";

/**
 * Hook providing card-level actions during a study session:
 * flag, mark, suspend, delete, bury, unbury, edit.
 */
export function useStudyCardActions(userId: string, deckId: string) {
  const supabase = createClient();

  /** Suspend a card (removes from review until manually unsuspended). */
  const suspendCard = useCallback(
    async (card: ScheduledCard) => {
      await supabase
        .from("card_schedules")
        .update({ is_suspended: true })
        .eq("id", card.id);
    },
    [supabase],
  );

  /** Unsuspend a card. */
  const unsuspendCard = useCallback(
    async (scheduleId: string) => {
      await supabase
        .from("card_schedules")
        .update({ is_suspended: false })
        .eq("id", scheduleId);
    },
    [supabase],
  );

  /** Bury a card until tomorrow (excluded from today's session). */
  const buryCard = useCallback(
    async (card: ScheduledCard) => {
      const buriedUntil = getBuriedUntil();
      await supabase
        .from("card_schedules")
        .update({ is_buried: true, buried_until: buriedUntil })
        .eq("id", card.id);
    },
    [supabase],
  );

  /** Bury all sibling cards (same sibling_group) until tomorrow. */
  const burySiblings = useCallback(
    async (card: ScheduledCard, allCards: ScheduledCard[]) => {
      if (!card.flashcards.sibling_group) return;
      const siblingIds = allCards
        .filter(
          (c) =>
            c.card_id !== card.card_id &&
            c.flashcards.sibling_group === card.flashcards.sibling_group,
        )
        .map((c) => c.id);
      if (siblingIds.length === 0) return;
      const buriedUntil = getBuriedUntil();
      await supabase
        .from("card_schedules")
        .update({ is_buried: true, buried_until: buriedUntil })
        .in("id", siblingIds);
    },
    [supabase],
  );

  /** Unbury all buried cards for this deck. */
  const unburyDeckCards = useCallback(async () => {
    // Get card IDs for this deck
    const { data: deckCards } = await supabase
      .from("flashcards")
      .select("id")
      .eq("deck_id", deckId)
      .eq("user_id", userId);
    if (!deckCards?.length) return;
    const cardIds = deckCards.map((c) => c.id);

    await supabase
      .from("card_schedules")
      .update({ is_buried: false, buried_until: null })
      .eq("user_id", userId)
      .eq("is_buried", true)
      .in("card_id", cardIds);
  }, [supabase, deckId, userId]);

  /** Delete a card entirely (flashcard row + cascade). */
  const deleteCard = useCallback(
    async (card: ScheduledCard) => {
      // Delete schedule first then flashcard
      await supabase.from("card_schedules").delete().eq("id", card.id);
      await supabase.from("flashcards").delete().eq("id", card.card_id);
    },
    [supabase],
  );

  /** Flag a card by adding/toggling a "flagged" tag on the flashcard. */
  const flagCard = useCallback(
    async (card: ScheduledCard) => {
      const tags: string[] = card.flashcards.tags ?? [];
      const isFlagged = tags.includes("flagged");
      const newTags = isFlagged
        ? tags.filter((t) => t !== "flagged")
        : [...tags, "flagged"];
      await supabase
        .from("flashcards")
        .update({ tags: newTags })
        .eq("id", card.card_id);
      // Mutate local card object for immediate UI feedback
      card.flashcards.tags = newTags;
      return !isFlagged; // returns new flagged state
    },
    [supabase],
  );

  /** Mark a card by adding/toggling a "marked" tag on the flashcard. */
  const markCard = useCallback(
    async (card: ScheduledCard) => {
      const tags: string[] = card.flashcards.tags ?? [];
      const isMarked = tags.includes("marked");
      const newTags = isMarked
        ? tags.filter((t) => t !== "marked")
        : [...tags, "marked"];
      await supabase
        .from("flashcards")
        .update({ tags: newTags })
        .eq("id", card.card_id);
      card.flashcards.tags = newTags;
      return !isMarked;
    },
    [supabase],
  );

  /** Inline-edit front/back of the current card. */
  const editCard = useCallback(
    async (card: ScheduledCard, updates: { front?: string; back?: string }) => {
      await supabase.from("flashcards").update(updates).eq("id", card.card_id);
      if (updates.front !== undefined) card.flashcards.front = updates.front;
      if (updates.back !== undefined) card.flashcards.back = updates.back;
    },
    [supabase],
  );

  /** Get full scheduling history for the card info overlay. */
  const getCardInfo = useCallback(
    async (card: ScheduledCard) => {
      const { data: reviewLogs } = await supabase
        .from("review_log")
        .select("*")
        .eq("card_id", card.card_id)
        .eq("user_id", userId)
        .order("reviewed_at", { ascending: false })
        .limit(100);

      return {
        schedule: {
          stability: card.stability,
          difficulty: card.difficulty,
          elapsed_days: card.elapsed_days,
          scheduled_days: card.scheduled_days,
          reps: card.reps,
          lapses: card.lapses,
          state: card.state,
          due: card.due,
          last_review: card.last_review,
          is_suspended: card.is_suspended,
          is_leech: card.is_leech,
          is_buried: card.is_buried,
        },
        reviewHistory: reviewLogs ?? [],
        card: {
          id: card.card_id,
          front: card.flashcards.front,
          back: card.flashcards.back,
          tags: card.flashcards.tags ?? [],
          source: card.flashcards.source,
          created_at: card.flashcards.created_at,
        },
      };
    },
    [supabase, userId],
  );

  return {
    suspendCard,
    unsuspendCard,
    buryCard,
    burySiblings,
    unburyDeckCards,
    deleteCard,
    flagCard,
    markCard,
    editCard,
    getCardInfo,
  };
}
