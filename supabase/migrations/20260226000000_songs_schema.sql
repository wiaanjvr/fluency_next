-- ============================================================================
-- Migration: Song Learning Feature
--
-- Tables:
--   1. songs              – song metadata (title, artist, YouTube ID, etc.)
--   2. song_lyrics_lines  – individual lyric lines with timestamps
--   3. song_words          – pre-processed word list per song (lemmas)
--   4. user_song_history   – tracks which songs a user has played
--
-- Includes indexes and RLS policies.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. songs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.songs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  artist        TEXT NOT NULL,
  language_code TEXT NOT NULL DEFAULT 'de',
  youtube_video_id TEXT NOT NULL,
  duration_seconds INTEGER,
  difficulty_band TEXT NOT NULL DEFAULT 'intermediate'
    CHECK (difficulty_band IN ('beginner', 'intermediate', 'advanced')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.songs IS 'Song metadata for the song-learning feature.';

-- ---------------------------------------------------------------------------
-- 2. song_lyrics_lines
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.song_lyrics_lines (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id       UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  line_index    INTEGER NOT NULL,
  text          TEXT NOT NULL,
  start_time_ms INTEGER NOT NULL,
  end_time_ms   INTEGER,
  UNIQUE (song_id, line_index)
);

COMMENT ON TABLE public.song_lyrics_lines IS 'Individual lyric lines with playback timestamps.';

-- ---------------------------------------------------------------------------
-- 3. song_words
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.song_words (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id           UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  lemma             TEXT NOT NULL,
  raw_word          TEXT NOT NULL,
  line_index        INTEGER NOT NULL,
  word_index_in_line INTEGER NOT NULL
);

COMMENT ON TABLE public.song_words IS 'Pre-processed lemmatised word list per song.';

-- ---------------------------------------------------------------------------
-- 4. user_song_history
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_song_history (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  song_id               UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  played_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  completion_percentage REAL NOT NULL DEFAULT 0,
  new_words_encountered INTEGER NOT NULL DEFAULT 0
);

COMMENT ON TABLE public.user_song_history IS 'Tracks per-user song play history and progress.';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- songs: filter by language_code
CREATE INDEX IF NOT EXISTS idx_songs_language_code
  ON public.songs(language_code);

-- song_lyrics_lines: fast look-up by song, ordered by line
CREATE INDEX IF NOT EXISTS idx_song_lyrics_lines_song_line
  ON public.song_lyrics_lines(song_id, line_index);

-- song_words: look-up by song, and by lemma (for scoring)
CREATE INDEX IF NOT EXISTS idx_song_words_song_id
  ON public.song_words(song_id);

CREATE INDEX IF NOT EXISTS idx_song_words_lemma
  ON public.song_words(lemma);

CREATE INDEX IF NOT EXISTS idx_song_words_song_lemma
  ON public.song_words(song_id, lemma);

-- user_song_history: filter by user + song, and by played_at for recency
CREATE INDEX IF NOT EXISTS idx_user_song_history_user_id
  ON public.user_song_history(user_id);

CREATE INDEX IF NOT EXISTS idx_user_song_history_user_song
  ON public.user_song_history(user_id, song_id);

CREATE INDEX IF NOT EXISTS idx_user_song_history_played_at
  ON public.user_song_history(user_id, played_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- songs: readable by everyone (public catalogue)
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Songs are publicly readable"
  ON public.songs FOR SELECT
  USING (true);

CREATE POLICY "Only service role can insert songs"
  ON public.songs FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Only service role can update songs"
  ON public.songs FOR UPDATE
  USING (false);

CREATE POLICY "Only service role can delete songs"
  ON public.songs FOR DELETE
  USING (false);

-- song_lyrics_lines: readable by everyone
ALTER TABLE public.song_lyrics_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lyrics are publicly readable"
  ON public.song_lyrics_lines FOR SELECT
  USING (true);

CREATE POLICY "Only service role can insert lyrics"
  ON public.song_lyrics_lines FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Only service role can update lyrics"
  ON public.song_lyrics_lines FOR UPDATE
  USING (false);

CREATE POLICY "Only service role can delete lyrics"
  ON public.song_lyrics_lines FOR DELETE
  USING (false);

-- song_words: readable by everyone
ALTER TABLE public.song_words ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Song words are publicly readable"
  ON public.song_words FOR SELECT
  USING (true);

CREATE POLICY "Only service role can insert song words"
  ON public.song_words FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Only service role can update song words"
  ON public.song_words FOR UPDATE
  USING (false);

CREATE POLICY "Only service role can delete song words"
  ON public.song_words FOR DELETE
  USING (false);

-- user_song_history: users can only see and write their own
ALTER TABLE public.user_song_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own song history"
  ON public.user_song_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own song history"
  ON public.user_song_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own song history"
  ON public.user_song_history FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own song history"
  ON public.user_song_history FOR DELETE
  USING (auth.uid() = user_id);
