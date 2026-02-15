import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { UserWord } from "@/types";

/**
 * GET /api/words - Get user's vocabulary words
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const language = searchParams.get("language") || "fr";
    const status = searchParams.get("status");
    const dueOnly = searchParams.get("due") === "true";

    let query = supabase
      .from("user_words")
      .select("*")
      .eq("user_id", user.id)
      .eq("language", language)
      .order("updated_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    if (dueOnly) {
      const now = new Date().toISOString();
      query = query.lte("next_review", now);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching words:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ words: data as UserWord[] });
  } catch (error) {
    console.error("Error in GET /api/words:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
