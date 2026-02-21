import { NextRequest, NextResponse } from "next/server";
import { initializeTransaction, generateReference } from "@/lib/paystack/utils";
import { createClient } from "@/lib/supabase/server";
import { type TierSlug, TIERS, getPlanCode } from "@/lib/tiers";

/* =============================================================================
   PAYSTACK INITIALIZE PAYMENT API ROUTE
   
   POST /api/paystack/initialize
   
   Initializes a Paystack transaction for subscription payment
============================================================================= */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, amount, planCode, currency = "ZAR", metadata = {}, tier } = body;

    // Validate required fields
    if (!email || !amount) {
      return NextResponse.json(
        { error: "Email and amount are required" },
        { status: 400 },
      );
    }

    // Resolve tier slug (default to 'diver' for backward compatibility)
    const resolvedTier: TierSlug = (tier as TierSlug) || "diver";

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

    // Verify user exists in database
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.error("User profile not found in database:", profileError);
      return NextResponse.json(
        { error: "User profile not found. Please complete signup." },
        { status: 404 },
      );
    }

    // Add user information to metadata
    const enrichedMetadata = {
      ...metadata,
      userId: user.id,
      userEmail: user.email,
      tier: resolvedTier,
      planCode: planCode || getPlanCode(resolvedTier),
    };

    // Generate unique reference
    const reference = generateReference();

    // Initialize transaction with Paystack
    const response = await initializeTransaction(email, amount, {
      reference,
      currency,
      planCode,
      metadata: enrichedMetadata,
      callbackUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/api/paystack/callback`,
    });

    if (!response.status) {
      return NextResponse.json(
        { error: response.message || "Failed to initialize payment" },
        { status: 500 },
      );
    }

    // Return the authorization URL and reference
    return NextResponse.json({
      authorization_url: response.data.authorization_url,
      access_code: response.data.access_code,
      reference: response.data.reference,
    });
  } catch (error) {
    console.error("Paystack initialization error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to initialize payment",
      },
      { status: 500 },
    );
  }
}
