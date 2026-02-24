/* =============================================================================
   GOALS SYSTEM — MONTHLY & WEEKLY GOALS
   
   Adds:
   1. goal_templates   — reusable goal definitions (seeded once)
   2. user_goals       — per-user goal instances per period
   3. goal_events      — append-only event log driving progress
   4. user_streaks     — daily streak tracking
   5. RLS policies     — row-level security for all tables
   6. Helper functions — period calculation, goal generation, event processing
============================================================================= */

-- ============================================================================
-- 1. goal_templates — reusable goal definitions
-- ============================================================================
CREATE TABLE IF NOT EXISTS goal_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN (
    'immersion', 'vocabulary', 'grammar', 'cloze',
    'speaking', 'social', 'streak', 'milestone'
  )),
  period_type TEXT NOT NULL CHECK (period_type IN ('monthly', 'weekly')),
  target_value INTEGER NOT NULL,
  target_unit TEXT NOT NULL CHECK (target_unit IN (
    'days', 'words', 'sessions', 'hours', 'minutes',
    'exercises', 'wins', 'stories'
  )),
  tracking_event TEXT NOT NULL,
  icon TEXT,
  tier_required TEXT NOT NULL DEFAULT 'tide' CHECK (tier_required IN (
    'tide', 'snorkeler', 'diver', 'submariner'
  )),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_goal_templates_period
  ON goal_templates (period_type) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_goal_templates_event
  ON goal_templates (tracking_event) WHERE is_active = TRUE;

COMMENT ON TABLE goal_templates IS 'Reusable goal definitions. Seeded once, referenced by generated user goals.';
COMMENT ON COLUMN goal_templates.tracking_event IS 'Event key that increments progress. Must match goal_events.event_type.';

-- ============================================================================
-- 2. user_goals — generated goal instances per user per period
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES goal_templates ON DELETE CASCADE,
  period_type TEXT NOT NULL CHECK (period_type IN ('monthly', 'weekly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  target_value INTEGER NOT NULL,
  current_value INTEGER NOT NULL DEFAULT 0,
  is_complete BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, template_id, period_start)
);

CREATE INDEX IF NOT EXISTS idx_user_goals_user_period
  ON user_goals (user_id, period_type, period_start);

CREATE INDEX IF NOT EXISTS idx_user_goals_active
  ON user_goals (user_id, period_start, period_end)
  WHERE is_complete = FALSE;

CREATE INDEX IF NOT EXISTS idx_user_goals_template
  ON user_goals (template_id);

COMMENT ON TABLE user_goals IS 'Per-user goal instances generated from templates each period.';

-- ============================================================================
-- 3. goal_events — append-only event log
-- ============================================================================
CREATE TABLE IF NOT EXISTS goal_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  value INTEGER NOT NULL DEFAULT 1,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_goal_events_user_type
  ON goal_events (user_id, event_type);

CREATE INDEX IF NOT EXISTS idx_goal_events_user_date
  ON goal_events (user_id, created_at);

-- Partial index for daily_activity deduplication
CREATE INDEX IF NOT EXISTS idx_goal_events_daily_activity
  ON goal_events (user_id, created_at)
  WHERE event_type = 'daily_activity';

COMMENT ON TABLE goal_events IS 'Append-only event log. Each row represents a trackable action the user performed.';

