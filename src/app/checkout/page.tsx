import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CheckoutClient from "./checkout-client";

/* =============================================================================
   CHECKOUT PAGE - Server Component with Authentication
   
   This page ensures the user is authenticated before showing checkout.
   After successful signup/login, users are redirected here instead of
   directly to the pricing page, preventing redirect loops due to
   client-side session timing issues.
============================================================================= */

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ billing?: string; currency?: string }>;
}) {
  const supabase = await createClient();

  // Await searchParams (Next.js 15 requirement)
  const params = await searchParams;

  // Server-side authentication check - session is guaranteed to be available
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  // If not authenticated, redirect to signup with return URL
  if (authError || !user || !user.email) {
    const returnUrl = `/checkout${params.billing || params.currency ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : ""}`;
    redirect(`/auth/signup?redirect=${encodeURIComponent(returnUrl)}`);
  }

  // Ensure user profile exists (handle race condition with trigger)
  // Try to get profile with a few retries to handle trigger delay
  let profile = null;
  let retries = 3;

  while (retries > 0 && !profile) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email")
      .eq("id", user.id)
      .single();

    if (data) {
      profile = data;
      break;
    }

    if (error && retries > 1) {
      // Wait a bit for the trigger to complete
      await new Promise((resolve) => setTimeout(resolve, 500));
      retries--;
    } else if (error && retries === 1) {
      // Last attempt - create profile manually if trigger hasn't run
      console.log("Profile not found after retries, creating manually");
      const { data: newProfile, error: createError } = await supabase
        .from("profiles")
        .insert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || null,
          avatar_url: user.user_metadata?.avatar_url || null,
        })
        .select("id, email")
        .single();

      if (newProfile) {
        profile = newProfile;
      } else {
        console.error("Failed to create profile:", createError);
      }
      break;
    }
  }

  // User is authenticated - show checkout page
  const billing = params.billing || "monthly";
  const currency = params.currency || "USD";

  return (
    <CheckoutClient
      userEmail={user.email}
      billing={billing as "monthly" | "yearly"}
      currency={currency}
    />
  );
}
