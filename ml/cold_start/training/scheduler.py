"""
APScheduler-based retrain scheduler for the Cold Start model.

Runs weekly on the configured day/hour to retrain K-Means on fresh data.
"""

from __future__ import annotations

from apscheduler.schedulers.background import BackgroundScheduler
from loguru import logger

from ..config import settings

_scheduler: BackgroundScheduler | None = None


def _retrain_job() -> None:
    """Scheduled retrain callback."""
    from .trainer import train_cold_start_model

    logger.info("Scheduled cold start retrain triggered")
    try:
        result = train_cold_start_model()
        logger.info(f"Scheduled retrain result: {result.get('status')}")
    except Exception as exc:
        logger.exception(f"Scheduled retrain failed: {exc}")


def start_scheduler() -> None:
    """Start the background retrain scheduler."""
    global _scheduler

    if _scheduler is not None:
        return

    _scheduler = BackgroundScheduler()
    _scheduler.add_job(
        _retrain_job,
        trigger="cron",
        day_of_week=settings.clustering.weekly_retrain_day,
        hour=settings.clustering.retrain_hour,
        minute=0,
        id="cold_start_retrain",
        replace_existing=True,
    )
    _scheduler.start()
    logger.info(
        f"Cold start retrain scheduler started "
        f"(day={settings.clustering.weekly_retrain_day}, "
        f"hour={settings.clustering.retrain_hour}:00 UTC)"
    )


def stop_scheduler() -> None:
    """Stop the background scheduler."""
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
        logger.info("Cold start retrain scheduler stopped")
