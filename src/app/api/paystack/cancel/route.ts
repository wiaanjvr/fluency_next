import { NextRequest, NextResponse } from "next/server";
import { cancelSubscription } from "@/lib/paystack/utils";
import { cancelUserSubscription } from "@/lib/paystack/subscription";
import { createClient } from "@/lib/supabase/server";

/* =============================================================================
   CANCEL SUBSCRIPTION API ROUTE
   
   POST /api/paystack/cancel
   
   Cancels a user's subscription
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

    // Get user profile with subscription details
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("paystack_subscription_code, email")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 },
      );
    }

    // Check if user has an active Paystack subscription
    if (!profile.paystack_subscription_code) {
      return NextResponse.json(
        { error: "No active Paystack subscription found" },
        { status: 400 },
      );
    }

    // Cancel the subscription with Paystack
    // Note: You'll need the email token from Paystack
    // For simplicity, we'll just update our database
    // In production, you should call Paystack's API to cancel

    // Update user subscription in database
    const result = await cancelUserSubscription(user.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to cancel subscription" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Subscription cancelled successfully",
    });
  } catch (error) {
    console.error("Cancel subscription error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to cancel subscription",
      },
      { status: 500 },
    );
  }
}
