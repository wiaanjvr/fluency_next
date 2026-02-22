"""
ml.shared.celery_app — Celery application used by ALL Lingua ML training jobs.

Broker + backend: Redis (same instance used for prediction caching).

Workers
-------
Start one worker that handles all retrain tasks:

    celery -A ml.shared.celery_app worker \
        --loglevel=info \
        --concurrency=2 \
        -Q ml-training

Or start the beat scheduler for periodic retraining:

    celery -A ml.shared.celery_app beat --loglevel=info

Cron schedule is defined in CELERYBEAT_SCHEDULE below.
"""

from __future__ import annotations

import os
from pathlib import Path

from celery import Celery
from celery.schedules import crontab
from dotenv import load_dotenv

# Walk up to lingua_2.0 .env files
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
load_dotenv(_PROJECT_ROOT / ".env.local")
load_dotenv(_PROJECT_ROOT / ".env")

_REDIS_URL = os.getenv("ML_REDIS_URL", os.getenv("REDIS_URL", "redis://localhost:6379/0"))

app = Celery(
    "lingua_ml",
    broker=_REDIS_URL,
    backend=_REDIS_URL,
    include=["ml.shared.tasks"],
)

app.conf.update(
    # ── Serialisation ─────────────────────────────────────────────────────
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    # ── Routing ───────────────────────────────────────────────────────────
    task_default_queue="ml-training",
    task_routes={
        "ml.shared.tasks.*": {"queue": "ml-training"},
    },
    # ── Retries ───────────────────────────────────────────────────────────
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    task_max_retries=3,
    # ── Results expire after 24 h ─────────────────────────────────────────
    result_expires=86_400,
    # ── Worker ────────────────────────────────────────────────────────────
    worker_prefetch_multiplier=1,  # training jobs are heavy — one at a time
    # ── Timezone ──────────────────────────────────────────────────────────
    timezone="UTC",
    enable_utc=True,
)

# ── Periodic retrain schedule (celery-beat) ──────────────────────────────────
app.conf.beat_schedule = {
    # ── Churn prediction — daily at 03:00 UTC ─────────────────────────────
    "retrain-churn-daily": {
        "task": "ml.shared.tasks.retrain_churn",
        "schedule": crontab(hour=3, minute=0),
        "options": {"queue": "ml-training"},
    },
    # ── DKT — daily at 02:00 UTC ─────────────────────────────────────────
    "retrain-dkt-daily": {
        "task": "ml.shared.tasks.retrain_dkt",
        "schedule": crontab(hour=2, minute=0),
        "options": {"queue": "ml-training"},
    },
    # ── Cold-start clustering — weekly Sunday 01:00 UTC ───────────────────
    "retrain-cold-start-weekly": {
        "task": "ml.shared.tasks.retrain_cold_start",
        "schedule": crontab(hour=1, minute=0, day_of_week="sunday"),
        "options": {"queue": "ml-training"},
    },
    # ── Complexity predictor — daily at 04:00 UTC ─────────────────────────
    "retrain-complexity-daily": {
        "task": "ml.shared.tasks.retrain_complexity_predictor",
        "schedule": crontab(hour=4, minute=0),
        "options": {"queue": "ml-training"},
    },
    # ── RL Router bandit — daily at 05:00 UTC ────────────────────────────
    "retrain-rl-router-daily": {
        "task": "ml.shared.tasks.retrain_rl_router",
        "schedule": crontab(hour=5, minute=0),
        "options": {"queue": "ml-training"},
    },
}
