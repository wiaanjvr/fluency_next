"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import {
  Check,
  Sparkles,
  ArrowRight,
  Headphones,
  Brain,
  Mic,
  Crown,
  Waves,
  DollarSign,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/* =============================================================================
   PRICING PAGE - FLUENSEA OCEAN THEME
   
   Follows the "Classic Library" design system:
   - Forest green & mahogany color palette
   - Warm parchment text, brass accents
   - font-light typography, generous spacing
   - ScrollReveal animations
============================================================================= */

const plans = [
  {
    id: "free",
    name: "Free",
    description: "Start your language journey",
    priceUSD: 0,
    period: "forever",
    features: [
      "5 lessons per day",
      "Basic vocabulary practice",
      "Foundation course access",
      "Progress tracking",
      "Community support",
    ],
    limitations: [
      "Limited daily lessons",
      "No offline access",
      "Basic SRS algorithm",
    ],
    cta: "Get started",
    href: "/auth/signup",
    popular: false,
  },
  {
    id: "pro",
    name: "Pro",
    description: "Unlock your full potential",
    priceUSD: 8,
    yearlyPriceUSD: 80,
    period: "per month",
    yearlyPeriod: "per year",
    yearlySavings: "Save ~17%",
    features: [
      "Unlimited lessons",
      "Full course library",
      "Advanced SRS algorithm",
      "Offline mode",
      "Priority support",
    ],
    limitations: [],
    cta: "Subscribe to Pro",
    href: "/auth/signup?plan=pro",
    popular: true,
    paddlePriceId: process.env.NEXT_PUBLIC_PADDLE_PRICE_MONTHLY,
    paddleYearlyPriceId: process.env.NEXT_PUBLIC_PADDLE_PRICE_YEARLY,
    paystackPlanCode: process.env.NEXT_PUBLIC_PAYSTACK_PLAN_MONTHLY,
    paystackYearlyPlanCode: process.env.NEXT_PUBLIC_PAYSTACK_PLAN_YEARLY,
  },
];

const currencies = [
  { code: "USD", symbol: "$", name: "US Dollar", icon: DollarSign },
  {
    code: "EUR",
    symbol: "€",
    name: "Euro",
    icon: (props: any) => <span {...props}>€</span>,
  },
  {
    code: "GBP",
    symbol: "£",
    name: "British Pound",
    icon: (props: any) => <span {...props}>£</span>,
  },
  {
    code: "ZAR",
    symbol: "R",
    name: "South African Rand",
    icon: (props: any) => <span {...props}>R</span>,
  },
];

const moreCurrencies = [
  {
    code: "JPY",
    symbol: "¥",
    name: "Japanese Yen",
    icon: (props: any) => <span {...props}>¥</span>,
  },
  { code: "CAD", symbol: "$", name: "Canadian Dollar", icon: DollarSign },
  { code: "AUD", symbol: "$", name: "Australian Dollar", icon: DollarSign },
  {
    code: "CHF",
    symbol: "Fr",
    name: "Swiss Franc",
    icon: (props: any) => <span {...props}>Fr</span>,
  },
  {
    code: "CNY",
    symbol: "¥",
    name: "Chinese Yuan",
    icon: (props: any) => <span {...props}>¥</span>,
  },
  {
    code: "INR",
    symbol: "₹",
    name: "Indian Rupee",
    icon: (props: any) => <span {...props}>₹</span>,
  },
  {
    code: "BRL",
    symbol: "R$",
    name: "Brazilian Real",
    icon: (props: any) => <span {...props}>R$</span>,
  },
  { code: "MXN", symbol: "$", name: "Mexican Peso", icon: DollarSign },
  { code: "SGD", symbol: "$", name: "Singapore Dollar", icon: DollarSign },
  { code: "HKD", symbol: "$", name: "Hong Kong Dollar", icon: DollarSign },
];

