"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  ArrowLeft,
  ArrowRight,
  Waves,
  Brain,
  Users,
  Heart,
  Target,
  Compass,
  Sparkles,
  Globe,
  BookOpen,
  Mic,
  TrendingUp,
  Anchor,
} from "lucide-react";

/* =============================================================================
   ABOUT PAGE - FLUENSEA OCEAN THEME
   
   Following the design system:
   - Ocean immersion theme with turquoise accents
   - font-light typography, generous spacing
   - ScrollReveal animations
   - Ocean metaphors throughout
============================================================================= */

const coreValues = [
  {
    icon: Waves,
    title: "Immersive Learning",
    description:
      "Like diving into the ocean, we believe language learning should be a full immersion experience. No shallow memorization—just deep, natural acquisition.",
  },
  {
    icon: Brain,
    title: "Science-Backed",
    description:
      "Our approach is rooted in comprehensible input theory and spaced repetition science. Every feature is designed around how the brain naturally acquires language.",
  },
  {
    icon: Heart,
    title: "Learner-First",
    description:
      "Your journey is unique. We adapt to your pace, interests, and goals—like currents that guide rather than push.",
  },
  {
    icon: Compass,
    title: "Purposeful Design",
    description:
      "Every pixel, every interaction, every word is intentional. We craft experiences that feel natural, calming, and effective.",
  },
];

const approach = [
  {
    icon: BookOpen,
    title: "Comprehensible Input",
    description:
      "Learn through stories and contexts just above your current level. Understanding comes first; fluency follows naturally.",
    stat: "95%+",
    statLabel: "Comprehension rate",
  },
  {
    icon: TrendingUp,
    title: "Adaptive Progression",
    description:
      "Our SRS algorithm tracks 10+ metrics to surface the right words at the right time. No two journeys are identical.",
    stat: "10+",
    statLabel: "Learning metrics",
  },
  {
    icon: Mic,
    title: "Active Production",
    description:
      "Listen, speak, read, write—all four skills developed in harmony. Real fluency requires active engagement, not passive consumption.",
    stat: "4",
    statLabel: "Skills integrated",
  },
  {
    icon: Globe,
    title: "Cultural Context",
    description:
      "Language lives in culture. Every lesson weaves in authentic expressions, idioms, and cultural nuances from native speakers.",
    stat: "100%",
    statLabel: "Authentic content",
  },
];

const milestones = [
  {
    year: "2024",
    title: "The Deep End",
    description:
      "Frustrated with traditional apps, we dove into research on natural language acquisition and comprehensible input theory.",
  },
  {
    year: "2025",
    title: "First Currents",
    description:
      "Built the first prototype with French foundation lessons. Early beta testers reported breakthrough moments within weeks.",
  },
  {
    year: "2026",
    title: "Rising Tide",
    description:
      "Launched publicly with French, German, and Italian. Thousands of learners now navigating their language journeys with Fluensea.",
  },
  {
    year: "Future",
    title: "Endless Ocean",
    description:
      "Expanding to more languages, adding conversation partners, and building the most comprehensive natural learning platform.",
  },
];

const stats = [
  {
    value: "10,000+",
    label: "Active Learners",
    icon: Users,
  },
  {
    value: "1M+",
    label: "Lessons Completed",
    icon: BookOpen,
  },
  {
    value: "3",
    label: "Languages Available",
    icon: Globe,
  },
  {
    value: "95%",
    label: "Satisfaction Rate",
    icon: Heart,
  },
];

