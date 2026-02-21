/* =============================================================================
   ADMIN LIB — Resend Usage Fetcher
   
   Fetches email sending stats from Resend API.
   
   Billable units: Emails sent (free: 100/day, 3000/month)
   Env: RESEND_API_KEY
============================================================================= */

import type { ServiceUsage, UsageMetric } from "@/types/admin-costs";

const FREE_DAILY_EMAILS = 100;
const FREE_MONTHLY_EMAILS = 3_000;

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}

export async function fetchResendUsage(): Promise<ServiceUsage> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return {
      service: "Resend Email",
      icon: "📧",
      metrics: [],
      error: "RESEND_API_KEY not configured",
    };
  }

  try {
    // Resend doesn't have a dedicated usage/stats endpoint in their REST API.
    // We list recent emails to estimate usage.
    const res = await fetch("https://api.resend.com/emails?limit=100", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10_000),
    });

    const metrics: UsageMetric[] = [];

    if (res.ok) {
      const data = await res.json();
      const emails = data?.data || [];

      // Count emails sent this month
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      );

      const thisMonth = emails.filter(
        (e: any) => new Date(e.created_at) >= startOfMonth,
      ).length;
      const today = emails.filter(
        (e: any) => new Date(e.created_at) >= startOfDay,
      ).length;

      const daysElapsed = Math.max(1, now.getDate());
      const daysInMonth = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
      ).getDate();
      const projectedMonthly = (thisMonth / daysElapsed) * daysInMonth;

      metrics.push(
        {
          label: "Emails Today",
          current: today,
          limit: FREE_DAILY_EMAILS,
          unit: "emails",
          currentFormatted: fmt(today),
          limitFormatted: fmt(FREE_DAILY_EMAILS),
          ratio: today / FREE_DAILY_EMAILS,
          estimatedMonthlyCostUSD: 0,
        },
        {
          label: "Emails This Month",
          current: thisMonth,
          limit: FREE_MONTHLY_EMAILS,
          unit: "emails",
          currentFormatted: fmt(thisMonth),
          limitFormatted: fmt(FREE_MONTHLY_EMAILS),
          ratio: thisMonth / FREE_MONTHLY_EMAILS,
          estimatedMonthlyCostUSD: 0, // within free tier typically
        },
        {
          label: "Projected Monthly",
          current: projectedMonthly,
          limit: FREE_MONTHLY_EMAILS,
          unit: "emails",
          currentFormatted: fmt(projectedMonthly),
          limitFormatted: fmt(FREE_MONTHLY_EMAILS),
          ratio: projectedMonthly / FREE_MONTHLY_EMAILS,
          estimatedMonthlyCostUSD:
            projectedMonthly > FREE_MONTHLY_EMAILS
              ? ((projectedMonthly - FREE_MONTHLY_EMAILS) / 1000) * 0.3
              : 0,
        },
      );
    } else {
      // API call failed but key exists — report with unknown status
      metrics.push({
        label: "Emails This Month",
        current: 0,
        limit: FREE_MONTHLY_EMAILS,
        unit: "emails",
        currentFormatted: "Unknown",
        limitFormatted: fmt(FREE_MONTHLY_EMAILS),
        ratio: null,
        estimatedMonthlyCostUSD: 0,
      });
    }

    return { service: "Resend Email", icon: "📧", metrics };
  } catch (err) {
    return {
      service: "Resend Email",
      icon: "📧",
      metrics: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
