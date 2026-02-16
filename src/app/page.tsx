"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import {
  Mic,
  Brain,
  ArrowRight,
  Play,
  Volume2,
  RotateCcw,
  Check,
  Quote,
  Waves,
  Anchor,
} from "lucide-react";

/* =============================================================================
   FLUENSEA DESIGN SYSTEM
   
   Visual Direction: "Ocean Immersion" - Deep sea depths, turquoise currents, sandy warmth
   
   BRAND PHILOSOPHY:
   - Learning as immersion: Dive into language like exploring the ocean
   - Flow & waves: Language ebbs and flows like ocean currents
   - Depth & discovery: The deeper you go, the more richness you uncover
   - Currents & guidance: The app guides users along structured learning currents
   
   COLOR PHILOSOPHY:
   - Background: Deep midnight navy (#0B1C2C) - ocean depths
   - Text: Warm sand (#F5E6D3) - never pure white
   - Primary: Turquoise (#2AA9A0) - clarity, energy, learning
   - Secondary: Teal (#1D6F6F) - balance, calm, comprehension
   - Accent: Sand/coral - warmth, used sparingly for emphasis
   - Never more than 3 colors visible at once
   
   TYPOGRAPHY:
   - Headlines: font-light (300) for elegance, tracking-tight
   - Body: serif font for classic feel with modern twist
   - Accents: font-serif italic for emotional moments
   - Scale: 14px base, 1.5 line height
   - Hero headlines: 72-96px, single powerful statement
   
   SPACING RULES (8px base unit):
   - Section padding: 160px (20 units) vertical
   - Element gaps: 32-64px (4-8 units)
   - Card padding: 48-64px (6-8 units)
   - Never less than 24px between elements
   - Borders: 1.5-2px for tactile, substantial feel
   
   MOTION SYSTEM:
   - Easing: cubic-bezier(0.16, 1, 0.3, 1) - Apple's ease-out
   - Duration: 600-1000ms for reveals, 300ms for interactions
   - Wave-like staggering for sequential elements
   - Ocean-inspired transitions: dive-in, ripple, current-flow
   
   OCEAN METAPHORS IN UX:
   - Wave-like lesson progression
   - Currents for AI-guided paths
   - Dive animation when starting lessons
   - Bubble/ripple effects for feedback
   - Depth levels: surface → mid-water → deep ocean
   
   UI COPY TONE:
   - Calming, immersive, encouraging
   - Ocean metaphors where natural
   - Short, flowing sentences
   - Action-oriented CTAs
============================================================================= */

