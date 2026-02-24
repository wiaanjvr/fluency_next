/* =============================================================================
   GOALS SYSTEM TYPES
   
   TypeScript interfaces for the monthly & weekly goals system.
============================================================================= */

// ── Enums / Unions ──────────────────────────────────────────────────────────

export type GoalCategory =
  | "immersion"
  | "vocabulary"
  | "grammar"
  | "cloze"
  | "speaking"
  | "social"
  | "streak"
  | "milestone";

export type GoalPeriodType = "monthly" | "weekly";

export type GoalTargetUnit =
  | "days"
  | "words"
  | "sessions"
  | "hours"
  | "minutes"
  | "exercises"
  | "wins"
  | "stories";

export type GoalTierRequired = "tide" | "snorkeler" | "diver" | "submariner";

// ── Database Row Types ──────────────────────────────────────────────────────

export interface GoalTemplate {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  category: GoalCategory;
  period_type: GoalPeriodType;
  target_value: number;
  target_unit: GoalTargetUnit;
  tracking_event: string;
  icon: string | null;
  tier_required: GoalTierRequired;
  is_active: boolean;
  created_at: string;
}

export interface UserGoal {
  id: string;
  user_id: string;
  template_id: string;
  period_type: GoalPeriodType;
  period_start: string; // ISO date
  period_end: string; // ISO date
  target_value: number;
  current_value: number;
  is_complete: boolean;
  completed_at: string | null;
  created_at: string;
  // Joined from template (populated by API)
  template?: GoalTemplate;
}

export interface GoalEvent {
  id: string;
  user_id: string;
  event_type: string;
  value: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface UserStreak {
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
  updated_at: string;
}

// ── Goal Event Types (for tracking) ────────────────────────────────────────

export type GoalEventType =
  | "daily_activity"
  | "word_learned"
  | "immersion_listened"
  | "ai_conversation_completed"
  | "quiz_won"
  | "story_completed"
  | "flashcard_session_completed"
  | "cloze_completed"
  | "pronunciation_completed";

// ── API Request / Response Types ────────────────────────────────────────────

export interface GenerateGoalsResponse {
  monthlyGoals: number;
  weeklyGoals: number;
  created: number;
}

export interface LogGoalEventRequest {
  eventType: GoalEventType;
  value?: number;
  metadata?: Record<string, unknown>;
}

export interface LogGoalEventResponse {
  inserted: boolean;
  updated: UserGoal[];
  newlyCompleted: UserGoal[];
  rewardUnlocked: boolean;
}

export interface GoalPeriodInfo {
  goals: UserGoal[];
  allComplete: boolean;
  periodStart: string;
  periodEnd: string;
}

export interface WeeklyGoalPeriodInfo extends GoalPeriodInfo {
  weekNumber: number; // 1–4+ within the current month
  weeksCompleted: number; // how many weekly sets are fully done this month
}

export interface GetUserGoalsResponse {
  monthly: GoalPeriodInfo;
  weekly: WeeklyGoalPeriodInfo;
  streak: UserStreak | null;
  rewardEligible: boolean;
}
