-- ==========================================================================
-- Verb Conjugation Drill — Database Schema
-- ==========================================================================

-- Master verb table (language-agnostic)
CREATE TABLE IF NOT EXISTS conjugation_verbs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  language varchar(5) NOT NULL,
  infinitive varchar(100) NOT NULL,
  english_meaning varchar(200),
  verb_class varchar(50),
  tags text[],
  frequency_rank integer,
  created_at timestamptz DEFAULT now(),
  UNIQUE(language, infinitive)
);

-- All conjugated forms for each verb
CREATE TABLE IF NOT EXISTS conjugation_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  verb_id uuid REFERENCES conjugation_verbs(id) ON DELETE CASCADE NOT NULL,
  tense varchar(50) NOT NULL,
  mood varchar(30) NOT NULL,
  pronoun varchar(30) NOT NULL,
  pronoun_key varchar(20) NOT NULL,
  conjugated_form varchar(200) NOT NULL,
  rule_explanation text,
  UNIQUE(verb_id, tense, mood, pronoun_key)
);

-- User conjugation progress (per verb+tense+pronoun combination)
CREATE TABLE IF NOT EXISTS conjugation_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  verb_id uuid REFERENCES conjugation_verbs(id) ON DELETE CASCADE NOT NULL,
  tense varchar(50) NOT NULL,
  pronoun_key varchar(20) NOT NULL,
  correct_count integer DEFAULT 0,
  attempt_count integer DEFAULT 0,
  last_attempted_at timestamptz,
  streak integer DEFAULT 0,
  production_score numeric(4,3) DEFAULT 0.000,
  UNIQUE(user_id, verb_id, tense, pronoun_key)
);

-- Session log
CREATE TABLE IF NOT EXISTS conjugation_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  language varchar(5) NOT NULL,
  config jsonb NOT NULL,
  total_questions integer,
  correct_answers integer,
  accuracy numeric(5,2),
  time_taken_seconds integer,
  xp_earned integer,
  completed_at timestamptz DEFAULT now()
);

-- ==========================================================================
-- Indexes
-- ==========================================================================

CREATE INDEX IF NOT EXISTS idx_conjugation_verbs_language ON conjugation_verbs(language);
CREATE INDEX IF NOT EXISTS idx_conjugation_verbs_frequency ON conjugation_verbs(language, frequency_rank);
CREATE INDEX IF NOT EXISTS idx_conjugation_forms_verb_id ON conjugation_forms(verb_id);
CREATE INDEX IF NOT EXISTS idx_conjugation_forms_tense ON conjugation_forms(verb_id, tense);
CREATE INDEX IF NOT EXISTS idx_conjugation_progress_user ON conjugation_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_conjugation_progress_user_verb ON conjugation_progress(user_id, verb_id);
CREATE INDEX IF NOT EXISTS idx_conjugation_sessions_user ON conjugation_sessions(user_id);

-- ==========================================================================
-- Row Level Security
-- ==========================================================================

ALTER TABLE conjugation_verbs ENABLE ROW LEVEL SECURITY;
ALTER TABLE conjugation_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE conjugation_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE conjugation_sessions ENABLE ROW LEVEL SECURITY;

-- conjugation_verbs: public read, no user writes
CREATE POLICY "Anyone can read conjugation verbs"
  ON conjugation_verbs FOR SELECT
  USING (true);

-- conjugation_forms: public read, no user writes
CREATE POLICY "Anyone can read conjugation forms"
  ON conjugation_forms FOR SELECT
  USING (true);

-- conjugation_progress: users can only access their own rows
CREATE POLICY "Users can read own conjugation progress"
  ON conjugation_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conjugation progress"
  ON conjugation_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conjugation progress"
  ON conjugation_progress FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- conjugation_sessions: users can only access their own rows
CREATE POLICY "Users can read own conjugation sessions"
  ON conjugation_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conjugation sessions"
  ON conjugation_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);
