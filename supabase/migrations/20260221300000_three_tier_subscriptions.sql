-- =============================================================================
-- Migration: Update subscription tiers to three-tier system
--
-- Old tiers: 'free' | 'premium'
-- New tiers: 'snorkeler' | 'diver' | 'submariner'
--
-- Also adds: subscription_status, next_payment_date columns
-- =============================================================================

-- 1. Drop the old CHECK constraint
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_subscription_tier_check;

-- 2. Migrate existing data
UPDATE profiles SET subscription_tier = 'snorkeler'  WHERE subscription_tier = 'free';
UPDATE profiles SET subscription_tier = 'diver'      WHERE subscription_tier = 'premium';

-- 3. Set default and add new CHECK constraint
ALTER TABLE profiles
  ALTER COLUMN subscription_tier SET DEFAULT 'snorkeler';

ALTER TABLE profiles
  ADD CONSTRAINT profiles_subscription_tier_check
  CHECK (subscription_tier IN ('snorkeler', 'diver', 'submariner'));

-- 4. Add subscription_status column (active, past_due, cancelled, none)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'none'
  CHECK (subscription_status IN ('active', 'past_due', 'cancelled', 'none'));

-- Update existing subscription_status based on current data
UPDATE profiles
  SET subscription_status = 'active'
  WHERE subscription_tier IN ('diver', 'submariner')
    AND subscription_expires_at > NOW();

UPDATE profiles
  SET subscription_status = 'none'
  WHERE subscription_tier = 'snorkeler';

-- 5. Add next_payment_date column
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS next_payment_date TIMESTAMP WITH TIME ZONE;

-- Copy existing subscription_expires_at to next_payment_date for active paid subscriptions
UPDATE profiles
  SET next_payment_date = subscription_expires_at
  WHERE subscription_tier IN ('diver', 'submariner')
    AND subscription_expires_at IS NOT NULL;

-- 6. Update the claim_session and can_start_session RPCs to use new tier names
-- The RPC functions reference 'premium' in their logic; update to check for diver/submariner
-- We replace the check: subscription_tier = 'premium' → subscription_tier IN ('diver', 'submariner')

-- Recreate can_start_session with updated tier check
CREATE OR REPLACE FUNCTION can_start_session(p_user_id UUID, p_session_type TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tier TEXT;
  v_count INT;
  v_limit INT;
  v_col TEXT;
BEGIN
  -- Get user tier
  SELECT subscription_tier INTO v_tier FROM profiles WHERE id = p_user_id;

  -- Paid tiers (diver, submariner) get unlimited access
  IF v_tier IN ('diver', 'submariner') THEN
    RETURN jsonb_build_object('allowed', true, 'isPremium', true);
  END IF;

  -- Determine column and limit based on session type
  IF p_session_type = 'foundation' THEN
    v_limit := 5;
    v_col := 'foundation_sessions';
  ELSIF p_session_type = 'sentence' THEN
    v_limit := 3;
    v_col := 'sentence_sessions';
  ELSIF p_session_type = 'microstory' THEN
    v_limit := 1;
    v_col := 'microstory_sessions';
  ELSIF p_session_type = 'main' THEN
    v_limit := 1;
    v_col := 'main_lessons';
  ELSE
    RETURN jsonb_build_object('allowed', false, 'limitReached', true);
  END IF;

  -- Get today's count
  EXECUTE format(
    'SELECT COALESCE(%I, 0) FROM user_daily_usage WHERE user_id = $1 AND usage_date = CURRENT_DATE',
    v_col
  ) INTO v_count USING p_user_id;

  IF v_count IS NULL THEN v_count := 0; END IF;

  IF v_count >= v_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'limitReached', true,
      'currentCount', v_count,
      'limit', v_limit,
      'remaining', 0,
      'sessionType', p_session_type
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'limitReached', false,
    'currentCount', v_count,
    'limit', v_limit,
    'remaining', v_limit - v_count,
    'sessionType', p_session_type
  );
END;
$$;

-- Recreate claim_session with updated tier check
CREATE OR REPLACE FUNCTION claim_session(p_user_id UUID, p_session_type TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tier TEXT;
  v_count INT;
  v_limit INT;
  v_col TEXT;
BEGIN
  -- Get user tier
  SELECT subscription_tier INTO v_tier FROM profiles WHERE id = p_user_id;

  -- Paid tiers (diver, submariner) get unlimited access
  IF v_tier IN ('diver', 'submariner') THEN
    RETURN jsonb_build_object('allowed', true, 'isPremium', true);
  END IF;

  -- Determine column and limit
  IF p_session_type = 'foundation' THEN
    v_limit := 5;
    v_col := 'foundation_sessions';
  ELSIF p_session_type = 'sentence' THEN
    v_limit := 3;
    v_col := 'sentence_sessions';
  ELSIF p_session_type = 'microstory' THEN
    v_limit := 1;
    v_col := 'microstory_sessions';
  ELSIF p_session_type = 'main' THEN
    v_limit := 1;
    v_col := 'main_lessons';
  ELSE
    RETURN jsonb_build_object('allowed', false, 'limitReached', true);
  END IF;

  -- Upsert + increment atomically
  INSERT INTO user_daily_usage (user_id, usage_date, foundation_sessions, sentence_sessions, microstory_sessions, main_lessons)
  VALUES (p_user_id, CURRENT_DATE, 0, 0, 0, 0)
  ON CONFLICT (user_id, usage_date) DO NOTHING;

  -- Get current count
  EXECUTE format(
    'SELECT COALESCE(%I, 0) FROM user_daily_usage WHERE user_id = $1 AND usage_date = CURRENT_DATE',
    v_col
  ) INTO v_count USING p_user_id;

  IF v_count IS NULL THEN v_count := 0; END IF;

  IF v_count >= v_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'limitReached', true,
      'currentCount', v_count,
      'limit', v_limit,
      'remaining', 0,
      'sessionType', p_session_type
    );
  END IF;

  -- Increment
  EXECUTE format(
    'UPDATE user_daily_usage SET %I = %I + 1 WHERE user_id = $1 AND usage_date = CURRENT_DATE',
    v_col, v_col
  ) USING p_user_id;

  RETURN jsonb_build_object(
    'allowed', true,
    'limitReached', false,
    'currentCount', v_count + 1,
    'limit', v_limit,
    'remaining', v_limit - v_count - 1,
    'sessionType', p_session_type
  );
END;
$$;