-- ============================================================================
-- 4. user_streaks — daily streak tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_streaks (
  user_id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_active_date DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE user_streaks IS 'Tracks daily activity streaks per user.';

-- ============================================================================
-- 5. Enable RLS on all tables
-- ============================================================================
ALTER TABLE goal_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;

-- ── goal_templates: public read, no user writes ─────────────────────────────
CREATE POLICY "Anyone can read active goal templates"
  ON goal_templates FOR SELECT
  USING (TRUE);

CREATE POLICY "Service role full access on goal templates"
  ON goal_templates FOR ALL
  USING (auth.role() = 'service_role');

-- ── user_goals: users SELECT own rows only, writes via service role ─────────
CREATE POLICY "Users can view own goals"
  ON user_goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on user goals"
  ON user_goals FOR ALL
  USING (auth.role() = 'service_role');

-- ── goal_events: users INSERT + SELECT own only ─────────────────────────────
CREATE POLICY "Users can view own goal events"
  ON goal_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goal events"
  ON goal_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access on goal events"
  ON goal_events FOR ALL
  USING (auth.role() = 'service_role');

-- ── user_streaks: users SELECT own only, writes via service role ────────────
CREATE POLICY "Users can view own streak"
  ON user_streaks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on user streaks"
  ON user_streaks FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- 6. Helper function: generate goals for a single user + period
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_goals_for_user(
  p_user_id UUID,
  p_period_type TEXT  -- 'monthly' | 'weekly'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_period_start DATE;
  v_period_end DATE;
  v_now DATE := CURRENT_DATE;
  v_created INTEGER := 0;
  v_template RECORD;
BEGIN
  -- Calculate period boundaries
  IF p_period_type = 'monthly' THEN
    v_period_start := date_trunc('month', v_now)::date;
    v_period_end := (date_trunc('month', v_now) + INTERVAL '1 month' - INTERVAL '1 day')::date;
  ELSIF p_period_type = 'weekly' THEN
    -- Monday of current week
    v_period_start := v_now - ((EXTRACT(ISODOW FROM v_now)::int - 1) || ' days')::interval;
    -- Sunday of current week
    v_period_end := v_period_start + INTERVAL '6 days';
  ELSE
    RAISE EXCEPTION 'Invalid period_type: %', p_period_type;
  END IF;

  -- Insert goals for each active template of this period type
  FOR v_template IN
    SELECT id, target_value
    FROM goal_templates
    WHERE period_type = p_period_type AND is_active = TRUE
  LOOP
    INSERT INTO user_goals (user_id, template_id, period_type, period_start, period_end, target_value)
    VALUES (p_user_id, v_template.id, p_period_type, v_period_start, v_period_end, v_template.target_value)
    ON CONFLICT (user_id, template_id, period_start) DO NOTHING;

    IF FOUND THEN
      v_created := v_created + 1;
    END IF;
  END LOOP;

  RETURN v_created;
END;
$$;

-- ============================================================================
-- 7. Helper function: process a goal event and update progress
-- ============================================================================
CREATE OR REPLACE FUNCTION process_goal_event(
  p_user_id UUID,
  p_event_type TEXT,
  p_value INTEGER DEFAULT 1,
  p_metadata JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_already_active BOOLEAN;
  v_goal RECORD;
  v_updated_ids UUID[] := '{}';
  v_completed_ids UUID[] := '{}';
  v_new_current INTEGER;
  v_streak_row user_streaks%ROWTYPE;
BEGIN
  -- ── Daily activity deduplication ──────────────────────────────────────
  IF p_event_type = 'daily_activity' THEN
    SELECT EXISTS(
      SELECT 1 FROM goal_events
      WHERE user_id = p_user_id
        AND event_type = 'daily_activity'
        AND created_at >= v_today
        AND created_at < v_today + INTERVAL '1 day'
    ) INTO v_already_active;

    IF v_already_active THEN
      RETURN jsonb_build_object(
        'inserted', FALSE,
        'reason', 'daily_activity already logged today',
        'updated', '[]'::jsonb,
        'completed', '[]'::jsonb,
        'reward_eligible', FALSE
      );
    END IF;
  END IF;

  -- ── Insert event ─────────────────────────────────────────────────────
  INSERT INTO goal_events (user_id, event_type, value, metadata)
  VALUES (p_user_id, p_event_type, p_value, p_metadata);

  -- ── Update matching active goals ─────────────────────────────────────
  FOR v_goal IN
    SELECT ug.id, ug.current_value, ug.target_value
    FROM user_goals ug
    JOIN goal_templates gt ON gt.id = ug.template_id
    WHERE ug.user_id = p_user_id
      AND gt.tracking_event = p_event_type
      AND ug.period_start <= v_today
      AND ug.period_end >= v_today
      AND ug.is_complete = FALSE
  LOOP
    v_new_current := LEAST(v_goal.current_value + p_value, v_goal.target_value);

    IF v_new_current >= v_goal.target_value THEN
      UPDATE user_goals
      SET current_value = v_new_current,
          is_complete = TRUE,
          completed_at = NOW()
      WHERE id = v_goal.id;
      v_completed_ids := array_append(v_completed_ids, v_goal.id);
    ELSE
      UPDATE user_goals
      SET current_value = v_new_current
      WHERE id = v_goal.id;
    END IF;

    v_updated_ids := array_append(v_updated_ids, v_goal.id);
  END LOOP;

  -- ── Streak tracking (only for daily_activity) ────────────────────────
  IF p_event_type = 'daily_activity' THEN
    SELECT * INTO v_streak_row FROM user_streaks WHERE user_id = p_user_id;

    IF NOT FOUND THEN
      INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_active_date)
      VALUES (p_user_id, 1, 1, v_today);
    ELSIF v_streak_row.last_active_date = v_today THEN
      -- Already counted today, do nothing
      NULL;
    ELSIF v_streak_row.last_active_date = v_today - 1 THEN
      -- Consecutive day — extend streak
      UPDATE user_streaks
      SET current_streak = current_streak + 1,
          longest_streak = GREATEST(longest_streak, current_streak + 1),
          last_active_date = v_today,
          updated_at = NOW()
      WHERE user_id = p_user_id;
    ELSE
      -- Streak broken — reset to 1
      UPDATE user_streaks
      SET current_streak = 1,
          last_active_date = v_today,
          updated_at = NOW()
      WHERE user_id = p_user_id;
    END IF;

    -- Sync streak value into active monthly streak goals
    UPDATE user_goals
    SET current_value = LEAST(
      (SELECT current_streak FROM user_streaks WHERE user_id = p_user_id),
      target_value
    ),
    is_complete = CASE
      WHEN (SELECT current_streak FROM user_streaks WHERE user_id = p_user_id) >= target_value
      THEN TRUE ELSE is_complete
    END,
    completed_at = CASE
      WHEN (SELECT current_streak FROM user_streaks WHERE user_id = p_user_id) >= target_value
           AND is_complete = FALSE
      THEN NOW() ELSE completed_at
    END
    WHERE user_id = p_user_id
      AND template_id IN (
        SELECT id FROM goal_templates
        WHERE tracking_event = 'daily_activity'
          AND period_type = 'monthly'
          AND category = 'streak'
      )
      AND period_start <= v_today
      AND period_end >= v_today;
  END IF;

  -- ── Check reward eligibility ─────────────────────────────────────────
  -- All monthly goals + all 4 weekly sets must be complete
  RETURN jsonb_build_object(
    'inserted', TRUE,
    'updated', to_jsonb(v_updated_ids),
    'completed', to_jsonb(v_completed_ids),
    'reward_eligible', check_reward_eligibility(p_user_id)
  );
END;
$$;

-- ============================================================================
-- 8. Helper function: check reward eligibility
-- ============================================================================
CREATE OR REPLACE FUNCTION check_reward_eligibility(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_month_start DATE := date_trunc('month', CURRENT_DATE)::date;
  v_month_end DATE := (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::date;
  v_total_monthly INTEGER;
  v_complete_monthly INTEGER;
  v_total_weekly_sets INTEGER;
  v_complete_weekly_sets INTEGER;
  v_week_start DATE;
  v_week_end DATE;
  v_week_total INTEGER;
  v_week_complete INTEGER;
BEGIN
  -- Check monthly goals
  SELECT COUNT(*), COUNT(*) FILTER (WHERE is_complete)
  INTO v_total_monthly, v_complete_monthly
  FROM user_goals
  WHERE user_id = p_user_id
    AND period_type = 'monthly'
    AND period_start = v_month_start;

  IF v_total_monthly = 0 OR v_complete_monthly < v_total_monthly THEN
    RETURN FALSE;
  END IF;

  -- Check weekly goals: iterate all weeks in this month
  v_total_weekly_sets := 0;
  v_complete_weekly_sets := 0;

  -- Find the first Monday on or after the 1st of the month
  v_week_start := v_month_start;
  -- Adjust to Monday
  IF EXTRACT(ISODOW FROM v_week_start) != 1 THEN
    v_week_start := v_week_start + ((8 - EXTRACT(ISODOW FROM v_week_start)::int) % 7 || ' days')::interval;
  END IF;

  -- Also include the week that contains the 1st (if 1st is not Monday)
  IF v_month_start < v_week_start THEN
    -- The partial first week starting from day 1
    v_week_end := v_week_start - INTERVAL '1 day';
    -- Check if there are weekly goals for this stub week
    SELECT COUNT(*), COUNT(*) FILTER (WHERE is_complete)
    INTO v_week_total, v_week_complete
    FROM user_goals
    WHERE user_id = p_user_id
      AND period_type = 'weekly'
      AND period_start = v_month_start - ((EXTRACT(ISODOW FROM v_month_start)::int - 1) || ' days')::interval;

    IF v_week_total > 0 THEN
      v_total_weekly_sets := v_total_weekly_sets + 1;
      IF v_week_complete = v_week_total THEN
        v_complete_weekly_sets := v_complete_weekly_sets + 1;
      END IF;
    END IF;
  END IF;

  -- Loop through full weeks within the month
  WHILE v_week_start <= v_month_end LOOP
    v_week_end := LEAST(v_week_start + INTERVAL '6 days', v_month_end);

    SELECT COUNT(*), COUNT(*) FILTER (WHERE is_complete)
    INTO v_week_total, v_week_complete
    FROM user_goals
    WHERE user_id = p_user_id
      AND period_type = 'weekly'
      AND period_start = v_week_start;

    IF v_week_total > 0 THEN
      v_total_weekly_sets := v_total_weekly_sets + 1;
      IF v_week_complete = v_week_total THEN
        v_complete_weekly_sets := v_complete_weekly_sets + 1;
      END IF;
    END IF;

    v_week_start := v_week_start + INTERVAL '7 days';
  END LOOP;

  -- Must have at least 4 completed weekly sets
  RETURN v_complete_weekly_sets >= 4;
END;
$$;

-- ============================================================================
-- 9. Cron jobs (commented out — uncomment if pg_cron is available)
-- ============================================================================

-- Generate weekly goals every Monday at 00:01 UTC
-- SELECT cron.schedule(
--   'generate-weekly-goals',
--   '1 0 * * 1',
--   $$
--   SELECT generate_goals_for_user(id, 'weekly')
--   FROM auth.users
--   WHERE id IN (SELECT DISTINCT user_id FROM user_goals)
--      OR id IN (SELECT id FROM auth.users WHERE created_at > NOW() - INTERVAL '7 days')
--   $$
-- );

-- Generate monthly goals on the 1st at 00:01 UTC
-- SELECT cron.schedule(
--   'generate-monthly-goals',
--   '1 0 1 * *',
--   $$
--   SELECT generate_goals_for_user(id, 'monthly')
--   FROM auth.users
--   WHERE id IN (SELECT DISTINCT user_id FROM user_goals)
--      OR id IN (SELECT id FROM auth.users WHERE created_at > NOW() - INTERVAL '30 days')
--   $$
-- );

-- Expire incomplete goals daily at 23:59 UTC
-- SELECT cron.schedule(
--   'expire-incomplete-goals',
--   '59 23 * * *',
--   $$
--   UPDATE user_goals
--   SET is_complete = FALSE
--   WHERE period_end < CURRENT_DATE
--     AND is_complete = FALSE
--   $$
-- );
