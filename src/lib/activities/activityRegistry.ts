// =============================================================================
// FLUENSEA — Activity Registry
// Single source of truth for all Propel activities.
// =============================================================================

export type ActivityTag =
  | "Reading"
  | "Writing"
  | "Vocabulary"
  | "Grammar"
  | "Speaking"
  | "Listening"
  | "Competition";

export type ActivityCategory = "Immersion" | "Study" | "Produce" | "Compete";

export interface Activity {
  id: string;
  title: string;
  description: string;
  flavourText: string;
  icon: string;
  tags: ActivityTag[];
  category: ActivityCategory;
  href: string;
  color: string;
  isNew?: boolean;
  /** TODO: Wire up dynamically based on user activity history / recommendation engine */
  recommended?: boolean;
}

/** Ordered categories for rendering */
export const CATEGORY_ORDER: ActivityCategory[] = [
  "Immersion",
  "Study",
  "Produce",
  "Compete",
];

/** Human-readable subtitles for each category section */
export const CATEGORY_META: Record<
  ActivityCategory,
  { label: string; subtitle: string }
> = {
  Immersion: {
    label: "IMMERSION",
    subtitle: "Absorb the language as it lives",
  },
  Study: { label: "STUDY", subtitle: "Drill the fundamentals" },
  Produce: { label: "PRODUCE", subtitle: "Put your voice in the water" },
  Compete: { label: "COMPETE", subtitle: "Pressure makes diamonds" },
};

/** Tag colour mapping — consistent across the entire app */
export const TAG_COLORS: Record<ActivityTag, { bg: string; text: string }> = {
  Reading: { bg: "rgba(61,214,181,0.12)", text: "#3dd6b5" },
  Writing: { bg: "rgba(138,180,248,0.12)", text: "#8ab4f8" },
  Vocabulary: { bg: "rgba(34,211,238,0.12)", text: "#22d3ee" },
  Grammar: { bg: "rgba(167,139,250,0.12)", text: "#a78bfa" },
  Speaking: { bg: "rgba(249,168,212,0.12)", text: "#f9a8d4" },
  Listening: { bg: "rgba(253,224,132,0.12)", text: "#fde084" },
  Competition: { bg: "rgba(251,146,60,0.12)", text: "#fb923c" },
};

// =============================================================================
// Registry
// =============================================================================

export const activityRegistry: Activity[] = [
  // ── Immersion ──────────────────────────────────────────────────────────────
  {
    id: "free-reading",
    title: "Free Reading",
    description: "Dive into native texts at your level.",
    flavourText: "Native waters. No floaties.",
    icon: "BookOpen",
    tags: ["Reading"],
    category: "Immersion",
    href: "/propel/free-reading",
    color: "teal",
  },
  {
    id: "songs",
    title: "Song Learning",
    description: "Learn vocabulary through music.",
    flavourText: "Let the current carry the words to you.",
    icon: "Music",
    tags: ["Listening", "Vocabulary"],
    category: "Immersion",
    href: "/songs",
    color: "amber",
    isNew: true,
    /** TODO: Wire up dynamically based on user activity history */
    recommended: true,
  },

  // ── Study ──────────────────────────────────────────────────────────────────
  {
    id: "cloze",
    title: "Cloze Activities",
    description: "Fill the gaps. Train your instincts.",
    flavourText: "The reef has holes. You fill them.",
    icon: "PenLine",
    tags: ["Writing", "Reading"],
    category: "Study",
    href: "/propel/cloze",
    color: "blue",
  },
  {
    id: "flashcards",
    title: "Flashcards",
    description: "Surface and reinforce. Anki-style recall.",
    flavourText: "What sinks will surface — if you let it.",
    icon: "Layers",
    tags: ["Vocabulary"],
    category: "Study",
    href: "/propel/flashcards",
    color: "cyan",
    /** TODO: Wire up dynamically based on user activity history */
    recommended: true,
  },
  {
    id: "conjugation",
    title: "Conjugation Drills",
    description: "Master verb forms under pressure.",
    flavourText: "Bend the verb before it bends you.",
    icon: "GitBranch",
    tags: ["Grammar", "Writing"],
    category: "Study",
    href: "/propel/conjugation",
    color: "violet",
  },
  {
    id: "grammar",
    title: "Grammar",
    description: "Understand the currents beneath the words.",
    flavourText: "Every ocean has invisible rules. Learn them.",
    icon: "Compass",
    tags: ["Grammar", "Reading"],
    category: "Study",
    href: "/propel/grammar",
    color: "purple",
  },

  // ── Produce ────────────────────────────────────────────────────────────────
  {
    id: "pronunciation",
    title: "Pronunciation",
    description: "Speak. Shadow. Sound native.",
    flavourText: "Open your mouth. The sea is listening.",
    icon: "Mic",
    tags: ["Speaking"],
    category: "Produce",
    href: "/propel/pronunciation",
    color: "pink",
  },
  {
    id: "conversation",
    title: "Conversation",
    description: "Speak freely. An AI listens, responds, corrects.",
    flavourText: "Two voices in the dark water — yours and the echo.",
    icon: "MessageCircle",
    tags: ["Speaking", "Listening"],
    category: "Produce",
    href: "/propel/conversation",
    color: "rose",
  },

  // ── Compete ────────────────────────────────────────────────────────────────
  {
    id: "duel",
    title: "Duel",
    description: "Challenge a friend. Prove your depth.",
    flavourText: "Two divers. One depth. No mercy.",
    icon: "Swords",
    tags: ["Competition"],
    category: "Compete",
    href: "/propel/duel",
    color: "orange",
  },
];

/** Get all unique tags from the registry */
export function getAllTags(): ActivityTag[] {
  const tags = new Set<ActivityTag>();
  for (const activity of activityRegistry) {
    for (const tag of activity.tags) {
      tags.add(tag);
    }
  }
  return Array.from(tags);
}

/** Get activities grouped by category, preserving CATEGORY_ORDER */
export function getActivitiesByCategory(): {
  category: ActivityCategory;
  meta: (typeof CATEGORY_META)[ActivityCategory];
  activities: Activity[];
}[] {
  return CATEGORY_ORDER.map((cat) => ({
    category: cat,
    meta: CATEGORY_META[cat],
    activities: activityRegistry.filter((a) => a.category === cat),
  }));
}
