"""
Retraining scheduler.

Runs as a background thread alongside the FastAPI server:
  - Weekly full retrain on Mondays at 03:00 UTC
  - Daily fine-tune at 03:00 UTC (skipped on full-retrain day)
"""

from __future__ import annotations

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from loguru import logger

from ..config import settings
from .trainer import finetune_dkt, train_dkt

_scheduler: BackgroundScheduler | None = None


def _weekly_retrain() -> None:
    logger.info("=== WEEKLY FULL RETRAIN START ===")
    try:
        result = train_dkt()
        logger.info(f"Weekly retrain completed: {result}")
    except Exception:
        logger.exception("Weekly retrain FAILED")


def _daily_finetune() -> None:
    logger.info("=== DAILY FINE-TUNE START ===")
    try:
        result = finetune_dkt(days=1)
        logger.info(f"Daily fine-tune completed: {result}")
    except Exception:
        logger.exception("Daily fine-tune FAILED")


def start_scheduler() -> BackgroundScheduler:
    """Start the APScheduler background scheduler."""
    global _scheduler
    if _scheduler is not None:
        return _scheduler

    _scheduler = BackgroundScheduler(timezone="UTC")

    cfg = settings.model

    # Weekly full retrain (Monday at 03:00 UTC by default)
    _scheduler.add_job(
        _weekly_retrain,
        CronTrigger(
            day_of_week=str(cfg.weekly_retrain_day),
            hour=cfg.daily_finetune_hour,
            minute=0,
        ),
        id="weekly_retrain",
        name="Weekly full DKT retrain",
        replace_existing=True,
    )

    # Daily fine-tune (every day except Monday, at 03:00 UTC)
    days_except_retrain = ",".join(
        str(d) for d in range(7) if d != cfg.weekly_retrain_day
    )
    _scheduler.add_job(
        _daily_finetune,
        CronTrigger(
            day_of_week=days_except_retrain,
            hour=cfg.daily_finetune_hour,
            minute=0,
        ),
        id="daily_finetune",
        name="Daily DKT fine-tune",
        replace_existing=True,
    )

    _scheduler.start()
    logger.info(
        "DKT retrain scheduler started — "
        f"full retrain on day {cfg.weekly_retrain_day}, "
        f"fine-tune daily at {cfg.daily_finetune_hour}:00 UTC"
    )

    return _scheduler


def stop_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
        logger.info("DKT retrain scheduler stopped")
