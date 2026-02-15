-- ============================================
-- CLEAN DATABASE SCHEMA FOR LINGUA 2.0
-- ============================================
-- This is the ACTUAL schema needed for the current implementation.
-- Run this in Supabase SQL Editor for a fresh setup.
--
-- REMOVED UNUSED TABLES:
-- - comprehension_questions (not used)
-- - user_progress (not used) 
-- - session_logs (not used)
-- - speaking_attempts (not used)
--
-- FIXED INCONSISTENCIES:
-- - Standardized user_words column names
-- - Consolidated all migrations into one coherent schema
-- ============================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. PROFILES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    
    -- Learning settings
    target_language TEXT DEFAULT 'fr' NOT NULL,
    native_language TEXT DEFAULT 'en' NOT NULL,
    proficiency_level TEXT DEFAULT 'A0' CHECK (proficiency_level IN ('A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
    interests TEXT[] DEFAULT '{}',
    
    -- Metrics
    streak INTEGER DEFAULT 0,
    last_lesson_date DATE,
    total_practice_minutes INTEGER DEFAULT 0,
    sessions_completed INTEGER DEFAULT 0,
    
    -- Subscription
    subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium')),
    subscription_expires_at TIMESTAMP WITH TIME ZONE,
    stripe_customer_id TEXT UNIQUE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. USER WORDS TABLE (SRS)
-- ============================================

CREATE TABLE IF NOT EXISTS user_words (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    word TEXT NOT NULL,
    lemma TEXT,
    language TEXT NOT NULL DEFAULT 'fr',
    
    -- SRS fields (SM-2 algorithm)
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'learning', 'known', 'mastered')),
    rating INTEGER DEFAULT 0,
    ease_factor REAL DEFAULT 2.5,
    interval INTEGER DEFAULT 0,
    repetitions INTEGER DEFAULT 0,
    
    -- Review tracking
    next_review TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_reviewed TIMESTAMP WITH TIME ZONE,
    last_rated_at TIMESTAMP WITH TIME ZONE,
    
    -- Context & metadata
    context_sentence TEXT,
    frequency_rank INTEGER,
    part_of_speech TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, word, language)
);

-- ============================================
-- 3. WORD INTERACTIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS word_interactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    word_id UUID NOT NULL REFERENCES user_words(id) ON DELETE CASCADE,
    story_id UUID, -- Can reference generated_stories or lessons
    
    rating INTEGER NOT NULL CHECK (rating >= 0 AND rating <= 5),
    context_sentence TEXT,
    response_time_ms INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4. LESSONS TABLE (Comprehensible Input)
-- ============================================

CREATE TABLE IF NOT EXISTS lessons (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Content
    title TEXT,
    target_text TEXT NOT NULL,
    translation TEXT,
    audio_url TEXT,
    
    -- Metadata
    language TEXT NOT NULL DEFAULT 'fr',
    level TEXT NOT NULL DEFAULT 'A1',
    
    -- Word analysis (stored as JSONB array)
    words JSONB DEFAULT '[]'::jsonb,
    total_words INTEGER DEFAULT 0,
    new_word_count INTEGER DEFAULT 0,
    review_word_count INTEGER DEFAULT 0,
    known_word_count INTEGER DEFAULT 0,
    comprehension_percentage REAL DEFAULT 0,
    
    -- Lesson progress
    current_phase TEXT DEFAULT 'audio-comprehension',
    listen_count INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    
    -- Evaluation data
    initial_comprehension_score INTEGER,
    final_comprehension_score INTEGER,
    conversation_history JSONB DEFAULT '[]'::jsonb,
    vocabulary_ratings JSONB DEFAULT '[]'::jsonb,
    exercise_results JSONB DEFAULT '[]'::jsonb,
    
    -- Generation parameters
    generation_params JSONB,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 5. GENERATED STORIES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS generated_stories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    language TEXT NOT NULL,
    level TEXT NOT NULL,
    
    -- Story metadata
    word_count INTEGER NOT NULL,
    new_words TEXT[] DEFAULT '{}',
    review_words TEXT[] DEFAULT '{}',
    known_words TEXT[] DEFAULT '{}',
    
    -- Audio
    audio_url TEXT,
    
    -- User interaction
    completed BOOLEAN DEFAULT FALSE,
    listened BOOLEAN DEFAULT FALSE,
    read BOOLEAN DEFAULT FALSE,
    
    -- Timing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Generation parameters
    generation_params JSONB DEFAULT '{}'
);

