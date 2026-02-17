import { NextRequest, NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/* =============================================================================
   PAYSTACK CALLBACK API ROUTE
   
   GET /api/paystack/callback
   
   Handles redirect after Paystack payment
============================================================================= */

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const reference = searchParams.get("reference");
  const trxref = searchParams.get("trxref");

  // Paystack sends either 'reference' or 'trxref'
  const transactionRef = reference || trxref;

  if (!transactionRef) {
    // Redirect to pricing page with error
    return NextResponse.redirect(
      new URL("/pricing?payment=error", process.env.NEXT_PUBLIC_SITE_URL!),
    );
  }

  // Check if user is authenticated before processing payment
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error("Unauthenticated payment callback attempt", { authError });
    // Redirect to signup - after signup, user will be redirected back to pricing
    // They can then complete payment
    return NextResponse.redirect(
      new URL(
        `/auth/signup?redirect=/pricing`,
        process.env.NEXT_PUBLIC_SITE_URL!,
      ),
    );
  }

  // Verify the transaction - pass user info to ensure subscription is updated
  try {
    console.log("[Paystack Callback] Starting verification", {
      reference: transactionRef,
      userId: user.id,
      email: user.email,
    });

    const verifyResponse = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/paystack/verify`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reference: transactionRef,
          userId: user.id,
          userEmail: user.email,
        }),
      },
    );

    const result = await verifyResponse.json();

    console.log("[Paystack Callback] Verify response", {
      success: result.success,
      paymentStatus: result.data?.status,
      message: result.message,
    });

    if (result.success && result.data?.status === "success") {
      // Payment successful - check if user needs onboarding (placement test)
      const { data: profile } = await supabase
        .from("profiles")
        .select("interests")
        .eq("id", user.id)
        .single();

      const needsOnboarding =
        !profile || !profile.interests || profile.interests.length === 0;

      // If user needs onboarding, redirect to placement test
      // Otherwise, redirect to dashboard
      const redirectPath = needsOnboarding
        ? "/onboarding?payment=success"
        : "/dashboard?payment=success";

      return NextResponse.redirect(
        new URL(redirectPath, process.env.NEXT_PUBLIC_SITE_URL!),
      );
    } else {
      // Payment failed or pending
      return NextResponse.redirect(
        new URL(
          `/pricing?payment=failed&reason=${result.data?.status || "unknown"}`,
          process.env.NEXT_PUBLIC_SITE_URL!,
        ),
      );
    }
  } catch (error) {
    console.error("Callback verification error:", error);
    return NextResponse.redirect(
      new URL("/pricing?payment=error", process.env.NEXT_PUBLIC_SITE_URL!),
    );
  }
}
