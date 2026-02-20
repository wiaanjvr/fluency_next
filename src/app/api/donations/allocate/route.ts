import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { verifyAdminSecret } from "@/lib/auth/verify-admin";
import type { AllocateDonationResponse } from "@/types/ocean-impact";

/* =============================================================================
   ALLOCATE DONATION API ROUTE (ADMIN ONLY)

   POST /api/donations/allocate

   Takes { donation_id } and runs proportional allocation across all users
   who redeemed credits during that donation's period.

   Formula per user:
     user_share = user_credits / total_credits_redeemed
     bottles_allocated = user_share * community_donations.bottles_intercepted
     fields_allocated  = user_share * community_donations.football_fields_swept

   Protected by x-admin-secret header.
============================================================================= */

const getServiceSupabase = () =>
  createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

export async function POST(request: NextRequest) {
  try {
    // ── Verify admin ────────────────────────────────────────────────────
    const adminError = verifyAdminSecret(request);
    if (adminError) return adminError;

    // ── Parse body ──────────────────────────────────────────────────────
    const body = await request.json();
    const donationId = body.donation_id;

    if (!donationId || typeof donationId !== "string") {
      return NextResponse.json(
        { error: "donation_id is required (UUID string)" },
        { status: 400 },
      );
    }

    const serviceSupabase = getServiceSupabase();

    // ── Fetch the donation ──────────────────────────────────────────────
    const { data: donation, error: donationError } = await serviceSupabase
      .from("community_donations")
      .select("*")
      .eq("id", donationId)
      .single();

    if (donationError || !donation) {
      return NextResponse.json(
        { error: "Donation not found" },
        { status: 404 },
      );
    }

    // ── Aggregate credits per user for this period ──────────────────────
    const { data: redemptions, error: redemptionsError } = await serviceSupabase
      .from("credit_redemptions")
      .select("user_id, credits")
      .gte("period_start", donation.period_start)
      .lte("period_end", donation.period_end);

    if (redemptionsError) {
      console.error("Error fetching redemptions:", redemptionsError);
      return NextResponse.json(
        { error: "Failed to fetch credit redemptions" },
        { status: 500 },
      );
    }

    if (!redemptions || redemptions.length === 0) {
      return NextResponse.json(
        { error: "No credit redemptions found for this donation period" },
        { status: 400 },
      );
    }

    // Aggregate credits per user
    const userCreditsMap = new Map<string, number>();
    let totalCredits = 0;

    for (const r of redemptions) {
      const current = userCreditsMap.get(r.user_id) || 0;
      userCreditsMap.set(r.user_id, current + r.credits);
      totalCredits += r.credits;
    }

    if (totalCredits === 0) {
      return NextResponse.json(
        { error: "Total credits redeemed is zero — cannot allocate" },
        { status: 400 },
      );
    }

    // ── Update donation with total credits ──────────────────────────────
    await serviceSupabase
      .from("community_donations")
      .update({ total_credits_redeemed: totalCredits })
      .eq("id", donationId);

    // ── Proportional allocation ─────────────────────────────────────────
    const bottlesTotal = donation.bottles_intercepted;
    const fieldsTotal = donation.football_fields_swept;

    const userImpactRows: Array<{
      user_id: string;
      donation_id: string;
      credits_redeemed: number;
      bottles_allocated: number;
      fields_allocated: number;
      notified_at: null;
    }> = [];

    const profileUpdates: Array<{
      user_id: string;
      bottles: number;
      fields: number;
    }> = [];

    for (const [userId, userCredits] of userCreditsMap.entries()) {
      const userShare = userCredits / totalCredits;
      const bottlesAllocated = userShare * bottlesTotal;
      const fieldsAllocated = userShare * fieldsTotal;

      userImpactRows.push({
        user_id: userId,
        donation_id: donationId,
        credits_redeemed: userCredits,
        bottles_allocated: bottlesAllocated,
        fields_allocated: fieldsAllocated,
        notified_at: null,
      });

      profileUpdates.push({
        user_id: userId,
        bottles: bottlesAllocated,
        fields: fieldsAllocated,
      });
    }

    // ── Insert user_impact rows ─────────────────────────────────────────
    const { error: impactInsertError } = await serviceSupabase
      .from("user_impact")
      .insert(userImpactRows);

    if (impactInsertError) {
      console.error("Error inserting user_impact rows:", impactInsertError);
      return NextResponse.json(
        { error: "Failed to insert user impact records" },
        { status: 500 },
      );
    }

    // ── Update lifetime totals on each profile ──────────────────────────
    let usersUpdated = 0;

    for (const update of profileUpdates) {
      // Fetch current totals
      const { data: profile } = await serviceSupabase
        .from("profiles")
        .select("total_bottles_allocated, total_fields_allocated")
        .eq("id", update.user_id)
        .single();

      if (profile) {
        const { error: profileUpdateError } = await serviceSupabase
          .from("profiles")
          .update({
            total_bottles_allocated:
              (profile.total_bottles_allocated || 0) + update.bottles,
            total_fields_allocated:
              (profile.total_fields_allocated || 0) + update.fields,
          })
          .eq("id", update.user_id);

        if (!profileUpdateError) {
          usersUpdated++;
        } else {
          console.error(
            `Failed to update profile for ${update.user_id}:`,
            profileUpdateError,
          );
        }
      }
    }

    return NextResponse.json<AllocateDonationResponse>({
      users_updated: usersUpdated,
      bottles_intercepted: bottlesTotal,
      football_fields_swept: fieldsTotal,
    });
  } catch (error) {
    console.error("Allocate donation error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
