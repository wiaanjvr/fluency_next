"use client";

import type { DepthRank } from "@/types/dive-tank";

const RANK_CONFIG: Record<
  DepthRank,
  { bg: string; text: string; border: string; icon: string }
> = {
  "The Shallows": {
    bg: "bg-cyan-500/10",
    text: "text-cyan-300",
    border: "border-cyan-500/20",
    icon: "🌊",
  },
  "The Reef": {
    bg: "bg-teal-500/10",
    text: "text-teal-300",
    border: "border-teal-500/20",
    icon: "🐠",
  },
  "The Twilight": {
    bg: "bg-purple-500/10",
    text: "text-purple-300",
    border: "border-purple-500/20",
    icon: "🌑",
  },
  "The Abyss": {
    bg: "bg-indigo-500/10",
    text: "text-indigo-300",
    border: "border-indigo-500/20",
    icon: "🐙",
  },
  "The Trench": {
    bg: "bg-amber-500/10",
    text: "text-amber-300",
    border: "border-amber-500/20",
    icon: "👑",
  },
};

interface DepthBadgeProps {
  rank: DepthRank;
  size?: "sm" | "md";
  className?: string;
}

export function DepthBadge({
  rank,
  size = "sm",
  className = "",
}: DepthBadgeProps) {
  const config = RANK_CONFIG[rank] ?? RANK_CONFIG["The Shallows"];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border ${config.bg} ${config.text} ${config.border} ${
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs"
      } font-medium ${className}`}
    >
      <span>{config.icon}</span>
      {rank}
    </span>
  );
}
