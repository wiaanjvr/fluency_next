import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/flashcards/tags/bulk - Bulk tag operations
 * Operations: add, remove, replace
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
    const { operation, card_ids, tags, replace_with } = body;

    if (!operation || !Array.isArray(card_ids) || card_ids.length === 0) {
      return NextResponse.json(
        { error: "operation and card_ids are required" },
        { status: 400 },
      );
    }

    if (!Array.isArray(tags) || tags.length === 0) {
      return NextResponse.json(
        { error: "tags array is required" },
        { status: 400 },
      );
    }

    let updatedCount = 0;

    if (operation === "add") {
      // Add tags to each card (merge with existing)
      for (const cardId of card_ids) {
        const { data: card } = await supabase
          .from("flashcards")
          .select("tags")
          .eq("id", cardId)
          .single();

        const existingTags: string[] = card?.tags || [];
        const newTags = [...new Set([...existingTags, ...tags])];

        const { error } = await supabase
          .from("flashcards")
          .update({ tags: newTags })
          .eq("id", cardId);

        if (!error) updatedCount++;
      }
    } else if (operation === "remove") {
      // Remove specified tags from each card
      for (const cardId of card_ids) {
        const { data: card } = await supabase
          .from("flashcards")
          .select("tags")
          .eq("id", cardId)
          .single();

        const existingTags: string[] = card?.tags || [];
        const newTags = existingTags.filter((t) => !tags.includes(t));

        const { error } = await supabase
          .from("flashcards")
          .update({ tags: newTags })
          .eq("id", cardId);

        if (!error) updatedCount++;
      }
    } else if (operation === "replace") {
      // Replace all tags on each card with the new set
      const replaceTags = replace_with || tags;
      for (const cardId of card_ids) {
        const { error } = await supabase
          .from("flashcards")
          .update({ tags: replaceTags })
          .eq("id", cardId);

        if (!error) updatedCount++;
      }
    } else {
      return NextResponse.json(
        { error: "Invalid operation. Use: add, remove, replace" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      operation,
      updated_count: updatedCount,
      total_cards: card_ids.length,
    });
  } catch (error) {
    console.error("Error in POST /api/flashcards/tags/bulk:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
