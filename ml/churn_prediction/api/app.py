"""
FastAPI application factory for the Churn Prediction & Engagement Rescue service.

Usage:
    uvicorn ml.churn_prediction.api.app:app --host 0.0.0.0 --port 8700
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from loguru import logger

from ..config import settings
from ..model.mid_session import mid_session_model
from ..model.pre_session import pre_session_model
from .routes import router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Startup / shutdown lifecycle."""
    # ── Startup ─────────────────────────────────────────────────────────
    logger.info("Churn Prediction & Engagement Rescue service starting up...")

    # Try to load models (non-fatal if not yet trained)
    for name, model in [
        ("pre-session", pre_session_model),
        ("mid-session", mid_session_model),
    ]:
        try:
            model.load()
            logger.info(f"{name} model loaded successfully")
        except FileNotFoundError:
            logger.warning(
                f"No trained {name} model found — service will use "
                "heuristic fallback until POST /ml/churn/train is called."
            )

    # Start retrain scheduler
    # NOTE: retraining is now handled by the Celery beat scheduler
    # (ml.shared.celery_app).  The local APScheduler is no longer started here.
    # Run: celery -A ml.shared.celery_app beat --loglevel=info

    yield

    # ── Shutdown ────────────────────────────────────────
    logger.info("Churn Prediction & Engagement Rescue service shut down.")


def create_app() -> FastAPI:
    app = FastAPI(
        title="Lingua Churn Prediction & Engagement Rescue",
        description=(
            "Predicts pre-session churn risk and mid-session abandonment "
            "probability. Triggers personalised rescue interventions to "
            "improve engagement and retention."
        ),
        version="0.1.0",
        lifespan=lifespan,
    )
    app.include_router(router)
    return app


app = create_app()
