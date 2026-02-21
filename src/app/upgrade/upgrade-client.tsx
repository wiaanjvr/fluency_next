"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Loader2,
  Crown,
  Anchor,
  Ship,
  ArrowLeft,
  BadgePercent,
  Shield,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { TierSlug } from "@/lib/tiers";

/* =============================================================================
   UPGRADE CLIENT — Shown to existing users upgrading from account settings.
   
   Intentionally different from CheckoutClient (/checkout) which is used
   by new sign-ups. This page shows ALL available tiers above the user's
   current tier with monthly/annual billing choice in a single view.
============================================================================= */

interface TierOption {
  slug: TierSlug;
  displayName: string;
  description: string;
  priceZAR: number;
  priceKobo: number;
  annualPriceZAR: number | null;
  annualPriceKobo: number | null;
  featureList: string[];
  recommended: boolean;
}

interface UpgradeClientProps {
  userEmail: string;
  currentTier: TierSlug;
  currentTierDisplayName: string;
  availableTiers: TierOption[];
  currency: string;
}

const tierIcon: Record<string, React.ElementType> = {
  diver: Anchor,
  submariner: Ship,
};

export default function UpgradeClient({
  userEmail,
  currentTier,
  currentTierDisplayName,
  availableTiers,
  currency,
}: UpgradeClientProps) {
  const router = useRouter();
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [loadingTier, setLoadingTier] = useState<TierSlug | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Exchange rate for non-ZAR display
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({
    ZAR: 1,
  });
  const [loadingRates, setLoadingRates] = useState(false);

  const symbol =
    ({ USD: "$", EUR: "€", GBP: "£", ZAR: "R" } as Record<string, string>)[
      currency
    ] ?? currency;

  useEffect(() => {
    if (currency === "ZAR") return;
    let mounted = true;
    setLoadingRates(true);
    fetch("/api/currency/convert?amount=1&from=USD&to=USD")
      .then((r) => r.json())
      .then((data) => {
        if (mounted && data?.rates) setExchangeRates(data.rates);
      })
      .catch(() => {})
      .finally(() => mounted && setLoadingRates(false));
    return () => {
      mounted = false;
    };
  }, [currency]);

  const formatDisplayPrice = (zarAmount: number, isAnnual: boolean) => {
    if (currency === "ZAR") {
      return isAnnual ? `R${zarAmount}/yr` : `R${zarAmount}/mo`;
    }
    const rate = exchangeRates[currency] || 1;
    const zarRate = exchangeRates["ZAR"] || 18.5;
    const converted = ((zarAmount / zarRate) * rate).toFixed(2);
    return isAnnual ? `${symbol}${converted}/yr` : `${symbol}${converted}/mo`;
  };

  const handleSubscribe = async (tier: TierOption) => {
    setLoadingTier(tier.slug);
    setError(null);

    const isAnnual = billing === "annual" && tier.annualPriceKobo !== null;
    const amount = isAnnual ? tier.annualPriceKobo! : tier.priceKobo;
    const priceZAR = isAnnual ? tier.annualPriceZAR! : tier.priceZAR;

    try {
      const response = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userEmail,
          amount,
          tier: tier.slug,
          currency: "ZAR",
          metadata: {
            tier: tier.slug,
            billing: isAnnual ? "annual" : "monthly",
            previousTier: currentTier,
            originalCurrency: currency,
            originalAmount: priceZAR,
            source: "upgrade",
          },
        }),
      });

      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Failed to initialize payment");
      if (!data.authorization_url)
        throw new Error("No authorization URL received");

      window.location.href = data.authorization_url;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to initialize payment",
      );
      setLoadingTier(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-6 py-6 flex items-center gap-4">
          <Link href="/settings">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-3 flex-1">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-9 h-9 rounded-xl overflow-hidden bg-foreground flex items-center justify-center">
                <Image
                  src="/logo.png"
                  alt="Fluensea Logo"
                  width={32}
                  height={32}
                  className="w-8 h-8 object-contain"
                  priority
                />
              </div>
            </Link>
            <div>
              <h1 className="text-xl font-light">Change your plan</h1>
              <p className="text-xs text-muted-foreground font-light">
                Currently on{" "}
                <span className="font-medium">{currentTierDisplayName}</span>
              </p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground font-light hidden sm:block">
            {userEmail}
          </p>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        {/* Billing toggle */}
        <div className="flex justify-center">
          <div className="inline-flex items-center bg-muted/40 rounded-full p-1 gap-1">
            <button
              onClick={() => setBilling("monthly")}
              className={cn(
                "px-5 py-2 rounded-full text-sm font-light transition-all duration-200",
                billing === "monthly"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling("annual")}
              className={cn(
                "px-5 py-2 rounded-full text-sm font-light transition-all duration-200 flex items-center gap-1.5",
                billing === "annual"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Annual
              <span className="text-[10px] font-medium bg-ocean-turquoise/20 text-ocean-turquoise px-1.5 py-0.5 rounded-full">
                2 months free
              </span>
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            <p className="font-medium mb-1">Payment Error</p>
            <p className="font-light">{error}</p>
          </div>
        )}

        {/* Tier cards */}
        <div className="grid sm:grid-cols-2 gap-6">
          {availableTiers.map((tier) => {
            const TierIcon = tierIcon[tier.slug] || Crown;
            const isAnnual =
              billing === "annual" && tier.annualPriceZAR !== null;
            const displayPriceZAR = isAnnual
              ? tier.annualPriceZAR!
              : tier.priceZAR;
            const monthlyEquiv = isAnnual
              ? Math.round(tier.annualPriceZAR! / 12)
              : tier.priceZAR;
            const saving = isAnnual
              ? tier.priceZAR * 12 - tier.annualPriceZAR!
              : 0;
            const isLoading = loadingTier === tier.slug;

            return (
              <div
                key={tier.slug}
                className={cn(
                  "relative rounded-2xl border-[1.5px] p-7 flex flex-col transition-all duration-300",
                  tier.recommended
                    ? "border-ocean-turquoise/50 bg-ocean-teal/5 shadow-[0_0_40px_rgba(42,169,160,0.08)]"
                    : "border-border/50 bg-card hover:border-ocean-teal/30",
                )}
              >
                {tier.recommended && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <div className="flex items-center gap-1 bg-ocean-turquoise text-ocean-midnight px-3 py-1 rounded-full text-xs font-medium">
                      <Crown className="w-3 h-3" />
                      Recommended
                    </div>
                  </div>
                )}

                {/* Plan header */}
                <div className="flex items-center gap-3 mb-5">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      tier.recommended
                        ? "bg-ocean-turquoise/20"
                        : "bg-ocean-teal/20",
                    )}
                  >
                    <TierIcon
                      className={cn(
                        "w-5 h-5",
                        tier.recommended
                          ? "text-ocean-turquoise"
                          : "text-ocean-teal",
                      )}
                    />
                  </div>
                  <div>
                    <h2 className="text-xl font-light">{tier.displayName}</h2>
                    <p className="text-xs text-muted-foreground font-light">
                      {tier.description}
                    </p>
                  </div>
                </div>

                {/* Price */}
                <div className="mb-5">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-light">
                      {formatDisplayPrice(displayPriceZAR, isAnnual)}
                    </span>
                  </div>
                  {isAnnual && (
                    <>
                      <p className="text-xs text-muted-foreground font-light mt-1">
                        ≈ R{monthlyEquiv}/month · charged annually
                      </p>
                      <div className="flex items-center gap-1 mt-1.5">
                        <BadgePercent className="w-3.5 h-3.5 text-ocean-turquoise" />
                        <p className="text-xs font-medium text-ocean-turquoise">
                          Save R{saving} vs monthly billing
                        </p>
                      </div>
                    </>
                  )}
                  {!isAnnual && (
                    <p className="text-xs text-muted-foreground font-light mt-1">
                      {currency !== "ZAR" ? `R${tier.priceZAR}/month · ` : ""}
                      billed monthly
                    </p>
                  )}
                </div>

                {/* Features */}
                <div className="space-y-2 mb-7 flex-1">
                  {tier.featureList.slice(0, 5).map((f, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <CheckCircle2
                        className={cn(
                          "w-3.5 h-3.5 shrink-0",
                          tier.recommended
                            ? "text-ocean-turquoise"
                            : "text-ocean-teal",
                        )}
                      />
                      <span className="text-sm font-light">{f}</span>
                    </div>
                  ))}
                </div>

                {/* Subscribe button */}
                <Button
                  onClick={() => handleSubscribe(tier)}
                  disabled={loadingTier !== null}
                  className={cn(
                    "w-full h-11 rounded-xl font-medium",
                    !tier.recommended && "bg-ocean-teal hover:bg-ocean-teal/90",
                  )}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Redirecting to payment…
                    </>
                  ) : (
                    `Subscribe to ${tier.displayName} ${isAnnual ? "(Annual)" : "(Monthly)"}`
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        {/* Trust signals */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            <span className="font-light">Secure payment via Paystack</span>
          </div>
          <span className="hidden sm:block">·</span>
          <span className="font-light">
            7-day money-back guarantee on new subscriptions
          </span>
        </div>
      </div>
    </div>
  );
}
