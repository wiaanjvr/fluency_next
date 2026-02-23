-- ==========================================================================
-- Reading feature fixes:
-- 1. Allow all authenticated users to read curated texts (user_id IS NULL)
-- 2. increment_times_seen helper function
-- ==========================================================================

-- Allow authenticated users to read curated (shared) reading texts
CREATE POLICY "Anyone can read curated reading texts"
  ON reading_texts FOR SELECT
  USING (user_id IS NULL);

-- Helper: atomically fetch the incremented times_seen value for a word
-- (used by mark-known flow)
CREATE OR REPLACE FUNCTION increment_times_seen(
  p_user_id uuid,
  p_word text,
  p_language text
)
RETURNS int AS $$
  SELECT coalesce(
    (SELECT repetitions + 1
     FROM user_words
     WHERE user_id = p_user_id
       AND lower(word) = lower(p_word)
       AND language = p_language),
    1
  )
$$ LANGUAGE sql STABLE;
