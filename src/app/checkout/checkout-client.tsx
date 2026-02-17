"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Loader2, Sparkles, Crown, Shield } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface CheckoutClientProps {
  userEmail: string;
  billing: "monthly" | "yearly";
  currency: string;
}

export default function CheckoutClient({
  userEmail,
  billing,
  currency,
}: CheckoutClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Currency conversion rates (static fallback, should match pricing page)
  const exchangeRates: Record<string, number> = {
    USD: 1,
    EUR: 0.92,
    GBP: 0.79,
    ZAR: 18.5,
  };
  // Show selected currency and converted price
  const zarAmount = billing === "yearly" ? 125000 : 12500; // In cents
  const zarBase = billing === "yearly" ? 1250 : 125;
  const rate = exchangeRates[currency] || 1;
  const symbol =
    {
      USD: "$",
      EUR: "€",
      GBP: "£",
      ZAR: "R",
    }[currency] || currency;
  const converted = ((zarBase / exchangeRates["ZAR"]) * rate).toFixed(2);
  const displayAmount =
    currency === "ZAR" ? `R${zarBase}` : `${symbol}${converted}`;
  const planCode =
    billing === "yearly"
      ? process.env.NEXT_PUBLIC_PAYSTACK_PLAN_YEARLY
      : process.env.NEXT_PUBLIC_PAYSTACK_PLAN_MONTHLY;

  const handleCheckout = async (retryCount = 0) => {
    setLoading(true);
    setError(null);

    try {
      console.log("🔄 Initializing payment from checkout page:", {
        email: userEmail,
        amount: zarAmount,
        billing,
        attempt: retryCount + 1,
      });

      const response = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: userEmail,
          amount: zarAmount,
          planCode,
          currency: "ZAR",
          metadata: {
            originalCurrency: currency,
            originalAmount: zarAmount / 100,
            exchangeRate: 1,
            billingPeriod: billing,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();

        // If 404 (profile not found) and we haven't retried too many times, retry
        if (response.status === 404 && retryCount < 3) {
          console.log(
            `⏳ Profile not ready, retrying in ${(retryCount + 1) * 1000}ms...`,
          );
          await new Promise((resolve) =>
            setTimeout(resolve, (retryCount + 1) * 1000),
          );
          return handleCheckout(retryCount + 1);
        }

        console.error(
          "❌ Payment initialization failed:",
          response.status,
          errorData,
        );
        throw new Error(errorData.error || "Failed to initialize payment");
      }

      const data = await response.json();
      console.log(
        "✅ Payment initialized successfully, redirecting to Paystack...",
      );

      // Redirect to Paystack checkout
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        console.error("❌ No authorization URL in response:", data);
        throw new Error("No authorization URL received");
      }
    } catch (err) {
      console.error("❌ Checkout error:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to initialize payment";
      setError(errorMessage);
      setLoading(false);
    }
  };

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
                <Crown className="w-8 h-8 text-ocean-turquoise" />
              </div>
            </div>
            <CardTitle className="text-2xl font-light">
              Subscribe to Pro
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
                  {billing === "yearly" ? "Pro Yearly" : "Pro Monthly"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-light text-muted-foreground">
                  Amount
                </span>
                <span className="text-2xl font-light">{displayAmount}</span>
              </div>
              {currency !== "ZAR" && (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Charged in ZAR</span>
                  <span>R{zarBase}</span>
                </div>
              )}
              {billing === "yearly" && (
                <div className="flex items-center justify-center gap-1 text-ocean-coral text-sm">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Save ~17% with yearly billing</span>
                </div>
              )}
            </div>

            {/* Benefits */}
            <div className="space-y-2">
              <p className="text-sm font-light text-muted-foreground mb-3">
                What you get:
              </p>
              {[
                "Unlimited lessons",
                "Full course library",
                "Advanced SRS algorithm",
                "Offline mode",
                "Priority support",
              ].map((benefit, i) => (
                <div key={i} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-ocean-turquoise" />
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
              onClick={handleCheckout}
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
                Secure payment powered by Paystack
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
            ← Back to pricing
          </Link>
        </div>
      </div>
    </div>
  );
}
