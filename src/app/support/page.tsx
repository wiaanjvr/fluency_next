"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Mail,
  MessageCircle,
  BookOpen,
  HelpCircle,
  Zap,
  Settings,
  CreditCard,
  Users,
  Send,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { useState } from "react";

/* =============================================================================
   SUPPORT PAGE - FLUENSEA OCEAN THEME
   
   Following the design system:
   - Ocean immersion theme with turquoise accents
   - font-light typography, generous spacing
   - ScrollReveal animations
   - Rounded cards with ocean borders
============================================================================= */

const helpCategories = [
  {
    icon: BookOpen,
    title: "Getting Started",
    description: "Learn how to begin your language journey",
    topics: [
      "How do I start my first lesson?",
      "Understanding proficiency levels",
      "Choosing your target language",
      "Navigating the dashboard",
    ],
  },
  {
    icon: Zap,
    title: "Learning System",
    description: "Master the spaced repetition algorithm",
    topics: [
      "How does SRS work?",
      "Word status progression",
      "Daily lesson limits",
      "Comprehension scoring",
    ],
  },
  {
    icon: CreditCard,
    title: "Billing & Subscription",
    description: "Manage your Pro subscription",
    topics: [
      "Upgrading to Pro",
      "Refund policy (7-day guarantee)",
      "Changing payment method",
      "Canceling subscription",
    ],
  },
  {
    icon: Settings,
    title: "Account & Settings",
    description: "Customize your learning experience",
    topics: [
      "Updating profile information",
      "Changing target language",
      "Privacy & data settings",
      "Deleting your account",
    ],
  },
];

const faqs = [
  {
    category: "General",
    questions: [
      {
        q: "What makes Fluensea different from other language apps?",
        a: "Fluensea uses a comprehension-first approach inspired by ocean immersion. We focus on natural language acquisition through comprehensible input, not memorization. Our adaptive SRS algorithm adjusts to your learning pace, like flowing with ocean currents.",
      },
      {
        q: "Which languages can I learn?",
        a: "Currently, we support French, German, and Italian with English as the native language. More languages are coming soon based on community demand.",
      },
      {
        q: "How long does it take to become fluent?",
        a: "Language acquisition is personal, like diving at your own pace. Most learners see significant progress in 3-6 months with consistent daily practice. Fluensea tracks your proficiency from A1 to C2 using CEFR standards.",
      },
    ],
  },
  {
    category: "Learning",
    questions: [
      {
        q: "What are daily lesson limits on the free plan?",
        a: "Free users can complete 5 lessons per day. This helps maintain sustainable learning habits while giving you a taste of our platform. Pro users have unlimited lessons.",
      },
      {
        q: "How does the spaced repetition system work?",
        a: "Our SRS algorithm schedules word reviews based on your performance. Words you struggle with appear more frequently, while mastered words surface at optimal intervals for long-term retention. It's like the ocean's natural rhythm.",
      },
      {
        q: "Can I practice offline?",
        a: "Offline mode is available exclusively for Pro subscribers. Download lessons beforehand and practice anywhere, even in the depths without internet.",
      },
    ],
  },
  {
    category: "Subscription",
    questions: [
      {
        q: "What's included in Pro?",
        a: "Pro unlocks unlimited lessons, offline mode, advanced SRS, speech recognition, personalized learning paths, detailed analytics, and priority support. See our pricing page for full details.",
      },
      {
        q: "Do you offer refunds?",
        a: "Yes! We offer a 7-day money-back guarantee on all subscriptions. If you're not satisfied within 7 days of subscribing, request a full refund from your settings page.",
      },
      {
        q: "Can I switch between monthly and yearly plans?",
        a: "Absolutely. You can upgrade from monthly to yearly anytime to save ~17%. Changes take effect at your next billing cycle.",
      },
    ],
  },
  {
    category: "Technical",
    questions: [
      {
        q: "Which browsers are supported?",
        a: "Fluensea works best on modern browsers: Chrome, Firefox, Safari, and Edge (latest versions). We recommend keeping your browser updated for the best experience.",
      },
      {
        q: "I'm having audio issues. What should I do?",
        a: "First, check your device volume and browser permissions. If issues persist, try a different browser or clear your cache. Still stuck? Contact our support team below.",
      },
      {
        q: "My progress isn't syncing. Help!",
        a: "Make sure you're logged in and have a stable internet connection. Progress saves automatically after each lesson. If data seems lost, try refreshing the page. Contact us if the issue continues.",
      },
    ],
  },
];

