"""
FastAPI routes for the Complexity Level Predictor.

Endpoints:
  POST /ml/session/plan     — predict optimal session plan for a user
  POST /ml/session/train    — trigger model training (admin)
  GET  /ml/session/health   — health check
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException
from loguru import logger

from ml.shared.cache import prediction_cache
from ml.shared.prediction_log import log_prediction, timed
from ..config import settings
from ..inference.predictor import predictor
from .schemas import (
    HealthResponse,
    SessionPlanRequest,
    SessionPlanResponse,
    TrainRequest,
    TrainResponse,
)

router = APIRouter(prefix="/ml/session", tags=["complexity-predictor"])


# ── Auth dependency ─────────────────────────────────────────────────────────


async def verify_api_key(x_api_key: str = Header(default="")) -> None:
    """
    Simple shared-secret auth for service-to-service calls.
    If COMPLEXITY_PREDICTOR_API_KEY is not configured, authentication is
    skipped (dev mode).
    """
    expected = settings.server.api_key
    if expected and x_api_key != expected:
        raise HTTPException(status_code=401, detail="Invalid API key")


# ── Session plan ────────────────────────────────────────────────────────────


@router.post(
    "/plan",
    response_model=SessionPlanResponse,
    dependencies=[Depends(verify_api_key)],
)
async def session_plan(req: SessionPlanRequest) -> SessionPlanResponse:
    """
    Predict the optimal session plan for a user.

    Returns complexity level, recommended word count, recommended duration,
    and model confidence.
    """
    # ── Cache check (1-hour TTL) ─────────────────────────────────────────
    cached = prediction_cache.get("complexity", "session-plan", req.user_id)
    if cached is not None:
        logger.debug(f"session_plan cache HIT for {req.user_id[:8]}…")
        return SessionPlanResponse(**cached)

    try:
        with timed() as t:
            result = predictor.predict_session_plan(req.user_id)
    except Exception as exc:
        logger.exception("session_plan prediction failed")
        raise HTTPException(status_code=500, detail=str(exc))

    response = SessionPlanResponse(**result)

    prediction_cache.set("complexity", "session-plan", req.user_id, response.model_dump())

    log_prediction(
        service="complexity", endpoint="session-plan",
        user_id=req.user_id,
        inputs={"user_id": req.user_id},
        outputs=result,
        latency_ms=t.latency_ms,
    )

    return response


# ── Training trigger ────────────────────────────────────────────────────────


@router.post(
    "/train",
    response_model=TrainResponse,
    dependencies=[Depends(verify_api_key)],
)
async def train(req: TrainRequest) -> TrainResponse:
    """
    Manually trigger a training run.
    Intended for admin use or CI/CD pipelines.
    """
    from ..training.trainer import train_complexity_predictor

    try:
        result = train_complexity_predictor()
    except Exception as exc:
        logger.exception("Training failed")
        raise HTTPException(status_code=500, detail=str(exc))

    # Reload models after training
    try:
        predictor.load()
    except FileNotFoundError:
        logger.warning("Model not found after training")

    return TrainResponse(
        status=result.get("status", "unknown"),
        totalSamples=result.get("total_samples"),
        trainSamples=result.get("train_samples"),
        valSamples=result.get("val_samples"),
        complexityAccuracy=result.get("complexity_accuracy"),
        complexityWithin1=result.get("complexity_within_1"),
        wordCountRmse=result.get("word_count_rmse"),
        trainingTimeSeconds=result.get("training_time_seconds"),
    )


# ── Health check ────────────────────────────────────────────────────────────


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    loaded = predictor.is_loaded

    return HealthResponse(
        status="ok" if loaded else "model_not_loaded",
        modelLoaded=loaded,
    )
