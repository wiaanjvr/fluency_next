"""
FastAPI application factory for the Cold Start Collaborative Filtering service.

Usage:
    uvicorn ml.cold_start.api.app:app --host 0.0.0.0 --port 8600
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from loguru import logger

from ..config import settings
from ..model.clustering import cluster_model
from .routes import router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Startup / shutdown lifecycle."""
    # ── Startup ─────────────────────────────────────────────────────────
    logger.info("Cold Start Collaborative Filtering service starting up...")

    # Try to load model (non-fatal if not yet trained)
    try:
        cluster_model.load()
        logger.info(
            f"K-Means model loaded: {cluster_model.n_clusters} clusters"
        )
    except FileNotFoundError:
        logger.warning(
            "No trained model found — service will use heuristic fallback "
            "until POST /ml/coldstart/train is called."
        )

    # Start retrain scheduler
    # NOTE: retraining is now handled by the Celery beat scheduler
    # (ml.shared.celery_app).  Run: celery -A ml.shared.celery_app beat

    yield

    # ── Shutdown ────────────────────────────────────────
    logger.info("Cold Start Collaborative Filtering service shut down.")


def create_app() -> FastAPI:
    app = FastAPI(
        title="Lingua Cold Start Collaborative Filtering",
        description=(
            "Assigns new users (< 50 events) to the nearest learner cluster "
            "using K-Means (k=20) trained on mature users (500+ events). "
            "Provides recommended module paths and complexity levels."
        ),
        version="0.1.0",
        lifespan=lifespan,
    )
    app.include_router(router)
    return app


# For `uvicorn ml.cold_start.api.app:app`
app = create_app()
