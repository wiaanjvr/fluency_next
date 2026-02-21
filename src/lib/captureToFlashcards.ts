// ============================================================================
// Capture words from other modes (Cloze, Conjugation, Reading) into Flashcards
// ============================================================================

import { createClient } from "@/lib/supabase/client";
import type { CapturePayload } from "@/types/flashcards";

export async function captureWordToFlashcard({
  front,
  back,
  example_sentence,
  example_translation,
  grammar_notes,
  source,
  deckId,
  userId,
}: CapturePayload): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  // Insert the flashcard
  const { data: card, error: cardError } = await supabase
    .from("flashcards")
    .insert({
      deck_id: deckId,
      user_id: userId,
      front,
      back,
      example_sentence: example_sentence || null,
      example_translation: example_translation || null,
      grammar_notes: grammar_notes || null,
      source,
    })
    .select("id")
    .single();

  if (cardError || !card) {
    return {
      success: false,
      error: cardError?.message || "Failed to create card",
    };
  }

  // Insert initial schedule (new card, due now)
  const { error: scheduleError } = await supabase
    .from("card_schedules")
    .insert({
      user_id: userId,
      card_id: card.id,
      state: "new",
      due: new Date().toISOString(),
    });

  if (scheduleError) {
    return { success: false, error: scheduleError.message };
  }

  return { success: true };
}

// Fetch user's decks for the deck picker dropdown
export async function fetchUserDecks(userId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("decks")
    .select("id, name, language")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return [];
  return data || [];
}
