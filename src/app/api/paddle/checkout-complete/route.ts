import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/* =============================================================================
   CHECKOUT COMPLETE HANDLER
   
   This API route is called from the client side after a successful Paddle
   checkout. It's used for immediate UI feedback while webhooks handle
   the actual subscription activation.
============================================================================= */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transactionId, customerId, email, status } = body;

    console.log("Checkout complete notification:", {
      transactionId,
      customerId,
      email,
      status,
    });

    // Get the current user from the session
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Optionally, you could store pending upgrade status here
    // The actual subscription activation happens via webhooks
    // This endpoint is mainly for logging and immediate UI feedback

    return NextResponse.json({
      success: true,
      message:
        "Checkout notification received. Subscription will be activated shortly.",
    });
  } catch (error) {
    console.error("Checkout complete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
