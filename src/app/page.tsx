"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

/* =============================================================================
   FLUENSEA LANDING PAGE — Ocean Descent Experience

   An immersive, award-worthy landing page built on the metaphor of descending
   through ocean depth zones. Users scroll "deeper" into fluency.

   Sections:
   1. Navigation (frosted glass)
   2. Hero (caustic light, serif/sans headline, vignette)
   3. Philosophy (watermark, gradient bg)
   4. Four Waves — dive timeline (depth markers + floating preview card)
   5. Social Proof Strip (ambient marquee)
   6. Depth Zones (CEFR levels as ocean zones)
   7. Testimonials (frosted glass cards)
   8. Pricing Teaser (Free / Pro)
   9. Final CTA
   10. Footer (wave divider, 3 columns)

   Persistent elements:
   - Depth indicator (fixed right side)
   - Custom cursor (desktop only, teal glow dot with lerp)
============================================================================= */

/* ---------- Data ---------- */

const DEPTH_MARKERS = [
  { label: "0m", position: 0 },
  { label: "10m", position: 0.15 },
  { label: "50m", position: 0.45 },
  { label: "200m", position: 1 },
];

const FOUR_WAVES = [
  {
    depth: "0m",
    title: "Listen & absorb",
    desc: "Let the language wash over you first. Immerse in comprehensible input — 95% familiar, 5% new.",
    icon: "M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8",
  },
  {
    depth: "15m",
    title: "Flow with context",
    desc: "Meaning emerges naturally from rich context. Ride the current of understanding without translation.",
    icon: "M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 1.3 0 1.9-.5 2.5-1M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2s2.4 2 5 2c1.3 0 1.9-.5 2.5-1M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2s2.4 2 5 2c1.3 0 1.9-.5 2.5-1",
  },
  {
    depth: "40m",
    title: "Surface & speak",
    desc: "Express what you truly understand. Speaking emerges from real comprehension, not memorized phrases.",
    icon: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  },
  {
    depth: "100m",
    title: "Dive deeper",
    desc: "Spaced repetition guides you to permanent memory. Each review takes you deeper into true fluency.",
    icon: "M12 2L12 22M12 22L6 16M12 22L18 16M4 8L20 8",
  },
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
  {
    name: "Sarah Chen",
    context: "Learning Japanese → A2",
    quote:
      "I love how the listening-first approach works. I started understanding patterns before I even studied grammar. It just clicks.",
    initials: "SC",
    color: "#0D9488",
  },
];

