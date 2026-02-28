-- ==========================================================================
-- Reading texts: community sharing + known_word_count metadata
--
-- 1. Add `known_word_count` so we can narrow cache lookups by vocab size.
-- 2. Allow any authenticated user to SELECT all reading_texts so the API
--    can find cached stories that pass 95/5 for the requesting user.
-- 3. Add an index that makes the cache lookup fast.
-- ==========================================================================

-- Add known_word_count to track the vocabulary size at generation time
ALTER TABLE reading_texts
  ADD COLUMN IF NOT EXISTS known_word_count integer NOT NULL DEFAULT 0;

-- Community SELECT policy: any authenticated user can read any story
-- (story content is non-sensitive; this powers cross-user caching)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'reading_texts'
      AND policyname = 'Authenticated users can read all reading texts'
  ) THEN
    CREATE POLICY "Authenticated users can read all reading texts"
      ON reading_texts FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- Index to speed up cache lookups (language + level + vocab window)
CREATE INDEX IF NOT EXISTS idx_reading_texts_community_cache
  ON reading_texts (language, cefr_level, known_word_count, created_at DESC);
