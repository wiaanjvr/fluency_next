-- ============================================================================
-- Interaction Events & Session Summaries — ML Personalization Event Store
-- 
-- Append-only event log for every user interaction. This is the training data
-- foundation for all downstream ML models (difficulty prediction, optimal
-- review timing, fatigue detection, module recommendation, etc.)
--
-- IMPORTANT: This table is APPEND-ONLY. Never update or delete rows.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. interaction_events — the core event log
-- ---------------------------------------------------------------------------

CREATE TABLE interaction_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word_id UUID REFERENCES user_words(id) ON DELETE SET NULL,
  grammar_concept_id UUID REFERENCES grammar_lessons(id) ON DELETE SET NULL,

  -- Which module generated this event
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

  -- Outcome
  correct BOOLEAN NOT NULL,
  response_time_ms INTEGER,

  -- Session context
  session_id UUID NOT NULL,
  session_sequence_number INTEGER NOT NULL DEFAULT 0,

  -- Temporal features
  time_of_day TEXT NOT NULL CHECK (time_of_day IN (
    'morning', 'afternoon', 'evening', 'night'
  )),
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),

  -- Spacing features
  days_since_last_review REAL,          -- for this word (NULL if first review)
  days_since_last_session REAL,         -- for this user (NULL if first session)

  -- Within-session performance
  consecutive_correct_in_session INTEGER NOT NULL DEFAULT 0,
  session_fatigue_proxy REAL,           -- responseTime / baseline (>1 = slower than usual)

  -- Module-specific context
  story_complexity_level INTEGER,       -- only when module_source = 'story_engine'

  -- Input mode used for this interaction
  input_mode TEXT NOT NULL CHECK (input_mode IN (
    'multiple_choice', 'typing', 'speaking', 'reading'
  )),

  -- Immutable timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 2. session_summaries — aggregated per-session stats
-- ---------------------------------------------------------------------------

CREATE TABLE session_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

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

  total_words INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  average_response_time_ms REAL,

  -- Did the user finish the session or abandon it?
  completed_session BOOLEAN NOT NULL DEFAULT false,

  session_duration_ms INTEGER,

  -- Array of word IDs reviewed in this session
  words_reviewed_ids UUID[] NOT NULL DEFAULT '{}',

  -- Cognitive load estimate: average of session_fatigue_proxy across events
  estimated_cognitive_load REAL,

  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 3. user_baselines — rolling baseline stats per user for fatigue computation
-- ---------------------------------------------------------------------------

CREATE TABLE user_baselines (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Exponential moving average of response time across all sessions
  avg_response_time_ms REAL NOT NULL DEFAULT 3000.0,

  -- Total sessions completed (for weighting the EMA)
  total_sessions INTEGER NOT NULL DEFAULT 0,

  -- Last session timestamp (for days_since_last_session computation)
  last_session_at TIMESTAMPTZ,

  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 4. Indexes — optimized for write-heavy append + analytical reads
-- ---------------------------------------------------------------------------

-- Primary query patterns: by user, by session, by word, by time range

-- User + time range (most common analytical query)
CREATE INDEX idx_interaction_events_user_time
  ON interaction_events (user_id, created_at DESC);

-- Session lookup (all events in a session, ordered)
CREATE INDEX idx_interaction_events_session
  ON interaction_events (session_id, session_sequence_number);

-- Word history (all events for a specific word across all users)
CREATE INDEX idx_interaction_events_word
  ON interaction_events (word_id, created_at DESC)
  WHERE word_id IS NOT NULL;

-- Module filtering
CREATE INDEX idx_interaction_events_module
  ON interaction_events (user_id, module_source, created_at DESC);

-- Session summaries
CREATE INDEX idx_session_summaries_user
  ON session_summaries (user_id, started_at DESC);

CREATE INDEX idx_session_summaries_module
  ON session_summaries (user_id, module_source);

-- ---------------------------------------------------------------------------
-- 5. Row Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE interaction_events ENABLE ROW LEVEL SECURITY;

-- Users can only read their own events
CREATE POLICY "Users can read own interaction events"
  ON interaction_events FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own events
CREATE POLICY "Users can insert own interaction events"
  ON interaction_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- NO UPDATE or DELETE policies — append-only by design

ALTER TABLE session_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own session summaries"
  ON session_summaries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own session summaries"
  ON session_summaries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow update only for ending a session (setting ended_at, completed_session)
CREATE POLICY "Users can update own session summaries"
  ON session_summaries FOR UPDATE
  USING (auth.uid() = user_id);

ALTER TABLE user_baselines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own baselines"
  ON user_baselines FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own baselines"
  ON user_baselines FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own baselines"
  ON user_baselines FOR UPDATE
  USING (auth.uid() = user_id);
