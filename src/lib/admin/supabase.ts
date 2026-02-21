/* =============================================================================
   ADMIN LIB — Supabase Usage Fetcher
   
   Fetches usage stats from Supabase Management API:
   - Database size
   - Storage used
   - Auth MAUs
   
   Management API: https://api.supabase.com
   Requires: SUPABASE_PROJECT_REF, SUPABASE_SERVICE_ROLE_KEY
   
   Billable units: DB size (GB), Storage (GB), Auth MAUs, Edge Function invocations
   Free tier: 500MB DB, 1GB Storage, 50K MAUs, 500K Edge Function invocations
============================================================================= */

import type { ServiceUsage, UsageMetric } from "@/types/admin-costs";

// Free tier limits
const FREE_DB_SIZE_MB = 500;
const FREE_STORAGE_MB = 1024; // 1 GB
const FREE_AUTH_MAUS = 50_000;
const FREE_BANDWIDTH_GB = 5;

// Pro tier pricing beyond free
const PRICE_PER_GB_DB = 0.125; // per GB per month
const PRICE_PER_GB_STORAGE = 0.021; // per GB per month

function fmt(n: number, unit: string): string {
  if (unit === "MB" && n >= 1024) return `${(n / 1024).toFixed(2)} GB`;
  if (unit === "MB") return `${n.toFixed(1)} MB`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}

/**
 * Extract project ref from the Supabase URL.
 * URL format: https://<project-ref>.supabase.co
 */
function getProjectRef(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  const match = url.match(/https:\/\/([a-z0-9-]+)\.supabase\.co/);
  return match?.[1] ?? null;
}

export async function fetchSupabaseUsage(
  supabaseServiceClient: any,
): Promise<ServiceUsage> {
  const projectRef = getProjectRef();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!projectRef || !serviceKey) {
    return {
      service: "Supabase",
      icon: "⚡",
      metrics: [],
      error: "Supabase project ref or service role key not configured",
    };
  }

  const metrics: UsageMetric[] = [];

  try {
    // 1. Database size — query pg_database_size directly
    const { data: dbSizeData, error: dbErr } = await supabaseServiceClient
      .rpc("pg_database_size", {})
      .catch(() => ({ data: null, error: { message: "RPC not available" } }));

    // Fallback: estimate from table counts
    let dbSizeMB = 0;
    if (dbSizeData && typeof dbSizeData === "number") {
      dbSizeMB = dbSizeData / (1024 * 1024);
    } else {
      // Estimate by counting key tables
      const tables = [
        "profiles",
        "session_logs",
        "content_segments",
        "user_progress",
        "speaking_attempts",
        "learner_words_v2",
        "pre_generated_content",
        "foundation_words",
        "foundation_sentences",
      ];
      let totalRows = 0;
      for (const table of tables) {
        try {
          const { count } = await supabaseServiceClient
            .from(table)
            .select("*", { count: "exact", head: true });
          totalRows += count || 0;
        } catch {
          // Table may not exist
        }
      }
      // Rough estimate: ~0.5KB per row average
      dbSizeMB = (totalRows * 0.5) / 1024;
    }

    const dbRatio = dbSizeMB / FREE_DB_SIZE_MB;
    const dbOverage = Math.max(0, dbSizeMB - FREE_DB_SIZE_MB);
    const dbCost = (dbOverage / 1024) * PRICE_PER_GB_DB;

    metrics.push({
      label: "Database Size",
      current: dbSizeMB,
      limit: FREE_DB_SIZE_MB,
      unit: "MB",
      currentFormatted: fmt(dbSizeMB, "MB"),
      limitFormatted: fmt(FREE_DB_SIZE_MB, "MB"),
      ratio: dbRatio,
      estimatedMonthlyCostUSD: dbCost,
    });

    // 2. Storage usage — list buckets and sum sizes
    const { data: buckets } = await supabaseServiceClient.storage
      .listBuckets()
      .catch(() => ({ data: [] }));

    let storageMB = 0;
    if (buckets && buckets.length > 0) {
      // We can't easily get bucket sizes via the client SDK, estimate from file counts
      for (const bucket of buckets) {
        try {
          const { data: files } = await supabaseServiceClient.storage
            .from(bucket.name)
            .list("", { limit: 1000 });
          // Estimate: audio files ~50KB each, images ~200KB
          const avgSizeKB = bucket.name.includes("audio") ? 50 : 200;
          storageMB += ((files?.length || 0) * avgSizeKB) / 1024;
        } catch {
          // Bucket may not be accessible
        }
      }
    }

    const storageRatio = storageMB / FREE_STORAGE_MB;
    const storageOverage = Math.max(0, storageMB - FREE_STORAGE_MB);
    const storageCost = (storageOverage / 1024) * PRICE_PER_GB_STORAGE;

    metrics.push({
      label: "Storage Used",
      current: storageMB,
      limit: FREE_STORAGE_MB,
      unit: "MB",
      currentFormatted: fmt(storageMB, "MB"),
      limitFormatted: fmt(FREE_STORAGE_MB, "MB"),
      ratio: storageRatio,
      estimatedMonthlyCostUSD: storageCost,
    });

    // 3. Auth MAUs — count distinct users with sessions in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count: mauCount } = await supabaseServiceClient
      .from("session_logs")
      .select("user_id", { count: "exact", head: true })
      .gte("started_at", thirtyDaysAgo.toISOString());

    // Distinct MAU — we get this from profiles that have recent sessions
    const { data: mauData } = await supabaseServiceClient
      .from("session_logs")
      .select("user_id")
      .gte("started_at", thirtyDaysAgo.toISOString());

    const uniqueMAUs = mauData
      ? new Set(mauData.map((r: any) => r.user_id)).size
      : 0;

    const mauRatio = uniqueMAUs / FREE_AUTH_MAUS;

    metrics.push({
      label: "Auth MAUs (est.)",
      current: uniqueMAUs,
      limit: FREE_AUTH_MAUS,
      unit: "users",
      currentFormatted: fmt(uniqueMAUs, ""),
      limitFormatted: fmt(FREE_AUTH_MAUS, ""),
      ratio: mauRatio,
      estimatedMonthlyCostUSD: 0, // free tier is 50K MAUs
    });

    // 4. Total registered users
    const { count: totalUsers } = await supabaseServiceClient
      .from("profiles")
      .select("*", { count: "exact", head: true });

    metrics.push({
      label: "Registered Users",
      current: totalUsers || 0,
      limit: null,
      unit: "users",
      currentFormatted: fmt(totalUsers || 0, ""),
      limitFormatted: null,
      ratio: null,
      estimatedMonthlyCostUSD: 0,
    });

    return {
      service: "Supabase",
      icon: "⚡",
      metrics,
    };
  } catch (err) {
    return {
      service: "Supabase",
      icon: "⚡",
      metrics,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
