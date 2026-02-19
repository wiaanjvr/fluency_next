/**
 * GET /api/lesson/audio-ready?lessonId=xxx
 *
 * Polling endpoint for clients to check if TTS audio generation is complete.
 * After lesson generation, audio is produced asynchronously via BullMQ.
 * The client polls this endpoint until audio_url is populated.
 *
 * Returns:
 *   { ready: true, audioUrl: "..." }  — audio is available
 *   { ready: false }                  — still processing
 */

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

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

    const lessonId = request.nextUrl.searchParams.get("lessonId");
    if (!lessonId) {
      return NextResponse.json(
        { error: "lessonId query parameter is required" },
        { status: 400 },
      );
    }

    const { data: lesson, error } = await supabase
      .from("lessons")
      .select("audio_url")
      .eq("id", lessonId)
      .eq("user_id", user.id)
      .single();

    if (error || !lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    if (lesson.audio_url) {
      return NextResponse.json({
        ready: true,
        audioUrl: lesson.audio_url,
      });
    }

    return NextResponse.json({ ready: false });
  } catch (error) {
    console.error("Error checking audio readiness:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
