/* =============================================================================
   GAMEBOARD REWARD TYPES
   
   TypeScript interfaces for the monthly tile-flip reward gameboard.
============================================================================= */

export type GameboardStatus = "pending" | "claimed" | "expired";
export type GameboardTier = "diver" | "submariner";

// ── Database row type ───────────────────────────────────────────────────────

export interface MonthlyRewardRow {
  id: string;
  user_id: string;
  month: string; // ISO date e.g. "2026-03-01"
  tier: GameboardTier;
  tile_order: number[]; // server-shuffled 16 discount percentages — NEVER sent to client
  chosen_index: number | null;
  discount_percent: number | null;
  status: GameboardStatus;
  created_at: string;
  claimed_at: string | null;
  expires_at: string;
}

// ── API request / response types ────────────────────────────────────────────

/** POST /api/rewards/gameboard/check — response */
export interface GameboardCheckResponse {
  eligible: boolean;
  status: GameboardStatus | "not_eligible" | "no_reward";
  expiresAt: string | null;
  discountPercent?: number; // only if already claimed
  chosenIndex?: number; // only if already claimed
}

/** POST /api/rewards/gameboard/claim — request body */
export interface GameboardClaimRequest {
  chosenIndex: number; // 0–15
}

/** POST /api/rewards/gameboard/claim — response */
export interface GameboardClaimResponse {
  discountPercent: number;
  message: string;
}

/** GET /api/rewards/gameboard/status — response */
export interface GameboardStatusResponse {
  status: GameboardStatus | "no_reward";
  chosenIndex: number | null;
  discountPercent: number | null;
  expiresAt: string | null;
}
