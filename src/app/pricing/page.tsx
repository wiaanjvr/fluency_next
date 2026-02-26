"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { TIERS, TIER_SLUGS, type TierSlug } from "@/lib/tiers";
import { useLocation } from "@/contexts/LocationContext";

/* =============================================================================
   PRICING PAGE — FLUENSEA OCEAN DEPTH EXPERIENCE

   Fully redesigned to match the immersive ocean-themed landing page.
   Uses the same lp-* CSS class system, caustic lights, light rays, depth
   metaphor, and Playfair Display / Inter typography.
============================================================================= */

/* ---------- Depth-aligned tier naming & metadata ---------- */
const TIER_META: Record<
  TierSlug,
  {
    depthName: string;
    depthTag: string;
    depthIcon: string;
    zoneBg: string;
  }
> = {
  snorkeler: {
    depthName: "Snorkeler",
    depthTag: "0 – 10m",
    depthIcon:
      "M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 1.3 0 1.9-.5 2.5-1M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2s2.4 2 5 2c1.3 0 1.9-.5 2.5-1M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2s2.4 2 5 2c1.3 0 1.9-.5 2.5-1",
    zoneBg: "linear-gradient(180deg, #0A3040 0%, #072838 100%)",
  },
  diver: {
    depthName: "Diver",
    depthTag: "10 – 100m",
    depthIcon: "M12 2L12 22M12 22L6 16M12 22L18 16M4 8L20 8",
    zoneBg: "linear-gradient(180deg, #052030 0%, #041828 100%)",
  },
  submariner: {
    depthName: "Submariner",
    depthTag: "100m+",
    depthIcon:
      "M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8",
    zoneBg: "linear-gradient(180deg, #03141E 0%, #020F16 100%)",
  },
};

const currencies = [
  { code: "USD", symbol: "$", name: "US Dollar" },
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

const TESTIMONIALS = [
  {
    name: "Marie Laurent",
    context: "Learning French → B2",
    quote:
      "I went from barely understanding menus to watching French films without subtitles. The depth-based progression made it feel natural, not forced.",
    initials: "ML",
    color: "#0D9488",
  },
  {
    name: "Kenji Tanaka",
    context: "Learning Spanish → B1",
    quote:
      "Other apps felt like homework. Fluensea feels like discovering something. The spaced repetition keeps everything fresh without the grind.",
    initials: "KT",
    color: "#2DD4BF",
  },
];

/* ---------- Inline SVG Components ---------- */
function WaveIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className || "lp-wave-icon"}
      viewBox="0 0 32 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        className="lp-wave-path lp-wave-1"
        d="M1 8C4 5 7 5 10 8C13 11 16 11 19 8C22 5 25 5 28 8"
        stroke="#0D9488"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        className="lp-wave-path lp-wave-2"
        d="M1 14C4 11 7 11 10 14C13 17 16 17 19 14C22 11 25 11 28 14"
        stroke="#0D9488"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity="0.5"
      />
      <path
        className="lp-wave-path lp-wave-3"
        d="M1 20C4 17 7 17 10 20C13 23 16 23 19 20C22 17 25 17 28 20"
        stroke="#0D9488"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity="0.25"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

