-- ============================================================
-- Migration: ambient_videos
-- Adds a curated table of free, legally-streamable language-learning
-- video content (YouTube nocookie embeds, Dailymotion, Arte, etc.)
-- ============================================================

CREATE TABLE IF NOT EXISTS ambient_videos (
  id              UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  language_code   TEXT        NOT NULL,           -- ISO 639-1 e.g. 'fr', 'de', 'es'
  title           TEXT        NOT NULL,
  description     TEXT,
  embed_url       TEXT        NOT NULL,           -- iframe src – youtube-nocookie, dailymotion, …
  source          TEXT        NOT NULL DEFAULT 'youtube',  -- 'youtube' | 'dailymotion' | 'arte' | 'vimeo'
  category        TEXT        NOT NULL DEFAULT 'news',
    -- 'news' | 'kids' | 'sport' | 'movies' | 'series' | 'culture' | 'learning'
  thumbnail_url   TEXT,                           -- optional; shown in the list
  duration_hint   TEXT,                           -- e.g. 'Live 24/7', '~8 min', 'Series'
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  is_live         BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ambient_videos_lang     ON ambient_videos(language_code);
CREATE INDEX IF NOT EXISTS idx_ambient_videos_category ON ambient_videos(category);
CREATE INDEX IF NOT EXISTS idx_ambient_videos_active   ON ambient_videos(is_active);

-- Row-Level Security: public read of active rows, admin writes
ALTER TABLE ambient_videos ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read active videos
CREATE POLICY "ambient_videos_select"
  ON ambient_videos
  FOR SELECT
  USING (is_active = TRUE);

-- Service-role (admin) can do everything (via supabase management / seed scripts)
-- No insert/update/delete policy for normal users – admin only.
