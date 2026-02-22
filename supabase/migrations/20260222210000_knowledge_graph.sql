-- ============================================================================
-- Knowledge Graph Integration Layer
-- Extends user_words into a unified word knowledge model and adds
-- cross-module review tracking for the Propel ↔ Engine integration.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Extend user_words with knowledge-graph columns
-- ---------------------------------------------------------------------------

-- Total times the word has been seen across ALL modules (stories, flashcards,
-- cloze, conjugation drills, pronunciation, grammar exercises, reading).
ALTER TABLE user_words
  ADD COLUMN IF NOT EXISTS exposure_count INTEGER NOT NULL DEFAULT 0;

-- Active production ability (0-100). Typing/speaking drills raise this faster
-- than passive recognition (multiple-choice, reading).
ALTER TABLE user_words
  ADD COLUMN IF NOT EXISTS production_score INTEGER NOT NULL DEFAULT 0
    CHECK (production_score >= 0 AND production_score <= 100);

-- Grammar / semantic tags, e.g. {"subjunctive","irregular","dative","reflexive"}
ALTER TABLE user_words
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

-- Controls when the story engine is allowed to weave this word into stories.
-- Lower = easier to introduce. Grammar-lesson completion lowers this threshold.
-- Default 1.0 means "no gate". A high value (e.g. 5.0) means the word needs
-- the grammar concept unlocked first. Value represents minimum required
-- ease_factor before the word qualifies for story inclusion.
ALTER TABLE user_words
  ADD COLUMN IF NOT EXISTS story_introduction_threshold REAL NOT NULL DEFAULT 1.0;

-- Which propel module last reviewed this word (null = only seen in stories)
ALTER TABLE user_words
  ADD COLUMN IF NOT EXISTS last_propel_module TEXT;

-- When the last propel review happened
ALTER TABLE user_words
  ADD COLUMN IF NOT EXISTS last_propel_review_at TIMESTAMPTZ;

-- Pronunciation sub-score (0-100), separate from production_score
ALTER TABLE user_words
  ADD COLUMN IF NOT EXISTS pronunciation_score INTEGER NOT NULL DEFAULT 0
    CHECK (pronunciation_score >= 0 AND pronunciation_score <= 100);

-- ---------------------------------------------------------------------------
-- 2. Module review history  (replaces / extends word_interactions for
--    cross-module tracking)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS module_review_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word_id UUID NOT NULL REFERENCES user_words(id) ON DELETE CASCADE,

  -- Which propel module (or the main engine) generated this review
  module_source TEXT NOT NULL CHECK (module_source IN (
    'story_engine',
    'flashcards',
    'cloze',
    'conjugation',
    'pronunciation',
    'grammar',
    'free_reading',
    'foundation'
  )),

  correct BOOLEAN NOT NULL,
  response_time_ms INTEGER,

  -- FSRS / SM-2 rating that was applied (0-5 for SM-2, 1-4 for FSRS)
  rating INTEGER,

  -- Snapshot of the SRS state AFTER this review
  ease_factor_after REAL,
  interval_after INTEGER,
  repetitions_after INTEGER,
  status_after TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 3. Grammar unlock events — logs when a grammar lesson unlocks words
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS grammar_unlock_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  grammar_tag TEXT NOT NULL,
  lesson_id UUID REFERENCES grammar_lessons(id) ON DELETE SET NULL,
  words_unlocked INTEGER NOT NULL DEFAULT 0,
  previous_threshold REAL,
  new_threshold REAL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 4. Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_user_words_tags
  ON user_words USING GIN (tags);

CREATE INDEX IF NOT EXISTS idx_user_words_exposure
  ON user_words (user_id, exposure_count);

CREATE INDEX IF NOT EXISTS idx_user_words_production
  ON user_words (user_id, production_score);

CREATE INDEX IF NOT EXISTS idx_user_words_threshold
  ON user_words (user_id, story_introduction_threshold);

CREATE INDEX IF NOT EXISTS idx_user_words_propel_module
  ON user_words (user_id, last_propel_module);

CREATE INDEX IF NOT EXISTS idx_module_review_history_user
  ON module_review_history (user_id);

CREATE INDEX IF NOT EXISTS idx_module_review_history_word
  ON module_review_history (word_id);

CREATE INDEX IF NOT EXISTS idx_module_review_history_module
  ON module_review_history (user_id, module_source);

CREATE INDEX IF NOT EXISTS idx_module_review_history_created
  ON module_review_history (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_grammar_unlock_events_user
  ON grammar_unlock_events (user_id);

CREATE INDEX IF NOT EXISTS idx_grammar_unlock_events_tag
  ON grammar_unlock_events (grammar_tag);

-- ---------------------------------------------------------------------------
-- 5. Row Level Security
-- ---------------------------------------------------------------------------

-- module_review_history
ALTER TABLE module_review_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own module reviews"
  ON module_review_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own module reviews"
  ON module_review_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- grammar_unlock_events
ALTER TABLE grammar_unlock_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own grammar unlocks"
  ON grammar_unlock_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own grammar unlocks"
  ON grammar_unlock_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);
