import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { ImpactMeResponse } from "@/types/ocean-impact";

/* =============================================================================
   MY IMPACT API ROUTE

   GET /api/impact/me

   Authenticated route. Returns the user's personal and community impact stats.
============================================================================= */

const getServiceSupabase = () =>
  createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

export async function GET() {
  try {
    // ── Authenticate ──────────────────────────────────────────────────────
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const serviceSupabase = getServiceSupabase();

    // ── Personal lifetime totals from profile ─────────────────────────────
    const { data: profile, error: profileError } = await serviceSupabase
      .from("profiles")
      .select("total_bottles_allocated, total_fields_allocated")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
      return NextResponse.json(
        { error: "Failed to fetch profile" },
        { status: 500 },
      );
    }

    // ── Personal this-month stats ─────────────────────────────────────────
    const monthStart = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    )
      .toISOString()
      .split("T")[0];

    const { data: thisMonthImpact, error: monthError } = await serviceSupabase
      .from("user_impact")
      .select("bottles_allocated, fields_allocated, donation_id")
      .eq("user_id", user.id);

    let thisMonthBottles = 0;
    let thisMonthFields = 0;

    if (!monthError && thisMonthImpact) {
      // We need to check which user_impact rows belong to this month
      // by joining against community_donations period_start
      for (const impact of thisMonthImpact) {
        const { data: donation } = await serviceSupabase
          .from("community_donations")
          .select("period_start")
          .eq("id", impact.donation_id)
          .single();

        if (donation && donation.period_start >= monthStart) {
          thisMonthBottles += impact.bottles_allocated;
          thisMonthFields += impact.fields_allocated;
        }
      }
    }

    // ── Community stats from the view ─────────────────────────────────────
    const { data: communityStats, error: communityError } =
      await serviceSupabase
        .from("community_impact_summary")
        .select("*")
        .single();

    if (communityError) {
      console.error("Error fetching community stats:", communityError);
      // Return what we have — community stats are non-critical
    }

    const response: ImpactMeResponse = {
      personal: {
        total_bottles: profile?.total_bottles_allocated || 0,
        total_fields: profile?.total_fields_allocated || 0,
        this_month_bottles: thisMonthBottles,
        this_month_fields: thisMonthFields,
      },
      community: {
        total_bottles: communityStats?.total_bottles || 0,
        total_fields: communityStats?.total_fields || 0,
        this_month_bottles: communityStats?.this_month_bottles || 0,
        this_month_fields: communityStats?.this_month_fields || 0,
        total_donors: communityStats?.total_donors || 0,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Impact me error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
