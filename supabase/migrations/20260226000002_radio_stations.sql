-- ============================================================
-- Migration: Add radio_stations table for Ambient Player
-- ============================================================
-- Stores radio stream URLs cached from radio-browser.info,
-- keyed by language_code. The /api/ambient/radio endpoint
-- reads from this table and falls back to radio-browser.info
-- when fewer than 5 active stations exist.
-- ============================================================

CREATE TABLE IF NOT EXISTS radio_stations (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  language_code TEXT NOT NULL,          -- ISO 639-1, e.g. 'fr', 'de', 'it'
  name          TEXT NOT NULL,          -- Station display name
  stream_url    TEXT NOT NULL UNIQUE,   -- Direct audio stream URL (conflict key)
  country       TEXT NOT NULL DEFAULT '',
  bitrate       INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  last_checked  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_radio_stations_language
  ON radio_stations (language_code, is_active);

-- RLS: authenticated users can read; service role manages
ALTER TABLE radio_stations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Radio stations are publicly readable"
  ON radio_stations FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage radio stations"
  ON radio_stations FOR ALL
  USING (auth.role() = 'service_role');

-- Allow authenticated server-side upserts (the API route uses the
-- authenticated server client, not the service role key)
CREATE POLICY "Authenticated users can upsert radio stations"
  ON radio_stations FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update radio stations"
  ON radio_stations FOR UPDATE
  USING (auth.role() = 'authenticated');
