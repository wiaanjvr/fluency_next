/* =============================================================================
   GAMEBOARD TILE DISTRIBUTION TESTS
   
   Validates EV, tile counts, shuffle behaviour, and expiry computation.
   Run with: npx jest src/lib/gameboard/__tests__/tile-config.test.ts
============================================================================= */

import {
  DIVER_TILES,
  SUBMARINER_TILES,
  getTilesForTier,
  shuffleTiles,
  computeExpiresAt,
} from "../tile-config";

// ── EV Validation ───────────────────────────────────────────────────────────

describe("Tile EV validation", () => {
  it("Diver tiles have 16 elements", () => {
    expect(DIVER_TILES).toHaveLength(16);
  });

  it("Submariner tiles have 16 elements", () => {
    expect(SUBMARINER_TILES).toHaveLength(16);
  });

  it("Diver EV is within 2% of target 25%", () => {
    const ev = DIVER_TILES.reduce((a, b) => a + b, 0) / DIVER_TILES.length;
    expect(Math.abs(ev - 25)).toBeLessThan(2);
  });

  it("Submariner EV is within 2% of target 50%", () => {
    const ev =
      SUBMARINER_TILES.reduce((a, b) => a + b, 0) / SUBMARINER_TILES.length;
    expect(Math.abs(ev - 50)).toBeLessThan(2);
  });

  it("All Diver tile values are between 1 and 100", () => {
    for (const v of DIVER_TILES) {
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(100);
    }
  });

  it("All Submariner tile values are between 1 and 100", () => {
    for (const v of SUBMARINER_TILES) {
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(100);
    }
  });

  it("Diver EV is exactly 25 (400/16)", () => {
    const sum = DIVER_TILES.reduce((a, b) => a + b, 0);
    expect(sum).toBe(400);
    expect(sum / 16).toBe(25);
  });

  it("Submariner EV is exactly 50 (800/16)", () => {
    const sum = SUBMARINER_TILES.reduce((a, b) => a + b, 0);
    expect(sum).toBe(800);
    expect(sum / 16).toBe(50);
  });
});

// ── getTilesForTier ─────────────────────────────────────────────────────────

describe("getTilesForTier", () => {
  it("returns a copy for diver", () => {
    const tiles = getTilesForTier("diver");
    expect(tiles).toEqual(DIVER_TILES);
    // Must be a copy, not the same reference
    tiles[0] = 9999;
    expect(DIVER_TILES[0]).not.toBe(9999);
  });

  it("returns a copy for submariner", () => {
    const tiles = getTilesForTier("submariner");
    expect(tiles).toEqual(SUBMARINER_TILES);
    tiles[0] = 9999;
    expect(SUBMARINER_TILES[0]).not.toBe(9999);
  });

  it("throws for unknown tier", () => {
    // @ts-expect-error Testing invalid input
    expect(() => getTilesForTier("free")).toThrow("Unknown tier");
  });
});

// ── shuffleTiles ────────────────────────────────────────────────────────────

describe("shuffleTiles", () => {
  it("returns an array of the same length", () => {
    const shuffled = shuffleTiles(DIVER_TILES);
    expect(shuffled).toHaveLength(16);
  });

  it("contains the same values (just reordered)", () => {
    const shuffled = shuffleTiles(DIVER_TILES);
    expect(shuffled.sort((a, b) => a - b)).toEqual(
      [...DIVER_TILES].sort((a, b) => a - b),
    );
  });

  it("does not mutate the original array", () => {
    const original = [...DIVER_TILES];
    shuffleTiles(DIVER_TILES);
    expect(DIVER_TILES).toEqual(original);
  });

  it("produces different orders (statistical — may occasionally fail)", () => {
    // Run 10 shuffles and check at least one differs
    const results = Array.from({ length: 10 }, () =>
      shuffleTiles(DIVER_TILES).join(","),
    );
    const unique = new Set(results);
    expect(unique.size).toBeGreaterThan(1);
  });
});

// ── computeExpiresAt ────────────────────────────────────────────────────────

describe("computeExpiresAt", () => {
  it("returns the 5th of the next month at 23:59:59 UTC", () => {
    const rewardMonth = new Date(2026, 1, 1); // February 2026
    const expiresAt = computeExpiresAt(rewardMonth);
    const d = new Date(expiresAt);
    expect(d.getUTCFullYear()).toBe(2026);
    expect(d.getUTCMonth()).toBe(2); // March
    expect(d.getUTCDate()).toBe(5);
    expect(d.getUTCHours()).toBe(23);
    expect(d.getUTCMinutes()).toBe(59);
    expect(d.getUTCSeconds()).toBe(59);
  });

  it("handles December → January year rollover", () => {
    const rewardMonth = new Date(2025, 11, 1); // December 2025
    const expiresAt = computeExpiresAt(rewardMonth);
    const d = new Date(expiresAt);
    expect(d.getUTCFullYear()).toBe(2026);
    expect(d.getUTCMonth()).toBe(0); // January
    expect(d.getUTCDate()).toBe(5);
  });
});
