-- ============================================================================
-- Complexity Level Predictor — Database Support (ML System 5)
--
-- Tables and functions for predicting optimal story complexity level and
-- recommended session length before a session starts.
--
-- New tables:
--   1. session_plans       — predicted plans stored for audit & training labels
--   2. session_outcomes    — materialised view of labelled sessions for training
--
-- New functions:
--   1. get_user_session_features  — extract features for the ML model
--   2. label_session_outcome      — label a session with its complexity outcome
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. session_plans — stores ML predictions for each planned session
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS session_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES session_summaries(id) ON DELETE SET NULL,

  -- Predictions
  predicted_complexity_level INTEGER NOT NULL CHECK (
    predicted_complexity_level BETWEEN 1 AND 5
  ),
  recommended_word_count INTEGER NOT NULL,
  recommended_duration_minutes REAL NOT NULL,
  confidence REAL NOT NULL CHECK (confidence BETWEEN 0 AND 1),

  -- Input features snapshot (for debugging / audit)
  input_features JSONB NOT NULL DEFAULT '{}',

  -- Model version used
  model_version TEXT NOT NULL DEFAULT 'v0.1.0',

  -- Whether the user accepted or overrode the plan
  accepted BOOLEAN DEFAULT TRUE,
  override_complexity_level INTEGER,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 2. Indexes on session_plans
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_session_plans_user
  ON session_plans (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_session_plans_session
  ON session_plans (session_id)
  WHERE session_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. RLS Policies for session_plans
-- ---------------------------------------------------------------------------

ALTER TABLE session_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own session plans"
  ON session_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own session plans"
  ON session_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own session plans"
  ON session_plans FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to session plans"
  ON session_plans FOR ALL
  USING (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- 4. Function: get_user_session_features
--
--    Extracts all features needed by the Complexity Level Predictor for a
--    given user. Returns a single row with all feature columns.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_user_session_features(p_user_id UUID)
RETURNS TABLE (
  days_since_last_session REAL,
  last_session_cognitive_load REAL,
  last_session_completion_rate REAL,
  current_streak_days INTEGER,
  avg_performance_last_7_days REAL,
  total_sessions INTEGER,
  avg_session_duration_ms REAL,
  avg_session_word_count REAL
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_last_session RECORD;
  v_streak INTEGER := 0;
  v_check_date DATE;
BEGIN
  -- Get last session info
  SELECT
    ss.estimated_cognitive_load,
    CASE WHEN ss.total_words > 0
      THEN ss.correct_count::REAL / ss.total_words
      ELSE 0.0
    END AS completion_rate,
    ss.ended_at,
    ss.started_at
  INTO v_last_session
  FROM session_summaries ss
  WHERE ss.user_id = p_user_id
    AND ss.ended_at IS NOT NULL
  ORDER BY ss.ended_at DESC
  LIMIT 1;

  -- Calculate days since last session
  IF v_last_session.ended_at IS NOT NULL THEN
    days_since_last_session := EXTRACT(EPOCH FROM (now() - v_last_session.ended_at)) / 86400.0;
  ELSE
    days_since_last_session := NULL;
  END IF;

  last_session_cognitive_load := COALESCE(v_last_session.estimated_cognitive_load, 0.3);
  last_session_completion_rate := COALESCE(v_last_session.completion_rate, 0.0);

  -- Calculate streak (consecutive days with at least one session)
  v_check_date := CURRENT_DATE;
  LOOP
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM session_summaries ss
      WHERE ss.user_id = p_user_id
        AND ss.started_at::DATE = v_check_date
        AND ss.ended_at IS NOT NULL
    );
    v_streak := v_streak + 1;
    v_check_date := v_check_date - INTERVAL '1 day';
  END LOOP;
  current_streak_days := v_streak;

  -- Average performance over last 7 days
  SELECT
    COALESCE(AVG(
      CASE WHEN ss.total_words > 0
        THEN ss.correct_count::REAL / ss.total_words
        ELSE NULL
      END
    ), 0.5)
  INTO avg_performance_last_7_days
  FROM session_summaries ss
  WHERE ss.user_id = p_user_id
    AND ss.ended_at IS NOT NULL
    AND ss.started_at >= now() - INTERVAL '7 days';

  -- Aggregate session stats
  SELECT
    COUNT(*)::INTEGER,
    COALESCE(AVG(ss.session_duration_ms), 0)::REAL,
    COALESCE(AVG(ss.total_words), 0)::REAL
  INTO total_sessions, avg_session_duration_ms, avg_session_word_count
  FROM session_summaries ss
  WHERE ss.user_id = p_user_id
    AND ss.ended_at IS NOT NULL;

  RETURN NEXT;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. Function: get_labelled_sessions
--
--    Returns historical sessions labelled for training the complexity predictor.
--    The "optimal" complexity is derived from sessions where cognitive load
--    was moderate (0.3-0.5) AND completion rate was high (>= 0.8).
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_labelled_sessions(
  p_min_sessions INTEGER DEFAULT 0,
  p_limit INTEGER DEFAULT 50000
)
RETURNS TABLE (
  user_id UUID,
  session_id UUID,
  -- Temporal features
  time_of_day TEXT,
  day_of_week INTEGER,
  days_since_last_session REAL,
  -- Last session features
  last_session_cognitive_load REAL,
  last_session_completion_rate REAL,
  -- Streak
  current_streak_days INTEGER,
  -- Performance
  avg_performance_last_7_days REAL,
  -- Target labels
  story_complexity_level INTEGER,
  actual_cognitive_load REAL,
  actual_completion_rate REAL,
  session_word_count INTEGER,
  session_duration_ms INTEGER
)
LANGUAGE sql
STABLE
AS $$
  WITH session_data AS (
    SELECT
      ss.user_id,
      ss.session_id,
      ss.started_at,
      ss.ended_at,
      ss.estimated_cognitive_load,
      ss.total_words,
      ss.correct_count,
      ss.session_duration_ms,
      ss.completed_session,
      -- Get time of day from the start time
      CASE
        WHEN EXTRACT(HOUR FROM ss.started_at) BETWEEN 6 AND 11 THEN 'morning'
        WHEN EXTRACT(HOUR FROM ss.started_at) BETWEEN 12 AND 16 THEN 'afternoon'
        WHEN EXTRACT(HOUR FROM ss.started_at) BETWEEN 17 AND 20 THEN 'evening'
        ELSE 'night'
      END AS time_of_day,
      EXTRACT(DOW FROM ss.started_at)::INTEGER AS day_of_week,
      -- Lag: previous session's end time
      LAG(ss.ended_at) OVER (PARTITION BY ss.user_id ORDER BY ss.started_at) AS prev_ended_at,
      -- Lag: previous session's cognitive load
      LAG(ss.estimated_cognitive_load) OVER (PARTITION BY ss.user_id ORDER BY ss.started_at) AS prev_cognitive_load,
      -- Lag: previous session's completion rate
      LAG(CASE WHEN ss.total_words > 0 THEN ss.correct_count::REAL / ss.total_words ELSE 0 END)
        OVER (PARTITION BY ss.user_id ORDER BY ss.started_at) AS prev_completion_rate,
      -- Complexity level from the interaction events in this session
      (
        SELECT MAX(ie.story_complexity_level)
        FROM interaction_events ie
        WHERE ie.session_id = ss.session_id
          AND ie.story_complexity_level IS NOT NULL
      ) AS story_complexity_level
    FROM session_summaries ss
    WHERE ss.ended_at IS NOT NULL
      AND ss.module_source = 'story_engine'
      AND ss.total_words >= 5
  )
  SELECT
    sd.user_id,
    sd.session_id,
    sd.time_of_day,
    sd.day_of_week,
    CASE WHEN sd.prev_ended_at IS NOT NULL
      THEN EXTRACT(EPOCH FROM (sd.started_at - sd.prev_ended_at)) / 86400.0
      ELSE NULL
    END::REAL AS days_since_last_session,
    COALESCE(sd.prev_cognitive_load, 0.3)::REAL AS last_session_cognitive_load,
    COALESCE(sd.prev_completion_rate, 0.5)::REAL AS last_session_completion_rate,
    0::INTEGER AS current_streak_days,  -- simplified; computed in Python
    COALESCE(sd.estimated_cognitive_load, 0.3)::REAL AS avg_performance_last_7_days,
    COALESCE(sd.story_complexity_level, 1)::INTEGER AS story_complexity_level,
    COALESCE(sd.estimated_cognitive_load, 0.3)::REAL AS actual_cognitive_load,
    CASE WHEN sd.total_words > 0
      THEN (sd.correct_count::REAL / sd.total_words)
      ELSE 0.0
    END::REAL AS actual_completion_rate,
    sd.total_words::INTEGER AS session_word_count,
    sd.session_duration_ms::INTEGER AS session_duration_ms
  FROM session_data sd
  WHERE sd.story_complexity_level IS NOT NULL
  ORDER BY sd.started_at
  LIMIT p_limit;
$$;
