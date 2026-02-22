-- ============================================================================
-- Unified Knowledge System — Schema Extensions
--
-- Adds the remaining columns and tables needed for the unified knowledge
-- transfer system across all game modules.
--
-- New columns on user_words:
--   recognition_score     REAL (0-1) — passive recognition ability
--   contextual_usage_score REAL (0-1) — correct usage in story/sentence context
--   native_translation    TEXT        — user-facing translation
--
-- New columns on module_review_history:
--   event_id    TEXT    — idempotency key (duplicate network retries are no-ops)
--   input_mode  TEXT    — multipleChoice | typing | speaking | reading
--   session_id  TEXT    — links review to a session
--
-- New table: grammar_concept_mastery
--   Tracks per-user mastery of grammar concepts (e.g. "konjunktiv2") as a
--   weighted aggregate across all words tagged with that concept.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Extend user_words with recognition and contextual usage scores
-- ---------------------------------------------------------------------------

-- Recognition score: passive ability (multiple-choice, recall recognition)
-- Stored as 0-1 REAL, unlike production_score/pronunciation_score which are 0-100 INTEGER (legacy)
ALTER TABLE user_words
  ADD COLUMN IF NOT EXISTS recognition_score REAL NOT NULL DEFAULT 0
    CHECK (recognition_score >= 0 AND recognition_score <= 1);

-- Contextual usage score: ability to use word correctly in story/sentence contexts
ALTER TABLE user_words
  ADD COLUMN IF NOT EXISTS contextual_usage_score REAL NOT NULL DEFAULT 0
    CHECK (contextual_usage_score >= 0 AND contextual_usage_score <= 1);

-- Native translation (displayed to user in flashcards etc.)
ALTER TABLE user_words
  ADD COLUMN IF NOT EXISTS native_translation TEXT;

-- ---------------------------------------------------------------------------
-- 2. Extend module_review_history for idempotency + tracking
-- ---------------------------------------------------------------------------

-- Event ID for idempotent review processing. If a network retry submits
-- the same event_id twice, the second call is a no-op.
ALTER TABLE module_review_history
  ADD COLUMN IF NOT EXISTS event_id TEXT;

-- Input mode: how the user interacted (determines score weighting)
ALTER TABLE module_review_history
  ADD COLUMN IF NOT EXISTS input_mode TEXT
    CHECK (input_mode IS NULL OR input_mode IN (
      'multipleChoice', 'typing', 'speaking', 'reading'
    ));

-- Session ID: links this review to a user session
ALTER TABLE module_review_history
  ADD COLUMN IF NOT EXISTS session_id TEXT;

-- Update the module_source CHECK to include the new "anki" and "story" values
-- used by the unified knowledge system adapters.
-- Note: the existing constraint allows story_engine/flashcards/free_reading/foundation.
-- We add "anki", "story" as aliases to support the new unified adapter naming.
ALTER TABLE module_review_history
  DROP CONSTRAINT IF EXISTS module_review_history_module_source_check;

ALTER TABLE module_review_history
  ADD CONSTRAINT module_review_history_module_source_check
    CHECK (module_source IN (
      'story_engine', 'story',
      'flashcards', 'anki',
      'cloze',
      'conjugation',
      'pronunciation',
      'grammar',
      'free_reading',
      'foundation'
    ));

-- ---------------------------------------------------------------------------
-- 3. Grammar Concept Mastery table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS grammar_concept_mastery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  concept_tag TEXT NOT NULL,

  -- Aggregate mastery score (0-1) across all words tagged with this concept.
  -- Updated via weighted moving average in updateGrammarConceptMastery().
  mastery_score REAL NOT NULL DEFAULT 0
    CHECK (mastery_score >= 0 AND mastery_score <= 1),

  -- Total number of review events that contributed to this mastery score.
  exposure_count INTEGER NOT NULL DEFAULT 0,

  last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One record per user per concept
  UNIQUE(user_id, concept_tag)
);

