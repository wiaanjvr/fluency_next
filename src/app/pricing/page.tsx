"use client";

import Link from "next/link";
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
} from "lucide-react";
import { useState } from "react";
import { usePaddle } from "@/lib/paddle";

/* =============================================================================
   PRICING PAGE
   
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
    price: "$0",
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
    id: "premium",
    name: "Premium",
    description: "Unlock your full potential",
    price: "$12",
    period: "per month",
    yearlyPrice: "$96",
    yearlyPeriod: "per year",
    yearlySavings: "Save 33%",
    features: [
      "Unlimited lessons",
      "Full course library",
      "Advanced SRS algorithm",
      "Offline mode",
      "Priority support",
      "Speech recognition",
      "Personalized learning path",
      "Detailed analytics",
    ],
    limitations: [],
    cta: "Start 7-day free trial",
    href: "/auth/signup?plan=premium",
    popular: true,
    paddlePriceId: process.env.NEXT_PUBLIC_PADDLE_PRICE_MONTHLY,
    paddleYearlyPriceId: process.env.NEXT_PUBLIC_PADDLE_PRICE_YEARLY,
  },
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
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">(
    "monthly",
  );

  return (
    <main className="bg-background text-foreground antialiased min-h-screen">
      {/* ========== NAVIGATION ========== */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-background/80 border-b border-library-forest/20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 bg-library-forest rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-105 group-hover:bg-library-brass">
                <span className="text-foreground font-serif font-semibold text-lg">
                  L
                </span>
              </div>
              <span className="text-lg font-light">Lingua</span>
            </Link>

            <div className="flex items-center gap-2">
              <Link href="/auth/login">
                <Button
                  variant="ghost"
                  size="sm"
                  className="font-light text-muted-foreground hover:text-foreground"
                >
                  Sign in
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button
                  size="sm"
                  className="bg-library-forest hover:bg-library-forest-light text-foreground font-light rounded-full px-5 transition-all duration-300"
                >
                  Get started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ========== HERO SECTION ========== */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        {/* Ambient background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-library-brass/[0.03] rounded-full blur-[100px]" />
          <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-library-forest/[0.04] rounded-full blur-[80px]" />
        </div>

        <div className="max-w-4xl mx-auto text-center">
          <ScrollReveal delay={100}>
            <p className="text-sm font-light tracking-[0.2em] uppercase text-muted-foreground mb-6">
              Simple Pricing
            </p>
          </ScrollReveal>

          <ScrollReveal delay={200}>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-light tracking-tight leading-[1.1] mb-6">
              Invest in
              <br />
              <span className="font-serif italic text-library-brass">
                your fluency
              </span>
            </h1>
          </ScrollReveal>

          <ScrollReveal delay={300}>
            <p className="text-lg md:text-xl text-muted-foreground font-light max-w-xl mx-auto mb-10 leading-relaxed">
              Start free, upgrade when you're ready. No commitment, cancel
              anytime.
            </p>
          </ScrollReveal>

          {/* Billing Toggle */}
          <ScrollReveal delay={400}>
            <div className="flex items-center justify-center gap-4 mb-16">
              <button
                onClick={() => setBillingPeriod("monthly")}
                className={`px-4 py-2 text-sm font-light rounded-full transition-all duration-300 ${
                  billingPeriod === "monthly"
                    ? "bg-library-forest text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod("yearly")}
                className={`px-4 py-2 text-sm font-light rounded-full transition-all duration-300 flex items-center gap-2 ${
                  billingPeriod === "yearly"
                    ? "bg-library-forest text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Yearly
                <span className="text-xs bg-library-brass/20 text-library-brass px-2 py-0.5 rounded-full">
                  Save 33%
                </span>
              </button>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ========== PRICING CARDS ========== */}
      <section className="px-6 pb-32">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            {plans.map((plan, index) => (
              <ScrollReveal key={plan.id} delay={500 + index * 150}>
                <div
                  className={`relative h-full rounded-3xl border-[1.5px] p-8 md:p-10 transition-all duration-500 ${
                    plan.popular
                      ? "bg-library-forest/10 border-library-brass/50 shadow-[0_0_60px_rgba(191,165,99,0.1)]"
                      : "bg-card border-border/50 hover:border-library-forest/30"
                  }`}
                >
                  {/* Popular Badge */}
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <div className="flex items-center gap-1.5 bg-library-brass text-background px-4 py-1.5 rounded-full text-sm font-light">
                        <Crown className="w-3.5 h-3.5" />
                        Most Popular
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
                        {billingPeriod === "yearly" && plan.yearlyPrice
                          ? plan.yearlyPrice
                          : plan.price}
                      </span>
                      <span className="text-muted-foreground font-light">
                        /
                        {billingPeriod === "yearly" && plan.yearlyPeriod
                          ? "year"
                          : plan.period}
                      </span>
                    </div>
                    {billingPeriod === "yearly" && plan.yearlySavings && (
                      <p className="text-library-brass text-sm font-light mt-2">
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
                              ? "bg-library-brass/20"
                              : "bg-library-forest/20"
                          }`}
                        >
                          <Check
                            className={`w-3 h-3 ${
                              plan.popular
                                ? "text-library-brass"
                                : "text-library-forest"
                            }`}
                          />
                        </div>
                        <span className="text-sm font-light">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTA Button */}
                  {plan.popular ? (
                    <PaddleCheckoutButton
                      priceId={
                        billingPeriod === "yearly"
                          ? plan.paddleYearlyPriceId
                          : plan.paddlePriceId
                      }
                    />
                  ) : (
                    <Link href={plan.href} className="block">
                      <Button
                        size="lg"
                        className="w-full h-12 bg-library-forest hover:bg-library-forest-light text-foreground font-light rounded-full transition-all duration-300"
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
              <span className="font-serif italic text-library-brass">
                elevated learning
              </span>
            </h2>
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <ScrollReveal key={index} delay={200 + index * 100}>
                <div className="text-center">
                  <div className="w-14 h-14 bg-library-forest/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <feature.icon className="w-6 h-6 text-library-brass" />
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
                q: "Can I try Premium before committing?",
                a: "Yes. Premium includes a 7-day free trial. You won't be charged until the trial ends, and you can cancel anytime before then.",
              },
              {
                q: "What happens to my progress if I downgrade?",
                a: "Your progress is always saved. If you downgrade, you'll keep access to your learned vocabulary and can continue with the free plan's daily limits.",
              },
              {
                q: "Is there a refund policy?",
                a: "We offer a 30-day money-back guarantee. If Premium isn't right for you, contact us for a full refund.",
              },
              {
                q: "Can I switch between monthly and yearly?",
                a: "Absolutely. You can change your billing frequency at any time. We'll prorate the difference.",
              },
              {
                q: "Do you offer student or educator discounts?",
                a: "Yes, we offer 50% off for verified students and educators. Contact support with your academic email to apply.",
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
      <section className="py-32 px-6 bg-library-forest/10">
        <div className="max-w-3xl mx-auto text-center">
          <ScrollReveal>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-light mb-6">
              Ready to become{" "}
              <span className="font-serif italic text-library-brass">
                fluent?
              </span>
            </h2>
          </ScrollReveal>

          <ScrollReveal delay={100}>
            <p className="text-lg text-muted-foreground font-light mb-10 max-w-xl mx-auto">
              Join thousands of learners who've transformed their language
              skills with Lingua.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={200}>
            <Link href="/auth/signup">
              <Button
                size="lg"
                className="bg-library-brass text-background hover:bg-library-brass/90 h-14 px-10 text-base font-light rounded-full group"
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
      <footer className="py-12 px-6 border-t border-border/30">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-library-forest rounded-lg flex items-center justify-center">
              <span className="text-foreground font-serif font-semibold">
                L
              </span>
            </div>
            <span className="text-sm font-light text-muted-foreground">
              &copy; {new Date().getFullYear()} Lingua. All rights reserved.
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

/* ========== PADDLE CHECKOUT BUTTON ========== */
function PaddleCheckoutButton({ priceId }: { priceId?: string }) {
  const [loading, setLoading] = useState(false);
  const { openCheckout, isLoaded } = usePaddle();

  const handleCheckout = async () => {
    setLoading(true);

    try {
      // If Paddle is loaded and we have a price ID, use Paddle checkout
      if (isLoaded && priceId) {
        openCheckout(priceId, {
          settings: {
            displayMode: "overlay",
            theme: "dark",
            locale: "en",
          },
        });
      } else {
        // Fallback: redirect to signup with premium plan
        // This handles cases where Paddle isn't configured yet
        window.location.href = "/auth/signup?plan=premium";
      }
    } catch (error) {
      console.error("Checkout error:", error);
      // On error, still redirect to signup
      window.location.href = "/auth/signup?plan=premium";
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      size="lg"
      onClick={handleCheckout}
      disabled={loading}
      className="w-full h-12 bg-library-brass text-background hover:bg-library-brass/90 font-light rounded-full transition-all duration-300 group"
    >
      {loading ? (
        "Loading..."
      ) : (
        <>
          Start 7-day free trial
          <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        </>
      )}
    </Button>
  );
}