const quickActions = [
  {
    icon: MessageCircle,
    title: "Join our Community",
    description: "Connect with fellow learners",
    href: "#",
    external: true,
  },
  {
    icon: BookOpen,
    title: "Read the Documentation",
    description: "Detailed guides and tutorials",
    href: "#",
    external: true,
  },
  {
    icon: Users,
    title: "Schedule a Demo",
    description: "1-on-1 walkthrough with our team",
    href: "#",
    external: true,
  },
];

export default function SupportPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setSubmitted(true);
    setSubmitting(false);
    setFormData({ name: "", email: "", subject: "", message: "" });

    // Reset success message after 5 seconds
    setTimeout(() => setSubmitted(false), 5000);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

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
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-ocean-turquoise/[0.05] rounded-full blur-[100px] animate-pulse-glow" />
          <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] bg-ocean-teal/[0.04] rounded-full blur-[80px]" />
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
              Support Center
            </p>
          </ScrollReveal>

          <ScrollReveal delay={200}>
            <h1 className="w-full text-5xl sm:text-6xl md:text-7xl font-light tracking-tight mb-6">
              How can we{" "}
              <span className="font-serif italic text-gradient-turquoise">
                help?
              </span>
            </h1>
          </ScrollReveal>

          <ScrollReveal delay={300}>
            <p className="text-xl text-muted-foreground font-light max-w-2xl mx-auto">
              Navigate through our help resources or reach out directly. We're
              here to guide you on your language journey.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ========== HELP CATEGORIES ========== */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <ScrollReveal>
            <h2 className="text-3xl font-light tracking-tight mb-12 text-center">
              Browse by category
            </h2>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {helpCategories.map((category, index) => (
              <ScrollReveal key={index} delay={index * 100}>
                <Card className="h-full hover:border-ocean-turquoise/90 transition-all duration-300 hover:-translate-y-1">
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-ocean-turquoise/10 flex items-center justify-center flex-shrink-0">
                        <category.icon className="w-6 h-6 text-ocean-turquoise" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="mb-2">{category.title}</CardTitle>
                        <CardDescription>
                          {category.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {category.topics.map((topic, idx) => (
                        <li key={idx}>
                          <button className="text-sm text-muted-foreground hover:text-ocean-turquoise transition-colors font-light flex items-center gap-2 group w-full text-left">
                            <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                            {topic}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ========== FAQ SECTION ========== */}
      <section className="py-20 px-6 bg-gradient-to-b from-transparent to-ocean-midnight/30">
        <div className="max-w-4xl mx-auto">
          <ScrollReveal>
            <div className="text-center mb-16">
              <p className="text-sm font-light tracking-[0.2em] uppercase text-ocean-turquoise mb-4">
                Common Questions
              </p>
              <h2 className="text-4xl md:text-5xl font-light tracking-tight">
                Frequently Asked{" "}
                <span className="font-serif italic text-gradient-turquoise">
                  Questions
                </span>
              </h2>
            </div>
          </ScrollReveal>

          <div className="space-y-12">
            {faqs.map((section, sectionIndex) => (
              <ScrollReveal key={section.category} delay={sectionIndex * 50}>
                <div>
                  <h3 className="text-xl font-light text-ocean-turquoise mb-6 flex items-center gap-2">
                    <HelpCircle className="w-5 h-5" />
                    {section.category}
                  </h3>
                  <div className="space-y-6">
                    {section.questions.map((faq, faqIndex) => (
                      <Card
                        key={faqIndex}
                        className="border-ocean-turquoise/30"
                      >
                        <CardHeader>
                          <CardTitle className="text-lg">{faq.q}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-muted-foreground font-light leading-relaxed">
                            {faq.a}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ========== QUICK ACTIONS ========== */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <ScrollReveal>
            <h2 className="text-3xl font-light tracking-tight mb-12 text-center">
              More ways to get help
            </h2>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {quickActions.map((action, index) => (
              <ScrollReveal key={index} delay={index * 100}>
                <a
                  href={action.href}
                  target={action.external ? "_blank" : undefined}
                  rel={action.external ? "noopener noreferrer" : undefined}
                  className="block group"
                >
                  <Card className="h-full text-center hover:border-ocean-turquoise/90 transition-all duration-300 hover:-translate-y-1">
                    <CardContent className="pt-8 pb-8">
                      <div className="w-14 h-14 rounded-2xl bg-ocean-turquoise/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-ocean-turquoise/20 transition-colors">
                        <action.icon className="w-7 h-7 text-ocean-turquoise" />
                      </div>
                      <h3 className="text-lg font-light mb-2 flex items-center justify-center gap-2">
                        {action.title}
                        {action.external && (
                          <ExternalLink className="w-4 h-4 opacity-50" />
                        )}
                      </h3>
                      <p className="text-sm text-muted-foreground font-light">
                        {action.description}
                      </p>
                    </CardContent>
                  </Card>
                </a>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ========== CONTACT FORM ========== */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <ScrollReveal>
            <div className="text-center mb-12">
              <p className="text-sm font-light tracking-[0.2em] uppercase text-ocean-turquoise mb-4">
                Still need help?
              </p>
              <h2 className="text-4xl md:text-5xl font-light tracking-tight mb-4">
                Send us a{" "}
                <span className="font-serif italic text-gradient-turquoise">
                  message
                </span>
              </h2>
              <p className="text-lg text-muted-foreground font-light">
                We typically respond within 24 hours
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={200}>
            <Card className="border-ocean-turquoise/40">
              <CardContent className="pt-8">
                {submitted ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-ocean-turquoise/10 flex items-center justify-center mx-auto mb-4">
                      <Mail className="w-8 h-8 text-ocean-turquoise" />
                    </div>
                    <h3 className="text-2xl font-light mb-2">Message sent!</h3>
                    <p className="text-muted-foreground font-light">
                      We've received your message and will respond soon.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label
                          htmlFor="name"
                          className="block text-sm font-light mb-2"
                        >
                          Your Name
                        </label>
                        <Input
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          placeholder="John Doe"
                          required
                          className="bg-background/50"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="email"
                          className="block text-sm font-light mb-2"
                        >
                          Email Address
                        </label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="john@example.com"
                          required
                          className="bg-background/50"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="subject"
                        className="block text-sm font-light mb-2"
                      >
                        Subject
                      </label>
                      <Input
                        id="subject"
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        placeholder="How can we help you?"
                        required
                        className="bg-background/50"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="message"
                        className="block text-sm font-light mb-2"
                      >
                        Message
                      </label>
                      <Textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        placeholder="Tell us what you need help with..."
                        rows={6}
                        required
                        className="bg-background/50 resize-none"
                      />
                    </div>

                    <Button
                      type="submit"
                      size="lg"
                      disabled={submitting}
                      className="w-full rounded-full group"
                    >
                      {submitting ? (
                        "Sending..."
                      ) : (
                        <>
                          Send Message
                          <Send className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </>
                      )}
                    </Button>

                    <p className="text-xs text-muted-foreground/60 text-center font-light">
                      By submitting this form, you agree to our privacy policy
                      and terms of service.
                    </p>
                  </form>
                )}
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
              <MessageCircle className="w-7 h-7 text-ocean-turquoise" />
            </div>
          </ScrollReveal>

          <ScrollReveal delay={100}>
            <h2 className="text-4xl md:text-5xl font-light tracking-tight mb-6">
              Ready to start learning?
            </h2>
          </ScrollReveal>

          <ScrollReveal delay={200}>
            <p className="text-lg text-muted-foreground font-light mb-8 max-w-xl mx-auto">
              Join thousands of learners diving into fluency with Fluensea's
              ocean-inspired learning system.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={300}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/auth/signup">
                <Button
                  size="lg"
                  className="h-14 px-8 text-base font-medium rounded-full"
                >
                  Start free today
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
                href="/support"
                className="text-sm text-ocean-turquoise font-light"
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
