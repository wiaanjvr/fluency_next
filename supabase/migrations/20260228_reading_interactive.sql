-- ==========================================================================
-- Interactive reading: add word_timestamps column
--
-- Stores per-word audio timing data for karaoke-mode highlighting.
-- Format: [{ word_index: number, start: number, end: number }]
-- When real TTS word-timing data is available (e.g. from ElevenLabs
-- alignment API or Google TTS time_points), it is stored here.
-- When absent, the client falls back to proportional estimation.
-- ==========================================================================

ALTER TABLE reading_texts
  ADD COLUMN IF NOT EXISTS word_timestamps jsonb;
