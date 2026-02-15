-- Migration: Add Foundation Progress Tracking
-- This migration adds a table to track user's foundation vocabulary learning progress
-- Replaces localStorage-based tracking with database storage

CREATE TABLE IF NOT EXISTS foundation_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  language TEXT NOT NULL,
  
  -- Session tracking (sessions 0-24, each with 4 words)
  completed_sessions INTEGER[] DEFAULT '{}',
  
  -- Word tracking - words that have been introduced in foundation lessons
  words_learned TEXT[] DEFAULT '{}',
  
  -- Stats
  total_sessions_completed INTEGER DEFAULT 0,
  total_words_learned INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_session_date TIMESTAMP WITH TIME ZONE,
  
  -- Unique per user per language
  UNIQUE(user_id, language)
);

-- Index for performance
CREATE INDEX idx_foundation_progress_user_id ON foundation_progress(user_id);
CREATE INDEX idx_foundation_progress_language ON foundation_progress(language);

-- Row Level Security
ALTER TABLE foundation_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own foundation progress"
  ON foundation_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own foundation progress"
  ON foundation_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own foundation progress"
  ON foundation_progress FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own foundation progress"
  ON foundation_progress FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to update updated_at timestamp
DROP TRIGGER IF EXISTS update_foundation_progress_updated_at ON foundation_progress;
CREATE TRIGGER update_foundation_progress_updated_at 
    BEFORE UPDATE ON foundation_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to mark a foundation session as complete
CREATE OR REPLACE FUNCTION complete_foundation_session(
  p_user_id UUID,
  p_language TEXT,
  p_session_number INTEGER,
  p_words_learned TEXT[]
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO foundation_progress (
    user_id,
    language,
    completed_sessions,
    words_learned,
    total_sessions_completed,
    total_words_learned,
    last_session_date
  ) VALUES (
    p_user_id,
    p_language,
    ARRAY[p_session_number],
    p_words_learned,
    1,
    array_length(p_words_learned, 1),
    NOW()
  )
  ON CONFLICT (user_id, language) DO UPDATE SET
    completed_sessions = array_append(
      CASE 
        WHEN p_session_number = ANY(foundation_progress.completed_sessions) 
        THEN foundation_progress.completed_sessions
        ELSE foundation_progress.completed_sessions
      END,
      p_session_number
    ),
    words_learned = foundation_progress.words_learned || p_words_learned,
    total_sessions_completed = array_length(
      array_append(
        CASE 
          WHEN p_session_number = ANY(foundation_progress.completed_sessions) 
          THEN foundation_progress.completed_sessions
          ELSE foundation_progress.completed_sessions
        END,
        p_session_number
      ),
      1
    ),
    total_words_learned = array_length(foundation_progress.words_learned || p_words_learned, 1),
    last_session_date = NOW(),
    updated_at = NOW()
  WHERE NOT (p_session_number = ANY(foundation_progress.completed_sessions));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's foundation progress
CREATE OR REPLACE FUNCTION get_foundation_progress(
  p_user_id UUID,
  p_language TEXT
)
RETURNS TABLE (
  completed_sessions INTEGER[],
  words_learned TEXT[],
  total_sessions_completed INTEGER,
  total_words_learned INTEGER,
  last_session_date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fp.completed_sessions,
    fp.words_learned,
    fp.total_sessions_completed,
    fp.total_words_learned,
    fp.last_session_date
  FROM foundation_progress fp
  WHERE fp.user_id = p_user_id
    AND fp.language = p_language;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
