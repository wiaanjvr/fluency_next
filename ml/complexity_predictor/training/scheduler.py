"""
Retraining scheduler for the Complexity Level Predictor.

Runs as a background thread alongside the FastAPI server:
  - Weekly retrain on Tuesdays at 04:00 UTC
"""

from __future__ import annotations

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from loguru import logger

from ..config import settings
from .trainer import train_complexity_predictor

_scheduler: BackgroundScheduler | None = None


def _weekly_retrain() -> None:
    logger.info("=== COMPLEXITY PREDICTOR WEEKLY RETRAIN START ===")
    try:
        result = train_complexity_predictor()
        logger.info(f"Weekly retrain completed: {result}")

        # Reload the predictor after training
        from ..inference.predictor import predictor

        try:
            predictor.load()
        except FileNotFoundError:
            logger.warning("Model not found after training — check training output")

    except Exception:
        logger.exception("Weekly retrain FAILED")


def start_scheduler() -> BackgroundScheduler:
    """Start the APScheduler background scheduler."""
    global _scheduler
    if _scheduler is not None:
        return _scheduler

    _scheduler = BackgroundScheduler(timezone="UTC")

    cfg = settings.model

    _scheduler.add_job(
        _weekly_retrain,
        CronTrigger(
            day_of_week=str(cfg.weekly_retrain_day),
            hour=cfg.retrain_hour,
            minute=0,
        ),
        id="complexity_weekly_retrain",
        name="Weekly Complexity Predictor retrain",
        replace_existing=True,
    )

    _scheduler.start()
    logger.info(
        "Complexity predictor retrain scheduler started — "
        f"retrain on day {cfg.weekly_retrain_day} at {cfg.retrain_hour}:00 UTC"
    )

    return _scheduler


def stop_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
        logger.info("Complexity predictor retrain scheduler stopped")
