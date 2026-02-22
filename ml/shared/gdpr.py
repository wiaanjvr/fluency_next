"""
ml.shared.gdpr — GDPR / POPIA right-to-erasure for ML data.

Exposes a single ``delete_user_ml_data(user_id)`` function that:

  1. Flushes all Redis prediction-cache keys for the user.
  2. Deletes all rows in ``ml_prediction_log``.
  3. Deletes ML-specific Supabase tables:
       - routing_decisions  (routing_rewards cascades automatically)
       - churn_predictions
       - abandonment_snapshots
       - rescue_interventions
       - cluster_assignments
       - cognitive_load_sessions
       - cognitive_load_events
  4. Resets the user to "cold start" status (deactivates cluster assignment).

Called from DELETE /ml/user/:userId in the gateway service.

Supabase RLS is bypassed via the service-role key — this is intentional
because the calling service is already authenticated as a service account.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from loguru import logger

from .cache import prediction_cache
from .prediction_log import delete_user_logs

# Walk up to lingua_2.0 .env files
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
load_dotenv(_PROJECT_ROOT / ".env.local")
load_dotenv(_PROJECT_ROOT / ".env")

_SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
_SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

# Supabase tables to purge on user deletion — order matters for FK safety
# Tables without explicit ON DELETE CASCADE on user_id must be listed first.
_SUPABASE_TABLES: list[str] = [
    # ── RL Router ─────────────────────────────────────────────────────────
    "routing_rewards",         # FK → routing_decisions (cascade deletes this anyway,
    "routing_decisions",       #   but explicit delete avoids constraint timing issues)
    # ── Churn prediction ──────────────────────────────────────────────────
    "churn_predictions",
    "abandonment_snapshots",
    "rescue_interventions",
    # ── Cold start ────────────────────────────────────────────────────────
    "cluster_assignments",
    # ── Cognitive load ────────────────────────────────────────────────────
    "cognitive_load_events",
    "cognitive_load_sessions",
    # ── Prediction log (also deleted via prediction_log.delete_user_logs) ─
    "ml_prediction_log",
]


def _get_supabase_client() -> Any:
    if not _SUPABASE_URL or not _SUPABASE_KEY:
        raise RuntimeError(
            "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set."
        )
    from supabase import create_client  # type: ignore[import-untyped]
    return create_client(_SUPABASE_URL, _SUPABASE_KEY)


def delete_user_ml_data(user_id: str) -> dict[str, Any]:
    """Permanently remove all ML training data & cache for *user_id*.

    Returns a summary dict suitable for sending back to the caller.
    Partial success is possible — the summary indicates which steps
    succeeded and which failed.
    """
    summary: dict[str, Any] = {
        "user_id": user_id,
        "cache_keys_deleted": 0,
        "prediction_log_rows_deleted": 0,
        "supabase_tables": {},
        "errors": [],
    }

    # ── Step 1: Redis cache flush ────────────────────────────────────────
    try:
        n = prediction_cache.invalidate_user(user_id)
        summary["cache_keys_deleted"] = n
        logger.info(f"GDPR: cache purge for {user_id[:8]}…: {n} key(s)")
    except Exception as exc:
        msg = f"cache purge failed: {exc}"
        logger.error(f"GDPR: {msg}")
        summary["errors"].append(msg)

    # ── Step 2: ml_prediction_log ────────────────────────────────────────
    try:
        n = delete_user_logs(user_id)
        summary["prediction_log_rows_deleted"] = n
    except Exception as exc:
        msg = f"prediction_log delete failed: {exc}"
        logger.error(f"GDPR: {msg}")
        summary["errors"].append(msg)

    # ── Step 3: Supabase ML tables ───────────────────────────────────────
    try:
        client = _get_supabase_client()
    except RuntimeError as exc:
        msg = f"Supabase client unavailable: {exc}"
        logger.error(f"GDPR: {msg}")
        summary["errors"].append(msg)
        return summary

    for table in _SUPABASE_TABLES:
        try:
            resp = (
                client.table(table)
                .delete()
                .eq("user_id", user_id)
                .execute()
            )
            n = len(resp.data) if resp.data else 0
            summary["supabase_tables"][table] = n
            logger.info(f"GDPR: deleted {n} row(s) from {table} for {user_id[:8]}…")
        except Exception as exc:
            msg = f"{table}: {exc}"
            logger.warning(f"GDPR: table delete error — {msg}")
            summary["supabase_tables"][table] = f"error: {exc}"
            summary["errors"].append(msg)

    summary["success"] = len(summary["errors"]) == 0
    return summary
