import { NextRequest, NextResponse } from "next/server";
import { getUserSubscription } from "@/lib/paystack/subscription";
import { createClient } from "@/lib/supabase/server";

/* =============================================================================
   GET SUBSCRIPTION STATUS API ROUTE
   
   GET /api/paystack/subscription
   
   Returns the current user's subscription status
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

    // Get user subscription
    const result = await getUserSubscription(user.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to fetch subscription" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      subscription: result.data,
    });
  } catch (error) {
    console.error("Get subscription error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch subscription",
      },
      { status: 500 },
    );
  }
}
