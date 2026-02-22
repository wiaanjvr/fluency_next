"""
FastAPI application factory.

Usage:
    uvicorn ml.dkt.api.app:create_app --factory --host 0.0.0.0 --port 8100
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
    logger.info("DKT service starting up...")

    # Try to load model (non-fatal if not yet trained)
    try:
        predictor.load()
    except FileNotFoundError:
        logger.warning(
            "No trained model found — service will respond with 503 "
            "until POST /ml/dkt/train is called."
        )

    # Start retrain scheduler
    # NOTE: retraining is now handled by the Celery beat scheduler
    # (ml.shared.celery_app).  Run: celery -A ml.shared.celery_app beat

    yield

    # ── Shutdown ────────────────────────────────────────
    logger.info("DKT service shut down.")


def create_app() -> FastAPI:
    app = FastAPI(
        title="Lingua DKT Service",
        description="Transformer-based Deep Knowledge Tracing for vocabulary mastery prediction",
        version="0.1.0",
        lifespan=lifespan,
    )
    app.include_router(router)
    return app


# For `uvicorn ml.dkt.api.app:app`
app = create_app()
