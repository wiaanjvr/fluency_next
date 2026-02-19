/* =============================================================================
   GOAL COMPLETION REWARD SYSTEM
   
   Adds:
   1. user_monthly_goals — tracks monthly goals per user
   2. user_rewards — tracks reward choices and processing
   3. New profile columns for Paystack charge_authorization support
============================================================================= */

-- ============================================================================
-- 1. Add missing Paystack / subscription columns to profiles
-- ============================================================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS paystack_authorization_code TEXT,
  ADD COLUMN IF NOT EXISTS paystack_email TEXT,
  ADD COLUMN IF NOT EXISTS subscription_amount INTEGER;

COMMENT ON COLUMN profiles.paystack_authorization_code IS 'Paystack authorization code for charge_authorization';
COMMENT ON COLUMN profiles.paystack_email IS 'Email used for Paystack transactions';
COMMENT ON COLUMN profiles.subscription_amount IS 'Monthly subscription amount in cents (ZAR)';

-- ============================================================================
-- 2. Create reward status enum
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reward_status') THEN
    CREATE TYPE reward_status AS ENUM ('pending', 'applied', 'failed');
  END IF;
END$$;

-- ============================================================================
-- 3. Create user_monthly_goals table
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_monthly_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  goal_month DATE NOT NULL, -- first day of the month (e.g. 2026-02-01)
  title TEXT NOT NULL,
  description TEXT,
  target_value INTEGER NOT NULL DEFAULT 1,
  current_value INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prevent duplicate goals for the same user+month+title
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_monthly_goals_unique
  ON user_monthly_goals (user_id, goal_month, title);

CREATE INDEX IF NOT EXISTS idx_user_monthly_goals_user_month
  ON user_monthly_goals (user_id, goal_month);

-- ============================================================================
-- 4. Create user_rewards table
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_rewards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  reward_month DATE NOT NULL, -- the month the reward was earned
  standard_amount INTEGER NOT NULL, -- full subscription amount in cents
  discount_amount INTEGER NOT NULL DEFAULT 0, -- discount portion in cents
  charity_amount INTEGER NOT NULL DEFAULT 0, -- charity portion in cents
  globalgiving_project_id TEXT,
  globalgiving_project_name TEXT,
  status reward_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  applied_at TIMESTAMPTZ,

  -- Ensure discount + charity = 50% of standard_amount
  CONSTRAINT check_reward_amounts
    CHECK (discount_amount + charity_amount = standard_amount / 2),

  -- Charity fields must both be set or both null
  CONSTRAINT check_charity_fields
    CHECK (
      (charity_amount = 0 AND globalgiving_project_id IS NULL AND globalgiving_project_name IS NULL)
      OR
      (charity_amount > 0 AND globalgiving_project_id IS NOT NULL AND globalgiving_project_name IS NOT NULL)
    )
);

-- One reward per user per month
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_rewards_user_month
  ON user_rewards (user_id, reward_month);

CREATE INDEX IF NOT EXISTS idx_user_rewards_status
  ON user_rewards (status) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_user_rewards_user_id
  ON user_rewards (user_id);

-- ============================================================================
-- 5. Enable RLS
-- ============================================================================
ALTER TABLE user_monthly_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_rewards ENABLE ROW LEVEL SECURITY;

-- Users can read their own goals
CREATE POLICY "Users can view own goals"
  ON user_monthly_goals FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own goals
CREATE POLICY "Users can create own goals"
  ON user_monthly_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own goals
CREATE POLICY "Users can update own goals"
  ON user_monthly_goals FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can read their own rewards
CREATE POLICY "Users can view own rewards"
  ON user_rewards FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can do everything (for API routes)
CREATE POLICY "Service role full access on goals"
  ON user_monthly_goals FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on rewards"
  ON user_rewards FOR ALL
  USING (auth.role() = 'service_role');
