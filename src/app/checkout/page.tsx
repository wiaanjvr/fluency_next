import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CheckoutClient from "./checkout-client";
import {
  TIERS,
  type TierSlug,
  getAnnualPlanCode,
  getPlanCode,
} from "@/lib/tiers";

/* =============================================================================
   CHECKOUT PAGE - Server Component with Authentication
   
   This page ensures the user is authenticated before showing checkout.
   Accepts ?tier=diver|submariner&currency=ZAR|USD|... query params.
============================================================================= */

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ tier?: string; currency?: string; billing?: string }>;
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
    const returnUrl = `/checkout${params.tier || params.currency ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : ""}`;
    redirect(`/auth/signup?redirect=${encodeURIComponent(returnUrl)}`);
  }

  // Ensure user profile exists (handle race condition with trigger)
  // Try to get profile with a few retries to handle trigger delay
  let profile = null;
  let retries = 3;

  while (retries > 0 && !profile) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, payment_provider, country_code, currency_code")
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
  // Resolve tier: accept "tier" param, fall back to "billing" for legacy links
  let tierSlug: TierSlug = "diver";
  if (params.tier === "submariner") {
    tierSlug = "submariner";
  } else if (params.tier === "diver") {
    tierSlug = "diver";
  } else if (params.billing === "yearly") {
    // Legacy: yearly billing → submariner
    tierSlug = "submariner";
  }

  // Resolve payment provider: prefer stored value, otherwise infer from currency param
  // (new users may not have payment_provider stamped yet if they arrived before
  //  the LocationContext hook ran and wrote to their profile)
  const storedProvider = profile?.payment_provider as
    | "paystack"
    | "lemonsqueezy"
    | null
    | undefined;
  const inferredProvider =
    storedProvider ??
    (params.currency && params.currency !== "ZAR"
      ? "lemonsqueezy"
      : "paystack");

  // Route international users (Lemon Squeezy) away from this Paystack flow
  if (inferredProvider === "lemonsqueezy") {
    const lsUrls: Record<string, string | undefined> = {
      diver: process.env.NEXT_PUBLIC_LEMON_SQUEEZY_DIVER_URL,
      submariner: process.env.NEXT_PUBLIC_LEMON_SQUEEZY_SUBMARINER_URL,
    };
    const baseUrl = lsUrls[tierSlug];
    if (baseUrl) {
      const lsUrl = new URL(baseUrl);
      lsUrl.searchParams.set("checkout[email]", user.email!);
      lsUrl.searchParams.set("checkout[custom][tier]", tierSlug);
      if (isAnnual)
        lsUrl.searchParams.set("checkout[custom][billing]", "annual");
      redirect(lsUrl.toString());
    }
    // No LS URL configured — fall through to Paystack as a last resort
  }

  const isAnnual = params.billing === "annual";
  const tierConfig = TIERS[tierSlug];
  // SA users always pay in ZAR; the currency param is only a display preference
  const currency = params.currency || profile?.currency_code || "ZAR";
  // By this point the user is a Paystack (SA) customer
  const paymentProvider: "paystack" | "lemonsqueezy" = "paystack";

  const priceZAR =
    isAnnual && tierConfig.annualPriceZAR
      ? tierConfig.annualPriceZAR
      : tierConfig.priceZAR;
  const priceKobo =
    isAnnual && tierConfig.annualPriceKobo
      ? tierConfig.annualPriceKobo
      : tierConfig.priceKobo;
  const planCode = isAnnual
    ? getAnnualPlanCode(tierSlug)
    : getPlanCode(tierSlug);

  return (
    <CheckoutClient
      userEmail={user.email}
      tierSlug={tierSlug}
      tierDisplayName={tierConfig.displayName}
      priceZAR={priceZAR}
      priceKobo={priceKobo}
      planCode={planCode}
      isAnnual={isAnnual}
      featureList={tierConfig.featureList}
      currency={currency}
      paymentProvider={paymentProvider}
    />
  );
}
