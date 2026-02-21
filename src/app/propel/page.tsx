"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { OceanBackground, OceanNavigation } from "@/components/ocean";
import {
  BookOpen,
  PenLine,
  Layers,
  GitBranch,
  Mic,
  Compass,
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
    gradient: "from-[#0d2137]/80 to-[#0a1628]/90",
  },
  {
    slug: "cloze",
    name: "Cloze Activities",
    description: "Fill the gaps. Train your instincts.",
    Icon: PenLine,
    gradient: "from-[#0d2137]/80 to-[#0a1628]/90",
  },
  {
    slug: "flashcards",
    name: "Flashcards",
    description: "Surface and reinforce. Anki-style recall.",
    Icon: Layers,
    gradient: "from-[#0d2137]/80 to-[#0a1628]/90",
  },
  {
    slug: "conjugation",
    name: "Conjugation Drills",
    description: "Master verb forms under pressure.",
    Icon: GitBranch,
    gradient: "from-[#0d2137]/80 to-[#0a1628]/90",
  },
  {
    slug: "pronunciation",
    name: "Pronunciation Training",
    description: "Speak. Shadow. Sound native.",
    Icon: Mic,
    gradient: "from-[#0d2137]/80 to-[#0a1628]/90",
  },
  {
    slug: "grammar",
    name: "Grammar Explanations",
    description: "Understand the currents beneath the words.",
    Icon: Compass,
    gradient: "from-[#0d2137]/80 to-[#0a1628]/90",
  },
] as const;

// ============================================================================
// Mode Card
// ============================================================================
function ModeCard({
  slug,
  name,
  description,
  Icon,
  gradient,
}: {
  slug: string;
  name: string;
  description: string;
  Icon: React.ElementType;
  gradient: string;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link href={`/propel/${slug}`} className="group block focus:outline-none">
      <div
        className={cn(
          "relative rounded-2xl border border-white/10 p-6 h-full",
          "bg-gradient-to-br",
          gradient,
          "transition-all duration-300 ease-out cursor-pointer",
          "flex flex-col gap-4",
          hovered
            ? "border-[var(--turquoise)]/50 shadow-[0_0_24px_rgba(61,214,181,0.18)] -translate-y-1"
            : "hover:border-[var(--turquoise)]/30 hover:shadow-[0_0_16px_rgba(61,214,181,0.10)] hover:-translate-y-0.5",
        )}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Icon container */}
        <div
          className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300",
            hovered
              ? "bg-[var(--turquoise)]/20"
              : "bg-white/5 group-hover:bg-[var(--turquoise)]/10",
          )}
        >
          <Icon
            className={cn(
              "w-6 h-6 transition-colors duration-300",
              hovered ? "text-[var(--turquoise)]" : "text-[var(--seafoam)]",
            )}
          />
        </div>

        {/* Text */}
        <div className="flex-1 space-y-1.5">
          <h3
            className="font-display text-lg font-semibold leading-tight"
            style={{ color: "var(--sand)" }}
          >
            {name}
          </h3>
          <p
            className="text-sm font-body leading-relaxed"
            style={{ color: "var(--seafoam)", opacity: 0.8 }}
          >
            {description}
          </p>
        </div>

        {/* Start arrow */}
        <div className="flex items-center justify-end mt-auto pt-2">
          <div
            className={cn(
              "flex items-center gap-1.5 text-xs font-body font-medium transition-all duration-300",
              hovered
                ? "opacity-100 translate-x-0"
                : "opacity-40 group-hover:opacity-70",
            )}
            style={{ color: "var(--turquoise)" }}
          >
            <span>Start</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Subtle inner glow on hover */}
        {hovered && (
          <div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at top left, rgba(61,214,181,0.05) 0%, transparent 60%)",
            }}
          />
        )}
      </div>
    </Link>
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
}: {
  streak: number;
  avatarUrl?: string;
  targetLanguage: string;
  isAdmin: boolean;
}) {
  return (
    <OceanBackground>
      <OceanNavigation
        streak={streak}
        avatarUrl={avatarUrl}
        currentPath="/propel"
        isAdmin={isAdmin}
        targetLanguage={targetLanguage}
      />

      <div className="relative z-10 min-h-screen pt-28 pb-20 px-6">
        <div className="max-w-5xl mx-auto">
          {/* Page header */}
          <div className="mb-12 space-y-3">
            <h1
              className="font-display text-5xl md:text-6xl font-bold tracking-tight"
              style={{ color: "var(--sand)" }}
            >
              Propel
            </h1>
            <p
              className="font-body text-lg md:text-xl"
              style={{ color: "var(--seafoam)", opacity: 0.75 }}
            >
              Choose your training. Build your depth.
            </p>

            {/* Decorative accent line */}
            <div
              className="h-px w-16 mt-4"
              style={{
                background:
                  "linear-gradient(90deg, var(--turquoise) 0%, transparent 100%)",
              }}
            />
          </div>

          {/* Mode grid: 1 col → 2 col → 3 col */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {PRACTICE_MODES.map((mode) => (
              <ModeCard key={mode.slug} {...mode} />
            ))}
          </div>
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
    return (
      <OceanBackground>
        <div className="flex items-center justify-center min-h-screen">
          <div
            className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: "var(--turquoise)" }}
          />
        </div>
      </OceanBackground>
    );
  }

  return (
    <ProtectedRoute>
      <PropelContent
        streak={streak}
        avatarUrl={avatarUrl}
        targetLanguage={targetLanguage}
        isAdmin={isAdmin}
      />
    </ProtectedRoute>
  );
}