/* ---------- FAQ Accordion Item ---------- */
function FAQItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={`pp-faq-item ${open ? "pp-faq-open" : ""}`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <button
        className="pp-faq-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="pp-faq-question">{q}</span>
        <svg
          className={`pp-faq-chevron ${open ? "pp-faq-chevron-open" : ""}`}
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      <div className={`pp-faq-answer-wrap ${open ? "pp-faq-answer-open" : ""}`}>
        <p className="pp-faq-answer">{a}</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   Mouse follower dot (reuses landing cursor styles)
   A lightweight lerped follower for desktop that mimics the teal dot
   on the home page. Added only to client bundle (file is client).
------------------------------------------------------------------ */
function MouseFollower() {
  const ref = useRef<HTMLDivElement | null>(null);
  const pos = useRef({ x: 0, y: 0 });
  const target = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // initialise to center
    pos.current.x = window.innerWidth / 2;
    pos.current.y = window.innerHeight / 2;
    target.current.x = pos.current.x;
    target.current.y = pos.current.y;

    let raf = 0;

    function onMove(e: MouseEvent) {
      target.current.x = e.clientX;
      target.current.y = e.clientY;
    }

    function animate() {
      // lerp towards target
      pos.current.x += (target.current.x - pos.current.x) * 0.18;
      pos.current.y += (target.current.y - pos.current.y) * 0.18;
      el!.style.transform = `translate3d(${pos.current.x - 6}px, ${pos.current.y - 6}px, 0)`;
      raf = requestAnimationFrame(animate);
    }

    window.addEventListener("mousemove", onMove);
    raf = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return <div ref={ref} className="lp-cursor" />;
}

/* ==========================================================================
   MAIN PRICING PAGE CONTENT
   ========================================================================== */
function PricingPageContent() {
  const searchParams = useSearchParams();
  const currencyParam = searchParams.get("currency");
  const { currencyCode: detectedCurrency, paymentProvider } = useLocation();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [heroLoaded, setHeroLoaded] = useState(false);

  const [selectedCurrency, setSelectedCurrency] = useState(
    currencyParam || "ZAR",
  );

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

  useEffect(() => {
    const t = setTimeout(() => setHeroLoaded(true), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    async function fetchRates() {
      try {
        const response = await fetch(
          "/api/currency/convert?amount=1&from=USD&to=USD",
        );
        if (response.ok) {
          const data = await response.json();
          if (data.rates) setExchangeRates(data.rates);
        }
      } catch (error) {
        console.error("Failed to fetch exchange rates:", error);
      }
    }
    fetchRates();
  }, []);

  /* --- IntersectionObserver for section reveals --- */
  useEffect(() => {
    if (!heroLoaded) return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const els = document.querySelectorAll(".lp-reveal");
    if (reduced) {
      els.forEach((el) => el.classList.add("lp-revealed"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("lp-revealed");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [heroLoaded]);

  const isMoreSelected = moreCurrencies.some(
    (c) => c.code === selectedCurrency,
  );
  const isSA = paymentProvider === "paystack";

  const formatPrice = (zarAmount: number, usdAmount?: number) => {
    if (zarAmount === 0) return "Free";
    const allCurrencies = currencies.concat(moreCurrencies);
    const sym =
      allCurrencies.find((c) => c.code === selectedCurrency)?.symbol ||
      selectedCurrency;
    if (isSA) {
      if (selectedCurrency === "ZAR") return `R${zarAmount}`;
      const rate = exchangeRates[selectedCurrency] || 1;
      const zarRate = exchangeRates["ZAR"] || 18.5;
      return `${sym}${((zarAmount / zarRate) * rate).toFixed(2)}`;
    } else {
      const base = usdAmount ?? 0;
      if (base === 0) return "Free";
      if (selectedCurrency === "USD") return `$${base}`;
      const rate = exchangeRates[selectedCurrency] || 1;
      const usdRate = exchangeRates["USD"] || 1;
      return `${sym}${((base / usdRate) * rate).toFixed(2)}`;
    }
  };

  const getEffectivePrice = (tier: (typeof TIERS)[TierSlug]) => {
    if (billingCycle === "annual") {
      return {
        zarAmount: tier.annualPriceZAR ?? tier.priceZAR,
        usdAmount: tier.annualPriceUSD ?? tier.priceUSD ?? 0,
      };
    }
    return { zarAmount: tier.priceZAR, usdAmount: tier.priceUSD ?? 0 };
  };

  const getAnnualSaving = (tier: (typeof TIERS)[TierSlug]) => {
    if (isSA) {
      if (!tier.annualPriceZAR || tier.priceZAR === 0) return 0;
      return tier.priceZAR * 12 - tier.annualPriceZAR;
    } else {
      if (!tier.annualPriceUSD || !tier.priceUSD) return 0;
      return tier.priceUSD * 12 - tier.annualPriceUSD;
    }
  };

  const handleCheckout = (tier: (typeof TIERS)[TierSlug]) => {
    if (tier.slug === "snorkeler") return;
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
    <main className={`lp-root pp-root ${heroLoaded ? "lp-hero-loaded" : ""}`}>
      <MouseFollower />
      {/* ============================================================
          NAVIGATION — same frosted-glass bar as home page
          ============================================================ */}
      <nav className="lp-nav">
        <div className="lp-nav-inner">
          <Link href="/" className="lp-nav-brand">
            <WaveIcon />
            <span className="lp-brand-text">
              Fluen<span className="lp-brand-serif">sea</span>
            </span>
          </Link>

          <div className="lp-nav-links">
            <Link href="/" className="lp-nav-link">
              Home
            </Link>
            <Link href="/auth/login" className="lp-nav-link">
              Sign in
            </Link>
            <Link href="/auth/signup" className="lp-nav-cta">
              Sign Up
            </Link>
          </div>

          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="lp-mobile-toggle"
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        </div>

        {mobileOpen && (
          <div className="lp-mobile-menu">
            <Link
              href="/"
              onClick={() => setMobileOpen(false)}
              className="lp-mobile-link"
            >
              Home
            </Link>
            <Link
              href="/auth/login"
              onClick={() => setMobileOpen(false)}
              className="lp-mobile-link"
            >
              Sign in
            </Link>
            <Link
              href="/auth/signup"
              onClick={() => setMobileOpen(false)}
              className="lp-mobile-cta"
            >
              Sign Up
            </Link>
          </div>
        )}
      </nav>

      {/* ============================================================
          HERO SECTION — "Choose your depth."
          Full underwater atmosphere with caustics, rays, bubbles
          ============================================================ */}
      <section className="pp-hero">
        {/* Caustic light patterns — lower opacity than home */}
        <div className="lp-caustic-layer" aria-hidden="true">
          <div className="lp-caustic lp-caustic-1 pp-caustic-dim" />
          <div className="lp-caustic lp-caustic-2 pp-caustic-dim" />
          <div className="lp-caustic lp-caustic-3 pp-caustic-dim" />
          <div className="lp-ray lp-ray-1 pp-ray-dim" />
          <div className="lp-ray lp-ray-2 pp-ray-dim" />
          <div className="lp-ray lp-ray-3 pp-ray-dim" />
          <div className="lp-ray lp-ray-4 pp-ray-dim" />
          <div className="lp-ray lp-ray-5 pp-ray-dim" />
        </div>

        {/* Rising bubbles */}
        <div className="lp-bubbles" aria-hidden="true">
          <div className="lp-bubble lp-bubble-1" />
          <div className="lp-bubble lp-bubble-2" />
          <div className="lp-bubble lp-bubble-3" />
        </div>

        {/* Depth-level indicator (side decoration) */}
        <div className="pp-depth-gauge" aria-hidden="true">
          <div className="pp-depth-gauge-line" />
          <span className="pp-depth-gauge-label" style={{ top: "10%" }}>
            SURFACE
          </span>
          <span className="pp-depth-gauge-label" style={{ top: "45%" }}>
            REEF
          </span>
          <span className="pp-depth-gauge-label" style={{ top: "85%" }}>
            ABYSS
          </span>
        </div>

        <div className="pp-hero-content">
          <p className="lp-hero-overline">SIMPLE, TRANSPARENT PRICING</p>

          <h1 className="lp-hero-headline">
            Choose your <br />
            <em className="lp-hero-brand">depth.</em>
          </h1>

          <p className="lp-hero-sub pp-hero-sub">
            From the shallows to the abyss &mdash; pick a plan that matches your
            commitment to fluency.
          </p>
        </div>

        <div className="lp-hero-vignette" aria-hidden="true" />
      </section>

      {/* ============================================================
          SOCIAL PROOF TRUST BAR
          ============================================================ */}
      <section className="lp-social-strip lp-reveal">
        <div className="lp-marquee">
          <div className="lp-marquee-inner">
            {[1, 2].map((set) => (
              <div key={set} className="lp-marquee-set">
                <span className="lp-tele-item">
                  ACTIVE_DIVERS<span className="lp-tele-value"> 1,200</span>
                </span>
                <span className="lp-tele-sep">&nbsp;//&nbsp;</span>
                <span className="lp-tele-item">
                  SESSIONS_LOGGED<span className="lp-tele-value"> 50,000</span>
                </span>
                <span className="lp-tele-sep">&nbsp;//&nbsp;</span>
                <span className="lp-tele-item">
                  LANGUAGES<span className="lp-tele-value"> 12</span>
                </span>
                <span className="lp-tele-sep">&nbsp;//&nbsp;</span>
                <span className="lp-tele-item">
                  AVG_RATING<span className="lp-tele-value"> 4.9&#x2605;</span>
                </span>
                <span className="lp-tele-sep">&nbsp;//&nbsp;</span>
                <span className="lp-tele-item">
                  WEEK_1_RETENTION<span className="lp-tele-value"> 92%</span>
                </span>
                <span className="lp-tele-sep">&nbsp;//&nbsp;</span>
                <span className="lp-tele-item">
                  METHOD<span className="lp-tele-value"> IMMERSION</span>
                </span>
                <span className="lp-tele-sep">&nbsp;//&nbsp;</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          BILLING CONTROLS — glass container
          ============================================================ */}
      <section className="pp-controls lp-reveal">
        <div className="pp-controls-inner">
          {/* Monthly / Annual toggle */}
          <div className="pp-billing-toggle">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`pp-billing-btn ${billingCycle === "monthly" ? "pp-billing-active" : ""}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("annual")}
              className={`pp-billing-btn ${billingCycle === "annual" ? "pp-billing-active" : ""}`}
            >
              Annual
              <span className="pp-savings-badge">2 months free</span>
            </button>
          </div>

          {/* Currency pills */}
          <div className="pp-currency-row">
            {currencies.map((currency) => (
              <button
                key={currency.code}
                onClick={() => setSelectedCurrency(currency.code)}
                className={`pp-currency-pill ${selectedCurrency === currency.code ? "pp-currency-active" : ""}`}
                title={currency.name}
              >
                {currency.code}
              </button>
            ))}
            <select
              className="pp-currency-more"
              value={isMoreSelected ? selectedCurrency : "MORE"}
              onChange={(e) => setSelectedCurrency(e.target.value)}
            >
              <option value="MORE" disabled>
                More…
              </option>
              {moreCurrencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} – {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* ============================================================
          PRICING CARDS — depth-themed, with visual journey
          ============================================================ */}
      <section className="pp-cards-section">
        <div className="pp-cards-grid">
          {TIER_SLUGS.map((slug, index) => {
            const tier = TIERS[slug];
            const meta = TIER_META[slug];
            const isRecommended = tier.recommended;
            const isPremium = slug === "submariner";
            const isFree = slug === "snorkeler";
            const {
              zarAmount: effectivePriceZAR,
              usdAmount: effectivePriceUSD,
            } = getEffectivePrice(tier);
            const saving = getAnnualSaving(tier);
            const savingSymbol = isSA ? "R" : "$";

            return (
              <div
                key={slug}
                className={`pp-card lp-reveal ${
                  isRecommended ? "pp-card-featured" : ""
                } ${isPremium ? "pp-card-premium" : ""} ${
                  isFree ? "pp-card-free" : ""
                }`}
                style={{ animationDelay: `${index * 150}ms` }}
              >
                {/* Animated border glow for featured card */}
                {isRecommended && (
                  <div className="pp-card-glow" aria-hidden="true" />
                )}

                {/* Recommended badge */}
                {isRecommended && (
                  <div className="pp-badge-wrap">
                    <span className="pp-badge">MOST POPULAR</span>
                  </div>
                )}

                {/* Card header with depth icon */}
                <div className="pp-card-header">
                  <div
                    className={`pp-card-icon ${isRecommended ? "pp-card-icon-rec" : ""} ${isPremium ? "pp-card-icon-prem" : ""}`}
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d={meta.depthIcon} />
                    </svg>
                  </div>
                  <div>
                    <h3 className="pp-card-tier">{meta.depthName}</h3>
                    <span className="pp-card-depth">{meta.depthTag}</span>
                  </div>
                </div>

                {/* Price */}
                <div className="pp-card-price">
                  <span className="pp-price-amount">
                    {formatPrice(effectivePriceZAR, effectivePriceUSD)}
                  </span>
                  {tier.priceZAR > 0 && (
                    <span className="pp-price-period">
                      /{billingCycle === "annual" ? "year" : "month"}
                    </span>
                  )}
                </div>

                {tier.priceZAR > 0 &&
                  billingCycle === "annual" &&
                  saving > 0 && (
                    <div className="pp-card-saving">
                      Save {savingSymbol}
                      {saving} vs monthly
                    </div>
                  )}

                {tier.priceZAR > 0 && isSA && selectedCurrency !== "ZAR" && (
                  <p className="pp-card-charge-note">
                    R{effectivePriceZAR}/
                    {billingCycle === "annual" ? "year" : "month"} charged in
                    ZAR
                  </p>
                )}
                {tier.priceUSD && !isSA && selectedCurrency !== "USD" && (
                  <p className="pp-card-charge-note">
                    ${effectivePriceUSD}/
                    {billingCycle === "annual" ? "year" : "month"} charged in
                    USD
                  </p>
                )}

                {/* Description */}
                <p className="pp-card-desc">{tier.description}</p>

                {/* Features */}
                <ul className="pp-card-features">
                  {tier.featureList.map((feature, i) => (
                    <li key={i} className="pp-feature-item">
                      <span
                        className={`pp-feature-check ${isPremium || isRecommended ? "pp-check-teal" : ""}`}
                      >
                        <CheckIcon />
                      </span>
                      <span className="pp-feature-text">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                {isFree ? (
                  <Link href="/auth/signup" className="pp-cta-btn pp-cta-ghost">
                    {tier.cta}
                  </Link>
                ) : isPremium ? (
                  <button
                    onClick={() => handleCheckout(tier)}
                    className="pp-cta-btn pp-cta-premium"
                  >
                    {tier.cta}
                    <ArrowRightIcon className="pp-cta-arrow" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleCheckout(tier)}
                    className="pp-cta-btn pp-cta-solid"
                  >
                    {tier.cta}
                    <ArrowRightIcon className="pp-cta-arrow" />
                  </button>
                )}

                {tier.priceZAR > 0 && (
                  <p className="pp-card-guarantee">
                    {isLemonSqueezy
                      ? "Powered by Lemon Squeezy · "
                      : "Powered by Paystack · "}
                    <span className="pp-guarantee-highlight">
                      7-day money-back guarantee
                    </span>
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ============================================================
          LANGUAGE TICKER — ambient atmospheric divider
          ============================================================ */}
      <section className="pp-ticker lp-reveal">
        <div className="lp-marquee">
          <div className="lp-marquee-inner pp-ticker-inner">
            {[1, 2].map((set) => (
              <div key={set} className="lp-marquee-set pp-ticker-set">
                <span className="pp-ticker-word">Bonjour</span>
                <span className="pp-ticker-dot">·</span>
                <span className="pp-ticker-word">Guten Tag</span>
                <span className="pp-ticker-dot">·</span>
                <span className="pp-ticker-word">Buongiorno</span>
                <span className="pp-ticker-dot">·</span>
                <span className="pp-ticker-word">Merci</span>
                <span className="pp-ticker-dot">·</span>
                <span className="pp-ticker-word">Danke</span>
                <span className="pp-ticker-dot">·</span>
                <span className="pp-ticker-word">Grazie</span>
                <span className="pp-ticker-dot">·</span>
                <span className="pp-ticker-word">Bonsoir</span>
                <span className="pp-ticker-dot">·</span>
                <span className="pp-ticker-word">Auf Wiedersehen</span>
                <span className="pp-ticker-dot">·</span>
                <span className="pp-ticker-word">Arrivederci</span>
                <span className="pp-ticker-dot">·</span>
                <span className="pp-ticker-word">S&rsquo;il vous plaît</span>
                <span className="pp-ticker-dot">·</span>
                <span className="pp-ticker-word">Bitte</span>
                <span className="pp-ticker-dot">·</span>
                <span className="pp-ticker-word">Per favore</span>
                <span className="pp-ticker-dot">·</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          FEATURES — "What paid plans unlock"
          ============================================================ */}
      <section className="pp-features lp-reveal">
        <p className="lp-section-label">WHAT DIVER & ABYSS UNLOCK</p>
        <h2 className="lp-section-headline">
          Go beyond the <span className="lp-highlight">shallows</span>.
        </h2>

        <div className="pp-features-grid">
          {[
            {
              icon: "M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8",
              title: "Immersive Listening",
              desc: "Unlimited native-paced audio content tailored to your exact level",
              free: "3 sessions/day",
              paid: "Unlimited",
            },
            {
              icon: "M9.663 17h4.674M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
              title: "Intelligent SRS",
              desc: "Advanced spaced repetition that adapts to your unique memory patterns",
              free: "Basic SRS",
              paid: "AI-powered SRS",
            },
            {
              icon: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
              title: "AI Conversation Feedback",
              desc: "Real-time pronunciation scoring and conversation practice with AI",
              free: "—",
              paid: "Full access",
            },
          ].map((feat, i) => (
            <div key={i} className="pp-feature-card lp-reveal">
              <div className="pp-feature-card-icon">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d={feat.icon} />
                </svg>
              </div>
              <h3 className="pp-feature-card-title">{feat.title}</h3>
              <p className="pp-feature-card-desc">{feat.desc}</p>
              <div className="pp-feature-comparison">
                <div className="pp-feature-comp-row">
                  <span className="pp-comp-label">Shallows</span>
                  <span className="pp-comp-value pp-comp-free">
                    {feat.free}
                  </span>
                </div>
                <div className="pp-feature-comp-row">
                  <span className="pp-comp-label">Reef & Abyss</span>
                  <span className="pp-comp-value pp-comp-paid">
                    {feat.paid}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============================================================
          TESTIMONIALS — social proof near decision point
          ============================================================ */}
      <section className="pp-testimonials lp-reveal">
        <p className="lp-section-label">WHAT DIVERS SAY</p>
        <h2 className="lp-section-headline">
          Stories from the <span className="lp-highlight">deep</span>.
        </h2>

        <div className="pp-testimonials-grid">
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="lp-testimonial-card lp-reveal">
              <div className="lp-testimonial-header">
                <div
                  className="lp-testimonial-avatar"
                  style={{ background: t.color }}
                >
                  {t.initials}
                </div>
                <div>
                  <p className="lp-testimonial-name">{t.name}</p>
                  <p className="lp-testimonial-context">{t.context}</p>
                </div>
              </div>
              <p className="lp-testimonial-quote">&ldquo;{t.quote}&rdquo;</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============================================================
          FAQ — glass-container accordion
          ============================================================ */}
      <section className="pp-faq lp-reveal">
        <p className="lp-section-label">QUESTIONS</p>
        <h2 className="lp-section-headline">
          Frequently <span className="lp-highlight">asked</span>.
        </h2>

        <div className="pp-faq-container">
          {[
            {
              q: "What is your refund policy?",
              a: "If you're not satisfied with your subscription, you can request a full refund within 7 days of subscribing. Simply contact us or cancel from your settings page.",
            },
            {
              q: "When will I be charged?",
              a: "You'll be charged immediately when you subscribe. However, you have 7 days to request a full refund if you're not satisfied.",
            },
            {
              q: "Can I upgrade from The Reef to The Abyss?",
              a: "Yes! You can upgrade at any time from your settings page. Your new plan starts immediately.",
            },
            {
              q: "What happens to my progress if I downgrade?",
              a: "Your progress is always saved. If you downgrade, you'll keep access to your learned vocabulary and can continue with The Shallows plan's daily limits.",
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
              q: "Which languages can I learn?",
              a: "French, German and Italian are currently available, with more languages being added regularly.",
            },
            {
              q: "Is my payment information secure?",
              a: "Yes, all payments are processed securely via Paystack (for South African users) or Lemon Squeezy (for international users). We never store your card details.",
            },
          ].map((faq, index) => (
            <FAQItem key={index} q={faq.q} a={faq.a} index={index} />
          ))}
        </div>
      </section>

      {/* ============================================================
          FINAL CTA — "Ready to dive deeper?"
          ============================================================ */}
      <section className="pp-final-cta lp-reveal">
        <div className="pp-final-glow" aria-hidden="true" />
        <div className="pp-final-caustic" aria-hidden="true" />

        <h2 className="lp-final-headline">
          Ready to dive <br />
          <em className="lp-final-brand">deeper?</em>
        </h2>

        <p className="lp-final-sub">
          Leave the shallows behind. Your next level of fluency awaits beneath
          the surface.
        </p>

        <Link href="/auth/signup" className="lp-cta-primary lp-cta-large">
          Begin your descent
          <ArrowRightIcon />
        </Link>

        <p className="pp-final-trust">No credit card required</p>
      </section>

      {/* ============================================================
          FOOTER — wave divider + matching home page footer
          ============================================================ */}
      <div className="lp-footer-wave" aria-hidden="true">
        <svg viewBox="0 0 1440 48" preserveAspectRatio="none" fill="none">
          <path
            d="M0 24C80 8 160 40 240 24C320 8 400 40 480 24C560 8 640 40 720 24C800 8 880 40 960 24C1040 8 1120 40 1200 24C1280 8 1360 40 1440 24"
            stroke="rgba(13,148,136,0.12)"
            strokeWidth="1"
            fill="none"
          >
            <animate
              attributeName="d"
              dur="4s"
              repeatCount="indefinite"
              values="M0 24C80 8 160 40 240 24C320 8 400 40 480 24C560 8 640 40 720 24C800 8 880 40 960 24C1040 8 1120 40 1200 24C1280 8 1360 40 1440 24;M0 24C80 16 160 32 240 24C320 16 400 32 480 24C560 16 640 32 720 24C800 16 880 32 960 24C1040 16 1120 32 1200 24C1280 16 1360 32 1440 24;M0 24C80 8 160 40 240 24C320 8 400 40 480 24C560 8 640 40 720 24C800 8 880 40 960 24C1040 8 1120 40 1200 24C1280 8 1360 40 1440 24"
            />
          </path>
        </svg>
      </div>

      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-brand">
            <WaveIcon />
            <span className="lp-footer-name">Fluensea</span>
            <p className="lp-footer-tagline">Surface with confidence.</p>
          </div>
          <div className="lp-footer-links">
            <Link href="/about">About</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/support">Support</Link>
            <Link href="/privacy">Privacy</Link>
          </div>
          <div className="lp-footer-social">
            <a href="#" aria-label="Twitter">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a href="#" aria-label="GitHub">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </a>
          </div>
        </div>
        <div className="lp-footer-bottom">
          <p>
            &copy; {new Date().getFullYear()} Fluensea &mdash; Surface with
            confidence.
          </p>
        </div>
      </footer>
    </main>
  );
}

export default function PricingPage() {
  return (
    <Suspense>
      <PricingPageContent />
    </Suspense>
  );
}
