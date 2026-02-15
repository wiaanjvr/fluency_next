-- Migration: Add daily usage limits tracking for Free users
-- This table tracks daily usage of different lesson types to enforce free tier limits

-- Create user_daily_usage table
CREATE TABLE IF NOT EXISTS public.user_daily_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Usage date (UTC)
    usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Count of completed sessions by type
    foundation_sessions INTEGER DEFAULT 0,
    sentence_sessions INTEGER DEFAULT 0,
    microstory_sessions INTEGER DEFAULT 0,
    main_lessons INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- One record per user per day
    UNIQUE(user_id, usage_date)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_daily_usage_user_date 
    ON public.user_daily_usage(user_id, usage_date);

-- Enable Row Level Security
ALTER TABLE public.user_daily_usage ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own usage
CREATE POLICY "Users can read own usage"
    ON public.user_daily_usage
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own usage (via app)
CREATE POLICY "Users can insert own usage"
    ON public.user_daily_usage
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own usage
CREATE POLICY "Users can update own usage"
    ON public.user_daily_usage
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Function: Get current usage for a user (today)
CREATE OR REPLACE FUNCTION get_today_usage(p_user_id UUID)
RETURNS TABLE (
    foundation_sessions INTEGER,
    sentence_sessions INTEGER,
    microstory_sessions INTEGER,
    main_lessons INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(u.foundation_sessions, 0),
        COALESCE(u.sentence_sessions, 0),
        COALESCE(u.microstory_sessions, 0),
        COALESCE(u.main_lessons, 0)
    FROM public.user_daily_usage u
    WHERE u.user_id = p_user_id 
      AND u.usage_date = CURRENT_DATE
    LIMIT 1;
    
    -- If no record exists for today, return zeros
    IF NOT FOUND THEN
        RETURN QUERY SELECT 0, 0, 0, 0;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Increment session count (with limit checking for free users)
CREATE OR REPLACE FUNCTION increment_session_count(
    p_user_id UUID,
    p_session_type TEXT  -- 'foundation', 'sentence', 'microstory', or 'main'
)
RETURNS JSONB AS $$
DECLARE
    v_subscription_tier TEXT;
    v_current_count INTEGER := 0;
    v_limit INTEGER;
    v_column_name TEXT;
    v_result JSONB;
BEGIN
    -- Get user's subscription tier
    SELECT subscription_tier INTO v_subscription_tier
    FROM public.profiles
    WHERE id = p_user_id;
    
    -- Premium users have no limits
    IF v_subscription_tier = 'premium' THEN
        -- Still track usage, just don't enforce limits
        INSERT INTO public.user_daily_usage (user_id, usage_date)
        VALUES (p_user_id, CURRENT_DATE)
        ON CONFLICT (user_id, usage_date) DO NOTHING;
        
        -- Increment the appropriate counter
        CASE p_session_type
            WHEN 'foundation' THEN
                UPDATE public.user_daily_usage
                SET foundation_sessions = foundation_sessions + 1,
                    updated_at = NOW()
                WHERE user_id = p_user_id AND usage_date = CURRENT_DATE;
            WHEN 'sentence' THEN
                UPDATE public.user_daily_usage
                SET sentence_sessions = sentence_sessions + 1,
                    updated_at = NOW()
                WHERE user_id = p_user_id AND usage_date = CURRENT_DATE;
            WHEN 'microstory' THEN
                UPDATE public.user_daily_usage
                SET microstory_sessions = microstory_sessions + 1,
                    updated_at = NOW()
                WHERE user_id = p_user_id AND usage_date = CURRENT_DATE;
            WHEN 'main' THEN
                UPDATE public.user_daily_usage
                SET main_lessons = main_lessons + 1,
                    updated_at = NOW()
                WHERE user_id = p_user_id AND usage_date = CURRENT_DATE;
        END CASE;
        
        RETURN jsonb_build_object('allowed', true, 'is_premium', true);
    END IF;
    
    -- Free users: Check limits
    -- Set limits based on session type
    CASE p_session_type
        WHEN 'foundation' THEN
            v_limit := 5;
            v_column_name := 'foundation_sessions';
        WHEN 'sentence' THEN
            v_limit := 3;
            v_column_name := 'sentence_sessions';
        WHEN 'microstory' THEN
            v_limit := 1;
            v_column_name := 'microstory_sessions';
        WHEN 'main' THEN
            v_limit := 1;
            v_column_name := 'main_lessons';
        ELSE
            RAISE EXCEPTION 'Invalid session type: %', p_session_type;
    END CASE;
    
    -- Get current count for today
    EXECUTE format('SELECT COALESCE(%I, 0) FROM public.user_daily_usage WHERE user_id = $1 AND usage_date = CURRENT_DATE', v_column_name)
    INTO v_current_count
    USING p_user_id;
    
    -- Check if limit is reached
    IF v_current_count >= v_limit THEN
        RETURN jsonb_build_object(
            'allowed', false, 
            'limit_reached', true,
            'current_count', v_current_count,
            'limit', v_limit,
            'session_type', p_session_type
        );
    END IF;
    
    -- Create or update today's usage record
    INSERT INTO public.user_daily_usage (user_id, usage_date)
    VALUES (p_user_id, CURRENT_DATE)
    ON CONFLICT (user_id, usage_date) DO NOTHING;
    
    -- Increment the counter
    EXECUTE format('UPDATE public.user_daily_usage SET %I = %I + 1, updated_at = NOW() WHERE user_id = $1 AND usage_date = CURRENT_DATE', v_column_name, v_column_name)
    USING p_user_id;
    
    RETURN jsonb_build_object(
        'allowed', true, 
        'limit_reached', false,
        'current_count', v_current_count + 1,
        'limit', v_limit,
        'session_type', p_session_type
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if user can start a new session (without incrementing)
CREATE OR REPLACE FUNCTION can_start_session(
    p_user_id UUID,
    p_session_type TEXT
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
    
    -- Premium users have no limits
    IF v_subscription_tier = 'premium' THEN
        RETURN jsonb_build_object(
            'allowed', true, 
            'is_premium', true,
            'remaining', -1  -- -1 indicates unlimited
        );
    END IF;
    
    -- Set limits based on session type
    CASE p_session_type
        WHEN 'foundation' THEN
            v_limit := 5;
            v_column_name := 'foundation_sessions';
        WHEN 'sentence' THEN
            v_limit := 3;
            v_column_name := 'sentence_sessions';
        WHEN 'microstory' THEN
            v_limit := 1;
            v_column_name := 'microstory_sessions';
        WHEN 'main' THEN
            v_limit := 1;
            v_column_name := 'main_lessons';
        ELSE
            RAISE EXCEPTION 'Invalid session type: %', p_session_type;
    END CASE;
    
    -- Get current count for today
    EXECUTE format('SELECT COALESCE(%I, 0) FROM public.user_daily_usage WHERE user_id = $1 AND usage_date = CURRENT_DATE', v_column_name)
    INTO v_current_count
    USING p_user_id;
    
    -- If no count found, user hasn't used any today
    IF v_current_count IS NULL THEN
        v_current_count := 0;
    END IF;
    
    -- Check if limit is reached
    IF v_current_count >= v_limit THEN
        RETURN jsonb_build_object(
            'allowed', false, 
            'limit_reached', true,
            'current_count', v_current_count,
            'limit', v_limit,
            'remaining', 0,
            'session_type', p_session_type
        );
    END IF;
    
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_today_usage(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_session_count(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION can_start_session(UUID, TEXT) TO authenticated;

-- Comments
COMMENT ON TABLE user_daily_usage IS 'Tracks daily usage limits for free tier users';
COMMENT ON FUNCTION increment_session_count IS 'Increments session count and enforces free tier limits';
COMMENT ON FUNCTION can_start_session IS 'Checks if user can start a new session without incrementing counter';
COMMENT ON FUNCTION get_today_usage IS 'Gets current usage counts for today';
