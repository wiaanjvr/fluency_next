"""
FastAPI routes for DKT service.

Endpoints:
  POST /ml/dkt/knowledge-state   — full knowledge state for a user
  POST /ml/dkt/predict-session   — predicted performance for planned words
  POST /ml/dkt/train             — trigger training (admin)
  GET  /ml/dkt/health            — health check
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Header
from loguru import logger

from ml.shared.cache import prediction_cache
from ml.shared.prediction_log import log_prediction, timed
from ..config import settings
from ..inference.predictor import predictor
from .schemas import (
    ConceptMastery,
    HealthResponse,
    KnowledgeStateRequest,
    KnowledgeStateResponse,
    PredictSessionRequest,
    PredictSessionResponse,
    TrainRequest,
    TrainResponse,
    WordPrediction,
    WordState,
)

router = APIRouter(prefix="/ml/dkt", tags=["dkt"])


# ── Auth dependency ─────────────────────────────────────────────────────────


async def verify_api_key(x_api_key: str = Header(default="")) -> None:
    """
    Simple shared-secret auth for service-to-service calls.
    The Next.js backend passes DKT_API_KEY in the X-Api-Key header.
    If DKT_API_KEY is not configured, authentication is skipped (dev mode).
    """
    expected = settings.server.api_key
    if expected and x_api_key != expected:
        raise HTTPException(status_code=401, detail="Invalid API key")


# ── Knowledge state ─────────────────────────────────────────────────────────


@router.post(
    "/knowledge-state",
    response_model=KnowledgeStateResponse,
    dependencies=[Depends(verify_api_key)],
)
async def knowledge_state(req: KnowledgeStateRequest) -> KnowledgeStateResponse:
    """
    Compute the full knowledge state for a user.

    Returns per-word recall probability, 48h/7d forgetting forecasts,
    and per-grammar-concept mastery scores.
    """
    # ── Cache check (1-hour TTL) ─────────────────────────────────────────
    cached = prediction_cache.get("dkt", "knowledge-state", req.user_id)
    if cached is not None:
        logger.debug(f"knowledge_state cache HIT for {req.user_id[:8]}…")
        return KnowledgeStateResponse(**cached)

    try:
        with timed() as t:
            result = predictor.get_knowledge_state(req.user_id)
    except FileNotFoundError:
        raise HTTPException(
            status_code=503,
            detail="DKT model not trained yet. Run POST /ml/dkt/train first.",
        )
    except Exception as exc:
        logger.exception("knowledge_state failed")
        raise HTTPException(status_code=500, detail=str(exc))

    response = KnowledgeStateResponse(
        wordStates=[
            WordState(
                wordId=ws["word_id"],
                pRecall=ws["p_recall"],
                pForget48h=ws["p_forget_48h"],
                pForget7d=ws["p_forget_7d"],
            )
            for ws in result["word_states"]
        ],
        conceptMastery=[
            ConceptMastery(tag=cm["tag_id"], masteryScore=cm["mastery_score"])
            for cm in result["concept_mastery"]
        ],
        eventCount=result["event_count"],
        usingDkt=result["using_dkt"],
        reason=result.get("reason"),
    )

    # ── Cache store ──────────────────────────────────────────────────────
    prediction_cache.set("dkt", "knowledge-state", req.user_id, response.model_dump())

    # ── Prediction log ────────────────────────────────────────────────────
    log_prediction(
        service="dkt", endpoint="knowledge-state",
        user_id=req.user_id,
        inputs={"user_id": req.user_id},
        outputs={
            "word_count": len(result["word_states"]),
            "event_count": result["event_count"],
            "using_dkt": result["using_dkt"],
        },
        latency_ms=t.latency_ms,
    )

    return response


# ── Session prediction ──────────────────────────────────────────────────────


@router.post(
    "/predict-session",
    response_model=PredictSessionResponse,
    dependencies=[Depends(verify_api_key)],
)
async def predict_session(req: PredictSessionRequest) -> PredictSessionResponse:
    """
    Predict performance for each word in a hypothetical upcoming session.
    """
    if not req.planned_words:
        raise HTTPException(status_code=400, detail="plannedWords must not be empty")

    try:
        with timed() as t:
            result = predictor.predict_session(req.user_id, req.planned_words)
    except FileNotFoundError:
        raise HTTPException(
            status_code=503,
            detail="DKT model not trained yet. Run POST /ml/dkt/train first.",
        )
    except Exception as exc:
        logger.exception("predict_session failed")
        raise HTTPException(status_code=500, detail=str(exc))

    response = PredictSessionResponse(
        predictions=[
            WordPrediction(
                wordId=p["word_id"],
                predictedRecall=p["predicted_recall"],
            )
            for p in result["predictions"]
        ],
        usingDkt=result["using_dkt"],
        reason=result.get("reason"),
    )

    log_prediction(
        service="dkt", endpoint="predict-session",
        user_id=req.user_id,
        inputs={"planned_word_count": len(req.planned_words)},
        outputs={"prediction_count": len(result["predictions"]), "using_dkt": result["using_dkt"]},
        latency_ms=t.latency_ms,
    )

    return response

    return PredictSessionResponse(
        predictions=[
            WordPrediction(
                wordId=p["word_id"],
                predictedRecall=p["predicted_recall"],
            )
            for p in result["predictions"]
        ],
        usingDkt=result["using_dkt"],
        reason=result.get("reason"),
    )


# ── Training trigger ────────────────────────────────────────────────────────


@router.post(
    "/train",
    response_model=TrainResponse,
    dependencies=[Depends(verify_api_key)],
)
async def train(req: TrainRequest) -> TrainResponse:
    """
    Manually trigger a training or fine-tuning run.
    Intended for admin use or CI/CD pipelines.
    """
    from ..training.trainer import finetune_dkt, train_dkt

    try:
        if req.mode == "finetune":
            result = finetune_dkt(days=req.finetune_days)
        else:
            result = train_dkt()
    except Exception as exc:
        logger.exception("Training failed")
        raise HTTPException(status_code=500, detail=str(exc))

    # Reload model after training
    try:
        predictor.load()
    except FileNotFoundError:
        pass  # May not have trained successfully

    return TrainResponse(
        status=result.get("status", "unknown"),
        bestValLoss=result.get("best_val_loss"),
        epochsTrained=result.get("epochs_trained"),
        vocabSize=result.get("vocab_size"),
        grammarTagCount=result.get("grammar_tag_count"),
    )


# ── Health check ────────────────────────────────────────────────────────────


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    loaded = predictor.is_loaded
    vocab_size = predictor._vocab.size if predictor._vocab else None
    device = str(predictor._device) if loaded else None

    return HealthResponse(
        status="ok" if loaded else "model_not_loaded",
        modelLoaded=loaded,
        vocabSize=vocab_size,
        device=device,
    )
