-- Migration: Add remaining composite indexes for hot query paths
-- 
-- Complements 20260219100001_add_composite_indexes.sql with indexes
-- that were discovered missing after profiling the lesson/next, 
-- lesson_sessions_v2, and lesson_templates query paths.

-- pre_generated_content: lesson/next queries by (user_id, type, status)
-- then orders by created_at. The existing index (user_id, status, created_at)
-- cannot use the type column efficiently. This composite covers the exact
-- access pattern.
CREATE INDEX IF NOT EXISTS idx_pre_generated_content_user_type_status
    ON public.pre_generated_content(user_id, type, status, created_at ASC);

-- lesson_sessions_v2: queried by user_id on session logging and completion,
-- and for update-mastery stage lookups.
CREATE INDEX IF NOT EXISTS idx_lesson_sessions_v2_user
    ON public.lesson_sessions_v2(user_id, started_at DESC);

-- lesson_templates: the generate route queries by (language, level, topic)
-- but also filters on audio_url IS NOT NULL for cache hits.
-- A partial index pre-filters to only audio-ready templates.
CREATE INDEX IF NOT EXISTS idx_lesson_templates_audio_ready
    ON public.lesson_templates(language, level, topic)
    WHERE audio_url IS NOT NULL;

-- user_daily_usage: claim_session queries by (user_id, usage_date).
-- The table likely has a PK or unique constraint, but if not, this
-- ensures constant-time lookup for the atomic claim function.
CREATE INDEX IF NOT EXISTS idx_user_daily_usage_lookup
    ON public.user_daily_usage(user_id, usage_date);

-- lessons: the generate route fetches recent lessons by user for warmup.
-- The existing idx_lessons_user_completed covers (user_id, completed, completed_at DESC)
-- but the audio-ready polling queries by (id, user_id).
CREATE INDEX IF NOT EXISTS idx_lessons_id_user
    ON public.lessons(id, user_id);
