-- =============================================================================
-- ML Prediction Log — Database Tables
--
-- Stores every prediction input/output for debugging + retraining.
-- All rows are indexed by user_id so they can be purged on GDPR request.
-- =============================================================================

-- ── Prediction log ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ml_prediction_log (
    id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Which ML service produced this prediction
    service         TEXT        NOT NULL,   -- e.g. 'churn', 'dkt', 'rl_router'
    endpoint        TEXT        NOT NULL,   -- e.g. 'pre-session-risk'

    -- Raw inputs fed to the model (features, request payload, etc.)
    inputs          JSONB       NOT NULL DEFAULT '{}',

    -- Raw outputs returned by the model (probabilities, recommendations, etc.)
    outputs         JSONB       NOT NULL DEFAULT '{}',

    -- Model version string (semver or git SHA) — nullable for rule-based fallbacks
    model_version   TEXT,

    -- Wall-clock latency in milliseconds
    latency_ms      INTEGER,

    -- Non-null if the prediction failed (stores the error message)
    error           TEXT,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Indexes ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_ml_pred_log_user_id
    ON public.ml_prediction_log(user_id);

CREATE INDEX IF NOT EXISTS idx_ml_pred_log_created_at
    ON public.ml_prediction_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ml_pred_log_service
    ON public.ml_prediction_log(service);

CREATE INDEX IF NOT EXISTS idx_ml_pred_log_user_service
    ON public.ml_prediction_log(user_id, service, created_at DESC);

-- ── Row-Level Security ─────────────────────────────────────────────────────

ALTER TABLE public.ml_prediction_log ENABLE ROW LEVEL SECURITY;

-- Users can see their own log entries (useful for transparency/data-access requests)
CREATE POLICY "Users can view own prediction logs"
    ON public.ml_prediction_log FOR SELECT
    USING (auth.uid() = user_id);

-- Service role (server-side) can do everything
CREATE POLICY "Service role can manage prediction logs"
    ON public.ml_prediction_log FOR ALL
    USING (auth.role() = 'service_role');

-- ── Retention policy helper ────────────────────────────────────────────────
-- Optional: purge rows older than 90 days to keep the table manageable.
-- Run via pg_cron or a Supabase scheduled function.

CREATE OR REPLACE FUNCTION public.purge_old_ml_prediction_logs(
    p_retention_days INTEGER DEFAULT 90
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    DELETE FROM public.ml_prediction_log
    WHERE created_at < now() - (p_retention_days || ' days')::INTERVAL;

    GET DIAGNOSTICS v_deleted = ROW_COUNT;

    RAISE NOTICE 'Purged % ml_prediction_log rows older than % days',
        v_deleted, p_retention_days;

    RETURN v_deleted;
END;
$$;

COMMENT ON FUNCTION public.purge_old_ml_prediction_logs IS
    'Deletes ml_prediction_log rows older than p_retention_days. '
    'Intended to run nightly via pg_cron.';

-- Example pg_cron schedule (uncomment and adjust if pg_cron is enabled):
-- SELECT cron.schedule(
--     'purge-ml-prediction-logs',
--     '0 1 * * *',   -- 01:00 UTC daily
--     $$ SELECT public.purge_old_ml_prediction_logs(90); $$
-- );
