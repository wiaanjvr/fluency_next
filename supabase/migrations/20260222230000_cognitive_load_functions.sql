-- ============================================================================
-- Cognitive Load Estimator — Database Support
--
-- Adds Postgres functions for efficient per-module and per-difficulty-bucket
-- baseline computation, consumed by the Python Cognitive Load micro-service.
--
-- Also adds a composite index for the baseline aggregation queries.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Function: get_user_module_baselines
--
--    Returns the rolling average response time per module for a given user.
--    Uses a windowed EMA (last 200 events per module) to keep it responsive.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_user_module_baselines(p_user_id UUID)
RETURNS TABLE (
  module_source TEXT,
  avg_response_time_ms REAL,
  event_count BIGINT
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    ie.module_source,
    AVG(ie.response_time_ms)::REAL AS avg_response_time_ms,
    COUNT(*)                        AS event_count
  FROM (
    SELECT module_source, response_time_ms,
           ROW_NUMBER() OVER (
             PARTITION BY module_source
             ORDER BY created_at DESC
           ) AS rn
    FROM interaction_events
    WHERE user_id = p_user_id
      AND response_time_ms IS NOT NULL
      AND response_time_ms > 0
  ) ie
  WHERE ie.rn <= 200  -- last 200 events per module
  GROUP BY ie.module_source;
$$;


-- ---------------------------------------------------------------------------
-- 2. Function: get_user_difficulty_baselines
--
--    Returns the rolling average response time per module per word-status
--    bucket (new / learning / known / mastered).
--
--    Joins interaction_events → user_words to get the word status at
--    review time. Uses the word's *current* status (a reasonable proxy
--    since status changes are monotonic).
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_user_difficulty_baselines(p_user_id UUID)
RETURNS TABLE (
  module_source TEXT,
  word_status   TEXT,
  avg_response_time_ms REAL,
  event_count   BIGINT
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    sub.module_source,
    sub.status AS word_status,
    AVG(sub.response_time_ms)::REAL AS avg_response_time_ms,
    COUNT(*)                         AS event_count
  FROM (
    SELECT ie.module_source,
           COALESCE(uw.status, 'new') AS status,
           ie.response_time_ms,
           ROW_NUMBER() OVER (
             PARTITION BY ie.module_source, COALESCE(uw.status, 'new')
             ORDER BY ie.created_at DESC
           ) AS rn
    FROM interaction_events ie
    LEFT JOIN user_words uw
      ON uw.id = ie.word_id AND uw.user_id = ie.user_id
    WHERE ie.user_id = p_user_id
      AND ie.response_time_ms IS NOT NULL
      AND ie.response_time_ms > 0
      AND ie.word_id IS NOT NULL
  ) sub
  WHERE sub.rn <= 100  -- last 100 events per module+bucket
  GROUP BY sub.module_source, sub.status;
$$;


-- ---------------------------------------------------------------------------
-- 3. Function: get_session_cognitive_load_summary
--
--    Computes a quick cognitive load summary for a session directly in SQL.
--    Useful when the Python service is unavailable (graceful degradation).
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_session_cognitive_load_summary(p_session_id UUID)
RETURNS TABLE (
  session_id       UUID,
  event_count      BIGINT,
  avg_fatigue      REAL,
  max_fatigue      REAL,
  latest_fatigue   REAL,
  high_load_count  BIGINT
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    ie.session_id,
    COUNT(*)                                         AS event_count,
    AVG(ie.session_fatigue_proxy)::REAL              AS avg_fatigue,
    MAX(ie.session_fatigue_proxy)::REAL              AS max_fatigue,
    (
      SELECT ie2.session_fatigue_proxy
      FROM interaction_events ie2
      WHERE ie2.session_id = p_session_id
      ORDER BY ie2.session_sequence_number DESC
      LIMIT 1
    )::REAL                                          AS latest_fatigue,
    COUNT(*) FILTER (
      WHERE ie.session_fatigue_proxy > 1.6           -- maps to ~0.6 cognitive load
    )                                                AS high_load_count
  FROM interaction_events ie
  WHERE ie.session_id = p_session_id
    AND ie.session_fatigue_proxy IS NOT NULL
  GROUP BY ie.session_id;
$$;


-- ---------------------------------------------------------------------------
-- 4. Additional indexes for baseline computation performance
-- ---------------------------------------------------------------------------

-- Module + response time (for get_user_module_baselines)
CREATE INDEX IF NOT EXISTS idx_interaction_events_user_module_rt
  ON interaction_events (user_id, module_source, created_at DESC)
  WHERE response_time_ms IS NOT NULL AND response_time_ms > 0;

-- Word + status join support (for get_user_difficulty_baselines)
CREATE INDEX IF NOT EXISTS idx_interaction_events_user_word_rt
  ON interaction_events (user_id, word_id, created_at DESC)
  WHERE word_id IS NOT NULL
    AND response_time_ms IS NOT NULL
    AND response_time_ms > 0;