export default function AboutPage() {
  return (
    <main className="bg-background text-foreground antialiased with-swim-bg min-h-screen">
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
                  Sign Up
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ========== HERO SECTION ========== */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        {/* Ocean ambient background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/4 left-1/3 w-[600px] h-[600px] bg-ocean-turquoise/[0.06] rounded-full blur-[120px] animate-pulse-glow" />
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-ocean-teal/[0.05] rounded-full blur-[100px]" />
        </div>

        <div className="max-w-4xl mx-auto text-center">
          <ScrollReveal>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-ocean-turquoise transition-colors mb-8 group"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              Back to home
            </Link>
          </ScrollReveal>

          <ScrollReveal delay={100}>
            <p className="text-sm font-light tracking-[0.2em] uppercase text-ocean-turquoise mb-6">
              Our Story
            </p>
          </ScrollReveal>

          <ScrollReveal delay={200}>
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-light tracking-tight mb-8">
              Language learning,{" "}
              <span className="font-serif italic text-gradient-turquoise">
                reimagined.
              </span>
            </h1>
          </ScrollReveal>

          <ScrollReveal delay={300}>
            <p className="text-xl md:text-2xl text-muted-foreground font-light max-w-2xl mx-auto leading-relaxed">
              We're building the most natural way to acquire a new language.
              Inspired by the ocean's depth and flow, guided by science,
              designed for humans.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ========== MISSION SECTION ========== */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <ScrollReveal>
            <Card className="border-ocean-turquoise/40 overflow-hidden">
              <CardContent className="p-12 md:p-16">
                <div className="flex flex-col md:flex-row items-center gap-12">
                  <div className="flex-shrink-0">
                    <div className="w-20 h-20 rounded-3xl bg-ocean-turquoise/10 flex items-center justify-center">
                      <Anchor className="w-10 h-10 text-ocean-turquoise" />
                    </div>
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <h2 className="text-3xl md:text-4xl font-light tracking-tight mb-4">
                      Our{" "}
                      <span className="font-serif italic text-gradient-turquoise">
                        Mission
                      </span>
                    </h2>
                    <p className="text-lg text-muted-foreground font-light leading-relaxed">
                      To make language acquisition as natural as learning to
                      swim—immersive, intuitive, and ultimately joyful. We
                      believe everyone should experience the freedom of fluency
                      without the friction of traditional learning methods.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </ScrollReveal>
        </div>
      </section>

      {/* ========== STATS SECTION ========== */}
      <section className="py-20 px-6 bg-gradient-to-b from-transparent to-ocean-midnight/30">
        <div className="max-w-6xl mx-auto">
          <ScrollReveal>
            <div className="text-center mb-16">
              <p className="text-sm font-light tracking-[0.2em] uppercase text-ocean-turquoise mb-4">
                Impact
              </p>
              <h2 className="text-4xl md:text-5xl font-light tracking-tight">
                Growing{" "}
                <span className="font-serif italic text-gradient-turquoise">
                  together
                </span>
              </h2>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <ScrollReveal key={index} delay={index * 100}>
                <Card className="text-center hover:border-ocean-turquoise/90 transition-all duration-300">
                  <CardContent className="pt-8 pb-8">
                    <div className="w-12 h-12 rounded-2xl bg-ocean-turquoise/10 flex items-center justify-center mx-auto mb-4">
                      <stat.icon className="w-6 h-6 text-ocean-turquoise" />
                    </div>
                    <div className="text-3xl font-light mb-2 text-gradient-turquoise">
                      {stat.value}
                    </div>
                    <div className="text-sm text-muted-foreground font-light">
                      {stat.label}
                    </div>
                  </CardContent>
                </Card>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ========== CORE VALUES ========== */}
      <section className="py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <ScrollReveal>
            <div className="text-center mb-16">
              <p className="text-sm font-light tracking-[0.2em] uppercase text-ocean-turquoise mb-4">
                Our Values
              </p>
              <h2 className="text-4xl md:text-5xl font-light tracking-tight mb-6">
                What we{" "}
                <span className="font-serif italic text-gradient-turquoise">
                  believe
                </span>
              </h2>
              <p className="text-lg text-muted-foreground font-light max-w-2xl mx-auto">
                These principles guide every decision we make, from product
                design to customer support.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {coreValues.map((value, index) => (
              <ScrollReveal key={index} delay={index * 100}>
                <Card className="h-full hover:border-ocean-turquoise/90 transition-all duration-300 hover:-translate-y-1">
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-ocean-turquoise/10 flex items-center justify-center flex-shrink-0">
                        <value.icon className="w-7 h-7 text-ocean-turquoise" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="mb-3">{value.title}</CardTitle>
                        <CardDescription className="text-base leading-relaxed">
                          {value.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ========== OUR APPROACH ========== */}
      <section className="py-32 px-6 bg-gradient-to-b from-ocean-midnight/30 to-transparent">
        <div className="max-w-6xl mx-auto">
          <ScrollReveal>
            <div className="text-center mb-16">
              <p className="text-sm font-light tracking-[0.2em] uppercase text-ocean-turquoise mb-4">
                Methodology
              </p>
              <h2 className="text-4xl md:text-5xl font-light tracking-tight mb-6">
                How we{" "}
                <span className="font-serif italic text-gradient-turquoise">
                  teach
                </span>
              </h2>
              <p className="text-lg text-muted-foreground font-light max-w-2xl mx-auto">
                Our approach combines proven research with modern technology to
                create an optimal learning experience.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {approach.map((item, index) => (
              <ScrollReveal key={index} delay={index * 100}>
                <Card className="h-full hover:border-ocean-turquoise/90 transition-all duration-300">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="w-14 h-14 rounded-2xl bg-ocean-turquoise/10 flex items-center justify-center flex-shrink-0">
                        <item.icon className="w-7 h-7 text-ocean-turquoise" />
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-light text-ocean-turquoise">
                          {item.stat}
                        </div>
                        <div className="text-xs text-muted-foreground font-light">
                          {item.statLabel}
                        </div>
                      </div>
                    </div>
                    <CardTitle className="mb-3">{item.title}</CardTitle>
                    <CardDescription className="text-base leading-relaxed">
                      {item.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ========== JOURNEY TIMELINE ========== */}
      <section className="py-32 px-6">
        <div className="max-w-4xl mx-auto">
          <ScrollReveal>
            <div className="text-center mb-16">
              <p className="text-sm font-light tracking-[0.2em] uppercase text-ocean-turquoise mb-4">
                Our Journey
              </p>
              <h2 className="text-4xl md:text-5xl font-light tracking-tight">
                Charting{" "}
                <span className="font-serif italic text-gradient-turquoise">
                  our course
                </span>
              </h2>
            </div>
          </ScrollReveal>

          <div className="space-y-8">
            {milestones.map((milestone, index) => (
              <ScrollReveal key={index} delay={index * 100}>
                <div className="relative">
                  {/* Timeline line */}
                  {index < milestones.length - 1 && (
                    <div className="absolute left-[3.5rem] top-20 bottom-0 w-[1.5px] bg-gradient-to-b from-ocean-turquoise/40 to-transparent" />
                  )}

                  <Card className="relative hover:border-ocean-turquoise/90 transition-all duration-300">
                    <CardContent className="p-8">
                      <div className="flex items-start gap-6">
                        <div className="flex-shrink-0">
                          <div className="w-14 h-14 rounded-2xl bg-ocean-turquoise/10 border-[1.5px] border-ocean-turquoise/40 flex items-center justify-center backdrop-blur-sm">
                            <span className="text-sm font-light text-ocean-turquoise">
                              {milestone.year}
                            </span>
                          </div>
                        </div>
                        <div className="flex-1 pt-2">
                          <h3 className="text-2xl font-light mb-3">
                            {milestone.title}
                          </h3>
                          <p className="text-muted-foreground font-light leading-relaxed">
                            {milestone.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ========== PHILOSOPHY SECTION ========== */}
      <section className="py-32 px-6 bg-gradient-to-b from-transparent to-ocean-midnight/30">
        <div className="max-w-4xl mx-auto">
          <ScrollReveal>
            <div className="text-center mb-16">
              <p className="text-sm font-light tracking-[0.2em] uppercase text-ocean-turquoise mb-4">
                Philosophy
              </p>
              <h2 className="text-4xl md:text-5xl font-light tracking-tight mb-6">
                The ocean{" "}
                <span className="font-serif italic text-gradient-turquoise">
                  metaphor
                </span>
              </h2>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={200}>
            <Card className="border-ocean-turquoise/40">
              <CardContent className="p-10 md:p-12">
                <div className="space-y-6 text-lg font-light leading-relaxed text-muted-foreground">
                  <p>
                    Why the ocean? Because language learning{" "}
                    <span className="text-foreground font-normal">
                      mirrors the experience of diving into water
                    </span>
                    . At first, you're cautious, testing the depths. But as you
                    immerse yourself, natural currents guide you. You learn to
                    float, then swim, then glide effortlessly.
                  </p>
                  <p>
                    The ocean has layers—surface warmth, mid-water currents,
                    deep trenches. Language is the same. You start with familiar
                    shores, venture into deeper comprehension, and eventually
                    explore the profound depths of native-level fluency.
                  </p>
                  <p>
                    Our design reflects this:{" "}
                    <span className="text-ocean-turquoise font-normal">
                      deep midnight navy backgrounds
                    </span>{" "}
                    for immersion,{" "}
                    <span className="text-ocean-turquoise font-normal">
                      turquoise accents
                    </span>{" "}
                    for clarity and energy,{" "}
                    <span className="text-ocean-sand font-normal">
                      warm sand text
                    </span>{" "}
                    for comfort. Every animation flows like water. Every
                    transition feels like a gentle current.
                  </p>
                  <p className="text-foreground font-normal italic">
                    "You don't memorize the ocean—you learn to navigate it. The
                    same is true for language."
                  </p>
                </div>
              </CardContent>
            </Card>
          </ScrollReveal>
        </div>
      </section>

      {/* ========== WHY WE EXIST ========== */}
      <section className="py-32 px-6">
        <div className="max-w-4xl mx-auto">
          <ScrollReveal>
            <Card className="border-ocean-turquoise/40 overflow-hidden">
              <CardContent className="p-12 md:p-16 text-center">
                <div className="w-16 h-16 rounded-3xl bg-ocean-turquoise/10 flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="w-8 h-8 text-ocean-turquoise" />
                </div>
                <h2 className="text-3xl md:text-4xl font-light tracking-tight mb-6">
                  Why we{" "}
                  <span className="font-serif italic text-gradient-turquoise">
                    exist
                  </span>
                </h2>
                <p className="text-lg font-light leading-relaxed text-muted-foreground max-w-2xl mx-auto mb-8">
                  Traditional language apps feel like work—endless flashcards,
                  gamified streaks, robotic phrases. We believe language
                  acquisition should feel like discovery, not duty. Every
                  conversation unlocked, every native speaker understood, every
                  cultural barrier dissolved—
                  <span className="text-foreground font-normal">
                    that's the magic we're chasing
                  </span>
                  .
                </p>
                <p className="text-base font-light italic text-muted-foreground">
                  Language is freedom. We're here to help you find it.
                </p>
              </CardContent>
            </Card>
          </ScrollReveal>
        </div>
      </section>

      {/* ========== CTA SECTION ========== */}
      <section className="py-32 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <ScrollReveal>
            <div className="w-14 h-14 rounded-2xl bg-ocean-turquoise/10 flex items-center justify-center mx-auto mb-6">
              <Waves className="w-7 h-7 text-ocean-turquoise" />
            </div>
          </ScrollReveal>

          <ScrollReveal delay={100}>
            <h2 className="text-4xl md:text-5xl font-light tracking-tight mb-6">
              Ready to dive in?
            </h2>
          </ScrollReveal>

          <ScrollReveal delay={200}>
            <p className="text-lg text-muted-foreground font-light mb-8 max-w-xl mx-auto">
              Join thousands of learners who've discovered a better way to
              acquire language. Start your journey today.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={300}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/auth/signup">
                <Button
                  size="lg"
                  className="h-14 px-8 text-base font-medium rounded-full group"
                >
                  Start learning free
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button
                  variant="secondary"
                  size="lg"
                  className="h-14 px-8 text-base font-medium rounded-full"
                >
                  View pricing
                </Button>
              </Link>
            </div>
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
                className="text-sm text-ocean-turquoise font-light"
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
