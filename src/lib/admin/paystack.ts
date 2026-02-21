/* =============================================================================
   ADMIN LIB — Paystack Usage Fetcher
   
   Fetches transaction stats from Paystack API.
   
   Billable units: Transaction fees (1.5% + ₦100 local, 3.9% + $0.30 international)
   Env: PAYSTACK_SECRET_KEY
============================================================================= */

import type { ServiceUsage, UsageMetric } from "@/types/admin-costs";

// Paystack fee structure
const LOCAL_FEE_PERCENT = 1.5;
const INTL_FEE_PERCENT = 3.9;

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}

export async function fetchPaystackUsage(): Promise<ServiceUsage> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;

  if (!secretKey) {
    return {
      service: "Paystack",
      icon: "💳",
      metrics: [],
      error: "PAYSTACK_SECRET_KEY not configured",
    };
  }

  try {
    const headers = {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    };

    // Fetch transactions this month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const from = startOfMonth.toISOString().split("T")[0];
    const to = now.toISOString().split("T")[0];

    const txRes = await fetch(
      `https://api.paystack.co/transaction?from=${from}&to=${to}&perPage=100&status=success`,
      { headers, signal: AbortSignal.timeout(10_000) },
    );

    const metrics: UsageMetric[] = [];

    if (txRes.ok) {
      const txData = await txRes.json();
      const transactions = txData?.data || [];
      const totalCount = txData?.meta?.total || transactions.length;

      // Sum transaction amounts (Paystack amounts are in kobo/cents)
      const totalAmountCents = transactions.reduce(
        (sum: number, tx: any) => sum + (tx.amount || 0),
        0,
      );
      const totalAmountUSD = totalAmountCents / 100;

      // Estimate fees (simplified: assume international rate)
      const estimatedFees =
        totalAmountUSD * (INTL_FEE_PERCENT / 100) + totalCount * 0.3;

      // Days elapsed for projection
      const daysElapsed = Math.max(1, now.getDate());
      const daysInMonth = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
      ).getDate();
      const projectedTransactions = (totalCount / daysElapsed) * daysInMonth;
      const projectedVolume = (totalAmountUSD / daysElapsed) * daysInMonth;
      const projectedFees =
        projectedVolume * (INTL_FEE_PERCENT / 100) +
        projectedTransactions * 0.3;

      metrics.push(
        {
          label: "Transactions (this month)",
          current: totalCount,
          limit: null,
          unit: "transactions",
          currentFormatted: fmt(totalCount),
          limitFormatted: null,
          ratio: null,
          estimatedMonthlyCostUSD: projectedFees,
        },
        {
          label: "Transaction Volume",
          current: totalAmountUSD,
          limit: null,
          unit: "USD",
          currentFormatted: `$${totalAmountUSD.toFixed(2)}`,
          limitFormatted: null,
          ratio: null,
          estimatedMonthlyCostUSD: 0, // revenue, not cost
        },
        {
          label: "Est. Processing Fees",
          current: estimatedFees,
          limit: null,
          unit: "USD",
          currentFormatted: `$${estimatedFees.toFixed(2)}`,
          limitFormatted: null,
          ratio: null,
          estimatedMonthlyCostUSD: projectedFees,
        },
      );
    }

    // Fetch active subscriptions count
    const subRes = await fetch(
      "https://api.paystack.co/subscription?perPage=100&status=active",
      { headers, signal: AbortSignal.timeout(10_000) },
    );

    if (subRes.ok) {
      const subData = await subRes.json();
      const activeSubs = subData?.meta?.total || subData?.data?.length || 0;

      metrics.push({
        label: "Active Subscriptions",
        current: activeSubs,
        limit: null,
        unit: "subscriptions",
        currentFormatted: fmt(activeSubs),
        limitFormatted: null,
        ratio: null,
        estimatedMonthlyCostUSD: 0,
      });
    }

    return { service: "Paystack", icon: "💳", metrics };
  } catch (err) {
    return {
      service: "Paystack",
      icon: "💳",
      metrics: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