-- ---------------------------------------------------------------------------
-- 4. Indexes
-- ---------------------------------------------------------------------------

-- Fast lookup by event_id for idempotency checks
CREATE UNIQUE INDEX IF NOT EXISTS idx_module_review_history_event_id
  ON module_review_history (event_id)
  WHERE event_id IS NOT NULL;

-- Fast lookup by session_id
CREATE INDEX IF NOT EXISTS idx_module_review_history_session
  ON module_review_history (session_id)
  WHERE session_id IS NOT NULL;

-- Fast lookup by input_mode for analytics
CREATE INDEX IF NOT EXISTS idx_module_review_history_input_mode
  ON module_review_history (input_mode)
  WHERE input_mode IS NOT NULL;

-- Recognition score for word selection queries
CREATE INDEX IF NOT EXISTS idx_user_words_recognition
  ON user_words (user_id, recognition_score);

-- Contextual usage score
CREATE INDEX IF NOT EXISTS idx_user_words_contextual_usage
  ON user_words (user_id, contextual_usage_score);

-- Grammar concept mastery lookups
CREATE INDEX IF NOT EXISTS idx_grammar_concept_mastery_user
  ON grammar_concept_mastery (user_id);

CREATE INDEX IF NOT EXISTS idx_grammar_concept_mastery_tag
  ON grammar_concept_mastery (concept_tag);

CREATE INDEX IF NOT EXISTS idx_grammar_concept_mastery_user_tag
  ON grammar_concept_mastery (user_id, concept_tag);

-- ---------------------------------------------------------------------------
-- 5. Row Level Security for grammar_concept_mastery
-- ---------------------------------------------------------------------------

ALTER TABLE grammar_concept_mastery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own grammar concept mastery"
  ON grammar_concept_mastery FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own grammar concept mastery"
  ON grammar_concept_mastery FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own grammar concept mastery"
  ON grammar_concept_mastery FOR UPDATE
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 6. Seed recognition_score from existing data
-- ---------------------------------------------------------------------------

-- For existing words that have been reviewed (exposure_count > 0),
-- estimate initial recognition_score based on status and ease_factor.
-- This prevents regression for users who already have established words.
UPDATE user_words
SET recognition_score = CASE
  WHEN status = 'mastered' THEN 0.9
  WHEN status = 'known' THEN 0.7
  WHEN status = 'learning' AND repetitions >= 3 THEN 0.5
  WHEN status = 'learning' THEN 0.3
  ELSE 0
END
WHERE exposure_count > 0 AND recognition_score = 0;

-- ---------------------------------------------------------------------------
-- 7. Database-level constraint: prevent direct writes to score fields
-- ---------------------------------------------------------------------------

-- Create a function that ensures score fields are only updated through
-- the processReview pipeline (identified by the updated_at being set).
-- This is a soft constraint — it logs violations but doesn't block them,
-- to avoid breaking existing code during migration.
CREATE OR REPLACE FUNCTION check_score_update_source()
RETURNS TRIGGER AS $$
BEGIN
  -- If recognition_score, production_score, pronunciation_score, or
  -- contextual_usage_score changed but updated_at was NOT changed,
  -- log a warning. In the future this could be a hard block.
  IF (
    NEW.recognition_score IS DISTINCT FROM OLD.recognition_score OR
    NEW.production_score IS DISTINCT FROM OLD.production_score OR
    NEW.pronunciation_score IS DISTINCT FROM OLD.pronunciation_score OR
    NEW.contextual_usage_score IS DISTINCT FROM OLD.contextual_usage_score
  ) AND NEW.updated_at = OLD.updated_at THEN
    RAISE WARNING 'Score fields updated without setting updated_at. Use processReview() instead of direct writes. word_id=%, user_id=%', NEW.id, NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_score_update ON user_words;
CREATE TRIGGER trg_check_score_update
  BEFORE UPDATE ON user_words
  FOR EACH ROW
  EXECUTE FUNCTION check_score_update_source();
