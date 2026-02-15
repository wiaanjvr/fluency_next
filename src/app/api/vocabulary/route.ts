import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/vocabulary
 *
 * Fetch vocabulary words from the database.
 *
 * Query Parameters:
 * - language: Language code (fr, de, it) - required
 * - level: CEFR level (A0, A1, A2, B1, B2, C1, C2) - optional
 * - limit: Maximum number of words to return - optional
 * - includeAllocation: Include level allocation data - optional (default: false)
 *
 * Examples:
 * - /api/vocabulary?language=fr
 * - /api/vocabulary?language=fr&level=A1
 * - /api/vocabulary?language=fr&limit=100
 * - /api/vocabulary?language=fr&includeAllocation=true
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const language = searchParams.get("language");
  const level = searchParams.get("level");
  const limit = searchParams.get("limit");
  const includeAllocation = searchParams.get("includeAllocation") === "true";

  if (!language) {
    return NextResponse.json(
      { error: "Language parameter is required" },
      { status: 400 },
    );
  }

  try {
    const supabase = await createClient();

    // Fetch level allocation if requested
    let levelAllocation = null;
    if (includeAllocation) {
      const { data: allocData, error: allocError } = await supabase
        .from("vocabulary_level_allocation")
        .select("level, max_rank")
        .eq("language", language)
        .order("max_rank", { ascending: true });

      if (allocError) {
        console.error("Error fetching level allocation:", allocError);
      } else {
        levelAllocation = allocData?.reduce(
          (acc, item) => {
            acc[item.level] = item.max_rank;
            return acc;
          },
          {} as Record<string, number>,
        );
      }
    }

    // Build vocabulary query
    let query = supabase
      .from("vocabulary")
      .select("word, lemma, part_of_speech, frequency_rank")
      .eq("language", language)
      .order("frequency_rank", { ascending: true });

    // Filter by level if provided
    if (level && levelAllocation) {
      const maxRank = levelAllocation[level];
      if (maxRank) {
        query = query.lte("frequency_rank", maxRank);
      }
    }

    // Apply limit if provided
    if (limit) {
      const limitNum = parseInt(limit, 10);
      if (!isNaN(limitNum) && limitNum > 0) {
        query = query.limit(limitNum);
      }
    }

    const { data: words, error } = await query;

    if (error) {
      console.error("Error fetching vocabulary:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Format response to match the JSON file structure
    const response: any = {
      description: `Common ${language.toUpperCase()} words organized by frequency`,
      words:
        words?.map((w) => ({
          word: w.word,
          rank: w.frequency_rank,
          pos: w.part_of_speech,
          lemma: w.lemma,
        })) || [],
    };

    if (levelAllocation) {
      response.levelAllocation = levelAllocation;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in vocabulary API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
