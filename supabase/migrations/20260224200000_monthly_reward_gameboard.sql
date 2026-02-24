/* =============================================================================
   MONTHLY REWARD GAMEBOARD
   
   Adds:
   1. monthly_rewards — tracks tile-flip gameboard rewards per user per month
   2. user_weekly_goals (stub) — tracks weekly goal completion
      TODO: Integrate with real weekly goals system when available
   3. RLS policies — users can only read their own rows; writes via service role
   4. Cron job to expire unclaimed rewards after the 5th of the next month
============================================================================= */

-- ============================================================================
-- 1. Create user_weekly_goals stub table (if not exists)
--    TODO: Replace with real weekly goals table when the goals system is built
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_weekly_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  week_start DATE NOT NULL,              -- Monday of the goal week
  goal_month DATE NOT NULL,              -- first day of the month this week belongs to
  title TEXT NOT NULL DEFAULT 'Weekly Goal',
  target_value INTEGER NOT NULL DEFAULT 1,
  current_value INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_weekly_goals_unique
  ON user_weekly_goals (user_id, week_start, title);

CREATE INDEX IF NOT EXISTS idx_user_weekly_goals_user_month
  ON user_weekly_goals (user_id, goal_month);

-- ============================================================================
-- 2. Create monthly_rewards table
-- ============================================================================
CREATE TABLE IF NOT EXISTS monthly_rewards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  month DATE NOT NULL,                        -- first day of the reward month e.g. 2026-03-01
  tier TEXT NOT NULL CHECK (tier IN ('diver', 'submariner')),
  tile_order INTEGER[] NOT NULL,              -- server-shuffled 16-element array of discount %s
  chosen_index INTEGER CHECK (chosen_index >= 0 AND chosen_index <= 15),
  discount_percent INTEGER CHECK (discount_percent >= 0 AND discount_percent <= 100),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'claimed', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  claimed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE(user_id, month)
);

CREATE INDEX IF NOT EXISTS idx_monthly_rewards_user_status
  ON monthly_rewards (user_id, status);

CREATE INDEX IF NOT EXISTS idx_monthly_rewards_expires
  ON monthly_rewards (expires_at) WHERE status = 'pending';

-- ============================================================================
-- 3. Enable RLS
-- ============================================================================
ALTER TABLE user_weekly_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_rewards ENABLE ROW LEVEL SECURITY;

-- ── user_weekly_goals policies ──────────────────────────────────────────────
CREATE POLICY "Users can view own weekly goals"
  ON user_weekly_goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own weekly goals"
  ON user_weekly_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weekly goals"
  ON user_weekly_goals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on weekly goals"
  ON user_weekly_goals FOR ALL
  USING (auth.role() = 'service_role');

-- ── monthly_rewards policies ────────────────────────────────────────────────
-- Users can only SELECT their own rows
CREATE POLICY "Users can view own monthly rewards"
  ON monthly_rewards FOR SELECT
  USING (auth.uid() = user_id);

-- All writes (INSERT, UPDATE, DELETE) go through service role only
CREATE POLICY "Service role full access on monthly rewards"
  ON monthly_rewards FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- 4. Server-side function: expire unclaimed rewards
--    Called by pg_cron or manually. Marks any 'pending' reward past its
--    expires_at as 'expired'.
-- ============================================================================
CREATE OR REPLACE FUNCTION expire_unclaimed_rewards()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE monthly_rewards
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < NOW();

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$;

-- ============================================================================
-- 5. Schedule cron job to expire rewards daily at midnight UTC
--    Requires pg_cron extension (enabled on Supabase by default)
-- ============================================================================
-- NOTE: Uncomment below if pg_cron is available in your Supabase project.
-- SELECT cron.schedule(
--   'expire-unclaimed-rewards',
--   '0 0 * * *',   -- daily at midnight UTC
--   $$SELECT expire_unclaimed_rewards()$$
-- );

COMMENT ON TABLE monthly_rewards IS 'Stores monthly gameboard tile-flip rewards for Diver/Submariner tier users';
COMMENT ON COLUMN monthly_rewards.tile_order IS 'Server-shuffled array of 16 discount percentages — NEVER expose to client';
COMMENT ON COLUMN monthly_rewards.chosen_index IS 'Index (0-15) the user chose to flip — NULL until claimed';
COMMENT ON COLUMN monthly_rewards.discount_percent IS 'The discount % revealed at chosen_index — NULL until claimed';
COMMENT ON TABLE user_weekly_goals IS 'Stub table for weekly goal tracking. TODO: integrate with full goals system';
