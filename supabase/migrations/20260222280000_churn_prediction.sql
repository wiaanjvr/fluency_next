-- ============================================================================
-- Churn Prediction & Engagement Rescue — Database Support (ML System 9)
--
-- Tables for churn predictions, mid-session risk snapshots, rescue
-- intervention logs, and SQL functions that aggregate training features.
--
-- New tables:
--   1. churn_predictions            — daily pre-session churn risk per user
--   2. session_abandonment_snapshots — mid-session risk snapshots (every 5 words)
--   3. rescue_interventions         — logged rescue actions taken
--
-- New functions:
--   1. get_pre_session_training_data  — features for the daily churn model
--   2. get_mid_session_training_data  — features for the mid-session model
--   3. label_abandoned_sessions       — derive abandonment labels from session_summaries
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. churn_predictions — daily pre-session churn risk per user
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS churn_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  churn_probability DOUBLE PRECISION NOT NULL CHECK (
    churn_probability BETWEEN 0.0 AND 1.0
  ),
  trigger_notification BOOLEAN NOT NULL DEFAULT FALSE,
  notification_hook TEXT,
  model_version TEXT NOT NULL DEFAULT 'v0.1.0',
  features JSONB NOT NULL DEFAULT '{}',
  prediction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One prediction per user per day
  UNIQUE(user_id, prediction_date)
);

CREATE INDEX IF NOT EXISTS idx_churn_predictions_user_date
  ON churn_predictions (user_id, prediction_date DESC);

CREATE INDEX IF NOT EXISTS idx_churn_predictions_high_risk
  ON churn_predictions (churn_probability DESC)
  WHERE trigger_notification = TRUE;

-- Enable RLS
ALTER TABLE churn_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own churn predictions"
  ON churn_predictions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to churn_predictions"
  ON churn_predictions FOR ALL
  USING (auth.role() = 'service_role');


-- ---------------------------------------------------------------------------
-- 2. session_abandonment_snapshots — mid-session risk checkpoints
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS session_abandonment_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL,
  words_completed_so_far INTEGER NOT NULL DEFAULT 0,
  abandonment_probability DOUBLE PRECISION NOT NULL CHECK (
    abandonment_probability BETWEEN 0.0 AND 1.0
  ),
  recommended_intervention TEXT,
  intervention_applied BOOLEAN NOT NULL DEFAULT FALSE,
  features JSONB NOT NULL DEFAULT '{}',
  model_version TEXT NOT NULL DEFAULT 'v0.1.0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_abandonment_snapshots_session
  ON session_abandonment_snapshots (session_id, words_completed_so_far);

CREATE INDEX IF NOT EXISTS idx_abandonment_snapshots_user
  ON session_abandonment_snapshots (user_id, created_at DESC);

-- Enable RLS
ALTER TABLE session_abandonment_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own abandonment snapshots"
  ON session_abandonment_snapshots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to session_abandonment_snapshots"
  ON session_abandonment_snapshots FOR ALL
  USING (auth.role() = 'service_role');


-- ---------------------------------------------------------------------------
-- 3. rescue_interventions — log of rescue actions taken
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS rescue_interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL,
  intervention_type TEXT NOT NULL CHECK (intervention_type IN (
    'shorten_session',
    'switch_easier_content',
    'switch_module',
    'celebrate_micro_progress',
    'suggest_break'
  )),
  trigger_probability DOUBLE PRECISION NOT NULL,
  intervention_payload JSONB NOT NULL DEFAULT '{}',
  user_accepted BOOLEAN,
  session_completed_after BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rescue_interventions_session
  ON rescue_interventions (session_id);

CREATE INDEX IF NOT EXISTS idx_rescue_interventions_user
  ON rescue_interventions (user_id, created_at DESC);

-- Enable RLS
ALTER TABLE rescue_interventions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own rescue interventions"
  ON rescue_interventions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to rescue_interventions"
  ON rescue_interventions FOR ALL
  USING (auth.role() = 'service_role');


-- ---------------------------------------------------------------------------
-- 4. get_pre_session_training_data — aggregated features for churn model
-- ---------------------------------------------------------------------------
-- Returns one row per user×day with features and label for churn prediction.
-- Label: did the user NOT start a session on the given day?
-- We look back over the last N days of data for each user.