-- ============================================
-- 6. STORY PROGRESS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS story_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    story_id UUID NOT NULL REFERENCES generated_stories(id) ON DELETE CASCADE,
    
    current_phase TEXT DEFAULT 'listen' CHECK (current_phase IN ('listen', 'read', 'interact', 'completed')),
    listen_count INTEGER DEFAULT 0,
    words_rated INTEGER DEFAULT 0,
    
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, story_id)
);

-- ============================================
-- 7. CONTENT SEGMENTS TABLE (Pre-made lessons)
-- ============================================

CREATE TABLE IF NOT EXISTS content_segments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    language TEXT NOT NULL,
    level TEXT NOT NULL CHECK (level IN ('A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
    topic TEXT NOT NULL,
    duration_seconds INTEGER NOT NULL,
    
    audio_url TEXT NOT NULL,
    transcript TEXT NOT NULL,
    translations JSONB DEFAULT '{}',
    
    key_vocabulary TEXT[] DEFAULT '{}',
    grammar_patterns TEXT[] DEFAULT '{}',
    
    -- Vocabulary exercises stored as JSONB
    vocabulary_exercises JSONB DEFAULT '[]'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 8. VOCABULARY EXERCISES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS vocabulary_exercises (
    id TEXT PRIMARY KEY,
    segment_id UUID REFERENCES content_segments(id) ON DELETE CASCADE,
    word TEXT NOT NULL,
    definition TEXT NOT NULL,
    example TEXT,
    options TEXT[] NOT NULL,
    correct_answer INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 9. FOUNDATION LESSONS TABLE (A0 Level)
-- ============================================

CREATE TABLE IF NOT EXISTS foundation_lessons (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL DEFAULT 'foundation-phrase',
    language TEXT NOT NULL DEFAULT 'fr',
    level TEXT NOT NULL DEFAULT 'A0',
    phase TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    phrase_target TEXT NOT NULL,
    phrase_native TEXT NOT NULL,
    audio_url TEXT,
    phonetic TEXT,
    breakdown JSONB DEFAULT '[]'::jsonb,
    usage_context TEXT,
    practice_sentences JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 10. VOCABULARY TABLE (Master word database)
-- ============================================
-- Stores common words across all languages (replaces static JSON files)

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

-- ============================================
-- 11. VOCABULARY LEVEL ALLOCATION TABLE
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
-- INDEXES
-- ============================================

-- Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- User Words
CREATE INDEX IF NOT EXISTS idx_user_words_user_id ON user_words(user_id);
CREATE INDEX IF NOT EXISTS idx_user_words_language ON user_words(language);
CREATE INDEX IF NOT EXISTS idx_user_words_next_review ON user_words(next_review);
CREATE INDEX IF NOT EXISTS idx_user_words_status ON user_words(status);
CREATE INDEX IF NOT EXISTS idx_user_words_lemma ON user_words(lemma);

-- Word Interactions
CREATE INDEX IF NOT EXISTS idx_word_interactions_user_id ON word_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_word_interactions_word_id ON word_interactions(word_id);
CREATE INDEX IF NOT EXISTS idx_word_interactions_created_at ON word_interactions(created_at);

-- Lessons
CREATE INDEX IF NOT EXISTS idx_lessons_user_id ON lessons(user_id);
CREATE INDEX IF NOT EXISTS idx_lessons_completed ON lessons(completed);
CREATE INDEX IF NOT EXISTS idx_lessons_created_at ON lessons(created_at DESC);

-- Generated Stories
CREATE INDEX IF NOT EXISTS idx_generated_stories_user_id ON generated_stories(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_stories_created_at ON generated_stories(created_at);

-- Story Progress
CREATE INDEX IF NOT EXISTS idx_story_progress_user_story ON story_progress(user_id, story_id);

-- Content Segments
CREATE INDEX IF NOT EXISTS idx_content_segments_level ON content_segments(level);
CREATE INDEX IF NOT EXISTS idx_content_segments_topic ON content_segments(topic);

-- Vocabulary Exercises
CREATE INDEX IF NOT EXISTS idx_vocab_exercises_segment_id ON vocabulary_exercises(segment_id);

-- Foundation Lessons
CREATE INDEX IF NOT EXISTS idx_foundation_lessons_level ON foundation_lessons(level);
CREATE INDEX IF NOT EXISTS idx_foundation_lessons_phase ON foundation_lessons(phase);
CREATE INDEX IF NOT EXISTS idx_foundation_lessons_order ON foundation_lessons("order");

-- Vocabulary
CREATE INDEX IF NOT EXISTS idx_vocabulary_language_rank ON vocabulary(language, frequency_rank);
CREATE INDEX IF NOT EXISTS idx_vocabulary_word_language ON vocabulary(word, language);
CREATE INDEX IF NOT EXISTS idx_vocabulary_lemma_language ON vocabulary(lemma, language);

-- Vocabulary Level Allocation
CREATE INDEX IF NOT EXISTS idx_vocab_level_alloc_language ON vocabulary_level_allocation(language);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- User Words
ALTER TABLE user_words ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own words" ON user_words;
DROP POLICY IF EXISTS "Users can create own words" ON user_words;
DROP POLICY IF EXISTS "Users can update own words" ON user_words;

CREATE POLICY "Users can view own words" ON user_words
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own words" ON user_words
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own words" ON user_words
    FOR UPDATE USING (auth.uid() = user_id);

-- Word Interactions
ALTER TABLE word_interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own interactions" ON word_interactions;
DROP POLICY IF EXISTS "Users can insert own interactions" ON word_interactions;

CREATE POLICY "Users can view own interactions" ON word_interactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own interactions" ON word_interactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Lessons
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own lessons" ON lessons;
DROP POLICY IF EXISTS "Users can create own lessons" ON lessons;
DROP POLICY IF EXISTS "Users can update own lessons" ON lessons;

CREATE POLICY "Users can view own lessons" ON lessons
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own lessons" ON lessons
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own lessons" ON lessons
    FOR UPDATE USING (auth.uid() = user_id);

-- Generated Stories
ALTER TABLE generated_stories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own stories" ON generated_stories;
DROP POLICY IF EXISTS "Users can insert own stories" ON generated_stories;
DROP POLICY IF EXISTS "Users can update own stories" ON generated_stories;

CREATE POLICY "Users can view own stories" ON generated_stories
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stories" ON generated_stories
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stories" ON generated_stories
    FOR UPDATE USING (auth.uid() = user_id);

-- Story Progress
ALTER TABLE story_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own story progress" ON story_progress;
DROP POLICY IF EXISTS "Users can insert own story progress" ON story_progress;
DROP POLICY IF EXISTS "Users can update own story progress" ON story_progress;

CREATE POLICY "Users can view own story progress" ON story_progress
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own story progress" ON story_progress
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own story progress" ON story_progress
    FOR UPDATE USING (auth.uid() = user_id);

-- Content Segments (Public read)
ALTER TABLE content_segments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Content is publicly readable" ON content_segments;

CREATE POLICY "Content is publicly readable" ON content_segments
    FOR SELECT TO authenticated USING (true);

-- Vocabulary Exercises (Public read)
ALTER TABLE vocabulary_exercises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Vocabulary exercises are publicly readable" ON vocabulary_exercises;

CREATE POLICY "Vocabulary exercises are publicly readable" ON vocabulary_exercises
    FOR SELECT TO authenticated USING (true);

-- Foundation Lessons (Public read)
ALTER TABLE foundation_lessons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Foundation lessons are publicly readable" ON foundation_lessons;

CREATE POLICY "Foundation lessons are publicly readable" ON foundation_lessons
    FOR SELECT TO authenticated USING (true);

-- Vocabulary (Public read)
ALTER TABLE vocabulary ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Vocabulary is publicly readable" ON vocabulary;

CREATE POLICY "Vocabulary is publicly readable" ON vocabulary
    FOR SELECT USING (true);

-- Vocabulary Level Allocation (Public read)
ALTER TABLE vocabulary_level_allocation ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Level allocation is publicly readable" ON vocabulary_level_allocation;

CREATE POLICY "Level allocation is publicly readable" ON vocabulary_level_allocation
    FOR SELECT USING (true);

-- ============================================
-- TRIGGERS & FUNCTIONS
-- ============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to relevant tables
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_words_updated_at ON user_words;
CREATE TRIGGER update_user_words_updated_at 
    BEFORE UPDATE ON user_words
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_lessons_updated_at ON lessons;
CREATE TRIGGER update_lessons_updated_at 
    BEFORE UPDATE ON lessons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_foundation_lessons_updated_at ON foundation_lessons;
CREATE TRIGGER update_foundation_lessons_updated_at 
    BEFORE UPDATE ON foundation_lessons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- STORAGE BUCKETS
-- ============================================
-- Note: Storage buckets must be created via Supabase Dashboard or Storage API
-- Required buckets:
-- 1. 'avatars' (public)
-- 2. 'recordings' (private)
-- 3. 'lesson-audio' (public)

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify setup:
-- SELECT COUNT(*) FROM profiles;
-- SELECT COUNT(*) FROM user_words;
-- SELECT COUNT(*) FROM lessons;
-- SELECT COUNT(*) FROM generated_stories;
-- SELECT streak, sessions_completed, total_practice_minutes FROM profiles WHERE id = auth.uid();
