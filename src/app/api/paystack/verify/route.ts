import { NextRequest, NextResponse } from "next/server";
import { verifyTransaction } from "@/lib/paystack/utils";
import { createClient } from "@/lib/supabase/server";

/* =============================================================================
   PAYSTACK VERIFY TRANSACTION API ROUTE
   
   POST /api/paystack/verify
   
   Verifies a Paystack transaction and updates user subscription
============================================================================= */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reference } = body;

    if (!reference) {
      return NextResponse.json(
        { error: "Reference is required" },
        { status: 400 },
      );
    }

    // Verify the transaction with Paystack
    const verificationResult = await verifyTransaction(reference);

    if (!verificationResult.status) {
      return NextResponse.json(
        {
          success: false,
          error: verificationResult.message || "Verification failed",
        },
        { status: 400 },
      );
    }

    const transactionData = verificationResult.data;

    // Check if payment was successful
    if (transactionData.status !== "success") {
      return NextResponse.json({
        success: false,
        data: transactionData,
        message: "Payment was not successful",
      });
    }

    // Get the authenticated user (if available)
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Update user subscription in database
    if (user && transactionData.plan_object) {
      const expiresAt = new Date();

      // Calculate expiration based on plan interval
      const interval = transactionData.plan_object.interval;
      if (interval === "monthly") {
        expiresAt.setMonth(expiresAt.getMonth() + 1);
      } else if (interval === "yearly") {
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      }

      // Update the user's profile
      const { error } = await supabase
        .from("profiles")
        .update({
          subscription_tier: "premium",
          subscription_expires_at: expiresAt.toISOString(),
          paystack_customer_code: transactionData.customer?.customer_code,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) {
        console.error("Error updating subscription:", error);
        return NextResponse.json(
          { success: false, error: "Failed to update subscription" },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: transactionData,
      message: "Payment verified successfully",
    });
  } catch (error) {
    console.error("Transaction verification error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Verification failed",
      },
      { status: 500 },
    );
  }
}
