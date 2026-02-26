"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  BookOpen,
  PenLine,
  Layers,
  GitBranch,
  Mic,
  Compass,
  MessageCircle,
  Swords,
  Music,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Activity } from "@/lib/activities/activityRegistry";
import { TAG_COLORS } from "@/lib/activities/activityRegistry";
import type { LucideIcon } from "lucide-react";

// Map icon-name strings → actual lucide components
const ICON_MAP: Record<string, LucideIcon> = {
  BookOpen,
  PenLine,
  Layers,
  GitBranch,
  Mic,
  Compass,
  MessageCircle,
  Swords,
  Music,
};

// Accent color map — maps registry `color` field to css colour values
const ACCENT_MAP: Record<string, string> = {
  teal: "#3dd6b5",
  amber: "#fbbf24",
  blue: "#8ab4f8",
  cyan: "#22d3ee",
  violet: "#a78bfa",
  purple: "#c084fc",
  pink: "#f9a8d4",
  rose: "#fb7185",
  orange: "#fb923c",
};

// Personalization overlay props — optional, graceful degradation
export interface ActivityCardPersonalizationProps {
  isRecommended?: boolean;
  isNeglected?: boolean; // not done in 7+ days
  isNeverTried?: boolean;
  daysSinceLastSession?: number | null;
  lastDoneLabel?: string; // e.g. "Last dive: 3 days ago"
}

interface ActivityCardProps {
  activity: Activity;
  personalization?: ActivityCardPersonalizationProps;
}

export function ActivityCard({ activity, personalization }: ActivityCardProps) {
  const router = useRouter();
  const Icon = ICON_MAP[activity.icon] ?? BookOpen;
  const accent = ACCENT_MAP[activity.color] ?? ACCENT_MAP.teal;

  // Never show personalization overlays on the Duel card
  const isDuel = activity.id === "duel";
  const p = isDuel ? undefined : personalization;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      onClick={() => router.push(activity.href)}
      className={cn(
        "group relative flex flex-col gap-4 rounded-2xl overflow-hidden cursor-pointer",
        "border",
        // Dynamic border based on personalization
        p?.isRecommended
          ? "border-teal-400/30 shadow-[0_0_20px_rgba(61,214,181,0.12)]"
          : p?.isNeglected
            ? "border-amber-400/20"
            : "border-white/[0.06]",
        "bg-gradient-to-b from-[#0e2340]/90 to-[#091527]/95",
        "p-5 h-full",
        "transition-[border-color,box-shadow] duration-300 ease-out",
        "hover:border-white/[0.15]",
        "hover:shadow-[0_8px_32px_rgba(61,214,181,0.06)]",
        // Slight elevation for recommended cards
        p?.isRecommended && "translate-y-[-2px]",
      )}
      whileHover={{ y: -3 }}
    >
      {/* Ambient glow */}
      <div
        className="absolute -top-6 -right-6 w-24 h-24 rounded-full pointer-events-none
                    opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle, ${accent}22 0%, transparent 70%)`,
        }}
      />

      {/* NEW badge — always takes priority over personalization badges */}
      {activity.isNew && (
        <span
          className="absolute top-3 right-3 font-body text-[10px] font-bold tracking-wider
                     px-2 py-0.5 rounded-full uppercase"
          style={{ background: "rgba(61,214,181,0.18)", color: "#3dd6b5" }}
        >
          New
        </span>
      )}

      {/* Recommended today badge (original static) */}
      {activity.recommended &&
        !activity.isNew &&
        !p?.isRecommended &&
        !p?.isNeglected &&
        !p?.isNeverTried && (
          <span
            className="absolute top-3 right-3 flex items-center gap-1.5 font-body text-[10px]
                     font-medium px-2 py-0.5 rounded-full"
            style={{ background: "rgba(251,191,36,0.12)", color: "#fbbf24" }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: "#fbbf24",
                boxShadow: "0 0 6px 1px rgba(251,191,36,0.45)",
              }}
            />
            Recommended
          </span>
        )}

      {/* Personalization: Recommended badge */}
      {p?.isRecommended && !activity.isNew && (
        <span
          className="absolute top-3 right-3 flex items-center gap-1.5 font-body text-[10px]
                     font-semibold px-2 py-0.5 rounded-full"
          style={{ background: "rgba(61,214,181,0.15)", color: "#3dd6b5" }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: "#3dd6b5",
              boxShadow: "0 0 6px 1px rgba(61,214,181,0.45)",
            }}
          />
          Recommended
        </span>
      )}

      {/* Personalization: Neglected / Overdue badge */}
      {p?.isNeglected && !activity.isNew && !p?.isRecommended && (
        <span
          className="absolute top-3 right-3 font-body text-[10px] font-semibold
                     px-2 py-0.5 rounded-full"
          style={{ background: "rgba(251,191,36,0.12)", color: "#fbbf24" }}
        >
          Overdue
        </span>
      )}

      {/* Personalization: Never tried → "New to you" badge (distinct from global NEW) */}
      {p?.isNeverTried &&
        !activity.isNew &&
        !p?.isRecommended &&
        !p?.isNeglected && (
          <span
            className="absolute top-3 right-3 font-body text-[10px] font-semibold
                     px-2 py-0.5 rounded-full"
            style={{ background: "rgba(34,211,238,0.12)", color: "#22d3ee" }}
          >
            New to you
          </span>
        )}

      {/* Show recommended dot alongside NEW badge if both are set */}
      {activity.recommended && activity.isNew && (
        <span
          className="absolute top-3 right-[52px] flex items-center gap-1 font-body text-[10px]
                     font-medium px-2 py-0.5 rounded-full"
          style={{ background: "rgba(251,191,36,0.12)", color: "#fbbf24" }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: "#fbbf24",
              boxShadow: "0 0 6px 1px rgba(251,191,36,0.45)",
            }}
          />
          Rec
        </span>
      )}

      {/* Icon */}
      <motion.div
        className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
        )}
        style={{ background: `${accent}18` }}
        whileHover={{
          y: [0, -3, 0],
          transition: { duration: 1.6, repeat: Infinity, ease: "easeInOut" },
        }}
      >
        <Icon className="w-5 h-5" style={{ color: accent }} />
      </motion.div>

      {/* Title + flavour text */}
      <div className="flex-1 space-y-1.5">
        <h3
          className="font-display text-[15px] font-semibold leading-snug"
          style={{ color: "var(--sand)" }}
        >
          {activity.title}
        </h3>
        <p
          className="font-body text-[12px] leading-relaxed italic"
          style={{ color: "var(--seafoam)", opacity: 0.55 }}
        >
          {activity.flavourText}
        </p>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1 mt-auto">
        {activity.tags.map((tag) => {
          const c = TAG_COLORS[tag];
          return (
            <span
              key={tag}
              className="font-body text-[10px] font-medium px-2 py-0.5 rounded-full"
              style={{ background: c.bg, color: c.text }}
            >
              {tag}
            </span>
          );
        })}
      </div>

      {/* Last done label — personalization */}
      {p?.lastDoneLabel && (
        <p
          className="font-body text-[10px] mt-1"
          style={{ color: "var(--seafoam)", opacity: 0.35 }}
        >
          {p.lastDoneLabel}
        </p>
      )}

      {/* Bottom accent line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[1.5px]
                    opacity-0 group-hover:opacity-40 transition-opacity duration-500"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${accent} 50%, transparent 100%)`,
        }}
      />
    </motion.div>
  );
}