const DEPTH_ZONES = [
  {
    zone: "Sunlight Zone",
    depth: "0 – 200m",
    level: "A1 – A2",
    label: "BEGINNER",
    desc: "First contact. High-frequency words, simple patterns, survival phrases.",
    bg: "linear-gradient(180deg, #0A3040 0%, #072838 100%)",
  },
  {
    zone: "Twilight Zone",
    depth: "200 – 1,000m",
    level: "B1 – B2",
    label: "INTERMEDIATE",
    desc: "The breakthrough zone. Complex sentences, abstract ideas, real conversations.",
    bg: "linear-gradient(180deg, #052030 0%, #041828 100%)",
  },
  {
    zone: "Midnight Zone",
    depth: "1,000 – 4,000m",
    level: "C1 – C2",
    label: "ADVANCED",
    desc: "Native-level nuance. Idioms, cultural subtleties, professional fluency.",
    bg: "linear-gradient(180deg, #03141E 0%, #020F16 100%)",
  },
  {
    zone: "Abyssal Zone",
    depth: "4,000m+",
    level: "MASTERY",
    label: "EXPERT",
    desc: "Complete immersion. Think, dream, and create in your new language.",
    bg: "linear-gradient(180deg, #020C12 0%, #010A0E 100%)",
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

/* ---------- Page Component ---------- */

export default function Home() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 });
  const [isTouch, setIsTouch] = useState(true); // default true, set false on desktop
  const [heroLoaded, setHeroLoaded] = useState(false);

  const cursorRef = useRef({ x: -100, y: -100 });
  const targetRef = useRef({ x: -100, y: -100 });
  const rafRef = useRef<number>(0);

  /* --- Page-load hero fade-in --- */
  useEffect(() => {
    const t = setTimeout(() => setHeroLoaded(true), 50);
    return () => clearTimeout(t);
  }, []);

  /* --- Scroll tracking for depth indicator + scroll-driven background --- */
  useEffect(() => {
    const onScroll = () => {
      const top = window.scrollY;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      const progress = total > 0 ? top / total : 0;
      setScrollProgress(progress);
      // Interpolate background: #041824 (surface) → #010C10 (abyss)
      const r = Math.round(4 + (1 - 4) * progress);
      const g = Math.round(24 + (12 - 24) * progress);
      const b = Math.round(36 + (10 - 36) * progress);
      const root = document.querySelector(".lp-root") as HTMLElement;
      if (root) root.style.setProperty("--lp-scroll-bg", `rgb(${r},${g},${b})`);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* --- Custom cursor (desktop only) --- */
  useEffect(() => {
    const touch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    setIsTouch(touch);
    if (touch) return;

    const onMove = (e: MouseEvent) => {
      targetRef.current = { x: e.clientX, y: e.clientY };
    };

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const tick = () => {
      cursorRef.current = {
        x: lerp(cursorRef.current.x, targetRef.current.x, 0.12),
        y: lerp(cursorRef.current.y, targetRef.current.y, 0.12),
      };
      setCursorPos({ x: cursorRef.current.x, y: cursorRef.current.y });
      rafRef.current = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove);
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(rafRef.current);
    };
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

  /* --- Staggered reveal for dive timeline steps --- */
  useEffect(() => {
    if (!heroLoaded) return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const items = document.querySelectorAll(".dive-step");

    if (reduced) {
      items.forEach((el) => el.classList.add("dive-step-visible"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const el = e.target as HTMLElement;
            const delay = parseInt(el.dataset.delay || "0", 10);
            setTimeout(() => el.classList.add("dive-step-visible"), delay);
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15 },
    );

    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [heroLoaded]);

  /* ====================================================================
     RENDER
     ==================================================================== */
  return (
    <main className="lp-root">
      {/* ============================================================
          CUSTOM CURSOR
          ============================================================ */}
      {!isTouch && (
        <div
          className="lp-cursor"
          style={{
            transform: `translate(${cursorPos.x - 6}px, ${cursorPos.y - 6}px)`,
          }}
        />
      )}

      {/* ============================================================
          DEPTH INDICATOR (fixed right side)
          ============================================================ */}
      <div className="lp-depth-indicator" aria-hidden="true">
        <div className="lp-depth-track">
          <div
            className="lp-depth-dot"
            style={{ top: `${scrollProgress * 100}%` }}
          />
        </div>
        {DEPTH_MARKERS.map((m) => (
          <span
            key={m.label}
            className="lp-depth-label"
            style={{ top: `${m.position * 100}%` }}
          >
            {m.label}
          </span>
        ))}
      </div>

      {/* ============================================================
          NAVIGATION
          ============================================================ */}
      <nav className="lp-nav">
        <div className="lp-nav-inner">
          <Link href="/" className="lp-nav-brand">
            <WaveIcon />
            <span className="lp-brand-text">
              Fluen<span className="lp-brand-serif">sea</span>
            </span>
          </Link>

          {/* Desktop links */}
          <div className="lp-nav-links">
            <Link href="/pricing" className="lp-nav-link">
              Pricing
            </Link>
            <Link href="/auth/login" className="lp-nav-link">
              Sign in
            </Link>
            <Link href="/auth/signup" className="lp-nav-cta">
              Sign Up
            </Link>
          </div>

          {/* Mobile toggle */}
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

        {/* Mobile dropdown */}
        {mobileOpen && (
          <div className="lp-mobile-menu">
            <Link
              href="/pricing"
              onClick={() => setMobileOpen(false)}
              className="lp-mobile-link"
            >
              Pricing
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
          HERO SECTION
          ============================================================ */}
      <section className={`lp-hero ${heroLoaded ? "lp-hero-loaded" : ""}`}>
        {/* Caustic light patterns */}
        <div className="lp-caustic-layer" aria-hidden="true">
          <div className="lp-caustic lp-caustic-1" />
          <div className="lp-caustic lp-caustic-2" />
          <div className="lp-caustic lp-caustic-3" />
          {/* Water-surface light rays */}
          <div className="lp-ray lp-ray-1" />
          <div className="lp-ray lp-ray-2" />
          <div className="lp-ray lp-ray-3" />
          <div className="lp-ray lp-ray-4" />
          <div className="lp-ray lp-ray-5" />
        </div>

        {/* Rising bubbles */}
        <div className="lp-bubbles" aria-hidden="true">
          <div className="lp-bubble lp-bubble-1" />
          <div className="lp-bubble lp-bubble-2" />
          <div className="lp-bubble lp-bubble-3" />
          <div className="lp-bubble lp-bubble-4" />
        </div>

        <div className="lp-hero-content">
          <p className="lp-hero-overline">Immersive Language Learning</p>

          <h1 className="lp-hero-headline">
            Dive into <em className="lp-hero-brand">fluensea.</em>
          </h1>

          <p className="lp-hero-sub">
            Go from first words to fluent&nbsp;&mdash; one depth at a time.
          </p>

          <div className="lp-hero-ctas">
            <Link href="/auth/signup" className="lp-cta-primary">
              Begin your descent
            </Link>
            <Link href="/pricing" className="lp-cta-ghost">
              Explore plans
            </Link>
          </div>

          <p className="lp-hero-trust">No credit card required</p>
        </div>

        {/* Depth-of-field blur vignette */}
        <div className="lp-hero-vignette" aria-hidden="true" />
      </section>

      {/* ============================================================
          WATERLINE DIVIDER
          ============================================================ */}
      <div className="lp-waterline" aria-hidden="true">
        <svg
          viewBox="0 0 1440 24"
          preserveAspectRatio="none"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0 12C120 4 240 20 360 12C480 4 600 20 720 12C840 4 960 20 1080 12C1200 4 1320 20 1440 12"
            stroke="rgba(13,148,136,0.15)"
            strokeWidth="1"
            fill="none"
          />
        </svg>
      </div>

      {/* ============================================================
          PHILOSOPHY SECTION
          ============================================================ */}
      <section className="lp-philosophy lp-reveal">
        <div className="lp-watermark" aria-hidden="true">
          IMMERSE
        </div>

        <div className="lp-philosophy-inner">
          <p className="lp-section-label">THE PHILOSOPHY</p>

          <h2 className="lp-philosophy-headline">
            Language flows like the ocean.
            <br />
            <span className="lp-highlight">Immerse yourself completely.</span>
          </h2>

          <p className="lp-philosophy-body">
            Fluensea is built on the{" "}
            <span className="lp-accent-text">science of immersion</span>. Just
            like diving into the ocean, you&rsquo;ll be surrounded by{" "}
            <span className="lp-accent-text">comprehensible input</span>. The
            waves of practice ebb and flow, and with each session, you{" "}
            <span className="lp-accent-text">dive deeper into fluency</span>.
          </p>
        </div>
      </section>

      {/* ============================================================
          FOUR WAVES — How It Works (Dive Timeline)
          ============================================================ */}
      <section className="lp-four-waves lp-reveal">
        <p className="lp-section-label">HOW IT WORKS</p>
        <h2 className="lp-section-headline">
          The four <span className="lp-highlight">waves</span> of fluency.
        </h2>

        <div className="lp-waves-grid">
          {/* Left column: Dive timeline */}
          <div className="lp-dive-timeline">
            {FOUR_WAVES.map((wave, i) => (
              <div key={i} className="dive-step" data-delay={String(i * 150)}>
                <div className="dive-step-depth">
                  <span className="dive-depth-label">{wave.depth}</span>
                </div>
                <div className="dive-step-line">
                  <div className="dive-step-dot" />
                  {i < FOUR_WAVES.length - 1 && (
                    <div className="dive-step-connector" />
                  )}
                </div>
                <div className="dive-step-content">
                  <div className="dive-step-icon">
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
                      <path d={wave.icon} />
                    </svg>
                  </div>
                  <h3 className="dive-step-title">{wave.title}</h3>
                  <p className="dive-step-desc">{wave.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Right column: Floating lesson preview card */}
          <div className="lp-preview-card lp-reveal">
            <div className="lp-preview-header">
              <span className="lp-preview-tag">LESSON PREVIEW</span>
              <span className="lp-preview-level">A2 · Week 3</span>
            </div>
            <div className="lp-preview-body">
              <p className="lp-preview-label">ACTIVE MODE — FREE READING</p>
              <p className="lp-preview-sentence">
                Le petit prince <span className="lp-word-hl">demanda</span> au
                renard de jouer avec lui.
              </p>
              <p className="lp-preview-translation">
                The little prince asked the fox to play with him.
              </p>
              <div className="lp-preview-vocab">
                <span className="lp-vocab-chip">
                  demanda <span className="lp-chip-def">· asked</span>
                </span>
                <span className="lp-vocab-chip">
                  renard <span className="lp-chip-def">· fox</span>
                </span>
              </div>
            </div>
            <div className="lp-preview-audio">
              <div className="lp-play-btn">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <polygon points="5,3 19,12 5,21" />
                </svg>
              </div>
              <div className="lp-audio-track">
                <div className="lp-audio-fill" style={{ width: "35%" }} />
              </div>
              <span className="lp-audio-time">0:12 / 0:34</span>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SOCIAL PROOF STRIP — dive-computer telemetry readout
          ============================================================ */}
      <section className="lp-social-strip">
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
          DEPTH ZONES — Ocean zone progression / CEFR mapping
          ============================================================ */}
      <section className="lp-depth-zones lp-reveal">
        <p className="lp-section-label">DEPTH ZONES</p>
        <h2 className="lp-section-headline">
          Your journey from <span className="lp-highlight">surface</span> to{" "}
          <span className="lp-highlight">abyss</span>.
        </h2>

        <div className="lp-zones-container">
          {DEPTH_ZONES.map((zone, i) => (
            <div
              key={i}
              className="lp-zone-band lp-reveal"
              style={{ background: zone.bg }}
            >
              <div className="lp-zone-inner">
                <div className="lp-zone-left">
                  <span className="lp-zone-name">{zone.zone}</span>
                  <span className="lp-zone-depth">{zone.depth}</span>
                </div>
                <div className="lp-zone-center">
                  <span className="lp-zone-level">{zone.level}</span>
                  <span className="lp-zone-label">{zone.label}</span>
                </div>
                <div className="lp-zone-right">
                  <p className="lp-zone-desc">{zone.desc}</p>
                </div>
              </div>
              {/* Bioluminescent particles in deeper zones */}
              {i >= 2 && (
                <div className="lp-zone-particles" aria-hidden="true">
                  <div className="lp-zone-particle lp-zone-particle-1" />
                  <div className="lp-zone-particle lp-zone-particle-2" />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ============================================================
          TESTIMONIALS
          ============================================================ */}
      <section className="lp-testimonials lp-reveal">
        <p className="lp-section-label">WHAT DIVERS SAY</p>
        <h2 className="lp-section-headline">
          Stories from the <span className="lp-highlight">deep</span>.
        </h2>

        <div className="lp-testimonials-grid">
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
          PRICING TEASER
          ============================================================ */}
      <section className="lp-pricing lp-reveal">
        <p className="lp-section-label">PLANS</p>
        <h2 className="lp-section-headline">
          Choose your <span className="lp-highlight">depth</span>.
        </h2>

        <div className="lp-pricing-grid">
          {/* Free tier */}
          <div className="lp-price-card">
            <span className="lp-price-tier">Free</span>
            <p className="lp-price-amount">
              $0<span className="lp-price-period">/forever</span>
            </p>
            <ul className="lp-price-features">
              <li>3 lessons per day</li>
              <li>Sunlight Zone content (A1–A2)</li>
              <li>Basic spaced repetition</li>
              <li>Community access</li>
            </ul>
            <Link href="/auth/signup" className="lp-price-btn">
              Start free
            </Link>
          </div>

          {/* Pro tier */}
          <div className="lp-price-card lp-price-pro">
            <span className="lp-price-badge">MOST POPULAR</span>
            <span className="lp-price-tier">Pro</span>
            <p className="lp-price-amount">
              $9<span className="lp-price-period">/month</span>
            </p>
            <ul className="lp-price-features">
              <li>Unlimited lessons</li>
              <li>All depth zones (A1–C2)</li>
              <li>AI conversation partner</li>
              <li>Advanced analytics</li>
              <li>Priority support</li>
              <li>50% cashback on milestones</li>
            </ul>
            <Link href="/auth/signup" className="lp-price-btn lp-price-btn-pro">
              Dive deep
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================================
          FINAL CTA
          ============================================================ */}
      <section className="lp-final-cta lp-reveal">
        <div className="lp-final-glow" aria-hidden="true" />

        <h2 className="lp-final-headline">
          Ready to dive in?
          <br />
          <em className="lp-final-brand">Take the plunge.</em>
        </h2>

        <p className="lp-final-sub">
          Your first lesson awaits beneath the surface. No credit card required.
        </p>

        <Link href="/auth/signup" className="lp-cta-primary lp-cta-large">
          Begin your journey
          <svg
            width="20"
            height="20"
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
        </Link>
      </section>

      {/* ============================================================
          FOOTER WAVE DIVIDER
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

      {/* ============================================================
          FOOTER
          ============================================================ */}
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
          <p>&copy; 2025 Fluensea &mdash; Surface with confidence.</p>
        </div>
      </footer>
    </main>
  );
}
