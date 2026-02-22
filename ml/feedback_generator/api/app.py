"""
FastAPI application factory for the LLM Feedback Generator.

Usage:
    uvicorn ml.feedback_generator.api.app:app --host 0.0.0.0 --port 8500
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
    # ── Startup ─────────────────────────────────────────────────────────
    logger.info("LLM Feedback Generator starting up...")

    # Validate LLM configuration (non-fatal if misconfigured)
    try:
        from ..engine.llm_client import get_llm_client

        client = get_llm_client()
        logger.info(
            f"LLM provider ready: {client.provider_name} / {client.model_name}"
        )
    except Exception as exc:
        logger.warning(
            f"LLM client not configured — feedback generation will fail "
            f"until the provider is fixed: {exc}"
        )

    yield

    # ── Shutdown ────────────────────────────────────────────────────────
    logger.info("LLM Feedback Generator shut down.")


def create_app() -> FastAPI:
    app = FastAPI(
        title="Lingua LLM Feedback Generator",
        description=(
            "LLM-powered micro-explanation system triggered on repeated errors. "
            "Detects error patterns (production gap, contextualization issue, "
            "slow recognition) and generates personalized explanations using "
            "the learner's known vocabulary for analogies."
        ),
        version="0.1.0",
        lifespan=lifespan,
    )
    app.include_router(router)
    return app


# For `uvicorn ml.feedback_generator.api.app:app`
app = create_app()
