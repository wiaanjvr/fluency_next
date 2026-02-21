import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import UpgradeClient from "./upgrade-client";
import { TIERS, getTiersAbove, type TierSlug } from "@/lib/tiers";

/* =============================================================================
   UPGRADE PAGE - Server Component
   
   Shown to existing authenticated users who want to change/upgrade their
   subscription from account settings. Different from /checkout which is for
   new sign-ups picking a plan.
   
   Reads the user's current tier from DB and presents all available tiers
   above it, with monthly and annual billing options.
============================================================================= */

export default async function UpgradePage({
  searchParams,
}: {
  searchParams: Promise<{ currency?: string }>;
}) {
  const supabase = await createClient();
  const params = await searchParams;

  // Require authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user || !user.email) {
    redirect(`/auth/login?redirect=${encodeURIComponent("/upgrade")}`);
  }

  // Get user's current subscription tier
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, subscription_tier")
    .eq("id", user.id)
    .single();

  const currentTier = (profile?.subscription_tier as TierSlug) || "snorkeler";

  // Get all tiers the user can upgrade to
  const availableTiers = getTiersAbove(currentTier);

  // If already at the highest tier, redirect back
  if (availableTiers.length === 0) {
    redirect("/settings");
  }

  const currency = params.currency || "ZAR";

  // Build tier data for client
  const tierData = availableTiers.map((slug) => {
    const t = TIERS[slug];
    return {
      slug,
      displayName: t.displayName,
      description: t.description,
      priceZAR: t.priceZAR,
      priceKobo: t.priceKobo,
      annualPriceZAR: t.annualPriceZAR ?? null,
      annualPriceKobo: t.annualPriceKobo ?? null,
      featureList: t.featureList,
      recommended: t.recommended,
    };
  });

  return (
    <UpgradeClient
      userEmail={user.email}
      currentTier={currentTier}
      currentTierDisplayName={TIERS[currentTier].displayName}
      availableTiers={tierData}
      currency={currency}
    />
  );
}
