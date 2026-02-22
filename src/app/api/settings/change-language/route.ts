import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { invalidateProfileCache } from "@/lib/profile-cache";
import { invalidateLearnerWordsCache } from "@/lib/learner-words-cache";

const SUPPORTED_LANGUAGES = ["fr", "de", "it", "es", "pt", "nl", "pl", "ru"];

/**
 * POST /api/settings/change-language
 *
 * Switches the user's active target language without erasing progress.
 * Because learner_words_v2 is now tagged with a `language` column and
 * user_words already carries a `language` column, all progress for every
 * language is preserved — users can freely switch between languages.
 *
 * Atomically:
 *   1. Validates the new target language is supported.
 *   2. Updates profiles.target_language in the DB.
 *   3. Invalidates the Redis profile cache and learner-words caches for
 *      both the old and new language so next requests see fresh data.
 *   4. Returns { previousLanguage, newLanguage }.
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
    const { newLanguage } = body as { newLanguage?: string };

    if (!newLanguage || !SUPPORTED_LANGUAGES.includes(newLanguage)) {
      return NextResponse.json(
        { error: `Unsupported language: ${newLanguage}` },
        { status: 400 },
      );
    }

    // ── 1. Fetch current target language ─────────────────────────────────
    const { data: profile, error: profileFetchError } = await supabase
      .from("profiles")
      .select("target_language")
      .eq("id", user.id)
      .single();

    if (profileFetchError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const previousLanguage = profile.target_language ?? "fr";

    if (previousLanguage === newLanguage) {
      return NextResponse.json({
        previousLanguage,
        newLanguage,
        message: "Language unchanged.",
      });
    }

    // ── 2. Update target_language in profiles ─────────────────────────────
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        target_language: newLanguage,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to update profile: ${updateError.message}` },
        { status: 500 },
      );
    }

    // ── 3. Invalidate Redis caches for both languages ─────────────────────
    // learner_words_v2 is now language-tagged, so progress is preserved.
    // We only need to flush cached views so the next request reads fresh data.
    await Promise.allSettled([
      invalidateProfileCache(user.id),
      invalidateLearnerWordsCache(user.id, previousLanguage),
      invalidateLearnerWordsCache(user.id, newLanguage),
    ]);

    // ── 4. Revalidate Next.js cached pages ────────────────────────────────
    revalidatePath("/settings");
    revalidatePath("/dashboard");
    revalidatePath("/learn", "layout");

    return NextResponse.json({
      previousLanguage,
      newLanguage,
      message: `Switched to ${newLanguage}. Your ${previousLanguage} progress has been saved.`,
    });
  } catch (err) {
    console.error("[change-language] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
