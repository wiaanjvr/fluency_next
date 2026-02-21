import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { CostDashboardData } from "@/types/admin-costs";
import { fetchGeminiUsage } from "@/lib/admin/gemini";
import { fetchSupabaseUsage } from "@/lib/admin/supabase";
import { fetchUpstashUsage } from "@/lib/admin/upstash";
import { fetchPaystackUsage } from "@/lib/admin/paystack";
import { fetchResendUsage } from "@/lib/admin/resend";
import { fetchVercelUsage } from "@/lib/admin/vercel";
import { fetchNewsAPIUsage } from "@/lib/admin/newsapi";
import { fetchUserStats } from "@/lib/admin/users";

/* =============================================================================
   GET /api/admin/costs
   
   Returns real-time usage data from all external services.
   Auth: Supabase session + email must match ADMIN_EMAIL env var.
   Non-admins receive a 404 (route hidden).
============================================================================= */

const getServiceSupabase = () =>
  createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

async function verifyAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail || user.email !== adminEmail) return null;

  return user;
}

export async function GET() {
  const admin = await verifyAdmin();
  if (!admin) {
    // Return 404 to hide route existence from non-admins
    return new NextResponse("Not Found", { status: 404 });
  }

  const serviceSupabase = getServiceSupabase();

  // Fetch all services in parallel — each is independent
  const [
    gemini,
    supabase,
    upstash,
    paystack,
    resend,
    vercel,
    newsapi,
    userStats,
  ] = await Promise.all([
    fetchGeminiUsage(serviceSupabase),
    fetchSupabaseUsage(serviceSupabase),
    fetchUpstashUsage(),
    fetchPaystackUsage(),
    fetchResendUsage(),
    fetchVercelUsage(serviceSupabase),
    fetchNewsAPIUsage(),
    fetchUserStats(serviceSupabase),
  ]);

  const services = [
    gemini,
    supabase,
    upstash,
    paystack,
    resend,
    vercel,
    newsapi,
  ];

  // Sum total estimated monthly cost
  const totalMonthlyCostUSD = services.reduce((total, svc) => {
    const svcCost = svc.metrics.reduce(
      (sum, m) => sum + m.estimatedMonthlyCostUSD,
      0,
    );
    return total + svcCost;
  }, 0);

  const data: CostDashboardData = {
    services,
    userStats,
    totalMonthlyCostUSD,
    fetchedAt: new Date().toISOString(),
  };

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "private, no-cache, no-store",
    },
  });
}
