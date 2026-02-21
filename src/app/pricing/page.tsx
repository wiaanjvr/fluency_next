"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import {
  Check,
  ArrowRight,
  Headphones,
  Brain,
  Mic,
  Crown,
  Waves,
  DollarSign,
  Anchor,
  Ship,
  BadgePercent,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { TIERS, TIER_SLUGS, type TierSlug } from "@/lib/tiers";
import { useLocation } from "@/contexts/LocationContext";

/* =============================================================================
   PRICING PAGE - FLUENSEA OCEAN THEME (Three-Tier)

   Shows Snorkeler (free), Diver (R240), Submariner (R450) side by side.
   Prices are base ZAR, converted to the user's selected display currency.
============================================================================= */

const tierIcons: Record<TierSlug, React.ElementType> = {
  snorkeler: Waves,
  diver: Anchor,
  submariner: Ship,
};

const currencies = [
  { code: "USD", symbol: "$", name: "US Dollar", icon: DollarSign },
  { code: "EUR", symbol: "\u20ac", name: "Euro" },
  { code: "GBP", symbol: "\u00a3", name: "British Pound" },
  { code: "ZAR", symbol: "R", name: "South African Rand" },
];

const moreCurrencies = [
  { code: "JPY", symbol: "\u00a5", name: "Japanese Yen" },
  { code: "CAD", symbol: "$", name: "Canadian Dollar" },
  { code: "AUD", symbol: "$", name: "Australian Dollar" },
  { code: "CHF", symbol: "Fr", name: "Swiss Franc" },
  { code: "CNY", symbol: "\u00a5", name: "Chinese Yuan" },
  { code: "INR", symbol: "\u20b9", name: "Indian Rupee" },
  { code: "BRL", symbol: "R$", name: "Brazilian Real" },
  { code: "MXN", symbol: "$", name: "Mexican Peso" },
  { code: "SGD", symbol: "$", name: "Singapore Dollar" },
  { code: "HKD", symbol: "$", name: "Hong Kong Dollar" },
];

const featureHighlights = [
  {
    icon: Headphones,
    title: "Immersive Listening",
    description:
      "Train your ear with native-paced audio content tailored to your level",
  },
  {
    icon: Brain,
    title: "Intelligent SRS",
    description: "Our spaced repetition system adapts to your memory patterns",
  },
  {
    icon: Mic,
    title: "Speech Practice",
    description: "Perfect your pronunciation with real-time feedback",
  },
];

