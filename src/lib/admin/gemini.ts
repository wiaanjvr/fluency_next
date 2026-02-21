/* =============================================================================
   ADMIN LIB — Gemini (Google AI) Usage Fetcher
   
   Fetches token usage from Google AI Studio.
   The @google/genai SDK doesn't expose billing/usage stats directly,
   so we use the Google AI GenerativeLanguage REST API to pull model metadata.
   
   For projects using the AI Studio free tier, there are RPM/RPD/TPM limits.
   We estimate cost from request volumes logged in our own DB.
   
   Billable units: input tokens + output tokens
   Env: GOOGLE_API_KEY
============================================================================= */

import type { ServiceUsage, UsageMetric } from "@/types/admin-costs";

// Gemini 2.5 Flash Lite pricing (as of 2025 — free tier is generous)
const GEMINI_FREE_RPM = 30;
const GEMINI_FREE_RPD = 1500;
const GEMINI_FREE_TPM = 1_000_000; // 1M tokens per minute
const GEMINI_FREE_INPUT_TOKENS_PER_DAY = 1_500_000_000; // effectively unlimited on free tier
const GEMINI_FREE_OUTPUT_TOKENS_PER_DAY = 1_500_000_000;

// Paid pricing per 1M tokens (prices for gemini-2.5-flash-lite)
const PRICE_PER_1M_INPUT = 0.075; // $0.075 per 1M input tokens
const PRICE_PER_1M_OUTPUT = 0.3; // $0.30 per 1M output tokens

function fmt(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}

/**
 * We can list models to verify API key validity, but for actual usage we
 * need to count from our session/request logs in Supabase since Google
 * doesn't expose a usage-stats endpoint for AI Studio keys.
 *
 * This fetcher:
 * 1. Validates the API key by listing models
 * 2. Queries our Supabase session_logs for Gemini call counts this month
 * 3. Estimates token usage from call counts × average tokens per call
 */
export async function fetchGeminiUsage(
  supabaseServiceClient: any,
): Promise<ServiceUsage> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return {
      service: "Google Gemini AI",
      icon: "🤖",
      metrics: [],
      error: "GOOGLE_API_KEY not configured",
    };
  }

  try {
    // Validate API key by listing models
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      { signal: AbortSignal.timeout(10_000) },
    );

    if (!res.ok) {
      throw new Error(`Gemini API returned ${res.status}: ${res.statusText}`);
    }

    // Count API calls this month from session_logs + direct DB queries
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Count lesson generations (main Gemini consumer)
    const { count: lessonCount } = await supabaseServiceClient
      .from("session_logs")
      .select("*", { count: "exact", head: true })
      .gte("started_at", startOfMonth.toISOString());

    // Count pre_generated_content rows this month (worker Gemini calls)
    const { count: generatedCount } = await supabaseServiceClient
      .from("pre_generated_content")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startOfMonth.toISOString());

    const totalCalls = (lessonCount || 0) + (generatedCount || 0);

    // Estimate tokens: avg ~2K input + ~1K output per call
    const estInputTokens = totalCalls * 2000;
    const estOutputTokens = totalCalls * 1000;
    const totalTokens = estInputTokens + estOutputTokens;

    // Days elapsed this month
    const daysElapsed = Math.max(1, now.getDate());
    const daysInMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
    ).getDate();
    const burnRate = totalCalls / daysElapsed;
    const projectedMonthlyCalls = burnRate * daysInMonth;
    const projectedInputTokens = projectedMonthlyCalls * 2000;
    const projectedOutputTokens = projectedMonthlyCalls * 1000;

    const estimatedMonthlyCost =
      (projectedInputTokens / 1_000_000) * PRICE_PER_1M_INPUT +
      (projectedOutputTokens / 1_000_000) * PRICE_PER_1M_OUTPUT;

    const metrics: UsageMetric[] = [
      {
        label: "API Calls (this month)",
        current: totalCalls,
        limit: GEMINI_FREE_RPD * daysInMonth,
        unit: "calls",
        currentFormatted: fmt(totalCalls),
        limitFormatted: fmt(GEMINI_FREE_RPD * daysInMonth),
        ratio:
          totalCalls / (GEMINI_FREE_RPD * daysInMonth) > 0
            ? totalCalls / (GEMINI_FREE_RPD * daysInMonth)
            : null,
        estimatedMonthlyCostUSD: 0, // calls don't cost directly
      },
      {
        label: "Est. Input Tokens",
        current: estInputTokens,
        limit: null,
        unit: "tokens",
        currentFormatted: fmt(estInputTokens),
        limitFormatted: null,
        ratio: null,
        estimatedMonthlyCostUSD:
          (projectedInputTokens / 1_000_000) * PRICE_PER_1M_INPUT,
      },
      {
        label: "Est. Output Tokens",
        current: estOutputTokens,
        limit: null,
        unit: "tokens",
        currentFormatted: fmt(estOutputTokens),
        limitFormatted: null,
        ratio: null,
        estimatedMonthlyCostUSD:
          (projectedOutputTokens / 1_000_000) * PRICE_PER_1M_OUTPUT,
      },
      {
        label: "Est. Monthly Cost",
        current: estimatedMonthlyCost,
        limit: null,
        unit: "USD",
        currentFormatted: `$${estimatedMonthlyCost.toFixed(2)}`,
        limitFormatted: null,
        ratio: null,
        estimatedMonthlyCostUSD: estimatedMonthlyCost,
      },
    ];

    return { service: "Google Gemini AI", icon: "🤖", metrics };
  } catch (err) {
    return {
      service: "Google Gemini AI",
      icon: "🤖",
      metrics: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
