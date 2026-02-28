import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/flashcards/tags - Get all user's tags with card counts
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch tags from flashcard_tags table
    const { data: tags, error: tagsError } = await supabase
      .from("flashcard_tags")
      .select("*")
      .eq("user_id", user.id)
      .order("name");

    if (tagsError) {
      return NextResponse.json({ error: tagsError.message }, { status: 500 });
    }

    // Fetch card counts per tag from flashcards (tags are text[] on flashcards)
    const { data: cards, error: cardsError } = await supabase
      .from("flashcards")
      .select("tags")
      .not("tags", "is", null);

    if (cardsError) {
      return NextResponse.json({ error: cardsError.message }, { status: 500 });
    }

    // Count how many cards use each tag
    const counts: Record<string, number> = {};
    for (const card of cards || []) {
      if (Array.isArray(card.tags)) {
        for (const tag of card.tags) {
          counts[tag] = (counts[tag] || 0) + 1;
        }
      }
    }

    return NextResponse.json({
      tags: tags || [],
      counts,
    });
  } catch (error) {
    console.error("Error in GET /api/flashcards/tags:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/flashcards/tags - Create a new tag
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
    const { name, parent_id } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Tag name is required" },
        { status: 400 },
      );
    }

    const { data: tag, error } = await supabase
      .from("flashcard_tags")
      .insert({
        user_id: user.id,
        name: name.trim().toLowerCase(),
        parent_id: parent_id || null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Tag already exists" },
          { status: 409 },
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ tag });
  } catch (error) {
    console.error("Error in POST /api/flashcards/tags:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/flashcards/tags - Rename a tag globally
 */
export async function PATCH(request: NextRequest) {
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
    const { old_name, new_name } = body;

    if (!old_name || !new_name) {
      return NextResponse.json(
        { error: "old_name and new_name are required" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase.rpc("rename_tag_globally", {
      p_user_id: user.id,
      p_old_name: old_name,
      p_new_name: new_name,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ updated_count: data });
  } catch (error) {
    console.error("Error in PATCH /api/flashcards/tags:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/flashcards/tags - Delete a tag globally
 */
export async function DELETE(request: NextRequest) {
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
    const { tag_name, include_children = false } = body;

    if (!tag_name) {
      return NextResponse.json(
        { error: "tag_name is required" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase.rpc("delete_tag_globally", {
      p_user_id: user.id,
      p_tag_name: tag_name,
      p_include_children: include_children,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ deleted_count: data });
  } catch (error) {
    console.error("Error in DELETE /api/flashcards/tags:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
