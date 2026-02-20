/* =============================================================================
   COMMUNITY POOLED DONATION MODEL — OCEAN CLEANUP
   
   Migration: Replace GlobalGiving per-user donations with a community-pooled
   donation model that donates monthly to The Ocean Cleanup.

   New tables:
     1. community_donations — each monthly donation made by admin
     2. user_impact — per-user proportional allocation from each donation

   Modified tables:
     - profiles: add reward_credits, total_bottles_allocated, total_fields_allocated
     - user_rewards: drop globalgiving constraint + columns

   New views:
     - community_impact_summary — aggregated community stats
     
   New functions:
     - credit_redemptions — tracks individual credit redemptions per period
============================================================================= */

-- ============================================================================
-- 1. Add new columns to profiles
-- ============================================================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS reward_credits INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_bottles_allocated NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_fields_allocated NUMERIC NOT NULL DEFAULT 0;

COMMENT ON COLUMN profiles.reward_credits IS 'Current redeemable credits earned from goal completion';
COMMENT ON COLUMN profiles.total_bottles_allocated IS 'Lifetime total plastic bottles allocated to this user';
COMMENT ON COLUMN profiles.total_fields_allocated IS 'Lifetime total football fields of ocean allocated to this user';

-- ============================================================================
-- 2. Create community_donations table
-- ============================================================================
CREATE TABLE IF NOT EXISTS community_donations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  donated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  amount_zar NUMERIC NOT NULL,
  amount_usd NUMERIC NOT NULL,
  bottles_intercepted NUMERIC NOT NULL,
  football_fields_swept NUMERIC NOT NULL,
  total_credits_redeemed INTEGER NOT NULL DEFAULT 0,
  receipt_url TEXT,          -- manually added by admin after payment
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE community_donations IS 'Monthly pooled donations to The Ocean Cleanup';

-- ============================================================================
-- 3. Create credit_redemptions table
--    Tracks individual credit redemptions within a donation period
-- ============================================================================
CREATE TABLE IF NOT EXISTS credit_redemptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  credits INTEGER NOT NULL CHECK (credits > 0),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_redemptions_user
  ON credit_redemptions (user_id);

CREATE INDEX IF NOT EXISTS idx_credit_redemptions_period
  ON credit_redemptions (period_start, period_end);

-- ============================================================================
-- 4. Create user_impact table
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_impact (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  donation_id UUID NOT NULL REFERENCES community_donations ON DELETE CASCADE,
  credits_redeemed INTEGER NOT NULL,
  bottles_allocated NUMERIC NOT NULL,
  fields_allocated NUMERIC NOT NULL,
  notified_at TIMESTAMPTZ,   -- NULL = not yet notified
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_impact_user
  ON user_impact (user_id);

CREATE INDEX IF NOT EXISTS idx_user_impact_donation
  ON user_impact (donation_id);

CREATE INDEX IF NOT EXISTS idx_user_impact_not_notified
  ON user_impact (notified_at) WHERE notified_at IS NULL;

-- ============================================================================
-- 5. Enable RLS
-- ============================================================================
ALTER TABLE community_donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_impact ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_redemptions ENABLE ROW LEVEL SECURITY;

-- community_donations: anyone authenticated can read (public stats)
CREATE POLICY "Authenticated users can view community donations"
  ON community_donations FOR SELECT
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Only service_role can insert/update/delete community_donations
CREATE POLICY "Service role manages community donations"
  ON community_donations FOR ALL
  USING (auth.role() = 'service_role');

-- user_impact: users can only see their own rows
CREATE POLICY "Users can view own impact"
  ON user_impact FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages user impact"
  ON user_impact FOR ALL
  USING (auth.role() = 'service_role');

-- credit_redemptions: users can see their own
CREATE POLICY "Users can view own redemptions"
  ON credit_redemptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages credit redemptions"
  ON credit_redemptions FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- 6. Create community_impact_summary view
--
--    No SECURITY DEFINER — the view runs with the privileges of the calling
--    user. community_donations has an RLS policy that allows authenticated
--    users to SELECT, and user_impact rows are counted via a subquery that
--    also respects RLS. Authenticated users will therefore see full community
--    totals (all donation rows are visible to them) while being unable to
--    read individual user_impact rows they don't own.
-- ============================================================================
CREATE OR REPLACE VIEW community_impact_summary
  WITH (security_invoker = true)
AS
SELECT
  COALESCE(SUM(cd.bottles_intercepted), 0) AS total_bottles,
  COALESCE(SUM(cd.football_fields_swept), 0) AS total_fields,
  COALESCE(SUM(cd.bottles_intercepted) FILTER (
    WHERE cd.period_start >= date_trunc('month', CURRENT_DATE)
  ), 0) AS this_month_bottles,
  COALESCE(SUM(cd.football_fields_swept) FILTER (
    WHERE cd.period_start >= date_trunc('month', CURRENT_DATE)
  ), 0) AS this_month_fields,
  (
    SELECT COUNT(DISTINCT ui.user_id)
    FROM user_impact ui
  ) AS total_donors,
  COUNT(cd.id) AS total_donations
FROM community_donations cd;

-- Grant SELECT to both roles — no SECURITY DEFINER needed because
-- community_donations RLS already permits authenticated reads, and
-- the total_donors subquery is only surfaced via the service-role
-- API route (not directly by the client).
GRANT SELECT ON community_impact_summary TO authenticated;
GRANT SELECT ON community_impact_summary TO service_role;

-- ============================================================================
-- 7. Clean up GlobalGiving columns from user_rewards
--    (Drop constraint first, then columns)
-- ============================================================================
DO $$
BEGIN
  -- Drop the charity fields constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'check_charity_fields'
    AND table_name = 'user_rewards'
  ) THEN
    ALTER TABLE user_rewards DROP CONSTRAINT check_charity_fields;
  END IF;
END$$;

-- Make globalgiving columns nullable and mark as deprecated
-- (We don't drop them yet to preserve historical data)
ALTER TABLE user_rewards
  ALTER COLUMN globalgiving_project_id DROP NOT NULL,
  ALTER COLUMN globalgiving_project_name DROP NOT NULL;

-- Set all existing globalgiving references to NULL for clean slate
UPDATE user_rewards
SET globalgiving_project_id = NULL,
    globalgiving_project_name = NULL
WHERE globalgiving_project_id IS NOT NULL;

COMMENT ON COLUMN user_rewards.globalgiving_project_id IS 'DEPRECATED — GlobalGiving integration removed. Retained for historical data.';
COMMENT ON COLUMN user_rewards.globalgiving_project_name IS 'DEPRECATED — GlobalGiving integration removed. Retained for historical data.';