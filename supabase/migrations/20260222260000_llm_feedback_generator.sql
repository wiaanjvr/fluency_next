-- ============================================================================
-- LLM Feedback Generator — Database Support (ML System 7)
--
-- Cache tables for LLM-generated feedback to avoid redundant API calls
-- and provide auditability.
--
-- New tables:
--   1. llm_feedback_cache          — cached word-error explanations
--   2. llm_grammar_examples_cache  — cached grammar example sentences
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. llm_feedback_cache — stores generated word explanations
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS llm_feedback_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word_id UUID NOT NULL REFERENCES user_words(id) ON DELETE CASCADE,
  session_id UUID,

  -- Detected error pattern
  pattern_detected TEXT NOT NULL CHECK (pattern_detected IN (
    'production_gap',
    'contextualization',
    'slow_recognition',
    'general_difficulty',
    'early_learning'
  )),

  -- Generated content
  explanation TEXT NOT NULL,
  example_sentence TEXT NOT NULL DEFAULT '',

  -- Audit fields
  prompt_used TEXT NOT NULL,
  llm_provider TEXT NOT NULL,
  llm_model TEXT NOT NULL,
  latency_ms INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for cache lookups
CREATE INDEX IF NOT EXISTS idx_llm_feedback_cache_lookup
  ON llm_feedback_cache (user_id, word_id, pattern_detected, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_llm_feedback_cache_session
  ON llm_feedback_cache (session_id)
  WHERE session_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. llm_grammar_examples_cache — stores generated grammar examples
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS llm_grammar_examples_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  grammar_concept_tag TEXT NOT NULL,

  -- Generated content (array of sentence strings)
  sentences TEXT[] NOT NULL DEFAULT '{}',

  -- Audit fields
  prompt_used TEXT NOT NULL,
  llm_provider TEXT NOT NULL,
  llm_model TEXT NOT NULL,
  latency_ms INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for cache lookups
CREATE INDEX IF NOT EXISTS idx_llm_grammar_examples_lookup
  ON llm_grammar_examples_cache (user_id, grammar_concept_tag, created_at DESC);

-- ---------------------------------------------------------------------------
-- 3. RLS policies — service-role key bypasses RLS, but add policies
--    for completeness if frontend ever reads directly.
-- ---------------------------------------------------------------------------

ALTER TABLE llm_feedback_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_grammar_examples_cache ENABLE ROW LEVEL SECURITY;

-- Users can read their own feedback
CREATE POLICY "Users can read own feedback"
  ON llm_feedback_cache FOR SELECT
  USING (auth.uid() = user_id);

-- Users can read their own grammar examples
CREATE POLICY "Users can read own grammar examples"
  ON llm_grammar_examples_cache FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can do everything (implicit via service_role key)
-- No INSERT/UPDATE/DELETE policies for regular users — only ML service writes.

-- ---------------------------------------------------------------------------
-- 4. Cleanup function — purge stale cache entries older than 7 days
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION cleanup_llm_feedback_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM llm_feedback_cache
  WHERE created_at < now() - interval '7 days';

  DELETE FROM llm_grammar_examples_cache
  WHERE created_at < now() - interval '7 days';
END;
$$;

-- Schedule via pg_cron if available:
-- SELECT cron.schedule('cleanup-llm-cache', '0 3 * * *', 'SELECT cleanup_llm_feedback_cache()');
