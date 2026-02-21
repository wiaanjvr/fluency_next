"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type {
  CostDashboardData,
  ServiceUsage,
  UsageMetric,
} from "@/types/admin-costs";

/* =============================================================================
   ADMIN — COST DASHBOARD
   Route: /admin/costs

   Displays real-time usage & cost data for all external services.
   Access: Must be signed in as ADMIN_EMAIL.
   Non-admins see a 404 page — the route's existence is hidden.
============================================================================= */

// Initial exchange rate (public env if present)
const INITIAL_EXCHANGE_RATE = parseFloat(
  process.env.NEXT_PUBLIC_EXCHANGE_RATE || "18.50",
);
const REFRESH_INTERVAL_MS = 60_000; // 60 seconds

// ── Helpers ──────────────────────────────────────────────────────────────────

function progressColor(ratio: number | null): string {
  if (ratio === null) return "bg-gray-300";
  if (ratio < 0.6) return "bg-emerald-500";
  if (ratio < 0.85) return "bg-amber-500";
  return "bg-red-500";
}

function progressBg(ratio: number | null): string {
  if (ratio === null) return "bg-gray-100";
  if (ratio < 0.6) return "bg-emerald-50";
  if (ratio < 0.85) return "bg-amber-50";
  return "bg-red-50";
}

function formatUSD(n: number): string {
  return `$${n.toFixed(2)}`;
}

function formatZAR(n: number, rate: number): string {
  return `R${(n * rate).toFixed(2)}`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return `${Math.floor(diff / 3_600_000)}h ago`;
}

// ── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ ratio }: { ratio: number | null }) {
  if (ratio === null) {
    return (
      <div className="h-2 w-full rounded-full bg-gray-100">
        <div className="h-2 rounded-full bg-gray-300" style={{ width: "0%" }} />
      </div>
    );
  }

  const pct = Math.min(ratio * 100, 100);

  return (
    <div className={`h-2 w-full rounded-full ${progressBg(ratio)}`}>
      <div
        className={`h-2 rounded-full transition-all duration-500 ${progressColor(ratio)}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ── Metric Row ───────────────────────────────────────────────────────────────

function MetricRow({ m, rate }: { m: UsageMetric; rate: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">{m.label}</span>
        <span className="font-mono text-xs text-gray-500">
          {m.currentFormatted}
          {m.limitFormatted ? ` / ${m.limitFormatted}` : ""}
        </span>
      </div>
      <ProgressBar ratio={m.ratio} />
      {m.ratio !== null && (
        <p className="text-right text-xs text-gray-400">
          {(m.ratio * 100).toFixed(1)}% used
        </p>
      )}
      {m.estimatedMonthlyCostUSD > 0 && (
        <p className="text-right text-xs text-gray-500">
          Est. cost: {formatUSD(m.estimatedMonthlyCostUSD)} /{" "}
          {formatZAR(m.estimatedMonthlyCostUSD, rate)}
        </p>
      )}
    </div>
  );
}

// ── Service Card ─────────────────────────────────────────────────────────────

function ServiceCard({ svc, rate }: { svc: ServiceUsage; rate: number }) {
  const totalCost = svc.metrics.reduce(
    (sum, m) => sum + m.estimatedMonthlyCostUSD,
    0,
  );

  if (svc.error) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 opacity-60">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-2xl grayscale">{svc.icon}</span>
          <h3 className="font-semibold text-gray-400">{svc.service}</h3>
        </div>
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          ⚠ {svc.error}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{svc.icon}</span>
          <h3 className="font-semibold text-gray-900">{svc.service}</h3>
        </div>
        {totalCost > 0 && (
          <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
            ~{formatUSD(totalCost)}/mo
          </span>
        )}
      </div>

      <div className="space-y-3">
        {svc.metrics.map((m, i) => (
          <MetricRow key={i} m={m} rate={rate} />
        ))}
      </div>

      {svc.metrics.length === 0 && (
        <p className="text-sm text-gray-400 italic">No metrics available</p>
      )}
    </div>
  );
}

// ── Summary Banner ───────────────────────────────────────────────────────────

function SummaryBanner({
  data,
  rate,
}: {
  data: CostDashboardData;
  rate: number;
}) {
  const monthly = data.totalMonthlyCostUSD;
  const annual = monthly * 12;

  return (
    <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
      <h2 className="mb-4 text-lg font-bold text-gray-900">
        Cost Summary — Projected from current burn
      </h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-500">
            Monthly (USD)
          </p>
          <p className="text-2xl font-bold text-gray-900">
            {formatUSD(monthly)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-500">
            Monthly (ZAR)
          </p>
          <p className="text-2xl font-bold text-gray-900">
            {formatZAR(monthly, rate)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-500">
            Annual (USD)
          </p>
          <p className="text-2xl font-bold text-gray-900">
            {formatUSD(annual)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-500">
            Annual (ZAR)
          </p>
          <p className="text-2xl font-bold text-gray-900">
            {formatZAR(annual, rate)}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── User Stats Bar ───────────────────────────────────────────────────────────

function UserStatsBar({ data }: { data: CostDashboardData }) {
  const { totalUsers, mau, dau } = data.userStats;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
        Active Users
      </h2>
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">{totalUsers}</p>
          <p className="text-xs text-gray-500">Total Registered</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-indigo-600">{mau}</p>
          <p className="text-xs text-gray-500">MAU (30 days)</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-emerald-600">{dau}</p>
          <p className="text-xs text-gray-500">DAU (today)</p>
        </div>
      </div>
    </div>
  );
}

// ── Main Dashboard ───────────────────────────────────────────────────────────

export default function CostDashboard() {
  const [exchangeRate, setExchangeRate] = useState<number>(
    INITIAL_EXCHANGE_RATE,
  );
  const [data, setData] = useState<CostDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/costs", { cache: "no-store" });

      if (res.status === 404) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        throw new Error(`API returned ${res.status}`);
      }

      const json: CostDashboardData = await res.json();
      setData(json);
      setIsAdmin(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, REFRESH_INTERVAL_MS);
    // Fetch server-side exchange rate (prefers NEXT_PUBLIC_EXCHANGE_RATE, falls back to ZAR_TO_USD_RATE in .env.local)
    (async () => {
      try {
        const r = await fetch("/api/admin/exchange-rate", {
          cache: "no-store",
        });
        if (r.ok) {
          const j = await r.json();
          if (j?.rate) setExchangeRate(Number(j.rate));
        }
      } catch (err) {
        // ignore and keep initial rate
      }
    })();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData]);

  // Non-admin: render a genuine 404 page
  if (isAdmin === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-gray-300">404</h1>
          <p className="mt-2 text-gray-500">This page could not be found.</p>
          <a
            href="/dashboard"
            className="mt-4 inline-block text-sm text-blue-600 hover:underline"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-gray-500">Loading cost data…</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-lg font-medium text-red-800">
            Failed to load dashboard
          </p>
          <p className="mt-1 text-sm text-red-600">{error}</p>
          <button
            onClick={fetchData}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              💰 Cost & Usage Dashboard
            </h1>
            <p className="text-sm text-gray-500">
              External service usage monitoring
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">
              Last refreshed: {timeAgo(data.fetchedAt)}
            </span>
            <button
              onClick={fetchData}
              disabled={loading}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              {loading ? "Refreshing…" : "↻ Refresh"}
            </button>
            <a
              href="/admin/donations"
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Donations
            </a>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-7xl space-y-6 p-6">
        {/* Summary Banner */}
        <SummaryBanner data={data} rate={exchangeRate} />

        {/* User Stats */}
        <UserStatsBar data={data} />

        {/* Service Cards Grid */}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {data.services.map((svc) => (
            <ServiceCard key={svc.service} svc={svc} rate={exchangeRate} />
          ))}
        </div>

        {/* Footer info */}
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 text-xs text-gray-400">
          <p>
            Exchange rate: 1 USD = {exchangeRate} ZAR (configure via
            NEXT_PUBLIC_EXCHANGE_RATE in `.env.local` or server-only
            `ZAR_TO_USD_RATE`)
          </p>
          <p>
            Costs are estimates based on current burn rate extrapolated to
            month-end. Actual billing may differ.
          </p>
          <p>Auto-refreshes every 60 seconds.</p>
        </div>
      </main>
    </div>
  );
}
