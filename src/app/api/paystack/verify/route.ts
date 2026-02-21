import { NextRequest, NextResponse } from "next/server";
import { verifyTransaction } from "@/lib/paystack/utils";
import { createClient } from "@/lib/supabase/server";
import { getTierByPlanCode, type TierSlug } from "@/lib/tiers";

/* =============================================================================
   PAYSTACK VERIFY TRANSACTION API ROUTE
   
   POST /api/paystack/verify
   
   Verifies a Paystack transaction and updates user subscription
============================================================================= */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reference, userId, userEmail } = body;

    console.log("[Paystack Verify] Started", {
      reference,
      passedUserId: userId,
      passedEmail: userEmail,
    });

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

    console.log("[Paystack Verify] Transaction data", {
      status: transactionData.status,
      amount: transactionData.amount,
      hasPlanObject: !!transactionData.plan_object,
      planCode: transactionData.plan_object?.plan_code,
    });

    // Check if payment was successful
    if (transactionData.status !== "success") {
      console.error("[Paystack Verify] Payment not successful", {
        status: transactionData.status,
      });
      return NextResponse.json({
        success: false,
        data: transactionData,
        message: "Payment was not successful",
      });
    }

    // Get the authenticated user - try passed data first, then session
    const supabase = await createClient();
    let authUser = null;

    // If userId and userEmail were passed from callback, use them
    if (userId && userEmail) {
      console.log("[Paystack Verify] Using passed user info");
      authUser = { id: userId, email: userEmail };
    } else {
      // Otherwise, try to get from session
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        console.error("[Paystack Verify] No authenticated user", {
          authError,
          hasUser: !!user,
        });
        return NextResponse.json(
          {
            success: false,
            error: "Authentication required to complete subscription",
          },
          { status: 401 },
        );
      }
      authUser = user;
    }

    // Verify user's email matches the payment email (security check)
    const paymentEmail =
      transactionData.customer?.email || transactionData.metadata?.userEmail;
    if (paymentEmail && authUser.email !== paymentEmail) {
      console.error("[Paystack Verify] Email mismatch", {
        userEmail: authUser.email,
        paymentEmail,
      });
      return NextResponse.json(
        {
          success: false,
          error: "Payment email does not match authenticated user",
        },
        { status: 403 },
      );
    }

    // Update user subscription in database
    const expiresAt = new Date();

    // Calculate expiration based on plan interval
    // Default to monthly if plan_object is missing
    const interval = transactionData.plan_object?.interval || "monthly";
    if (interval === "monthly") {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    } else if (interval === "yearly") {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    }

    console.log("[Paystack Verify] Updating subscription", {
      userId: authUser.id,
      expiresAt: expiresAt.toISOString(),
      interval,
    });

    // Resolve plan code → tier slug
    const resolvedTier: TierSlug =
      getTierByPlanCode(transactionData.plan_object?.plan_code || "") ||
      (transactionData.metadata?.tier as TierSlug) ||
      "diver";

    // Update the user's profile with the resolved tier
    const { error, data: updatedProfile } = await supabase
      .from("profiles")
      .update({
        subscription_tier: resolvedTier,
        subscription_expires_at: expiresAt.toISOString(),
        subscription_started_at: new Date().toISOString(),
        paystack_customer_code: transactionData.customer?.customer_code,
        paystack_subscription_code:
          transactionData.subscription?.subscription_code,
        subscription_status: "active",
        next_payment_date: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", authUser.id)
      .select()
      .single();

    if (error) {
      console.error("[Paystack Verify] Error updating subscription:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to update subscription",
          details: error,
        },
        { status: 500 },
      );
    }

    // Log the successful update for debugging
    console.log("✅ [Paystack Verify] Subscription updated successfully", {
      userId: authUser.id,
      email: authUser.email,
      tier: updatedProfile?.subscription_tier,
      expiresAt: expiresAt.toISOString(),
      startedAt: new Date().toISOString(),
    });

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
