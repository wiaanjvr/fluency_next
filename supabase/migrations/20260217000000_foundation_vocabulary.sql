-- Foundation Vocabulary Tables for storing words, sentences, and pre-generated audio
-- This migration creates tables to store foundation vocabulary across multiple languages

-- Foundation Words table (stores individual words with audio)
CREATE TABLE foundation_words (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  
  -- Word identification
  word TEXT NOT NULL,
  lemma TEXT NOT NULL,
  language TEXT NOT NULL CHECK (language IN ('fr', 'de', 'it')),
  rank INTEGER NOT NULL,
  pos TEXT NOT NULL, -- part of speech
  
  -- Learning metadata
  translation TEXT NOT NULL,
  image_keyword TEXT NOT NULL,
  imageability TEXT NOT NULL CHECK (imageability IN ('high', 'medium', 'low')),
  category TEXT NOT NULL,
  phonetic TEXT,
  
  -- Audio URL (pointing to Supabase storage)
  audio_url TEXT,
  
  -- Unique constraint: one word per language per rank
  UNIQUE(language, word, rank)
);

-- Foundation Sentences table (stores example sentences with audio)
CREATE TABLE foundation_sentences (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  
  -- Links to foundation word
  word_id UUID REFERENCES foundation_words ON DELETE CASCADE NOT NULL,
  
  -- Sentence content
  target_language_text TEXT NOT NULL, -- Sentence in target language (fr/de/it)
  english_translation TEXT NOT NULL,
  
  -- Audio URL (pointing to Supabase storage)
  audio_url TEXT,
  
  -- One sentence per word
  UNIQUE(word_id)
);

-- Indexes for performance
CREATE INDEX idx_foundation_words_language ON foundation_words(language);
CREATE INDEX idx_foundation_words_rank ON foundation_words(rank);
CREATE INDEX idx_foundation_words_language_rank ON foundation_words(language, rank);
CREATE INDEX idx_foundation_sentences_word_id ON foundation_sentences(word_id);

-- Storage bucket for foundation audio (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('foundation-audio', 'foundation-audio', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for foundation-audio bucket (public read)
CREATE POLICY "Foundation audio is publicly accessible" 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'foundation-audio');

-- Allow authenticated users to upload foundation audio (for admin/script usage)
CREATE POLICY "Authenticated users can upload foundation audio" 
  ON storage.objects FOR INSERT 
  WITH CHECK (
    bucket_id = 'foundation-audio' AND 
    auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can update foundation audio" 
  ON storage.objects FOR UPDATE 
  USING (
    bucket_id = 'foundation-audio' AND 
    auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can delete foundation audio" 
  ON storage.objects FOR DELETE 
  USING (
    bucket_id = 'foundation-audio' AND 
    auth.role() = 'authenticated'
  );

-- Row Level Security (RLS) Policies for tables
-- Foundation data is publicly readable but only insertable/updatable by authenticated users

ALTER TABLE foundation_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE foundation_sentences ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Foundation words are publicly readable" 
  ON foundation_words FOR SELECT 
  USING (true);

CREATE POLICY "Foundation sentences are publicly readable" 
  ON foundation_sentences FOR SELECT 
  USING (true);

-- Authenticated write access (for seeding/admin purposes)
CREATE POLICY "Authenticated users can insert foundation words" 
  ON foundation_words FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update foundation words" 
  ON foundation_words FOR UPDATE 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert foundation sentences" 
  ON foundation_sentences FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update foundation sentences" 
  ON foundation_sentences FOR UPDATE 
  USING (auth.role() = 'authenticated');

-- Comments
COMMENT ON TABLE foundation_words IS 'Stores foundation vocabulary words across multiple languages with pre-generated audio';
COMMENT ON TABLE foundation_sentences IS 'Stores example sentences for foundation vocabulary with pre-generated audio';
COMMENT ON COLUMN foundation_words.audio_url IS 'URL to pre-generated OpenAI TTS audio file in Supabase storage';
COMMENT ON COLUMN foundation_sentences.audio_url IS 'URL to pre-generated OpenAI TTS audio file in Supabase storage';
