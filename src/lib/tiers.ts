/* =============================================================================
   TIER CONFIGURATION
   
   Central source of truth for all subscription tiers in Fluensea.
   All tier logic in the app MUST reference this config — no hardcoded
   tier strings elsewhere.
   
   Hierarchy: snorkeler < diver < submariner
============================================================================= */

/** The three subscription tier slugs, ordered from lowest to highest. */
export const TIER_SLUGS = ["snorkeler", "diver", "submariner"] as const;

export type TierSlug = (typeof TIER_SLUGS)[number];

/** Numeric rank for each tier — used by hasAccess(). */
const TIER_RANK: Record<TierSlug, number> = {
  snorkeler: 0,
  diver: 1,
  submariner: 2,
} as const;

export interface TierFeatures {
  /** Daily foundation vocabulary sessions (-1 = unlimited) */
  foundationSessions: number;
  /** Daily sentence sessions (-1 = unlimited) */
  sentenceSessions: number;
  /** Daily micro-story sessions (-1 = unlimited) */
  microstorySessions: number;
  /** Daily main/acquisition lessons (-1 = unlimited) */
  mainLessons: number;
  /** Access to advanced SRS algorithm */
  advancedSrs: boolean;
  /** Access to offline mode */
  offlineMode: boolean;
  /** Priority support */
  prioritySupport: boolean;
  /** AI conversation feedback */
  aiConversationFeedback: boolean;
  /** Full course library */
  fullCourseLibrary: boolean;
}

export interface TierConfig {
  slug: TierSlug;
  /** Human-readable name shown in the UI */
  displayName: string;
  /** Monthly price in ZAR as an integer (0 for free tier) — used for Paystack (SA) */
  priceZAR: number;
  /** Price in kobo (Paystack smallest currency unit). R200 = 20000, R400 = 40000. */
  priceKobo: number;
  /** Annual price in ZAR (undefined if no annual plan) */
  annualPriceZAR?: number;
  /** Annual price in kobo (Paystack smallest currency unit) */
  annualPriceKobo?: number;
  /** Monthly price in USD — used for Lemon Squeezy (international) */
  priceUSD?: number;
  /** Annual price in USD — used for Lemon Squeezy (international) */
  annualPriceUSD?: number;
  /** Paystack plan code env var name (null for free tier) */
  planCodeEnvVar: string | null;
  /** Paystack annual plan code env var name (null/undefined if no annual plan) */
  annualPlanCodeEnvVar?: string | null;
  /** Billing interval */
  interval: "monthly" | null;
  /** CTA button text on the pricing page */
  cta: string;
  /** Short plan description */
  description: string;
  /** Whether this tier is highlighted / recommended */
  recommended: boolean;
  /** Feature flags for this tier */
  features: TierFeatures;
  /** Human-readable feature list for the pricing page */
  featureList: string[];
}

export const TIERS: Record<TierSlug, TierConfig> = {
  snorkeler: {
    slug: "snorkeler",
    displayName: "Snorkeler",
    priceZAR: 0,
    priceKobo: 0,
    planCodeEnvVar: null,
    interval: null,
    cta: "Get Started Free",
    description: "Dip your toes into a new language",
    recommended: false,
    features: {
      foundationSessions: 5,
      sentenceSessions: 3,
      microstorySessions: 1,
      mainLessons: 1,
      advancedSrs: false,
      offlineMode: false,
      prioritySupport: false,
      aiConversationFeedback: false,
      fullCourseLibrary: false,
    },
    featureList: [
      "5 foundation sessions per day",
      "3 sentence sessions per day",
      "1 story session per day",
      "Basic vocabulary practice",
      "Progress tracking",
      "Community support",
    ],
  },
  diver: {
    slug: "diver",
    displayName: "Diver",
    priceZAR: 200,
    priceKobo: 20000,
    annualPriceZAR: 2000,
    annualPriceKobo: 200000,
    priceUSD: 15,
    annualPriceUSD: 150,
    planCodeEnvVar: "PAYSTACK_DIVER_PLAN_CODE",
    annualPlanCodeEnvVar: "PAYSTACK_DIVER_ANNUAL_PLAN_CODE",
    interval: "monthly",
    cta: "Start Diving",
    description: "Dive deeper into fluency",
    recommended: true,
    features: {
      foundationSessions: -1,
      sentenceSessions: -1,
      microstorySessions: -1,
      mainLessons: -1,
      advancedSrs: true,
      offlineMode: false,
      prioritySupport: false,
      aiConversationFeedback: true,
      fullCourseLibrary: true,
    },
    featureList: [
      "Unlimited lessons",
      "Full course library",
      "Advanced SRS algorithm",
      "AI conversation feedback",
      "Progress tracking",
      "Community support",
    ],
  },
  submariner: {
    slug: "submariner",
    displayName: "Submariner",
    priceZAR: 400,
    priceKobo: 40000,
    annualPriceZAR: 4000,
    annualPriceKobo: 400000,
    priceUSD: 29,
    annualPriceUSD: 290,
    planCodeEnvVar: "PAYSTACK_SUBMARINER_PLAN_CODE",
    annualPlanCodeEnvVar: "PAYSTACK_SUBMARINER_ANNUAL_PLAN_CODE",
    interval: "monthly",
    cta: "Go Deep",
    description: "The ultimate immersion experience",
    recommended: false,
    features: {
      foundationSessions: -1,
      sentenceSessions: -1,
      microstorySessions: -1,
      mainLessons: -1,
      advancedSrs: true,
      offlineMode: true,
      prioritySupport: true,
      aiConversationFeedback: true,
      fullCourseLibrary: true,
    },
    featureList: [
      "Everything in Diver",
      "Offline mode",
      "Priority support",
      "Early access to new features",
      "Exclusive content",
      "Personal learning insights",
    ],
  },
} as const;

