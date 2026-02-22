-- ============================================================================
-- Migration: Add language column to learner_words_v2
--
-- The original learner_words_v2 table had no language column, so switching
-- the user's target language required wiping the entire table. This migration
-- tags every row with a language code so progress for multiple languages can
-- coexist safely.
--
-- Changes:
--   1. Add   learner_words_v2.language TEXT NOT NULL DEFAULT 'fr'
--   2. Backfill existing rows using the owner's profiles.target_language
--   3. Drop old unique constraint (user_id, lemma)
--   4. Add new unique constraint (user_id, language, lemma)
--   5. Add composite index for the hot query path (user_id, language)
--   6. Update the get_mastery_count RPC to be language-scoped
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Add the language column (non-null, default 'fr' for backward compat)
-- ---------------------------------------------------------------------------
ALTER TABLE learner_words_v2
  ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'fr';

-- ---------------------------------------------------------------------------
-- 2. Backfill existing rows: set language = profiles.target_language
--    for the owning user.  Any user whose profile is missing defaults to 'fr'.
-- ---------------------------------------------------------------------------
UPDATE learner_words_v2 lw
SET    language = COALESCE(p.target_language, 'fr')
FROM   profiles p
WHERE  lw.user_id = p.id
  AND  lw.language = 'fr'; -- only rows that still have the default

-- ---------------------------------------------------------------------------
-- 3. Drop the old (user_id, lemma) unique constraint
-- ---------------------------------------------------------------------------
ALTER TABLE learner_words_v2
  DROP CONSTRAINT IF EXISTS learner_words_v2_user_lemma_unique;

-- ---------------------------------------------------------------------------
-- 4. Add new (user_id, language, lemma) unique constraint
-- ---------------------------------------------------------------------------
ALTER TABLE learner_words_v2
  ADD CONSTRAINT learner_words_v2_user_lang_lemma_unique
    UNIQUE (user_id, language, lemma);

-- ---------------------------------------------------------------------------
-- 5. Composite index for the hot query path
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_learner_words_v2_user_language
  ON learner_words_v2 (user_id, language);

-- Also update the existing status/freq indexes to include language so
-- filtered queries don't need a separate sort step.
DROP INDEX IF EXISTS idx_learner_words_v2_user_status;
CREATE INDEX IF NOT EXISTS idx_learner_words_v2_user_lang_status
  ON learner_words_v2 (user_id, language, status);

DROP INDEX IF EXISTS idx_learner_words_v2_user_freq;
CREATE INDEX IF NOT EXISTS idx_learner_words_v2_user_lang_freq
  ON learner_words_v2 (user_id, language, frequency_rank ASC);

-- ---------------------------------------------------------------------------
-- 6. Update the get_mastery_count RPC to filter by language
--    (replaces the old language-unaware version)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_mastery_count(p_user_id UUID, p_language TEXT DEFAULT NULL)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COUNT(*)::INTEGER
  FROM   learner_words_v2
  WHERE  user_id = p_user_id
    AND  status  = 'mastered'
    AND  (p_language IS NULL OR language = p_language);
$$;
