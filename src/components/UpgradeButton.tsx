"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "@/contexts/LocationContext";
import { usePaymentProvider } from "@/hooks/usePaymentProvider";
import { formatPrice } from "@/utils/pricing";
import { TIERS, type TierSlug } from "@/lib/tiers";

/* =============================================================================
   UPGRADE BUTTON

   Unified payment routing component.
   - Reads payment_provider from the user's profile (or falls back to geo)
   - For Paystack (ZA): redirects to existing /checkout page (Paystack hosted)
   - For Lemon Squeezy (international): redirects to LS checkout with email
   - Shows localised price
============================================================================= */

interface UpgradeButtonProps {
  /** Which tier to purchase */
  tier: TierSlug;
  /** Billing cycle */
  billing?: "monthly" | "annual";
  /** Optional className override */
  className?: string;
  /** Optional children (overrides default label) */
  children?: React.ReactNode;
}

const LEMON_SQUEEZY_URLS: Record<TierSlug, string | undefined> = {
  snorkeler: undefined,
  diver: process.env.NEXT_PUBLIC_LEMON_SQUEEZY_DIVER_URL,
  submariner: process.env.NEXT_PUBLIC_LEMON_SQUEEZY_SUBMARINER_URL,
};

export function UpgradeButton({
  tier,
  billing = "monthly",
  className,
  children,
}: UpgradeButtonProps) {
  const { user } = useAuth();
  const {
    currencyCode,
    paymentProvider: geoProvider,
    loading: geoLoading,
  } = useLocation();
  const { paymentProvider: profileProvider, loading: profileLoading } =
    usePaymentProvider();
  const [initiating, setInitiating] = useState(false);

  const tierConfig = TIERS[tier];
  const loading = geoLoading || profileLoading;

  // Prefer the profile-saved provider; fall back to geo-derived
  const provider = profileProvider || geoProvider;

  const priceZAR =
    billing === "annual" && tierConfig.annualPriceZAR
      ? tierConfig.annualPriceZAR
      : tierConfig.priceZAR;

  const displayPrice = formatPrice(
    priceZAR,
    currencyCode,
    billing === "annual" ? "/year" : "/month",
  );

  /* ---- Paystack: redirect to existing /checkout page ---- */
  const handlePaystack = () => {
    const params = new URLSearchParams({
      tier,
      currency: currencyCode,
    });
    if (billing === "annual" && tierConfig.annualPriceZAR) {
      params.set("billing", "annual");
    }
    window.location.href = `/checkout?${params.toString()}`;
  };

  /* ---- Lemon Squeezy: redirect to hosted checkout ---- */
  const handleLemonSqueezy = () => {
    const baseUrl = LEMON_SQUEEZY_URLS[tier];
    if (!baseUrl) {
      console.error(`No Lemon Squeezy URL configured for tier: ${tier}`);
      return;
    }

    const url = new URL(baseUrl);
    // Prefill email
    if (user?.email) {
      url.searchParams.set("checkout[email]", user.email);
    }
    // Pass tier metadata
    url.searchParams.set("checkout[custom][tier]", tier);

    window.location.href = url.toString();
  };

  const handleClick = () => {
    setInitiating(true);
    if (provider === "lemonsqueezy") {
      handleLemonSqueezy();
    } else {
      handlePaystack();
    }
    // Don't setInitiating(false) — we're navigating away
  };

  if (tier === "snorkeler") return null;

  return (
    <Button
      onClick={handleClick}
      disabled={loading || initiating || !user}
      className={className}
      size="lg"
    >
      {loading || initiating ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {loading ? "Loading…" : "Redirecting…"}
        </>
      ) : (
        children || (
          <>
            Upgrade to {tierConfig.displayName} — {displayPrice}
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )
      )}
    </Button>
  );
}
