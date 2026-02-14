"use client";

import Link from "next/link";
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
} from "lucide-react";

/* =============================================================================
   DESIGN SYSTEM DOCUMENTATION
   
   Visual Direction: "Oxford Library" - Warm, intelligent, premium
   
   COLOR PHILOSOPHY:
   - Background: Deep mahogany (25° warm brown)
   - Text: Warm cream (#f5e6d3) - never pure white
   - Accent: Cognac gold - used sparingly for emphasis only
   - Never more than 3 colors visible at once
   
   TYPOGRAPHY:
   - Headlines: font-light (300) for elegance, tracking-tight
   - Body: font-light for readability
   - Accents: font-serif italic for emotional moments
   - Scale: 14px base, 1.5 line height
   - Hero headlines: 72-96px, single powerful statement
   
   SPACING RULES (8px base unit):
   - Section padding: 160px (20 units) vertical
   - Element gaps: 32-64px (4-8 units)
   - Card padding: 48-64px (6-8 units)
   - Never less than 24px between elements
   
   MOTION SYSTEM:
   - Easing: cubic-bezier(0.16, 1, 0.3, 1) - Apple's ease-out
   - Duration: 600-1000ms for reveals, 300ms for interactions
   - Stagger: 100ms between sequential elements
   - Scroll reveals: fade + translateY(40px)
   
   DESIGN PRINCIPLES:
   1. One idea per section
   2. Generous negative space
   3. Restrained color usage
   4. Subtle, purposeful motion
   5. Zero visual clutter
   
   UI COPY TONE:
   - Concise, confident, restrained
   - No exclamation marks
   - Short sentences
   - Action-oriented CTAs
============================================================================= */

