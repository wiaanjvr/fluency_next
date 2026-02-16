import { NextRequest, NextResponse } from "next/server";
import { redirect } from "next/navigation";

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

  // Verify the transaction
  try {
    const verifyResponse = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/paystack/verify`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reference: transactionRef,
        }),
      },
    );

    const result = await verifyResponse.json();

    if (result.success && result.data?.status === "success") {
      // Payment successful - redirect to dashboard
      return NextResponse.redirect(
        new URL(
          "/dashboard?payment=success",
          process.env.NEXT_PUBLIC_SITE_URL!,
        ),
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
