"""
ml.service.app — Unified Lingua ML Gateway Service.

Mounts all ML sub-service routers plus the cross-cutting GDPR and
health endpoints on a single FastAPI app running on port 8900.

This is the only service the Next.js backend needs to talk to.
Each ML sub-service can still be deployed independently if preferred
(ports 8100–8800); this gateway just re-exposes their routes in-process
for simpler single-process deployments.

Usage:
    uvicorn ml.service.app:app --host 0.0.0.0 --port 8900 --workers 2
"""

from __future__ import annotations

import os
from contextlib import asynccontextmanager
from typing import AsyncIterator, Any

import httpx
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from loguru import logger

from .routes_gdpr import router as gdpr_router
from ..shared.cache import prediction_cache

# ── Sub-service URL map (for health aggregation) ────────────────────────────
# In single-process mode all routers are imported directly below.
# In split-process mode these URLs are used for health-check proxying.

_SUB_SERVICES: dict[str, str] = {
    "dkt":                  os.getenv("DKT_URL",                  "http://localhost:8100"),
    "cognitive_load":       os.getenv("COGNITIVE_LOAD_URL",       "http://localhost:8200"),
    "story_word_selector":  os.getenv("STORY_SELECTOR_URL",       "http://localhost:8300"),
    "complexity_predictor": os.getenv("COMPLEXITY_PREDICTOR_URL", "http://localhost:8400"),
    "feedback_generator":   os.getenv("FEEDBACK_GENERATOR_URL",   "http://localhost:8500"),
    "cold_start":           os.getenv("COLD_START_URL",           "http://localhost:8600"),
    "churn_prediction":     os.getenv("CHURN_PREDICTION_URL",     "http://localhost:8700"),
    "rl_router":            os.getenv("RL_ROUTER_URL",            "http://localhost:8800"),
}


# ── Lifespan ─────────────────────────────────────────────────────────────────


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    logger.info("Lingua ML Gateway starting…")

    # Load models for all in-process sub-services
    _load_all_models()

    # Verify Redis is reachable (non-fatal)
    health = prediction_cache.health()
    if health["redis_connected"]:
        logger.info(
            f"Redis connected (v{health.get('redis_version', '?')})"
        )
    else:
        logger.warning(
            f"Redis not reachable — prediction caching disabled. "
            f"Error: {health.get('error')}"
        )

    yield

    logger.info("Lingua ML Gateway shut down.")


def _load_all_models() -> None:
    """Best-effort model loading at startup — warnings only, never fatal."""
    loaders = [
        ("DKT predictor",         _try_load_dkt),
        ("Churn pre-session",      _try_load_churn_pre),
        ("Churn mid-session",      _try_load_churn_mid),
        ("Cold-start cluster",     _try_load_cold_start),
        ("Complexity predictor",   _try_load_complexity),
        ("RL Router bandit",       _try_load_rl_bandit),
        ("RL Router PPO",          _try_load_rl_ppo),
    ]
    for name, loader in loaders:
        try:
            loaded = loader()
            status = "loaded" if loaded else "not yet trained (will use fallback)"
            logger.info(f"  {name}: {status}")
        except Exception as exc:
            logger.warning(f"  {name}: skipped — {exc}")


def _try_load_dkt() -> bool:
    from ml.dkt.inference.predictor import predictor
    return predictor.load()


def _try_load_churn_pre() -> bool:
    from ml.churn_prediction.model.pre_session import pre_session_model
    pre_session_model.load()
    return pre_session_model.is_loaded


def _try_load_churn_mid() -> bool:
    from ml.churn_prediction.model.mid_session import mid_session_model
    mid_session_model.load()
    return mid_session_model.is_loaded


def _try_load_cold_start() -> bool:
    from ml.cold_start.model.clustering import cluster_model
    return cluster_model.load()


def _try_load_complexity() -> bool:
    from ml.complexity_predictor.inference.predictor import predictor
    return predictor.load()


