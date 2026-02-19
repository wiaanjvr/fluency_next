-- Migration: Add missing composite indexes for hot query paths
-- Without these, RLS-filtered queries on user_words, lessons, learner_words_v2,
-- and lesson_templates degrade to sequential scans as tables grow.

-- user_words: queried by (user_id, language) on every lesson generate + evaluate
CREATE INDEX IF NOT EXISTS idx_user_words_user_lang
    ON public.user_words(user_id, language);

-- lessons: queried for recent completed lessons during warmup phase selection
CREATE INDEX IF NOT EXISTS idx_lessons_user_completed
    ON public.lessons(user_id, completed, completed_at DESC);

-- learner_words_v2: queried by user_id ordered by frequency_rank on every story gen
CREATE INDEX IF NOT EXISTS idx_learner_words_v2_user_freq
    ON public.learner_words_v2(user_id, frequency_rank ASC);

-- learner_words_v2: queried for mastery count per user
CREATE INDEX IF NOT EXISTS idx_learner_words_v2_user_status
    ON public.learner_words_v2(user_id, status);

-- lesson_templates: queried by (language, level, topic) for template cache lookups
CREATE INDEX IF NOT EXISTS idx_lesson_templates_lookup
    ON public.lesson_templates(language, level, topic);

-- Postgres function to count mastered words efficiently via index-only scan.
-- Replaces the pattern of SELECT * + client-side .filter() in update-mastery.
CREATE OR REPLACE FUNCTION get_mastery_count(p_user_id UUID)
RETURNS INTEGER AS $$
    SELECT COUNT(*)::INTEGER
    FROM public.learner_words_v2
    WHERE user_id = p_user_id AND status = 'mastered';
$$ LANGUAGE sql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_mastery_count(UUID) TO authenticated;

COMMENT ON FUNCTION get_mastery_count IS 'Returns count of mastered words for a user. Uses index-only scan on (user_id, status).';
