// ==========================================================================
// GET /api/conjugation/verbs — Fetch verbs + forms for a language
// ==========================================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 3600; // Cache for 1 hour

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const language = searchParams.get("language");

    if (!language) {
      return NextResponse.json(
        { error: "language parameter is required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // Build verbs query
    let verbQuery = supabase
      .from("conjugation_verbs")
      .select("*")
      .eq("language", language)
      .order("frequency_rank", { ascending: true });

    // Optional filters
    const verbClass = searchParams.get("verb_class");
    if (verbClass) {
      verbQuery = verbQuery.eq("verb_class", verbClass);
    }

    const tags = searchParams.getAll("tags[]");
    if (tags.length > 0) {
      verbQuery = verbQuery.overlaps("tags", tags);
    }

    const limit = searchParams.get("limit");
    if (limit) {
      verbQuery = verbQuery.limit(parseInt(limit, 10));
    }

    const { data: verbs, error: verbError } = await verbQuery;

    if (verbError) {
      return NextResponse.json({ error: verbError.message }, { status: 500 });
    }

    if (!verbs || verbs.length === 0) {
      return NextResponse.json({ verbs: [], forms: [] });
    }

    // Fetch all forms for the returned verbs
    const verbIds = verbs.map((v) => v.id);
    const { data: forms, error: formError } = await supabase
      .from("conjugation_forms")
      .select("*")
      .in("verb_id", verbIds);

    if (formError) {
      return NextResponse.json({ error: formError.message }, { status: 500 });
    }

    return NextResponse.json({
      verbs: verbs ?? [],
      forms: forms ?? [],
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
