import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/verify-auth";

// ─── POST /api/reading/interact ─────────────────────────────────────────────
// Record word interactions (looked_up, marked_known, added_to_deck)

export async function POST(request: NextRequest) {
  const auth = await verifyAuth();
  if (auth instanceof NextResponse) return auth;
  const { user, supabase } = auth;

  let body: {
    text_id?: string;
    word?: string;
    language?: string;
    action?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { text_id, word, language, action } = body;
  if (!text_id || !word || !language || !action) {
    return NextResponse.json(
      { error: "text_id, word, language, and action are required" },
      { status: 400 },
    );
  }

  const validActions = ["looked_up", "marked_known", "added_to_deck"];
  if (!validActions.includes(action)) {
    return NextResponse.json(
      { error: `action must be one of: ${validActions.join(", ")}` },
      { status: 400 },
    );
  }

  try {
    // Record the interaction
    const { error: interactionError } = await supabase
      .from("reading_word_interactions")
      .insert({
        user_id: user.id,
        text_id,
        word: word.toLowerCase(),
        language,
        action,
      });

    if (interactionError) {
      console.error("Interaction insert error:", interactionError);
      return NextResponse.json(
        { error: "Failed to record interaction" },
        { status: 500 },
      );
    }

    // If marked as known, also upsert into learner_words_v2
    if (action === "marked_known") {
      await supabase.from("learner_words_v2").upsert(
        {
          user_id: user.id,
          word: word.toLowerCase(),
          lemma: word.toLowerCase(),
          translation: "", // Will be filled by user or later lookup
          language,
          status: "mastered",
          correct_streak: 3,
          total_reviews: 1,
          total_correct: 1,
        },
        { onConflict: "user_id,lemma" },
      );

      // Also upsert into user_words for Propel SRS
      await supabase.from("user_words").upsert(
        {
          user_id: user.id,
          word: word.toLowerCase(),
          lemma: word.toLowerCase(),
          language,
          status: "known",
          rating: 4,
          ease_factor: 2.5,
          interval: 30,
          repetitions: 3,
        },
        { onConflict: "user_id,word,language" },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Interaction error:", err);
    return NextResponse.json(
      { error: "Failed to process interaction" },
      { status: 500 },
    );
  }
}
