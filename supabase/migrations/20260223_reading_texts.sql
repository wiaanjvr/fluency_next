-- ==========================================================================
-- Free Reading feature tables
-- ==========================================================================

-- Reading texts generated for users
CREATE TABLE IF NOT EXISTS reading_texts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  language varchar(10) NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  content_tokens jsonb NOT NULL DEFAULT '[]'::jsonb,
  audio_url text,
  cefr_level varchar(5) NOT NULL,
  topic varchar(100),
  word_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS policies
ALTER TABLE reading_texts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own reading texts"
  ON reading_texts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reading texts"
  ON reading_texts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reading texts"
  ON reading_texts FOR UPDATE
  USING (auth.uid() = user_id);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_reading_texts_user_lang
  ON reading_texts (user_id, language, created_at DESC);


-- Word interactions during reading sessions
CREATE TABLE IF NOT EXISTS reading_word_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  text_id uuid REFERENCES reading_texts(id) ON DELETE CASCADE,
  word text NOT NULL,
  language varchar(10) NOT NULL,
  action varchar(20) NOT NULL CHECK (action IN ('looked_up', 'marked_known', 'added_to_deck')),
  timestamp timestamptz NOT NULL DEFAULT now()
);

-- RLS policies
ALTER TABLE reading_word_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own word interactions"
  ON reading_word_interactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own word interactions"
  ON reading_word_interactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Index for analytics
CREATE INDEX IF NOT EXISTS idx_reading_interactions_user
  ON reading_word_interactions (user_id, text_id, timestamp DESC);


-- Storage bucket for reading audio files
INSERT INTO storage.buckets (id, name, public)
VALUES ('reading-audio', 'reading-audio', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload reading audio"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'reading-audio'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Anyone can read reading audio"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'reading-audio');
