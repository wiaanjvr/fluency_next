"""
ml.shared.prediction_log — Asynchronous prediction logging to Supabase.

Every prediction endpoint logs inputs + outputs to the ``ml_prediction_log``
table so that:
  1. Debugging is straightforward — you can replay any prediction.
  2. Retraining pipelines can pull labeled/scored examples.
  3. GDPR deletion is simple — purge by user_id.

Usage
-----
from ml.shared.prediction_log import log_prediction

log_prediction(
    service="churn",
    endpoint="pre-session-risk",
    user_id=user_id,
    inputs={"streak": 3, ...},
    outputs={"churn_probability": 0.82, ...},
    model_version="v1.2.0",
    latency_ms=45,
)

Logging is fire-and-forget (spawns a background thread) so it never blocks
the request path.  Failures are logged by loguru but never re-raised.
"""

from __future__ import annotations

import os
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from loguru import logger

# Walk up to lingua_2.0 .env files
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
load_dotenv(_PROJECT_ROOT / ".env.local")
load_dotenv(_PROJECT_ROOT / ".env")

_SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
_SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

# Single background thread — cheap, keeps ordering per process
_executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="ml-pred-log")


def _write_log(
    service: str,
    endpoint: str,
    user_id: str,
    inputs: dict[str, Any],
    outputs: dict[str, Any],
    model_version: str | None,
    latency_ms: int | None,
    error: str | None,
) -> None:
    """Synchronously insert one row into ml_prediction_log.

    This runs inside the background thread, not the request thread.
    """
    if not _SUPABASE_URL or not _SUPABASE_KEY:
        logger.debug("prediction_log: Supabase not configured, skipping log write")
        return
    try:
        from supabase import create_client  # type: ignore[import-untyped]

        client = create_client(_SUPABASE_URL, _SUPABASE_KEY)
        client.table("ml_prediction_log").insert(
            {
                "service": service,
                "endpoint": endpoint,
                "user_id": user_id,
                "inputs": inputs,
                "outputs": outputs,
                "model_version": model_version,
                "latency_ms": latency_ms,
                "error": error,
            }
        ).execute()
    except Exception as exc:
        logger.warning(
            f"prediction_log: failed to write log "
            f"({service}/{endpoint} user={user_id[:8]}…): {exc}"
        )


def log_prediction(
    *,
    service: str,
    endpoint: str,
    user_id: str,
    inputs: dict[str, Any],
    outputs: dict[str, Any],
    model_version: str | None = None,
    latency_ms: int | None = None,
    error: str | None = None,
) -> None:
    """Fire-and-forget prediction log.  Never blocks or raises."""
    _executor.submit(
        _write_log,
        service,
        endpoint,
        user_id,
        inputs,
        outputs,
        model_version,
        latency_ms,
        error,
    )


def delete_user_logs(user_id: str) -> int:
    """Delete all prediction log rows for *user_id* (GDPR erasure).

    Returns the number of rows deleted, or -1 on error.
    """
    if not _SUPABASE_URL or not _SUPABASE_KEY:
        logger.warning("prediction_log: Supabase not configured, skipping GDPR purge")
        return 0
    try:
        from supabase import create_client  # type: ignore[import-untyped]

        client = create_client(_SUPABASE_URL, _SUPABASE_KEY)
        resp = (
            client.table("ml_prediction_log")
            .delete()
            .eq("user_id", user_id)
            .execute()
        )
        n = len(resp.data) if resp.data else 0
        logger.info(
            f"prediction_log GDPR purge user {user_id[:8]}…: {n} row(s) deleted"
        )
        return n
    except Exception as exc:
        logger.error(
            f"prediction_log GDPR purge error for user {user_id}: {exc}"
        )
        return -1


# ── Helper: latency decorator for sync + async route handlers ───────────────

class _TimedPrediction:
    """Context manager that measures wall-clock latency in milliseconds."""

    def __init__(self) -> None:
        self.latency_ms: int = 0
        self._start: float = 0.0

    def __enter__(self) -> "_TimedPrediction":
        self._start = time.perf_counter()
        return self

    def __exit__(self, *_: Any) -> None:
        self.latency_ms = int((time.perf_counter() - self._start) * 1000)


def timed() -> _TimedPrediction:
    """Return a context manager that records elapsed milliseconds.

    Usage::

        with timed() as t:
            result = model.predict(features)

        log_prediction(..., latency_ms=t.latency_ms)
    """
    return _TimedPrediction()
