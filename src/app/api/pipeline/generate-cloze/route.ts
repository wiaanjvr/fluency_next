import { NextRequest, NextResponse } from "next/server";
import { runClozeGenerationPipeline } from "@/lib/cloze/pipeline";
import type { ClozeLanguage } from "@/types/cloze";

const VALID_LANGUAGES = new Set(["de", "fr", "it"]);
const VALID_SOURCES = new Set([
  "wikipedia",
  "gutenberg",
  "newsapi",
  "reddit",
  "tatoeba",
]);

/**
 * POST /api/pipeline/generate-cloze
 *
 * Protected by PIPELINE_SECRET header.
 * Generates cloze items for a target language and stores them in Supabase.
 *
 * Body: { language: 'de' | 'fr' | 'it', source?: string, count?: number }
 *
 * Can also be triggered by Vercel cron (runs for all languages).
 */
export async function POST(request: NextRequest) {
  try {
    // Verify pipeline secret
    const secret = request.headers.get("x-pipeline-secret");
    const isCron =
      request.headers.get("authorization") ===
      `Bearer ${process.env.CRON_SECRET}`;

    if (secret !== process.env.PIPELINE_SECRET && !isCron) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse body
    let body: { language?: string; source?: string; count?: number } = {};
    try {
      body = await request.json();
    } catch {
      // If no body (e.g. cron trigger), run for all languages
      body = {};
    }

    const { source, count = 1000 } = body;

    // Validate source
    if (source && !VALID_SOURCES.has(source)) {
      return NextResponse.json(
        {
          error: `Invalid source: ${source}. Valid: ${Array.from(VALID_SOURCES).join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Validate count
    if (count < 1 || count > 5000) {
      return NextResponse.json(
        { error: "Count must be between 1 and 5000" },
        { status: 400 },
      );
    }

    // If language specified, run for that language only
    if (body.language) {
      if (!VALID_LANGUAGES.has(body.language)) {
        return NextResponse.json(
          {
            error: `Invalid language: ${body.language}. Valid: de, fr, it`,
          },
          { status: 400 },
        );
      }

      const stats = await runClozeGenerationPipeline(
        body.language as ClozeLanguage,
        source,
        count,
      );

      return NextResponse.json({
        success: true,
        language: body.language,
        stats,
      });
    }

    // No language specified → run for all languages (cron mode)
    const allStats: Record<string, unknown> = {};

    for (const lang of ["de", "fr", "it"] as ClozeLanguage[]) {
      console.log(`[cloze-cron] Starting pipeline for ${lang}`);
      try {
        const stats = await runClozeGenerationPipeline(lang, source, count);
        allStats[lang] = stats;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error(`[cloze-cron] Pipeline error for ${lang}:`, msg);
        allStats[lang] = { error: msg };
      }
    }

    return NextResponse.json({
      success: true,
      mode: "all-languages",
      stats: allStats,
    });
  } catch (error) {
    console.error("[POST /api/pipeline/generate-cloze]", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Set max duration for Vercel serverless (pipeline is long-running)
export const maxDuration = 300; // 5 minutes
