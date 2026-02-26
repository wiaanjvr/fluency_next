"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { OceanBackground, DepthSidebar } from "@/components/ocean";
import {
  AppNav,
  ContextualNav,
  MobileBottomNav,
} from "@/components/navigation";
import LoadingScreen from "@/components/ui/LoadingScreen";
import { Music, ArrowLeft, Anchor, Waves } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { SongRecommendation } from "@/types/songs";
import "@/styles/ocean-theme.css";

// ============================================================================
// Song Selection Page — /songs
//
// Displays recommended songs as "dive briefing" cards in the ocean theme.
// ============================================================================

function SongSelectionContent() {
  const [recommendations, setRecommendations] = useState<SongRecommendation[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRecommendations() {
      try {
        setLoading(true);
        setError(null);

        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        const langCode =
          (user as unknown as { user_metadata?: { target_language?: string } })
            ?.user_metadata?.target_language || "de";

        const res = await fetch(
          `/api/songs/recommend?language_code=${encodeURIComponent(langCode)}`,
        );

        if (!res.ok) {
          throw new Error("Failed to fetch recommendations");
        }

        const data = await res.json();
        setRecommendations(data.recommendations ?? []);
      } catch (err) {
        console.error("Recommendation fetch error:", err);
        setError("Could not load song recommendations. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    fetchRecommendations();
  }, []);

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-6">
        <Waves className="w-12 h-12 text-white/30 mb-4" />
        <p className="text-white/60 text-lg mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-5 py-2.5 rounded-xl bg-white/10 border border-white/10 text-white/80 hover:bg-white/15 transition-colors text-sm"
        >
          Try again
        </button>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-6">
        <Music className="w-12 h-12 text-white/30 mb-4" />
        <h2 className="text-xl font-semibold text-white/80 mb-2">
          No songs available yet
        </h2>
        <p className="text-white/50 max-w-sm">
          Songs will appear here once they&apos;re added to the catalogue for
          your language. Check back soon!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Link
          href="/propel"
          className="p-2 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white/60 hover:text-white/90 hover:bg-white/10 transition-colors"
          aria-label="Back to Propel"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            Song Learning
          </h1>
          <p className="text-sm text-white/50 mt-0.5">
            Dive into music — learn words in context
          </p>
        </div>
      </div>

      {/* Song cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {recommendations.map((song, idx) => (
          <SongCard key={song.id} song={song} index={idx} />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Song Card
// ============================================================================

function SongCard({
  song,
  index,
}: {
  song: SongRecommendation;
  index: number;
}) {
  const knownPercent = Math.round(song.known_ratio * 100);
  const newWordsCount = song.total_unique_lemmas - song.known_lemma_count;

  const difficultyColors: Record<string, string> = {
    beginner: "text-emerald-300 bg-emerald-500/15 border-emerald-500/20",
    intermediate: "text-sky-300 bg-sky-500/15 border-sky-500/20",
    advanced: "text-rose-300 bg-rose-500/15 border-rose-500/20",
  };

  return (
    <Link
      href={`/songs/${song.id}`}
      className="group focus:outline-none"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div
        className={cn(
          "relative flex flex-col gap-3 rounded-2xl overflow-hidden p-5",
          "border border-white/[0.07]",
          "bg-gradient-to-b from-[#0e2340]/90 to-[#091527]/95",
          "hover:border-white/[0.14] hover:from-[#112a4d]/90",
          "transition-all duration-300 ease-out",
          "group-focus-visible:ring-2 group-focus-visible:ring-sky-400/60",
          "animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both",
        )}
      >
        {/* Difficulty badge */}
        <div className="flex items-center justify-between">
          <span
            className={cn(
              "text-xs font-medium rounded-full px-2.5 py-0.5 border",
              difficultyColors[song.difficulty_band] ??
                difficultyColors.intermediate,
            )}
          >
            {song.difficulty_band}
          </span>
          <span className="text-xs text-white/40">
            {song.duration_seconds
              ? `${Math.floor(song.duration_seconds / 60)}:${String(song.duration_seconds % 60).padStart(2, "0")}`
              : "—"}
          </span>
        </div>

        {/* Title & artist */}
        <div>
          <h3 className="text-lg font-semibold text-white group-hover:text-sky-200 transition-colors truncate">
            {song.title}
          </h3>
          <p className="text-sm text-white/50 truncate">{song.artist}</p>
        </div>

        {/* Known ratio bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/50">Familiar words</span>
            <span className="font-medium text-emerald-300">
              {knownPercent}%
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-sky-400 transition-all duration-500"
              style={{ width: `${knownPercent}%` }}
            />
          </div>
        </div>

        {/* New discoveries */}
        <div className="flex items-center gap-1.5 text-xs text-amber-300/80">
          <Anchor className="w-3.5 h-3.5" />
          <span>
            {newWordsCount} new{" "}
            {newWordsCount === 1 ? "discovery" : "discoveries"}
          </span>
        </div>
      </div>
    </Link>
  );
}

// ============================================================================
// Loading skeleton
// ============================================================================

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-white/[0.06] animate-pulse" />
        <div className="space-y-2">
          <div className="w-40 h-7 rounded-lg bg-white/[0.06] animate-pulse" />
          <div className="w-56 h-4 rounded-lg bg-white/[0.04] animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-white/[0.05] bg-white/[0.03] p-5 space-y-3 animate-pulse"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="flex justify-between">
              <div className="w-20 h-5 rounded-full bg-white/[0.06]" />
              <div className="w-10 h-4 rounded bg-white/[0.04]" />
            </div>
            <div className="space-y-1.5">
              <div className="w-3/4 h-5 rounded bg-white/[0.06]" />
              <div className="w-1/2 h-4 rounded bg-white/[0.04]" />
            </div>
            <div className="w-full h-1.5 rounded-full bg-white/[0.06]" />
            <div className="w-24 h-4 rounded bg-white/[0.04]" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Page wrapper
// ============================================================================

export default function SongsPage() {
  return (
    <ProtectedRoute>
      <OceanBackground>
        <AppNav />
        <ContextualNav />
        <MobileBottomNav />
        <DepthSidebar wordCount={0} />
        <main className="min-h-screen pt-20 pb-12 px-4 md:px-8 lg:px-16 max-w-7xl mx-auto">
          <SongSelectionContent />
        </main>
      </OceanBackground>
    </ProtectedRoute>
  );
}
