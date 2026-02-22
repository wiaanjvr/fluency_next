"""
FastAPI application factory for the Story Word Selector service.

Usage:
    uvicorn ml.story_word_selector.api.app:app --host 0.0.0.0 --port 8300
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from loguru import logger

from ..config import settings
from .routes import router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Startup / shutdown lifecycle."""
    logger.info(
        f"Story Word Selector service starting on "
        f"{settings.server.host}:{settings.server.port}..."
    )
    yield
    logger.info("Story Word Selector service shut down.")


def create_app() -> FastAPI:
    application = FastAPI(
        title="Lingua Story Word Selector",
        description=(
            "ML-informed adaptive word selection for story generation. "
            "Combines DKT forgetting risk, recency, production gaps, "
            "module variety, and thematic preferences."
        ),
        version="0.1.0",
        lifespan=lifespan,
    )
    application.include_router(router)
    return application


app = create_app()