export default function PricingPage() {
  const searchParams = useSearchParams();
  const currencyParam = searchParams.get("currency");
  const { currencyCode: detectedCurrency, paymentProvider } = useLocation();

  const [selectedCurrency, setSelectedCurrency] = useState(
    currencyParam || "ZAR",
  );

  // Auto-select the detected currency on first load (if no explicit param)
  useEffect(() => {
    if (!currencyParam && detectedCurrency) {
      const allCodes = [...currencies, ...moreCurrencies].map((c) => c.code);
      if (allCodes.includes(detectedCurrency)) {
        setSelectedCurrency(detectedCurrency);
      }
    }
  }, [detectedCurrency, currencyParam]);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">(
    "monthly",
  );
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({
    USD: 1,
    EUR: 0.92,
    GBP: 0.79,
    ZAR: 18.5,
  });
  const [loadingRates, setLoadingRates] = useState(false);

  // Fetch exchange rates on mount
  useEffect(() => {
    async function fetchRates() {
      setLoadingRates(true);
      try {
        const response = await fetch(
          "/api/currency/convert?amount=1&from=USD&to=USD",
        );
        if (response.ok) {
          const data = await response.json();
          if (data.rates) {
            setExchangeRates(data.rates);
          }
        }
      } catch (error) {
        console.error("Failed to fetch exchange rates:", error);
      } finally {
        setLoadingRates(false);
      }
    }
    fetchRates();
  }, []);

  const isMoreSelected = moreCurrencies.some(
    (c) => c.code === selectedCurrency,
  );

  // SA users pay in ZAR (Paystack); international users pay in USD (Lemon Squeezy)
  const isSA = paymentProvider === "paystack";

  /**
   * Format a price for the current user:
   * - SA: convert ZAR base → selected display currency
   * - International: convert USD base → selected display currency
   */
  const formatPrice = (zarAmount: number, usdAmount?: number) => {
    if (zarAmount === 0) return "Free";

    const allCurrencies = currencies.concat(moreCurrencies);
    const sym =
      allCurrencies.find((c) => c.code === selectedCurrency)?.symbol ||
      selectedCurrency;

    if (isSA) {
      // ZAR base
      if (selectedCurrency === "ZAR") return `R${zarAmount}`;
      const rate = exchangeRates[selectedCurrency] || 1;
      const zarRate = exchangeRates["ZAR"] || 18.5;
      return `${sym}${((zarAmount / zarRate) * rate).toFixed(2)}`;
    } else {
      // USD base
      const base = usdAmount ?? 0;
      if (base === 0) return "Free";
      if (selectedCurrency === "USD") return `$${base}`;
      const rate = exchangeRates[selectedCurrency] || 1;
      const usdRate = exchangeRates["USD"] || 1;
      const converted = ((base / usdRate) * rate).toFixed(2);
      return `${sym}${converted}`;
    }
  };

  /** Return the effective { zarAmount, usdAmount } for the current billing cycle. */
  const getEffectivePrice = (tier: (typeof TIERS)[TierSlug]) => {
    if (billingCycle === "annual") {
      return {
        zarAmount: tier.annualPriceZAR ?? tier.priceZAR,
        usdAmount: tier.annualPriceUSD ?? tier.priceUSD ?? 0,
      };
    }
    return {
      zarAmount: tier.priceZAR,
      usdAmount: tier.priceUSD ?? 0,
    };
  };

  /** Return the annual saving vs monthly for a paid tier. */
  const getAnnualSaving = (tier: (typeof TIERS)[TierSlug]) => {
    if (isSA) {
      if (!tier.annualPriceZAR || tier.priceZAR === 0) return 0;
      return tier.priceZAR * 12 - tier.annualPriceZAR;
    } else {
      if (!tier.annualPriceUSD || !tier.priceUSD) return 0;
      return tier.priceUSD * 12 - tier.annualPriceUSD;
    }
  };

  return (
    <main className="bg-background text-foreground antialiased min-h-screen">
      {/* ========== NAVIGATION ========== */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-background/90 border-b border-ocean-turquoise/20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-lg overflow-hidden transition-all duration-300 group-hover:scale-105 bg-background/90 border-b border-ocean-turquoise/20 flex items-center justify-center">
                <Image
                  src="/logo.png"
                  alt="Fluensea Logo"
                  width={32}
                  height={32}
                  className="w-8 h-8 object-contain"
                  priority
                />
              </div>
              <span className="text-lg font-medium text-gradient-turquoise">
                Fluensea
              </span>
            </Link>

            <div className="flex items-center gap-6">
              <Link
                href="/"
                className="text-sm font-medium text-muted-foreground hover:text-ocean-turquoise transition-colors duration-300"
              >
                Home
              </Link>
              <Link href="/auth/login">
                <Button variant="ghost" size="sm">
                  Sign in
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button size="sm" className="rounded-full px-5 font-medium">
                  Sign Up
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ========== HERO SECTION ========== */}
      <section className="relative min-h-[70vh] flex items-center justify-center px-6 pt-16 overflow-hidden">
        {/* Ocean ambient background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/3 left-1/4 w-[600px] h-[600px] bg-ocean-turquoise/[0.05] rounded-full blur-[120px] animate-pulse-glow" />
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-ocean-teal/[0.06] rounded-full blur-[100px]" />
          <div className="absolute top-2/3 right-1/3 w-[300px] h-[300px] bg-ocean-turquoise/[0.03] rounded-full blur-[80px] animate-float" />
        </div>

        <div className="max-w-4xl mx-auto text-center">
          <ScrollReveal delay={100}>
            <p className="text-sm font-light tracking-[0.2em] uppercase text-ocean-turquoise mb-8">
              Simple, Transparent Pricing
            </p>
          </ScrollReveal>

          <ScrollReveal delay={200}>
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-light tracking-tight leading-[1.1] mb-8">
              Choose your
              <br />
              <span className="font-serif italic text-gradient-turquoise">
                depth.
              </span>
            </h1>
          </ScrollReveal>

          <ScrollReveal delay={400}>
            <p className="text-xl md:text-2xl text-muted-foreground font-light max-w-xl mx-auto mb-12 leading-relaxed">
              From the shallows to the abyss — pick a plan that matches your
              commitment to fluency.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ========== PRICING SECTION ========== */}
      <section className="px-6 pb-16">
        <div className="max-w-6xl mx-auto">
          {/* Billing toggle + Currency Selection */}
          <ScrollReveal>
            <div className="mb-16 flex flex-col items-center gap-6">
              {/* Monthly / Annual toggle */}
              <div className="inline-flex items-center bg-muted/40 rounded-full p-1 gap-1">
                <button
                  onClick={() => setBillingCycle("monthly")}
                  className={`px-5 py-2 rounded-full text-sm font-light transition-all duration-200 ${
                    billingCycle === "monthly"
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle("annual")}
                  className={`px-5 py-2 rounded-full text-sm font-light transition-all duration-200 flex items-center gap-1.5 ${
                    billingCycle === "annual"
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Annual
                  <span className="text-[10px] font-medium bg-ocean-turquoise/20 text-ocean-turquoise px-1.5 py-0.5 rounded-full">
                    2 months free
                  </span>
                </button>
              </div>

              {/* Currency Selection */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <div className="flex items-center gap-2">
                  {currencies.map((currency) => (
                    <button
                      key={currency.code}
                      onClick={() => setSelectedCurrency(currency.code)}
                      className={`px-3 py-1.5 text-sm font-light rounded-lg transition-all duration-300 ${
                        selectedCurrency === currency.code
                          ? "bg-ocean-turquoise/20 text-ocean-turquoise border border-ocean-turquoise/30"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                      }`}
                      title={currency.name}
                    >
                      {currency.code}
                    </button>
                  ))}
                </div>

                {/* Dropdown for more currencies */}
                <div className="relative">
                  <select
                    className="px-3 py-1.5 text-sm font-light rounded-lg border border-ocean-turquoise/30 bg-background text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ocean-turquoise"
                    value={isMoreSelected ? selectedCurrency : "MORE"}
                    onChange={(e) => setSelectedCurrency(e.target.value)}
                  >
                    <option value="MORE" disabled>
                      More...
                    </option>
                    {moreCurrencies.map((currency) => (
                      <option key={currency.code} value={currency.code}>
                        {currency.code} - {currency.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* 3-column tier cards */}
          <div className="grid md:grid-cols-3 gap-8">
            {TIER_SLUGS.map((slug, index) => {
              const tier = TIERS[slug];
              const TierIcon = tierIcons[slug];
              const isRecommended = tier.recommended;
              const {
                zarAmount: effectivePriceZAR,
                usdAmount: effectivePriceUSD,
              } = getEffectivePrice(tier);
              const saving = getAnnualSaving(tier);
              const savingSymbol = isSA ? "R" : "$";

              return (
                <ScrollReveal key={slug} delay={500 + index * 150}>
                  <div
                    className={`relative h-full rounded-3xl border-[1.5px] p-8 md:p-10 transition-all duration-500 ${
                      isRecommended
                        ? "bg-ocean-teal/10 border-ocean-turquoise/50 shadow-[0_0_60px_rgba(42,169,160,0.1)]"
                        : "bg-card border-border/50 hover:border-ocean-teal/30"
                    }`}
                  >
                    {/* Recommended Badge */}
                    {isRecommended && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                        <div className="flex items-center gap-1.5 bg-ocean-turquoise text-ocean-midnight px-4 py-1.5 rounded-full text-sm font-light">
                          <Crown className="w-3.5 h-3.5" />
                          Recommended
                        </div>
                      </div>
                    )}

                    {/* Plan Header */}
                    <div className="mb-8 flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          isRecommended
                            ? "bg-ocean-turquoise/20"
                            : "bg-ocean-teal/20"
                        }`}
                      >
                        <TierIcon
                          className={`w-5 h-5 ${
                            isRecommended
                              ? "text-ocean-turquoise"
                              : "text-ocean-teal"
                          }`}
                        />
                      </div>
                      <div>
                        <h3 className="text-2xl font-light">
                          {tier.displayName}
                        </h3>
                        <p className="text-muted-foreground font-light text-sm">
                          {tier.description}
                        </p>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="mb-8">
                      <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-light">
                          {formatPrice(effectivePriceZAR, effectivePriceUSD)}
                        </span>
                        {tier.priceZAR > 0 && (
                          <span className="text-muted-foreground font-light">
                            {billingCycle === "annual" ? "/year" : "/month"}
                          </span>
                        )}
                      </div>
                      {tier.priceZAR > 0 &&
                        billingCycle === "annual" &&
                        saving > 0 && (
                          <div className="flex items-center gap-1 mt-2">
                            <BadgePercent className="w-3.5 h-3.5 text-ocean-turquoise" />
                            <p className="text-xs font-medium text-ocean-turquoise">
                              Save {savingSymbol}
                              {saving} vs monthly
                            </p>
                          </div>
                        )}
                      {tier.priceZAR > 0 &&
                        isSA &&
                        selectedCurrency !== "ZAR" && (
                          <p className="text-xs text-muted-foreground font-light mt-1">
                            R{effectivePriceZAR}/
                            {billingCycle === "annual" ? "year" : "month"}{" "}
                            charged in ZAR
                          </p>
                        )}
                      {tier.priceUSD && !isSA && selectedCurrency !== "USD" && (
                        <p className="text-xs text-muted-foreground font-light mt-1">
                          ${effectivePriceUSD}/
                          {billingCycle === "annual" ? "year" : "month"} charged
                          in USD
                        </p>
                      )}
                    </div>

                    {/* Features */}
                    <div className="space-y-4 mb-10">
                      {tier.featureList.map((feature, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <div
                            className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                              isRecommended
                                ? "bg-ocean-turquoise/20"
                                : "bg-ocean-teal/20"
                            }`}
                          >
                            <Check
                              className={`w-3 h-3 ${
                                isRecommended
                                  ? "text-ocean-turquoise"
                                  : "text-ocean-teal"
                              }`}
                            />
                          </div>
                          <span className="text-sm font-light">{feature}</span>
                        </div>
                      ))}
                    </div>

                    {/* CTA Button */}
                    <TierCTAButton
                      tier={tier}
                      selectedCurrency={selectedCurrency}
                      billingCycle={billingCycle}
                      paymentProvider={paymentProvider}
                    />
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========== FEATURES SECTION ========== */}
      <section className="py-32 px-6 bg-muted/20">
        <div className="max-w-5xl mx-auto">
          <ScrollReveal>
            <p className="text-sm font-light tracking-[0.2em] uppercase text-muted-foreground mb-6 text-center">
              What You Get
            </p>
          </ScrollReveal>

          <ScrollReveal delay={100}>
            <h2 className="text-3xl sm:text-4xl font-light text-center mb-16">
              Dive deeper,{" "}
              <span className="font-serif italic text-ocean-turquoise">
                learn faster
              </span>
            </h2>
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-8">
            {featureHighlights.map((feature, index) => (
              <ScrollReveal key={index} delay={200 + index * 100}>
                <div className="text-center">
                  <div className="w-14 h-14 bg-ocean-teal/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <feature.icon className="w-6 h-6 text-ocean-turquoise" />
                  </div>
                  <h3 className="text-lg font-light mb-3">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground font-light leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ========== FAQ SECTION ========== */}
      <section className="py-32 px-6">
        <div className="max-w-3xl mx-auto">
          <ScrollReveal>
            <p className="text-sm font-light tracking-[0.2em] uppercase text-muted-foreground mb-6 text-center">
              Questions
            </p>
          </ScrollReveal>

          <ScrollReveal delay={100}>
            <h2 className="text-3xl sm:text-4xl font-light text-center mb-16">
              Frequently asked
            </h2>
          </ScrollReveal>

          <div className="space-y-8">
            {[
              {
                q: "What is your refund policy?",
                a: "If you're not satisfied with your Diver or Submariner subscription, you can request a full refund within 7 days of subscribing. Simply contact us or cancel from your settings page.",
              },
              {
                q: "When will I be charged?",
                a: "You'll be charged immediately when you subscribe. However, you have 7 days to request a full refund if you're not satisfied.",
              },
              {
                q: "Can I upgrade from Diver to Submariner?",
                a: "Yes! You can upgrade at any time from your settings page. Your new plan starts immediately.",
              },
              {
                q: "What happens to my progress if I downgrade?",
                a: "Your progress is always saved. If you downgrade, you'll keep access to your learned vocabulary and can continue with the Snorkeler plan's daily limits.",
              },
              {
                q: "Can I use Fluensea on mobile and desktop?",
                a: "Yes! Fluensea is fully responsive and works great on all devices. Your progress syncs automatically.",
              },
              {
                q: "How do I cancel my subscription?",
                a: "You can cancel anytime from your account settings. Your access will continue until the end of your billing period.",
              },
              {
                q: "Which languages can I learn using Fluensea?",
                a: "French, German and Italian are currently available, with more languages being added regularly.",
              },
              {
                q: "Is my payment information secure?",
                a: "Yes, all payments are processed securely via Paystack (for South African users) or Lemon Squeezy (for international users). We never store your card details.",
              },
              {
                q: "How do I contact support?",
                a: "You can reach our support team anytime via the contact page. We're here to help!",
              },
            ].map((faq, index) => (
              <ScrollReveal key={index} delay={200 + index * 80}>
                <div className="border-b border-border/50 pb-8">
                  <h3 className="text-lg font-light mb-3">{faq.q}</h3>
                  <p className="text-muted-foreground font-light leading-relaxed">
                    {faq.a}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ========== CTA SECTION ========== */}
      <section className="py-32 px-6 bg-ocean-teal/10">
        <div className="max-w-3xl mx-auto text-center">
          <ScrollReveal>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-light mb-6">
              Ready to become{" "}
              <span className="font-serif italic text-ocean-turquoise">
                fluent?
              </span>
            </h2>
          </ScrollReveal>

          <ScrollReveal delay={100}>
            <p className="text-lg text-muted-foreground font-light mb-10 max-w-xl mx-auto">
              Join learners committed to building fluency through discipline and
              consistent practice.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={200}>
            <Link href="/auth/signup">
              <Button
                size="lg"
                className="bg-ocean-turquoise text-ocean-midnight hover:bg-ocean-turquoise/90 h-14 px-10 text-base font-light rounded-full group"
              >
                Start learning free
                <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Button>
            </Link>
          </ScrollReveal>

          <ScrollReveal delay={300}>
            <p className="text-sm text-muted-foreground/60 mt-6 font-light">
              No credit card required
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ========== FOOTER ========== */}
      <footer className="py-12 px-6 border-t border-ocean-turquoise/20">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg overflow-hidden bg-gradient-to-br from-ocean-turquoise to-ocean-teal flex items-center justify-center">
              <Waves className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-light text-muted-foreground">
              &copy; {new Date().getFullYear()} Fluensea. All rights reserved.
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm font-light text-muted-foreground">
            <Link
              href="/terms"
              className="hover:text-foreground transition-colors"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="hover:text-foreground transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/contact"
              className="hover:text-foreground transition-colors"
            >
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

/* ========== TIER CTA BUTTON ========== */
function TierCTAButton({
  tier,
  selectedCurrency,
  billingCycle,
  paymentProvider,
}: {
  tier: (typeof TIERS)[TierSlug];
  selectedCurrency: string;
  billingCycle: "monthly" | "annual";
  paymentProvider: "paystack" | "lemonsqueezy";
}) {
  const router = useRouter();

  if (tier.slug === "snorkeler") {
    return (
      <Link href="/auth/signup" className="block">
        <Button
          variant="accent"
          size="lg"
          className="w-full h-12 font-medium rounded-full"
        >
          {tier.cta}
        </Button>
      </Link>
    );
  }

  const handleCheckout = () => {
    const params = new URLSearchParams({
      tier: tier.slug,
      currency: selectedCurrency,
    });
    if (billingCycle === "annual" && tier.annualPriceZAR) {
      params.set("billing", "annual");
    }
    router.push(`/checkout?${params.toString()}`);
  };

  const isLemonSqueezy = paymentProvider === "lemonsqueezy";

  return (
    <div className="space-y-4">
      <Button
        size="lg"
        onClick={handleCheckout}
        className={`w-full h-12 font-medium rounded-full group ${
          tier.recommended ? "" : "bg-ocean-teal hover:bg-ocean-teal/90"
        }`}
      >
        {tier.cta}
        <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
      </Button>
      <p className="text-xs text-muted-foreground text-center">
        {isLemonSqueezy ? "Powered by Lemon Squeezy" : "Powered by Paystack"}
        {isLemonSqueezy && <span className="block mt-1">Charged in USD</span>}
        <span className="block mt-1 font-medium text-ocean-turquoise">
          7-day money-back guarantee
        </span>
      </p>
    </div>
  );
}
