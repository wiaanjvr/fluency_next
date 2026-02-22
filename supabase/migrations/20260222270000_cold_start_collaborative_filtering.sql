-- ============================================================================
-- Cold Start Collaborative Filtering — Database Support (ML System 8)
--
-- Tables for learner cluster assignments and profiles, plus the SQL function
-- that aggregates mature user features for K-Means training.
--
-- New tables:
--   1. user_learning_goals          — multi-valued learning goals per user
--   2. learner_cluster_profiles     — per-cluster recommendations
--   3. cold_start_assignments       — per-user cluster assignments
--
-- New functions:
--   1. get_cold_start_training_data — aggregated features for mature users
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. user_learning_goals — stores one row per user×goal
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS user_learning_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal TEXT NOT NULL CHECK (goal IN (
    'conversational', 'formal', 'travel', 'business'
  )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(user_id, goal)
);

CREATE INDEX IF NOT EXISTS idx_user_learning_goals_user
  ON user_learning_goals (user_id);

-- Enable RLS
ALTER TABLE user_learning_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own goals"
  ON user_learning_goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goals"
  ON user_learning_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals"
  ON user_learning_goals FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to user_learning_goals"
  ON user_learning_goals FOR ALL
  USING (auth.role() = 'service_role');


-- ---------------------------------------------------------------------------
-- 2. learner_cluster_profiles — one row per cluster (upserted on retrain)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS learner_cluster_profiles (
  cluster_id INTEGER PRIMARY KEY,
  size INTEGER NOT NULL DEFAULT 0,
  recommended_module_weights JSONB NOT NULL DEFAULT '{}',
  default_complexity_level INTEGER NOT NULL DEFAULT 1 CHECK (
    default_complexity_level BETWEEN 1 AND 5
  ),
  recommended_path TEXT[] NOT NULL DEFAULT '{}',
  estimated_vocab_start TEXT NOT NULL DEFAULT 'top_1000',
  avg_forgetting_steepness DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  avg_session_length_min DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  dominant_goals TEXT[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- No RLS needed — read by ML service only (service_role key)


-- ---------------------------------------------------------------------------
-- 3. cold_start_assignments — per-user cluster assignments
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS cold_start_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cluster_id INTEGER NOT NULL,
  recommended_path TEXT[] NOT NULL DEFAULT '{}',
  default_complexity_level INTEGER NOT NULL DEFAULT 1,
  estimated_vocab_start TEXT NOT NULL DEFAULT 'top_1000',
  confidence DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  assignment_features JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cold_start_assignments_user_active
  ON cold_start_assignments (user_id, is_active)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_cold_start_assignments_cluster
  ON cold_start_assignments (cluster_id);

-- RLS: users can read their own assignments
ALTER TABLE cold_start_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own cold start assignments"
  ON cold_start_assignments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to cold_start_assignments"
  ON cold_start_assignments FOR ALL
  USING (auth.role() = 'service_role');


-- ---------------------------------------------------------------------------
-- 4. get_cold_start_training_data — aggregated features for mature users
-- ---------------------------------------------------------------------------
-- Returns one row per user with 500+ interaction events, containing all
-- features needed for K-Means clustering.

CREATE OR REPLACE FUNCTION get_cold_start_training_data(
  p_min_events INTEGER DEFAULT 500
)
RETURNS TABLE (
  user_id UUID,
  native_language TEXT,
  target_language TEXT,
  proficiency_level TEXT,
  goals TEXT[],
  avg_session_length_ms DOUBLE PRECISION,
  preferred_time_of_day TEXT,
  module_distribution JSONB,
  forgetting_steepness DOUBLE PRECISION,
  event_count BIGINT
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH user_events AS (
    -- Count events per user and filter to mature users
    SELECT
      ie.user_id AS uid,
      COUNT(*) AS evt_count
    FROM interaction_events ie
    GROUP BY ie.user_id
    HAVING COUNT(*) >= p_min_events
  ),
  user_goals_agg AS (
    -- Aggregate goals into array
    SELECT
      ulg.user_id AS uid,
      ARRAY_AGG(DISTINCT ulg.goal) AS goals_arr
    FROM user_learning_goals ulg
    INNER JOIN user_events ue ON ue.uid = ulg.user_id
    GROUP BY ulg.user_id
  ),
  session_stats AS (
    -- Avg session length from session_summaries
    SELECT
      ss.user_id AS uid,
      AVG(
        EXTRACT(EPOCH FROM (ss.ended_at - ss.started_at)) * 1000
      ) AS avg_session_ms
    FROM session_summaries ss
    INNER JOIN user_events ue ON ue.uid = ss.user_id
    WHERE ss.ended_at IS NOT NULL
      AND ss.started_at IS NOT NULL
    GROUP BY ss.user_id
  ),
  time_pref AS (
    -- Most common time_of_day bucket
    SELECT DISTINCT ON (ie.user_id)
      ie.user_id AS uid,
      ie.time_of_day AS pref_time
    FROM interaction_events ie
    INNER JOIN user_events ue ON ue.uid = ie.user_id
    GROUP BY ie.user_id, ie.time_of_day
    ORDER BY ie.user_id, COUNT(*) DESC
  ),
  module_dist AS (
    -- Module usage distribution (fraction per module)
    SELECT
      ie.user_id AS uid,
      JSONB_OBJECT_AGG(
        ie.module_source,
        ROUND((cnt::NUMERIC / total::NUMERIC), 4)
      ) AS dist
    FROM (
      SELECT
        ie2.user_id,
        ie2.module_source,
        COUNT(*) AS cnt,
        SUM(COUNT(*)) OVER (PARTITION BY ie2.user_id) AS total
      FROM interaction_events ie2
      INNER JOIN user_events ue ON ue.uid = ie2.user_id
      WHERE ie2.module_source IS NOT NULL
      GROUP BY ie2.user_id, ie2.module_source
    ) ie
    GROUP BY ie.user_id
  ),
  forget_steepness AS (
    -- Derive forgetting curve steepness from DKT-like heuristic:
    -- Use the rate of decay in recall across review intervals
    -- Approximation: ln(avg_incorrect_rate) / ln(avg_interval_hours)
    SELECT
      ie.user_id AS uid,
      CASE
        WHEN AVG(ie.days_since_last_review) > 0 AND AVG(1 - ie.correct::INTEGER) > 0
        THEN LN(GREATEST(AVG(1 - ie.correct::INTEGER), 0.01))
             / LN(GREATEST(AVG(ie.days_since_last_review) * 24, 1))
        ELSE NULL
      END AS steepness
    FROM interaction_events ie
    INNER JOIN user_events ue ON ue.uid = ie.user_id
    WHERE ie.days_since_last_review IS NOT NULL
      AND ie.days_since_last_review > 0
    GROUP BY ie.user_id
  )
  SELECT
    p.id AS user_id,
    COALESCE(p.native_language, 'unknown')::TEXT AS native_language,
    COALESCE(p.target_language, 'unknown')::TEXT AS target_language,
    COALESCE(p.proficiency_level, 'A1')::TEXT AS proficiency_level,
    COALESCE(ug.goals_arr, ARRAY[]::TEXT[]) AS goals,
    COALESCE(ss.avg_session_ms, 0) AS avg_session_length_ms,
    COALESCE(tp.pref_time, 'morning')::TEXT AS preferred_time_of_day,
    COALESCE(md.dist, '{}'::JSONB) AS module_distribution,
    fs.steepness AS forgetting_steepness,
    ue.evt_count AS event_count
  FROM user_events ue
  INNER JOIN profiles p ON p.id = ue.uid
  LEFT JOIN user_goals_agg ug ON ug.uid = ue.uid
  LEFT JOIN session_stats ss ON ss.uid = ue.uid
  LEFT JOIN time_pref tp ON tp.uid = ue.uid
  LEFT JOIN module_dist md ON md.uid = ue.uid
  LEFT JOIN forget_steepness fs ON fs.uid = ue.uid
  ORDER BY ue.evt_count DESC;
END;
$$;

-- Grant execute to the service role
GRANT EXECUTE ON FUNCTION get_cold_start_training_data(INTEGER) TO service_role;
