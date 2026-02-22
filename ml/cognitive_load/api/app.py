"""
FastAPI application factory for the Cognitive Load Estimator.

Usage:
    uvicorn ml.cognitive_load.api.app:app --host 0.0.0.0 --port 8200
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from loguru import logger

from .routes import router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Startup / shutdown lifecycle."""
    logger.info("Cognitive Load Estimator starting up...")
    yield
    logger.info("Cognitive Load Estimator shut down.")


def create_app() -> FastAPI:
    app = FastAPI(
        title="Lingua Cognitive Load Estimator",
        description=(
            "Real-time cognitive load scoring for learning sessions. "
            "Tracks per-event load from response times vs personalised baselines, "
            "computes session-level trends, and recommends difficulty adjustments."
        ),
        version="0.1.0",
        lifespan=lifespan,
    )
    app.include_router(router)
    return app


# For `uvicorn ml.cognitive_load.api.app:app`
app = create_app()
