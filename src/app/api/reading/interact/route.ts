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

    // If marked as known, the /api/reading/mark-known route handles the
    // user_words + learner_words_v2 upserts via the KG pipeline.
    // No duplicate writes needed here — just the interaction log above.

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Interaction error:", err);
    return NextResponse.json(
      { error: "Failed to process interaction" },
      { status: 500 },
    );
  }
}
