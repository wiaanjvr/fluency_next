"""
FastAPI application factory for the RL Module Router.

Usage:
    uvicorn ml.rl_router.api.app:app --host 0.0.0.0 --port 8800
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
    logger.info("RL Module Router starting up...")

    # Attempt to load saved models (non-fatal if missing)
    try:
        from ..engine.bandit import bandit_model

        loaded = bandit_model.load()
        if loaded:
            logger.info(
                f"LinUCB model loaded ({bandit_model.total_updates} updates)"
            )
        else:
            logger.info("No LinUCB model found — starting fresh (cold-start mode)")
    except Exception as exc:
        logger.warning(f"Failed to load LinUCB model: {exc}")

    try:
        from ..engine.ppo_agent import ppo_agent

        loaded = ppo_agent.load()
        if loaded:
            logger.info(
                f"PPO model loaded (step {ppo_agent.training_steps})"
            )
        else:
            logger.info("No PPO model found — will use bandit or cold-start")
    except Exception as exc:
        logger.warning(f"Failed to load PPO model: {exc}")

    yield

    # Save models on shutdown
    try:
        from ..engine.bandit import bandit_model

        if bandit_model.is_loaded:
            bandit_model.save()
            logger.info("LinUCB model saved on shutdown")
    except Exception as exc:
        logger.warning(f"Failed to save LinUCB model on shutdown: {exc}")

    logger.info("RL Module Router shut down.")


def create_app() -> FastAPI:
    app = FastAPI(
        title="Lingua RL Module Router",
        description=(
            "Reinforcement learning module router that decides, after each "
            "completed activity, what the user should do next across all "
            "learning modules. Uses a contextual bandit (LinUCB) during the "
            "early phase and upgrades to PPO once sufficient data exists."
        ),
        version="0.1.0",
        lifespan=lifespan,
    )
    app.include_router(router)
    return app


app = create_app()