def _try_load_rl_bandit() -> bool:
    from ml.rl_router.engine.bandit import bandit_model
    return bandit_model.load()


def _try_load_rl_ppo() -> bool:
    from ml.rl_router.engine.ppo_agent import ppo_agent
    return ppo_agent.load()


# ── App factory ───────────────────────────────────────────────────────────────


def create_app() -> FastAPI:
    app = FastAPI(
        title="Lingua ML Gateway",
        description=(
            "Unified gateway for all Lingua ML microservices.  "
            "Exposes DKT, Churn Prediction, Cold Start, Complexity Predictor, "
            "Feedback Generator, RL Router, Cognitive Load, Story Word Selector, "
            "plus GDPR erasure and cross-cutting health endpoints."
        ),
        version="1.0.0",
        lifespan=lifespan,
    )

    # ── GDPR / cross-cutting routes ────────────────────────────────────────
    app.include_router(gdpr_router)

    # ── Sub-service routes (in-process mounts) ────────────────────────────
    _mount_sub_service_routers(app)

    # ── Aggregated health endpoint ─────────────────────────────────────────
    @app.get("/ml/health", tags=["health"], summary="Aggregated health across all ML services")
    async def health() -> JSONResponse:
        results: dict[str, Any] = {
            "status": "ok",
            "cache": prediction_cache.health(),
        }
        # Check each sub-service health endpoint
        async with httpx.AsyncClient(timeout=3.0) as client:
            for name, base_url in _SUB_SERVICES.items():
                slug = name.replace("_", "-")
                try:
                    r = await client.get(f"{base_url}/ml/{slug}/health")
                    results[name] = r.json()
                except Exception as exc:
                    results[name] = {"status": "unreachable", "error": str(exc)}

        any_down = any(
            isinstance(v, dict) and v.get("status") == "unreachable"
            for v in results.values()
        )
        results["status"] = "degraded" if any_down else "ok"
        return JSONResponse(results, status_code=200 if not any_down else 207)

    # ── Cache health ──────────────────────────────────────────────────────
    @app.get("/ml/cache/health", tags=["health"], summary="Redis cache health")
    async def cache_health() -> dict[str, Any]:
        return prediction_cache.health()

    # ── Celery worker health ──────────────────────────────────────────────
    @app.get("/ml/worker/health", tags=["health"], summary="Celery worker health")
    async def worker_health() -> dict[str, Any]:
        try:
            from ml.shared.celery_app import app as celery_app

            inspector = celery_app.control.inspect(timeout=2)
            ping = inspector.ping() or {}
            workers = list(ping.keys())
            return {
                "celery_workers": len(workers),
                "workers": workers,
                "status": "ok" if workers else "no_workers",
            }
        except Exception as exc:
            return {"status": "error", "error": str(exc)}

    return app


def _mount_sub_service_routers(app: FastAPI) -> None:
    """Import and mount every sub-service router.  Import errors are warnings."""
    mounts = [
        ("ml.dkt.api.routes",                    "DKT"),
        ("ml.churn_prediction.api.routes",        "Churn Prediction"),
        ("ml.cold_start.api.routes",              "Cold Start"),
        ("ml.complexity_predictor.api.routes",    "Complexity Predictor"),
        ("ml.feedback_generator.api.routes",      "Feedback Generator"),
        ("ml.rl_router.api.routes",               "RL Router"),
        ("ml.cognitive_load.api.routes",          "Cognitive Load"),
        ("ml.story_word_selector.api.routes",     "Story Word Selector"),
    ]
    for module_path, name in mounts:
        try:
            import importlib
            mod = importlib.import_module(module_path)
            app.include_router(mod.router)
            logger.info(f"  Mounted {name} router")
        except Exception as exc:
            logger.warning(f"  Could not mount {name} router: {exc}")


app = create_app()
