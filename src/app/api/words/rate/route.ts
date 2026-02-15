import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { WordRating } from "@/types";
import { calculateNextReview, initializeNewWord } from "@/lib/srs/algorithm";

/**
 * POST /api/words/rate - Rate a word and update SRS data
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { word, lemma, rating, language, story_id, context_sentence } =
      body as {
        word: string;
        lemma: string;
        rating: WordRating;
        language: string;
        story_id?: string;
        context_sentence?: string;
      };

    if (!word || !lemma || rating === undefined || !language) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Get or create the user word
    const { data: existingWord } = await supabase
      .from("user_words")
      .select("*")
      .eq("user_id", user.id)
      .eq("word", word)
      .eq("language", language)
      .single();

    let wordId: string;

    if (existingWord) {
      // Calculate next review using SM-2 algorithm
      const srsUpdate = calculateNextReview(existingWord, rating);

      // Update existing word - map to database column names
      const { data: updatedWord, error: updateError } = await supabase
        .from("user_words")
        .update({
          ease_factor: srsUpdate.ease_factor,
          repetitions: srsUpdate.repetitions,
          interval: srsUpdate.interval,
          next_review: srsUpdate.next_review.toISOString(),
          status: srsUpdate.status,
          rating: rating,
          last_reviewed: new Date().toISOString(),
          last_rated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingWord.id)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating word:", updateError);
        return NextResponse.json(
          { error: updateError.message },
          { status: 500 },
        );
      }

      wordId = existingWord.id;
    } else {
      // Create new word - map to database column names
      const newWordData = initializeNewWord(word, lemma, language);
      const srsUpdate = calculateNextReview(newWordData, rating);

      const { data: createdWord, error: createError } = await supabase
        .from("user_words")
        .insert({
          user_id: user.id,
          word,
          lemma,
          language,
          ease_factor: srsUpdate.ease_factor,
          repetitions: srsUpdate.repetitions,
          interval: srsUpdate.interval,
          next_review: srsUpdate.next_review.toISOString(),
          status: srsUpdate.status,
          rating: rating,
          context_sentence,
          last_reviewed: new Date().toISOString(),
          last_rated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) {
        console.error("Error creating word:", createError);
        return NextResponse.json(
          { error: createError.message },
          { status: 500 },
        );
      }

      wordId = createdWord.id;
    }

    // Record the interaction
    const { error: interactionError } = await supabase
      .from("word_interactions")
      .insert({
        user_id: user.id,
        word_id: wordId,
        story_id,
        rating,
        context_sentence,
      });

    if (interactionError) {
      console.error("Error recording interaction:", interactionError);
      // Don't fail the request if interaction recording fails
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in POST /api/words/rate:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
