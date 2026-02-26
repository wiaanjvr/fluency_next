/**
 * GET /api/ambient/video
 *
 * Returns free, legally-streamable video entries for the authenticated
 * user's target language, sourced from the ambient_videos table.
 *
 * Optional query params:
 *   ?category=news|kids|sport|movies|series|culture|learning
 *   ?limit=20 (default 40)
 */

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export interface AmbientVideoRow {
  id: string;
  title: string;
  description: string | null;
  embed_url: string;
  source: string;
  category: string;
  thumbnail_url: string | null;
  duration_hint: string | null;
  is_live: boolean;
  language_code: string;
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch target language from profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("target_language")
      .eq("id", user.id)
      .single();

    const languageCode = (profile?.target_language ?? "fr").toString();
    // Normalise e.g. "fr-FR" → "fr"
    const langPrefix = languageCode.slice(0, 2).toLowerCase();

    // Parse optional query params
    const url = new URL(request.url);
    const categoryFilter = url.searchParams.get("category") ?? null;
    const limit = Math.min(
      parseInt(url.searchParams.get("limit") ?? "500", 10),
      1000,
    );

    // Query
    let query = supabase
      .from("ambient_videos")
      .select(
        "id, title, description, embed_url, source, category, thumbnail_url, duration_hint, is_live, language_code",
      )
      .eq("is_active", true)
      .ilike("language_code", `${langPrefix}%`)
      .order("is_live", { ascending: false }) // live streams first
      .order("category", { ascending: true })
      .limit(limit);

    if (categoryFilter) {
      query = query.eq("category", categoryFilter);
    }

    const { data: videos, error } = await query;

    if (error) {
      console.error("[Ambient/Video] Supabase error:", error);
      return NextResponse.json({ videos: [] });
    }

    return NextResponse.json({ videos: (videos ?? []) as AmbientVideoRow[] });
  } catch (err) {
    console.error("[Ambient/Video] Unexpected error:", err);
    return NextResponse.json({ videos: [] });
  }
}
