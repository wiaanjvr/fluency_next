/**
 * Depth Level System — The core progression model for Fluensea
 *
 * Five oceanic depth zones representing a learner's vocabulary journey.
 * Each level carries its own atmosphere, color palette, and particle density
 * to create a continuously evolving underwater experience.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type DepthLevel = {
  /** 1-5, surface to abyss */
  id: number;
  /** Display name, e.g. "The Shallows" */
  name: string;
  /** URL-safe slug, e.g. "shallows" */
  slug: string;
  /** Inclusive word range [min, max). Max of last level is Infinity */
  wordRange: [number, number];
  /** Evocative 1-2 sentence description of what this depth feels like */
  description: string;
  /** What the underwater environment looks like at this depth */
  environmentDescription: string;
  /** Known word count required to enter this level */
  unlocksAt: number;
  /** Tailwind color token for primary accent */
  colorPrimary: string;
  /** Tailwind color token for secondary accent */
  colorSecondary: string;
  /** CSS hex/rgb for primary (for SVG / canvas / inline styles) */
  colorPrimaryHex: string;
  /** CSS hex/rgb for secondary */
  colorSecondaryHex: string;
  /** Background gradient CSS value */
  backgroundGradient: string;
  /** Number of ambient particles at this depth */
  ambientParticleCount: number;
};

export type DepthProgress = {
  /** The user's current depth level */
  current: DepthLevel;
  /** The next depth level, or null if at deepest */
  next: DepthLevel | null;
  /** 0-100 percentage progress toward next level */
  percentage: number;
  /** Words remaining to reach next level */
  wordsRemaining: number;
};

// ─── Level Definitions ──────────────────────────────────────────────────────

export const DEPTH_LEVELS: readonly DepthLevel[] = [
  {
    id: 1,
    name: "The Shallows",
    slug: "shallows",
    wordRange: [0, 500],
    description:
      "Warm light filters through crystal-clear water. Every new word is a shell you pick up from the sandy floor — bright, smooth, easy to hold.",
    environmentDescription:
      "Sun-dappled turquoise water. Shafts of golden light ripple across a white sand floor. Schools of silver fish dart between gently swaying kelp.",
    unlocksAt: 0,
    colorPrimary: "cyan-400",
    colorSecondary: "teal-300",
    colorPrimaryHex: "#22d3ee",
    colorSecondaryHex: "#5eead4",
    backgroundGradient:
      "radial-gradient(ellipse at 50% 0%, rgba(34,211,238,0.12) 0%, rgba(6,78,84,0.06) 50%, rgba(2,15,20,1) 100%)",
    ambientParticleCount: 8,
  },
  {
    id: 2,
    name: "Sunlit Zone",
    slug: "sunlit-zone",
    wordRange: [500, 1500],
    description:
      "The reef sprawls below you in vivid color. Patterns start to emerge — words connect to each other, forming living structures of meaning.",
    environmentDescription:
      "A vast coral reef teeming with life. Warm currents carry drifting plankton through columns of blue-green light. The surface shimmers far above.",
    unlocksAt: 500,
    colorPrimary: "teal-400",
    colorSecondary: "emerald-400",
    colorPrimaryHex: "#2dd4bf",
    colorSecondaryHex: "#34d399",
    backgroundGradient:
      "radial-gradient(ellipse at 50% 0%, rgba(45,212,191,0.10) 0%, rgba(6,78,59,0.05) 50%, rgba(2,15,20,1) 100%)",
    ambientParticleCount: 14,
  },
  {
    id: 3,
    name: "Twilight Zone",
    slug: "twilight-zone",
    wordRange: [1500, 3500],
    description:
      "The light fades. You rely on instinct now — comprehension comes faster than translation. The language starts to think for you.",
    environmentDescription:
      "Deepening indigo water where sunlight is a distant memory. Bioluminescent creatures pulse with cold blue light. Particles of marine snow drift endlessly downward.",
    unlocksAt: 1500,
    colorPrimary: "blue-400",
    colorSecondary: "indigo-400",
    colorPrimaryHex: "#60a5fa",
    colorSecondaryHex: "#818cf8",
    backgroundGradient:
      "radial-gradient(ellipse at 50% 0%, rgba(96,165,250,0.08) 0%, rgba(30,27,75,0.06) 50%, rgba(2,15,20,1) 100%)",
    ambientParticleCount: 20,
  },
  {
    id: 4,
    name: "The Deep",
    slug: "the-deep",
    wordRange: [3500, 7000],
    description:
      "Pressure mounts but you're built for this now. Words arrive unbidden. You dream in the language. The surface is a concept, not a destination.",
    environmentDescription:
      "Near-total darkness broken by rare flashes of bioluminescence. Massive, slow-moving shapes pass at the edge of perception. The water itself feels thick with meaning.",
    unlocksAt: 3500,
    colorPrimary: "violet-400",
    colorSecondary: "purple-500",
    colorPrimaryHex: "#a78bfa",
    colorSecondaryHex: "#a855f7",
    backgroundGradient:
      "radial-gradient(ellipse at 50% 0%, rgba(167,139,250,0.06) 0%, rgba(46,16,100,0.04) 50%, rgba(2,15,20,1) 100%)",
    ambientParticleCount: 25,
  },
  {
    id: 5,
    name: "The Abyss",
    slug: "the-abyss",
    wordRange: [7000, Infinity],
    description:
      "Silence. Vastness. The language is no longer something you use — it's something you are. Down here, there is no translation. Only understanding.",
    environmentDescription:
      "An infinite void of ink-black water. Rare, alien creatures drift past trailing threads of ghostly light. The pressure is immense, but you no longer feel it.",
    unlocksAt: 7000,
    colorPrimary: "fuchsia-400",
    colorSecondary: "rose-500",
    colorPrimaryHex: "#e879f9",
    colorSecondaryHex: "#f43f5e",
    backgroundGradient:
      "radial-gradient(ellipse at 50% 0%, rgba(232,121,249,0.04) 0%, rgba(80,7,36,0.03) 50%, rgba(2,15,20,1) 100%)",
    ambientParticleCount: 30,
  },
] as const;

