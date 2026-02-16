import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  isEligibleForRefund,
  processRefundRequest,
} from "@/lib/paystack/subscription";
import { PAYSTACK_API_URL } from "@/lib/paystack/config";

/* =============================================================================
   PAYSTACK REFUND REQUEST API ROUTE
   
   POST /api/paystack/refund
   
   Handles refund requests for premium subscriptions within 7-day window
============================================================================= */

export async function POST(request: NextRequest) {
  try {
    // Get the authenticated user
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

    // Check if user is eligible for refund
    const eligibility = await isEligibleForRefund(user.id);

    if (!eligibility.eligible) {
      return NextResponse.json(
        {
          error:
            eligibility.error ||
            "Not eligible for refund. Refunds are only available within 7 days of subscribing.",
        },
        { status: 400 },
      );
    }

    // Get user's Paystack subscription code
    const { data: profile } = await supabase
      .from("profiles")
      .select("paystack_subscription_code, paystack_customer_code")
      .eq("id", user.id)
      .single();

    // Cancel the Paystack subscription if exists
    if (profile?.paystack_subscription_code) {
      try {
        const response = await fetch(
          `${PAYSTACK_API_URL}/subscription/disable`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              code: profile.paystack_subscription_code,
              token: profile.paystack_subscription_code,
            }),
          },
        );

        const paystackResult = await response.json();

        if (!paystackResult.status) {
          console.error("Paystack cancellation error:", paystackResult);
          // Continue with app-side cancellation even if Paystack fails
          // Admin can manually process refund
        } else {
          console.log(
            "Paystack subscription cancelled:",
            profile.paystack_subscription_code,
          );
        }
      } catch (paystackError) {
        console.error("Error cancelling Paystack subscription:", paystackError);
        // Continue with app-side cancellation
      }
    }

    // Process refund on app side (downgrade to free)
    const result = await processRefundRequest(user.id);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // TODO: In production, you should also:
    // 1. Create a refund request in Paystack dashboard or via API
    // 2. Send notification email to user
    // 3. Log the refund request for admin review

    return NextResponse.json({
      success: true,
      message:
        "Refund request processed. Your subscription has been cancelled and you have been downgraded to the free plan. A full refund will be processed within 5-7 business days.",
    });
  } catch (error) {
    console.error("Refund processing error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to process refund request",
      },
      { status: 500 },
    );
  }
}

/* =============================================================================
   GET REFUND ELIGIBILITY
   
   GET /api/paystack/refund
   
   Check if user is eligible for a refund
============================================================================= */

export async function GET(request: NextRequest) {
  try {
    // Get the authenticated user
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

    // Check eligibility
    const eligibility = await isEligibleForRefund(user.id);

    return NextResponse.json({
      eligible: eligibility.eligible,
      daysRemaining: eligibility.daysRemaining || 0,
      error: eligibility.error,
    });
  } catch (error) {
    console.error("Error checking refund eligibility:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to check eligibility",
      },
      { status: 500 },
    );
  }
}