CREATE OR REPLACE FUNCTION get_pre_session_training_data(
  p_lookback_days INTEGER DEFAULT 90
)
RETURNS TABLE (
  user_id UUID,
  observation_date DATE,
  days_since_last_session DOUBLE PRECISION,
  current_streak_days INTEGER,
  last_session_cognitive_load DOUBLE PRECISION,
  last_session_completion BOOLEAN,
  average_sessions_per_week DOUBLE PRECISION,
  day_of_week INTEGER,
  time_of_day TEXT,
  did_not_session_today BOOLEAN
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH date_range AS (
    SELECT generate_series(
      CURRENT_DATE - p_lookback_days,
      CURRENT_DATE - 1,
      '1 day'::INTERVAL
    )::DATE AS obs_date
  ),
  active_users AS (
    -- Users with at least 10 sessions total
    SELECT DISTINCT ss.user_id AS uid
    FROM session_summaries ss
    GROUP BY ss.user_id
    HAVING COUNT(*) >= 10
  ),
  user_dates AS (
    SELECT au.uid, dr.obs_date
    FROM active_users au
    CROSS JOIN date_range dr
  ),
  daily_sessions AS (
    -- Whether each user had a session on each date
    SELECT
      ss.user_id AS uid,
      ss.started_at::DATE AS session_date,
      MAX(ss.estimated_cognitive_load) AS max_cognitive_load,
      BOOL_OR(ss.completed_session) AS any_completed
    FROM session_summaries ss
    WHERE ss.started_at >= (CURRENT_DATE - p_lookback_days - 30)
    GROUP BY ss.user_id, ss.started_at::DATE
  ),
  last_session_before AS (
    -- For each user×date, find the most recent session before that date
    SELECT DISTINCT ON (ud.uid, ud.obs_date)
      ud.uid,
      ud.obs_date,
      ds.session_date AS last_date,
      ds.max_cognitive_load AS last_cog_load,
      ds.any_completed AS last_completed,
      (ud.obs_date - ds.session_date) AS gap_days
    FROM user_dates ud
    INNER JOIN daily_sessions ds
      ON ds.uid = ud.uid AND ds.session_date < ud.obs_date
    ORDER BY ud.uid, ud.obs_date, ds.session_date DESC
  ),
  streak_calc AS (
    -- Compute streak: consecutive days with sessions before obs_date
    SELECT
      lsb.uid,
      lsb.obs_date,
      CASE
        WHEN lsb.gap_days > 1 THEN 0
        ELSE (
          SELECT COUNT(*)::INTEGER
          FROM daily_sessions ds2
          WHERE ds2.uid = lsb.uid
            AND ds2.session_date <= lsb.last_date
            AND ds2.session_date > lsb.last_date - 30
            AND NOT EXISTS (
              SELECT 1
              FROM generate_series(
                ds2.session_date,
                lsb.last_date - 1,
                '1 day'::INTERVAL
              ) AS d(day)
              WHERE NOT EXISTS (
                SELECT 1 FROM daily_sessions ds3
                WHERE ds3.uid = lsb.uid
                  AND ds3.session_date = d.day::DATE
              )
            )
        )
      END AS streak
    FROM last_session_before lsb
  ),
  weekly_avg AS (
    -- Sessions per week (rolling 4 weeks before obs_date)
    SELECT
      ud.uid,
      ud.obs_date,
      COUNT(ds.session_date)::DOUBLE PRECISION / 4.0 AS avg_per_week
    FROM user_dates ud
    LEFT JOIN daily_sessions ds
      ON ds.uid = ud.uid
      AND ds.session_date BETWEEN (ud.obs_date - 28) AND (ud.obs_date - 1)
    GROUP BY ud.uid, ud.obs_date
  ),
  preferred_time AS (
    -- Most common session time for the user
    SELECT DISTINCT ON (ie.user_id)
      ie.user_id AS uid,
      ie.time_of_day AS pref_time
    FROM interaction_events ie
    INNER JOIN active_users au ON au.uid = ie.user_id
    GROUP BY ie.user_id, ie.time_of_day
    ORDER BY ie.user_id, COUNT(*) DESC
  )
  SELECT
    ud.uid AS user_id,
    ud.obs_date AS observation_date,
    COALESCE(lsb.gap_days::DOUBLE PRECISION, 999.0) AS days_since_last_session,
    COALESCE(sc.streak, 0) AS current_streak_days,
    COALESCE(lsb.last_cog_load, 0.5) AS last_session_cognitive_load,
    COALESCE(lsb.last_completed, FALSE) AS last_session_completion,
    COALESCE(wa.avg_per_week, 0.0) AS average_sessions_per_week,
    EXTRACT(DOW FROM ud.obs_date)::INTEGER AS day_of_week,
    COALESCE(pt.pref_time, 'morning')::TEXT AS time_of_day,
    -- Label: TRUE if user did NOT have a session on obs_date
    NOT EXISTS (
      SELECT 1 FROM daily_sessions ds
      WHERE ds.uid = ud.uid AND ds.session_date = ud.obs_date
    ) AS did_not_session_today
  FROM user_dates ud
  LEFT JOIN last_session_before lsb ON lsb.uid = ud.uid AND lsb.obs_date = ud.obs_date
  LEFT JOIN streak_calc sc ON sc.uid = ud.uid AND sc.obs_date = ud.obs_date
  LEFT JOIN weekly_avg wa ON wa.uid = ud.uid AND wa.obs_date = ud.obs_date
  LEFT JOIN preferred_time pt ON pt.uid = ud.uid
  -- Only include rows where we have at least one prior session
  WHERE lsb.last_date IS NOT NULL
  ORDER BY ud.uid, ud.obs_date;
END;
$$;

GRANT EXECUTE ON FUNCTION get_pre_session_training_data(INTEGER) TO service_role;


-- ---------------------------------------------------------------------------
-- 5. get_mid_session_training_data — features for mid-session model
-- ---------------------------------------------------------------------------
-- Extracts snapshot features at every 5th word within completed/abandoned
-- sessions, with label abandoned = NOT completed_session.

CREATE OR REPLACE FUNCTION get_mid_session_training_data(
  p_min_session_words INTEGER DEFAULT 5
)
RETURNS TABLE (
  user_id UUID,
  session_id UUID,
  snapshot_word_index INTEGER,
  consecutive_errors INTEGER,
  response_time_trend DOUBLE PRECISION,
  session_duration_so_far_ms DOUBLE PRECISION,
  cognitive_load DOUBLE PRECISION,
  words_remaining_in_session INTEGER,
  abandoned_session BOOLEAN
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH labeled_sessions AS (
    -- Sessions with enough words and a clear outcome
    SELECT
      ss.session_id,
      ss.user_id,
      ss.total_words,
      ss.completed_session,
      ss.estimated_cognitive_load,
      ss.started_at
    FROM session_summaries ss
    WHERE ss.total_words >= p_min_session_words
      AND ss.started_at IS NOT NULL
  ),
  ordered_events AS (
    -- Events within those sessions, ordered by sequence
    SELECT
      ie.session_id,
      ie.user_id,
      ie.session_sequence_number AS seq,
      ie.correct,
      ie.response_time_ms,
      ie.created_at,
      ls.total_words,
      ls.completed_session,
      ls.estimated_cognitive_load,
      ls.started_at AS session_started_at
    FROM interaction_events ie
    INNER JOIN labeled_sessions ls
      ON ls.session_id = ie.session_id
    WHERE ie.session_sequence_number IS NOT NULL
  ),
  snapshots AS (
    -- Take a snapshot every 5 words
    SELECT
      oe.user_id,
      oe.session_id,
      oe.seq AS snapshot_at,
      -- Consecutive errors: count unbroken streak of incorrect up to this point
      (
        SELECT COUNT(*)::INTEGER
        FROM ordered_events oe2
        WHERE oe2.session_id = oe.session_id
          AND oe2.seq <= oe.seq
          AND oe2.seq > COALESCE(
            (SELECT MAX(oe3.seq)
             FROM ordered_events oe3
             WHERE oe3.session_id = oe.session_id
               AND oe3.seq < oe.seq
               AND oe3.correct = TRUE),
            0
          )
          AND oe2.correct = FALSE
      ) AS consec_errors,
      -- Response time trend: difference between avg RT of last 3 vs first 3
      COALESCE(
        (SELECT AVG(oe_late.response_time_ms)
         FROM ordered_events oe_late
         WHERE oe_late.session_id = oe.session_id
           AND oe_late.seq BETWEEN GREATEST(oe.seq - 2, 1) AND oe.seq
        ) -
        (SELECT AVG(oe_early.response_time_ms)
         FROM ordered_events oe_early
         WHERE oe_early.session_id = oe.session_id
           AND oe_early.seq BETWEEN 1 AND LEAST(3, oe.seq)
        ),
        0
      ) AS rt_trend,
      -- Session duration so far (ms from session start to this event)
      EXTRACT(EPOCH FROM (oe.created_at - oe.session_started_at)) * 1000
        AS duration_so_far_ms,
      oe.estimated_cognitive_load AS cog_load,
      (oe.total_words - oe.seq) AS words_remaining,
      NOT oe.completed_session AS abandoned
    FROM ordered_events oe
    WHERE oe.seq % 5 = 0  -- snapshot every 5 words
      AND oe.seq > 0
  )
  SELECT
    s.user_id,
    s.session_id,
    s.snapshot_at AS snapshot_word_index,
    s.consec_errors AS consecutive_errors,
    s.rt_trend AS response_time_trend,
    COALESCE(s.duration_so_far_ms, 0) AS session_duration_so_far_ms,
    COALESCE(s.cog_load, 0.5) AS cognitive_load,
    GREATEST(s.words_remaining, 0) AS words_remaining_in_session,
    s.abandoned AS abandoned_session
  FROM snapshots s
  ORDER BY s.user_id, s.session_id, s.snapshot_at;
END;
$$;

GRANT EXECUTE ON FUNCTION get_mid_session_training_data(INTEGER) TO service_role;
