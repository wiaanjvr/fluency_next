"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type TouchEvent as ReactTouchEvent,
} from "react";
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
  ChevronLeft,
  ChevronRight,
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
  {
    slug: "conversation",
    name: "Live Conversation",
    description: "Speak freely. An AI listens, responds, corrects.",
    Icon: MessageCircle,
    gradient: "from-[#0d2137]/80 to-[#0a1628]/90",
  },
  {
    slug: "duel",
    name: "Duel",
    description: "Challenge a friend. Prove your depth.",
    Icon: Swords,
    gradient: "from-[#0d2137]/80 to-[#0a1628]/90",
  },
] as const;

// ============================================================================
// Carousel
// ============================================================================
function ModeCarousel() {
  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState<"left" | "right" | null>(null);
  const touchStartX = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const total = PRACTICE_MODES.length;

  const goTo = useCallback(
    (index: number, dir?: "left" | "right") => {
      const next = ((index % total) + total) % total;
      setDirection(dir ?? (next > active ? "right" : "left"));
      setActive(next);
    },
    [active, total],
  );

  const prev = useCallback(() => goTo(active - 1, "left"), [active, goTo]);
  const next = useCallback(() => goTo(active + 1, "right"), [active, goTo]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [prev, next]);

  // Touch / swipe
  const handleTouchStart = (e: ReactTouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: ReactTouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) {
      dx < 0 ? next() : prev();
    }
    touchStartX.current = null;
  };

  const mode = PRACTICE_MODES[active];
  const Icon = mode.Icon;

  // Neighbours for preview strips
  const prevIdx = (active - 1 + total) % total;
  const nextIdx = (active + 1) % total;

  return (
    <div
      ref={containerRef}
      className="relative select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Main card ── */}
      <Link
        href={`/propel/${mode.slug}`}
        key={mode.slug}
        className="group block focus:outline-none"
      >
        <div
          className={cn(
            "relative rounded-3xl border border-white/10 overflow-hidden",
            "bg-gradient-to-br from-[#0d2137]/80 to-[#0a1628]/90",
            "transition-all duration-500 ease-out cursor-pointer",
            "hover:border-[var(--turquoise)]/40 hover:shadow-[0_0_40px_rgba(61,214,181,0.12)]",
            // Entry animation
            direction === "right"
              ? "animate-in fade-in slide-in-from-right-8 duration-400"
              : direction === "left"
                ? "animate-in fade-in slide-in-from-left-8 duration-400"
                : "animate-in fade-in duration-400",
          )}
        >
          {/* Decorative background glow */}
          <div
            className="absolute -top-20 -right-20 w-72 h-72 rounded-full pointer-events-none opacity-[0.07]"
            style={{
              background:
                "radial-gradient(circle, var(--turquoise) 0%, transparent 70%)",
            }}
          />

          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 p-10 md:p-14">
            {/* Large icon */}
            <div
              className={cn(
                "w-24 h-24 md:w-28 md:h-28 rounded-2xl flex-shrink-0",
                "flex items-center justify-center",
                "bg-[var(--turquoise)]/10 group-hover:bg-[var(--turquoise)]/15",
                "transition-all duration-500",
              )}
            >
              <Icon className="w-12 h-12 md:w-14 md:h-14 transition-colors duration-300 text-[var(--turquoise)]" />
            </div>

            {/* Text content */}
            <div className="flex-1 text-center md:text-left space-y-3">
              <h2
                className="font-display text-3xl md:text-4xl font-bold tracking-tight leading-tight"
                style={{ color: "var(--sand)" }}
              >
                {mode.name}
              </h2>
              <p
                className="font-body text-base md:text-lg leading-relaxed max-w-md"
                style={{ color: "var(--seafoam)", opacity: 0.8 }}
              >
                {mode.description}
              </p>

              {/* CTA */}
              <div
                className={cn(
                  "inline-flex items-center gap-2 mt-2 font-body text-sm font-medium",
                  "opacity-50 group-hover:opacity-100 transition-all duration-300",
                  "group-hover:translate-x-1",
                )}
                style={{ color: "var(--turquoise)" }}
              >
                <span>Start training</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Bottom accent bar */}
          <div
            className="h-[2px] w-full opacity-30 group-hover:opacity-60 transition-opacity duration-500"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, var(--turquoise) 50%, transparent 100%)",
            }}
          />
        </div>
      </Link>

      {/* ── Arrow buttons ── */}
      <button
        onClick={(e) => {
          e.preventDefault();
          prev();
        }}
        className={cn(
          "absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2",
          "md:-translate-x-full md:-ml-3",
          "w-10 h-10 rounded-full flex items-center justify-center",
          "border border-white/10 bg-[#0a1628]/80 backdrop-blur-sm",
          "hover:border-[var(--turquoise)]/30 hover:bg-[var(--turquoise)]/5",
          "transition-all duration-200 cursor-pointer z-20",
        )}
        aria-label="Previous"
      >
        <ChevronLeft className="w-5 h-5" style={{ color: "var(--seafoam)" }} />
      </button>
      <button
        onClick={(e) => {
          e.preventDefault();
          next();
        }}
        className={cn(
          "absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2",
          "md:translate-x-full md:mr-3",
          "w-10 h-10 rounded-full flex items-center justify-center",
          "border border-white/10 bg-[#0a1628]/80 backdrop-blur-sm",
          "hover:border-[var(--turquoise)]/30 hover:bg-[var(--turquoise)]/5",
          "transition-all duration-200 cursor-pointer z-20",
        )}
        aria-label="Next"
      >
        <ChevronRight className="w-5 h-5" style={{ color: "var(--seafoam)" }} />
      </button>

      {/* ── Dot indicators ── */}
      <div className="flex items-center justify-center gap-2 mt-8">
        {PRACTICE_MODES.map((m, i) => {
          const ModeIcon = m.Icon;
          return (
            <button
              key={m.slug}
              onClick={() => goTo(i)}
              className={cn(
                "group/dot relative flex items-center justify-center rounded-full transition-all duration-300 cursor-pointer",
                i === active
                  ? "w-10 h-10 border border-[var(--turquoise)]/40 bg-[var(--turquoise)]/10"
                  : "w-8 h-8 border border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/5",
              )}
              aria-label={m.name}
            >
              <ModeIcon
                className={cn(
                  "transition-all duration-300",
                  i === active ? "w-4 h-4" : "w-3.5 h-3.5",
                )}
                style={{
                  color: i === active ? "var(--turquoise)" : "var(--seafoam)",
                  opacity: i === active ? 1 : 0.4,
                }}
              />
              {/* Tooltip */}
              <span
                className={cn(
                  "absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap",
                  "font-body text-[10px] pointer-events-none",
                  "opacity-0 group-hover/dot:opacity-100 transition-opacity duration-200",
                )}
                style={{ color: "var(--seafoam)" }}
              >
                {m.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Counter (e.g. 3 / 7) ── */}
      <div
        className="text-center mt-4 font-mono text-xs"
        style={{ color: "var(--seafoam)", opacity: 0.3 }}
      >
        {active + 1} / {total}
      </div>
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
    document.body.style.overflow = "hidden";
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

      <div className="relative z-10 min-h-screen flex flex-col justify-center pt-20 pb-12 px-6 md:pl-[370px]">
        <div className="max-w-3xl mx-auto w-full">
          {/* Page header */}
          <div className="mb-10 space-y-3 text-center md:text-left">
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
              className="h-px w-16 mt-4 mx-auto md:mx-0"
              style={{
                background:
                  "linear-gradient(90deg, var(--turquoise) 0%, transparent 100%)",
              }}
            />
          </div>

          {/* Carousel */}
          <ModeCarousel />
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
