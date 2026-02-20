/* =============================================================================
   REWARD SYSTEM TYPES
   
   TypeScript interfaces for the goal completion reward system.
   
   NOTE: GlobalGiving integration has been removed and replaced with The Ocean
   Cleanup community pooled donation model. See src/types/ocean-impact.ts
   for donation/impact types.
============================================================================= */

// ── Database row types ──────────────────────────────────────────────────────

export type RewardStatus = "pending" | "applied" | "failed";

export interface UserReward {
  id: string;
  user_id: string;
  reward_month: string; // ISO date string (first of month)
  standard_amount: number; // cents
  discount_amount: number; // cents
  charity_amount: number; // cents
  status: RewardStatus;
  created_at: string;
  applied_at: string | null;
}

export interface UserMonthlyGoal {
  id: string;
  user_id: string;
  goal_month: string;
  title: string;
  description: string | null;
  target_value: number;
  current_value: number;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// ── API request/response types ──────────────────────────────────────────────

export interface CheckGoalsRequest {
  user_id: string;
}

export interface CheckGoalsResponse {
  all_goals_complete: boolean;
  reward_created: boolean;
  reward_amount: number; // 50% of subscription in cents
  reward_id?: string;
  credits_awarded?: number;
}

export interface SaveRewardChoiceRequest {
  user_id: string;
  discount_amount: number; // cents
  charity_amount: number; // cents
}

export interface SaveRewardChoiceResponse {
  success: boolean;
  reward: UserReward;
}

export interface ProcessBillingResult {
  user_id: string;
  status: "applied" | "failed";
  charge_amount: number;
  credits_awarded: number;
  error?: string;
}
