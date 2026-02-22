"""
ml.shared.tasks — Celery training tasks for all Lingua ML services.

Each task:
  - Runs in a background worker (never on the request path)
  - Loads fresh training data from Supabase
  - Trains / fine-tunes the model
  - Saves the new serialised artefact
  - Reloads the in-process predictor when the service is co-located
  - Has a sensible retry policy (3 attempts, 60 s backoff)

All tasks return a result dict that Celery stores in Redis for 24 h.
"""

from __future__ import annotations

import time
from typing import Any

from celery import Task
from celery.exceptions import MaxRetriesExceededError
from celery.utils.log import get_task_logger
from loguru import logger as loguru_logger

from .cache import prediction_cache
from .celery_app import app

_log = get_task_logger(__name__)

# Map task short-names → cache service keys used in PredictionCache key patterns.
# After a retrain the model weights change, so cached predictions are stale.
_TASK_SERVICE_MAP: dict[str, str] = {
    "retrain_churn": "churn",
    "retrain_dkt": "dkt",
    "retrain_cold_start": "cold_start",
    "retrain_complexity_predictor": "complexity",
    "retrain_rl_router": "rl_router",
}


def _flush_service_cache(service: str) -> None:
    """Delete all Redis keys that belong to *service*."""
    try:
        r = prediction_cache._redis()  # may return None if Redis is down
        if r is None:
            return
        pattern = f"ml:pred:{service}:*"
        cursor = 0
        deleted = 0
        while True:
            cursor, keys = r.scan(cursor, match=pattern, count=500)
            if keys:
                r.delete(*keys)
                deleted += len(keys)
            if cursor == 0:
                break
        loguru_logger.info(f"Cache flush after retrain: deleted {deleted} keys for service='{service}'")
    except Exception as exc:
        loguru_logger.warning(f"Cache flush for service='{service}' failed (non-fatal): {exc}")


class _MLTrainTask(Task):
    """Base task with three-attempt exponential back-off."""

    abstract = True
    max_retries = 3
    default_retry_delay = 60  # seconds; doubled each retry by _run_with_retry

    def on_failure(self, exc: Exception, task_id: str, args: Any, kwargs: Any, einfo: Any) -> None:  # type: ignore[override]
        loguru_logger.error(f"ML training task {self.name} FAILED (task_id={task_id}): {exc}")

    def on_success(self, retval: Any, task_id: str, args: Any, kwargs: Any) -> None:  # type: ignore[override]
        loguru_logger.info(f"ML training task {self.name} succeeded (task_id={task_id}): {retval}")
        # Flush stale cached predictions for the newly-retrained service
        short_name = self.name.rsplit(".", 1)[-1]  # e.g. "retrain_churn"
        service = _TASK_SERVICE_MAP.get(short_name)
        if service:
            _flush_service_cache(service)


def _run_with_retry(task: Task, fn: Any, *args: Any, **kwargs: Any) -> dict[str, Any]:
    """Execute *fn* inside the task; retry on transient failure."""
    try:
        return fn(*args, **kwargs)  # type: ignore[no-any-return]
    except Exception as exc:
        retries = task.request.retries
        countdown = 60 * (2 ** retries)  # 60s, 120s, 240s
        loguru_logger.warning(
            f"{task.name}: attempt {retries + 1} failed: {exc}. "
            f"Retrying in {countdown}s…"
        )
        try:
            raise task.retry(exc=exc, countdown=countdown)
        except MaxRetriesExceededError:
            loguru_logger.error(f"{task.name}: all retries exhausted.")
            return {"status": "error", "error": str(exc)}


# ── Churn Prediction ────────────────────────────────────────────────────────


