/* =============================================================================
   GAMEBOARD TILE CONFIGURATION & EV VALIDATION
   
   Central source of truth for tile discount distributions per tier.
   The EV assertion runs at module load time — if the numbers don't balance
   the app will log a console.assert failure.
============================================================================= */

import type { GameboardTier } from "@/types/gameboard";

// ── Tile distributions ──────────────────────────────────────────────────────

/** Diver tier: target EV = 25% (sum = 400) */
export const DIVER_TILES: number[] = [
  5, 5, 10, 10, 10, 15, 15, 20, 20, 25, 30, 30, 35, 40, 50, 80,
];

/** Submariner tier: target EV = 50% (sum = 800) */
export const SUBMARINER_TILES: number[] = [
  15, 20, 25, 30, 35, 40, 45, 50, 50, 55, 60, 65, 70, 75, 80, 85,
];

const TARGET_EV: Record<GameboardTier, number> = {
  diver: 25,
  submariner: 50,
};

// ── EV validation (runs at module load) ─────────────────────────────────────

function validateEV(tiles: number[], tier: GameboardTier): void {
  const ev = tiles.reduce((a, b) => a + b, 0) / tiles.length;
  console.assert(
    Math.abs(ev - TARGET_EV[tier]) < 2,
    `EV check failed for ${tier}: expected ~${TARGET_EV[tier]}%, got ${ev.toFixed(2)}%`,
  );
  console.assert(
    tiles.length === 16,
    `Tile count check failed for ${tier}: expected 16, got ${tiles.length}`,
  );
}

validateEV(DIVER_TILES, "diver");
validateEV(SUBMARINER_TILES, "submariner");

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Get the tile distribution for a given tier. */
export function getTilesForTier(tier: GameboardTier): number[] {
  switch (tier) {
    case "diver":
      return [...DIVER_TILES];
    case "submariner":
      return [...SUBMARINER_TILES];
    default:
      throw new Error(`Unknown tier: ${tier}`);
  }
}

/**
 * Fisher-Yates shuffle (server-side only).
 * Returns a new shuffled array — does not mutate the input.
 */
export function shuffleTiles(tiles: number[]): number[] {
  const arr = [...tiles];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Compute the expiry timestamp for a reward.
 * Rewards expire on the 5th of the month AFTER the reward month, at 23:59:59 UTC.
 */
export function computeExpiresAt(rewardMonth: Date): string {
  const year = rewardMonth.getFullYear();
  const month = rewardMonth.getMonth(); // 0-indexed
  // Next month's 5th, end of day UTC
  const expiryDate = new Date(Date.UTC(year, month + 1, 5, 23, 59, 59, 999));
  return expiryDate.toISOString();
}
