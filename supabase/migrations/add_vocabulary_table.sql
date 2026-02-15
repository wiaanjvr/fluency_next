-- ============================================
-- VOCABULARY TABLE
-- ============================================
-- Master vocabulary table for storing common words across all languages
-- This replaces the static JSON files (common-french-words.json, etc.)

CREATE TABLE IF NOT EXISTS vocabulary (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Word data
    word TEXT NOT NULL,
    lemma TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'fr' CHECK (language IN ('fr', 'de', 'it', 'es', 'pt')),
    
    -- Linguistic metadata
    part_of_speech TEXT, -- pos: article, verb, noun, etc.
    frequency_rank INTEGER NOT NULL,
    
    -- Optional fields
    translation_en TEXT, -- English translation
    pronunciation TEXT, -- IPA or phonetic
    audio_url TEXT, -- Link to pronunciation audio
    example_sentence TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(word, language, frequency_rank)
);

-- Index for fast lookups by language and rank
CREATE INDEX IF NOT EXISTS idx_vocabulary_language_rank 
    ON vocabulary(language, frequency_rank);

-- Index for word lookups
CREATE INDEX IF NOT EXISTS idx_vocabulary_word_language 
    ON vocabulary(word, language);

-- Index for lemma lookups
CREATE INDEX IF NOT EXISTS idx_vocabulary_lemma_language 
    ON vocabulary(lemma, language);

-- ============================================
-- LEVEL ALLOCATION TABLE
-- ============================================
-- Stores how many words are allocated to each CEFR level per language

CREATE TABLE IF NOT EXISTS vocabulary_level_allocation (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    language TEXT NOT NULL CHECK (language IN ('fr', 'de', 'it', 'es', 'pt')),
    level TEXT NOT NULL CHECK (level IN ('A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
    max_rank INTEGER NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(language, level)
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS
ALTER TABLE vocabulary ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocabulary_level_allocation ENABLE ROW LEVEL SECURITY;

-- Vocabulary is publicly readable
DROP POLICY IF EXISTS "Vocabulary is publicly readable" ON vocabulary;
CREATE POLICY "Vocabulary is publicly readable" ON vocabulary
    FOR SELECT USING (true);

-- Level allocation is publicly readable
DROP POLICY IF EXISTS "Level allocation is publicly readable" ON vocabulary_level_allocation;
CREATE POLICY "Level allocation is publicly readable" ON vocabulary_level_allocation
    FOR SELECT USING (true);

-- Only authenticated users with admin role can insert/update/delete
-- (You can adjust this based on your needs)
DROP POLICY IF EXISTS "Only admins can modify vocabulary" ON vocabulary;
CREATE POLICY "Only admins can modify vocabulary" ON vocabulary
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'admin' OR
        auth.jwt() ->> 'email' IN (SELECT email FROM profiles WHERE id = auth.uid() AND subscription_tier = 'premium')
    );

DROP POLICY IF EXISTS "Only admins can modify level allocations" ON vocabulary_level_allocation;
CREATE POLICY "Only admins can modify level allocations" ON vocabulary_level_allocation
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'admin' OR
        auth.jwt() ->> 'email' IN (SELECT email FROM profiles WHERE id = auth.uid() AND subscription_tier = 'premium')
    );