// ─── Utility Functions ──────────────────────────────────────────────────────

/**
 * Get the depth level for a given known word count.
 * Returns the highest level whose `unlocksAt` threshold has been met.
 */
export function getDepthLevel(knownWordCount: number): DepthLevel {
  // Walk from deepest to shallowest — return first match
  for (let i = DEPTH_LEVELS.length - 1; i >= 0; i--) {
    if (knownWordCount >= DEPTH_LEVELS[i].unlocksAt) {
      return DEPTH_LEVELS[i];
    }
  }
  return DEPTH_LEVELS[0];
}

/**
 * Get the user's progress toward the next depth level.
 */
export function getProgressToNextLevel(knownWordCount: number): DepthProgress {
  const current = getDepthLevel(knownWordCount);
  const nextIndex = DEPTH_LEVELS.findIndex((l) => l.id === current.id) + 1;
  const next = nextIndex < DEPTH_LEVELS.length ? DEPTH_LEVELS[nextIndex] : null;

  if (!next) {
    return {
      current,
      next: null,
      percentage: 100,
      wordsRemaining: 0,
    };
  }

  const rangeSize = next.unlocksAt - current.unlocksAt;
  const progress = knownWordCount - current.unlocksAt;
  const percentage = Math.min(Math.round((progress / rangeSize) * 100), 100);

  return {
    current,
    next,
    percentage,
    wordsRemaining: Math.max(next.unlocksAt - knownWordCount, 0),
  };
}

/**
 * Check if a word count change crosses a level boundary.
 * Returns the new level if crossed, null otherwise.
 */
export function checkLevelUp(
  previousCount: number,
  newCount: number,
): DepthLevel | null {
  const prevLevel = getDepthLevel(previousCount);
  const newLevel = getDepthLevel(newCount);
  if (newLevel.id > prevLevel.id) {
    return newLevel;
  }
  return null;
}
