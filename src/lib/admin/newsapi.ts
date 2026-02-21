/* =============================================================================
   ADMIN LIB — NewsAPI Usage Fetcher
   
   Estimates NewsAPI usage from cron schedule.
   
   Billable units: API requests (free dev tier: 100 req/day)
   Env: NEWS_API_KEY
============================================================================= */

import type { ServiceUsage, UsageMetric } from "@/types/admin-costs";

const FREE_DAILY_REQUESTS = 100;

function fmt(n: number): string {
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}

export async function fetchNewsAPIUsage(): Promise<ServiceUsage> {
  const apiKey = process.env.NEWS_API_KEY;

  if (!apiKey) {
    return {
      service: "NewsAPI",
      icon: "📰",
      metrics: [],
      error: "NEWS_API_KEY not configured",
    };
  }

  try {
    // Validate key by making a small request
    const res = await fetch(
      `https://newsapi.org/v2/top-headlines?country=us&pageSize=1&apiKey=${apiKey}`,
      { signal: AbortSignal.timeout(10_000) },
    );

    const data = await res.json();

    if (data.status === "error") {
      throw new Error(data.message || "NewsAPI key invalid");
    }

    // NewsAPI free tier: 100 requests/day, used only by weekly cron
    // Cloze pipeline runs weekly (Sunday 3am UTC) with ~4-6 queries per run
    const weeklyRequests = 6;
    const now = new Date();
    const daysInMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
    ).getDate();
    const weeksInMonth = daysInMonth / 7;
    const monthlyRequests = Math.ceil(weeklyRequests * weeksInMonth);

    const metrics: UsageMetric[] = [
      {
        label: "Est. Weekly Requests",
        current: weeklyRequests,
        limit: FREE_DAILY_REQUESTS * 7,
        unit: "requests",
        currentFormatted: fmt(weeklyRequests),
        limitFormatted: fmt(FREE_DAILY_REQUESTS * 7),
        ratio: weeklyRequests / (FREE_DAILY_REQUESTS * 7),
        estimatedMonthlyCostUSD: 0, // within free tier
      },
      {
        label: "Est. Monthly Requests",
        current: monthlyRequests,
        limit: FREE_DAILY_REQUESTS * daysInMonth,
        unit: "requests",
        currentFormatted: fmt(monthlyRequests),
        limitFormatted: fmt(FREE_DAILY_REQUESTS * daysInMonth),
        ratio: monthlyRequests / (FREE_DAILY_REQUESTS * daysInMonth),
        estimatedMonthlyCostUSD: 0,
      },
      {
        label: "API Key Status",
        current: 1,
        limit: null,
        unit: "",
        currentFormatted: "Active ✓",
        limitFormatted: null,
        ratio: null,
        estimatedMonthlyCostUSD: 0,
      },
    ];

    return { service: "NewsAPI", icon: "📰", metrics };
  } catch (err) {
    return {
      service: "NewsAPI",
      icon: "📰",
      metrics: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
