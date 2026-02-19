/* =============================================================================
   REWARD SYSTEM TYPES
   
   TypeScript interfaces for the goal completion reward system
============================================================================= */

// ── Database row types ──────────────────────────────────────────────────────

export type RewardStatus = "pending" | "applied" | "failed";
export type RewardOption = "discount" | "split";

export interface UserReward {
  id: string;
  user_id: string;
  reward_month: string; // ISO date string (first of month)
  standard_amount: number; // cents
  discount_amount: number; // cents
  charity_amount: number; // cents
  globalgiving_project_id: string | null;
  globalgiving_project_name: string | null;
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
}

export interface SaveRewardChoiceRequest {
  user_id: string;
  option: RewardOption;
  discount_amount: number; // cents
  charity_amount: number; // cents
  globalgiving_project_id?: string;
  globalgiving_project_name?: string;
}

export interface SaveRewardChoiceResponse {
  success: boolean;
  reward: UserReward;
}

export interface ProcessBillingResult {
  user_id: string;
  status: "applied" | "failed";
  charge_amount: number;
  charity_donated: number;
  error?: string;
}

// ── GlobalGiving types ──────────────────────────────────────────────────────

export interface GlobalGivingProject {
  id: number;
  title: string;
  summary: string;
  themeName: string;
  imageLink: string;
  country: string;
  region: string;
  funding: number;
  goal: number;
  numberOfDonations: number;
  projectLink: string;
}

export interface GlobalGivingProjectsResponse {
  projects: {
    hasNext: boolean;
    nextProjectId?: number;
    numberFound: number;
    project: GlobalGivingProject[];
  };
}

export interface GlobalGivingDonationRequest {
  donation: {
    amount: number; // in dollars (GlobalGiving uses USD)
    project: { id: number };
    donor: {
      email: string;
      firstName?: string;
      lastName?: string;
    };
  };
}

export interface GlobalGivingTokenResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}
