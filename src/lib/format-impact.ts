/* =============================================================================
   IMPACT DISPLAY FORMATTING
   
   Display logic for personal and community ocean impact stats.
   
   Rules:
   - PERSONAL stats → always show bottles (feels large and concrete)
   - COMMUNITY stats → always show football fields (feels epic at scale)
   - Notification emails → combine both
============================================================================= */

/**
 * Format a number of bottles for display with locale formatting.
 * Rounds to the nearest whole number for values >= 1,
 * shows one decimal for values < 1.
 */
export function formatBottles(n: number): string {
  if (n < 1 && n > 0) {
    return n.toLocaleString("en", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
  }
  return Math.round(n).toLocaleString("en");
}

/**
 * Format a number of football fields for display with locale formatting.
 * Shows one decimal place for clean readability.
 */
export function formatFields(n: number): string {
  if (n >= 100) {
    return Math.round(n).toLocaleString("en");
  }
  return n.toLocaleString("en", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

/**
 * Personal impact message — always uses bottles.
 */
export function personalImpactMessage(bottles: number): string {
  return `You helped intercept ${formatBottles(bottles)} plastic bottles from rivers 🐠`;
}

/**
 * Community impact message — always uses football fields.
 */
export function communityImpactMessage(fields: number): string {
  return `The Fluensea community swept ${formatFields(fields)} football fields of ocean 🌊`;
}

/**
 * Notification email body for a user after allocation.
 */
export function notificationEmailBody(params: {
  bottlesAllocated: number;
  communityFields: number;
}): { subject: string; body: string } {
  return {
    subject: "Your ocean impact this month 🌊",
    body: `This month your Fluensea rewards helped intercept ${formatBottles(params.bottlesAllocated)} plastic bottles from rivers before they reached the ocean 🐠

The Fluensea community swept the equivalent of ${formatFields(params.communityFields)} football fields of ocean this month 🌊

Thank you for diving deeper with us.`,
  };
}
