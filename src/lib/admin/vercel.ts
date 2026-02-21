/* =============================================================================
   ADMIN LIB — Vercel Usage Fetcher
   
   Estimates Vercel usage from the codebase configuration.
   The Vercel REST API requires a personal access token to fetch actual usage.
   
   Billable units: Function invocations, execution time, bandwidth, cron runs
   Free tier (Hobby): 100K fn invocations/month, 100 GB-hrs, 100 GB bandwidth
   Env: VERCEL_TOKEN (optional), VERCEL_PROJECT_ID (optional)
============================================================================= */

import type { ServiceUsage, UsageMetric } from "@/types/admin-costs";

// Free Hobby tier limits
const FREE_FN_INVOCATIONS = 100_000;
const FREE_BANDWIDTH_GB = 100;
const FREE_CRON_INVOCATIONS = 2; // 2 cron jobs on hobby

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}

export async function fetchVercelUsage(
  supabaseServiceClient: any,
): Promise<ServiceUsage> {
  const vercelToken = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;

  const metrics: UsageMetric[] = [];
  const now = new Date();
  const daysElapsed = Math.max(1, now.getDate());
  const daysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
  ).getDate();

  try {
    if (vercelToken && projectId) {
      // Fetch actual usage from Vercel API
      const usageRes = await fetch(
        `https://api.vercel.com/v1/usage?projectId=${projectId}`,
        {
          headers: { Authorization: `Bearer ${vercelToken}` },
          signal: AbortSignal.timeout(10_000),
        },
      );

      if (usageRes.ok) {
        const usage = await usageRes.json();

        if (usage?.usage) {
          const fnInvocations = usage.usage.serverlessFunctionInvocations || 0;
          const bandwidth = usage.usage.bandwidth || 0;

          metrics.push(
            {
              label: "Function Invocations",
              current: fnInvocations,
              limit: FREE_FN_INVOCATIONS,
              unit: "invocations",
              currentFormatted: fmt(fnInvocations),
              limitFormatted: fmt(FREE_FN_INVOCATIONS),
              ratio: fnInvocations / FREE_FN_INVOCATIONS,
              estimatedMonthlyCostUSD: 0,
            },
            {
              label: "Bandwidth",
              current: bandwidth / (1024 * 1024 * 1024),
              limit: FREE_BANDWIDTH_GB,
              unit: "GB",
              currentFormatted: `${(bandwidth / (1024 * 1024 * 1024)).toFixed(2)} GB`,
              limitFormatted: `${FREE_BANDWIDTH_GB} GB`,
              ratio: bandwidth / (1024 * 1024 * 1024) / FREE_BANDWIDTH_GB,
              estimatedMonthlyCostUSD: 0,
            },
          );
        }
      }
    }

    // If no Vercel token, estimate from our API call logs
    if (metrics.length === 0) {
      // Estimate function invocations from session_logs this month
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const { count: sessionCount } = await supabaseServiceClient
        .from("session_logs")
        .select("*", { count: "exact", head: true })
        .gte("started_at", startOfMonth.toISOString());

      // Each session involves ~5-10 API calls (generate, exercises, translate, transcribe, etc.)
      const estInvocations = (sessionCount || 0) * 8;
      const projectedInvocations = (estInvocations / daysElapsed) * daysInMonth;

      metrics.push(
        {
          label: "Est. Function Invocations",
          current: estInvocations,
          limit: FREE_FN_INVOCATIONS,
          unit: "invocations",
          currentFormatted: fmt(estInvocations),
          limitFormatted: fmt(FREE_FN_INVOCATIONS),
          ratio: estInvocations / FREE_FN_INVOCATIONS,
          estimatedMonthlyCostUSD: 0,
        },
        {
          label: "Cron Jobs",
          current: 1,
          limit: FREE_CRON_INVOCATIONS,
          unit: "crons",
          currentFormatted: "1",
          limitFormatted: String(FREE_CRON_INVOCATIONS),
          ratio: 1 / FREE_CRON_INVOCATIONS,
          estimatedMonthlyCostUSD: 0,
        },
      );
    }

    return {
      service: "Vercel Hosting",
      icon: "▲",
      metrics,
    };
  } catch (err) {
    return {
      service: "Vercel Hosting",
      icon: "▲",
      metrics,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
