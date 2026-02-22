"""
FastAPI application factory for the Complexity Level Predictor.

Usage:
    uvicorn ml.complexity_predictor.api.app:app --host 0.0.0.0 --port 8400
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from loguru import logger

from ..config import settings
from ..inference.predictor import predictor
from .routes import router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Startup / shutdown lifecycle."""
    # ── Startup ─────────────────────────────────────────────────────────
    logger.info("Complexity Level Predictor starting up...")

    # Try to load model (non-fatal if not yet trained)
    try:
        predictor.load()
    except FileNotFoundError:
        logger.warning(
            "No trained model found — service will use heuristic fallback "
            "until POST /ml/session/train is called."
        )

    # Start retrain scheduler
    # NOTE: retraining is now handled by the Celery beat scheduler
    # (ml.shared.celery_app).  Run: celery -A ml.shared.celery_app beat

    yield

    # ── Shutdown ────────────────────────────────────────
    logger.info("Complexity Level Predictor shut down.")


def create_app() -> FastAPI:
    app = FastAPI(
        title="Lingua Complexity Level Predictor",
        description=(
            "Predicts optimal story complexity level and session length "
            "for a user before a session starts. Uses XGBoost trained on "
            "historical session data with cognitive load and completion outcomes."
        ),
        version="0.1.0",
        lifespan=lifespan,
    )
    app.include_router(router)
    return app


# For `uvicorn ml.complexity_predictor.api.app:app`
app = create_app()