const features = [
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

  // Get initial values from URL params (for when user returns from login)
  const billingParam = searchParams.get("billing");
  const currencyParam = searchParams.get("currency");

  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">(
    billingParam === "yearly" ? "yearly" : "monthly",
  );
  const [selectedCurrency, setSelectedCurrency] = useState(
    currencyParam || "USD",
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

  // Format price for Pro: show selected currency equivalent, but always charge ZAR
  const formatProPrice = (billingPeriod: "monthly" | "yearly") => {
    // Always charge in ZAR, but display selected currency equivalent
    const zarAmount = billingPeriod === "yearly" ? 1250 : 125;
    if (selectedCurrency === "ZAR") {
      return `R${zarAmount}`;
    }
    const rate = exchangeRates[selectedCurrency] || 1;
    const symbol =
      currencies.concat(moreCurrencies).find((c) => c.code === selectedCurrency)
        ?.symbol || selectedCurrency;
    const converted = ((zarAmount / exchangeRates["ZAR"]) * rate).toFixed(2);
    return `${symbol}${converted}`;
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
      <section className="relative min-h-screen flex items-center justify-center px-6 pt-16 overflow-hidden">
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
              Invest in your
              <br />
              <span className="font-serif italic text-gradient-turquoise">
                fluensea.
              </span>
            </h1>
          </ScrollReveal>

          <ScrollReveal delay={400}>
            <p className="text-xl md:text-2xl text-muted-foreground font-light max-w-xl mx-auto mb-12 leading-relaxed">
              Choose the plan that fits your learning journey and unlock your
              full potential.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ========== PRICING SECTION ========== */}
      <section className="px-6 pb-16">
        <div className="max-w-5xl mx-auto">
          {/* Billing Period & Currency Selection */}
          <ScrollReveal>
            <div className="mb-16 flex flex-col sm:flex-row items-center justify-center gap-8">
              {/* Billing Period Toggle */}
              <div className="flex items-center gap-3 bg-muted/40 rounded-full p-1.5">
                <button
                  onClick={() => setBillingPeriod("monthly")}
                  className={`px-6 py-2 rounded-full font-light transition-all duration-300 ${
                    billingPeriod === "monthly"
                      ? "bg-ocean-turquoise text-ocean-midnight"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingPeriod("yearly")}
                  className={`px-6 py-2 rounded-full font-light transition-all duration-300 ${
                    billingPeriod === "yearly"
                      ? "bg-ocean-turquoise text-ocean-midnight"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Yearly
                </button>
              </div>

              {/* Currency Selection */}
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
                  value={selectedCurrency}
                  onChange={(e) => setSelectedCurrency(e.target.value)}
                >
                  <option disabled>More...</option>
                  {moreCurrencies.map((currency) => (
                    <option key={currency.code} value={currency.code}>
                      {currency.code} - {currency.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 gap-8">
            {plans.map((plan, index) => (
              <ScrollReveal key={plan.id} delay={500 + index * 150}>
                <div
                  className={`relative h-full rounded-3xl border-[1.5px] p-8 md:p-10 transition-all duration-500 ${
                    plan.popular
                      ? "bg-ocean-teal/10 border-ocean-turquoise/50 shadow-[0_0_60px_rgba(42,169,160,0.1)]"
                      : "bg-card border-border/50 hover:border-ocean-teal/30"
                  }`}
                >
                  {/* 2 months free Badge */}
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <div className="flex items-center gap-1.5 bg-ocean-turquoise text-ocean-midnight px-4 py-1.5 rounded-full text-sm font-light">
                        <Crown className="w-3.5 h-3.5" />2 Months Free
                      </div>
                    </div>
                  )}

                  {/* Plan Header */}
                  <div className="mb-8">
                    <h3 className="text-2xl font-light mb-2">{plan.name}</h3>
                    <p className="text-muted-foreground font-light text-sm">
                      {plan.description}
                    </p>
                  </div>

                  {/* Price */}
                  <div className="mb-8">
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-light">
                        {plan.id === "pro"
                          ? formatProPrice(billingPeriod)
                          : plan.priceUSD === 0
                            ? "Free"
                            : formatProPrice(billingPeriod)}
                      </span>
                      <span className="text-muted-foreground font-light">
                        /
                        {billingPeriod === "yearly" && plan.yearlyPeriod
                          ? "year"
                          : plan.period}
                      </span>
                    </div>
                    {billingPeriod === "yearly" && plan.yearlySavings && (
                      <p className="text-ocean-coral text-sm font-light mt-2">
                        {plan.yearlySavings}
                      </p>
                    )}
                  </div>

                  {/* Features */}
                  <div className="space-y-4 mb-10">
                    {plan.features.map((feature, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div
                          className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                            plan.popular
                              ? "bg-ocean-turquoise/20"
                              : "bg-ocean-teal/20"
                          }`}
                        >
                          <Check
                            className={`w-3 h-3 ${
                              plan.popular
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
                  {plan.popular ? (
                    <PaymentCheckoutButton
                      plan={plan}
                      billingPeriod={billingPeriod}
                      selectedCurrency={selectedCurrency}
                      exchangeRates={exchangeRates}
                    />
                  ) : (
                    <Link href={plan.href} className="block">
                      <Button
                        variant="accent"
                        size="lg"
                        className="w-full h-12 font-medium rounded-full"
                      >
                        {plan.cta}
                      </Button>
                    </Link>
                  )}
                </div>
              </ScrollReveal>
            ))}
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
              Premium features,{" "}
              <span className="font-serif italic text-ocean-turquoise">
                elevated learning
              </span>
            </h2>
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
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
                a: "If you're not satisfied with Pro, you can request a full refund within 7 days of subscribing. Simply contact us or cancel from your settings page, and we'll process your refund immediately.",
              },
              {
                q: "When will I be charged?",
                a: "You'll be charged immediately when you subscribe to Pro. However, you have 7 days to request a full refund if you're not satisfied.",
              },
              {
                q: "What happens to my progress if I downgrade?",
                a: "Your progress is always saved. If you downgrade, you'll keep access to your learned vocabulary and can continue with the free plan's daily limits.",
              },
              {
                q: "Can I use Fluensea on mobile and desktop?",
                a: "Yes! Fluensea is fully responsive and works great on all devices. Your progress syncs automatically.",
              },
              {
                q: "How do I cancel my subscription?",
                a: "You can cancel anytime from your account dashboard. Your access will continue until the end of your billing period.",
              },
              {
                q: "Can I learn multiple languages at once?",
                a: "Absolutely! You can switch between languages and track your progress in each one separately.",
              },
              {
                q: "Which languages can I learn using Fluensea?",
                a: "French, German and Italian are currently available, with more languages being added regularly.",
              },
              {
                q: "Is my payment information secure?",
                a: "Yes, all payments are processed securely via our trusted provider, Paystack. We never store your card details.",
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

/* ========== PAYMENT CHECKOUT BUTTON ========== */
function PaymentCheckoutButton({
  plan,
  billingPeriod,
  selectedCurrency,
  exchangeRates,
}: {
  plan: any;
  billingPeriod: "monthly" | "yearly";
  selectedCurrency: string;
  exchangeRates: Record<string, number>;
}) {
  const router = useRouter();

  const handleCheckout = () => {
    // Redirect to dedicated checkout page with billing and currency params
    router.push(
      `/checkout?billing=${billingPeriod}&currency=${selectedCurrency}`,
    );
  };

  return (
    <div className="space-y-4">
      {/* Checkout Button */}
      <Button
        size="lg"
        onClick={handleCheckout}
        className="w-full h-12 font-medium rounded-full group"
      >
        <>
          Subscribe to Pro
          <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        </>
      </Button>
      <p className="text-xs text-muted-foreground text-center">
        Powered by Paystack • All prices shown in {selectedCurrency}
        {selectedCurrency !== "ZAR" && (
          <span className="block mt-1">
            Charged in ZAR (South African Rand)
          </span>
        )}
        <span className="block mt-1 font-medium text-ocean-turquoise">
          7-day money-back guarantee
        </span>
      </p>
    </div>
  );
}
