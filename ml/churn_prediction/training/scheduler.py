"""
APScheduler-based retrain scheduler for the Churn Prediction models.

Runs daily at the configured hour to retrain both classifiers on fresh data.
"""

from __future__ import annotations

from apscheduler.schedulers.background import BackgroundScheduler
from loguru import logger

from ..config import settings

_scheduler: BackgroundScheduler | None = None


def _retrain_job() -> None:
    """Scheduled retrain callback."""
    from .trainer import train_churn_models

    logger.info("Scheduled churn model retrain triggered")
    try:
        result = train_churn_models(
            train_pre_session=True,
            train_mid_session=True,
        )
        logger.info(
            f"Scheduled retrain result: "
            f"pre_session={result.get('pre_session', {}).get('status')}, "
            f"mid_session={result.get('mid_session', {}).get('status')}"
        )
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
        hour=settings.pre_session.daily_retrain_hour,
        minute=0,
        id="churn_prediction_retrain",
        replace_existing=True,
    )
    _scheduler.start()
    logger.info(
        f"Churn prediction retrain scheduler started "
        f"(daily at {settings.pre_session.daily_retrain_hour}:00 UTC)"
    )


def stop_scheduler() -> None:
    """Stop the background scheduler."""
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
        logger.info("Churn prediction retrain scheduler stopped")
