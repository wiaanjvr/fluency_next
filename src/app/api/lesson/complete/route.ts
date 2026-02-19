/**
 * POST /api/lesson/complete
 *
 * Called when a user completes a lesson. Marks the current lesson as complete
 * and enqueues 3 pre-generation jobs for upcoming lessons so content is ready
 * before the user needs it.
 *
 * Request body:
 *   { lessonId: string, type?: "story" | "word" }
 *
 * Response:
 *   { success: true, queued: number }
 */

import { createClient } from "@/lib/supabase/server";
import { generationQueue, type GenerationJobData } from "@/lib/queue";
import { NextRequest, NextResponse } from "next/server";

/** Number of upcoming lessons to pre-generate after completion */
const LOOKAHEAD = 3;

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
    const { lessonId, type = "story" } = body as {
      lessonId: string;
      type?: "story" | "word";
    };

    if (!lessonId) {
      return NextResponse.json(
        { error: "lessonId is required" },
        { status: 400 },
      );
    }

    // ── Mark current lesson as complete ─────────────────────────────────────

    // For lesson-v2 sessions, update completed_at
    const now = new Date().toISOString();
    await supabase
      .from("lesson_sessions_v2")
      .update({ completed_at: now })
      .eq("user_id", user.id)
      .eq("id", lessonId);

    // For v1 lessons, mark completed
    await supabase
      .from("lessons")
      .update({ completed: true, completed_at: now })
      .eq("user_id", user.id)
      .eq("id", lessonId);

    // ── Get user profile for generation context ─────────────────────────────

    const { data: profile } = await supabase
      .from("profiles")
      .select("target_language")
      .eq("id", user.id)
      .single();

    const targetLanguage = profile?.target_language || "fr";

    // ── Enqueue pre-generation jobs for the next N lessons ──────────────────
    // We generate sequential lesson IDs based on the completed lesson.
    // The worker will check for duplicates before generating.

    let queued = 0;
    const queuePromises: Promise<any>[] = [];

    for (let i = 1; i <= LOOKAHEAD; i++) {
      const nextLessonId = `${lessonId}_next_${i}`;

      // Enqueue story generation
      const storyJobData: GenerationJobData = {
        userId: user.id,
        lessonId: nextLessonId,
        type: "story",
        targetLanguage,
        previousTone: undefined,
        previousInterestIndex: undefined,
      };

      queuePromises.push(
        generationQueue.add("generate-story", storyJobData, {
          jobId: `story_${user.id}_${nextLessonId}`,
        }),
      );
      queued++;

      // Also enqueue word generation for each upcoming lesson
      const wordJobData: GenerationJobData = {
        userId: user.id,
        lessonId: nextLessonId,
        type: "word",
        targetLanguage,
      };

      queuePromises.push(
        generationQueue.add("generate-word", wordJobData, {
          jobId: `word_${user.id}_${nextLessonId}`,
        }),
      );
      queued++;
    }

    // Await all enqueue operations so failures surface in the response
    try {
      await Promise.all(queuePromises);
    } catch (queueError) {
      console.error("Failed to enqueue pre-generation jobs:", queueError);
      // Report partial success — some jobs may have been enqueued
      return NextResponse.json({
        success: true,
        queued: 0,
        warning: "Pre-generation jobs failed to enqueue",
      });
    }

    return NextResponse.json({ success: true, queued });
  } catch (error) {
    console.error("Error in POST /api/lesson/complete:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
