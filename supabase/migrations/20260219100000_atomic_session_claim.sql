-- Migration: Replace separate check+increment with atomic claim_session
-- Fixes TOCTOU race: multiple concurrent requests could all pass canStartSession
-- before any of them had incremented the counter.

-- Atomic claim: checks limit AND increments in a single transaction.
-- If the limit is already reached, returns allowed=false without incrementing.
-- If under limit, increments and returns allowed=true.
CREATE OR REPLACE FUNCTION claim_session(
    p_user_id UUID,
    p_session_type TEXT  -- 'foundation', 'sentence', 'microstory', or 'main'
)
RETURNS JSONB AS $$
DECLARE
    v_subscription_tier TEXT;
    v_current_count INTEGER := 0;
    v_limit INTEGER;
    v_column_name TEXT;
BEGIN
    -- Get user's subscription tier
    SELECT subscription_tier INTO v_subscription_tier
    FROM public.profiles
    WHERE id = p_user_id;

    -- Premium users: always allow, still track usage
    IF v_subscription_tier = 'premium' THEN
        INSERT INTO public.user_daily_usage (user_id, usage_date)
        VALUES (p_user_id, CURRENT_DATE)
        ON CONFLICT (user_id, usage_date) DO NOTHING;

        CASE p_session_type
            WHEN 'foundation' THEN
                UPDATE public.user_daily_usage
                SET foundation_sessions = foundation_sessions + 1, updated_at = NOW()
                WHERE user_id = p_user_id AND usage_date = CURRENT_DATE;
            WHEN 'sentence' THEN
                UPDATE public.user_daily_usage
                SET sentence_sessions = sentence_sessions + 1, updated_at = NOW()
                WHERE user_id = p_user_id AND usage_date = CURRENT_DATE;
            WHEN 'microstory' THEN
                UPDATE public.user_daily_usage
                SET microstory_sessions = microstory_sessions + 1, updated_at = NOW()
                WHERE user_id = p_user_id AND usage_date = CURRENT_DATE;
            WHEN 'main' THEN
                UPDATE public.user_daily_usage
                SET main_lessons = main_lessons + 1, updated_at = NOW()
                WHERE user_id = p_user_id AND usage_date = CURRENT_DATE;
        END CASE;

        RETURN jsonb_build_object(
            'allowed', true,
            'is_premium', true,
            'remaining', -1
        );
    END IF;

    -- Free users: set limits
    CASE p_session_type
        WHEN 'foundation' THEN v_limit := 5; v_column_name := 'foundation_sessions';
        WHEN 'sentence'   THEN v_limit := 3; v_column_name := 'sentence_sessions';
        WHEN 'microstory'  THEN v_limit := 1; v_column_name := 'microstory_sessions';
        WHEN 'main'        THEN v_limit := 1; v_column_name := 'main_lessons';
        ELSE RAISE EXCEPTION 'Invalid session type: %', p_session_type;
    END CASE;

    -- Ensure today's row exists
    INSERT INTO public.user_daily_usage (user_id, usage_date)
    VALUES (p_user_id, CURRENT_DATE)
    ON CONFLICT (user_id, usage_date) DO NOTHING;

    -- Atomic check-and-increment: only increment if under the limit.
    -- The WHERE clause ensures we never exceed the limit even under concurrency.
    EXECUTE format(
        'UPDATE public.user_daily_usage
         SET %I = %I + 1, updated_at = NOW()
         WHERE user_id = $1
           AND usage_date = CURRENT_DATE
           AND %I < $2
         RETURNING %I',
        v_column_name, v_column_name, v_column_name, v_column_name
    ) INTO v_current_count USING p_user_id, v_limit;

    -- If v_current_count IS NULL, the WHERE clause didn't match → limit reached
    IF v_current_count IS NULL THEN
        -- Fetch current count for the response
        EXECUTE format(
            'SELECT COALESCE(%I, 0) FROM public.user_daily_usage WHERE user_id = $1 AND usage_date = CURRENT_DATE',
            v_column_name
        ) INTO v_current_count USING p_user_id;

        RETURN jsonb_build_object(
            'allowed', false,
            'limit_reached', true,
            'current_count', COALESCE(v_current_count, 0),
            'limit', v_limit,
            'remaining', 0,
            'session_type', p_session_type
        );
    END IF;

    -- Success: v_current_count is the NEW count after increment
    RETURN jsonb_build_object(
        'allowed', true,
        'limit_reached', false,
        'current_count', v_current_count,
        'limit', v_limit,
        'remaining', v_limit - v_current_count,
        'session_type', p_session_type
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute
GRANT EXECUTE ON FUNCTION claim_session(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION claim_session IS 'Atomic check-and-increment for session limits. Prevents TOCTOU race conditions.';
