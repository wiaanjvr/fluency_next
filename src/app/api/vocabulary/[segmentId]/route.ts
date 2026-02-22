import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ segmentId: string }> },
) {
  try {
    const { segmentId } = await params;
    const supabase = await createClient();

    // First try to get from vocabulary_exercises table
    const { data: exercises, error: exercisesError } = await supabase
      .from("vocabulary_exercises")
      .select("*")
      .eq("segment_id", segmentId);

    if (!exercisesError && exercises && exercises.length > 0) {
      return NextResponse.json(exercises);
    }

    // Fallback: get from content_segments vocabulary_exercises JSONB column
    const { data: segment, error: segmentError } = await supabase
      .from("content_segments")
      .select("vocabulary_exercises")
      .eq("id", segmentId)
      .single();

    if (segmentError || !segment) {
      return NextResponse.json(
        { error: "Vocabulary not found for this segment" },
        { status: 404 },
      );
    }

    const vocabularyExercises = segment.vocabulary_exercises || [];

    if (vocabularyExercises.length === 0) {
      return NextResponse.json(
        { error: "No vocabulary exercises for this segment" },
        { status: 404 },
      );
    }

    return NextResponse.json(vocabularyExercises);
  } catch (error) {
    console.error("Error fetching vocabulary exercises:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
