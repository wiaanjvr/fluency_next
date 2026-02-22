-- =============================================================================
-- RL MODULE ROUTER — Database Tables
--
-- Stores routing decisions, reward observations, and the grammar mastery
-- summary function needed by the state assembler.
-- =============================================================================

-- ── Routing Decisions ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.routing_decisions (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    recommended_module TEXT NOT NULL,
    target_word_ids TEXT[] DEFAULT '{}',
    target_concept  TEXT,
    reason          TEXT NOT NULL DEFAULT '',
    confidence      REAL NOT NULL DEFAULT 0.0,
    state_snapshot  JSONB DEFAULT '{}',
    algorithm_used  TEXT NOT NULL DEFAULT 'cold_start',
    followed        BOOLEAN,          -- did the user follow the recommendation?
    session_id      UUID,             -- session that followed (if any)
    created_at      TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes for routing_decisions
CREATE INDEX IF NOT EXISTS idx_routing_decisions_user_id
    ON public.routing_decisions(user_id);
CREATE INDEX IF NOT EXISTS idx_routing_decisions_created_at
    ON public.routing_decisions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_routing_decisions_user_time
    ON public.routing_decisions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_routing_decisions_algorithm
    ON public.routing_decisions(algorithm_used);

-- RLS
ALTER TABLE public.routing_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own routing decisions"
    ON public.routing_decisions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage routing decisions"
    ON public.routing_decisions FOR ALL
    USING (auth.role() = 'service_role');


-- ── Routing Rewards ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.routing_rewards (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    decision_id     UUID NOT NULL REFERENCES public.routing_decisions(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reward          REAL NOT NULL DEFAULT 0.0,
    reward_components JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes for routing_rewards
CREATE INDEX IF NOT EXISTS idx_routing_rewards_decision_id
    ON public.routing_rewards(decision_id);
CREATE INDEX IF NOT EXISTS idx_routing_rewards_user_id
    ON public.routing_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_routing_rewards_created_at
    ON public.routing_rewards(created_at DESC);

-- RLS
ALTER TABLE public.routing_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own routing rewards"
    ON public.routing_rewards FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage routing rewards"
    ON public.routing_rewards FOR ALL
    USING (auth.role() = 'service_role');


-- ── Grammar Mastery Summary Function ───────────────────────────────────────
-- Used by the state assembler to get per-concept mastery scores

CREATE OR REPLACE FUNCTION public.get_grammar_mastery_summary(
    p_user_id UUID
)
RETURNS TABLE (
    concept_tag   TEXT,
    grammar_tag   TEXT,
    mastery_score REAL,
    total_attempts INTEGER,
    correct_attempts INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    -- Aggregate user_exercise_attempts per grammar subtopic
    -- to compute mastery scores
    -- Join chain: attempts → exercises → lessons → subtopics
    WITH attempt_stats AS (
        SELECT
            gs.slug AS concept_tag,
            gs.slug AS grammar_tag,
            COUNT(*)::INTEGER AS total_attempts,
            COUNT(*) FILTER (WHERE uea.was_correct)::INTEGER AS correct_attempts
        FROM public.user_exercise_attempts uea
        JOIN public.grammar_exercises ge ON ge.id = uea.exercise_id
        JOIN public.grammar_lessons gl ON gl.id = ge.lesson_id
        JOIN public.grammar_subtopics gs ON gs.id = gl.subtopic_id
        WHERE uea.user_id = p_user_id
        GROUP BY gs.slug
    )
    SELECT
        concept_tag,
        grammar_tag,
        CASE
            WHEN total_attempts > 0
            THEN (correct_attempts::REAL / total_attempts::REAL)
            ELSE 0.0
        END AS mastery_score,
        total_attempts,
        correct_attempts
    FROM attempt_stats
    ORDER BY mastery_score ASC;
$$;


-- ── DKT Concept Mastery Approximation Function ────────────────────────────
-- Falls back to interaction_events when the DKT service isn't available

CREATE OR REPLACE FUNCTION public.get_dkt_concept_mastery(
    p_user_id UUID
)
RETURNS TABLE (
    word_id TEXT,
    p_recall REAL
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    WITH recent_events AS (
        SELECT
            ie.word_id::TEXT AS word_id,
            ie.correct,
            ROW_NUMBER() OVER (
                PARTITION BY ie.word_id
                ORDER BY ie.created_at DESC
            ) AS rn
        FROM public.interaction_events ie
        WHERE ie.user_id = p_user_id
          AND ie.word_id IS NOT NULL
          AND ie.created_at > now() - INTERVAL '30 days'
    ),
    word_stats AS (
        SELECT
            word_id,
            COUNT(*)::INTEGER AS total,
            COUNT(*) FILTER (WHERE correct)::INTEGER AS correct_count
        FROM recent_events
        WHERE rn <= 20  -- only consider last 20 events per word
        GROUP BY word_id
    )
    SELECT
        word_id,
        CASE
            WHEN total > 0
            THEN (correct_count::REAL / total::REAL)
            ELSE 0.5
        END AS p_recall
    FROM word_stats;
$$;


-- ── Routing Analytics View ─────────────────────────────────────────────────
-- Aggregated view for monitoring routing performance

CREATE OR REPLACE VIEW public.routing_analytics AS
SELECT
    rd.algorithm_used,
    rd.recommended_module,
    COUNT(*) AS total_decisions,
    AVG(rd.confidence) AS avg_confidence,
    AVG(rr.reward) AS avg_reward,
    COUNT(rr.id) AS rewarded_decisions,
    COUNT(*) FILTER (WHERE rd.followed = true) AS followed_count,
    MIN(rd.created_at) AS first_decision_at,
    MAX(rd.created_at) AS last_decision_at
FROM public.routing_decisions rd
LEFT JOIN public.routing_rewards rr ON rr.decision_id = rd.id
GROUP BY rd.algorithm_used, rd.recommended_module
ORDER BY rd.algorithm_used, total_decisions DESC;
