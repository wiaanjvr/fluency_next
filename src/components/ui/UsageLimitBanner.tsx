/* =============================================================================
   USAGE LIMIT BANNER
   
   Shows Snorkeler-tier users their remaining sessions for the day.
   Encourages upgrade to Diver when limits are reached.
============================================================================= */

"use client";

import { useEffect, useState } from "react";
import { Crown, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface UsageData {
  usage: {
    foundation_sessions: number;
    sentence_sessions: number;
    microstory_sessions: number;
    main_lessons: number;
  };
  remaining: {
    foundation: number;
    sentence: number;
    microstory: number;
    main: number;
    isPremium: boolean;
  };
}

const SESSION_TYPE_LABELS = {
  foundation: "Foundation",
  sentence: "Sentence",
  microstory: "Story",
  main: "Lesson",
};

export function UsageLimitBanner({
  sessionType,
  className,
}: {
  sessionType?: "foundation" | "sentence" | "microstory" | "main";
  className?: string;
}) {
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    async function fetchUsage() {
      try {
        const response = await fetch("/api/usage");
        if (response.ok) {
          const data = await response.json();
          setUsageData(data);
        }
      } catch (error) {
        console.error("Error fetching usage:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchUsage();
  }, []);

  // Check auth status
  useEffect(() => {
    const supabase = createClient();
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!mounted) return;
        setIsSignedIn(!!data?.user);
      } catch (e) {
        console.error("Error checking auth status", e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading || !usageData) return null;
  // Paid tier users (Diver / Submariner) have unlimited access
  if (usageData.remaining.isPremium) return null;

  // Total daily Snorkeler lessons across all lesson types
  const TOTAL_DAILY_FREE = 5;
  const usedTotal =
    usageData.usage.foundation_sessions +
    usageData.usage.sentence_sessions +
    usageData.usage.microstory_sessions +
    usageData.usage.main_lessons;
  const totalRemaining = Math.max(0, TOTAL_DAILY_FREE - usedTotal);

  // If a specific session type is provided, show only that type
  if (sessionType) {
    const remaining = usageData.remaining[sessionType];
    const limit =
      sessionType === "foundation" ? 5 : sessionType === "sentence" ? 3 : 1;

    return (
      <div
        className={cn(
          "bg-muted/50 border border-border rounded-lg p-4",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-light text-sm">
                Daily {SESSION_TYPE_LABELS[sessionType]} Limit
              </h3>
            </div>
            <p className="text-sm text-muted-foreground font-light">
              {remaining > 0 ? (
                <>
                  <span className="text-foreground font-normal">
                    {remaining}
                  </span>{" "}
                  of {limit} sessions remaining today
                </>
              ) : (
                <>
                  You've used all {limit} sessions today. Come back tomorrow or{" "}
                  <Link
                    href={isSignedIn ? "/checkout?tier=diver" : "/auth/login"}
                    className="text-ocean-turquoise hover:underline"
                  >
                    upgrade to Diver
                  </Link>{" "}
                  for unlimited access.
                </>
              )}
            </p>
          </div>
          {remaining === 0 && (
            <Link href={isSignedIn ? "/checkout?tier=diver" : "/auth/login"}>
              <Button size="sm" className="gap-2">
                <Crown className="w-4 h-4" />
                Start Diving
              </Button>
            </Link>
          )}
        </div>
      </div>
    );
  }

  // Show all session types
  const hasNoSessionsLeft = totalRemaining === 0;

  if (hasNoSessionsLeft) {
    return (
      <div
        className={cn("rounded-2xl p-5", className)}
        style={{
          background: "var(--bg-surface, #031820)",
          border: "1px solid var(--border-dim, rgba(255,255,255,0.07))",
        }}
      >
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1">
            <p
              style={{
                fontFamily: "var(--font-display, 'Playfair Display', serif)",
                fontSize: 16,
                fontStyle: "italic",
                color: "var(--text-primary, #EDF6F4)",
                marginBottom: 4,
              }}
            >
              Surface reached
            </p>
            <p
              style={{
                fontSize: 13,
                fontFamily: "var(--font-inter, 'Inter', sans-serif)",
                color: "var(--text-muted, #2E5C54)",
              }}
            >
              All dives used today. Return at dawn, or go unlimited.
            </p>
          </div>
          <Link href={isSignedIn ? "/checkout?tier=diver" : "/auth/login"}>
            <button
              style={{
                fontSize: 12,
                fontFamily: "var(--font-inter, 'Inter', sans-serif)",
                fontWeight: 500,
                padding: "8px 16px",
                borderRadius: 100,
                background: "transparent",
                border: "1px solid var(--border-dim, rgba(255,255,255,0.07))",
                color: "var(--text-secondary, #6B9E96)",
                cursor: "pointer",
                transition: "all 200ms ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor =
                  "var(--teal-border, rgba(13,148,136,0.2))";
                e.currentTarget.style.color = "var(--text-primary, #EDF6F4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor =
                  "var(--border-dim, rgba(255,255,255,0.07))";
                e.currentTarget.style.color = "var(--text-secondary, #6B9E96)";
              }}
            >
              Go unlimited
            </button>
          </Link>
        </div>
      </div>
    );
  }

  // Show compact summary — ocean-themed depth-meter dots
  // Fix 11: Don't show on dashboard — hero card already has dives remaining
  return null;
}
