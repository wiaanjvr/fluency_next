import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { PAYSTACK_API_URL } from "@/lib/paystack/config";
import { submitDonation } from "@/lib/globalgiving/client";
import type { UserReward, ProcessBillingResult } from "@/types/rewards";

/* =============================================================================
   PROCESS BILLING API ROUTE (CRON)

   POST /api/rewards/process-billing

   Designed to be called by a cron job (e.g. Vercel Cron, GitHub Actions) daily.
   Protected by a CRON_SECRET bearer token.

   For each user with a pending reward whose billing date is today:
   1. Charges (standard_amount - discount_amount) via Paystack charge_authorization
   2. If charity_amount > 0: donates to GlobalGiving
   3. Marks reward as 'applied' or 'failed'
============================================================================= */

const getServiceSupabase = () =>
  createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

/**
 * Charge a user's card via Paystack charge_authorization.
 * Docs: https://paystack.com/docs/api/transaction/#charge-authorization
 */
async function chargeAuthorization(params: {
  authorizationCode: string;
  email: string;
  amount: number; // in cents (kobo for NGN, cents for ZAR)
  reference?: string;
}): Promise<{ success: boolean; reference?: string; error?: string }> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    return { success: false, error: "Paystack secret key not configured" };
  }

  const response = await fetch(
    `${PAYSTACK_API_URL}/transaction/charge_authorization`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        authorization_code: params.authorizationCode,
        email: params.email,
        amount: params.amount,
        currency: "ZAR",
        reference:
          params.reference ||
          `reward_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    console.error(
      `Paystack charge_authorization failed (${response.status}):`,
      text,
    );
    return {
      success: false,
      error: `Paystack error (${response.status}): ${text.slice(0, 200)}`,
    };
  }

  const data = await response.json();
  if (data.status && data.data?.status === "success") {
    return { success: true, reference: data.data.reference };
  }

  return {
    success: false,
    error: data.message || "Charge was not successful",
  };
}

export async function POST(request: Request) {
  try {
    // Verify cron secret to prevent unauthorized calls
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceSupabase = getServiceSupabase();
    const today = new Date();

    // Find all pending rewards
    // We match rewards where the billing date is today.
    // Billing date = user's subscription_expires_at day-of-month
    const { data: pendingRewards, error: fetchError } = await serviceSupabase
      .from("user_rewards")
      .select(
        `
        id, user_id, reward_month, standard_amount,
        discount_amount, charity_amount,
        globalgiving_project_id, globalgiving_project_name, status
      `,
      )
      .eq("status", "pending");

    if (fetchError) {
      console.error("Error fetching pending rewards:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch pending rewards" },
        { status: 500 },
      );
    }

    if (!pendingRewards || pendingRewards.length === 0) {
      return NextResponse.json({
        message: "No pending rewards to process",
        results: [],
      });
    }

    // Fetch profile data for all users with pending rewards
    const userIds = [...new Set(pendingRewards.map((r) => r.user_id))];
    const { data: profiles, error: profilesError } = await serviceSupabase
      .from("profiles")
      .select(
        "id, email, paystack_authorization_code, paystack_email, subscription_amount, subscription_expires_at",
      )
      .in("id", userIds);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      return NextResponse.json(
        { error: "Failed to fetch user profiles" },
        { status: 500 },
      );
    }

    const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);
    const results: ProcessBillingResult[] = [];

    for (const reward of pendingRewards) {
      const profile = profileMap.get(reward.user_id);

      if (!profile) {
        console.error(`Profile not found for user ${reward.user_id}`);
        results.push({
          user_id: reward.user_id,
          status: "failed",
          charge_amount: 0,
          charity_donated: 0,
          error: "Profile not found",
        });
        continue;
      }

      // Check if today is the user's billing date (matching day of month)
      if (profile.subscription_expires_at) {
        const billingDay = new Date(profile.subscription_expires_at).getDate();
        if (today.getDate() !== billingDay) {
          // Not this user's billing day — skip
          continue;
        }
      }

      if (!profile.paystack_authorization_code || !profile.paystack_email) {
        console.error(`Missing Paystack auth info for user ${reward.user_id}`);
        results.push({
          user_id: reward.user_id,
          status: "failed",
          charge_amount: 0,
          charity_donated: 0,
          error: "Missing Paystack authorization_code or email",
        });

        await serviceSupabase
          .from("user_rewards")
          .update({ status: "failed", applied_at: new Date().toISOString() })
          .eq("id", reward.id);

        continue;
      }

      // ── Step 1: Charge the discounted amount ────────────────────────────
      const chargeAmount = reward.standard_amount - reward.discount_amount;

      const chargeResult = await chargeAuthorization({
        authorizationCode: profile.paystack_authorization_code,
        email: profile.paystack_email,
        amount: chargeAmount,
      });

      if (!chargeResult.success) {
        console.error(
          `Charge failed for user ${reward.user_id}:`,
          chargeResult.error,
        );
        results.push({
          user_id: reward.user_id,
          status: "failed",
          charge_amount: chargeAmount,
          charity_donated: 0,
          error: chargeResult.error,
        });

        await serviceSupabase
          .from("user_rewards")
          .update({ status: "failed", applied_at: new Date().toISOString() })
          .eq("id", reward.id);

        continue;
      }

      // ── Step 2: Donate to GlobalGiving if charity_amount > 0 ───────────
      let charityDonated = 0;

      if (reward.charity_amount > 0 && reward.globalgiving_project_id) {
        const globalgivingKey = process.env.GLOBALGIVING_API_KEY;
        if (!globalgivingKey) {
          console.error("GLOBALGIVING_API_KEY not configured");
        } else {
          // Convert ZAR cents to USD dollars for GlobalGiving
          // (Use approximate exchange rate — in production, fetch live rate)
          const zarToUsd = 0.055; // ~R18 = $1 approximate
          const amountUSD = Math.max(
            1,
            Math.round((reward.charity_amount / 100) * zarToUsd * 100) / 100,
          );

          const donationResult = await submitDonation({
            apiKey: globalgivingKey,
            projectId: parseInt(reward.globalgiving_project_id, 10),
            amountUSD,
            donorEmail: profile.paystack_email || profile.email,
          });

          if (donationResult.success) {
            charityDonated = reward.charity_amount;
            console.log(
              `Donated $${amountUSD} to project ${reward.globalgiving_project_id} for user ${reward.user_id}`,
            );
          } else {
            console.error(
              `GlobalGiving donation failed for user ${reward.user_id}:`,
              donationResult.error,
            );
            // We don't fail the whole reward for a charity error —
            // the user still gets their discount.
          }
        }
      }

      // ── Step 3: Mark reward as applied ─────────────────────────────────
      await serviceSupabase
        .from("user_rewards")
        .update({
          status: "applied",
          applied_at: new Date().toISOString(),
        })
        .eq("id", reward.id);

      results.push({
        user_id: reward.user_id,
        status: "applied",
        charge_amount: chargeAmount,
        charity_donated: charityDonated,
      });

      console.log(
        `Reward applied for user ${reward.user_id}: charged ${chargeAmount} cents, donated ${charityDonated} cents`,
      );
    }

    return NextResponse.json({
      message: `Processed ${results.length} reward(s)`,
      results,
    });
  } catch (error) {
    console.error("Process billing error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
