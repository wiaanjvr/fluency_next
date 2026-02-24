"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import {
  OceanBackground,
  OceanNavigation,
  DepthSidebar,
} from "@/components/ocean";
import LoadingScreen from "@/components/ui/LoadingScreen";
import { useAmbientPlayer } from "@/contexts/AmbientPlayerContext";
import {
  BookOpen,
  PenLine,
  Layers,
  GitBranch,
  Mic,
  Compass,
  MessageCircle,
  Swords,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import "@/styles/ocean-theme.css";

// ============================================================================
// Mode definitions
// ============================================================================
const PRACTICE_MODES = [
  {
    slug: "free-reading",
    name: "Free Reading",
    description: "Dive into native texts at your level.",
    Icon: BookOpen,
    skills: ["Reading"],
  },
  {
    slug: "cloze",
    name: "Cloze Activities",
    description: "Fill the gaps. Train your instincts.",
    Icon: PenLine,
    skills: ["Writing", "Reading"],
  },
  {
    slug: "flashcards",
    name: "Flashcards",
    description: "Surface and reinforce. Anki-style recall.",
    Icon: Layers,
    skills: ["Vocabulary"],
  },
  {
    slug: "conjugation",
    name: "Conjugation Drills",
    description: "Master verb forms under pressure.",
    Icon: GitBranch,
    skills: ["Grammar", "Writing"],
  },
  {
    slug: "pronunciation",
    name: "Pronunciation",
    description: "Speak. Shadow. Sound native.",
    Icon: Mic,
    skills: ["Speaking"],
  },
  {
    slug: "grammar",
    name: "Grammar",
    description: "Understand the currents beneath the words.",
    Icon: Compass,
    skills: ["Grammar", "Reading"],
  },
  {
    slug: "conversation",
    name: "Conversation",
    description: "Speak freely. An AI listens, responds, corrects.",
    Icon: MessageCircle,
    skills: ["Speaking", "Listening"],
  },
  {
    slug: "duel",
    name: "Duel",
    description: "Challenge a friend. Prove your depth.",
    Icon: Swords,
    skills: ["Competition"],
  },
] as const;

// Skill label → colour theme
const SKILL_MAP: Record<string, { bg: string; color: string }> = {
  Reading: { bg: "rgba(61,214,181,0.12)", color: "var(--turquoise)" },
  Writing: { bg: "rgba(138,180,248,0.12)", color: "#8ab4f8" },
  Speaking: { bg: "rgba(249,168,212,0.12)", color: "#f9a8d4" },
  Listening: { bg: "rgba(253,224,132,0.12)", color: "#fde084" },
  Grammar: { bg: "rgba(167,139,250,0.12)", color: "#a78bfa" },
  Vocabulary: { bg: "rgba(61,214,181,0.12)", color: "var(--turquoise)" },
  Competition: { bg: "rgba(251,146,60,0.12)", color: "#fb923c" },
};

// ============================================================================
// Mode Grid
// ============================================================================
function ModeGrid() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {PRACTICE_MODES.map((mode) => {
        const Icon = mode.Icon;
        return (
          <Link
            key={mode.slug}
            href={`/propel/${mode.slug}`}
            className="group focus:outline-none"
          >
            <div
              className={cn(
                "relative h-full flex flex-col gap-4 rounded-2xl overflow-hidden",
                "border border-white/[0.07]",
                "bg-gradient-to-b from-[#0e2340]/90 to-[#091527]/95",
                "p-5 cursor-pointer",
                "transition-all duration-300 ease-out",
                "hover:border-[var(--turquoise)]/40",
                "hover:shadow-[0_8px_32px_rgba(61,214,181,0.08)]",
                "hover:-translate-y-0.5",
              )}
            >
              {/* Ambient glow — top-right corner on hover */}
              <div
                className="absolute -top-6 -right-6 w-20 h-20 rounded-full pointer-events-none
                            opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  background:
                    "radial-gradient(circle, rgba(61,214,181,0.18) 0%, transparent 70%)",
                }}
              />

              {/* Icon */}
              <div
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                  "bg-[var(--turquoise)]/10",
                  "group-hover:bg-[var(--turquoise)]/[0.18] transition-colors duration-300",
                )}
              >
                <Icon className="w-[18px] h-[18px] text-[var(--turquoise)]" />
              </div>

              {/* Name + description */}
              <div className="flex-1 space-y-1">
                <h3
                  className="font-display text-[15px] font-bold leading-snug"
                  style={{ color: "var(--sand)" }}
                >
                  {mode.name}
                </h3>
                <p
                  className="font-body text-[12px] leading-relaxed"
                  style={{ color: "var(--seafoam)", opacity: 0.65 }}
                >
                  {mode.description}
                </p>
              </div>

              {/* Footer: skill chips + directional arrow */}
              <div className="flex items-end justify-between gap-2 mt-auto">
                <div className="flex flex-wrap gap-1">
                  {mode.skills.map((skill) => {
                    const s =
                      SKILL_MAP[skill as keyof typeof SKILL_MAP] ??
                      SKILL_MAP.Vocabulary;
                    return (
                      <span
                        key={skill}
                        className="font-body text-[10px] font-medium px-2 py-0.5 rounded-full"
                        style={{ background: s.bg, color: s.color }}
                      >
                        {skill}
                      </span>
                    );
                  })}
                </div>
                <ArrowRight
                  className="w-3.5 h-3.5 flex-shrink-0 opacity-0 group-hover:opacity-60
                             translate-x-0 group-hover:translate-x-0.5 transition-all duration-300"
                  style={{ color: "var(--turquoise)" }}
                />
              </div>

              {/* Bottom accent line */}
              <div
                className="absolute bottom-0 left-0 right-0 h-[1.5px]
                            opacity-0 group-hover:opacity-40 transition-opacity duration-500"
                style={{
                  background:
                    "linear-gradient(90deg, transparent 0%, var(--turquoise) 50%, transparent 100%)",
                }}
              />
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// ============================================================================
// Propel Content
// ============================================================================
function PropelContent({
  streak,
  avatarUrl,
  targetLanguage,
  isAdmin,
  wordsEncountered,
}: {
  streak: number;
  avatarUrl?: string;
  targetLanguage: string;
  isAdmin: boolean;
  wordsEncountered: number;
}) {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);
  const { ambientView, setAmbientView } = useAmbientPlayer();

  // Ensure soundbar is visible when arriving on Propel while ambient is active
  // (SoundContainer only exists on the dashboard, so switch to soundbar view)
  useEffect(() => {
    if (ambientView === "container") {
      setAmbientView("soundbar");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Disable page scroll while on Propel to prevent scrollbar flicker
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "auto";
    return () => {
      document.body.style.overflow = prev || "";
    };
  }, []);

  const handleNavigation = useCallback(
    (href: string) => {
      setIsNavigating(true);
      router.push(href);
    },
    [router],
  );

  if (isNavigating) {
    return <LoadingScreen />;
  }

  return (
    <OceanBackground>
      {/* Depth sidebar — mirrors dashboard (non-scrollable on Propel) */}
      <DepthSidebar wordCount={wordsEncountered} scrollable={false} />

      <OceanNavigation
        streak={streak}
        avatarUrl={avatarUrl}
        currentPath="/propel"
        isAdmin={isAdmin}
        targetLanguage={targetLanguage}
        wordsEncountered={wordsEncountered}
        onBeforeNavigate={handleNavigation}
      />

      <div className="relative z-10 min-h-screen pt-24 pb-16 px-6 lg:pl-[370px]">
        <div className="max-w-5xl mx-auto w-full">
          {/* ── Page header ── */}
          <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-3">
            <div className="space-y-1">
              <h1
                className="font-display text-4xl md:text-5xl font-bold tracking-tight"
                style={{ color: "var(--sand)" }}
              >
                Propel
              </h1>
              <p
                className="font-body text-base md:text-lg"
                style={{ color: "var(--seafoam)", opacity: 0.65 }}
              >
                Choose your training. Build your depth.
              </p>
            </div>
            {/* Decorative accent line — desktop only */}
            <div
              className="hidden md:block h-px w-24 mb-1.5 flex-shrink-0"
              style={{
                background:
                  "linear-gradient(90deg, var(--turquoise) 0%, transparent 100%)",
                opacity: 0.4,
              }}
            />
          </div>

          {/* ── Training mode grid ── */}
          <ModeGrid />
        </div>
      </div>
    </OceanBackground>
  );
}

// ============================================================================
// Page — fetches user data, guards auth
// ============================================================================
export default function PropelPage() {
  const router = useRouter();
  const supabase = createClient();

  const [streak, setStreak] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>();
  const [targetLanguage, setTargetLanguage] = useState("fr");
  const [isAdmin, setIsAdmin] = useState(false);
  const [wordsEncountered, setWordsEncountered] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/auth/login");
        return;
      }

      setAvatarUrl(
        user.user_metadata?.avatar_url || user.user_metadata?.picture,
      );

      const { data: profile } = await supabase
        .from("profiles")
        .select("streak, target_language, subscription_tier")
        .eq("id", user.id)
        .single();

      if (profile) {
        setStreak(profile.streak ?? 0);
        setTargetLanguage(profile.target_language ?? "fr");
      }

      const { data: allWords } = await supabase
        .from("learner_words_v2")
        .select("id")
        .eq("user_id", user.id)
        .eq("language", profile?.target_language ?? "fr");

      setWordsEncountered(allWords?.length ?? 0);

      const { data: adminRow } = await supabase
        .from("admin_users")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      setIsAdmin(!!adminRow);
      setLoading(false);
    };

    load();
  }, [supabase, router]);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <ProtectedRoute>
      <PropelContent
        streak={streak}
        avatarUrl={avatarUrl}
        targetLanguage={targetLanguage}
        isAdmin={isAdmin}
        wordsEncountered={wordsEncountered}
      />
    </ProtectedRoute>
  );
}
