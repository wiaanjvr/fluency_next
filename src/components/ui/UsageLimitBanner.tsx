/* =============================================================================
   USAGE LIMIT BANNER
   
   Shows free tier users their remaining sessions for the day
   Encourages upgrade to premium when limits are reached
============================================================================= */

"use client";

import { useEffect, useState } from "react";
import { Crown, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
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

  if (loading || !usageData) return null;
  if (usageData.remaining.isPremium) return null; // Premium users don't see limits

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
                    href="/pricing"
                    className="text-ocean-turquoise hover:underline"
                  >
                    upgrade to Premium
                  </Link>{" "}
                  for unlimited access.
                </>
              )}
            </p>
          </div>
          {remaining === 0 && (
            <Link href="/pricing">
              <Button size="sm" className="gap-2">
                <Crown className="w-4 h-4" />
                Go Premium
              </Button>
            </Link>
          )}
        </div>
      </div>
    );
  }

  // Show all session types
  const hasNoSessionsLeft =
    usageData.remaining.foundation === 0 &&
    usageData.remaining.sentence === 0 &&
    usageData.remaining.microstory === 0 &&
    usageData.remaining.main === 0;

  if (hasNoSessionsLeft) {
    return (
      <div
        className={cn(
          "bg-gradient-to-r from-ocean-teal/10 to-ocean-midnight/10 border border-ocean-turquoise/30 rounded-lg p-6",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1">
            <h3 className="font-serif text-lg mb-2">
              You've reached your daily limit
            </h3>
            <p className="text-sm text-muted-foreground font-light mb-4">
              Come back tomorrow to continue learning, or upgrade to Premium for
              unlimited access to all lesson types.
            </p>
            <Link href="/pricing">
              <Button className="gap-2">
                <Crown className="w-4 h-4" />
                Upgrade to Premium
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Show compact summary
  return (
    <div
      className={cn(
        "bg-muted/30 border border-border/50 rounded-lg p-4",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-light text-muted-foreground">
            Today's remaining sessions:
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div>
            <span className="text-foreground font-normal">
              {usageData.remaining.foundation}
            </span>
            <span className="text-muted-foreground font-light ml-1">
              Foundation
            </span>
          </div>
          <div className="w-px h-4 bg-border" />
          <div>
            <span className="text-foreground font-normal">
              {usageData.remaining.sentence}
            </span>
            <span className="text-muted-foreground font-light ml-1">
              Sentence
            </span>
          </div>
          <div className="w-px h-4 bg-border" />
          <div>
            <span className="text-foreground font-normal">
              {usageData.remaining.microstory}
            </span>
            <span className="text-muted-foreground font-light ml-1">Story</span>
          </div>
          <div className="w-px h-4 bg-border" />
          <div>
            <span className="text-foreground font-normal">
              {usageData.remaining.main}
            </span>
            <span className="text-muted-foreground font-light ml-1">
              Lesson
            </span>
          </div>
        </div>
        <Link href="/pricing">
          <Button variant="ghost" size="sm" className="gap-2">
            <Crown className="w-4 h-4" />
            Go Premium
          </Button>
        </Link>
      </div>
    </div>
  );
}
