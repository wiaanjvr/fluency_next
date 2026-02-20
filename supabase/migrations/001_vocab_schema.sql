-- =============================================================================
-- 001_vocab_schema.sql
-- Creates the vocab, user_vocab, and generated_content tables with RLS policies
-- =============================================================================

-- ─── 1. vocab — master word list (seeded by admin) ──────────────────────────

CREATE TABLE IF NOT EXISTS vocab (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  word          text        NOT NULL,
  language      text        NOT NULL,            -- e.g. 'de', 'fr', 'it'
  type          text        NOT NULL,            -- e.g. 'verb', 'noun', 'adjective'
  form          text        NOT NULL,            -- e.g. 'infinitive', 'definite_article_noun'
  translation   text        NOT NULL DEFAULT '',
  frequency_rank int        NOT NULL DEFAULT 0,
  -- translation defaults to ''; fill via enrichment script after seeding

  UNIQUE (word, language, form)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_vocab_language        ON vocab (language);
CREATE INDEX IF NOT EXISTS idx_vocab_frequency_rank  ON vocab (language, frequency_rank);
CREATE INDEX IF NOT EXISTS idx_vocab_type            ON vocab (language, type);

-- RLS: any authenticated user can read the master word list; only service role can write
ALTER TABLE vocab ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read vocab"
  ON vocab FOR SELECT
  TO authenticated
  USING (true);

-- No INSERT/UPDATE/DELETE policies for authenticated — admin seeds via service role


-- ─── 2. user_vocab — per-user SRS state ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_vocab (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid          NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  vocab_id        uuid          NOT NULL REFERENCES vocab (id)      ON DELETE CASCADE,
  status          text          NOT NULL DEFAULT 'unseen'
                                CHECK (status IN ('unseen', 'learning', 'known')),
  ease_factor     double precision NOT NULL DEFAULT 2.5,
  interval_days   int           NOT NULL DEFAULT 1,
  next_review_at  timestamptz   NOT NULL DEFAULT now(),
  last_reviewed_at timestamptz,
  repetitions     int           NOT NULL DEFAULT 0,

  UNIQUE (user_id, vocab_id)
);

-- Indexes for the hot queries: due words + known words
CREATE INDEX IF NOT EXISTS idx_user_vocab_due
  ON user_vocab (user_id, status, next_review_at)
  WHERE status = 'learning';

CREATE INDEX IF NOT EXISTS idx_user_vocab_known
  ON user_vocab (user_id, status)
  WHERE status = 'known';

CREATE INDEX IF NOT EXISTS idx_user_vocab_user
  ON user_vocab (user_id);

-- RLS: users can only access their own rows
ALTER TABLE user_vocab ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own user_vocab"
  ON user_vocab FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own user_vocab"
  ON user_vocab FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own user_vocab"
  ON user_vocab FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own user_vocab"
  ON user_vocab FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);


-- ─── 3. generated_content — AI-generated sentences / paragraphs ─────────────

CREATE TABLE IF NOT EXISTS generated_content (
  id          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid          NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  content     text          NOT NULL,
  stage       text          NOT NULL
                            CHECK (stage IN ('3_word', 'paragraph')),
  vocab_ids   uuid[]        NOT NULL DEFAULT '{}',
  created_at  timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_generated_content_user
  ON generated_content (user_id, created_at DESC);

-- RLS: users can only access their own generated content
ALTER TABLE generated_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own generated_content"
  ON generated_content FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own generated_content"
  ON generated_content FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own generated_content"
  ON generated_content FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
