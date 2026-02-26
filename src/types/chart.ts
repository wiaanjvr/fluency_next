/* =============================================================================
   CHART PAGE TYPES
   
   TypeScript interfaces for the Chart page — monthly goals, weekly goals,
   streak calendar, and gameboard systems.
============================================================================= */

// ── Goal Types ──────────────────────────────────────────────────────────────

export type GoalType = "weekly" | "monthly";

export type GoalKey =
  | "flashcard_sessions"
  | "words_learned"
  | "grammar_exercises"
  | "conversations"
  | "immersion_minutes"
  | "cloze_exercises"
  | "pronunciation_drills"
  | "stories_read";

export interface ChartGoal {
  id: string;
  user_id: string;
  type: GoalType;
  week_number: number;
  month: number; // 1–12
  year: number;
  goal_key: GoalKey;
  target_value: number;
  current_value: number;
  is_complete: boolean;
  created_at: string;
  updated_at: string;
}

export interface WeeklyGoalSummary {
  weekNumber: number;
  goals: ChartGoal[];
  allComplete: boolean;
  completedCount: number;
  totalCount: number;
}

export interface MonthlyGoalData {
  month: number;
  year: number;
  weekSummaries: WeeklyGoalSummary[];
  weeksComplete: number;
  totalWeeks: number;
  allWeeksComplete: boolean;
}

// ── Reward Types ────────────────────────────────────────────────────────────

export type RewardType =
  | "streak_freeze"
  | "xp_multiplier"
  | "bonus_session"
  | "badge";

export type RewardSource = "weekly_complete" | "gameboard";

export interface UserRewardChart {
  id: string;
  user_id: string;
  reward_type: RewardType;
  reward_value: string;
  source: RewardSource;
  is_claimed: boolean;
  earned_at: string;
  expires_at: string | null;
}

// ── Streak Types ────────────────────────────────────────────────────────────

export interface StreakHistory {
  [date: string]: boolean; // "2026-01-15": true
}

export interface UserStreakChart {
  id: string;
  user_id: string;
  current_streak: number;
  best_streak: number;
  last_active_date: string | null;
  streak_history: StreakHistory;
}

export interface CalendarDayData {
  date: string; // ISO date
  dayNumber: number;
  isCompleted: boolean;
  isToday: boolean;
  isCurrentMonth: boolean;
  isInStreak: boolean;
}

// ── Gameboard Types ─────────────────────────────────────────────────────────

export type PrizeType =
  | "discount_25"
  | "discount_20"
  | "discount_10"
  | "streak_freeze"
  | "xp_boost"
  | "consolation";

export interface PrizeConfig {
  type: PrizeType;
  label: string;
  description: string;
  icon: string; // lucide icon name
  gradient: string; // tailwind gradient classes
  value: string;
}

export interface GameboardPlay {
  id: string;
  user_id: string;
  month: number;
  year: number;
  tile_index: number; // 0–15
  prize_type: PrizeType;
  prize_value: string;
  played_at: string;
}

export interface GameboardState {
  isUnlocked: boolean;
  hasPlayed: boolean;
  play: GameboardPlay | null;
  tiles: TileState[];
}

export interface TileState {
  index: number;
  isRevealed: boolean;
  isSelected: boolean;
  prize: PrizeConfig | null; // only populated after reveal
  frontIcon: string; // ocean icon name
}

// ── Prize Distribution ──────────────────────────────────────────────────────

export const PRIZE_DISTRIBUTION: PrizeType[] = [
  "discount_25",
  "discount_20",
  "discount_20",
  "discount_10",
  "discount_10",
  "discount_10",
  "streak_freeze",
  "streak_freeze",
  "streak_freeze",
  "xp_boost",
  "xp_boost",
  "xp_boost",
  "consolation",
  "consolation",
  "consolation",
  "consolation",
];

export const PRIZE_CONFIGS: Record<PrizeType, PrizeConfig> = {
  discount_25: {
    type: "discount_25",
    label: "25% OFF",
    description: "25% off next month's premium!",
    icon: "Trophy",
    gradient: "from-amber-500/80 to-yellow-600/80",
    value: "25",
  },
  discount_20: {
    type: "discount_20",
    label: "20% OFF",
    description: "20% off next month's premium!",
    icon: "Star",
    gradient: "from-teal-500/80 to-cyan-600/80",
    value: "20",
  },
  discount_10: {
    type: "discount_10",
    label: "10% OFF",
    description: "10% off next month's premium!",
    icon: "Award",
    gradient: "from-slate-400/80 to-gray-500/80",
    value: "10",
  },
  streak_freeze: {
    type: "streak_freeze",
    label: "Streak Freeze",
    description: "Protect your streak for 1 day!",
    icon: "Snowflake",
    gradient: "from-blue-500/80 to-indigo-600/80",
    value: "1",
  },
  xp_boost: {
    type: "xp_boost",
    label: "1.5x XP Boost",
    description: "1.5x XP for 7 days!",
    icon: "Zap",
    gradient: "from-purple-500/80 to-violet-600/80",
    value: "1.5",
  },
  consolation: {
    type: "consolation",
    label: "Better luck next month",
    description: "+50 bonus XP as consolation!",
    icon: "Waves",
    gradient: "from-slate-700/80 to-slate-800/80",
    value: "50",
  },
};

// ── Goal Icon/Label Mapping ─────────────────────────────────────────────────

export const GOAL_META: Record<
  GoalKey,
  { icon: string; label: string; unit: string }
> = {
  flashcard_sessions: {
    icon: "Anchor",
    label: "Flashcard Sessions",
    unit: "sessions",
  },
  words_learned: {
    icon: "Waves",
    label: "Words Learned",
    unit: "words",
  },
  grammar_exercises: {
    icon: "Compass",
    label: "Grammar Exercises",
    unit: "exercises",
  },
  conversations: {
    icon: "Fish",
    label: "AI Conversations",
    unit: "conversations",
  },
  immersion_minutes: {
    icon: "Headphones",
    label: "Immersion Listening",
    unit: "minutes",
  },
  cloze_exercises: {
    icon: "PenTool",
    label: "Cloze Exercises",
    unit: "exercises",
  },
  pronunciation_drills: {
    icon: "Mic",
    label: "Pronunciation Drills",
    unit: "drills",
  },
  stories_read: {
    icon: "BookOpen",
    label: "Stories Read",
    unit: "stories",
  },
};

// ── Tile Front Icons (randomly assigned) ────────────────────────────────────

export const TILE_FRONT_ICONS = [
  "Shell",
  "Anchor",
  "Ship",
  "Fish",
  "Waves",
  "Compass",
  "Gem",
  "Crown",
  "Star",
  "Heart",
  "Sparkles",
  "Flame",
  "Palmtree",
  "Sailboat",
  "Telescope",
  "Map",
];