@app.task(base=_MLTrainTask, name="ml.shared.tasks.retrain_churn", bind=True)
def retrain_churn(self: Task, train_pre_session: bool = True, train_mid_session: bool = True) -> dict[str, Any]:  # type: ignore[override]
    """Retrain churn pre-session and/or mid-session classifiers."""

    def _train() -> dict[str, Any]:
        from ml.churn_prediction.training.trainer import train_churn_models

        _log.info(
            f"retrain_churn starting "
            f"(pre={train_pre_session}, mid={train_mid_session})"
        )
        result = train_churn_models(
            train_pre_session=train_pre_session,
            train_mid_session=train_mid_session,
        )
        result["task"] = "retrain_churn"
        return result

    return _run_with_retry(self, _train)


# ── DKT ─────────────────────────────────────────────────────────────────────


@app.task(base=_MLTrainTask, name="ml.shared.tasks.retrain_dkt", bind=True)
def retrain_dkt(self: Task, mode: str = "full", finetune_days: int = 7) -> dict[str, Any]:  # type: ignore[override]
    """Train (full) or fine-tune the DKT model."""

    def _train() -> dict[str, Any]:
        if mode == "finetune":
            from ml.dkt.training.trainer import finetune_dkt

            _log.info(f"retrain_dkt fine-tune (days={finetune_days})")
            result = finetune_dkt(days=finetune_days)
        else:
            from ml.dkt.training.trainer import train_dkt

            _log.info("retrain_dkt full train")
            result = train_dkt()

        # Reload live predictor if it's in-process
        try:
            from ml.dkt.inference.predictor import predictor

            predictor.load()
            _log.info("DKT predictor reloaded after training")
        except Exception as e:
            _log.warning(f"DKT predictor reload skipped: {e}")

        result["task"] = "retrain_dkt"
        return result

    return _run_with_retry(self, _train)


# ── Cold Start ───────────────────────────────────────────────────────────────


@app.task(base=_MLTrainTask, name="ml.shared.tasks.retrain_cold_start", bind=True)
def retrain_cold_start(self: Task) -> dict[str, Any]:  # type: ignore[override]
    """Retrain the cold-start clustering model."""

    def _train() -> dict[str, Any]:
        from ml.cold_start.training.trainer import train_clustering_model

        _log.info("retrain_cold_start starting")
        result = train_clustering_model()

        try:
            from ml.cold_start.model.clustering import cluster_model

            cluster_model.load()
            _log.info("Cold-start model reloaded after training")
        except Exception as e:
            _log.warning(f"Cold-start model reload skipped: {e}")

        result["task"] = "retrain_cold_start"
        return result

    return _run_with_retry(self, _train)


# ── Complexity Predictor ─────────────────────────────────────────────────────


@app.task(base=_MLTrainTask, name="ml.shared.tasks.retrain_complexity_predictor", bind=True)
def retrain_complexity_predictor(self: Task) -> dict[str, Any]:  # type: ignore[override]
    """Retrain the session complexity predictor."""

    def _train() -> dict[str, Any]:
        from ml.complexity_predictor.training.trainer import train_complexity_predictor

        _log.info("retrain_complexity_predictor starting")
        result = train_complexity_predictor()

        try:
            from ml.complexity_predictor.inference.predictor import predictor

            predictor.load()
            _log.info("Complexity predictor reloaded after training")
        except Exception as e:
            _log.warning(f"Complexity predictor reload skipped: {e}")

        result["task"] = "retrain_complexity_predictor"
        return result

    return _run_with_retry(self, _train)


# ── RL Router ─────────────────────────────────────────────────────────────────


@app.task(base=_MLTrainTask, name="ml.shared.tasks.retrain_rl_router", bind=True)
def retrain_rl_router(self: Task, algorithm: str = "auto", force: bool = False) -> dict[str, Any]:  # type: ignore[override]
    """Retrain the RL module router (bandit or PPO)."""

    def _train() -> dict[str, Any]:
        from ml.rl_router.training.trainer import train_router_model

        _log.info(f"retrain_rl_router starting (algorithm={algorithm}, force={force})")
        result = train_router_model(algorithm=algorithm, force=force)
        result["task"] = "retrain_rl_router"
        return result

    return _run_with_retry(self, _train)
