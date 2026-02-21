"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CheckCircle2,
  Loader2,
  Crown,
  Shield,
  Anchor,
  Ship,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import type { TierSlug } from "@/lib/tiers";

interface CheckoutClientProps {
  userEmail: string;
  tierSlug: TierSlug;
  tierDisplayName: string;
  priceZAR: number;
  priceKobo: number;
  planCode?: string;
  isAnnual?: boolean;
  featureList: string[];
  currency: string;
  /** Resolved payment provider: 'paystack' for SA users, 'lemonsqueezy' for international */
  paymentProvider: "paystack" | "lemonsqueezy";
}

const tierIcon: Record<string, React.ElementType> = {
  diver: Anchor,
  submariner: Ship,
};

export default function CheckoutClient({
  userEmail,
  tierSlug,
  tierDisplayName,
  priceZAR,
  priceKobo,
  planCode,
  isAnnual = false,
  featureList,
  currency,
  paymentProvider,
}: CheckoutClientProps) {
  const router = useRouter();
  const isSA = paymentProvider === "paystack";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Approximate conversion of ZAR amount into the user’s display currency (reference only)
  const [convertedDisplay, setConvertedDisplay] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);

  const symbol =
    {
      USD: "$",
      EUR: "\u20ac",
      GBP: "\u00a3",
      ZAR: "R",
    }[currency] || currency;

  // Fetch real-time conversion for display (ZAR -> selected currency)
  useEffect(() => {
    let mounted = true;
    async function fetchConversion() {
      setConverting(true);
      setConvertedDisplay(null);
      try {
        const res = await fetch(
          `/api/currency/convert?amount=${encodeURIComponent(priceZAR)}&from=ZAR&to=${encodeURIComponent(currency)}`,
        );
        if (!res.ok) throw new Error("Failed to fetch conversion");
        const data = await res.json();
        if (!mounted) return;
        if (data && typeof data.convertedAmount === "number") {
          setConvertedDisplay(`${symbol}${data.convertedAmount.toFixed(2)}`);
        } else {
          setConvertedDisplay(null);
        }
      } catch (err) {
        console.error("Conversion fetch error:", err);
        setConvertedDisplay(null);
      } finally {
        if (mounted) setConverting(false);
      }
    }
    if (currency && currency !== "ZAR") {
      fetchConversion();
    } else {
      setConvertedDisplay(null);
    }
    return () => {
      mounted = false;
    };
  }, [currency, priceZAR, symbol]);

  // SA/Paystack users are always charged in ZAR — show ZAR as the primary amount.
  // If they selected a different display currency on the pricing page, show the
  // converted equivalent as a secondary reference beneath the ZAR figure.
  const zarPrimary = `R${priceZAR}`;
  // For international edge-case (should not normally reach here): show their currency
  const displayAmount = isSA ? zarPrimary : convertedDisplay || "...";

  const handleCheckout = async (retryCount = 0) => {
    setLoading(true);
    setError(null);

    try {
      console.log("Initializing payment from checkout page:", {
        email: userEmail,
        tier: tierSlug,
        amount: priceKobo,
        attempt: retryCount + 1,
      });

      const response = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userEmail,
          amount: priceKobo,
          tier: tierSlug,
          planCode: planCode || undefined,
          currency: "ZAR",
          metadata: {
            tier: tierSlug,
            billing: isAnnual ? "annual" : "monthly",
            originalCurrency: currency,
            originalAmount: priceZAR,
            exchangeRate: 1,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();

        // If 404 (profile not found) and we haven't retried too many times, retry
        if (response.status === 404 && retryCount < 3) {
          console.log(
            `Profile not ready, retrying in ${(retryCount + 1) * 1000}ms...`,
          );
          await new Promise((resolve) =>
            setTimeout(resolve, (retryCount + 1) * 1000),
          );
          return handleCheckout(retryCount + 1);
        }

        console.error(
          "Payment initialization failed:",
          response.status,
          errorData,
        );
        throw new Error(errorData.error || "Failed to initialize payment");
      }

      const data = await response.json();
      console.log("Payment initialized, redirecting to Paystack...");

      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        console.error("No authorization URL in response:", data);
        throw new Error("No authorization URL received");
      }
    } catch (err) {
      console.error("Checkout error:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to initialize payment";
      setError(errorMessage);
      setLoading(false);
    }
  };

  const TierIcon = tierIcon[tierSlug] || Crown;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Header with Logo */}
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-foreground flex items-center justify-center">
              <Image
                src="/logo.png"
                alt="Fluensea Logo"
                width={32}
                height={32}
                className="w-8 h-8 object-contain"
                priority
              />
            </div>
            <span className="text-2xl font-light tracking-tight">Fluensea</span>
          </Link>
        </div>

        <Card className="border-ocean-turquoise/20">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-ocean-turquoise/20 rounded-full flex items-center justify-center">
                <TierIcon className="w-8 h-8 text-ocean-turquoise" />
              </div>
            </div>
            <CardTitle className="text-2xl font-light">
              Subscribe to {tierDisplayName}
            </CardTitle>
            <p className="text-muted-foreground font-light text-sm mt-2">
              {userEmail}
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Plan Details */}
            <div className="bg-muted/30 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-light text-muted-foreground">
                  Plan
                </span>
                <span className="font-medium">
                  {tierDisplayName} {isAnnual ? "Annual" : "Monthly"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-light text-muted-foreground">
                  Amount
                </span>
                <div className="text-right">
                  {/* Primary price — ZAR for SA/Paystack users */}
                  <span className="text-2xl font-light">{displayAmount}</span>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isSA
                      ? isAnnual
                        ? `R${priceZAR} billed annually in ZAR`
                        : `R${priceZAR}/month billed in ZAR`
                      : isAnnual
                        ? `Billed annually`
                        : `Billed monthly`}
                  </p>
                  {/* Reference conversion — SA user picked a non-ZAR display currency */}
                  {isSA && currency !== "ZAR" && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {converting
                        ? "Converting..."
                        : convertedDisplay
                          ? `≈ ${convertedDisplay}${isAnnual ? "/year" : "/month"}`
                          : null}
                    </p>
                  )}
                  {/* Annual saving callout */}
                  {isAnnual && (
                    <p className="text-xs text-ocean-turquoise font-medium mt-0.5">
                      2 months free vs monthly billing
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Benefits */}
            <div className="space-y-2">
              <p className="text-sm font-light text-muted-foreground mb-3">
                What you get:
              </p>
              {featureList.slice(0, 6).map((benefit, i) => (
                <div key={i} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-ocean-turquoise shrink-0" />
                  <span className="text-sm font-light">{benefit}</span>
                </div>
              ))}
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                <p className="font-medium mb-1">Payment Error</p>
                <p className="font-light">{error}</p>
              </div>
            )}

            {/* Action Button */}
            <Button
              onClick={() => handleCheckout()}
              disabled={loading}
              className="w-full h-12 text-base font-medium rounded-xl"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Initializing Payment...
                </>
              ) : error ? (
                "Retry Payment"
              ) : (
                "Continue to Payment"
              )}
            </Button>

            {/* Security Note */}
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Shield className="w-3.5 h-3.5" />
              <span className="font-light">
                {isSA
                  ? "Secure payment powered by Paystack"
                  : "Secure payment powered by Lemon Squeezy"}
              </span>
            </div>

            {/* Money-back Guarantee */}
            <div className="text-center">
              <p className="text-sm font-medium text-ocean-turquoise">
                7-day money-back guarantee
              </p>
              <p className="text-xs text-muted-foreground font-light mt-1">
                Not satisfied? Get a full refund, no questions asked.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Back Link */}
        <div className="text-center mt-6">
          <Link
            href="/pricing"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors font-light"
          >
            &larr; Back to pricing
          </Link>
        </div>
      </div>
    </div>
  );
}
