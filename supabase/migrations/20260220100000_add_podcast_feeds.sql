-- ============================================================
-- Migration: Add podcast_feeds table for Ambient Player
-- ============================================================
-- This stores curated RSS podcast feeds per language.
-- The /api/ambient/podcast endpoint reads from this table,
-- parses each feed's RSS, and returns the latest episode.
-- ============================================================

CREATE TABLE IF NOT EXISTS podcast_feeds (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  language_code TEXT NOT NULL,          -- ISO 639-1, e.g. 'fr', 'de', 'it'
  title      TEXT NOT NULL,             -- Display name shown in the launcher
  rss_url    TEXT NOT NULL UNIQUE,      -- RSS/Atom feed URL
  difficulty TEXT NOT NULL DEFAULT 'intermediate'  -- beginner | elementary | intermediate | advanced
    CHECK (difficulty IN ('beginner', 'elementary', 'intermediate', 'advanced')),
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_podcast_feeds_language ON podcast_feeds (language_code, is_active);

-- RLS: public read (no auth required for the API—uses service role internally)
ALTER TABLE podcast_feeds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Podcast feeds are publicly readable"
  ON podcast_feeds FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage podcast feeds"
  ON podcast_feeds FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================
-- Seed data — curated free language-learning podcast feeds
-- ============================================================

INSERT INTO podcast_feeds (language_code, title, rss_url, difficulty) VALUES

-- ── French (fr) ──────────────────────────────────────────────────────────────
('fr', 'Journal en français facile',
  'https://www.rfi.fr/fr/podcasts/journal-en-fran%C3%A7ais-facile/podcast.rss',
  'elementary'),

('fr', 'InnerFrench',
  'https://feeds.buzzsprout.com/226236.rss',
  'intermediate'),

('fr', 'Français Authentique',
  'https://www.francaisauthentique.com/feed/podcast/',
  'intermediate'),

('fr', 'One Thing in a French Day',
  'https://feeds.feedburner.com/OnethingInaFrenchDay',
  'advanced'),

-- ── German (de) ──────────────────────────────────────────────────────────────
('de', 'Langsam gesprochene Nachrichten (DW)',
  'https://rss.dw.com/xml/podcast_lgn_de',
  'elementary'),

('de', 'Slow German',
  'https://slowgerman.com/feed/podcast/',
  'intermediate'),

('de', 'Deutsch lernen durch Hören',
  'https://feeds.feedburner.com/deutschlernendurchhoeren',
  'beginner'),

-- ── Italian (it) ─────────────────────────────────────────────────────────────
('it', 'News in Slow Italian',
  'https://www.newsinslowitalian.com/rss/podcast',
  'elementary'),

('it', 'Italy Made Easy Podcast',
  'https://feeds.buzzsprout.com/1126786.rss',
  'elementary'),

('it', 'Learn Italian with Lucrezia',
  'https://feeds.buzzsprout.com/1540592.rss',
  'intermediate'),

-- ── Spanish (es) ─────────────────────────────────────────────────────────────
('es', 'News in Slow Spanish',
  'https://www.newsinslowspanish.com/rss/podcast',
  'elementary'),

('es', 'Radio Ambulante (NPR)',
  'https://feeds.npr.org/510311/podcast.xml',
  'advanced'),

('es', 'SpanishPod101 – Audio',
  'https://www.spanishpod101.com/feed/podcast/',
  'beginner'),

-- ── Portuguese (pt) ──────────────────────────────────────────────────────────
('pt', 'News in Slow Portuguese',
  'https://www.newsinslowportuguese.com/rss/podcast',
  'elementary'),

('pt', 'PortuguesePod101 – Audio',
  'https://www.portuguesepod101.com/feed/podcast/',
  'beginner'),

-- ── Japanese (ja) ────────────────────────────────────────────────────────────
('ja', 'JapanesePod101 – Audio',
  'https://www.japanesepod101.com/feed/podcast/',
  'beginner'),

-- ── Chinese (zh) ─────────────────────────────────────────────────────────────
('zh', 'ChinesePod – Newbie',
  'https://feeds.feedburner.com/chinesepod-newbie',
  'beginner'),

-- ── Korean (ko) ──────────────────────────────────────────────────────────────
('ko', 'KoreanClass101 – Audio',
  'https://www.koreanclass101.com/feed/podcast/',
  'beginner'),

-- ── Russian (ru) ─────────────────────────────────────────────────────────────
('ru', 'Russian Progress Podcast',
  'https://feeds.feedburner.com/RussianProgressPodcast',
  'elementary'),

-- ── Arabic (ar) ──────────────────────────────────────────────────────────────
('ar', 'ArabicPod101 – Audio',
  'https://www.arabicpod101.com/feed/podcast/',
  'beginner')

ON CONFLICT (rss_url) DO UPDATE
  SET title         = EXCLUDED.title,
      difficulty    = EXCLUDED.difficulty,
      is_active     = EXCLUDED.is_active;