export default function Home() {
  return (
    <main className="bg-background text-foreground antialiased">
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
                href="/pricing"
                className="text-sm font-medium text-muted-foreground hover:text-ocean-turquoise transition-colors duration-300"
              >
                Pricing
              </Link>
              <Link
                href="/auth/login"
                className="text-sm font-medium text-muted-foreground hover:text-ocean-turquoise transition-colors duration-300"
              >
                Sign in
              </Link>
              <Link href="/auth/signup">
                <Button size="sm" className="rounded-full px-5 font-medium">
                  Dive in
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
              Immersive Language Learning
            </p>
          </ScrollReveal>

          <ScrollReveal delay={200}>
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-light tracking-tight leading-[1.1] mb-8">
              Dive into
              <br />
              <span className="font-serif italic text-gradient-turquoise">
                fluency.
              </span>
            </h1>
          </ScrollReveal>

          <ScrollReveal delay={400}>
            <p className="text-xl md:text-2xl text-muted-foreground font-light max-w-xl mx-auto mb-12 leading-relaxed">
              Immerse yourself in language. Flow with the currents of
              comprehension. Surface with confidence.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={600}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/auth/signup">
                <Button
                  size="lg"
                  className="h-14 px-8 text-base font-medium rounded-full group"
                >
                  Start your journey
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Button>
              </Link>
              <Button
                variant="secondary"
                size="lg"
                className="h-14 px-8 text-base font-medium rounded-full group transition-all duration-300"
              >
                <Play className="mr-2 h-4 w-4" />
                Watch demo
              </Button>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={800}>
            <p className="text-sm text-muted-foreground/60 mt-8 font-light">
              No credit card required
            </p>
          </ScrollReveal>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2">
          <ScrollReveal delay={1200}>
            <div className="w-6 h-10 rounded-full border border-border/50 flex justify-center pt-2">
              <div className="w-1 h-2 bg-muted-foreground/40 rounded-full animate-bounce" />
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ========== PHILOSOPHY SECTION ========== */}
      <section className="py-40 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <ScrollReveal>
            <p className="text-sm font-light tracking-[0.2em] uppercase text-ocean-turquoise mb-8">
              The Philosophy
            </p>
          </ScrollReveal>

          <ScrollReveal delay={100}>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-light leading-[1.3] mb-8">
              Language flows like the ocean.
              <br />
              <span className="text-muted-foreground">
                Immerse yourself completely.
              </span>
            </h2>
          </ScrollReveal>

          <ScrollReveal delay={200}>
            <p className="text-lg text-muted-foreground font-light leading-relaxed">
              Fluensea is built on the science of immersion. Just like diving
              into the ocean, you'll be surrounded by comprehensible input. The
              waves of practice ebb and flow, and with each session, you dive
              deeper into fluency.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ========== DEMO SECTION ========== */}
      <section className="py-32 px-6 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <ScrollReveal>
            <p className="text-sm font-light tracking-[0.2em] uppercase text-ocean-turquoise mb-8 text-center">
              How It Works
            </p>
          </ScrollReveal>

          <ScrollReveal delay={100}>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-light text-center mb-20">
              Four waves. Every lesson.
            </h2>
          </ScrollReveal>

          {/* Interactive Demo Card */}
          <ScrollReveal delay={200}>
            <div className="relative">
              {/* Demo Preview */}
              <div className="bg-card border border-ocean-turquoise/20 rounded-3xl p-8 md:p-12 shadow-luxury-xl overflow-hidden">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                  {/* Left: Steps */}
                  <div className="space-y-8">
                    {[
                      {
                        icon: Volume2,
                        title: "Listen & absorb",
                        desc: "Let the language wash over you first",
                      },
                      {
                        icon: Brain,
                        title: "Flow with context",
                        desc: "95% familiar, 5% new — ride the current",
                      },
                      {
                        icon: Mic,
                        title: "Surface & speak",
                        desc: "Express from real understanding",
                      },
                      {
                        icon: RotateCcw,
                        title: "Dive deeper",
                        desc: "Spaced repetition guides your depth",
                      },
                    ].map((step, i) => (
                      <ScrollReveal
                        key={i}
                        delay={300 + i * 100}
                        direction="left"
                      >
                        <div className="flex items-start gap-5 group">
                          <div className="w-12 h-12 rounded-xl bg-ocean-turquoise/10 flex items-center justify-center flex-shrink-0 transition-colors duration-300 group-hover:bg-ocean-turquoise/20">
                            <step.icon className="h-5 w-5 text-ocean-turquoise" />
                          </div>
                          <div>
                            <h3 className="text-lg font-medium mb-1">
                              {step.title}
                            </h3>
                            <p className="text-muted-foreground font-light">
                              {step.desc}
                            </p>
                          </div>
                        </div>
                      </ScrollReveal>
                    ))}
                  </div>

                  {/* Right: Lesson Preview */}
                  <ScrollReveal delay={400} direction="right">
                    <div className="bg-background rounded-2xl border border-ocean-turquoise/20 p-6 shadow-luxury">
                      <div className="flex items-center justify-between mb-6">
                        <span className="text-xs font-light tracking-wider uppercase text-muted-foreground">
                          Lesson Preview
                        </span>
                        <span className="text-xs text-ocean-turquoise">
                          A1 • Beginner
                        </span>
                      </div>

                      <div className="space-y-4 mb-6">
                        <div className="h-3 bg-muted rounded-full w-full" />
                        <div className="h-3 bg-muted rounded-full w-4/5" />
                        <div className="h-3 bg-muted rounded-full w-3/4" />
                      </div>

                      <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
                        <div className="w-10 h-10 rounded-full bg-ocean-turquoise flex items-center justify-center">
                          <Play className="h-4 w-4 text-ocean-midnight ml-0.5" />
                        </div>
                        <div className="flex-1">
                          <div className="h-1.5 bg-muted-foreground/20 rounded-full">
                            <div className="h-1.5 bg-ocean-turquoise rounded-full w-1/3" />
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          0:47
                        </span>
                      </div>
                    </div>
                  </ScrollReveal>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ========== VALUE PROP SECTION ========== */}
      <section className="py-40 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div>
              <ScrollReveal>
                <p className="text-sm font-light tracking-[0.2em] uppercase text-muted-foreground mb-8">
                  The Difference
                </p>
              </ScrollReveal>

              <ScrollReveal delay={100}>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-light leading-[1.2] mb-8">
                  Put in the reps.
                  <br />
                  <span className="font-serif italic text-ocean-turquoise">
                    Earn the results.
                  </span>
                </h2>
              </ScrollReveal>

              <ScrollReveal delay={200}>
                <p className="text-lg text-muted-foreground font-light leading-relaxed mb-8">
                  Each lesson builds on what you know, adding carefully measured
                  challenges. Track your streak. Complete your daily sessions.
                  Watch your vocabulary expand. Consistency turns effort into
                  fluency.
                </p>
              </ScrollReveal>

              <ScrollReveal delay={300}>
                <div className="flex items-center gap-6 pt-4">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-ocean-turquoise" />
                    <span className="text-sm font-light">
                      Comprehensible input
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-ocean-turquoise" />
                    <span className="text-sm font-light">
                      Spaced repetition
                    </span>
                  </div>
                </div>
              </ScrollReveal>
            </div>

            <ScrollReveal delay={200} direction="right">
              <div className="relative">
                <div className="bg-card border border-border rounded-2xl p-8 shadow-luxury">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-2 h-2 rounded-full bg-ocean-turquoise" />
                    <span className="text-sm text-muted-foreground font-light">
                      Your progress
                    </span>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-light">Known vocabulary</span>
                        <span className="text-ocean-turquoise">847 words</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full">
                        <div className="h-2 bg-ocean-turquoise rounded-full w-3/4 transition-all duration-1000" />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-light">Comprehension</span>
                        <span className="text-ocean-turquoise">A2</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full">
                        <div className="h-2 bg-ocean-turquoise rounded-full w-1/2 transition-all duration-1000" />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-light">Speaking confidence</span>
                        <span className="text-ocean-turquoise">72%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full">
                        <div className="h-2 bg-ocean-turquoise rounded-full w-[72%] transition-all duration-1000" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Decorative glow */}
                <div className="absolute -inset-4 bg-ocean-turquoise/5 rounded-3xl blur-2xl -z-10" />
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ========== THE SCIENCE SECTION ========== */}
      <section className="py-40 px-6 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-20">
            <ScrollReveal>
              <p className="text-sm font-light tracking-[0.2em] uppercase text-muted-foreground mb-8">
                The Science
              </p>
            </ScrollReveal>

            <ScrollReveal delay={100}>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-light leading-[1.2] mb-8">
                Decades of research.
                <br />
                <span className="font-serif italic text-ocean-turquoise">
                  One proven method.
                </span>
              </h2>
            </ScrollReveal>

            <ScrollReveal delay={200}>
              <p className="text-lg text-muted-foreground font-light leading-relaxed max-w-3xl mx-auto">
                The most proven approach combines comprehensible input immersion
                (via Krashen's i+1 principle), spaced repetition for vocabulary,
                and early speaking practice like shadowing. This yields superior
                fluency and retention backed by decades of research.
              </p>
            </ScrollReveal>
          </div>

          {/* Core Principles Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-20">
            <ScrollReveal delay={300}>
              <div className="bg-card border border-ocean-teal/20 rounded-2xl p-8 hover:border-ocean-teal/40 transition-colors duration-300">
                <div className="text-4xl font-light text-ocean-teal mb-4">
                  95-98%
                </div>
                <h3 className="text-lg font-medium mb-3">
                  Comprehensible Input
                </h3>
                <p className="text-sm text-muted-foreground font-light leading-relaxed">
                  Content at the sweet spot — mostly familiar with just enough
                  new material (i+1) to stretch your understanding naturally.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={400}>
              <div className="bg-card border border-border rounded-2xl p-8">
                <div className="text-4xl font-light text-ocean-turquoise mb-4">
                  95%+
                </div>
                <h3 className="text-lg font-medium mb-3">Retention Rate</h3>
                <p className="text-sm text-muted-foreground font-light leading-relaxed">
                  Spaced repetition times reviews against the forgetting curve,
                  keeping vocabulary accessible long-term.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={500}>
              <div className="bg-card border border-ocean-teal/20 rounded-2xl p-8 hover:border-ocean-teal/40 transition-colors duration-300">
                <div className="text-4xl font-light text-ocean-teal mb-4">
                  3x
                </div>
                <h3 className="text-lg font-medium mb-3">Faster Proficiency</h3>
                <p className="text-sm text-muted-foreground font-light leading-relaxed">
                  Immersion programs with early output practice achieve higher
                  speaking and listening scores than classroom-only methods.
                </p>
              </div>
            </ScrollReveal>
          </div>

          {/* Forgetting Curve Visualization */}
          <ScrollReveal delay={600}>
            <div className="bg-card border border-border rounded-2xl p-8 md:p-12">
              <div className="mb-8">
                <h3 className="text-2xl font-light mb-2">
                  The{" "}
                  <span className="font-serif italic text-ocean-turquoise">
                    forgetting curve
                  </span>
                </h3>
                <p className="text-sm text-muted-foreground font-light">
                  Without reinforcement, memory decays rapidly. Spaced
                  repetition interrupts this decline at optimal intervals.
                </p>
              </div>

              <div className="relative h-80 md:h-96">
                {/* SVG Forgetting Curve */}
                <svg
                  viewBox="0 0 800 400"
                  className="w-full h-full"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Grid lines */}
                  <g
                    stroke="currentColor"
                    strokeWidth="0.5"
                    className="text-border opacity-30"
                  >
                    <line x1="80" y1="50" x2="80" y2="350" />
                    <line x1="80" y1="350" x2="750" y2="350" />
                    {[100, 150, 200, 250, 300].map((y) => (
                      <line
                        key={y}
                        x1="80"
                        y1={y}
                        x2="750"
                        y2={y}
                        strokeDasharray="4 4"
                      />
                    ))}
                  </g>

                  {/* Axis labels */}
                  <text
                    x="40"
                    y="55"
                    className="text-[10px] fill-muted-foreground font-light"
                  >
                    100%
                  </text>
                  <text
                    x="40"
                    y="180"
                    className="text-[10px] fill-muted-foreground font-light"
                  >
                    50%
                  </text>
                  <text
                    x="40"
                    y="355"
                    className="text-[10px] fill-muted-foreground font-light"
                  >
                    0%
                  </text>

                  <text
                    x="80"
                    y="380"
                    className="text-[10px] fill-muted-foreground font-light"
                  >
                    Day 1
                  </text>
                  <text
                    x="250"
                    y="380"
                    className="text-[10px] fill-muted-foreground font-light"
                  >
                    Day 3
                  </text>
                  <text
                    x="420"
                    y="380"
                    className="text-[10px] fill-muted-foreground font-light"
                  >
                    Week 2
                  </text>
                  <text
                    x="590"
                    y="380"
                    className="text-[10px] fill-muted-foreground font-light"
                  >
                    Month 1
                  </text>

                  {/* Without spaced repetition - declining curve */}
                  <path
                    d="M 80 50 Q 200 120, 320 220 T 750 340"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-muted-foreground opacity-40"
                    strokeDasharray="6 4"
                  />

                  {/* With spaced repetition - maintained curves */}
                  <g>
                    {/* First learning */}
                    <path
                      d="M 80 50 Q 140 80, 200 140"
                      fill="none"
                      stroke="hsl(var(--ocean-turquoise))"
                      strokeWidth="3"
                      className="opacity-80"
                    />
                    {/* First review */}
                    <path
                      d="M 200 140 L 200 55 Q 280 85, 360 145"
                      fill="none"
                      stroke="hsl(var(--ocean-turquoise))"
                      strokeWidth="3"
                      className="opacity-80"
                    />
                    {/* Second review */}
                    <path
                      d="M 360 145 L 360 60 Q 460 90, 540 150"
                      fill="none"
                      stroke="hsl(var(--ocean-turquoise))"
                      strokeWidth="3"
                      className="opacity-80"
                    />
                    {/* Third review */}
                    <path
                      d="M 540 150 L 540 65 Q 640 85, 720 115"
                      fill="none"
                      stroke="hsl(var(--ocean-turquoise))"
                      strokeWidth="3"
                      className="opacity-80"
                    />
                  </g>

                  {/* Review point markers */}
                  <circle cx="200" cy="55" r="4" className="fill-ocean-teal" />
                  <circle cx="360" cy="60" r="4" className="fill-ocean-teal" />
                  <circle cx="540" cy="65" r="4" className="fill-ocean-teal" />

                  {/* Annotations */}
                  <g className="text-[11px] fill-ocean-teal font-light">
                    <text x="210" y="45">
                      Review 1
                    </text>
                    <text x="370" y="50">
                      Review 2
                    </text>
                    <text x="550" y="55">
                      Review 3
                    </text>
                  </g>

                  {/* Legend */}
                  <g transform="translate(520, 20)">
                    <line
                      x1="0"
                      y1="0"
                      x2="30"
                      y2="0"
                      stroke="hsl(var(--ocean-turquoise))"
                      strokeWidth="3"
                    />
                    <text
                      x="40"
                      y="5"
                      className="text-[11px] fill-foreground font-light"
                    >
                      With spaced repetition
                    </text>

                    <line
                      x1="0"
                      y1="20"
                      x2="30"
                      y2="20"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-muted-foreground opacity-40"
                      strokeDasharray="6 4"
                    />
                    <text
                      x="40"
                      y="25"
                      className="text-[11px] fill-muted-foreground font-light"
                    >
                      Without review
                    </text>
                  </g>
                </svg>
              </div>

              <div className="mt-8 pt-8 border-t border-border">
                <p className="text-sm text-muted-foreground font-light text-center max-w-2xl mx-auto">
                  Fluensea automatically schedules vocabulary reviews at
                  scientifically optimal intervals — right before you'd forget.
                  This keeps words accessible while minimizing review time.
                </p>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ========== ACCOUNTABILITY SECTION ========== */}
      <section className="py-40 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <ScrollReveal>
            <p className="text-sm font-light tracking-[0.2em] uppercase text-muted-foreground mb-8">
              Accountability
            </p>
          </ScrollReveal>

          <ScrollReveal delay={100}>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-light leading-[1.2] mb-8">
              Your commitment matters.
              <br />
              <span className="font-serif italic text-ocean-turquoise">
                We reward it.
              </span>
            </h2>
          </ScrollReveal>

          <ScrollReveal delay={200}>
            <p className="text-lg text-muted-foreground font-light leading-relaxed mb-12 max-w-xl mx-auto">
              Set monthly targets. Show up consistently. Hit your milestones.
              We'll give you 50% back because your discipline deserves
              recognition.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={300}>
            <div className="inline-flex flex-col sm:flex-row items-center gap-6 p-6 bg-card border border-border rounded-2xl">
              <div className="text-center sm:text-left">
                <p className="text-sm text-muted-foreground font-light mb-1">
                  Your effort
                </p>
                <p className="text-2xl font-light">Consistent practice</p>
              </div>
              <div className="hidden sm:block w-px h-12 bg-border" />
              <div className="text-center sm:text-left">
                <p className="text-sm text-muted-foreground font-light mb-1">
                  Your reward
                </p>
                <p className="text-2xl font-light text-ocean-turquoise">
                  50% cashback
                </p>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ========== TESTIMONIAL SECTION ========== */}
      <section className="py-40 px-6">
        <div className="max-w-4xl mx-auto">
          <ScrollReveal>
            <div className="relative">
              <Quote className="h-12 w-12 text-ocean-turquoise/20 mb-8" />

              <blockquote className="text-2xl sm:text-3xl md:text-4xl font-light leading-relaxed mb-8">
                I stopped looking for shortcuts and just showed up every day.
                <span className="font-serif italic text-ocean-turquoise">
                  {" "}
                  Six months later
                </span>
                , I'm having real conversations in French.
              </blockquote>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-muted" />
                <div>
                  <p className="font-medium">Marie Laurent</p>
                  <p className="text-sm text-muted-foreground font-light">
                    6 months learning French
                  </p>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ========== FINAL CTA SECTION ========== */}
      <section className="py-40 px-6 relative overflow-hidden">
        {/* Ambient background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-ocean-turquoise/[0.03] rounded-full blur-[150px]" />
        </div>

        <div className="max-w-3xl mx-auto text-center">
          <ScrollReveal>
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-light leading-[1.2] mb-8">
              Ready to dive in?
              <br />
              <span className="font-serif italic text-gradient-turquoise">
                Take the plunge.
              </span>
            </h2>
          </ScrollReveal>

          <ScrollReveal delay={200}>
            <p className="text-lg text-muted-foreground font-light mb-12 max-w-lg mx-auto">
              Your first lesson awaits beneath the surface. No credit card
              required.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={400}>
            <Link href="/auth/signup">
              <Button
                size="lg"
                className="h-16 px-12 text-lg font-light rounded-full group"
              >
                Begin your journey
                <ArrowRight className="ml-3 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
              </Button>
            </Link>
          </ScrollReveal>
        </div>
      </section>

      {/* ========== FOOTER ========== */}
      <footer className="py-16 px-6 border-t border-ocean-turquoise/20">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg overflow-hidden bg-background flex items-center justify-center">
                <Image
                  src="/logo.png"
                  alt="Fluensea Logo"
                  width={24}
                  height={24}
                  className="w-6 h-6 object-contain"
                  priority
                />
              </div>
              <span className="font-light text-gradient-turquoise">
                Fluensea
              </span>
            </div>

            <div className="flex items-center gap-8">
              <Link
                href="/about"
                className="text-sm text-muted-foreground hover:text-ocean-turquoise font-light transition-colors"
              >
                About
              </Link>
              <Link
                href="/pricing"
                className="text-sm text-muted-foreground hover:text-ocean-turquoise font-light transition-colors"
              >
                Pricing
              </Link>
              <Link
                href="/blog"
                className="text-sm text-muted-foreground hover:text-ocean-turquoise font-light transition-colors"
              >
                Blog
              </Link>
              <Link
                href="/support"
                className="text-sm text-muted-foreground hover:text-ocean-turquoise font-light transition-colors"
              >
                Support
              </Link>
            </div>

            <p className="text-sm text-muted-foreground/60 font-light">
              © 2026 Fluensea
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