/* ---------------------------------------------------------------------------
   Tier helpers
--------------------------------------------------------------------------- */

/**
 * Check whether `userTier` meets or exceeds the `requiredTier`.
 *
 * @example
 *   hasAccess('diver', 'snorkeler')   // true
 *   hasAccess('snorkeler', 'diver')   // false
 *   hasAccess('submariner', 'diver')  // true
 */
export function hasAccess(userTier: TierSlug, requiredTier: TierSlug): boolean {
  return TIER_RANK[userTier] >= TIER_RANK[requiredTier];
}

/**
 * Return the next tier up from the given tier, or null if already at the top.
 */
export function getNextTier(currentTier: TierSlug): TierSlug | null {
  const idx = TIER_SLUGS.indexOf(currentTier);
  if (idx === -1 || idx >= TIER_SLUGS.length - 1) return null;
  return TIER_SLUGS[idx + 1];
}

/**
 * Return the TierConfig for a given slug — falls back to snorkeler for unknown
 * values (e.g. legacy 'free'/'premium' still in the DB during migration).
 */
export function getTierConfig(slug: string): TierConfig {
  if (slug in TIERS) return TIERS[slug as TierSlug];
  // Legacy mapping
  if (slug === "free") return TIERS.snorkeler;
  if (slug === "premium") return TIERS.diver;
  return TIERS.snorkeler;
}

/**
 * Get the Paystack plan code for a tier from environment variables.
 * Returns empty string if not set or if the tier is free.
 */
export function getPlanCode(tier: TierSlug): string {
  const config = TIERS[tier];
  if (!config.planCodeEnvVar) return "";
  return process.env[config.planCodeEnvVar] || "";
}

/**
 * Get the Paystack annual plan code for a tier from environment variables.
 * Returns empty string if not set or if the tier has no annual plan.
 */
export function getAnnualPlanCode(tier: TierSlug): string {
  const config = TIERS[tier];
  if (!config.annualPlanCodeEnvVar) return "";
  return process.env[config.annualPlanCodeEnvVar] || "";
}

/**
 * Look up which tier a Paystack plan code belongs to.
 * Checks both monthly and annual plan codes.
 * Returns null if no matching tier is found.
 */
export function getTierByPlanCode(planCode: string): TierSlug | null {
  for (const tier of TIER_SLUGS) {
    if (TIERS[tier].planCodeEnvVar && getPlanCode(tier) === planCode) {
      return tier;
    }
    if (
      TIERS[tier].annualPlanCodeEnvVar &&
      getAnnualPlanCode(tier) === planCode
    ) {
      return tier;
    }
  }
  return null;
}

/**
 * Returns true if the given tier has unlimited access
 * (i.e. is a paid tier: diver or submariner).
 */
export function isUnlimitedTier(tier: TierSlug): boolean {
  return hasAccess(tier, "diver");
}

/**
 * Get the daily session limits for a given tier.
 * Returns the feature limits from the tier config.
 */
export function getTierLimits(tier: TierSlug) {
  const config = TIERS[tier];
  return {
    foundation: config.features.foundationSessions,
    sentence: config.features.sentenceSessions,
    microstory: config.features.microstorySessions,
    main: config.features.mainLessons,
  };
}

/**
 * Format a ZAR price for display (e.g. 240 → "R240/month").
 */
export function formatTierPrice(
  tier: TierSlug,
  billing: "monthly" | "annual" = "monthly",
): string {
  const config = TIERS[tier];
  if (config.priceZAR === 0) return "Free";
  if (billing === "annual" && config.annualPriceZAR) {
    return `R${config.annualPriceZAR}/year`;
  }
  return `R${config.priceZAR}/month`;
}

/**
 * Get the annual saving for a tier (monthly * 12 - annual price).
 * Returns 0 if no annual plan.
 */
export function getAnnualSaving(tier: TierSlug): number {
  const config = TIERS[tier];
  if (!config.annualPriceZAR) return 0;
  return config.priceZAR * 12 - config.annualPriceZAR;
}

/**
 * Get all tiers above a given tier (for upgrade options).
 */
export function getTiersAbove(currentTier: TierSlug): TierSlug[] {
  const currentRank = TIER_RANK[currentTier];
  return TIER_SLUGS.filter((slug) => TIER_RANK[slug] > currentRank);
}

/**
 * Build the upgrade prompt message when a user on `currentTier` hits a feature
 * that requires `requiredTier`.
 */
export function getUpgradeMessage(
  currentTier: TierSlug,
  requiredTier: TierSlug,
): { tierName: string; price: string; message: string } {
  const target = TIERS[requiredTier];
  return {
    tierName: target.displayName,
    price: formatTierPrice(requiredTier),
    message: `Upgrade to ${target.displayName} (${formatTierPrice(requiredTier)}) to unlock this feature.`,
  };
}
