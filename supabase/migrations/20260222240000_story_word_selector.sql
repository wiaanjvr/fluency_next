-- ============================================================================
-- Story Word Selector — Thematic Preferences & Engagement Tables
--
-- New tables for the Adaptive Story Word Selector (ML System 4):
--   1. user_topic_preferences  — 16-dim topic preference embedding per user
--   2. story_segment_engagement — per-story engagement data for preference updates
--   3. topic_tags on user_words — index for topic-based word filtering
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. user_topic_preferences — stores the user's 16-dim topic embedding
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS user_topic_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- The 16-dimensional topic preference vector (JSON array of floats)
  preference_vector REAL[] NOT NULL DEFAULT '{}',

  -- Topics selected at signup (3 from the canonical taxonomy)
  selected_topics TEXT[] NOT NULL DEFAULT '{}',

  -- Cumulative engagement time (ms) per topic tag
  -- Stored as JSONB: {"travel": 45000, "food_cooking": 32000, ...}
  topic_engagement JSONB NOT NULL DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 2. story_segment_engagement — time-on-segment per story for preference updates
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS story_segment_engagement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  story_id UUID REFERENCES generated_stories(id) ON DELETE SET NULL,

  -- Topic tags associated with this story/segment
  topic_tags TEXT[] NOT NULL DEFAULT '{}',

  -- Time spent on this story segment (proxy for engagement)
  time_on_segment_ms INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 3. Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_story_segment_engagement_user
  ON story_segment_engagement (user_id);

CREATE INDEX IF NOT EXISTS idx_story_segment_engagement_user_created
  ON story_segment_engagement (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_story_segment_engagement_story
  ON story_segment_engagement (story_id);

-- Index on user_words.tags for topic-based filtering (GIN for array containment)
CREATE INDEX IF NOT EXISTS idx_user_words_tags
  ON user_words USING GIN (tags);

-- ---------------------------------------------------------------------------
-- 4. RLS Policies
-- ---------------------------------------------------------------------------

ALTER TABLE user_topic_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own topic preferences"
  ON user_topic_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own topic preferences"
  ON user_topic_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own topic preferences"
  ON user_topic_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role bypass (for the ML service using service_role_key)
CREATE POLICY "Service role full access to topic preferences"
  ON user_topic_preferences FOR ALL
  USING (auth.role() = 'service_role');


ALTER TABLE story_segment_engagement ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own segment engagement"
  ON story_segment_engagement FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own segment engagement"
  ON story_segment_engagement FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access to segment engagement"
  ON story_segment_engagement FOR ALL
  USING (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- 5. RPC: record_story_engagement (called by the Next.js backend after stories)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION record_story_engagement(
  p_user_id UUID,
  p_story_id UUID,
  p_topic_tags TEXT[],
  p_time_on_segment_ms INTEGER
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO story_segment_engagement (user_id, story_id, topic_tags, time_on_segment_ms)
  VALUES (p_user_id, p_story_id, p_topic_tags, p_time_on_segment_ms)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;
