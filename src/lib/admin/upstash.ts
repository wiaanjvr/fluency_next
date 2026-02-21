/* =============================================================================
   ADMIN LIB — Upstash Redis Usage Fetcher
   
   Fetches usage stats from Upstash Redis REST API /stats endpoint.
   
   Billable units: Commands/day (free: 10K/day), bandwidth
   Free tier: 10K commands/day, 256MB max data, 1 DB
   Env: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
============================================================================= */

import type { ServiceUsage, UsageMetric } from "@/types/admin-costs";

// Free tier limits
const FREE_DAILY_COMMANDS = 10_000;
const FREE_MAX_DATA_MB = 256;
const FREE_MONTHLY_BANDWIDTH_GB = 1;

// Pay-as-you-go pricing
const PRICE_PER_100K_COMMANDS = 0.2; // $0.2 per 100K commands

function fmt(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}

export async function fetchUpstashUsage(): Promise<ServiceUsage> {
  const restUrl = process.env.UPSTASH_REDIS_REST_URL;
  const restToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!restUrl || !restToken) {
    return {
      service: "Upstash Redis",
      icon: "🔴",
      metrics: [],
      error: "UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not set",
    };
  }

  try {
    // Fetch stats from Upstash REST endpoint
    // The /stats endpoint returns daily command counts
    const statsRes = await fetch(`${restUrl}/stats`, {
      headers: { Authorization: `Bearer ${restToken}` },
      signal: AbortSignal.timeout(10_000),
    });

    // Also fetch INFO for memory stats
    const infoRes = await fetch(`${restUrl}/INFO`, {
      headers: { Authorization: `Bearer ${restToken}` },
      signal: AbortSignal.timeout(10_000),
    });

    const metrics: UsageMetric[] = [];

    if (statsRes.ok) {
      const statsData = await statsRes.json();

      // Stats response format: { result: [ { ... daily stats ... } ] }
      // or it could be { result: "OK" } with stats embedded
      if (statsData?.result && Array.isArray(statsData.result)) {
        const dailyStats = statsData.result;

        // Today's commands
        const todayStats = dailyStats[0];
        const todayCommands =
          typeof todayStats === "object"
            ? todayStats.read_cmd + todayStats.write_cmd
            : 0;

        // Monthly total (sum all available days)
        const monthlyCommands = dailyStats.reduce(
          (sum: number, day: any) =>
            sum +
            (typeof day === "object"
              ? (day.read_cmd || 0) + (day.write_cmd || 0)
              : 0),
          0,
        );

        const dailyRatio = todayCommands / FREE_DAILY_COMMANDS;

        // Days elapsed
        const now = new Date();
        const daysElapsed = Math.max(1, now.getDate());
        const daysInMonth = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0,
        ).getDate();
        const dailyAvg =
          monthlyCommands / Math.min(daysElapsed, dailyStats.length || 1);
        const projectedMonthly = dailyAvg * daysInMonth;

        // Cost: pay-as-you-go after free tier
        const dailyOverage = Math.max(0, dailyAvg - FREE_DAILY_COMMANDS);
        const monthlyOverageCommands = dailyOverage * daysInMonth;
        const estimatedCost =
          (monthlyOverageCommands / 100_000) * PRICE_PER_100K_COMMANDS;

        metrics.push(
          {
            label: "Commands Today",
            current: todayCommands,
            limit: FREE_DAILY_COMMANDS,
            unit: "commands",
            currentFormatted: fmt(todayCommands),
            limitFormatted: fmt(FREE_DAILY_COMMANDS),
            ratio: dailyRatio,
            estimatedMonthlyCostUSD: 0,
          },
          {
            label: "Commands This Month",
            current: monthlyCommands,
            limit: FREE_DAILY_COMMANDS * daysInMonth,
            unit: "commands",
            currentFormatted: fmt(monthlyCommands),
            limitFormatted: fmt(FREE_DAILY_COMMANDS * daysInMonth),
            ratio: monthlyCommands / (FREE_DAILY_COMMANDS * daysInMonth),
            estimatedMonthlyCostUSD: estimatedCost,
          },
          {
            label: "Projected Monthly Commands",
            current: projectedMonthly,
            limit: null,
            unit: "commands",
            currentFormatted: fmt(projectedMonthly),
            limitFormatted: null,
            ratio: null,
            estimatedMonthlyCostUSD: estimatedCost,
          },
        );
      }
    }

    // Parse INFO response for memory usage
    if (infoRes.ok) {
      const infoData = await infoRes.json();
      const infoStr =
        typeof infoData?.result === "string" ? infoData.result : "";

      const usedMemMatch = infoStr.match(/used_memory:(\d+)/);
      const usedMemMB = usedMemMatch
        ? parseInt(usedMemMatch[1]) / (1024 * 1024)
        : 0;

      if (usedMemMB > 0) {
        metrics.push({
          label: "Memory Used",
          current: usedMemMB,
          limit: FREE_MAX_DATA_MB,
          unit: "MB",
          currentFormatted: `${usedMemMB.toFixed(1)} MB`,
          limitFormatted: `${FREE_MAX_DATA_MB} MB`,
          ratio: usedMemMB / FREE_MAX_DATA_MB,
          estimatedMonthlyCostUSD: 0,
        });
      }
    }

    // If we didn't get stats, try a simpler approach — DBSIZE command
    if (metrics.length === 0) {
      const dbsizeRes = await fetch(`${restUrl}/DBSIZE`, {
        headers: { Authorization: `Bearer ${restToken}` },
        signal: AbortSignal.timeout(5_000),
      });

      if (dbsizeRes.ok) {
        const dbsizeData = await dbsizeRes.json();
        const keyCount =
          typeof dbsizeData?.result === "number" ? dbsizeData.result : 0;

        metrics.push({
          label: "Total Keys",
          current: keyCount,
          limit: null,
          unit: "keys",
          currentFormatted: fmt(keyCount),
          limitFormatted: null,
          ratio: null,
          estimatedMonthlyCostUSD: 0,
        });
      }
    }

    return { service: "Upstash Redis", icon: "🔴", metrics };
  } catch (err) {
    return {
      service: "Upstash Redis",
      icon: "🔴",
      metrics: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
