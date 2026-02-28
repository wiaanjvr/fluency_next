import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/verify-auth";

// ─── Language display names ─────────────────────────────────────────────────

const LANGUAGE_DISPLAY: Record<string, string> = {
  fr: "French",
  de: "German",
  it: "Italian",
  es: "Spanish",
};

// ─── POST /api/reading/add-flashcard ────────────────────────────────────────
// Add a word from reading to the user's flashcard deck + vocabulary tables

export async function POST(request: NextRequest) {
  const auth = await verifyAuth();
  if (auth instanceof NextResponse) return auth;
  const { user, supabase } = auth;

  let body: {
    word?: string;
    definition?: string;
    language?: string;
    exampleSentence?: string;
    textId?: string;
    deckId?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { word, definition, language, exampleSentence, textId, deckId } = body;
  if (!word || !definition || !language) {
    return NextResponse.json(
      { error: "word, definition, and language are required" },
      { status: 400 },
    );
  }

  const lowerWord = word.toLowerCase();

  try {
    // 1. Find or create the target deck
    let deck: { id: string } | null = null;

    // If caller supplied a specific deck, verify it belongs to this user
    if (deckId) {
      const { data: selectedDeck } = await supabase
        .from("decks")
        .select("id")
        .eq("id", deckId)
        .eq("user_id", user.id)
        .single();
      if (selectedDeck) deck = selectedDeck;
    }

    // Fall back to the default "Free Reading — {Language}" deck
    if (!deck) {
      const langName = LANGUAGE_DISPLAY[language] || language;
      const deckName = `Free Reading — ${langName}`;

      const { data: existing } = await supabase
        .from("decks")
        .select("id")
        .eq("user_id", user.id)
        .eq("name", deckName)
        .single();

      if (existing) {
        deck = existing;
      } else {
        const { data: newDeck, error: deckError } = await supabase
          .from("decks")
          .insert({
            user_id: user.id,
            name: deckName,
            language,
          })
          .select("id")
          .single();

        if (deckError || !newDeck) {
          return NextResponse.json(
            { error: "Failed to create deck" },
            { status: 500 },
          );
        }
        deck = newDeck;
      }
    }

    // 2. Check the card doesn't already exist in this deck
    const { data: existing } = await supabase
      .from("flashcards")
      .select("id")
      .eq("user_id", user.id)
      .eq("deck_id", deck.id)
      .eq("front", lowerWord)
      .single();

    if (existing) {
      return NextResponse.json({ already_exists: true, success: true });
    }

    // 3. Create the flashcard
    const { data: card, error: cardError } = await supabase
      .from("flashcards")
      .insert({
        user_id: user.id,
        deck_id: deck.id,
        front: lowerWord,
        back: definition,
        language,
        source: "reading",
        tags: ["free-reading"],
        grammar_notes: exampleSentence ? `Example: ${exampleSentence}` : null,
      })
      .select("id")
      .single();

    if (cardError || !card) {
      return NextResponse.json(
        { error: "Failed to create flashcard" },
        { status: 500 },
      );
    }

    // 4. Create initial FSRS schedule for the card
    await supabase.from("card_schedules").insert({
      user_id: user.id,
      card_id: card.id,
      state: "new",
      due: new Date().toISOString(),
      stability: 0,
      difficulty: 0,
      reps: 0,
      lapses: 0,
    });

    // 5. Log the interaction
    if (textId) {
      await supabase.from("reading_word_interactions").insert({
        user_id: user.id,
        text_id: textId,
        word: lowerWord,
        language,
        action: "added_to_deck",
      });
    }

    // 6. Upsert into vocabulary tables as 'learning'
    await supabase.from("learner_words_v2").upsert(
      {
        user_id: user.id,
        word: lowerWord,
        lemma: lowerWord,
        translation: definition,
        language,
        status: "introduced",
        correct_streak: 0,
        total_reviews: 0,
        total_correct: 0,
      },
      { onConflict: "user_id,lemma", ignoreDuplicates: true },
    );

    await supabase.from("user_words").upsert(
      {
        user_id: user.id,
        word: lowerWord,
        lemma: lowerWord,
        language,
        status: "learning",
        rating: 0,
        ease_factor: 2.5,
        interval: 0,
        repetitions: 0,
      },
      { onConflict: "user_id,word,language", ignoreDuplicates: true },
    );

    return NextResponse.json({ success: true, card_id: card.id });
  } catch (err) {
    console.error("Add flashcard error:", err);
    return NextResponse.json(
      { error: "Failed to add flashcard" },
      { status: 500 },
    );
  }
}
