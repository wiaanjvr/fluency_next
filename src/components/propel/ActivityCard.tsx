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
import type { LucideIcon } from "lucide-react";

// ============================================================================
// ActivityCard — Underwater atmospheric frosted glass card
// Uses propel-theme.css design tokens. All colors come from the token system.
// ============================================================================

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

// Personalization overlay props — optional, graceful degradation
export interface ActivityCardPersonalizationProps {
  isRecommended?: boolean;
  isNeglected?: boolean;
  isNeverTried?: boolean;
  daysSinceLastSession?: number | null;
  lastDoneLabel?: string;
}

interface ActivityCardProps {
  activity: Activity;
  personalization?: ActivityCardPersonalizationProps;
}

type BadgeVariant = "new" | "recommended" | "overdue" | "new-to-you";

export function ActivityCard({ activity, personalization }: ActivityCardProps) {
  const router = useRouter();
  const Icon = ICON_MAP[activity.icon] ?? BookOpen;

  const isDuel = activity.id === "duel";
  const p = isDuel ? undefined : personalization;

  // Resolve single badge (priority: New > Recommended > Overdue > New to you)
  let badge: { label: string; variant: BadgeVariant; glow?: boolean } | null =
    null;
  if (activity.isNew) {
    badge = { label: "New", variant: "new", glow: true };
  } else if (p?.isRecommended) {
    badge = { label: "Recommended", variant: "recommended", glow: true };
  } else if (activity.recommended && !p?.isNeglected && !p?.isNeverTried) {
    badge = { label: "Recommended", variant: "recommended", glow: true };
  } else if (p?.isNeglected) {
    badge = { label: "Overdue", variant: "overdue" };
  } else if (p?.isNeverTried) {
    badge = { label: "New to you", variant: "new-to-you" };
  }

  const badgeClass = badge
    ? cn(
        "propel-badge",
        badge.variant === "new" && "propel-badge--new",
        badge.variant === "recommended" && "propel-badge--recommended",
        badge.variant === "overdue" && "propel-badge--overdue",
        badge.variant === "new-to-you" && "propel-badge--new-to-you",
      )
    : "";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      onClick={() => router.push(activity.href)}
      className={cn(
        "group propel-card",
        p?.isRecommended && "!border-[rgba(45,212,191,0.12)]",
      )}
    >
      {/* Hover glow overlay */}
      <div className="propel-card-glow" />

      {/* Badge */}
      {badge && (
        <span className={cn(badgeClass, "absolute top-4 right-4")}>
          {badge.glow && <span className="propel-badge-dot" />}
          {badge.label}
        </span>
      )}

      {/* Rec dot alongside NEW badge */}
      {activity.recommended && activity.isNew && (
        <span className="propel-badge propel-badge--recommended absolute top-4 right-[52px]">
          <span className="propel-badge-dot" />
          Rec
        </span>
      )}

      {/* Icon — unified bioluminescent color */}
      <div className="propel-icon-container mb-4">
        <Icon />
      </div>

      {/* Title + flavour text */}
      <div className="flex-1 space-y-2 mb-5">
        <h3 className="propel-card-title">{activity.title}</h3>
        <p className="propel-card-description">{activity.flavourText}</p>
      </div>

      {/* Skill tags */}
      <div className="flex flex-wrap gap-1.5 mt-auto">
        {activity.tags.map((tag) => (
          <span key={tag} className="propel-skill-tag">
            {tag}
          </span>
        ))}
      </div>

      {/* Last done label — personalization */}
      {p?.lastDoneLabel && (
        <p className="propel-last-done mt-2">{p.lastDoneLabel}</p>
      )}

      {/* Bottom accent line on hover */}
      <div className="propel-card-accent-line" />
    </motion.div>
  );
}