export default function Home() {
  return (
    <main className="bg-background text-foreground antialiased">
      {/* ========== NAVIGATION ========== */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 bg-luxury-cognac rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
                <span className="text-background font-serif font-semibold text-lg">
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
                  className="bg-foreground text-background hover:bg-foreground/90 font-light rounded-full px-5"
                >
                  Get started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ========== HERO SECTION ========== */}
      <section className="relative min-h-screen flex items-center justify-center px-6 pt-16 overflow-hidden">
        {/* Ambient background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/3 left-1/4 w-[600px] h-[600px] bg-luxury-cognac/[0.03] rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-luxury-bronze/[0.02] rounded-full blur-[100px]" />
        </div>

        <div className="max-w-4xl mx-auto text-center">
          <ScrollReveal delay={100}>
            <p className="text-sm font-light tracking-[0.2em] uppercase text-muted-foreground mb-8">
              Language Acquisition
            </p>
          </ScrollReveal>

          <ScrollReveal delay={200}>
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-light tracking-tight leading-[1.1] mb-8">
              Learn the way
              <br />
              <span className="font-serif italic text-luxury-cognac">
                you actually acquire.
              </span>
            </h1>
          </ScrollReveal>

          <ScrollReveal delay={400}>
            <p className="text-xl md:text-2xl text-muted-foreground font-light max-w-xl mx-auto mb-12 leading-relaxed">
              Listen. Understand. Speak. Repeat.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={600}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/auth/signup">
                <Button
                  size="lg"
                  className="bg-luxury-cognac text-background hover:bg-luxury-cognac/90 h-14 px-8 text-base font-light rounded-full group"
                >
                  Start learning free
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="lg"
                className="h-14 px-8 text-base font-light text-muted-foreground hover:text-foreground group"
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
            <p className="text-sm font-light tracking-[0.2em] uppercase text-muted-foreground mb-8">
              The Problem
            </p>
          </ScrollReveal>

          <ScrollReveal delay={100}>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-light leading-[1.3] mb-8">
              Most apps teach you to recognize words.
              <br />
              <span className="text-muted-foreground">
                Not to understand them.
              </span>
            </h2>
          </ScrollReveal>

          <ScrollReveal delay={200}>
            <p className="text-lg text-muted-foreground font-light leading-relaxed">
              Lingua is built on comprehensible input — the only method proven
              to create lasting fluency. You listen to content just slightly
              above your level, understand through context, and speak from real
              comprehension.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ========== DEMO SECTION ========== */}
      <section className="py-32 px-6 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <ScrollReveal>
            <p className="text-sm font-light tracking-[0.2em] uppercase text-muted-foreground mb-8 text-center">
              How It Works
            </p>
          </ScrollReveal>

          <ScrollReveal delay={100}>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-light text-center mb-20">
              Four steps. Every lesson.
            </h2>
          </ScrollReveal>

          {/* Interactive Demo Card */}
          <ScrollReveal delay={200}>
            <div className="relative">
              {/* Demo Preview */}
              <div className="bg-card border border-border rounded-3xl p-8 md:p-12 shadow-luxury-xl overflow-hidden">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                  {/* Left: Steps */}
                  <div className="space-y-8">
                    {[
                      {
                        icon: Volume2,
                        title: "Listen first",
                        desc: "Hear the story before seeing text",
                      },
                      {
                        icon: Brain,
                        title: "Understand in context",
                        desc: "95% familiar, 5% new — the sweet spot",
                      },
                      {
                        icon: Mic,
                        title: "Speak from meaning",
                        desc: "Not memorized phrases, real comprehension",
                      },
                      {
                        icon: RotateCcw,
                        title: "Review and grow",
                        desc: "Spaced repetition locks it in",
                      },
                    ].map((step, i) => (
                      <ScrollReveal
                        key={i}
                        delay={300 + i * 100}
                        direction="left"
                      >
                        <div className="flex items-start gap-5 group">
                          <div className="w-12 h-12 rounded-xl bg-luxury-cognac/10 flex items-center justify-center flex-shrink-0 transition-colors duration-300 group-hover:bg-luxury-cognac/20">
                            <step.icon className="h-5 w-5 text-luxury-cognac" />
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
                    <div className="bg-background rounded-2xl border border-border p-6 shadow-luxury">
                      <div className="flex items-center justify-between mb-6">
                        <span className="text-xs font-light tracking-wider uppercase text-muted-foreground">
                          Lesson Preview
                        </span>
                        <span className="text-xs text-luxury-cognac">
                          A1 • Beginner
                        </span>
                      </div>

                      <div className="space-y-4 mb-6">
                        <div className="h-3 bg-muted rounded-full w-full" />
                        <div className="h-3 bg-muted rounded-full w-4/5" />
                        <div className="h-3 bg-muted rounded-full w-3/4" />
                      </div>

                      <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
                        <div className="w-10 h-10 rounded-full bg-luxury-cognac flex items-center justify-center">
                          <Play className="h-4 w-4 text-background ml-0.5" />
                        </div>
                        <div className="flex-1">
                          <div className="h-1.5 bg-muted-foreground/20 rounded-full">
                            <div className="h-1.5 bg-luxury-cognac rounded-full w-1/3" />
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
                  Focus on understanding.
                  <br />
                  <span className="font-serif italic text-luxury-cognac">
                    Speaking follows.
                  </span>
                </h2>
              </ScrollReveal>

              <ScrollReveal delay={200}>
                <p className="text-lg text-muted-foreground font-light leading-relaxed mb-8">
                  Every lesson is calibrated so most of what you hear is already
                  familiar, with just enough new material to stretch your
                  understanding. This is how children acquire language — and it
                  works for adults too.
                </p>
              </ScrollReveal>

              <ScrollReveal delay={300}>
                <div className="flex items-center gap-6 pt-4">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-luxury-cognac" />
                    <span className="text-sm font-light">
                      Comprehensible input
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-luxury-cognac" />
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
                    <div className="w-2 h-2 rounded-full bg-luxury-cognac" />
                    <span className="text-sm text-muted-foreground font-light">
                      Your progress
                    </span>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-light">Known vocabulary</span>
                        <span className="text-luxury-cognac">847 words</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full">
                        <div className="h-2 bg-luxury-cognac rounded-full w-3/4 transition-all duration-1000" />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-light">Comprehension</span>
                        <span className="text-luxury-cognac">A2</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full">
                        <div className="h-2 bg-luxury-cognac rounded-full w-1/2 transition-all duration-1000" />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-light">Speaking confidence</span>
                        <span className="text-luxury-cognac">72%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full">
                        <div className="h-2 bg-luxury-cognac rounded-full w-[72%] transition-all duration-1000" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Decorative glow */}
                <div className="absolute -inset-4 bg-luxury-cognac/5 rounded-3xl blur-2xl -z-10" />
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ========== ACCOUNTABILITY SECTION ========== */}
      <section className="py-40 px-6 bg-muted/30">
        <div className="max-w-3xl mx-auto text-center">
          <ScrollReveal>
            <p className="text-sm font-light tracking-[0.2em] uppercase text-muted-foreground mb-8">
              Accountability
            </p>
          </ScrollReveal>

          <ScrollReveal delay={100}>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-light leading-[1.2] mb-8">
              Meet your goals.
              <br />
              <span className="font-serif italic text-luxury-cognac">
                Earn back 50%.
              </span>
            </h2>
          </ScrollReveal>

          <ScrollReveal delay={200}>
            <p className="text-lg text-muted-foreground font-light leading-relaxed mb-12 max-w-xl mx-auto">
              Set a monthly learning target. Complete your lessons. Speak
              consistently. When you hit your goals, you get half your
              subscription back.
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
                <p className="text-2xl font-light text-luxury-cognac">
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
              <Quote className="h-12 w-12 text-luxury-cognac/20 mb-8" />

              <blockquote className="text-2xl sm:text-3xl md:text-4xl font-light leading-relaxed mb-8">
                After years of apps that felt like games, this actually feels
                like
                <span className="font-serif italic text-luxury-cognac">
                  {" "}
                  learning.
                </span>{" "}
                I can follow conversations now. Real ones.
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
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-luxury-cognac/[0.03] rounded-full blur-[150px]" />
        </div>

        <div className="max-w-3xl mx-auto text-center">
          <ScrollReveal>
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-light leading-[1.2] mb-8">
              Ready to learn
              <br />
              <span className="font-serif italic text-luxury-cognac">
                the right way?
              </span>
            </h2>
          </ScrollReveal>

          <ScrollReveal delay={200}>
            <p className="text-lg text-muted-foreground font-light mb-12 max-w-lg mx-auto">
              Start with your first lesson. No credit card required.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={400}>
            <Link href="/auth/signup">
              <Button
                size="lg"
                className="bg-luxury-cognac text-background hover:bg-luxury-cognac/90 h-16 px-12 text-lg font-light rounded-full group"
              >
                Begin your journey
                <ArrowRight className="ml-3 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
              </Button>
            </Link>
          </ScrollReveal>
        </div>
      </section>

      {/* ========== FOOTER ========== */}
      <footer className="py-16 px-6 border-t border-border/50">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-luxury-cognac rounded-lg flex items-center justify-center">
                <span className="text-background font-serif font-semibold">
                  L
                </span>
              </div>
              <span className="font-light">Lingua</span>
            </div>

            <div className="flex items-center gap-8">
              <Link
                href="/about"
                className="text-sm text-muted-foreground hover:text-foreground font-light transition-colors"
              >
                About
              </Link>
              <Link
                href="/pricing"
                className="text-sm text-muted-foreground hover:text-foreground font-light transition-colors"
              >
                Pricing
              </Link>
              <Link
                href="/blog"
                className="text-sm text-muted-foreground hover:text-foreground font-light transition-colors"
              >
                Blog
              </Link>
              <Link
                href="/support"
                className="text-sm text-muted-foreground hover:text-foreground font-light transition-colors"
              >
                Support
              </Link>
            </div>

            <p className="text-sm text-muted-foreground/60 font-light">
              © 2026 Lingua
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
