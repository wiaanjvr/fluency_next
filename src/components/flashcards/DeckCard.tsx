"use client";

import Link from "next/link";
import { BookOpen, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Deck, DeckStats } from "@/types/flashcards";

const LANGUAGE_FLAGS: Record<string, string> = {
  de: "🇩🇪",
  fr: "🇫🇷",
  it: "🇮🇹",
};

interface DeckCardProps {
  deck: Deck;
  stats: DeckStats;
}

export function DeckCard({ deck, stats }: DeckCardProps) {
  const total = stats.newCount + stats.learningCount + stats.reviewCount;
  const newPct = total > 0 ? (stats.newCount / total) * 100 : 0;
  const learningPct = total > 0 ? (stats.learningCount / total) * 100 : 0;
  const reviewPct = total > 0 ? (stats.reviewCount / total) * 100 : 0;

  return (
    <div
      className={cn(
        "relative rounded-2xl border border-white/10 bg-[#0d2137] p-5",
        "transition-all duration-300",
        "hover:border-teal-400/30 hover:shadow-[0_0_16px_rgba(61,214,181,0.10)] hover:-translate-y-0.5",
        "flex flex-col gap-4",
      )}
    >
      {/* Due badge */}
      {stats.dueCount > 0 && (
        <div className="absolute top-4 right-4 flex items-center gap-1.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-teal-400" />
          </span>
          <span className="text-xs font-medium text-teal-300">
            {stats.dueCount} due
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-3">
        <span className="text-2xl" role="img">
          {LANGUAGE_FLAGS[deck.language] || "🌐"}
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-white truncate">
            {deck.name}
          </h3>
          <p className="text-sm text-white/50">
            {deck.card_count} card{deck.card_count !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="space-y-1.5">
          <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-white/5">
            <div
              className="bg-white/20 transition-all"
              style={{ width: `${newPct}%` }}
            />
            <div
              className="bg-amber-400/70 transition-all"
              style={{ width: `${learningPct}%` }}
            />
            <div
              className="bg-teal-400/70 transition-all"
              style={{ width: `${reviewPct}%` }}
            />
          </div>
          <div className="flex gap-3 text-[10px] text-white/40">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-white/20" />
              {stats.newCount} new
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400/70" />
              {stats.learningCount} learning
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-400/70" />
              {stats.reviewCount} review
            </span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-auto pt-1">
        <Link
          href={`/propel/flashcards/${deck.id}/study`}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 px-4",
            "bg-teal-500 hover:bg-teal-400 text-[#0a1628] font-medium text-sm",
            "transition shadow-lg shadow-teal-500/20",
          )}
        >
          <Play className="h-4 w-4" />
          Study
        </Link>
        <Link
          href={`/propel/flashcards/${deck.id}`}
          className={cn(
            "flex items-center justify-center gap-2 rounded-xl py-2.5 px-4",
            "border border-white/10 text-white/60 hover:text-white hover:border-white/20",
            "text-sm font-medium transition",
          )}
        >
          <BookOpen className="h-4 w-4" />
          Manage
        </Link>
      </div>
    </div>
  );
}
