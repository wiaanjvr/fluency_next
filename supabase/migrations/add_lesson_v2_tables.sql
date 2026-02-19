-- ============================================
-- LESSON V2 MIGRATION
-- New tables for the overhauled lesson system
-- ============================================

-- ============================================
-- 1. LEARNER WORDS V2
-- Tracks every word a learner has been introduced to,
-- with mastery status and recall statistics.
-- ============================================

CREATE TABLE IF NOT EXISTS learner_words_v2 (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Word identity
    word TEXT NOT NULL,          -- surface form
    lemma TEXT NOT NULL,         -- dictionary form (used for deduplication)
    translation TEXT NOT NULL,   -- English translation
    part_of_speech TEXT,         -- verb, noun, adjective, etc.
    frequency_rank INTEGER,      -- position in frequency corpus

    -- Mastery tracking
    status TEXT NOT NULL DEFAULT 'introduced'
        CHECK (status IN ('introduced', 'learning', 'mastered')),
    introduced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_reviewed_at TIMESTAMPTZ,
    correct_streak INTEGER NOT NULL DEFAULT 0,
    total_reviews INTEGER NOT NULL DEFAULT 0,
    total_correct INTEGER NOT NULL DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- One row per user+lemma
    CONSTRAINT learner_words_v2_user_lemma_unique UNIQUE (user_id, lemma)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_learner_words_v2_user_id
    ON learner_words_v2(user_id);
CREATE INDEX IF NOT EXISTS idx_learner_words_v2_user_status
    ON learner_words_v2(user_id, status);
CREATE INDEX IF NOT EXISTS idx_learner_words_v2_user_freq
    ON learner_words_v2(user_id, frequency_rank);

-- RLS
ALTER TABLE learner_words_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own words"
    ON learner_words_v2
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own words"
    ON learner_words_v2
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own words"
    ON learner_words_v2
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_learner_words_v2_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_learner_words_v2_updated_at
    BEFORE UPDATE ON learner_words_v2
    FOR EACH ROW
    EXECUTE FUNCTION update_learner_words_v2_updated_at();


-- ============================================
-- 2. LESSON SESSIONS V2
-- Logs each lesson session (Phase 1 + Phase 2 + exercise).
-- ============================================

CREATE TABLE IF NOT EXISTS lesson_sessions_v2 (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Session phases
    phase TEXT NOT NULL DEFAULT 'word-introduction'
        CHECK (phase IN ('word-introduction', 'story-lesson', 'exercise', 'complete')),

    -- Phase 1 data
    words_introduced JSONB DEFAULT '[]'::jsonb,   -- array of word objects
    guesses JSONB DEFAULT '{}'::jsonb,             -- { word: guess }

    -- Phase 2 data
    story_data JSONB,           -- full GeneratedStory JSON
    exercise_data JSONB,        -- full LessonExercise JSON
    exercise_response TEXT,     -- learner's exercise answer
    exercise_correct BOOLEAN,   -- whether the exercise was answered correctly

    -- Context
    interest_theme TEXT,
    tone TEXT CHECK (tone IS NULL OR tone IN ('curiosity', 'humor', 'mild-tension', 'warmth')),
    mastery_count INTEGER NOT NULL DEFAULT 0,
    stage TEXT,                 -- stage-1 through stage-5

    -- Timestamps
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lesson_sessions_v2_user_id
    ON lesson_sessions_v2(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_sessions_v2_user_started
    ON lesson_sessions_v2(user_id, started_at DESC);

-- RLS
ALTER TABLE lesson_sessions_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own sessions"
    ON lesson_sessions_v2
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
    ON lesson_sessions_v2
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
    ON lesson_sessions_v2
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
