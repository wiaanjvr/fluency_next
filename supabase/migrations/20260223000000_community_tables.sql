-- ==========================================================================
-- Community Peer Review Feature
-- Tables: community_submissions, community_reviews, community_review_votes
-- ==========================================================================

-- 1. Add xp_points to profiles if not present
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS xp_points INTEGER DEFAULT 0;

-- 2. Community Submissions
CREATE TABLE IF NOT EXISTS community_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  language VARCHAR(10) NOT NULL,           -- e.g. 'de', 'fr', 'es'
  exercise_type VARCHAR(20) NOT NULL       -- 'writing' | 'speaking' | 'translation'
    CHECK (exercise_type IN ('writing', 'speaking', 'translation')),
  prompt TEXT,                             -- the original exercise prompt
  content TEXT,                            -- user's written response (nullable for speaking)
  audio_url TEXT,                          -- Supabase Storage URL (nullable for writing)
  status VARCHAR(20) DEFAULT 'open'        -- 'open' | 'reviewed' | 'closed'
    CHECK (status IN ('open', 'reviewed', 'closed')),
  review_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for feed queries
CREATE INDEX IF NOT EXISTS idx_community_submissions_language_status
  ON community_submissions (language, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_submissions_user_id
  ON community_submissions (user_id, created_at DESC);

-- 3. Community Reviews
CREATE TABLE IF NOT EXISTS community_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES community_submissions(id) ON DELETE CASCADE NOT NULL,
  reviewer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  corrected_text TEXT,                     -- full corrected version
  inline_corrections JSONB,               -- array of {original, correction, explanation}
  overall_feedback TEXT,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  helpful_votes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  -- Each user can only review a submission once
  UNIQUE (submission_id, reviewer_id)
);

CREATE INDEX IF NOT EXISTS idx_community_reviews_submission
  ON community_reviews (submission_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_community_reviews_reviewer
  ON community_reviews (reviewer_id, created_at DESC);

-- 4. Community Review Votes (helpful votes)
CREATE TABLE IF NOT EXISTS community_review_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID REFERENCES community_reviews(id) ON DELETE CASCADE NOT NULL,
  voter_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (review_id, voter_id)
);

CREATE INDEX IF NOT EXISTS idx_community_review_votes_review
  ON community_review_votes (review_id);

-- ==========================================================================
-- Row Level Security
-- ==========================================================================

ALTER TABLE community_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_review_votes ENABLE ROW LEVEL SECURITY;

-- ---- community_submissions RLS ----

DROP POLICY IF EXISTS "Anyone can view open submissions" ON community_submissions;
CREATE POLICY "Anyone can view open submissions"
  ON community_submissions
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert own submissions" ON community_submissions;
CREATE POLICY "Users can insert own submissions"
  ON community_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own submissions" ON community_submissions;
CREATE POLICY "Users can update own submissions"
  ON community_submissions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own submissions" ON community_submissions;
CREATE POLICY "Users can delete own submissions"
  ON community_submissions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ---- community_reviews RLS ----

DROP POLICY IF EXISTS "Anyone can view reviews" ON community_reviews;
CREATE POLICY "Anyone can view reviews"
  ON community_reviews
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert reviews for others submissions" ON community_reviews;
CREATE POLICY "Users can insert reviews for others submissions"
  ON community_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = reviewer_id
    AND NOT EXISTS (
      SELECT 1 FROM community_submissions
      WHERE id = submission_id AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own reviews" ON community_reviews;
CREATE POLICY "Users can update own reviews"
  ON community_reviews
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = reviewer_id)
  WITH CHECK (auth.uid() = reviewer_id);

-- ---- community_review_votes RLS ----

DROP POLICY IF EXISTS "Anyone can view review votes" ON community_review_votes;
CREATE POLICY "Anyone can view review votes"
  ON community_review_votes
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert own votes" ON community_review_votes;
CREATE POLICY "Users can insert own votes"
  ON community_review_votes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = voter_id);

DROP POLICY IF EXISTS "Users can delete own votes" ON community_review_votes;
CREATE POLICY "Users can delete own votes"
  ON community_review_votes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = voter_id);

-- ==========================================================================
-- Trigger: auto-update updated_at on community_submissions
-- ==========================================================================

CREATE OR REPLACE FUNCTION update_community_submissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_community_submissions_updated_at ON community_submissions;
CREATE TRIGGER trg_community_submissions_updated_at
  BEFORE UPDATE ON community_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_community_submissions_updated_at();

-- ==========================================================================
-- RPC functions for atomic operations
-- ==========================================================================

-- Increment review_count and set status to 'reviewed' when first review arrives
CREATE OR REPLACE FUNCTION increment_review_count(p_submission_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE community_submissions
  SET review_count = review_count + 1,
      status = CASE
        WHEN review_count = 0 THEN 'reviewed'
        ELSE status
      END
  WHERE id = p_submission_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Award XP to a user
CREATE OR REPLACE FUNCTION award_community_xp(p_user_id UUID, p_xp INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET xp_points = COALESCE(xp_points, 0) + p_xp
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment helpful_votes on a review + award 1 XP to the reviewer
CREATE OR REPLACE FUNCTION increment_helpful_votes(p_review_id UUID)
RETURNS VOID AS $$
DECLARE
  v_reviewer_id UUID;
BEGIN
  UPDATE community_reviews
  SET helpful_votes = helpful_votes + 1
  WHERE id = p_review_id
  RETURNING reviewer_id INTO v_reviewer_id;

  IF v_reviewer_id IS NOT NULL THEN
    UPDATE profiles
    SET xp_points = COALESCE(xp_points, 0) + 1
    WHERE id = v_reviewer_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Decrement helpful_votes on a review (when un-voting)
CREATE OR REPLACE FUNCTION decrement_helpful_votes(p_review_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE community_reviews
  SET helpful_votes = GREATEST(helpful_votes - 1, 0)
  WHERE id = p_review_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
